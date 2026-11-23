// Presentation fixtures only; all outcomes are owned by the real resolver.
import {batSwarm,eliteShadowSerpent,eliteWeepingSiren,lakeMist,slimePair,thicketAmbush,waterSpirit} from '../../src/content/encounters/catalog';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition} from '../../src/core/battle/types';
export const miraActions=['attack','hinder','volley','weakshot','pin','disengage','track'] as const satisfies readonly ActionId[];
export const tomaActions=['attack','acid','haste','bomb','fury','smoke','catalyst'] as const satisfies readonly ActionId[];
export const foeArts=['foe_dew_slime','foe_ember_slime','foe_ruin_bat'] as const;
export const foeIntents:Record<(typeof foeArts)[number],string>={foe_dew_slime:'Jelly Bounce',foe_ember_slime:'Ember Spark',foe_ruin_bat:'Nip'};
// Map 4 lake foes (ART-UNIT-ANIMATION-LAKE-001) ride the same fixture for clips; tests/unit-lake-foes.test.ts audits them.
export const plainLakeFoeArts=['foe_tide_slime','foe_mist_wisp','foe_stone_crab','foe_mirror_shade'] as const;
export const lakeEliteIntents={
 foe_shadow_serpent:['Shadow Fang','Venom Spit','Coil Gathering','Crushing Coil'],
 foe_weeping_siren:['Tide Lash','Weeping Song','Drowning Call'],
} as const;
export type LakeEliteArt=keyof typeof lakeEliteIntents;
export const lakeFoeArts=[...plainLakeFoeArts,'foe_shadow_serpent','foe_weeping_siren'] as const;
export const lakeFoeIntents:Record<(typeof lakeFoeArts)[number],string>={foe_tide_slime:'Water Spit',foe_mist_wisp:'Mist Needle',foe_stone_crab:'Pincer',foe_mirror_shade:'Mirror Strike',foe_shadow_serpent:lakeEliteIntents.foe_shadow_serpent[0],foe_weeping_siren:lakeEliteIntents.foe_weeping_siren[0]};
const source=(art:string)=>{
 if(art==='foe_shadow_serpent')return eliteShadowSerpent;
 if(art==='foe_weeping_siren')return eliteWeepingSiren;
 return art==='foe_ruin_bat'?batSwarm:art==='foe_mirror_shade'?waterSpirit:['foe_tide_slime','foe_mist_wisp','foe_stone_crab'].includes(art)?lakeMist:slimePair;
};
// scenario: normal (hero acts, foe hits the Knight) | hurt/down (foe hits the hero) | enemy-down (foe has 1 HP) | revive-free
export function unitA4Fixture(hero:'mira'|'toma',action:ActionId='attack',scenario='normal',art:(typeof foeArts)[number]|(typeof lakeFoeArts)[number]='foe_dew_slime',intentName=({...foeIntents,...lakeFoeIntents})[art]){
 const from=source(art),foe=from.enemies.find(e=>e.art===art)!;
 const intent=from.intents.find(i=>i.sourceId===foe.id&&i.name===intentName)!;
 if(!intent)throw new Error('Missing real intent '+art+': '+intentName);
 const base=thicketAmbush.heroes,merc=mercenaries.find(m=>m.id===hero)!;
 const actions=hero==='mira'?[...miraActions]:[...tomaActions];
 const foeSlot=art in lakeEliteIntents?foe.id:'f1';
 const data:EncounterDefinition={...structuredClone(thicketAmbush),
  heroes:[{...merc,speed:200,actions,lane:'front'},{...base.find(h=>h.id==='guardian')!,speed:60,actions:['attack','guard']},{...base.find(h=>h.id==='weaver')!,speed:50,actions:['attack','ward']}],
  enemies:[{...foe,reserve:false,id:foeSlot,row:foeSlot==='b1'?'back':'front',maxHp:scenario==='enemy-down'?1:foe.maxHp,speed:110}],
  intents:[{...intent,sourceId:foeSlot,targetSlot:scenario==='hurt'||scenario==='down'?0:1}]};
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,scenario==='down'&&h.id===hero?1:h.maxHp]))};
 const state=beginBattle(data,entry,true).state;
 const options=targetOptions(state,data,hero,action);
 const targetId=(options.find(t=>t.valid&&t.id===foeSlot)??options.find(t=>t.valid&&t.id==='enemies')??options.find(t=>t.valid&&t.id==='guardian')??options.find(t=>t.valid)!).id;
 const command:Command={beat:state.beat,heroId:hero,action,targetId};const result=resolveCommand(state,data,command,true);
 return {data,entry,prelude:[] as Command[],state,command,result};
}
