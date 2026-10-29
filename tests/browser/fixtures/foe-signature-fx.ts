// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { foeSignatureFixture, type FoeScenario } from '../../fixtures/foe-signature-fx';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { FOE_SIGNATURE_ATLAS, foeSignatureCues, type FoeSignatureMove, type FoeSpot } from '../../../src/game/visuals/foe-signature-fx';
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
const move = (params.get('move') ?? 'Rift Bolt') as FoeSignatureMove;
const fixture = foeSignatureFixture(move, (params.get('scenario') ?? 'hit') as FoeScenario);
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: params.get('speed') ?? 'normal', intensity: params.get('intensity') ?? 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, fixture.data);
const scene = new BattleScene(fixture.data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
const impacts: { at: number; remainingMs: number; actorId: string; action?: string; side: string; intent?: string; resolved: BattleEvent[]; cues: ReturnType<typeof foeSignatureCues>; before: TurnStage['before']; after: TurnStage['after'] }[] = [];
const play = scene.play.bind(scene);
scene.play = (turn, life) => { impacts.push({ at: Date.now()/1000, remainingMs: life ?? 650, actorId: turn.actorId, action: turn.action, side: turn.side, intent: turn.intent?.name, resolved: turn.events, cues: foeSignatureCues(turn), before: turn.before, after: turn.after }); play(turn, life); };
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data: fixture.data, entry: fixture.entry, commands: fixture.prelude,
  commit: s => { localStorage.setItem('foe-committed', JSON.stringify(s)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
function painted(atlas = FOE_SIGNATURE_ATLAS) {
  const items: { frame: string; x: number; y: number; width: number; height: number; alpha: number; visible: boolean; tint: number; rotation: number; scaleX: number; tag: string; target: string }[] = [];
  const visit = (list: Phaser.GameObjects.GameObject[]) => { for (const item of list) {
    if (item instanceof Phaser.GameObjects.Container) visit(item.list);
    if (item instanceof Phaser.GameObjects.Image && item.texture.key === atlas) items.push({ frame: item.frame.name, x: item.x, y: item.y, width: item.displayWidth, height: item.displayHeight, alpha: item.alpha, visible: item.visible, tint: item.tintTopLeft, rotation: item.rotation, scaleX: item.scaleX, tag: String(item.getData('foeSigTag')), target: String(item.getData('foeSigTarget')) });
  } }; visit(scene.children.getChildren()); return items;
}
const qa = {
  impacts, painted, sequence: () => fixture.turns, state: () => ui.state,
  foeTurn: () => fixture.turn, target: () => fixture.targetId, action: () => fixture.command.action,
  expectedCaptureState: () => fixture.captureState, cues: () => foeSignatureCues(fixture.turn),
  rings: () => (scene as unknown as { effects?: Phaser.GameObjects.Container }).effects?.list.filter(c => c instanceof Phaser.GameObjects.Arc || c instanceof Phaser.GameObjects.Graphics).length ?? 0,
  point: (id: string, spot: FoeSpot) => scene.foeAnchor(id, spot)!,
  stop: () => scene.stopEffects(),
};
declare global { interface Window { foeQA: typeof qa } }
window.foeQA = qa;
