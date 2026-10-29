// Presentation fixtures only; all outcomes are owned by the real resolver.
import {encounters,thicketAmbush} from '../../src/content/encounters/catalog';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition} from '../../src/core/battle/types';
export const garranActions=['attack','brace','pierce','halt','hold','spearwall','warcry'] as const satisfies readonly ActionId[];
export const brannActions=['attack','taunt','slam','quake','tremor','stonearmor','guardstone'] as const satisfies readonly ActionId[];
export const foeArts=['foe_tusker','foe_stalker','foe_thorn_beetle'] as const;
export const foeIntents:Record<(typeof foeArts)[number],readonly string[]>={foe_tusker:['Tusk Charge','Stampede'],foe_stalker:['Thorn Pounce'],foe_thorn_beetle:['Thorn Bite']};
// scenario: normal (hero acts, foe hits the Knight) | hurt/down (foe hits the hero) | enemy-down (foe has 1 HP)
export function unitA5Fixture(hero:'garran'|'brann',action:ActionId='attack',scenario='normal',art:(typeof foeArts)[number]='foe_tusker',intentName?:string){
 const name=intentName??foeIntents[art][0]!;
 const from=encounters.find(d=>d.enemies.some(e=>e.art===art&&d.intents.some(i=>i.sourceId===e.id&&i.name===name)))!;
 const foe=from.enemies.find(e=>e.art===art&&from.intents.some(i=>i.sourceId===e.id&&i.name===name))!;
 const intent=from.intents.find(i=>i.sourceId===foe.id&&i.name===name)!;
 const base=thicketAmbush.heroes,merc=mercenaries.find(m=>m.id===hero)!;
 const actions=hero==='garran'?[...garranActions]:[...brannActions];
 const data:EncounterDefinition={...structuredClone(thicketAmbush),
  heroes:[{...merc,speed:200,actions,lane:'front'},{...base.find(h=>h.id==='guardian')!,speed:60,actions:['attack','guard']},{...base.find(h=>h.id==='weaver')!,speed:50,actions:['attack','ward']}],
  enemies:[{...foe,id:'f1',row:'front',maxHp:scenario==='enemy-down'?1:foe.maxHp,speed:110}],
  intents:[{...intent,sourceId:'f1',targetSlot:scenario==='hurt'||scenario==='down'?0:1}]};
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,scenario==='down'&&h.id===hero?1:h.maxHp]))};
 const state=beginBattle(data,entry,true).state;
 const options=targetOptions(state,data,hero,action);
 const targetId=(options.find(t=>t.valid&&t.id==='f1')??options.find(t=>t.valid&&t.id==='enemies')??options.find(t=>t.valid&&t.id==='guardian')??options.find(t=>t.valid)!).id;
 const command:Command={beat:state.beat,heroId:hero,action,targetId};const result=resolveCommand(state,data,command,true);
 return {data,entry,prelude:[] as Command[],state,command,result};
}
