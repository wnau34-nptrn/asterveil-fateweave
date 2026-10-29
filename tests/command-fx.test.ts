import {describe,it,expect} from 'vitest';
import {commandCues,commandSkills,WAR_CRY_COUNTER} from '../src/game/visuals/command-fx';
import {commandFixture} from './fixtures/command-fx';
import art from '../src/game/visuals/command-art.json';
import atlas from '../public/assets/fx/command_fx.json';

describe('command VFX follows authoritative events without changing state',()=>{
 it('ships the twelve R2 layers with documented pivots',()=>{
  expect(Object.keys(atlas.frames).sort()).toEqual(Object.keys(art).sort());expect(Object.keys(art)).toHaveLength(12);
  expect((art as Record<string,number[]>)['warcry_cone']).toEqual([.13671875,.5]);expect((art as Record<string,number[]>)['challenge_thread']).toEqual([.09375,.5]);
 });
 for(const skill of commandSkills)it(`${skill}: one cast cue from the cast's real event`,()=>{
  const f=commandFixture(skill),copy=JSON.stringify(f),cues=commandCues(f.turn).filter(c=>c.kind==='cast');
  expect(cues).toHaveLength(1);expect(f.turn.events).toContain(cues[0]!.event);expect(cues[0]!.sourceId).toBe(f.actor.id);expect(JSON.stringify(f)).toBe(copy);
 });
 it('taunt is a self stance: target is the warden, no foe impact',()=>{
  const f=commandFixture('taunt'),cue=commandCues(f.turn)[0]!;
  expect(cue.targetId).toBe(f.actor.id);expect(commandCues(f.turn).filter(c=>c.kind==='counter')).toHaveLength(0);
 });
 it('challenge routes to the one selected foe, never all enemies',()=>{
  const f=commandFixture('challenge'),cues=commandCues(f.turn);
  expect(f.targetId).toBe('f2');expect(cues).toHaveLength(1);expect(cues[0]!.targetId).toBe('f2');expect(cues[0]!.event.type).toBe('taunt');
 });
 it('war cry casts as a self buff with no immediate foe impact',()=>{
  const f=commandFixture('warcry'),cues=commandCues(f.turn);
  expect(cues).toHaveLength(1);expect(cues[0]).toMatchObject({kind:'cast',skill:'warcry',targetId:f.actor.id});
  expect(f.turn.events.some(e=>e.type==='damage')).toBe(false);
 });
 it('war cry impacts appear only on later real counter events, once per counter target',()=>{
  const f=commandFixture('warcry'),counters=f.turns.flatMap(t=>t.events.filter(e=>e.type==='counter'&&e.text===WAR_CRY_COUNTER));
  expect(counters.length).toBeGreaterThan(0);
  const fromTurns=f.turns.flatMap(t=>commandCues(t).filter(c=>c.kind==='counter'));
  expect(fromTurns.map(c=>c.event)).toEqual(counters);
  for(const c of fromTurns){expect(c.targetId).toBe(c.event.targetId);expect(c.sourceId).not.toBe(f.actor.id);}
  expect(new Set(fromTurns.map(c=>c.event)).size).toBe(fromTurns.length);
  // Non-physical foes never trigger a war cry counter, so no impact is invented.
  expect(commandFixture('warcry','energy').turns.flatMap(t=>commandCues(t)).filter(c=>c.kind==='counter')).toHaveLength(0);
 });
 it('a cancelled cast paints nothing',()=>{
  const f=commandFixture('challenge');
  const cancelled={...f.turn,events:[...f.turn.events,{type:'cancel' as const,text:'cancelled'}]};
  expect(commandCues(cancelled)).toHaveLength(0);
 });
});
