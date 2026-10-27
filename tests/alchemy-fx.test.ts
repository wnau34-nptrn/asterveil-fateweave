import {describe,it,expect} from 'vitest';
import {alchemyCues,alchemyEvents,alchemySkills,alchemyHealingCues} from '../src/game/visuals/alchemy-fx';
import {alchemyFixture} from './fixtures/alchemy';
import {targetOptions} from '../src/core/battle/engine';

describe('alchemy follows authoritative events without changing state',()=>{
 for(const skill of alchemySkills)it(`${skill}: source, recipients and events are real`,()=>{
  const f=alchemyFixture(skill),copy=JSON.stringify(f),cues=alchemyCues(f.turn);
  expect(cues.length).toBeGreaterThan(0);for(const cue of cues)expect(f.turn.events).toContain(cue.event);
  expect(JSON.stringify(f)).toBe(copy);
  if(['smoke','haste','fury'].includes(skill))expect(f.turn.events.some(e=>e.type==='damage')).toBe(false);
 });
 it('Acid spread adds residue only, and cannot corrode the fallen primary',()=>{
  const spread=alchemyFixture('acid','spread'),cues=alchemyCues(spread.turn);
  expect(cues.filter(c=>c.kind==='hit')).toHaveLength(1);expect(cues.filter(c=>c.kind==='status')).toHaveLength(3);
  expect(alchemyEvents(spread.turn)).toHaveLength(5);
  const down=alchemyFixture('acid','down');expect(down.turn.events.filter(e=>e.type==='corrode')).toHaveLength(0);expect(alchemyCues(down.turn)).toHaveLength(1);
 });
 it('potent/deeper affect actual later hits, not automatic damage ticks',()=>{
  const base=alchemyFixture('acid'),potent=alchemyFixture('acid','potent'),deep=alchemyFixture('acid','deeper');
  const foe=(f:typeof base)=>f.turn.state.enemies.find(e=>e.id==='f1')!;
  expect(foe(potent).corrodedUntil).toBe(foe(base).corrodedUntil!+1);
  expect(foe(deep).corrodeBonus).toBe(foe(base).corrodeBonus!+3);
  const later=(f:typeof base)=>f.later.flatMap(x=>x.turns).flatMap(t=>t.events).find(e=>e.type==='damage'&&e.sourceId==='guardian'&&e.targetId==='f1')!;
  expect(later(deep).amount).toBe(later(base).amount!+3);
  expect(base.turns.filter(t=>t.side==='enemy').flatMap(t=>t.events).some(e=>e.type==='damage'&&e.targetId==='f1')).toBe(false);
 });
 for(const scenario of ['normal','backonly','corroded','down'])it(`Bomb ${scenario} covers every actual hit including back row`,()=>{
  const f=alchemyFixture('bomb',scenario);expect(alchemyCues(f.turn).map(c=>c.targetId)).toEqual(f.state.enemies.filter(e=>e.hp>0).map(e=>e.id));
 });
 for(const scenario of ['normal','wide','poison','boss','physical','energy'])it(`Smoke ${scenario} weakens actual next intent without cancelling`,()=>{
  const f=alchemyFixture('smoke',scenario),weak=f.turn.events.filter(e=>e.type==='weaken');
  expect(weak).toHaveLength(scenario==='wide'?2:1);expect(weak.map(e=>e.amount)).toEqual(scenario==='wide'?[20,20]:[40]);
  expect(f.turn.events.some(e=>e.type==='damage'||e.type==='interrupt')).toBe(false);
  const next=f.turns.find(t=>t.actorId==='f1')!;expect(next.events.some(e=>e.type==='cancel')).toBe(false);
  expect(next.events.find(e=>e.type==='damage')?.amount).toBe(Math.ceil((scenario==='physical'||scenario==='energy'?10:1)*(scenario==='wide'?.8:.6)));
  expect(f.turn.events.filter(e=>e.type==='corrode')).toHaveLength(scenario==='poison'?1:0);
 });
 for(const [scenario,amount] of [['normal',6],['corroded',20],['expired',6],['kill',1]] as const)it(`Catalyst ${scenario} consumes real corrosion in one hit`,()=>{
  const f=alchemyFixture('catalyst',scenario);expect(alchemyCues(f.turn).filter(c=>c.kind==='hit')).toHaveLength(1);
  expect(f.turn.events.find(e=>e.type==='damage')?.amount).toBe(amount);
  if(scenario==='corroded')expect(f.turn.state.enemies.find(e=>e.id==='f1')?.corrodedUntil).toBeUndefined();
 });
 for(const scenario of ['chain','chainfallback','chainother'])it(`Chain reaction ${scenario} retains its actual source and never casts a new flask`,()=>{
  const f=alchemyFixture(scenario==='chainother'?'acid':'catalyst',scenario),cue=alchemyCues(f.turn).find(c=>c.kind==='reaction')!;
  expect(cue).toBeDefined();expect(cue.sourceId).toBe('toma');expect(cue.targetId).toBe(scenario==='chainfallback'?'b1':'f2');
  expect(cue.event.text).toBe('Chain reaction.');expect(cue.skill).toBe('acid');
  if(scenario==='chainother'){expect(f.turn.actorId).toBe('guardian');expect(f.turn.action).toBe('attack');expect(alchemyCues(f.turn)).toHaveLength(1);}
 });
 for(const scenario of ['normal','nextalready','acted','self','heal','fullhp','overflow','quickbrew'])it(`Haste ${scenario} preserves one turn and routes actual healing`,()=>{
  const f=alchemyFixture('haste',scenario),e=f.turn.events.find(e=>e.type==='haste')!;
  expect(e.targetId).toBe(scenario==='self'?'toma':'guardian');
  expect(e.text).toBe(['acted','self'].includes(scenario)?'Ally acts first next round.':'Ally acts next.');
  expect(new Set(f.turn.state.order).size).toBe(f.turn.state.order.length);
  const heal=alchemyHealingCues(f.turn);expect(heal.map(c=>[c.kind,c.event.amount])).toEqual(scenario==='heal'?[['cast',8]]:scenario==='overflow'?[['barrier',8]]:[]);
  if(scenario==='quickbrew')expect(f.turn.state.heroes.find(h=>h.id==='toma')!.cooldowns.haste).toBeLessThan(alchemyFixture('haste').turn.state.heroes.find(h=>h.id==='toma')!.cooldowns.haste!);
  expect(targetOptions(f.state,f.data,'toma','haste').every(t=>t.id!=='enemies')).toBe(true);
 });
 for(const scenario of ['normal','self','refresh','outgoing'])it(`Fury ${scenario} buffs a living ally with exposure and no cast hit`,()=>{
  const f=alchemyFixture('fury',scenario),target=f.turn.state.heroes.find(h=>h.id===f.targetId)!;
  expect(target.empowered?.percent).toBe(25);expect(target.exposed?.percent).toBe(10);expect(target.empowered?.round).toBe(f.state.round+1);
  expect(f.turn.events.some(e=>e.type==='damage'||e.type==='heal')).toBe(false);expect(alchemyCues(f.turn)).toHaveLength(1);
  if(scenario==='outgoing')expect(f.later.flatMap(x=>x.turns).find(t=>t.actorId==='guardian')!.events.find(e=>e.type==='damage')?.amount).toBe(13);
 });
 it('Haste rejects a down ally and Fury expires without inventing a second cast',()=>{
  const f=alchemyFixture('haste','downinvalid');
  expect(targetOptions(f.state,f.data,'toma','haste').find(t=>t.id==='guardian')?.valid).toBe(false);
  expect(f.targetId).toBe('toma');
  const fury=alchemyFixture('fury','expiry');expect(fury.captureFollowups.length).toBeGreaterThan(4);
  expect(fury.captureState.round).toBeGreaterThan(fury.turn.state.heroes.find(h=>h.id==='guardian')!.empowered!.round);
  expect(fury.later.flatMap(s=>s.turns).flatMap(alchemyCues)).toEqual([]);
  const incoming=fury.turns.filter(t=>t.side==='enemy').flatMap(t=>t.events).find(e=>e.type==='damage'&&e.targetId==='guardian');
  expect(incoming?.amount).toBe(11);
 });

});
