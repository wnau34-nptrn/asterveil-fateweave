import {veilSiege} from '../../src/content/encounters/veil-siege';
import {heroes} from '../../src/content/heroes/team';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {EncounterDefinition,ActionId,Command} from '../../src/core/battle/types';
import type {CommandSkill} from '../../src/game/visuals/command-fx';

// Definitions + legal commands only. Scenarios: normal (physical foes hit the Knight/ally), kill (a struck-back foe has 1 HP), energy (non-physical intents).
const casterOf:Record<CommandSkill,string>={taunt:'brann',challenge:'guardian',warcry:'garran'};
export function commandFixture(skill:CommandSkill,scenario='normal'){
 const caster=[...heroes,...mercenaries].find(h=>h.id===casterOf[skill])!;
 const others=heroes.filter(h=>h.id!==caster.id&&['Knight','Priest','Mage'].includes(h.role)).slice(0,2);
 const party=[caster,...others];
 const slots:('f1'|'f2'|'b1')[]=['f1','f2','b1'];
 const data:EncounterDefinition={...structuredClone(veilSiege),
  heroes:party.map((h,i)=>({...h,lane:'front' as const,actions:i===0?['attack',skill,'guard'] as ActionId[]:[...h.actions,'guard'] as ActionId[],speed:i===0?200:50})),
  enemies:slots.map((id,i)=>({...veilSiege.enemies.find(e=>e.id===(id.startsWith('f')?'f1':'b1'))!,id,row:id.startsWith('f')?'front' as const:'back' as const,
   maxHp:scenario==='kill'&&id==='f1'?1:9999,speed:100-i})),
  intents:slots.map(id=>({sourceId:id,targetSlot:1,name:'QA actual announced attack',damage:1,kind:scenario==='energy'?'energy' as const:'physical' as const})),
 };
 const entry={hp:Object.fromEntries(party.map(h=>[h.id,h.maxHp]))};
 const state=beginBattle(data,entry,true).state;
 const actor=data.heroes.find(h=>h.id===currentHeroId(state,data))!;
 if(actor.id!==caster.id)throw new Error('Wrong fixture actor '+actor.id);
 const options=targetOptions(state,data,actor.id,skill);
 const targetId=options.find(t=>t.valid&&t.id==='f2')?.id??options.find(t=>t.valid)!.id;
 const command:Command={beat:state.beat,heroId:actor.id,action:skill,targetId};
 const cast=resolveCommand(state,data,command,true),turn=cast.turns.find(t=>t.actorId===actor.id&&t.action===skill)!;
 return {data,entry,actor,prelude:[] as Command[],state,targetId,command,cast,turn,turns:cast.turns,captureState:cast.state};
}
