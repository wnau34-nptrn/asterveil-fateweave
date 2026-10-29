// Presentation fixtures only; all outcomes are owned by the real resolver.
import {encounters,thicketAmbush} from '../../src/content/encounters/catalog';
import {beginBattle,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {Command,EncounterDefinition} from '../../src/core/battle/types';
export const foeArts=['raider','brute'] as const;
export const foeIntents:Record<(typeof foeArts)[number],readonly string[]>={raider:['Raking Slash','Shadow Knife'],brute:['Crushing Blow','Rift Bolt']};
// scenario: normal (Lyra hits the foe, the foe answers the Knight) | hurt (the foe hits Lyra) | enemy-down (the foe has 1 HP)
export function unitA10Fixture(art:(typeof foeArts)[number]='raider',intentName?:string,scenario='normal'){
 const name=intentName??foeIntents[art][0]!;
 const from=encounters.find(d=>d.enemies.some(e=>e.art===art&&d.intents.some(i=>i.sourceId===e.id&&i.name===name)))!;
 const foe=from.enemies.find(e=>e.art===art&&from.intents.some(i=>i.sourceId===e.id&&i.name===name))!;
 const intent=from.intents.find(i=>i.sourceId===foe.id&&i.name===name)!;
 const base=thicketAmbush.heroes;
 const data:EncounterDefinition={...structuredClone(thicketAmbush),
  heroes:[{...base.find(h=>h.id==='tracer')!,speed:200,actions:['attack','execute'],lane:'front'},{...base.find(h=>h.id==='guardian')!,speed:60,actions:['attack','guard']},{...base.find(h=>h.id==='weaver')!,speed:50,actions:['attack','ward']}],
  enemies:[{...foe,id:'f1',row:'front',maxHp:scenario==='enemy-down'?1:foe.maxHp,speed:110}],
  intents:[{...intent,sourceId:'f1',targetSlot:scenario==='hurt'?0:1}]};
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,h.maxHp]))};
 const state=beginBattle(data,entry,true).state;
 const options=targetOptions(state,data,'tracer','attack');
 const command:Command={beat:state.beat,heroId:'tracer',action:'attack',targetId:options.find(t=>t.valid&&t.id==='f1')!.id};
 return {data,entry,prelude:[] as Command[],state,command,result:resolveCommand(state,data,command,true)};
}
