// Presentation fixtures only; all outcomes are owned by the real resolver.
import {batSwarm,slimePair,thicketAmbush} from '../../src/content/encounters/catalog';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition} from '../../src/core/battle/types';
export const miraActions=['attack','hinder','volley','weakshot','pin','disengage','track'] as const satisfies readonly ActionId[];
export const tomaActions=['attack','acid','haste','bomb','fury','smoke','catalyst'] as const satisfies readonly ActionId[];
export const foeArts=['foe_dew_slime','foe_ember_slime','foe_ruin_bat'] as const;
export const foeIntents:Record<(typeof foeArts)[number],string>={foe_dew_slime:'Jelly Bounce',foe_ember_slime:'Ember Spark',foe_ruin_bat:'Nip'};
const source=(art:string)=>art==='foe_ruin_bat'?batSwarm:slimePair;
// scenario: normal (hero acts, foe hits the Knight) | hurt/down (foe hits the hero) | enemy-down (foe has 1 HP) | revive-free
export function unitA4Fixture(hero:'mira'|'toma',action:ActionId='attack',scenario='normal',art:(typeof foeArts)[number]='foe_dew_slime'){
 const from=source(art),foe=from.enemies.find(e=>e.art===art)!;
 const intent=from.intents.find(i=>i.sourceId===foe.id&&i.name===foeIntents[art])!;
 if(!intent)throw new Error('Missing real intent '+art);
 const base=thicketAmbush.heroes,merc=mercenaries.find(m=>m.id===hero)!;
 const actions=hero==='mira'?[...miraActions]:[...tomaActions];
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
