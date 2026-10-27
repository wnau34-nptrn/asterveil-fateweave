import {describe,it,expect} from 'vitest';
import {projectileCues,projectileSkills} from '../src/game/visuals/projectile-fx';
import {projectileFixture} from './fixtures/projectile';

describe('projectile art follows resolved events without new strikes',()=>{
  for(const skill of projectileSkills)it(`${skill} keeps actual recipients and existing events`,()=>{
    const f=projectileFixture(skill),saved=JSON.stringify(f.turns),cues=projectileCues(f.turn);
    expect(cues.length).toBeGreaterThan(0);
    expect(cues.map(c=>c.targetId)).toEqual(f.turn.events.filter(e=>e.type==='damage'&&e.sourceId===f.actor.id).map(e=>e.targetId));
    for(const c of cues)expect(f.turn.events).toContain(c.event);
    expect(JSON.stringify(f.turns)).toBe(saved);
  });
  it('volley reaches both rows but its delay talent selects only the fastest survivor',()=>{
    const f=projectileFixture('volley','volleyhinder');
    expect(projectileCues(f.turn).map(c=>c.targetId)).toEqual(['f1','f2','b1','b2']);
    expect(f.turn.events.filter(e=>e.type==='delay').map(e=>e.targetId)).toEqual(['f1']);
  });
  it('pin only strikes the front row, without inventing a rear-row hit or stun',()=>{
    const f=projectileFixture('pin');expect(projectileCues(f.turn).map(c=>c.targetId)).toEqual(['f1','f2']);
    expect(f.turn.events.some(e=>e.type==='cancel')).toBe(false);expect(f.turn.state.pinned).toBe(f.state.round+1);
  });
  it('knives uses back, fallback front, and exact half-power twin recipients',()=>{
    const normal=projectileFixture('knives'),front=projectileFixture('knives','frontonly'),twin=projectileFixture('knives','twin');
    expect(projectileCues(normal.turn).map(c=>c.targetId)).toEqual(['b1','b2']);expect(projectileCues(front.turn).map(c=>c.targetId)).toEqual(['f1','f2']);
    const cues=projectileCues(twin.turn);expect(cues.map(c=>c.targetId)).toEqual(['b1','b2','f1','f2']);
    expect(cues[2]!.event.amount).toBe(Math.floor(cues[0]!.event.amount!/2));
    const quick=projectileFixture('knives','quick');expect(projectileCues(quick.turn)).toHaveLength(2);
  });
  it('track fires one cast then a separate actual round-end counter only on delayed targets',()=>{
    const normal=projectileFixture('track'),delayed=projectileFixture('track','delayed');
    expect(projectileCues(normal.turn)).toHaveLength(1);expect(normal.turns.flatMap(projectileCues).filter(c=>c.kind==='followup')).toEqual([]);
    expect(projectileCues(delayed.turn)).toHaveLength(1);
    const follow=delayed.turns.flatMap(projectileCues).filter(c=>c.kind==='followup');expect(follow).toHaveLength(1);
    expect(follow[0]!.event).toMatchObject({type:'counter',text:'Tracking shot.',sourceId:delayed.actor.id,targetId:'f1'});
    expect(delayed.turns.find(t=>t.events.includes(follow[0]!.event))!.actorId).not.toBe(delayed.actor.id);
  });
  for(const scenario of ['targetdown','sourcedown'])it(`tracking has no followup after ${scenario}`,()=>{
    const f=projectileFixture('track',scenario);expect(f.turns.some(t=>t.events.some(e=>e.type==='down'))).toBe(true);
    expect(f.turns.flatMap(projectileCues).filter(c=>c.kind==='followup')).toEqual([]);
  });
  it('weakshot bonus and disengage queue changes remain authoritative, without extra visual hits',()=>{
    const plain=projectileFixture('weakshot'),delayed=projectileFixture('weakshot','delayed');
    expect(projectileCues(delayed.turn)[0]!.event.amount).toBeGreaterThan(projectileCues(plain.turn)[0]!.event.amount!);
    const f=projectileFixture('disengage','quickstep');expect(projectileCues(f.turn)).toHaveLength(1);
    expect(f.turn.events.filter(e=>e.type==='delay')).toHaveLength(2);expect(f.turn.events.some(e=>e.type==='dodge')).toBe(false);
  });
  it('contract: cancellation suppresses cast, unrelated thorns/counters do not become projectiles',()=>{
    const f=projectileFixture('hinder');
    expect(projectileCues({...f.turn,events:[...f.turn.events,{type:'cancel',text:'Cancelled'}]})).toEqual([]);
    expect(projectileCues({...f.turn,action:'attack',events:[{type:'counter',text:'Counter',sourceId:f.actor.id,targetId:'f1',amount:4}]})).toEqual([]);
  });
});
