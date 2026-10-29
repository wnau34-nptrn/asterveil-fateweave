// Presentation fixtures only; all outcomes are owned by the real resolver.
import {encounters,thicketAmbush} from '../../src/content/encounters/catalog';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {ActionId,Command,EncounterDefinition} from '../../src/core/battle/types';
export const sefaActions=['ambush','attack','backstab','decoy','disarm','evade','knives'] as const satisfies readonly ActionId[];
export const lioActions=['attack','dread','finale','mend','note','solo','valor'] as const satisfies readonly ActionId[];
export const foeArts=['foe_riftweaver','foe_spore_puff'] as const;
export const foeIntents:Record<(typeof foeArts)[number],readonly string[]>={foe_riftweaver:['Rune Lash','Rift Needle','Ribbon Snare'],foe_spore_puff:['Spore Dust']};
// scenario: normal (hero acts, foe hits the Knight) | hurt/down (foe hits the hero) | enemy-down (foe has 1 HP)
export function unitA6Fixture(hero:'sefa'|'lio',action:ActionId='attack',scenario='normal',art:(typeof foeArts)[number]='foe_riftweaver',intentName?:string){
 const name=intentName??foeIntents[art][0]!;
 const from=encounters.find(d=>d.enemies.some(e=>e.art===art&&d.intents.some(i=>i.sourceId===e.id&&i.name===name)))!;
 const foe=from.enemies.find(e=>e.art===art&&from.intents.some(i=>i.sourceId===e.id&&i.name===name))!;
 const intent=from.intents.find(i=>i.sourceId===foe.id&&i.name===name)!;
 const base=thicketAmbush.heroes,merc=mercenaries.find(m=>m.id===hero)!;
 const actions=hero==='sefa'?[...sefaActions]:[...lioActions];
 const data:EncounterDefinition={...structuredClone(thicketAmbush),
  heroes:[{...merc,speed:200,actions,lane:'front'},{...base.find(h=>h.id==='guardian')!,speed:60,actions:['attack','guard']},{...base.find(h=>h.id==='weaver')!,speed:50,actions:['attack','ward']}],
  enemies:[{...foe,id:'f1',row:'front',maxHp:scenario==='enemy-down'?1:foe.maxHp,speed:110}],
  intents:[{...intent,sourceId:'f1',targetSlot:scenario==='hurt'||scenario==='down'?0:1}]};
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,scenario==='down'&&h.id===hero?1:h.maxHp]))};
 const begin=beginBattle(data,entry,true).state;
 // finale/solo need a song already playing: the bard plays valor, the others attack and the foe answers, then it is the bard's turn again.
 const prelude:Command[]=[];let state=begin;
 if(action==='finale'||action==='solo'){
  const play=(heroId:string,act:ActionId,targetId:string)=>{const c:Command={beat:state.beat,heroId,action:act,targetId};prelude.push(c);state=resolveCommand(state,data,c,true).state;};
  play(hero,'valor',hero);
  while(state.outcome==='active'&&currentHeroId(state,data)!==hero){const id=currentHeroId(state,data)!;play(id,'attack','f1');}
 }
 const options=targetOptions(state,data,hero,action);
 const targetId=(options.find(t=>t.valid&&t.id==='f1')??options.find(t=>t.valid&&t.id==='enemies')??options.find(t=>t.valid&&t.id==='guardian')??options.find(t=>t.valid)!).id;
 const command:Command={beat:state.beat,heroId:hero,action,targetId};const result=resolveCommand(state,data,command,true);
 return {data,entry,prelude,state,command,result};
}
