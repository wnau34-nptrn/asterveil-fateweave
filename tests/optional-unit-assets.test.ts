import { describe, it, expect } from 'vitest';
import { encounterPilotSheets, OptionalUnitAssets } from '../src/game/visuals/optional-unit-assets';
import { firstClash } from '../src/content/encounters/catalog';
import manifest from '../src/game/visuals/unit-atlases.json';
import { pilotAtlasUrls } from '../src/game/visuals/unit-frames';
import { readFileSync } from 'node:fs';
const withoutHunter={...firstClash,enemies:firstClash.enemies.filter(e=>e.art!=='foe_hunter')};
describe('optional unit art scheduling',()=>{
 it('requests only pilot art in this encounter, never slot IDs or the entire roster',()=>{
  expect(encounterPilotSheets(firstClash)).toEqual(['lyra','hunter']);
  expect(encounterPilotSheets(withoutHunter)).toEqual(['lyra']);
  expect(encounterPilotSheets({...withoutHunter,heroes:firstClash.heroes.filter(h=>h.id!=='tracer')})).toEqual([]);
 });
 it('deduplicates queued/cached requests and evicts only art unused by the next encounter',()=>{
  const plan=new OptionalUnitAssets(),cache=new Set<string>();plan.setEncounter(firstClash);
  expect(plan.request(n=>cache.has(n))).toEqual(['lyra','hunter']);expect(plan.request(n=>cache.has(n))).toEqual([]);
  plan.setEncounter(withoutHunter);expect(plan.request(n=>cache.has(n))).toEqual([]);
  cache.add('lyra');cache.add('hunter');expect(plan.complete(n=>cache.has(n))).toBe(true);
  expect(plan.request(n=>cache.has(n))).toEqual([]);expect(plan.unused(n=>cache.has(n))).toEqual(['hunter']);
  cache.delete('hunter');plan.setEncounter(firstClash);expect(plan.request(n=>cache.has(n))).toEqual(['hunter']);
 });
 it('does not loop on a failed optional download and can retry on a later encounter/restart',()=>{
  const plan=new OptionalUnitAssets();plan.setEncounter(firstClash);plan.request(()=>false);plan.complete(()=>false);
  expect(plan.request(()=>false)).toEqual([]);expect(plan.complete(()=>false)).toBe(false);
  plan.setEncounter(firstClash);expect(plan.request(()=>false)).toEqual(['lyra','hunter']);
  plan.reset();expect(plan.request(()=>false)).toEqual(['lyra','hunter']);
 });
 it('keeps all logical frames and pivots while cutting decoded pilot memory by at least 75%',()=>{
  let decoded=0;
  for(const name of ['lyra','hunter'] as const){
   const meta=manifest[name],atlas=JSON.parse(readFileSync('public/assets/units/'+meta.atlas,'utf8'));
   expect(Object.keys(atlas.frames)).toHaveLength(22);expect(meta.decodedBytes).toBe(meta.width*meta.height*4);decoded+=meta.decodedBytes;
   for(const value of Object.values(atlas.frames) as {sourceSize:{w:number;h:number};frame:{x:number;y:number;w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){
    expect(value.sourceSize).toEqual({w:512,h:512});expect(value.frame.x+value.frame.w).toBeLessThanOrEqual(meta.width);expect(value.frame.y+value.frame.h).toBeLessThanOrEqual(meta.height);
    expect(value.spriteSourceSize.x+value.spriteSourceSize.w).toBeLessThanOrEqual(512);expect(value.spriteSourceSize.y+value.spriteSourceSize.h).toBeLessThanOrEqual(512);
   }
   expect(pilotAtlasUrls(name)[0]).toContain(meta.image);expect(pilotAtlasUrls(name)[1]).toContain(meta.atlas);
   expect(meta.image).toMatch(/\.[a-f0-9]{12}\.webp$/);
  }
  expect(decoded).toBeLessThan(50_331_648*.25);
 });
});
