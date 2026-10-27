// Artwork reference only: real renderer/resolver, no healing artwork runtime.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { beginBattle, currentHeroId, resolveCommand, targetOptions } from '../../../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const skill = (new URLSearchParams(location.search).get('skill') ?? 'heal') as ActionId;
const role = skill === 'rouse' ? 'Knight' : skill === 'mend' ? 'Bard' : 'Priest';
const actor = [...heroes, ...mercenaries].find(h => h.role === role)!;
const party = [actor, ...heroes.filter(h => h.id !== actor.id).slice(0, 3)];
const data: EncounterDefinition = { ...structuredClone(veilSiege),
  heroes: party.map((h, i) => ({ ...h, speed: i === 0 ? 200 : 50, ...(i === 0 ? { actions: ['attack', skill] as ActionId[] } : {}) })),
  enemies: veilSiege.enemies.map(e => ({ ...e, maxHp: 9999, speed: 100 })),
  intents: veilSiege.enemies.map(e => ({ sourceId: e.id, targetSlot: 1, name: 'QA announced attack', damage: 4, kind: 'energy' as const })),
};
const entry = { hp: Object.fromEntries(data.heroes.map((h, i) => [h.id, skill === 'revive' && i === 1 ? 1 : h.maxHp - 15 - i * 3])) };
const prelude: Command[] = [];
let state = beginBattle(data, entry, true).state;
function attack(s: BattleState) {
  const heroId = currentHeroId(s, data)!;
  const targetId = targetOptions(s, data, heroId, 'attack').find(t => t.valid)!.id;
  const cmd: Command = { beat: s.beat, heroId, action: 'attack', targetId };
  return { cmd, result: resolveCommand(s, data, cmd, true) };
}
// Revive must target somebody who actually fell: build a replayable attack prelude.
if (skill === 'revive') {
  do {
    const { cmd, result } = attack(state); prelude.push(cmd); state = result.state;
  } while (currentHeroId(state, data) !== actor.id && prelude.length < 12);
  if (!state.heroes.some(h => h.hp === 0 && h.fell)) throw new Error('Revive prelude did not produce a fallen ally');
}
const targetId = targetOptions(state, data, actor.id, skill).filter(t => t.valid).find(t => t.id !== actor.id)?.id
  ?? targetOptions(state, data, actor.id, skill).find(t => t.valid)!.id;
const cast = resolveCommand(state, data, { beat: state.beat, heroId: actor.id, action: skill, targetId }, true);
const turn = cast.turns.find(t => t.actorId === actor.id && t.action === skill)!;
let tickState = cast.state;
const later = [];
for (let i = 0; i < 12 && tickState.round === state.round; i++) {
  const { result } = attack(tickState); later.push(...result.turns); tickState = result.state;
}
const tickEvents = later.flatMap(t => t.events).filter(e => e.type === 'heal' && e.sourceId === actor.id
  && (skill === 'bless' ? e.text === 'Renew.' : skill === 'mend' ? e.text === 'The song mends the party.' : e.text === 'The prayer lingers.'));
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: 'normal', intensity: 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, data);
const scene = new BattleScene(data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data, entry, commands: prelude,
  commit: s => { localStorage.setItem('healing-art-committed', JSON.stringify(s.commands)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
const qa = { anchors: () => {
  const rect = scene.game.canvas.getBoundingClientRect();
  const point = (id: string) => { const p = scene.actorPanels.get(id)!; return { id, x: rect.left + p.x, footY: rect.top + p.y, size: p.size }; };
  const eventType = skill === 'rouse' ? 'guard' : skill === 'revive' ? 'revive' : skill === 'bless' ? 'buff' : skill === 'mend' ? 'song' : 'heal';
  const events = turn.events.filter(e => e.type === eventType && e.sourceId === actor.id);
  return { source: point(actor.id), targets: [...new Set(events.map(e => e.targetId!))].map(point),
    tickTargets: [...new Set(tickEvents.map(e => e.targetId!))].map(point), events: turn.events, tickEvents,
    guard: turn.state.guard, prelude, before: state, after: turn.state };
}, committed: () => ui.state.commands };
declare global { interface Window { healingArtQA: typeof qa } }
window.healingArtQA = qa;
