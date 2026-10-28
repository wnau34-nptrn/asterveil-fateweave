import {describe,it,expect} from 'vitest';
import {sealCues,sealEvents,sealSkills,sealLayer} from '../src/game/visuals/arcane-seal-fx';
import {sealFixture} from './fixtures/arcane-seal';

describe('arcane seal follows authoritative events without changing state',()=>{
 for(const skill of sealSkills)it(`${skill}: cues are the cast's real events`,()=>{
  const f=sealFixture(skill),copy=JSON.stringify(f),cues=sealCues(f.turn);
  expect(cues.length).toBeGreaterThan(0);for(const cue of cues){expect(f.turn.events).toContain(cue.event);expect(cue.sourceId).toBe(f.actor.id);}
  expect(sealEvents(f.turn)).toHaveLength(cues.length);expect(JSON.stringify(f)).toBe(copy);
  expect(f.turn.events.some(e=>e.type==='damage')).toBe(skill!=='mark');
 });
 it('mark paints once on the marked foe and never on damage',()=>{
  const f=sealFixture('mark'),cues=sealCues(f.turn);
  expect(cues).toHaveLength(1);expect(cues[0]!.event.type).toBe('mark');expect(cues[0]!.targetId).toBe(f.targetId);
 });
 it('storm paints one cue per struck foe, including the back row',()=>{
  const f=sealFixture('storm'),struck=f.turn.events.filter(e=>e.type==='damage'||e.type==='dodge');
  expect(sealCues(f.turn)).toHaveLength(struck.length);expect(struck.length).toBe(4);
  expect(new Set(sealCues(f.turn).map(c=>c.targetId)).size).toBe(4);
 });
 it('sigil binds only against an announced energy move; dispel settles on the real removal',()=>{
  expect(sealCues(sealFixture('sigil','energy').turn)[0]!.applied).toBe(true);
  expect(sealCues(sealFixture('sigil').turn)[0]!.applied).toBe(false);
  const d=sealFixture('dispel'),cue=sealCues(d.turn)[0]!;
  expect(cue.applied).toBe(d.turn.events.some(e=>e.type==='dispel'&&e.targetId===cue.targetId));
 });
 it('a killing hit does not claim a removal that did not happen',()=>{
  const d=sealFixture('dispel','kill');
  expect(sealCues(d.turn)[0]!.applied).toBe(d.turn.events.some(e=>e.type==='dispel'));
 });
 it('body-height layers sit in front, floor layers behind',()=>{
  expect(sealLayer('sigil','peak')).toBe('back');expect(sealLayer('storm','peak')).toBe('front');expect(sealLayer('storm','settle')).toBe('back');
  expect(sealLayer('mark','prepare')).toBe('front');
 });
});
