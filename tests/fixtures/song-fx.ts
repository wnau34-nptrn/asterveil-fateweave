import {veilSiege} from '../../src/content/encounters/veil-siege';
import {heroes} from '../../src/content/heroes/team';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {EncounterDefinition,ActionId,Command} from '../../src/core/battle/types';
import type {SongSkill} from '../../src/game/visuals/song-fx';

// Definitions + legal commands only. `song` is the song the bard has playing before a finale/solo (played on an earlier real beat).
export const casterOf:Record<SongSkill,string>={valor:'lio',finale:'lio',dread:'lio',note:'lio',solo:'lio',evade:'sefa',decoy:'sefa'};
export function songFixture(skill:SongSkill,song:'valor'|'mend'|'dread'='valor',targetFoe='f2'){
 const caster=[...heroes,...mercenaries].find(h=>h.id===casterOf[skill])!;
 const others=heroes.filter(h=>h.id!==caster.id&&['Knight','Priest','Mage'].includes(h.role)).slice(0,2);
 const party=[caster,...others];
 const slots:('f1'|'f2'|'b1')[]=['f1','f2','b1'];
 const data:EncounterDefinition={...structuredClone(veilSiege),
  heroes:party.map((h,i)=>({...h,lane:'front' as const,actions:i===0?[...new Set(['attack',skill,song,'guard'])] as ActionId[]:[...h.actions,'guard'] as ActionId[],speed:i===0?200:50})),
  enemies:slots.map((id,i)=>({...veilSiege.enemies.find(e=>e.id===(id.startsWith('f')?'f1':'b1'))!,id,row:id.startsWith('f')?'front' as const:'back' as const,maxHp:9999,speed:100-i})),
  intents:slots.map(id=>({sourceId:id,targetSlot:1,name:'QA actual announced attack',damage:1,kind:'physical' as const})),
 };
 const entry={hp:Object.fromEntries(party.map(h=>[h.id,h.maxHp]))};
 const begin=beginBattle(data,entry,true).state;
 const prelude:Command[]=[];let state=begin;
 if(skill==='finale'||skill==='solo'){
  const play=(heroId:string,action:ActionId,targetId:string)=>{const c:Command={beat:state.beat,heroId,action,targetId};prelude.push(c);state=resolveCommand(state,data,c,true).state;};
  play(caster.id,song,caster.id);
  while(state.outcome==='active'&&currentHeroId(state,data)!==caster.id)play(currentHeroId(state,data)!,'attack',targetFoe);
 }
 const options=targetOptions(state,data,caster.id,skill);
 const ally=options.find(t=>t.valid&&t.id!==caster.id&&party.some(h=>h.id===t.id));
 const targetId=(options.find(t=>t.valid&&t.id===targetFoe)??ally??options.find(t=>t.valid)!).id;
 const command:Command={beat:state.beat,heroId:caster.id,action:skill,targetId};
 const cast=resolveCommand(state,data,command,true),turn=cast.turns.find(t=>t.actorId===caster.id&&t.action===skill)!;
 return {data,entry,actor:caster,prelude,state,targetId,command,cast,turn,turns:cast.turns,captureState:cast.state};
}
