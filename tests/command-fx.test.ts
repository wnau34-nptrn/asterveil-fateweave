import {describe,it,expect} from 'vitest';
import {commandCues,commandSkills,isCommandSkill} from '../src/game/visuals/command-fx';
import {commandFixture} from './fixtures/command-fx';
import art from '../src/game/visuals/command-art.json';
import atlas from '../public/assets/fx/command_fx.json';

describe('command VFX follows authoritative events without changing state',()=>{
 it('ships the twelve R2 layers with documented pivots',()=>{
  expect(Object.keys(atlas.frames).sort()).toEqual(Object.keys(art).sort());expect(Object.keys(art)).toHaveLength(12);
  expect((art as Record<string,number[]>)['warcry_cone']).toEqual([.13671875,.5]);expect((art as Record<string,number[]>)['challenge_thread']).toEqual([.09375,.5]);
 });
 for(const skill of commandSkills.filter(isCommandSkill))it(`${skill}: one cast cue from the cast's real event`,()=>{
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
 // Save v50: war cry is Garran's spear charge. Its painted shout cone stays in the atlas but never paints; the charge's
 // real damage event routes to the spear thrust instead (blade-fx `warcry`).
 it('the spear charge paints no command cue and thrusts at its real target',()=>{
  const f=commandFixture('warcry');
  expect(isCommandSkill('warcry')).toBe(false);expect(f.turns.flatMap(t=>commandCues(t))).toHaveLength(0);
  // (The blade cue itself is covered with the Phaser-free coverage table; here: the real hit it is drawn from.)
  expect(f.turn.events.find(e=>e.type==='damage'&&e.sourceId===f.actor.id)).toMatchObject({targetId:f.targetId});
 });
 it('a cancelled cast paints nothing',()=>{
  const f=commandFixture('challenge');
  const cancelled={...f.turn,events:[...f.turn.events,{type:'cancel' as const,text:'cancelled'}]};
  expect(commandCues(cancelled)).toHaveLength(0);
 });
});
