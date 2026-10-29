import {describe,it,expect} from 'vitest';
import {earthCues,earthSkills,earthHealingCues,earthHealingEvents} from '../src/game/visuals/earth-fx';
import {earthFixture} from './fixtures/earth';

describe('earth VFX preserves actual resolver outcomes',()=>{
 for(const skill of earthSkills)it(`${skill} uses each actual hit recipient and never mutates state`,()=>{
  const f=earthFixture(skill),copy=JSON.stringify(f.turns),cues=earthCues(f.turn);
  expect(cues.map(c=>c.targetId)).toEqual(f.turn.events.filter(e=>e.type==='damage'&&e.sourceId===f.actor.id).map(e=>e.targetId));
  expect(cues.length).toBeGreaterThan(0);for(const c of cues)expect(f.turn.events).toContain(c.event);
  expect(JSON.stringify(f.turns)).toBe(copy);
 });
 for(const [scenario,damage,control] of [['normal',18,'interrupt'],['energy',18,''],['reflect',13,'sigil'],['unstoppable',18,'resist'],['retribution',26,'interrupt'],['down',10,'']] as const)
  it(`Bash ${scenario} has one hit with only the real control result`,()=>{
   const f=earthFixture('bash',scenario),c=earthCues(f.turn);expect(c).toHaveLength(1);expect(c[0]!.event.amount).toBe(damage);
   expect(f.turn.events.filter(e=>['interrupt','sigil','resist'].includes(e.type)).map(e=>e.type)).toEqual(control?[control]:[]);
   const cancelled=f.turns.filter(t=>t.actorId==='f1'&&t.events.some(e=>e.type==='cancel'));
   expect(cancelled.length).toBe(control==='interrupt'||control==='sigil'?1:0);
   expect(cancelled.flatMap(earthCues)).toEqual([]);
  });
 it('Bash respects real boss steadfast after a replayable multi-round prelude',()=>{
  const f=earthFixture('bash','steadfast');expect(f.prelude.length).toBeGreaterThan(4);expect(f.state.round).toBe(3);
  expect(f.turn.events.some(e=>e.type==='resist'&&e.text==='Steadfast boss.')).toBe(true);
  expect(f.turn.events.some(e=>e.type==='interrupt')).toBe(false);expect(earthCues(f.turn)).toHaveLength(1);
 });
 it('Slam bonus and same-slot splash retain different authoritative amounts',()=>{
  const normal=earthFixture('slam'),incoming=earthFixture('slam','incoming'),splash=earthFixture('slam','runequake');
  expect(earthCues(normal.turn)[0]!.event.amount).toBe(18);expect(earthCues(incoming.turn)[0]!.event.amount).toBe(28);
  expect(earthCues(splash.turn).map(c=>[c.targetId,c.event.amount])).toEqual([['f1',18],['b1',9]]);
 });
 for(const skill of ['quake','tremor'] as const)it(`${skill} uses front or back fallback, without re-targeting after front deaths`,()=>{
  expect(earthCues(earthFixture(skill).turn).map(c=>c.targetId)).toEqual(['f1','f2']);
  expect(earthCues(earthFixture(skill,'backonly').turn).map(c=>c.targetId)).toEqual(['b1','b2']);
  const f=earthFixture(skill,'frontdown');expect(earthCues(f.turn).map(c=>c.targetId)).toEqual(['f1','f2']);
  if(skill==='quake')expect(f.turn.events.filter(e=>e.type==='down')).toHaveLength(2);
 });
 for(const [scenario,amounts] of [['skyhammer',[4,4]],['skyfull',[]],['skyone',[1]]] as const)
  it(`Skyhammer ${scenario} paints only actual HP restoration, separate from damage`,()=>{
   const f=earthFixture('quake',scenario),events=earthHealingEvents(f.turn);expect(events.map(e=>e.amount)).toEqual([...amounts]);
   expect(earthCues(f.turn)).toHaveLength(2);expect(earthHealingCues(f.turn)).toHaveLength(amounts.length?1:0);
   if(events.length)expect(earthHealingCues(f.turn)[0]!.event).toBe(events[0]);
  });
 for(const scenario of ['normal','redirect'])it(`Tremor ${scenario} changes subsequent real intent, without reducing power`,()=>{
  const f=earthFixture('tremor',scenario);expect(f.state.intent?.targetId).not.toBe(f.actor.id);
  const front=f.turns.filter(t=>t.side==='enemy'&&['f1','f2'].includes(t.actorId));expect(front).toHaveLength(2);
  expect(front.every(t=>t.intent?.targetId===f.actor.id)).toBe(true);expect(front.every(t=>t.intent?.damage===1)).toBe(true);
 });
 it('Tremor cannot redirect after its source falls or draw a dead recipient',()=>{
  const f=earthFixture('tremor','sourcedown'),front=f.turns.filter(t=>['f1','f2'].includes(t.actorId));
  expect(front[0]!.intent?.targetId).toBe(f.actor.id);expect(front[1]!.intent?.targetId).not.toBe(f.actor.id);
  const down=earthFixture('tremor','targetdown');expect(down.turn.state.enemies.find(e=>e.id==='f1')?.drawnBy).toBeUndefined();
  expect(down.turn.state.enemies.find(e=>e.id==='f2')?.drawnBy?.heroId).toBe(down.actor.id);
 });
});
