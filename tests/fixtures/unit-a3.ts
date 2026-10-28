// Presentation fixtures only; all outcomes are owned by the real resolver.
import {thicketAmbush} from '../../src/content/encounters/catalog';
import {beginBattle,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition} from '../../src/core/battle/types';
export const serenActions=['attack','heal','prayer','sanctuary','revive','halo','bless'] as const satisfies readonly ActionId[];
export const myconIntents=['Spore Hex'] as const;
// scenario: normal (Seren casts, Mycon hexes the Knight) | hurt/down (Mycon hexes Seren) | enemy-down | revive
export function unitA3Fixture(action:ActionId='attack',scenario='normal'){
 const mycon=thicketAmbush.enemies.find(e=>e.art==='foe_mycon')!;
 const intent=thicketAmbush.intents.find(i=>i.sourceId===mycon.id&&i.name==='Spore Hex')!;
 const base=thicketAmbush.heroes;
 const ids=scenario==='revive'?['guardian','weaver','healer']:['healer','guardian','weaver'];
 const data:EncounterDefinition={...structuredClone(thicketAmbush),heroes:ids.map((id,i)=>({...base.find(h=>h.id===id)!,speed:id==='healer'&&scenario!=='revive'?200:id==='guardian'&&scenario==='revive'?200:50-i,
  actions:id==='healer'?[...serenActions]:id==='guardian'?['attack','guard']:['attack','ward']})),
  enemies:[{...mycon,id:'b1',row:'back',maxHp:scenario==='enemy-down'?1:mycon.maxHp,speed:110}],
  intents:[{...intent,sourceId:'b1',targetSlot:scenario==='hurt'||scenario==='down'||scenario==='revive'?0:1}]};
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,scenario==='down'&&h.id==='healer'?1:scenario==='revive'&&h.id==='guardian'?1:['heal','bless','sanctuary','prayer'].includes(action)||scenario==='wounded'?Math.floor(h.maxHp/2):h.maxHp]))};
 const prelude:Command[]=[];let state=beginBattle(data,entry,true).state;
 if(scenario==='revive')for(const [heroId,skill,targetId] of [['guardian','attack','b1'],['weaver','ward','weaver']] as const){
  const cmd={beat:state.beat,heroId,action:skill,targetId};prelude.push(cmd);state=resolveCommand(state,data,cmd,true).state;
 }
 const actualAction=scenario==='revive'?'revive':action;
 const options=targetOptions(state,data,'healer',actualAction);
 const targetId=(options.find(t=>t.valid&&t.id==='guardian')??options.find(t=>t.valid)!).id;
 const command={beat:state.beat,heroId:'healer',action:actualAction,targetId};const result=resolveCommand(state,data,command,true);
 return {data,entry,prelude,state,command,result};
}
