import {describe,it,expect} from 'vitest';
import {songPlan,songSkills,songLayer} from '../src/game/visuals/song-fx';
import {songFixture} from './fixtures/song-fx';
import art from '../src/game/visuals/song-shadow-art.json';
import atlas from '../public/assets/fx/song_shadow_fx.json';
import {statSync} from 'node:fs';

describe('song / shadow VFX follows authoritative events without changing state',()=>{
 it('ships the 21 layers (song R2 + shadow R1) with documented pivots and a lossless budget',()=>{
  expect(Object.keys(atlas.frames).sort()).toEqual(Object.keys(art).sort());expect(Object.keys(art)).toHaveLength(21);
  expect((art as Record<string,number[]>)['valor_prepare']).toEqual([.5049,.7344]);expect((art as Record<string,number[]>)['decoy_peak']).toEqual([.498,.7791]);
  const {w,h}=atlas.meta.size;expect(w*h*4).toBeLessThanOrEqual(6*1024*1024);expect(statSync('public/assets/fx/song_shadow_fx.webp').size+statSync('public/assets/fx/song_shadow_fx.json').size).toBeLessThan(1_000_000);
  for(const v of Object.values(atlas.frames))expect(v.sourceSize).toEqual({w:256,h:256});
 });
 it('valor: self song, flecks only to standing allies, nothing aimed at a foe',()=>{
  const f=songFixture('valor'),plan=songPlan(f.turn)!,copy=JSON.stringify(f);
  expect(plan.events).toHaveLength(1);expect(plan.events[0]!.type).toBe('song');expect(plan.peak!.to).toBeUndefined();
  expect(plan.settles.map(s=>s.at.id).sort()).toEqual(f.data.heroes.map(h=>h.id).filter(id=>id!==f.actor.id).sort());
  expect(plan.settles.every(s=>s.at.spot==='feet'&&s.from!.id===f.actor.id)).toBe(true);expect(JSON.stringify(f)).toBe(copy);
 });
 it('dread: no hit is invented; wave toward standing foes, tremor only on foes still standing',()=>{
  const f=songFixture('dread'),plan=songPlan(f.turn)!;
  expect(f.turn.events.some(e=>e.type==='damage')).toBe(false);
  expect(plan.peak!.to!.map(t=>t.id).sort()).toEqual(['b1','f1','f2']);expect(plan.settles).toHaveLength(3);
  const down={...f.turn,after:{...f.turn.after!,enemies:f.turn.after!.enemies.map(e=>e.id==='b1'?{...e,hp:0}:e)}};
  expect(songPlan(down)!.settles.map(s=>s.at.id).sort()).toEqual(['f1','f2']);
 });
 it('note: one blade, one contact per real damage event (never more than the resolver emitted)',()=>{
  const f=songFixture('note'),plan=songPlan(f.turn)!,hits=f.turn.events.filter(e=>e.type==='damage');
  expect(hits).toHaveLength(1);expect(plan.peak!.to).toEqual([{id:f.targetId,spot:'waist'}]);expect(plan.settles).toHaveLength(1);expect(plan.settles[0]!.event).toBe(hits[0]);
 });
 it('finale of valor: one shared wave toward every struck foe, one contact per real damage event',()=>{
  const f=songFixture('finale','valor'),plan=songPlan(f.turn)!,hits=f.turn.events.filter(e=>e.type==='damage');
  expect(f.turn.events.some(e=>e.text==='Finale of valor.')).toBe(true);expect(hits.length).toBeGreaterThan(1);
  expect(plan.peak!.to!.map(t=>t.id)).toEqual(hits.map(e=>e.targetId));expect(plan.settles.map(s=>s.event)).toEqual(hits);
 });
 for(const song of ['mend','dread'] as const)it(`finale of ${song}: gather only, no wave or contact is invented`,()=>{
  const f=songFixture('finale',song),plan=songPlan(f.turn)!;
  expect(f.turn.events.some(e=>e.text===`Finale of ${song==='mend'?'mending':'dread'}.`)).toBe(true);
  expect(plan.peak).toBeUndefined();expect(plan.settles).toHaveLength(0);expect(plan.events).toHaveLength(0);expect(plan.prepare).toBeDefined();
 });
 it('solo paints the one ally who really received the buff (no foe, no damage)',()=>{
  const f=songFixture('solo'),plan=songPlan(f.turn)!,buff=f.turn.events.find(e=>e.type==='buff')!;
  expect(f.turn.events.some(e=>e.type==='damage')).toBe(false);expect(plan.peak!.from).toEqual({id:buff.targetId,spot:'feet'});expect(plan.settles).toEqual([{at:{id:buff.targetId,spot:'feet'},outcome:'hit'}]);
 });
 it('evade is Sefa\'s own feet; decoy is the covered ally (separate real events, one ghost)',()=>{
  const e=songFixture('evade'),pe=songPlan(e.turn)!;expect(pe.peak!.from).toEqual({id:'sefa',spot:'feet'});expect(pe.settles).toHaveLength(1);expect(e.turn.events.some(x=>x.type==='damage')).toBe(false);
  const d=songFixture('decoy'),pd=songPlan(d.turn)!,cover=d.turn.events.find(x=>x.text==='Shadow cover.')!;
  expect(pd.peak!.from).toEqual({id:cover.targetId,spot:'feet'});expect(pd.settles).toHaveLength(1);expect(cover.targetId).not.toBe('sefa');
 });
 it('a cancelled cast and non-song actions paint nothing; a missing event paints nothing',()=>{
  for(const skill of songSkills){
   const f=songFixture(skill);
   expect(songPlan({...f.turn,events:[...f.turn.events,{type:'cancel' as const,text:'cancelled'}]})).toBeUndefined();
   expect(songPlan({...f.turn,events:f.turn.events.filter(x=>x.type==='cancel')})).toBeUndefined();
  }
  expect(songPlan({...songFixture('note').turn,action:'attack'})).toBeUndefined();
 });
 it('floor layers sit behind the unit, body layers in front',()=>{
  for(const s of ['valor','solo','evade','decoy'] as const)expect(songLayer(s)).toBe('back');
  for(const s of ['finale','dread','note'] as const)expect(songLayer(s)).toBe('front');
 });
});
