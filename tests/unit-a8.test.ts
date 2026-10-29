import {describe,it,expect} from 'vitest';
import {foeArts,foeIntents,sheetOf,unitA8Fixture} from './fixtures/unit-a8';
import {encounters} from '../src/content/encounters/catalog';
import {unitClip,unitSample,unitRelease,unitDisplayRatio,unitIdleFrame,unitKey,unitRegistry} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
// Real intent names (content is never renamed): the Golem punches for Crystal Fist/Stone Fist and slams for Veil Quake; the Channeler's
// content name is Rift Beam (species) but the hand-authored Rear Ambush encounter calls it Rift Bolt, so both map to its single gesture.
const clipOf:Record<string,'attack'|'skill'>={'Crystal Fist':'attack','Stone Fist':'attack','Veil Quake':'skill','Rift Beam':'attack','Rift Bolt':'attack','Star Flame':'attack','Crystal Stab':'attack'};
// Contact is the first recover frame of each eight-frame clip block.
const contactOf={attack:5,skill:13} as const;
describe('A8 Golem / Channeler / Wisp / Crawler actual content, clips and layout',()=>{
 it('audits every intent of the four identities in every encounter against the mapping',()=>{
  const found:Record<string,Set<string>>={};
  for(const data of encounters)for(const e of data.enemies.filter(e=>(foeArts as readonly string[]).includes(e.art??''))){
   for(const intent of data.intents.filter(i=>i.sourceId===e.id)){
    (found[e.art!]??=new Set()).add(intent.name);
    expect(unitClip(e.art!,undefined,intent.name),`${e.art} ${intent.name} in ${data.id}`).toBe(clipOf[intent.name]);
   }
  }
  for(const art of foeArts)expect([...found[art]!].sort()).toEqual([...foeIntents[art]].sort());
  // The registry maps exactly these names, nothing invented.
  for(const art of foeArts)expect(Object.keys(unitRegistry[art].intents).sort()).toEqual([...foeIntents[art]].sort());
 });
 it('serves Crystal Fist and Stone Fist with one punch and Veil Quake with its own slam',()=>{
  expect(unitClip('foe_golem',undefined,'Crystal Fist')).toBe(unitClip('foe_golem',undefined,'Stone Fist'));
  const frames=(clip:'attack'|'skill')=>JSON.stringify([0,.5,.99].map(p=>unitSample('smash','prepare',p,clip,'foe_golem')!.from));
  expect(frames('attack')).not.toBe(frames('skill'));
  expect(unitClip('foe_rift_channeler',undefined,'Rift Bolt')).toBe(unitClip('foe_rift_channeler',undefined,'Rift Beam'));
 });
 for(const art of foeArts)for(const name of foeIntents[art])it(`uses the real ${name} cue for ${art} without inventing a projectile`,()=>{
  const f=unitA8Fixture(art,name),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe(name);
  const pose=unitPose(turn,f.data)!,clip=unitClip(art,undefined,name)!;
  expect(clip).toBe(clipOf[name]);expect(unitRelease(art,clip)).toBeUndefined();
  const contact=contactOf[clip as keyof typeof contactOf];
  for(const p of [0,.5,1])expect(unitSample(pose,'prepare',p,clip,art)!.to).toBeLessThan(contact);
  expect(unitSample(pose,'recover',0,clip,art)!.from).toBe(contact);
  // Heroes and other identities do not take these names.
  expect(unitClip('foe_riftweaver',undefined,name)).toBeUndefined();expect(unitClip(art,name.toLowerCase(),undefined)).toBeUndefined();
 });
 it('uses actual hit, down and enemy-down events',()=>{
  for(const art of foeArts){
   const hurt=unitA8Fixture(art,undefined,'hurt');expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get('tracer')?.pose==='hit')).toBe(true);
   const down=unitA8Fixture(art,undefined,'down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get('tracer')?.pose==='down')).toBe(true);
   const dead=unitA8Fixture(art,undefined,'enemy-down');expect(dead.result.turns.some(t=>unitReactions(t,dead.data).get('f1')?.pose==='down')).toBe(true);
  }
 });
 it('adds four-figure reaction sprites (hit 17..18, down 19..21 held at 21) while preserving unknown fallback',()=>{
  for(const art of foeArts){
   expect(unitSample('hit','reaction',0,undefined,art)!.from).toBe(17);expect(unitSample('hit','reaction',1,undefined,art)!.to).toBe(18);
   expect(unitSample('down','reaction',0,undefined,art)!.from).toBe(19);expect(unitSample('down','reaction',1,undefined,art)!.to).toBe(21);
   expect(unitSample('dodge','reaction',.5,undefined,art)).toBeUndefined();expect(unitSample('block','reaction',.5,undefined,art)).toBeUndefined();expect(unitSample('counter','reaction',.5,undefined,art)).toBeUndefined();
   expect(unitClip(art,'future',undefined)).toBeUndefined();expect(unitKey(art)).toBe(`unit-pilot-${sheetOf[art]}`);
  }
 });
 it('keeps shared scale/pivot, lossless budgets and the documented frame layout',()=>{
  const layout={golem:{frames:22,locked:[1,8,9,16]},channeler:{frames:22,locked:[1,8,9,10,11,12,13,14,15,16]},wisp:{frames:25,locked:[1,8,9,10,11,12,13,14,15,16,22]},crawler:{frames:22,locked:[1,8,9,10,11,12,13,14,15,16]}} as const;
  for(const name of Object.keys(layout) as (keyof typeof layout)[]){const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);expect(Object.keys(a.frames)).toHaveLength(layout[name].frames);expect(m.frames).toBe(layout[name].frames);
   for(const i of layout[name].locked)expect(a.frames[i]).toEqual(a.frames[0]);
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){expect(v.sourceSize).toEqual({w:512,h:512});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(500);expect(v.spriteSourceSize.x).toBeGreaterThanOrEqual(0);expect(v.spriteSourceSize.x+v.spriteSourceSize.w).toBeLessThanOrEqual(512);}
   // Grounded identities rest every action/reaction pose on the sole line; the held collapse (21) is lower than the buckle (19) for all four.
   const bottom=(i:number)=>a.frames[i].spriteSourceSize.y+a.frames[i].spriteSourceSize.h;
   if(name!=='wisp')for(const i of [5,6,17,18,19,20,21])expect(bottom(i)).toBeGreaterThanOrEqual(494);
   expect(a.frames[21].spriteSourceSize.y).toBeGreaterThan(a.frames[19].spriteSourceSize.y);
  }
  for(const art of foeArts)expect(unitDisplayRatio(art)).toBe(2);
 });
 it('hovers only the wisp, with the seed, bob up and bob down frames',()=>{
  expect(unitRegistry.foe_rift_wisp.idleLoop).toEqual({frames:[22,23,24],frameMs:160});
  expect([0,160,320,480].map(t=>unitIdleFrame('foe_rift_wisp',t))).toEqual([22,23,24,22]);
  for(const art of ['foe_golem','foe_rift_channeler','foe_shard_crawler']){expect('idleLoop' in unitRegistry[art as keyof typeof unitRegistry]).toBe(false);expect(unitIdleFrame(art,300)).toBeUndefined();}
 });
});
