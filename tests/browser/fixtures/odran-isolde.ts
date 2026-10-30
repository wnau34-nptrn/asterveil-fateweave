// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { beginBattle, resolveCommand, targetOptions } from '../../../src/core/battle/engine';
import type { ActionId, Command, EncounterDefinition } from '../../../src/core/battle/types';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

// Owner-review capture: redesigned Odran (thiran) and Isolde (wila) fielded with Corin (metta) and Cerise (lalin), seed + procedural motion.
const params = new URLSearchParams(location.search);
const who = params.get('hero') ?? 'thiran', skill = (params.get('skill') ?? 'attack') as ActionId;
const party = ['thiran', 'metta', 'wila', 'lalin'].map(id => mercenaries.find(h => h.id === id)!);
const first = party.find(h => h.id === who)!;
const data: EncounterDefinition = { ...structuredClone(veilSiege),
  heroes: party.map((h, i) => ({ ...h, lane: (i < 2 ? 'front' : 'back') as 'front' | 'back', actions: [...new Set([...h.actions, 'guard'])] as ActionId[], speed: h.id === who ? 300 : 50 - i })),
  enemies: (['f1', 'f2', 'b1'] as const).map((id, i) => ({ ...veilSiege.enemies.find(e => e.id === (id.startsWith('f') ? 'f1' : 'b1'))!, id, row: id.startsWith('f') ? 'front' as const : 'back' as const, maxHp: 9999, speed: 100 - i })),
  intents: (['f1', 'f2', 'b1'] as const).map(id => ({ sourceId: id, targetSlot: 1, name: 'QA announced attack', damage: 1, kind: 'physical' as const })) };
const entry = { hp: Object.fromEntries(party.map(h => [h.id, h.maxHp])) };
const state = beginBattle(data, entry, true).state;
const options = targetOptions(state, data, first.id, skill);
const targetId = (options.find(t => t.valid && t.id === 'f2') ?? options.find(t => t.valid)!).id;
const command: Command = { beat: state.beat, heroId: first.id, action: skill, targetId };
const expected = resolveCommand(state, data, command, true).state;
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: 'normal', intensity: 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, structuredClone(veilSiege));
const scene = new BattleScene(data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
ui.attach(scene);
scene.setBattleVisible(true);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data, entry, commands: [], commit: s => { localStorage.setItem('oi-committed', JSON.stringify(s)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
const qa = { action: () => command.action, target: () => targetId, state: () => ui.state, expected: () => expected };
declare global { interface Window { oiQA: typeof qa } }
window.oiQA = qa;
