import {veilSiege} from '../../src/content/encounters/veil-siege';
import {heroes} from '../../src/content/heroes/team';
import {rosterP03} from '../../src/content/heroes/roster-p03';
import {beginBattle,currentHeroId,resolveCommand} from '../../src/core/battle/engine';
import type {EncounterDefinition,ActionId,Command,IntentDefinition} from '../../src/core/battle/types';

// Seer rework (save v51) QA: Astrid acts first. f1 cycles QA Big (top damage) → QA Jab → QA Poke, so Delay Fate really
// delays its next move; the others announce one light move. Scenarios: delay (turncycle on f1), star (doubledial).
export function seerFixture(scenario:'delay'|'star'='delay'){
 const astrid=rosterP03.find(h=>h.id==='astrid')!,skill:ActionId=scenario==='star'?'doubledial':'turncycle';
 const party=[astrid,...heroes.filter(h=>['Knight','Priest'].includes(h.role))];
 const slots=['f1','f2','b1'] as const;
 const data:EncounterDefinition={...structuredClone(veilSiege),
  heroes:party.map((h,i)=>({...h,actions:i===0?['attack',skill,'deflectfate'] as ActionId[]:[...h.actions],speed:i===0?200:150-i})),
  enemies:slots.map((id,i)=>({...veilSiege.enemies.find(e=>e.id===(id.startsWith('f')?'f1':'b1'))!,id,row:id.startsWith('f')?'front' as const:'back' as const,maxHp:9999,speed:100-i})),
  intents:[{sourceId:'f1',targetSlot:1,name:'QA Big',damage:6,kind:'physical'},{sourceId:'f1',targetSlot:1,name:'QA Jab',damage:1,kind:'physical'},{sourceId:'f1',targetSlot:1,name:'QA Poke',damage:2,kind:'physical'},
   ...slots.slice(1).map(id=>({sourceId:id,targetSlot:1,name:'QA Tap',damage:1,kind:'physical'} satisfies IntentDefinition))],
 };
 const entry={hp:Object.fromEntries(party.map(h=>[h.id,h.maxHp]))};
 const state=beginBattle(data,entry,true).state;
 if(currentHeroId(state,data)!=='astrid')throw new Error('Wrong fixture actor');
 const command:Command={beat:state.beat,heroId:'astrid',action:skill,targetId:'f1'};
 const cast=resolveCommand(state,data,command,true);
 return {data,entry,skill,command,cast,turns:cast.turns,captureState:cast.state};
}
