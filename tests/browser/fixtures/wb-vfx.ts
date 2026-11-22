// Dev-only QA entry for the World Boss trio VFX. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { wbVfxFixture, type WbVfxMove, type WbVfxScenario } from '../../fixtures/wb-vfx';
import { lakeBossFixture, type LakeBossMove, type LakeBossScenario } from '../../fixtures/lake-boss';
import { unitKey } from '../../../src/game/visuals/unit-frames';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { BOSS_ATLAS, LAKE_BOSS_ATLAS, anchorPoint, bossCues, chargeHolds } from '../../../src/game/visuals/boss-signature-fx';
import art from '../../../src/game/visuals/boss-signature-art.json';
import type { BattleEvent } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params = new URLSearchParams(location.search);
const move = (params.get('move') ?? 'Titan Gathering') as WbVfxMove, scenario = (params.get('scenario') ?? 'normal') as WbVfxScenario;
const lake = params.get('lake');
const fixture = lake ? lakeBossFixture(lake as LakeBossMove, params.get('scenario') as LakeBossScenario ?? 'normal') : wbVfxFixture(move, scenario);
const atlas = lake ? LAKE_BOSS_ATLAS : BOSS_ATLAS;
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: params.get('speed') ?? 'normal', intensity: params.get('intensity') ?? 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, fixture.data);
const scene = new BattleScene(fixture.data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
const impacts: { at: number; remainingMs: number; actorId: string; side: string; intent?: string; resolved: BattleEvent[] }[] = [];
let recordingLake = false;
const play = scene.play.bind(scene);
scene.play = (turn, life) => {
  impacts.push({ at: Date.now() / 1000, remainingMs: life ?? 650, actorId: turn.actorId, side: turn.side, intent: turn.intent?.name, resolved: turn.events });
  play(turn, life);
  if (recordingLake) takeSample();
};
if (lake) {
  const prepare = scene.prepare.bind(scene);
  scene.prepare = (turn, contactMs) => {
    prepare(turn, contactMs);
    if (recordingLake) takeSample();
  };
}
ui.attach(scene);
scene.setBattleVisible(true);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', scene: lake ? 'lake' : undefined, data: fixture.data, entry: fixture.entry, commands: fixture.prelude,
  commit: s => { localStorage.setItem('wb-vfx-committed', JSON.stringify(s)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
// Every boss-atlas image on screen, in scene (= #game CSS pixel) coordinates, with its role.
function painted() {
  const items: { frame: string; x: number; y: number; left: number; top: number; right: number; bottom: number; width: number; alpha: number; visible: boolean; tint: number; hold: string; prepare: boolean }[] = [];
  const visit = (list: Phaser.GameObjects.GameObject[]) => { for (const item of list) {
    if (item instanceof Phaser.GameObjects.Container) visit(item.list);
    if (item instanceof Phaser.GameObjects.Image && item.texture.key === atlas) {
      const b = item.getBounds(), m = item.getWorldTransformMatrix();
      items.push({ frame: item.frame.name, x: m.tx, y: m.ty, left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: item.displayWidth, alpha: item.alpha, visible: item.visible,
        tint: item.tintTopLeft, hold: String(item.getData('holdKind') ?? ''), prepare: !!item.getData('bossPrepare') });
    }
  } }; visit(scene.children.getChildren()); return items;
}
// The HP/name plates as laid out over the canvas, in the same coordinates as `painted`.
function plates() {
  const game = document.querySelector('#game')!.getBoundingClientRect();
  return Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-field-unit]')].map(el => {
    const r = el.getBoundingClientRect(); return [el.dataset.fieldUnit!, { left: r.left - game.left, top: r.top - game.top, right: r.right - game.left, bottom: r.bottom - game.top }];
  }));
}
// Clip stills: every animation frame, which boss-atlas layers are clearly visible (alpha > .5) and when (page clock, seconds).
function lakeBodyFrames(): string[] {
  const key = unitKey(fixture.data.enemies.find(e => e.boss)!.art!);
  const bodies = (scene as unknown as { bodies: Map<string, Phaser.GameObjects.Container> }).bodies;
  return (bodies.get('f1')?.list ?? []).flatMap(s => s instanceof Phaser.GameObjects.Image && s.texture.key === key
    && s.visible && s.alpha > .05 ? [s.frame.name] : []);
}
const samples: { at: number; frames: string[]; bodyFrames?: string[] }[] = [];
function takeSample() {
  samples.push({ at: Date.now() / 1000,
    frames: painted().filter(p => p.visible && p.alpha > (lake ? .05 : .5)).map(p => `${p.frame}${p.hold ? ':hold' : ''}`),
    ...(lake ? { bodyFrames: lakeBodyFrames() } : {}),
  });
}
const record = () => {
  recordingLake = !!lake;
  const tick = () => {
    takeSample();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
// Is each HP/name plate the topmost element at its centre (drawn over the canvas, so no painting can hide it)? Plates ignore
// pointer events, so they take them for the probe only.
const platesOnTop = () => {
  const plates = [...document.querySelectorAll<HTMLElement>('[data-field-unit]')];
  for (const el of plates) el.style.pointerEvents = 'auto';
  const top = Object.fromEntries(plates.map(el => {
    const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return [el.dataset.fieldUnit!, !!hit && el.contains(hit) ? true : `${hit?.tagName}.${hit?.className}`];
  }));
  for (const el of plates) el.style.pointerEvents = '';
  return top;
};
const qa = { record, platesOnTop, samples: () => samples, atlasReady: () => scene.textures?.exists(atlas),
  lakeBodyReady: () => scene.textures?.exists(unitKey(fixture.data.enemies.find(e => e.boss)!.art!)!),
  lakeBossBox: () => scene.figureBox('f1'), impacts, painted, plates, state: () => ui.state,
  turns: () => fixture.result.turns, turn: () => fixture.turn, cues: () => bossCues(fixture.turn), command: () => fixture.command, prelude: () => fixture.prelude,
  expected: () => fixture.result.state, holdsAfter: () => chargeHolds(fixture.result.state, fixture.data),
  anchor: (id: string) => scene.bossAnchor(id)!,
  // Where a frame's anchor lands on that actor right now (the same rendered landmarks the scene uses).
  expectedPoint: (id: string, frame: string) => { const a = art[frame as keyof typeof art] as { anchor: string; offset?: number[] }, slot = scene.bossAnchor(id);
    if (!slot) return null; // a fallen court foe is not drawn until it returns
    return anchorPoint(slot, a.anchor, Phaser.Math.Clamp(slot.size / 96, .7, 1.25) / (111 / 96), a.offset); }, target: () => fixture.command.targetId, action: () => fixture.command.action,
  stop: () => scene.stopEffects() };
declare global { interface Window { wbVfxQA: typeof qa } }
window.wbVfxQA = qa;
