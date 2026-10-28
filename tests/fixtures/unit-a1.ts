// Synthetic presentation encounters only; commands/death/revive are resolved normally.
import { scoutPatrol } from '../../src/content/encounters/catalog';
import { beginBattle, resolveCommand, targetOptions } from '../../src/core/battle/engine';
import type { ActionId, Command, EncounterDefinition } from '../../src/core/battle/types';
export const eiraActions = ['attack','bolt','ward','sigil','storm','aegis','dispel'] as const satisfies readonly ActionId[];
export function unitA1Fixture(action: ActionId = 'bolt', scenario = 'normal') {
  const original = scoutPatrol.heroes;
  const data: EncounterDefinition = { ...structuredClone(scoutPatrol),
    heroes: ['weaver','guardian','healer'].map((id,i) => ({ ...original.find(h=>h.id===id)!, speed: i===0?200:50,
      actions: id==='weaver'?[...eiraActions]:id==='healer'?['attack','heal','revive']:['attack','guard'] })),
    enemies: scoutPatrol.enemies.map(e=>({...e,maxHp:scenario==='enemy-down'?1:e.maxHp})),
    intents: scoutPatrol.intents.map(i=>({...i,targetSlot:0})),
  };
  const entry = { hp: Object.fromEntries(data.heroes.map(h=>[h.id,scenario==='revive'&&h.id==='weaver'?1:h.maxHp])) };
  const prelude: Command[] = [];
  let state=beginBattle(data,entry,true).state;
  if(scenario==='revive') {
    for(const [heroId,skill,targetId] of [['weaver','attack','b1'],['guardian','guard','guardian']] as const){
      const cmd={beat:state.beat,heroId,action:skill,targetId};prelude.push(cmd);state=resolveCommand(state,data,cmd,true).state;
    }
    if(state.heroes.find(h=>h.id==='weaver')!.hp!==0)throw new Error('Expected resolver-owned Eira down');
  }
  const actorId=scenario==='revive'?'healer':'weaver';
  const actualAction=scenario==='revive'?'revive':action;
  const targetId=targetOptions(state,data,actorId,actualAction).find(t=>t.valid&&(scenario!=='revive'||t.id==='weaver'))!.id;
  const command={beat:state.beat,heroId:actorId,action:actualAction,targetId};
  const result=resolveCommand(state,data,command,true);
  return {data,entry,prelude,state,command,result};
}
