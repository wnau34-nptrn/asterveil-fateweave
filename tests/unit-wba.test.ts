import {describe,it,expect} from 'vitest';
import {unitA9Fixture} from './fixtures/unit-a9';
import {encounters,presentedEncounters,encounterById,wbKragmor} from '../src/content/encounters/catalog';
import {unitClip,unitSample,unitDisplayRatio,unitDownFrame,unitSoleOrigin,unitIdleFrame,unitKey,unitRegistry,unitSheets} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import {encounterUnitSheets} from '../src/game/visuals/optional-unit-assets';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
// WB-A (P11-05 step 5): World Boss Kragmor body motion, art identity foe_kragmor, atlas `kragmor` (30 frames, same boss layout as A9).
const ART='foe_kragmor';
const clipOf:Record<string,string>={'Stone Fist':'move1','Titan Gathering':'move2','Mountain Fall':'move3','Rift Quake':'move4','Boulder Hurl':'move5','Fault Awakening':'move6'};
const moves=Object.keys(clipOf),baseOf=(clip:string)=>1+4*(Number(clip.slice(4))-1);
const FRAMES=30,HIT=25,DOWN=27;
describe('WB-A Kragmor body: real intents, phase, clips and layout',()=>{
 it('maps every real intent and the phase name of wb-kragmor and nothing else',()=>{
  const found=new Set<string>();
  for(const e of wbKragmor.enemies.filter(e=>e.art===ART)){
   for(const n of [...wbKragmor.intents.filter(i=>i.sourceId===e.id).map(i=>i.name),...(wbKragmor.phases??[]).filter(p=>p.sourceId===e.id).map(p=>p.name)]){found.add(n);expect(unitClip(ART,undefined,n),n).toBe(clipOf[n]);}
  }
  expect(wbKragmor.enemies.filter(e=>e.art===ART).map(e=>e.id)).toEqual(['f1']);
  expect([...found].sort()).toEqual([...moves].sort());
  expect(Object.keys(unitRegistry[ART].intents).sort()).toEqual([...moves].sort());
  // Valdrakk (WB-B) and Morvane (WB-C) have their own art too; the catalog lookup still finds all three.
  expect(presentedEncounters.map(d=>d.id)).toContain('wb-kragmor');expect(encounters.map(d=>d.id)).not.toContain('wb-kragmor');expect(encounterById('wb-valdrakk')!.enemies.find(e=>e.boss)!.art).toBe('foe_valdrakk');expect(encounterById('wb-morvane')!.enemies.find(e=>e.boss)!.art).toBe('foe_morvane');
 });
 for(const name of moves)it(`plays the real ${name} turn once, ending on the seed`,()=>{
  const f=unitA9Fixture(ART,name),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe(name);expect(turn.intent!.special==='phase').toBe(name==='Fault Awakening');
  const pose=unitPose(turn,f.data)!,clip=unitClip(ART,undefined,name)!,base=baseOf(clip);
  const prepare=[0,.3,.6,.99].map(p=>unitSample(pose,'prepare',p,clip,ART)!),recover=[0,.4,.99].map(p=>unitSample(pose,'recover',p,clip,ART)!);
  for(const s of prepare){expect([base,base+1,0]).toContain(s.from);expect(s.to).not.toBe(base+2);}
  expect(prepare[0]!.from).toBe(0);expect(prepare[3]!.to).toBe(base+1);
  expect(recover[0]!.from).toBe(base+2);expect(recover[2]!.to).toBe(0);
 });
 it('gives each distinct move its own frames',()=>{
  const seq=(clip:string)=>JSON.stringify([...[0,.5,.99].map(p=>unitSample('smash','prepare',p,clip as 'move1',ART)!.from),...[0,.5,.99].map(p=>unitSample('smash','recover',p,clip as 'move1',ART)!.from)]);
  expect(new Set(Object.values(clipOf).map(seq)).size).toBe(Object.values(clipOf).length);
 });
 it('uses actual hit, down and enemy-down events with the identity-owned final pose',()=>{
  expect(unitSample('hit','reaction',0,undefined,ART)!.from).toBe(HIT);expect(unitSample('hit','reaction',1,undefined,ART)!.to).toBe(HIT+1);
  expect(unitSample('down','reaction',0,undefined,ART)!.from).toBe(DOWN);expect(unitSample('down','reaction',1,undefined,ART)!.to).toBe(DOWN+2);
  expect(unitDownFrame(ART)).toBe(DOWN+2);expect(DOWN+3).toBe(FRAMES);
  expect(unitSample('dodge','reaction',.5,undefined,ART)).toBeUndefined();expect(unitSample('block','reaction',.5,undefined,ART)).toBeUndefined();
  const down=unitA9Fixture(ART,'Stone Fist','enemy-down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get('f1')?.pose==='down')).toBe(true);
  const hurt=unitA9Fixture(ART,'Stone Fist','hurt');expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get('sefa')?.pose==='hit')).toBe(true);
 });
 it('keeps one body scale, 7/8 sole origin, lossless budget and documented frame layout',()=>{
  const m=manifest.kragmor,a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
  expect(unitKey(ART)).toBe('unit-pilot-kragmor');expect(unitSheets[ART]).toBe('kragmor');
  // Boss budget (UNIT_ANIMATION_ROLLOUT_TH.md §7): ~2 MB download, 8 MiB decoded.
  expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(8*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(2_000_000);
  expect(Object.keys(a.frames)).toHaveLength(FRAMES);expect(m.frames).toBe(FRAMES);expect(m.image).toMatch(/\.[a-f0-9]{12}\.webp$/);
  const cell=a.frames['0'].sourceSize.w;
  for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{y:number;h:number}}[]){expect(v.sourceSize).toEqual({w:cell,h:cell});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(cell);}
  expect(unitDisplayRatio(ART)).toBe(2);expect(unitSoleOrigin(ART)).toBe(.875);
  expect(unitIdleFrame(ART,300)).toBeUndefined();expect('idleLoop' in unitRegistry[ART]).toBe(false);
 });
 it('loads the Kragmor atlas only for encounters that use it',()=>{
  expect(encounterUnitSheets(wbKragmor)).toContain('kragmor');
  for(const d of encounters)expect(encounterUnitSheets(d),d.id).not.toContain('kragmor');
 });
});
