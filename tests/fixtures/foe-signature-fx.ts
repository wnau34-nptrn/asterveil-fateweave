import {veilSiege} from '../../src/content/encounters/veil-siege';
import {heroes} from '../../src/content/heroes/team';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,currentHeroId,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {EncounterDefinition,ActionId,Command,EnemyDefinition,IntentDefinition} from '../../src/core/battle/types';
import type {FoeSignatureMove} from '../../src/game/visuals/foe-signature-fx';

// Definitions + legal commands only. A real foe (its in-game art) announces the move; the hero's own legal command then
// lets the resolver emit the foe's turn. Scenarios: hit (Aegis attacks, the foe hits the slot-1 ally),
// guard (Aegis guards the slot-1 ally, so the real damage lands on Aegis), blocked (a Ward absorbs the whole hit),
// dodge (Shadow Step) and all (a synthetic `all` intent that hits every standing hero).
export const foeSetup:Record<FoeSignatureMove,Pick<EnemyDefinition,'id'|'row'|'name'|'displayName'|'art'|'color'>&{large?:boolean;kind:'physical'|'energy'}>={
 'Seed Spark':{id:'b1',row:'back',name:'Dandelion Sprite',displayName:'ภูตแดนดิไลออน',art:'foe_sprite',color:0xa6dfce,kind:'energy'},
 'Ember Spark':{id:'b1',row:'back',name:'Ember Slime',displayName:'สไลม์ถ่านไฟ',art:'foe_ember_slime',color:0xf0a070,kind:'energy'},
 'Spore Hex':{id:'b1',row:'back',name:'Hollow Mycon',displayName:'เห็ดหมอผีกลวง',art:'foe_mycon',color:0x427f87,kind:'energy'},
 'Spore Dust':{id:'b1',row:'back',name:'Spore Puff',displayName:'ภูตสปอร์',art:'foe_spore_puff',color:0x4fb3a6,kind:'energy'},
 'Star Flame':{id:'b1',row:'back',name:'Rift Wisp',displayName:'วิญญาณรอยแยก',art:'foe_rift_wisp',color:0xa77ef0,kind:'energy'},
 'Rune Lash':{id:'b1',row:'back',name:'Rift Weaver',displayName:'ผู้ทอรอยแยก',art:'foe_riftweaver',color:0x5b63c9,kind:'energy'},
 'Rift Needle':{id:'b1',row:'back',name:'Rift Weaver',displayName:'ผู้ถักรอยแยก',art:'foe_riftweaver',color:0x8a6cc7,kind:'energy'},
 'Shard Burst':{id:'f1',row:'front',large:true,name:'Crystal Juggernaut',displayName:'ด้วงเกราะผลึก',art:'foe_juggernaut',color:0x9454d6,kind:'energy'},
 'Rift Bolt':{id:'f1',row:'front',large:true,name:'Rift Channeler',displayName:'อสูรส่งพลัง',art:'foe_rift_channeler',color:0x9785f2,kind:'energy'},
 'Rift Beam':{id:'f1',row:'front',large:true,name:'Rift Channeler',displayName:'อสูรส่งพลัง',art:'foe_rift_channeler',color:0x8a5cd6,kind:'energy'},
 'Veil Quake':{id:'f1',row:'front',large:true,name:'Veil Golem',displayName:'ยักษ์หินรอยแยก',art:'foe_golem',color:0x7d8a96,kind:'physical'},
};
export type FoeScenario='hit'|'guard'|'blocked'|'dodge'|'all';
const pool=[...heroes,...mercenaries];
const hero=(id:string)=>pool.find(h=>h.id===id)!;
const plans:Record<FoeScenario,{actor:string;action:ActionId;slot:number;with:string[]}>={
 hit:{actor:'guardian',action:'attack',slot:1,with:['healer','weaver']},
 guard:{actor:'guardian',action:'guard',slot:1,with:['weaver','healer']},
 blocked:{actor:'weaver',action:'ward',slot:0,with:['guardian','healer']},
 dodge:{actor:'sefa',action:'evade',slot:0,with:['guardian','healer']},
 all:{actor:'guardian',action:'attack',slot:1,with:['healer','weaver']},
};
export function foeSignatureFixture(move:FoeSignatureMove,scenario:FoeScenario='hit'){
 const plan=plans[scenario],foe=foeSetup[move];
 const caster=hero(plan.actor),party=[caster,...plan.with.map(hero)];
 const enemy:EnemyDefinition={id:foe.id,row:foe.row,...(foe.large?{large:true}:{}),name:foe.name,displayName:foe.displayName,maxHp:9999,speed:100,color:foe.color,art:foe.art};
 const intent:IntentDefinition={sourceId:foe.id,targetSlot:plan.slot,name:move,damage:scenario==='blocked'?1:12,kind:foe.kind,...(scenario==='all'?{all:true}:{})};
 const data:EncounterDefinition={...structuredClone(veilSiege),
  heroes:party.map((h,i)=>({...h,lane:'front' as const,actions:i===0?[...new Set<ActionId>(['attack',plan.action,'guard'])]:[...h.actions,'guard'] as ActionId[],speed:i===0?200:50})),
  enemies:[enemy],intents:[intent,intent,intent]};
 const entry={hp:Object.fromEntries(party.map(h=>[h.id,h.maxHp]))};
 const state=beginBattle(data,entry,true).state;
 const actor=data.heroes.find(h=>h.id===currentHeroId(state,data))!;
 if(actor.id!==caster.id)throw new Error('Wrong fixture actor '+actor.id);
 const options=targetOptions(state,data,actor.id,plan.action);
 const wanted=plan.action==='guard'?party[1]!.id:plan.action==='attack'?foe.id:actor.id;
 const targetId=options.find(t=>t.valid&&t.id===wanted)?.id??options.find(t=>t.valid)!.id;
 const command:Command={beat:state.beat,heroId:actor.id,action:plan.action,targetId};
 const cast=resolveCommand(state,data,command,true),foeTurn=cast.turns.find(t=>t.side==='enemy'&&t.intent?.name===move)!;
 return {data,entry,actor,prelude:[] as Command[],state,targetId,command,cast,turn:foeTurn,turns:cast.turns,captureState:cast.state};
}
