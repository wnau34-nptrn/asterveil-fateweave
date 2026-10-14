import { expect, it } from 'vitest';
import { battles, rearAmbush, riftWarden } from '../src/content/encounters/catalog';
import { createBattle, currentHeroId, previewCommand, replay, resolveCommand } from '../src/core/battle/engine';
import { battleLesson } from '../src/ui/tutorial';
import { encounterRoutes } from './fixtures/encounter-routes';

it.each(encounterRoutes)('$name wins with four survivors and deterministic stages/replay', ({data,moves,hp}) => {
  let state=createBattle(data);
  for(const [heroId,action,targetId] of moves) {
    expect(currentHeroId(state,data)).toBe(heroId);
    const command={beat:state.beat,heroId,action,targetId}; const before=structuredClone(state);
    const result=resolveCommand(state,data,command);
    expect(previewCommand(state,data,command)).toEqual(result); expect(state).toEqual(before);
    expect([...result.stages.hero.events,...result.stages.enemy.events]).toEqual(result.events);
    state=result.state;
  }
  expect(state.outcome).toBe('victory'); expect(state.heroes.map(h=>h.hp)).toEqual(hp);
  expect(new Set(state.commands.map(c=>c.heroId)).size).toBe(4);
  expect(replay(data,state.commands)).toEqual(state);
});
it.each([{data:rearAmbush,first:'raider'},{data:rearAmbush,first:'brute'},{data:riftWarden,first:'brute'}])('$data.id basic-attack policy prioritizing $first loses', ({data,first}) => {
  let state=createBattle(data);
  while(state.outcome==='active'&&state.commands.length<60) {
    const heroId=currentHeroId(state,data)!;
    const target=state.enemies.find(e=>e.id===first&&e.hp>0)??state.enemies.find(e=>e.hp>0)!;
    state=resolveCommand(state,data,{beat:state.beat,heroId,action:'attack',targetId:target.id}).state;
  }
  expect(state.outcome).toBe('defeat'); expect(replay(data,state.commands)).toEqual(state);
});
it('rear energy reaches the Mage, Guard intercepts it, and Bash cannot interrupt it',()=>{
 const state=createBattle(rearAmbush);expect(state.intent).toMatchObject({kind:'energy',targetId:'weaver',damage:15});
 const guard=resolveCommand(state,rearAmbush,{beat:1,heroId:'guardian',action:'guard',targetId:'weaver'});
 expect(guard.state.heroes[0]!.hp).toBe(70);expect(guard.state.heroes[2]!.hp).toBe(48);
 const bash=resolveCommand(state,rearAmbush,{beat:1,heroId:'guardian',action:'bash',targetId:'brute'});
 expect(bash.stages.enemy.events.some(e=>e.type==='cancel')).toBe(false);expect(bash.state.heroes[2]!.hp).toBe(33);
});
it('boss alternates physical and energy; Bash stops its opening, and energy still hits next turn',()=>{
 const first=resolveCommand(createBattle(riftWarden),riftWarden,{beat:1,heroId:'guardian',action:'bash',targetId:'brute'});
 expect(first.stages.enemy.events[0]).toMatchObject({type:'cancel',cause:'interrupted'});expect(first.state.enemies[0]!.hp).toBe(232);
 expect(first.state.intent).toMatchObject({kind:'energy',targetId:'weaver',damage:20});
 const second=resolveCommand(first.state,riftWarden,{beat:2,heroId:'tracer',action:'mark',targetId:'brute'});
 expect(second.state.heroes[2]!.hp).toBe(28);expect(second.state.intent).toMatchObject({kind:'physical',targetId:'guardian'});
 expect(new Set(battles.map(c=>c.data.id)).size).toBe(3);
});
it('hints suggest only the current owner, with Mark followed by Mage action instead of stealing the next turn',()=>{
 for(const {data}of battles){
  let state=createBattle(data);
  for(let i=0;i<3;i++){
   const before=structuredClone(state),lesson=battleLesson(state,data)!;
   expect(lesson.heroId).toBe(currentHeroId(state,data));expect(state).toEqual(before);
   expect(lesson.action).toBe(i===0?(data===riftWarden?'bash':'guard'):i===1?'mark':data===rearAmbush?'ward':'bolt');
   state=resolveCommand(state,data,{beat:state.beat,heroId:lesson.heroId,action:lesson.action,targetId:lesson.targetId}).state;
  }
  expect(currentHeroId(state,data)).toBe('healer');
 }
});
