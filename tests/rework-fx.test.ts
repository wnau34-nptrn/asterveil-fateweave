import { describe, expect, it } from 'vitest';
import { reworkCues, reworkMarks } from '../src/game/visuals/rework-fx';
import { songFixture } from './fixtures/song-fx';
import type { BattleEvent } from '../src/core/battle/types';

const event = (type: BattleEvent['type'], text: string, amount = 1, targetId = 'f1'): BattleEvent => ({type,text,amount,sourceId:'sefa',targetId});
describe('reworked VFX reads resolved events', () => {
  it('shadow cut follows the real hit; readiness remains on Sefa and never becomes a shield', () => {
    const {turn} = songFixture('evade');
    const before = JSON.stringify(turn), cues = reworkCues(turn);
    expect(cues.map(c=>c.kind)).toEqual(['shadow_cut','shadow_afterimage']);
    expect(cues[0]!.id).toBe(turn.events.find(e=>e.type==='damage')!.targetId);
    expect(cues[1]!.id).toBe('sefa'); expect(cues[1]!.spot).toBe('feet');
    expect(JSON.stringify(turn)).toBe(before);
  });
  it('stops storm contacts at the resolver count, ignoring down/leech/poison side events', () => {
    const base = songFixture('evade').turn;
    const hits = [event('damage','Blade storm.'),event('damage','Blade storm.')];
    const cues = reworkCues({...base,action:'backstab',events:[hits[0]!,event('venom','Poisoned.',1),hits[1]!,event('down','Enemy falls.'),event('heal','Leech.',1,'sefa')]});
    expect(cues.filter(c=>c.kind==='blade_storm').map(c=>[c.index,c.count,c.event])).toEqual([[0,2,hits[0]],[1,2,hits[1]]]);
    expect(cues.filter(c=>c.kind==='venom_stack')[0]).toMatchObject({index:0,count:2});
    expect(reworkCues({...base,action:'backstab',events:[event('cancel','Stopped.')]})).toEqual([]);
    expect(reworkCues({...base,events:[event('cancel','Stopped.'),event('damage','Poison.')]}).map(c=>c.kind)).toEqual(['venom_tick']);
  });
  it('never paints the initial disarm hit as a toxic detonation or invents neighbours', () => {
    const turn = {...songFixture('evade').turn,action:'disarm' as const};
    expect(reworkCues({...turn,events:[event('damage','')]})).toEqual([]);
    const splash=event('damage','The venom splashes.',3,'f2');
    const cues=reworkCues({...turn,events:[event('damage',''),event('damage','The venom bursts.',6),splash]});
    expect(cues.map(c=>[c.kind,c.id])).toEqual([['venom_burst','f1'],['venom_splash','f2']]);
    expect(cues[1]!.event).toBe(splash);
  });
  it('recognises round-end poison on another actor turn and distinguishes coating, gain and spend', () => {
    const turn=songFixture('evade').turn;
    const cues=reworkCues({...turn,action:'attack',actorId:'aegis',events:[event('damage','Poison.'),event('venom','Blades coated.',3,'sefa'),event('arcane','Arcane charge.',1,'weaver'),event('arcane','Arcane charges released.',-3,'weaver'),event('clash','The fist meets the move.')]});
    expect(cues.map(c=>c.kind)).toEqual(['venom_tick','venom_coat','arcane_gain','arcane_release','clash']);
    expect(cues[3]!.width).toBe(94);
  });
  it('restores exactly 1–3 status emblems from live state and clears them on death/removal', () => {
    const {turn}=songFixture('evade'), state=structuredClone(turn.state);
    state.enemies[0]!.venom={heroId:'sefa',stacks:3,until:state.round+1};
    state.heroes[0]!.arcane=2;
    expect(reworkMarks(state).map(c=>[c.frame,c.count])).toEqual([['venom_emblem',3],['arcane_emblem',2]]);
    state.enemies[0]!.hp=0; delete state.heroes[0]!.arcane;
    expect(reworkMarks(state)).toEqual([]);
  });
});
