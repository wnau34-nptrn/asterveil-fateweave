// Presentation fixtures only; all outcomes are owned by the real resolver.
import {encounters,thicketAmbush} from '../../src/content/encounters/catalog';
import {mercenaries} from '../../src/content/heroes/mercenaries';
import {beginBattle,resolveCommand,targetOptions} from '../../src/core/battle/engine';
import type {Command,EncounterDefinition} from '../../src/core/battle/types';
export const bossArts=['foe_matriarch','foe_juggernaut','foe_sentinel','foe_captain'] as const;
export type BossArt=(typeof bossArts)[number];
export const sheetOf={foe_matriarch:'matriarch',foe_juggernaut:'juggernaut',foe_sentinel:'sentinel',foe_captain:'captain'} as const;
// Every move and phase name of each boss in the real encounters (audited against the catalog by tests/unit-a9.test.ts).
export const bossMoves:Record<BossArt,readonly string[]>={
 foe_matriarch:['Thorn Tempest','Briar Lash','Gather Thorns','Thorn Bloom','Thorn Storm','Thorn Rage'],
 foe_juggernaut:['Horn Charge','Shard Burst'],
 foe_sentinel:['Rift Cataclysm','Raking Slash','Crushing Blow','Rift Bolt','Rift Wave','Rift Gathering','Rift Awakening','Call the Rift'],
 foe_captain:['War Cry','Crushing Blow','Call the Hunt'],
};
export const phaseNames=['Thorn Rage','Rift Awakening','Call the Rift','Call the Hunt'] as const;
// scenario: normal | hurt/down (foe hits the hero) | enemy-down (foe has 1 HP). A phase name builds the real phase turn: one hero hit takes
// the boss below that phase threshold, so the resolver itself queues the phase change as the boss's next turn.
export function unitA9Fixture(art:BossArt,name:string,scenario='normal'){
 const phase=encounters.flatMap(d=>(d.phases??[]).map(p=>({d,p}))).find(({d,p})=>p.name===name&&d.enemies.some(e=>e.id===p.sourceId&&e.art===art));
 const from=phase?.d??encounters.find(d=>d.enemies.some(e=>e.art===art&&d.intents.some(i=>i.sourceId===e.id&&i.name===name)))!;
 const foe=from.enemies.find(e=>e.art===art&&(phase?e.id===phase.p.sourceId:from.intents.some(i=>i.sourceId===e.id&&i.name===name)))!;
 const found=phase?from.intents.find(i=>i.sourceId===foe.id&&(i.phase??0)===0)!:from.intents.find(i=>i.sourceId===foe.id&&i.name===name)!;
 const {phase:_ignored,...intent}=found;void _ignored;
 const base=thicketAmbush.heroes,merc=mercenaries.find(m=>m.id==='sefa')!;
 const build=(maxHp:number):EncounterDefinition=>({...structuredClone(thicketAmbush),
  heroes:[{...merc,speed:200,actions:['attack','guard'],lane:'front'},{...base.find(h=>h.id==='guardian')!,speed:60,actions:['attack','guard']},{...base.find(h=>h.id==='weaver')!,speed:50,actions:['attack','ward']}],
  enemies:[{...foe,id:'f1',row:'front',maxHp,speed:110}],
  phases:phase?[{...phase.p,sourceId:'f1',summon:undefined,hardSummon:undefined}]:undefined,
  intents:[{...intent,sourceId:'f1',targetSlot:scenario==='hurt'||scenario==='down'?0:1}]});
 const start=(d:EncounterDefinition)=>{const entry={hp:Object.fromEntries(d.heroes.map(h=>[h.id,scenario==='down'&&h.id==='sefa'?1:h.maxHp]))};return {entry,state:beginBattle(d,entry,true).state};};
 const strike=(d:EncounterDefinition,s:ReturnType<typeof start>)=>{const t=targetOptions(s.state,d,'sefa','attack').find(o=>o.valid&&o.id==='f1')!;const command:Command={beat:s.state.beat,heroId:'sefa',action:'attack',targetId:t.id};return {command,result:resolveCommand(s.state,d,command,true)};};
 let data=build(scenario==='enemy-down'?1:foe.maxHp);
 if(phase){
  const probe=strike(data,start(data)),dealt=data.enemies[0]!.maxHp-probe.result.state.enemies.find(e=>e.id==='f1')!.hp;
  data=build(Math.floor(dealt*100/(100-phase.p.below)));
 }
 const begin=start(data),{command,result}=strike(data,begin);
 return {data,entry:begin.entry,prelude:[] as Command[],state:begin.state,command,result};
}
