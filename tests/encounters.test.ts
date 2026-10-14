import { expect, it } from 'vitest';
import { battles, rearAmbush, riftWarden } from '../src/content/encounters/catalog';
import { createBattle, previewCommand, replay, resolveCommand } from '../src/core/battle/engine';
import { battleLesson } from '../src/ui/tutorial';
import { encounterRoutes } from './fixtures/encounter-routes';

it.each(encounterRoutes)('$name wins with four survivors and deterministic stages/replay', ({data,moves,hp}) => {
  let state=createBattle(data);
  for(const [heroId,action,targetId] of moves) {
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
    const hero=data.heroes.filter(h=>state.heroes.find(v=>v.id===h.id)!.hp>0).sort((a,b)=>b.attack-a.attack)[0]!;
    const target=state.enemies.find(e=>e.id===first&&e.hp>0)??state.enemies.find(e=>e.hp>0)!;
    state=resolveCommand(state,data,{beat:state.beat,heroId:hero.id,action:'attack',targetId:target.id}).state;
  }
  expect(state.outcome).toBe('defeat'); expect(replay(data,state.commands)).toEqual(state);
});
it('rear energy reaches the Mage through a healthy front line; Ward absorbs before HP and Bash cannot interrupt it', () => {
  const state=createBattle(rearAmbush);
  expect(state.intent).toMatchObject({kind:'energy',targetId:'weaver',damage:18});
  const ward=resolveCommand(state,rearAmbush,{beat:1,heroId:'weaver',action:'ward',targetId:'weaver'});
  expect(ward.state.heroes[2]).toMatchObject({hp:44,barrier:0});
  expect(ward.stages.enemy.events[0]).toMatchObject({amount:4,absorbed:14});
  const bash=resolveCommand(state,rearAmbush,{beat:1,heroId:'guardian',action:'bash',targetId:'brute'});
  expect(bash.stages.enemy.events.some(e=>e.type==='cancel')).toBe(false);
  expect(bash.state.heroes[2]!.hp).toBe(30);
  expect(bash.state.intent).toMatchObject({targetId:'healer',damage:20});
});
it('boss alternates physical and energy; Bash stops physical but not the following energy hit', () => {
  let state=createBattle(riftWarden);
  const first=resolveCommand(state,riftWarden,{beat:1,heroId:'guardian',action:'bash',targetId:'brute'});
  expect(first.stages.enemy.events[0]).toMatchObject({type:'cancel',cause:'interrupted'});
  state=first.state; expect(state.enemies[0]!.hp).toBe(232);
  expect(state.intent).toMatchObject({kind:'energy',targetId:'weaver'});
  state=resolveCommand(state,riftWarden,{beat:2,heroId:'tracer',action:'mark',targetId:'brute'}).state;
  expect(state.heroes[2]!.hp).toBe(22); expect(state.intent).toMatchObject({kind:'physical',targetId:'guardian'});
  expect(new Set(battles.map(c=>c.data.id)).size).toBe(3);
});
it('opening hints follow the actual new encounter and same-target Mark without changing state', () => {
  for(const data of [rearAmbush,riftWarden]) {
    const state=createBattle(data), before=structuredClone(state), lesson=battleLesson(state,data)!;
    expect(lesson.action).toBe(data===rearAmbush?'ward':'bash'); expect(state).toEqual(before);
    const second=resolveCommand(state,data,{beat:1,heroId:lesson.heroId,action:lesson.action,targetId:lesson.targetId}).state;
    const mark=battleLesson(second,data)!; expect(mark.action).toBe('mark');
    const third=resolveCommand(second,data,{beat:2,heroId:mark.heroId,action:mark.action,targetId:mark.targetId}).state;
    expect(battleLesson(third,data)).toMatchObject({action:'execute',targetId:mark.targetId});
  }
});
