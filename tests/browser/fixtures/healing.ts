// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { healingFixture, type FixtureHealingSkill } from '../../fixtures/healing';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { HEALING_ATLAS, healingCues } from '../../../src/game/visuals/healing-fx';
import type { BattleEvent, TurnStage } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params = new URLSearchParams(location.search);
const fixture = healingFixture((params.get('skill') ?? 'heal') as FixtureHealingSkill, params.get('scenario') ?? 'normal');
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: params.get('speed') ?? 'normal', intensity: params.get('intensity') ?? 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, fixture.data);
const scene = new BattleScene(fixture.data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
const impacts: { at: number; remainingMs: number; actorId: string; action?: string; side: string; resolved: BattleEvent[]; cues: ReturnType<typeof healingCues>; before: TurnStage['before']; after: TurnStage['after'] }[] = [];
const play = scene.play.bind(scene);
scene.play = (turn, life) => { impacts.push({ at: Date.now()/1000, remainingMs: life ?? 650, actorId: turn.actorId, action: turn.action, side: turn.side, resolved: turn.events, cues: healingCues(turn), before: turn.before, after: turn.after }); play(turn, life); };
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data: fixture.data, entry: fixture.entry, commands: fixture.prelude,
  commit: s => { localStorage.setItem('healing-committed', JSON.stringify(s)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
function painted(atlas = HEALING_ATLAS) {
  const items: { frame: string; x: number; y: number; width: number; height: number; alpha: number; rim: boolean }[] = [];
  const visit = (list: Phaser.GameObjects.GameObject[]) => { for (const item of list) {
    if (item instanceof Phaser.GameObjects.Container) visit(item.list);
    if (item instanceof Phaser.GameObjects.Image && item.texture.key === atlas) items.push({ frame: item.frame.name, x: item.x, y: item.y, width: item.displayWidth, height: item.displayHeight, alpha: item.alpha, rim: !!item.getData('healingRim') });
  } }; visit(scene.children.getChildren()); return items;
}
const qa = { impacts, painted, sequence: () => fixture.turns, commands: () => fixture.commands, prelude: () => fixture.prelude,
  target: () => fixture.targetId!, state: () => ui.state, cues: () => fixture.turns.flatMap(healingCues),
  point: (id: string) => { const p = scene.actorPanels.get(id)!; return { x: p.x, footY: p.y, size: p.size }; },
  visualPoint: (id: string) => scene.healingAnchor(id)!,
  worldAlignment: (id: string) => {
    // Independent rendered transforms: do not reuse healingAnchor's calculation here.
    const body = (scene as unknown as { bodies: Map<string, Phaser.GameObjects.Container> }).bodies.get(id)!;
    const sprite = body.list.find(c => c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image;
    const foot = body.getWorldTransformMatrix().transformPoint(sprite.x, sprite.y);
    const lights: { x: number; y: number }[] = [];
    const visit = (list: Phaser.GameObjects.GameObject[]) => { for (const child of list) {
      if (child instanceof Phaser.GameObjects.Container) visit(child.list);
      if (child instanceof Phaser.GameObjects.Image && child.texture.key === HEALING_ATLAS && child.frame.name.endsWith('_peak') && !child.getData('healingRim')) {
        const p = child.getWorldTransformMatrix().transformPoint(0, 0); lights.push({ x: p.x, y: p.y });
      }
    } }; visit(scene.children.getChildren());
    return { foot: { x: foot.x, y: foot.y }, lights, buffer: scene.game.canvas.width, css: scene.game.canvas.clientWidth };
  },
  behindUnits: () => { const root = scene.children.getChildren().find(c => c instanceof Phaser.GameObjects.Container) as Phaser.GameObjects.Container; return root.list[0] instanceof Phaser.GameObjects.Container && (root.list[0] as Phaser.GameObjects.Container).list.some(c => c instanceof Phaser.GameObjects.Image && c.texture.key === HEALING_ATLAS); },
  stop: () => scene.stopEffects(), preview: (i: number) => { const turn = fixture.turns[i]!; scene.stopEffects(); scene.play(turn, 450); return healingCues(turn); },
  labelsAbovePaint: () => { let above = true; const visit = (list: Phaser.GameObjects.GameObject[]) => {
    const paint = list.flatMap((i, n) => i instanceof Phaser.GameObjects.Image && i.texture.key === HEALING_ATLAS ? [n] : []);
    const labels = list.flatMap((i, n) => i instanceof Phaser.GameObjects.Text ? [n] : []);
    if (paint.length && labels.length && Math.min(...labels) < Math.max(...paint)) above = false;
    for (const item of list) if (item instanceof Phaser.GameObjects.Container) visit(item.list);
  }; visit(scene.children.getChildren()); return above; },
};
declare global { interface Window { healingQA: typeof qa } }
window.healingQA = qa;
