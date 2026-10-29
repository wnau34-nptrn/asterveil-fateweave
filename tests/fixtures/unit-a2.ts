// Presentation fixtures only; all outcomes are owned by the real resolver.
import {firstClash,vanguardCaptain} from '../../src/content/encounters/catalog';
import {beginBattle,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition,HeroTalents} from '../../src/core/battle/types';
export const aegisActions=['attack','guard','bash','rally','challenge','bulwark','rouse'] as const satisfies readonly ActionId[];
export const guardIntents=['Crushing Blow','Rift Bolt','Shield Smash','Mace Swing'] as const;
export function unitA2Fixture(action:ActionId='attack',scenario='normal',intentName='Rift Bolt'){
 const source=intentName==='Shield Smash'||intentName==='Mace Swing'?vanguardCaptain:firstClash;
 const foe=source.enemies.find(e=>e.art==='foe_vargoth_guard')!;
 const intent=source.intents.find(i=>i.sourceId===foe.id&&i.name===intentName)!;
 if(!intent)throw new Error('Missing real guard intent '+intentName);
 const caps:HeroTalents['caps']=scenario==='counter'?{guardcounter:8}:scenario==='reflect'?{reflectbash:30}:scenario==='retribution'?{retribution:8}:scenario==='banner'?{brightbanner:6,rallybanner:0}:{};
 const data:EncounterDefinition={...structuredClone(firstClash),heroes:['guardian','weaver','healer'].map((id,i)=>({...firstClash.heroes.find(h=>h.id===id)!,speed:i===0?200:50,
  actions:id==='guardian'?[...aegisActions]:id==='healer'?['attack','heal','revive']:['attack','ward'],...(id==='guardian'?{talents:{caps}}:{})})),
  enemies:[{...foe,id:'f1',maxHp:scenario==='enemy-down'?1:foe.maxHp,speed:110}],intents:[{...intent,sourceId:'f1',targetSlot:scenario==='counter'?1:0}]};
 if(scenario==='duplicate'){data.enemies=[...data.enemies,{...data.enemies[0]!,id:'f2'}];data.intents=[...data.intents,{...data.intents[0]!,sourceId:'f2',targetSlot:1}];}
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,(scenario==='revive'||scenario==='down')&&h.id==='guardian'?1:scenario==='wounded'?Math.floor(h.maxHp/2):h.maxHp]))};
 const prelude:Command[]=[];let state=beginBattle(data,entry,true).state;
 if(scenario==='revive')for(const [heroId,skill,targetId] of [['guardian','attack','f1'],['weaver','ward','weaver']] as const){
  const cmd={beat:state.beat,heroId,action:skill,targetId};prelude.push(cmd);state=resolveCommand(state,data,cmd,true).state;
 }
 const actorId=scenario==='revive'?'healer':'guardian',actualAction=scenario==='revive'?'revive':action;
 const options=targetOptions(state,data,actorId,actualAction);
 const targetId=options.find(t=>t.valid&&(scenario==='revive'?t.id==='guardian':scenario==='counter'?t.id===state.intent?.targetId:true))!.id;
 const command={beat:state.beat,heroId:actorId,action:actualAction,targetId};const result=resolveCommand(state,data,command,true);
 return {data,entry,prelude,state,command,result};
}
