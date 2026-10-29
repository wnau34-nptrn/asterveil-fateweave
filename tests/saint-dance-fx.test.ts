import {describe,it,expect} from 'vitest';
import {sdPlan,sdSkills,saintSkills,danceSkills,sdLayer,SAINT_HEAL,type SdSkill} from '../src/game/visuals/saint-dance-fx';
import {sdFixture} from './fixtures/saint-dance-fx';
import art from '../src/game/visuals/saint-dance-art.json';
import atlas from '../public/assets/fx/saint_dance_fx.json';
import {statSync} from 'node:fs';
import type {BattleEvent,TurnStage} from '../src/core/battle/types';

const without=(turn:TurnStage,drop:(e:BattleEvent)=>boolean):TurnStage=>({...turn,events:turn.events.filter(e=>!drop(e))});
const dodged=(turn:TurnStage):TurnStage=>({...turn,events:turn.events.map(e=>e.type==='damage'?{type:'dodge' as const,text:'Dodged.',sourceId:e.sourceId,targetId:e.targetId}:e)});
const ids=(list:{at:{id:string}}[])=>list.map(p=>p.at.id);

describe('Saint / Dancer VFX follows authoritative events without changing state',()=>{
 it('ships 30 R1 layers with documented pivots and a lossless budget',()=>{
  expect(Object.keys(atlas.frames).sort()).toEqual(Object.keys(art).sort());expect(Object.keys(art)).toHaveLength(30);
  expect((art as Record<string,number[]>)['deepbeat_peak']).toEqual([.5,.76]);expect((art as Record<string,number[]>)['saintstrike_peak']).toEqual([.5,.5]);
  const {w,h}=atlas.meta.size;expect(w*h*4).toBeLessThanOrEqual(12*1024*1024);expect(statSync('public/assets/fx/saint_dance_fx.webp').size+statSync('public/assets/fx/saint_dance_fx.json').size).toBeLessThan(2_500_000);
  for(const v of Object.values(atlas.frames))expect(v.sourceSize).toEqual({w:256,h:256});
 });
 it('every planned frame exists in the atlas',()=>{
  for(const skill of sdSkills){
   const plan=sdPlan(sdFixture(skill).turn)!;
   for(const f of [`${skill}_prepare`,...plan.peaks.map(p=>p.frame),...plan.settles.map(p=>p.frame)])expect(Object.keys(atlas.frames),`${skill}: ${f}`).toContain(f);
  }
 });
 for(const skill of saintSkills){
  it(`${skill}: contact only on struck foes, threads only to allies the resolver really healed`,()=>{
   const f=sdFixture(skill),plan=sdPlan(f.turn)!,copy=JSON.stringify(f.turn),hits=f.turn.events.filter(e=>e.type==='damage'),heals=f.turn.events.filter(e=>e.type==='heal'&&e.text===SAINT_HEAL);
   expect(hits.length).toBeGreaterThan(0);expect(heals.length).toBeGreaterThan(0);
   expect(ids(plan.peaks)).toEqual(hits.map(e=>e.targetId));expect(plan.peaks.every(p=>p.mode==='stand'&&p.at.spot==='waist')).toBe(true);
   const links=plan.settles.filter(s=>s.mode==='link');expect(ids(links)).toEqual(heals.map(e=>e.targetId));
   expect(links.every(l=>l.from!.map(x=>x.id).join()===hits.map(e=>e.targetId).join())).toBe(true);
   expect(plan.events).toEqual([...hits,...heals]);expect(JSON.stringify(f.turn)).toBe(copy);
   // the casting hero is never an endpoint of a conversion thread
   expect(ids(links)).not.toContain(f.actor.id);
  });
  it(`${skill}: no heal event means no thread; a dodge gets no body contact and no thread; a cancel paints nothing`,()=>{
   const f=sdFixture(skill);
   const noHeal=sdPlan(without(f.turn,e=>e.type==='heal'))!;expect(noHeal.settles.filter(s=>s.mode==='link')).toHaveLength(0);expect(noHeal.peaks.length).toBeGreaterThan(0);
   const miss=sdPlan(dodged(without(f.turn,e=>e.type==='heal')))!;expect(miss.peaks).toHaveLength(0);expect(miss.settles).toHaveLength(0);expect(miss.events).toHaveLength(0);expect(miss.prepare.spot).toBe('hand');
   // heal events with no struck foe (dodge) are not painted either
   const orphan=sdPlan(dodged(f.turn))!;expect(orphan.settles).toHaveLength(0);expect(orphan.events).toHaveLength(0);
   expect(sdPlan({...f.turn,events:[...f.turn.events,{type:'cancel' as const,text:'cancelled'}]})).toBeUndefined();
   expect(sdPlan({...f.turn,events:[]})).toBeUndefined();
  });
 }
 it('saintarc: one contact per really struck foe (front row only), never a back-row decoration',()=>{
  const f=sdFixture('saintarc'),plan=sdPlan(f.turn)!;
  expect(ids(plan.peaks).sort()).toEqual(['f1','f2']);expect(plan.peaks.every(p=>p.frame==='saintarc_peak')).toBe(true);
 });
 it('sharewound: one thread per real recipient (two heals, two threads)',()=>{
  const f=sdFixture('sharewound'),plan=sdPlan(f.turn)!;
  expect(f.turn.events.filter(e=>e.type==='heal')).toHaveLength(2);expect(plan.settles).toHaveLength(2);expect(new Set(ids(plan.settles)).size).toBe(2);
 });
 it('vowstrike: the seal fragments settle on the struck foe only',()=>{
  const f=sdFixture('vowstrike'),plan=sdPlan(f.turn)!;
  expect(plan.settles.filter(s=>s.frame==='vowstrike_settle').map(s=>s.at.id)).toEqual(['f2']);
 });
 it('lastlight: one brief burst on one foe, one thread per real heal (never the three-branch fan)',()=>{
  const f=sdFixture('lastlight'),plan=sdPlan(f.turn)!;
  expect(plan.peaks).toHaveLength(1);expect(plan.peaks[0]!.frame).toBe('lastlight_peak');expect(plan.settles.map(s=>s.frame)).toEqual(['saintstrike_settle']);
 });
 for(const skill of danceSkills.filter(s=>s!=='echofoot'))it(`${skill}: layers sit only on the allies whose cooldown was really restored; no damage, heal or barrier is implied`,()=>{
  const f=sdFixture(skill),plan=sdPlan(f.turn)!,cool=f.turn.events.filter(e=>e.type==='cooldown'),copy=JSON.stringify(f.turn);
  expect(cool.length).toBeGreaterThan(0);expect(f.turn.events.some(e=>['damage','heal','barrier'].includes(e.type))).toBe(false);
  expect(plan.events).toEqual(cool);
  const recipients=[...new Set(cool.map(e=>e.targetId))];
  if(skill==='rounddance'){expect(plan.peaks.map(p=>p.at.id)).toEqual(recipients);expect(plan.peaks.every(p=>p.at.spot==='feet')).toBe(true);}
  else if(skill==='duet'){expect(plan.peaks.map(p=>p.at.id)).toEqual(recipients);expect(plan.peaks.every(p=>p.mode==='link'&&p.from![0]!.id===f.actor.id)).toBe(true);}
  else expect(plan.peaks.map(p=>p.at.id)).toEqual(recipients);
  expect(JSON.stringify(f.turn)).toBe(copy);
  // nothing restored, nothing painted
  expect(sdPlan(without(f.turn,e=>e.type==='cooldown'))).toBeUndefined();
  expect(sdPlan({...f.turn,events:[...f.turn.events,{type:'cancel' as const,text:'cancelled'}]})).toBeUndefined();
 });
 it('rounddance rings only the allies with a real cooldown event (extra real recipients get a ring, nobody else)',()=>{
  const f=sdFixture('rounddance'),extra:BattleEvent[]=['guardian','healer'].map(id=>({type:'cooldown',sourceId:f.actor.id,targetId:id,amount:1,text:'Cooldown recovered.'}));
  const plan=sdPlan({...f.turn,events:[...f.turn.events,...extra]})!;
  expect(plan.peaks.map(p=>p.at.id).sort()).toEqual([...new Set([...f.turn.events.filter(e=>e.type==='cooldown').map(e=>e.targetId!),'guardian','healer'])].sort());
  expect(plan.peaks.map(p=>p.at.id)).not.toContain(f.actor.id);
 });
 it('echofoot: one trail, one contact at the real foe; its ally cooldown is not painted; a dodge stops short with no spark',()=>{
  const f=sdFixture('echofoot'),plan=sdPlan(f.turn)!,dmg=f.turn.events.filter(e=>e.type==='damage');
  expect(dmg).toHaveLength(1);expect(plan.peaks).toHaveLength(1);expect(plan.settles).toHaveLength(1);
  expect(plan.peaks[0]!.at.id).toBe(dmg[0]!.targetId);expect(plan.settles[0]!.at.id).toBe(dmg[0]!.targetId);expect(plan.events).toEqual(dmg);
  expect(plan.events.some(e=>e.type==='cooldown')).toBe(false);
  const miss=sdPlan(dodged(f.turn))!;expect(miss.settles).toHaveLength(0);expect(miss.events).toHaveLength(0);expect(miss.peaks[0]!.reach!).toBeLessThan(1);expect(miss.peaks[0]!.outcome).toBe('dodged');
  expect(sdPlan(without(f.turn,e=>e.type==='damage'))).toBeUndefined();
 });
 it('a blocked hit (0 damage) reads as blocked, not as a hit',()=>{
  const f=sdFixture('vowstrike'),blocked={...f.turn,events:f.turn.events.map(e=>e.type==='damage'?{...e,amount:0}:e)},plan=sdPlan(blocked)!;
  expect(plan.peaks[0]!.outcome).toBe('blocked');
 });
 it('enemy turns and non-saint/dancer actions paint nothing',()=>{
  const f=sdFixture('saintstrike');
  expect(sdPlan({...f.turn,side:'enemy'})).toBeUndefined();expect(sdPlan({...f.turn,action:'attack'})).toBeUndefined();
  for(const s of sdSkills as readonly SdSkill[])expect(sdPlan({...sdFixture(s).turn,action:'attack'})).toBeUndefined();
 });
 it('floor and upright layers sit behind the unit; threads, contacts and gathers in front',()=>{
  for(const f of ['rounddance_settle','deepbeat_settle'])expect(sdLayer(f)).toBe('back');
  for(const f of ['saintstrike_peak','lastlight_peak','saintstrike_settle','duet_peak','echofoot_peak','cadence_prepare','deepbeat_prepare','cadence_peak','closingstep_peak'])expect(sdLayer(f)).toBe('front');
 });
});
