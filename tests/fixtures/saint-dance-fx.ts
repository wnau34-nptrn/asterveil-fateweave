import {veilSiege} from '../../src/content/encounters/veil-siege';
import {heroes} from '../../src/content/heroes/team';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {EncounterDefinition,ActionId,Command} from '../../src/core/battle/types';
import type {SdSkill} from '../../src/game/visuals/saint-dance-fx';

// Definitions + legal commands only. Saint fixtures start with three wounded allies (so conversion heals are real); dancer fixtures start with every ally
// on a real cooldown, created by the allies casting their own first skill on earlier real beats (the prelude).
export const casterOf:Record<SdSkill,string>={saintstrike:'metta',communion:'metta',saintarc:'metta',vowstrike:'thiran',sharewound:'thiran',lastlight:'metta',
 cadence:'lalin',duet:'wila',rounddance:'wila',deepbeat:'lalin',echofoot:'wila',closingstep:'lalin'};
const dancer=(skill:SdSkill)=>['cadence','duet','rounddance','deepbeat','echofoot','closingstep'].includes(skill);
export function sdFixture(skill:SdSkill,targetFoe='f2'){
 const caster=[...heroes,...mercenaries].find(h=>h.id===casterOf[skill])!;
 const others=heroes.filter(h=>h.id!==caster.id&&['Knight','Priest','Mage'].includes(h.role)).slice(0,3);
 const party=[caster,...others],dance=dancer(skill);
 const slots:('f1'|'f2'|'b1')[]=['f1','f2','b1'];
 const data:EncounterDefinition={...structuredClone(veilSiege),
  heroes:party.map((h,i)=>({...h,lane:(i<2?'front':'back') as 'front'|'back',actions:i===0?['attack',skill] as ActionId[]:[...new Set([...h.actions,'guard'])] as ActionId[],speed:i===0?(dance?50:300):(dance?300-i:50)})),
  enemies:slots.map((id,i)=>({...veilSiege.enemies.find(e=>e.id===(id.startsWith('f')?'f1':'b1'))!,id,row:id.startsWith('f')?'front' as const:'back' as const,maxHp:9999,speed:100-i})),
  intents:slots.map(id=>({sourceId:id,targetSlot:1,name:'QA actual announced attack',damage:1,kind:'physical' as const})),
 };
 const entry={hp:Object.fromEntries(party.map((h,i)=>[h.id,i===0?h.maxHp:Math.ceil(h.maxHp*(dance?.8:.4))]))};
 const begin=beginBattle(data,entry,true).state;
 const prelude:Command[]=[];let state=begin;
 if(dance){
  // Each ally casts its first real skill (any valid target) so it has a cooling non-dance skill to recover.
  while(state.outcome==='active'&&currentHeroId(state,data)!==caster.id){
   const id=currentHeroId(state,data)!,def=data.heroes.find(h=>h.id===id)!;
   let done=false;
   for(const action of def.actions.filter(a=>a!=='attack'&&data.skills[a].cooldown>0)){
    const t=targetOptions(state,data,id,action).find(o=>o.valid);if(!t)continue;
    const c:Command={beat:state.beat,heroId:id,action,targetId:t.id};prelude.push(c);state=resolveCommand(state,data,c,true).state;done=true;break;
   }
   if(!done)throw new Error(`${id} has no legal skill to put on cooldown`);
  }
 }
 const options=targetOptions(state,data,caster.id,skill);
 const ally=options.find(t=>t.valid&&t.id!==caster.id&&party.some(h=>h.id===t.id));
 const targetId=(options.find(t=>t.valid&&t.id===targetFoe)??ally??options.find(t=>t.valid)!).id;
 const command:Command={beat:state.beat,heroId:caster.id,action:skill,targetId};
 const cast=resolveCommand(state,data,command,true),turn=cast.turns.find(t=>t.actorId===caster.id&&t.action===skill)!;
 return {data,entry,actor:caster,prelude,state,targetId,command,cast,turn,turns:cast.turns,captureState:cast.state};
}
