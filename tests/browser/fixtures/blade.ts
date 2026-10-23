// Isolated QA entry point: real BattleUI, BattleScene, playback and resolver; no production debug surface.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { BLADE_ATLAS, bladeCues } from '../../../src/game/visuals/blade-fx';
import { beginBattle, resolveCommand } from '../../../src/core/battle/engine';
import type { ActionId, EncounterDefinition, TurnStage } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params = new URLSearchParams(location.search), skill = (params.get('skill') ?? 'attack') as ActionId;
const role = ['pierce', 'halt'].includes(skill) ? 'Spear' : ['ambush', 'backstab', 'disarm'].includes(skill) ? 'Scout' : 'Duelist';
const actor = [...heroes, ...mercenaries].find(h => h.role === role)!;
const data: EncounterDefinition = { ...structuredClone(veilSiege), heroes: [{ ...actor, speed: 200, maxHp: 500, actions: [...new Set<ActionId>(['attack', skill, 'ward'])] }, ...heroes.filter(h => h.id !== actor.id).slice(0, 3).map(h => ({ ...h, speed: 50 }))],
  enemies: veilSiege.enemies.map(e => ({ ...e, speed: 100, maxHp: 500 })),
  intents: veilSiege.enemies.map(e => ({ sourceId: e.id, targetSlot: skill === 'backstab' ? 1 : 0, name: 'Raking Slash', damage: 12, kind: 'physical' as const })) };
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: params.get('speed') ?? 'normal', intensity: params.get('intensity') ?? 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, data);
const scene = new BattleScene(data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data, entry: { hp: Object.fromEntries(data.heroes.map(h => [h.id, h.maxHp])) }, commands: [],
  commit: state => { localStorage.setItem('blade-committed', JSON.stringify(state)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());

// Outcome matrix uses real resolver stages with test-only initial conditions; no fabricated event payloads.
function stage(outcome: string): TurnStage {
  const state = beginBattle(data, undefined, true).state;
  const h = state.heroes[0]!;
  if (outcome === 'blocked') h.barrier = 100;
  if (outcome === 'partial') h.barrier = 5;
  if (outcome === 'dodged') h.evading = true;
  if (outcome === 'guarded') state.guard = { heroId: state.heroes[1]!.id, targetId: h.id, sourceId: 'f1' };
  if (outcome === 'cancelled') state.enemies.find(e => e.id === 'f1')!.interruptedRound = state.round;
  const result = resolveCommand(state, data, { beat: state.beat, heroId: actor.id, action: skill, targetId: skill === 'parry' ? actor.id : skill === 'sweep' ? 'enemies' : 'f1' }, true);
  if (outcome === 'cancelled') {
    return result.turns.find(t => t.events.some(e => e.type === 'cancel'))!;
  }
  return outcome === 'hit' && skill !== 'parry' ? result.turns[0]! : result.turns.find(t => t.side === 'enemy' && (outcome !== 'guarded' || t.actorId === 'f1') && (skill !== 'parry' || t.events.some(e => e.type === 'counter')))!;
}
const qa = {
  prime: (outcome: string) => {
    const h = ui.state.heroes[0]!;
    if (outcome === 'blocked') h.barrier = 100;
    if (outcome === 'partial') h.barrier = 5;
    if (outcome === 'dodged') h.evading = true;
    if (outcome === 'guarded') ui.state.guard = { heroId: ui.state.heroes[1]!.id, targetId: h.id, sourceId: 'f1' };
    if (outcome === 'cancelled') ui.state.enemies.find(e => e.id === 'f1')!.interruptedRound = ui.state.round;
    ui.attach(scene);
  },
  stage, cues: (outcome: string) => bladeCues(stage(outcome)),
  frames: () => {
    const frames: string[] = [];
    const visit = (items: Phaser.GameObjects.GameObject[]) => {
      for (const item of items) {
        if (item instanceof Phaser.GameObjects.Container) visit(item.list);
        if (item instanceof Phaser.GameObjects.Image && item.texture.key === BLADE_ATLAS) frames.push(item.frame.name);
      }
    };
    visit(scene.children.getChildren()); return frames;
  },
};
declare global { interface Window { bladeQA: typeof qa } }
window.bladeQA = qa;
