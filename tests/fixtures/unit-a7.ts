// Presentation fixtures only; all outcomes are owned by the real resolver.
import {encounters,thicketAmbush} from '../../src/content/encounters/catalog';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition} from '../../src/core/battle/types';
export const unitA7Heroes=['metta','thiran','lalin','wila'] as const;
export type A7Hero=(typeof unitA7Heroes)[number];
export const saintActions=['attack','communion','lastlight','saintarc','saintstrike','sharewound','vowstrike'] as const satisfies readonly ActionId[];
export const dancerActions=['attack','cadence','closingstep','deepbeat','duet','echofoot','rounddance'] as const satisfies readonly ActionId[];
export const a7Actions=(hero:A7Hero):readonly ActionId[]=>hero==='metta'||hero==='thiran'?saintActions:dancerActions;
// Dancer skills need an ally whose skill is cooling down: the dancer attacks and the allies use their own skills first.
const needsCooldown:readonly ActionId[]=['cadence','duet','deepbeat','closingstep','rounddance','echofoot'];
export const foeArt='foe_spore_puff' as const,foeIntent='Spore Dust';
// scenario: normal (hero acts, foe hits the Knight) | hurt/down (foe hits the hero) | enemy-down (foe has 1 HP)
export function unitA7Fixture(hero:A7Hero,action:ActionId='attack',scenario='normal'){
 const from=encounters.find(d=>d.enemies.some(e=>e.art===foeArt&&d.intents.some(i=>i.sourceId===e.id&&i.name===foeIntent)))!;
 const foe=from.enemies.find(e=>e.art===foeArt&&from.intents.some(i=>i.sourceId===e.id&&i.name===foeIntent))!;
 const intent=from.intents.find(i=>i.sourceId===foe.id&&i.name===foeIntent)!;
 const base=thicketAmbush.heroes,merc=mercenaries.find(m=>m.id===hero)!;
 const data:EncounterDefinition={...structuredClone(thicketAmbush),
  heroes:[{...merc,speed:200,actions:[...a7Actions(hero)],lane:'front'},{...base.find(h=>h.id==='guardian')!,speed:60,actions:['attack','guard']},{...base.find(h=>h.id==='weaver')!,speed:50,actions:['attack','ward']}],
  enemies:[{...foe,id:'f1',row:'front',maxHp:scenario==='enemy-down'?1:foe.maxHp,speed:110}],
  intents:[{...intent,sourceId:'f1',targetSlot:scenario==='hurt'||scenario==='down'?0:1}]};
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,h.id===hero?(scenario==='down'?1:h.maxHp):Math.ceil(h.maxHp*.5)]))};
 const begin=beginBattle(data,entry,true).state;
 const prelude:Command[]=[];let state=begin;
 const play=(heroId:string,act:ActionId)=>{const options=targetOptions(state,data,heroId,act);const t=(options.find(o=>o.valid&&o.id==='f1')??options.find(o=>o.valid)!).id;const c:Command={beat:state.beat,heroId,action:act,targetId:t};prelude.push(c);state=resolveCommand(state,data,c,true).state;};
 if(needsCooldown.includes(action)){
  play(hero,'attack');
  while(state.outcome==='active'&&currentHeroId(state,data)!==hero){const id=currentHeroId(state,data)!;play(id,id==='guardian'?'guard':id==='weaver'?'ward':'attack');}
 }
 const options=targetOptions(state,data,hero,action);
 const targetId=(options.find(t=>t.valid&&t.id==='f1')??options.find(t=>t.valid&&t.id==='enemies')??options.find(t=>t.valid&&t.id==='guardian')??options.find(t=>t.valid)!).id;
 const command:Command={beat:state.beat,heroId:hero,action,targetId};const result=resolveCommand(state,data,command,true);
 return {data,entry,prelude,state,command,result};
}
