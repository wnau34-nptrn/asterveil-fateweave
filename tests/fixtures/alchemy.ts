import {veilSiege} from '../../src/content/encounters/veil-siege';
import {heroes} from '../../src/content/heroes/team';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {EncounterDefinition,ActionId,Command} from '../../src/core/battle/types';
import type {AlchemySkill} from '../../src/game/visuals/alchemy-fx';

// Definitions + entry HP + legal commands only. No injected battle state/events.
export function alchemyFixture(skill:AlchemySkill,scenario='normal'){
 const alchemist=mercenaries.find(h=>h.role==='Alchemist')!;
 const party=[alchemist,...heroes.filter(h=>['Knight','Mage','Priest'].includes(h.role))];
 const caps=scenario==='spread'?{acidspread:1}:scenario==='wide'?{smokewide:20}:scenario==='poison'?{smokepoison:1}:scenario.startsWith('chain')?{chainreaction:1}:scenario==='quickbrew'?{quickbrew:1}:{};
 const slots:('f1'|'f2'|'b1'|'b2')[]=scenario==='backonly'?['b1','b2']:scenario==='chainfallback'?['f1','b1','b2']:['f1','f2','b1','b2'];
 const data:EncounterDefinition={...structuredClone(veilSiege),
  heroes:party.map((h,i)=>({...h,actions:[...h.actions,'guard'] as ActionId[],speed:i===0?200:i===1&&['acted','refresh'].includes(scenario)?210:i===1&&['nextalready','chainother','outgoing'].includes(scenario)?180:50,
   ...(i===0?{actions:['attack',...new Set<ActionId>([skill,'acid','haste','fury','catalyst'])],passive:scenario==='potent'?'potent' as const:undefined,talents:{caps,rules:scenario==='deeper'?{corrodeBonus:3}:['heal','fullhp','overflow'].includes(scenario)?{hasteHeal:8}:{}},gear:scenario==='overflow'?{overflowCap:8}:undefined}:{}),
   ...(i===1&&scenario==='refresh'?{actions:['attack','fury'] as ActionId[]}:{}),
  })),
  enemies:slots.map((id,i)=>({...veilSiege.enemies.find(e=>e.id===(id.startsWith('f')?'f1':'b1'))!,id,row:id.startsWith('f')?'front' as const:'back' as const,
   maxHp:id==='f1'&&(scenario==='kill'||scenario==='down')?1:id==='f1'&&scenario.startsWith('chain')?20:9999,speed:100-i,...(scenario==='boss'&&id==='f1'?{boss:true}:{})})),
  intents:slots.map(id=>({sourceId:id,targetSlot:1,name:'QA actual announced attack',damage:skill==='fury'&&scenario!=='expiry'||['physical','energy'].includes(scenario)?10:1,kind:scenario==='energy'?'energy' as const:'physical' as const,...(scenario==='boss'?{unstoppable:true}:{})})),
 };
 const entry={hp:Object.fromEntries(party.map(h=>[h.id,scenario==='downinvalid'&&h.id==='guardian'?0:h.maxHp-(scenario==='heal'&&h.id==='guardian'?15:0)]))};
 const prelude:Command[]=[];
 let state=beginBattle(data,entry,true).state;
 const act=(heroId:string,action:ActionId,targetId:string)=>{const c:Command={beat:state.beat,heroId,action,targetId};state=resolveCommand(state,data,c,true).state;prelude.push(c);};
 if(['acted','refresh'].includes(scenario))act('guardian',scenario==='refresh'?'fury':'attack',scenario==='refresh'?'guardian':'f1');
 const acidPrelude=['corroded','expired','chain','chainother','chainfallback'].includes(scenario);
 if(acidPrelude){
  act(alchemist.id,'acid','f1');
  if(scenario!=='chainother'){
   const wanted=scenario==='expired'?4:2;
   for(let n=0;(state.round<wanted||currentHeroId(state,data)!==alchemist.id)&&n<40;n++){
    const id=currentHeroId(state,data);if(!id)throw new Error('No legal prelude actor');
    // Avoid killing the corroded target during the prelude.
    const target=targetOptions(state,data,id,'attack').find(t=>t.valid&&t.id!=='f1');
    act(id,target?'attack':'guard',target?.id??id);
   }
  }
 }
 const actor=data.heroes.find(h=>h.id===currentHeroId(state,data))!;
 if(actor.id!==(scenario==='chainother'?'guardian':alchemist.id))throw new Error('Wrong fixture actor');
 const action:ActionId=scenario==='chainother'?'attack':skill;
 const preferred=['haste','fury'].includes(action)?scenario==='self'?alchemist.id:'guardian':'f1';
 const targetId=targetOptions(state,data,actor.id,action).find(t=>t.valid&&t.id===preferred)?.id??targetOptions(state,data,actor.id,action).find(t=>t.valid)!.id;
 const command:Command={beat:state.beat,heroId:actor.id,action,targetId};
 const cast=resolveCommand(state,data,command,true),turn=cast.turns.find(t=>t.actorId===actor.id&&t.action===action)!;
 // Additional legal commands expose later corrosion/Fury damage and expiry without altering the captured cast.
 let laterState=cast.state;const later=[];
 for(let n=0;n<16&&laterState.outcome==='active'&&laterState.round<state.round+(scenario==='expiry'?3:2);n++){
  const id=currentHeroId(laterState,data);if(!id)break;
  const target=targetOptions(laterState,data,id,'attack').find(t=>t.valid&&t.id==='f1')??targetOptions(laterState,data,id,'attack').find(t=>t.valid)!;
  const c:Command={beat:laterState.beat,heroId:id,action:'attack',targetId:target.id};
  const result=resolveCommand(laterState,data,c,true);later.push({command:c,turns:result.turns});laterState=result.state;
 }
 const captureFollowups=scenario==='expiry'?later:['outgoing','laterhit'].includes(scenario)?later.slice(0,1):[];
 let captureState=cast.state;for(const step of captureFollowups)captureState=resolveCommand(captureState,data,step.command,true).state;
 return {data,entry,actor,alchemist,prelude,state,targetId,command,cast,turn,turns:cast.turns,later,laterState,captureFollowups,captureState};
}
