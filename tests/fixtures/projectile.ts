import { veilSiege } from '../../src/content/encounters/veil-siege';
import { heroes } from '../../src/content/heroes/team';
import { mercenaries } from '../../src/content/heroes/mercenaries';
import { beginBattle,currentHeroId,resolveCommand,targetOptions } from '../../src/core/battle/engine';
import type { Command,EncounterDefinition,ActionId } from '../../src/core/battle/types';
import type { ProjectileSkill } from '../../src/game/visuals/projectile-fx';
// QA definitions and legal commands only; never inject state, timestamps or resolver events.
export function projectileFixture(skill:ProjectileSkill,scenario='normal') {
const actor = mercenaries.find(h => h.role === (skill === 'knives' ? 'Scout' : 'Archer'))!;
const delayed = ['delayed','followup','targetdown','sourcedown'].includes(scenario);
const helper = heroes.find(h => h.id !== actor.id)!;
const party = delayed ? [helper, actor, ...heroes.filter(h => h.id !== helper.id && h.id !== actor.id).slice(0,2)]
  : [actor, ...heroes.filter(h => h.id !== actor.id).slice(0,3)];
const caps = scenario === 'twin' ? { twinknives: 1 } : scenario === 'volleyhinder' ? { volleyhinder: 1 }
  : scenario === 'quickstep' ? { quickstep: 1 } : scenario === 'covershot' ? { covershot: 6 } : scenario === 'quick' ? { quickknives: 1 } : scenario === 'heavy' ? { heavyhinder: 1 } : {};
const slots: ('f1'|'f2'|'b1'|'b2')[] = scenario === 'frontonly' ? ['f1','f2'] : ['f1','f2','b1','b2'];
const data: EncounterDefinition = { ...structuredClone(veilSiege),
  heroes: party.map(h => ({ ...h, speed: h.id === actor.id ? 200 : delayed && h.id === helper.id ? 210 : 50,
    ...(h.id === actor.id ? { actions: ['attack', skill] as ActionId[], talents: { caps } } : delayed && h.id === helper.id ? { actions: ['attack','hinder'] as ActionId[] } : {}) })),
  enemies: slots.map((id,i) => ({ ...veilSiege.enemies.find(e => e.id === (id.startsWith('f') ? 'f1' : 'b1'))!, id, row: id.startsWith('f') ? 'front' as const : 'back' as const, maxHp: scenario==='targetdown'&&id==='f1'?23:9999, speed:100-i, ...(scenario==='veiled'?{traits:['veilguard' as const]}:{}) })),
  intents: slots.map(id => ({ sourceId: id, targetSlot: scenario==='sourcedown'?1:scenario==='covershot'?1:0, name: 'QA announced attack', damage: scenario==='sourcedown'?999:1, kind: 'energy' as const })),
};
const entry = { hp: Object.fromEntries(data.heroes.map(h => [h.id, h.maxHp])) };
const prelude: Command[] = [];
let state = beginBattle(data, entry, true).state;
const chosen = 'f1';
if (delayed) {
  const cmd: Command = { beat: state.beat, heroId: helper.id, action: 'hinder', targetId: chosen };
  prelude.push(cmd); state = resolveCommand(state, data, cmd, true).state;
}
if (currentHeroId(state,data) !== actor.id) throw new Error('Wrong actor in artwork reference');
const targetId = targetOptions(state,data,actor.id,skill).find(t => t.valid && t.id === chosen)?.id
  ?? targetOptions(state,data,actor.id,skill).find(t => t.valid)!.id;
const command: Command = { beat: state.beat, heroId: actor.id, action: skill, targetId };
const cast = resolveCommand(state,data,command,true);
const turn = cast.turns.find(t => t.actorId === actor.id && t.action === skill)!;
const later = [...cast.turns.filter(t => t !== turn)];
const commands:Command[]=[];
let next = cast.state;
for (let i=0; i<12 && next.round === state.round && next.outcome === 'active'; i++) {
  const heroId = currentHeroId(next,data)!;
  const target = targetOptions(next,data,heroId,'attack').find(t => t.valid)!.id;
  const cmd:Command={beat:next.beat,heroId,action:'attack',targetId:target};commands.push(cmd);
  const result = resolveCommand(next,data,cmd,true);
  later.push(...result.turns); next=result.state;
}
const followup = later.flatMap(t => t.events).filter(e => e.sourceId === actor.id && e.text === 'Tracking shot.');
return {data,entry,actor,prelude,state,command,targetId,cast,turn,commands,turns:[turn,...later],followup};
}
