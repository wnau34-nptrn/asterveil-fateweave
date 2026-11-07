import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import atlas from '../public/assets/fx/rework_fx.json';
import layers from '../incoming/ART-VFX-REWORK-001/layers.json';
import validation from '../incoming/ART-VFX-REWORK-001/validation.json';

const root='incoming/ART-VFX-REWORK-001/';
describe('rework artwork package integrity and texture budget',()=>{
 it('contains every named runtime frame, compact status emblems and optional fang alternative',()=>{
  const expected=['venom_coat','venom_stack','venom_tick','venom_burst','venom_splash','shadow_cut','shadow_afterimage','arcane_gain','arcane_release','clash'].flatMap(k=>['prepare','peak','end'].map(p=>`${k}_${p}`));
  expected.push('blade_storm_1','blade_storm_2','blade_storm_3','blade_storm_4','blade_storm_settle','venom_emblem','arcane_emblem');
  expect(Object.keys(atlas.frames).sort()).toEqual(expected.sort());
  expect(layers.layers.filter(l=>l.variant==='R2').map(l=>l.move)).toEqual(['venom_emblem']);
  expect(layers.alpha).toBe('straight');expect(layers.padding_min_px).toBeGreaterThanOrEqual(12);
  for(const layer of layers.layers){
   expect(layer.size).toEqual([256,256]);expect(layer.pivot).toEqual([.5,.5]);
   const box=layer.alpha_bounds;expect(Math.min(box[0]!,box[1]!)).toBeGreaterThanOrEqual(12);expect(Math.max(box[2]!,box[3]!)).toBeLessThanOrEqual(244);
  }
  for(const f of Object.values(atlas.frames))expect(f.sourceSize).toEqual({w:256,h:256});
 });
 it('matches every delivered hash and remains below the small-atlas budget',()=>{
  for(const [path,meta] of Object.entries(validation.files)){
   const bytes=readFileSync(root+path);expect(bytes.length,path).toBe(meta.bytes);expect(createHash('sha256').update(bytes).digest('hex'),path).toBe(meta.sha256);
  }
  const {w,h}=atlas.meta.size;expect(w*h*4).toBeLessThanOrEqual(8*1024*1024);
  expect(statSync('public/assets/fx/rework_fx.webp').size+statSync('public/assets/fx/rework_fx.json').size).toBeLessThan(1_500_000);
 });
});
