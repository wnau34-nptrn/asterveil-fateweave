import { expect, it } from 'vitest';
import { battles, rearAmbush, riftWarden } from '../src/content/encounters/catalog';
import { createBattle, currentHeroId, previewCommand, replay, resolveCommand } from '../src/core/battle/engine';
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
 expect(intents).toEqual([[1,'physical'],[2,'energy'],[3,'physical']]);expect(new Set(battles.map(b=>b.data.id)).size).toBe(3);
});
it('opening hints follow SPD owners and never steal another hero’s turn',()=>{
 for(const {data}of battles){let s=createBattle(data);
  for(let i=0;i<3;i++){const before=structuredClone(s),lesson=battleLesson(s,data)!;expect(lesson.heroId).toBe(currentHeroId(s,data));expect(s).toEqual(before);
   expect(lesson.action).toBe(i===0?'mark':i===1?(data===riftWarden?'bolt':'ward'):data===riftWarden?'bash':'guard');
   s=resolveCommand(s,data,{beat:s.beat,heroId:lesson.heroId,action:lesson.action,targetId:lesson.targetId}).state;}
  expect(currentHeroId(s,data)).toBe('healer');expect(battleLesson(s,data)).toBeUndefined();
 }
});
