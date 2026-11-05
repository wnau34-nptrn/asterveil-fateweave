// Presentation fixtures only; all outcomes are owned by the real resolver.
import {encounters,thicketAmbush} from '../../src/content/encounters/catalog';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition} from '../../src/core/battle/types';
// Identities whose A7 bodies ship. Odran (thiran) and Isolde (wila) were redesigned (PR #120) and use the seed + procedural motion until A7-003.
export const unitA12Heroes=['kael','wynne','astrid'] as const;
export type A12Hero=(typeof unitA12Heroes)[number];
// Only actions the fixture can stage from a fresh battle (circlefist/perfectfist, lifetoll/tollring, deflectfate, turncycle/doubledial need mid-battle setup the fixture does not script).
export const a12Actions=(hero:A12Hero):readonly ActionId[]=>({
 kael:['attack','gatherfist','flowfist','releasefist','storedfist'],
 wynne:['attack','threadhex','knothex','longthread','wovenhex'],
 astrid:['attack','starneedle','crossing','readorbit'],
} as const)[hero] as readonly ActionId[];
// Setup actions tried (in order) when the skill has no valid target at the start of the battle (charges, curses, marks).
const setups:readonly ActionId[]=['attack','gatherfist','threadhex','starneedle','readorbit'];
export const foeArt='foe_spore_puff' as const,foeIntent='Spore Dust';
// scenario: normal (hero acts, foe hits the Knight) | hurt/down (foe hits the hero) | block (foe's hit on the hero is fully absorbed: 0 damage) | enemy-down (foe has 1 HP)
export function unitA12Fixture(hero:A12Hero,action:ActionId='attack',scenario='normal'){
 const from=encounters.find(d=>d.enemies.some(e=>e.art===foeArt&&d.intents.some(i=>i.sourceId===e.id&&i.name===foeIntent)))!;
 const foe=from.enemies.find(e=>e.art===foeArt&&from.intents.some(i=>i.sourceId===e.id&&i.name===foeIntent))!;
 const intent=from.intents.find(i=>i.sourceId===foe.id&&i.name===foeIntent)!;
 const base=thicketAmbush.heroes,merc=mercenaries.find(m=>m.id===hero)!;
 const data:EncounterDefinition={...structuredClone(thicketAmbush),
  heroes:[{...merc,speed:200,actions:[...a12Actions(hero)],lane:'front'},{...base.find(h=>h.id==='guardian')!,speed:60,actions:['attack','guard']},{...base.find(h=>h.id==='weaver')!,speed:50,actions:['attack','ward']}],
  enemies:[{...foe,id:'f1',row:'front',maxHp:scenario==='enemy-down'?1:foe.maxHp,speed:110}],
  intents:[{...intent,sourceId:'f1',targetSlot:scenario==='hurt'||scenario==='down'||scenario==='block'?0:1,...(scenario==='block'?{damage:0}:{})}]};
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,h.id===hero?(scenario==='down'?1:h.maxHp):Math.ceil(h.maxHp*.5)]))};
 const begin=beginBattle(data,entry,true).state;
 const prelude:Command[]=[];let state=begin;
 const play=(heroId:string,act:ActionId)=>{const options=targetOptions(state,data,heroId,act);const t=(options.find(o=>o.valid&&o.id==='f1')??options.find(o=>o.valid)!).id;const c:Command={beat:state.beat,heroId,action:act,targetId:t};prelude.push(c);state=resolveCommand(state,data,c,true).state;};
 const valid=()=>targetOptions(state,data,hero,action).some(o=>o.valid);
 const base0={state,len:prelude.length};
 if(!valid())for(const setup of setups){
  state=base0.state;prelude.length=base0.len;
  if(!targetOptions(state,data,hero,setup).some(o=>o.valid))continue;
  play(hero,setup);
  for(let i=0;i<14&&state.outcome==='active'&&!valid();i++){
   while(state.outcome==='active'&&currentHeroId(state,data)!==hero){const id=currentHeroId(state,data)!;play(id,id==='guardian'?'guard':id==='weaver'?'ward':'attack');}
   if(!valid()&&state.outcome==='active')play(hero,targetOptions(state,data,hero,setup).some(o=>o.valid)?setup:'attack');
  }
  if(valid())break;
 }
 const options=targetOptions(state,data,hero,action);
 const targetId=(options.find(t=>t.valid&&t.id==='f1')??options.find(t=>t.valid&&t.id==='enemies')??options.find(t=>t.valid&&t.id==='guardian')??options.find(t=>t.valid)!).id;
 const command:Command={beat:state.beat,heroId:hero,action,targetId};const result=resolveCommand(state,data,command,true);
 return {data,entry,prelude,state,command,result};
}
