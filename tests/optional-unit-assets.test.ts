import { describe, it, expect } from 'vitest';
import { encounterUnitSheets, OptionalUnitAssets } from '../src/game/visuals/optional-unit-assets';
import { firstClash } from '../src/content/encounters/catalog';
import manifest from '../src/game/visuals/unit-atlases.json';
import { unitAtlasUrls } from '../src/game/visuals/unit-frames';
import { readFileSync } from 'node:fs';
const withoutHunter={...firstClash,enemies:firstClash.enemies.filter(e=>e.art!=='foe_hunter')};
describe('optional unit art scheduling',()=>{
 it('requests only pilot art in this encounter, never slot IDs or the entire roster',()=>{
  expect(encounterUnitSheets(firstClash)).toEqual(['lyra','hunter','eira','vargoth','seren']);
  expect(encounterUnitSheets(withoutHunter)).toEqual(['lyra','eira','vargoth','seren']);
  // Aegis is on anatomy hold: its A2 atlas is not requested until an anatomy-locked redraw is packed.
  expect(encounterUnitSheets(firstClash)).not.toContain('aegis');
  expect(encounterUnitSheets({...withoutHunter,heroes:firstClash.heroes.filter(h=>!['tracer','weaver','guardian','healer'].includes(h.id)),enemies:[]})).toEqual([]);
 });
 it('shares one optional texture for multiple guards',()=>{
  const guard=firstClash.enemies.find(e=>e.art==='foe_vargoth_guard')!;
  expect(encounterUnitSheets({...firstClash,enemies:[{...guard,id:'f1'},{...guard,id:'f2'}]}).filter(n=>n==='vargoth')).toHaveLength(1);
 });
 it('deduplicates queued/cached requests and evicts only art unused by the next encounter',()=>{
  const plan=new OptionalUnitAssets(),cache=new Set<string>();plan.setEncounter(firstClash);
  expect(plan.request(n=>cache.has(n))).toEqual(['lyra','hunter','eira','vargoth','seren']);expect(plan.request(n=>cache.has(n))).toEqual([]);
  plan.setEncounter(withoutHunter);expect(plan.request(n=>cache.has(n))).toEqual([]);
  cache.add('lyra');cache.add('hunter');cache.add('eira');cache.add('aegis');cache.add('vargoth');cache.add('seren');expect(plan.complete(n=>cache.has(n))).toBe(true);
  expect(plan.request(n=>cache.has(n))).toEqual([]);expect(plan.unused(n=>cache.has(n))).toEqual(['hunter']);
  cache.delete('hunter');plan.setEncounter(firstClash);expect(plan.request(n=>cache.has(n))).toEqual(['hunter']);
 });
 it('does not loop on a failed optional download and can retry on a later encounter/restart',()=>{
  const plan=new OptionalUnitAssets();plan.setEncounter(firstClash);plan.request(()=>false);plan.complete(()=>false);
  expect(plan.request(()=>false)).toEqual([]);expect(plan.complete(()=>false)).toBe(false);
  plan.setEncounter(firstClash);expect(plan.request(()=>false)).toEqual(['lyra','hunter','eira','vargoth','seren']);
  plan.reset();expect(plan.request(()=>false)).toEqual(['lyra','hunter','eira','vargoth','seren']);
 });
 it('keeps all logical frames and pivots while cutting decoded pilot memory by at least 75%',()=>{
  let decoded=0;
  for(const name of ['lyra','hunter'] as const){
   const meta=manifest[name],atlas=JSON.parse(readFileSync('public/assets/units/'+meta.atlas,'utf8'));
   expect(Object.keys(atlas.frames)).toHaveLength(name==='lyra'?38:22);expect(meta.decodedBytes).toBe(meta.width*meta.height*4);decoded+=meta.decodedBytes;
   for(const value of Object.values(atlas.frames) as {sourceSize:{w:number;h:number};frame:{x:number;y:number;w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){
    expect(value.sourceSize).toEqual({w:512,h:512});expect(value.frame.x+value.frame.w).toBeLessThanOrEqual(meta.width);expect(value.frame.y+value.frame.h).toBeLessThanOrEqual(meta.height);
    expect(value.spriteSourceSize.x+value.spriteSourceSize.w).toBeLessThanOrEqual(512);expect(value.spriteSourceSize.y+value.spriteSourceSize.h).toBeLessThanOrEqual(512);
   }
   expect(unitAtlasUrls(name)[0]).toContain(meta.image);expect(unitAtlasUrls(name)[1]).toContain(meta.atlas);
   expect(meta.image).toMatch(/\.[a-f0-9]{12}\.webp$/);
  }
  // The pilot repack cut the two 22-cell grids by over 75%. LYRA-002 then added nine unique Mark/Parry stance poses
 // (Lyra 8.5 MiB decoded, reported to the owner); keep the total below 13 MiB so further growth is a conscious choice.
 expect(decoded).toBeLessThan(13*1024*1024);
 });
});
