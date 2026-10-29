import {veilSiege} from '../../src/content/encounters/veil-siege';
import {heroes} from '../../src/content/heroes/team';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {EncounterDefinition,ActionId,Command} from '../../src/core/battle/types';
import type {EarthSkill} from '../../src/game/visuals/earth-fx';
// Synthetic definitions and replayable legal commands, never injected state/events.
export function earthFixture(skill:EarthSkill,scenario='normal'){
const actor=(skill==='bash'?heroes:mercenaries).find(h=>h.role===(skill==='bash'?'Knight':'Warden'))!;
const party=skill==='bash'?[actor,...heroes.filter(h=>h.id!==actor.id).slice(0,3)]
  :[actor,...heroes.filter(h=>['Knight','Mage','Priest'].includes(h.role))];
const caps=scenario==='reflect'?{reflectbash:30}:scenario==='retribution'?{retribution:8}:scenario==='runequake'?{runequake:1}:['skyhammer','skyfull','skyone'].includes(scenario)?{skyhammer:4}:{};
const slots:('f1'|'f2'|'b1'|'b2')[]=scenario==='backonly'?['b1','b2']:['f1','f2','b1','b2'];
const energy=scenario==='energy'||scenario==='reflect'||scenario==='redirect';
const data:EncounterDefinition={...structuredClone(veilSiege),
 heroes:party.map((h,i)=>({...h,speed:i===0?200:50,...(i===0?{actions:['attack',skill] as ActionId[],talents:{caps}}:{})})),
 enemies:slots.map((id,i)=>({...veilSiege.enemies.find(e=>e.id===(id.startsWith('f')?'f1':'b1'))!,id,row:id.startsWith('f')?'front' as const:'back' as const,maxHp:scenario==='down'&&id==='f1'?10:scenario==='targetdown'&&id==='f1'?4:scenario==='frontdown'&&id.startsWith('f')?6:9999,...(scenario==='steadfast'&&id==='f1'?{boss:true}:{}),speed:100-i})),
 intents:slots.map(id=>({sourceId:id,targetSlot:scenario==='incoming'?0:1,name:'QA actual announced attack',damage:scenario==='sourcedown'&&id==='f1'?999:1,kind:energy?'energy' as const:'physical' as const,...(scenario==='unstoppable'?{unstoppable:true}:{})})),
};
const entry={hp:Object.fromEntries(party.map(h=>[h.id,h.maxHp-(h.id===actor.id?(scenario==='skyhammer'?15:scenario==='skyone'?1:0):0)]))};
const prelude:Command[]=[];
let state=beginBattle(data,entry,true).state;
if(scenario==='steadfast'){
  while((state.round<3||currentHeroId(state,data)!==actor.id)&&prelude.length<24){
    const heroId=currentHeroId(state,data)!,action=prelude.length===0?'bash' as const:'attack' as const;
    const targetId=targetOptions(state,data,heroId,action).find(t=>t.valid&&t.id==='f1')!.id;
    const cmd:Command={beat:state.beat,heroId,action,targetId};prelude.push(cmd);state=resolveCommand(state,data,cmd,true).state;
  }
  if(state.round!==3)throw new Error('Steadfast prelude failed');
}

if(currentHeroId(state,data)!==actor.id)throw new Error('Wrong reference actor');
const targetId=targetOptions(state,data,actor.id,skill).find(t=>t.valid&&t.id==='f1')?.id??targetOptions(state,data,actor.id,skill).find(t=>t.valid)!.id;
const command:Command={beat:state.beat,heroId:actor.id,action:skill,targetId};
const cast=resolveCommand(state,data,command,true),turn=cast.turns.find(t=>t.actorId===actor.id&&t.action===skill)!;

return {data,entry,actor,prelude,state,targetId,command,cast,turn,turns:cast.turns};
}
