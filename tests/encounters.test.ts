import { expect, it } from 'vitest';
import { encounters, firstClash, rearAmbush, riftWarden } from '../src/content/encounters/catalog';
import { createBattle, currentHeroId, previewCommand, replay, resolveCommand, withParty } from '../src/core/battle/engine';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { battleLesson } from '../src/ui/tutorial';
import { encounterRoutes } from './fixtures/encounter-routes';
it.each(encounterRoutes)('$name wins with all four heroes, exact staged previews and deterministic replay', ({data,moves,hp}) => {
  let state=createBattle(data);
  for(const [heroId,action,targetId] of moves){
    expect(currentHeroId(state,data)).toBe(heroId);const c={beat:state.beat,heroId,action,targetId};const before=structuredClone(state);
    const r=resolveCommand(state,data,c);expect(previewCommand(state,data,c)).toEqual(r);expect(state).toEqual(before);
    expect(r.turns.flatMap(t=>t.events)).toEqual(r.events);state=r.state;
  }
  expect(state.outcome).toBe('victory');expect(state.heroes.map(h=>h.hp)).toEqual(hp);
  expect(new Set(state.commands.map(c=>c.heroId)).size).toBe(4);expect(replay(data,state.commands)).toEqual(state);
});
it.each([{data:rearAmbush,first:'raider'},{data:rearAmbush,first:'brute'},{data:riftWarden,first:'brute'}])('$data.id blind Attack policy targeting $first loses',({data,first})=>{
  let s=createBattle(data);
  while(s.outcome==='active'&&s.commands.length<100){const e=s.enemies.find(e=>e.id===first&&e.hp>0)??s.enemies.find(e=>e.hp>0)!;s=resolveCommand(s,data,{beat:s.beat,heroId:currentHeroId(s,data)!,action:'attack',targetId:e.id}).state;}
  expect(s.outcome).toBe('defeat');expect(replay(data,s.commands)).toEqual(s);
});
it('rear energy hits on the Hunter turn, not after every hero, and Ward protects the Mage later',()=>{
 let s=createBattle(rearAmbush);let r=resolveCommand(s,rearAmbush,{beat:s.beat,heroId:'tracer',action:'mark',targetId:'brute'});
 expect(r.turns.map(t=>t.actorId)).toEqual(['tracer','raider']);expect(r.state.heroes[3]!.hp).toBe(22);
 s=r.state;r=resolveCommand(s,rearAmbush,{beat:s.beat,heroId:'weaver',action:'ward',targetId:'weaver'});
 expect(r.turns).toHaveLength(1);s=r.state;r=resolveCommand(s,rearAmbush,{beat:s.beat,heroId:'guardian',action:'attack',targetId:'brute'});
 expect(r.turns[1]!.events[0]).toMatchObject({amount:9,absorbed:14});
});
it('boss has exactly one turn per round and alternates physical/energy by round',()=>{
 let s=createBattle(riftWarden);const intents=[];
 while(s.round<4){const id=currentHeroId(s,riftWarden)!;const r=resolveCommand(s,riftWarden,{beat:s.beat,heroId:id,action:'attack',targetId:'brute'});
  intents.push(...r.turns.filter(t=>t.side==='enemy').map(t=>[t.round,t.intent!.kind]));s=r.state;}
 expect(intents).toEqual([[1,'physical'],[2,'energy'],[3,'physical']]);expect(new Set(encounters.map(e=>e.id)).size).toBe(encounters.length);
});
it('teaching advice follows SPD owners, uses every class skill and wins the first clash with all four',()=>{
 let s=createBattle(firstClash);const used=new Set<string>();
 while(s.outcome==='active'){const before=structuredClone(s),lesson=battleLesson(s,firstClash)!;expect(lesson.heroId).toBe(currentHeroId(s,firstClash));expect(s).toEqual(before);
  used.add(lesson.action);s=resolveCommand(s,firstClash,{beat:s.beat,heroId:lesson.heroId,action:lesson.action,targetId:lesson.targetId}).state;}
 expect(s.outcome).toBe('victory');expect(s.heroes.every(h=>h.hp>0)).toBe(true);
 for(const a of ['mark','execute','ward','guard','bash','heal','bolt'])expect(used).toContain(a);
 expect(s.commands.slice(0,7).map(c=>c.action)).toEqual(['mark','ward','guard','heal','execute','bolt','bash']);
 expect(battleLesson(s,firstClash)).toBeUndefined();
});
it.each(encounters.map(data=>({data})))('$data.id: the advisor wins from 60% HP and replays deterministically',({data})=>{
 const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,Math.round(h.maxHp*.6)]))};let s=createBattle(data,entry);
 while(s.outcome==='active'&&s.commands.length<200){const l=battleLesson(s,data)!;s=resolveCommand(s,data,{beat:s.beat,heroId:l.heroId,action:l.action,targetId:l.targetId}).state;}
 expect(s.outcome).toBe('victory');expect(replay(data,s.commands,entry)).toEqual(s);
});
it.each(encounters.map(data=>({data})))('$data.id: Garran can replace either front-liner and the advisor still wins from full HP',({data})=>{
 for(const out of ['guardian','tracer']){
  const d=withParty(data,data.heroes.map(h=>h.id===out?mercenaries.find(m=>m.id==='garran')!:h));let s=createBattle(d);
  while(s.outcome==='active'&&s.commands.length<200){const l=battleLesson(s,d)!;s=resolveCommand(s,d,{beat:s.beat,heroId:l.heroId,action:l.action,targetId:l.targetId}).state;}
  expect(s.outcome,`${data.id} without ${out}`).toBe('victory');expect(s.commands.some(c=>c.action==='brace'||c.action==='pierce')).toBe(true);
 }
});
it.each(encounters.map(data=>({data})))('$data.id: Mira can replace either back-liner and the advisor still wins from full HP',({data})=>{
 for(const out of ['weaver','healer']){
  const d=withParty(data,data.heroes.map(h=>h.id===out?mercenaries.find(m=>m.id==='mira')!:h));let s=createBattle(d);
  while(s.outcome==='active'&&s.commands.length<200){const l=battleLesson(s,d)!;s=resolveCommand(s,d,{beat:s.beat,heroId:l.heroId,action:l.action,targetId:l.targetId}).state;}
  expect(s.outcome,`${data.id} without ${out}`).toBe('victory');expect(s.commands.some(c=>c.action==='hinder'||c.action==='volley')).toBe(true);
 }
});
it.each(encounters.map(data=>({data})))('$data.id: Toma can replace either back-liner and the advisor still wins from full HP',({data})=>{
 for(const out of ['weaver','healer']){
  const d=withParty(data,data.heroes.map(h=>h.id===out?mercenaries.find(m=>m.id==='toma')!:h));let s=createBattle(d);
  while(s.outcome==='active'&&s.commands.length<200){const l=battleLesson(s,d)!;s=resolveCommand(s,d,{beat:s.beat,heroId:l.heroId,action:l.action,targetId:l.targetId}).state;}
  expect(s.outcome,`${data.id} without ${out}`).toBe('victory');expect(s.commands.some(c=>c.action==='acid'||c.action==='haste')).toBe(true);
 }
});
it.each(encounters.map(data=>({data})))('$data.id: Sefa can replace either front-liner and the advisor still wins from full HP',({data})=>{
 for(const out of ['guardian','tracer']){
  const d=withParty(data,data.heroes.map(h=>h.id===out?mercenaries.find(m=>m.id==='sefa')!:h));let s=createBattle(d);
  while(s.outcome==='active'&&s.commands.length<200){const l=battleLesson(s,d)!;s=resolveCommand(s,d,{beat:s.beat,heroId:l.heroId,action:l.action,targetId:l.targetId}).state;}
  expect(s.outcome,`${data.id} without ${out}`).toBe('victory');expect(s.commands.some(c=>c.action==='ambush'||c.action==='evade')).toBe(true);
 }
});
