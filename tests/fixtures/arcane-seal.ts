import {veilSiege} from '../../src/content/encounters/veil-siege';
import {heroes} from '../../src/content/heroes/team';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {EncounterDefinition,ActionId,Command} from '../../src/core/battle/types';
import type {SealSkill} from '../../src/game/visuals/arcane-seal-fx';

// Definitions + legal commands only. Scenarios: normal (physical intent), energy (Sigil binds), kill (1 HP foe), backonly.
export function sealFixture(skill:SealSkill,scenario='normal'){
 const caster=heroes.find(h=>h.id===(skill==='mark'?'tracer':'weaver'))!;
 const party=[caster,...heroes.filter(h=>h.id!==caster.id&&['Knight','Priest'].includes(h.role))];
 const slots:('f1'|'f2'|'b1'|'b2')[]=scenario==='backonly'?['b1','b2']:['f1','f2','b1','b2'];
 const data:EncounterDefinition={...structuredClone(veilSiege),
  heroes:party.map((h,i)=>({...h,actions:i===0?['attack',skill,'guard'] as ActionId[]:[...h.actions,'guard'] as ActionId[],speed:i===0?200:50})),
  enemies:slots.map((id,i)=>({...veilSiege.enemies.find(e=>e.id===(id.startsWith('f')?'f1':'b1'))!,id,row:id.startsWith('f')?'front' as const:'back' as const,
   maxHp:id==='f1'&&scenario==='kill'?1:9999,speed:100-i})),
  intents:slots.map(id=>({sourceId:id,targetSlot:1,name:'QA actual announced attack',damage:1,kind:scenario==='energy'?'energy' as const:'physical' as const})),
 };
 const entry={hp:Object.fromEntries(party.map(h=>[h.id,h.maxHp]))};
 const state=beginBattle(data,entry,true).state;
 const actor=data.heroes.find(h=>h.id===currentHeroId(state,data))!;
 if(actor.id!==caster.id)throw new Error('Wrong fixture actor');
 const options=targetOptions(state,data,actor.id,skill);
 const targetId=options.find(t=>t.valid&&t.id==='f1')?.id??options.find(t=>t.valid)!.id;
 const command:Command={beat:state.beat,heroId:actor.id,action:skill,targetId};
 const cast=resolveCommand(state,data,command,true),turn=cast.turns.find(t=>t.actorId===actor.id&&t.action===skill)!;
 return {data,entry,actor,prelude:[] as Command[],state,targetId,command,cast,turn,turns:cast.turns,captureState:cast.state};
}
