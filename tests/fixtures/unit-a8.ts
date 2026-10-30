// Presentation fixtures only; all outcomes are owned by the real resolver.
import {encounters,thicketAmbush} from '../../src/content/encounters/catalog';
import {beginBattle,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition} from '../../src/core/battle/types';
export const foeArts=['foe_golem','foe_rift_channeler','foe_rift_wisp','foe_shard_crawler'] as const;
export type FoeArt=(typeof foeArts)[number];
// Every intent name the real content gives these identities (species.ts and the hand-authored encounters). Asserted against the catalog in tests/unit-a8.test.ts.
export const foeIntents:Record<FoeArt,readonly string[]>={foe_golem:['Crystal Fist','Stone Fist','Veil Quake'],foe_rift_channeler:['Rift Beam','Rift Bolt'],foe_rift_wisp:['Star Flame'],foe_shard_crawler:['Crystal Stab']};
export const sheetOf={foe_golem:'golem',foe_rift_channeler:'channeler',foe_rift_wisp:'wisp',foe_shard_crawler:'crawler'} as const;
// scenario: normal (the Knight attacks, the foe hits the second hero) | hurt/down (the foe hits the Knight) | enemy-down (the foe has 1 HP)
export function unitA8Fixture(art:FoeArt,intentName?:string,scenario='normal',action:ActionId='attack'){
 const name=intentName??foeIntents[art][0]!;
 const from=encounters.find(d=>d.enemies.some(e=>e.art===art&&d.intents.some(i=>i.sourceId===e.id&&i.name===name)))!;
 const foe=from.enemies.find(e=>e.art===art&&from.intents.some(i=>i.sourceId===e.id&&i.name===name))!;
 const intent=from.intents.find(i=>i.sourceId===foe.id&&i.name===name)!;
 const base=thicketAmbush.heroes;
 const data:EncounterDefinition={...structuredClone(thicketAmbush),
  heroes:[{...base.find(h=>h.id==='tracer')!,speed:200,actions:['attack']},{...base.find(h=>h.id==='guardian')!,speed:60,actions:['attack','guard']},{...base.find(h=>h.id==='weaver')!,speed:50,actions:['attack','ward']}],
  enemies:[{...foe,id:'f1',row:'front',reserve:false,maxHp:scenario==='enemy-down'?1:foe.maxHp,speed:110}],
  intents:[{...intent,sourceId:'f1',targetSlot:scenario==='hurt'||scenario==='down'?0:1}]};
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,scenario==='down'&&h.id==='tracer'?1:h.maxHp]))};
 const state=beginBattle(data,entry,true).state,prelude:Command[]=[];
 const options=targetOptions(state,data,'tracer',action);
 const targetId=(options.find(t=>t.valid&&t.id==='f1')??options.find(t=>t.valid)!).id;
 const command:Command={beat:state.beat,heroId:'tracer',action,targetId};const result=resolveCommand(state,data,command,true);
 return {data,entry,prelude,state,command,result};
}
