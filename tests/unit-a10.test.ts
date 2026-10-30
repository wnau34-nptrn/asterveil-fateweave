import {describe,it,expect} from 'vitest';
import {foeArts,foeIntents,unitA10Fixture} from './fixtures/unit-a10';
import {encounters} from '../src/content/encounters/catalog';
import {unitClip,unitSample,unitRelease,unitDisplayRatio,unitIdleFrame,unitRegistry,unitKey} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import {mirroredArt} from '../src/game/visuals/assets';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
const foeClip={'Raking Slash':'attack','Shadow Knife':'skill','Crushing Blow':'attack','Rift Bolt':'skill'} as const;
// Contact/release is figure 4 of each six-figure move = the first recover cell (attack 5, skill 13).
const contactOf={attack:5,skill:13} as const;
describe('A10 Veil Raider / Rift Brute actual content, clips and layout',()=>{
 it('audits every encounter using the two foes and each of their intents',()=>{
  const found:Record<string,Set<string>>={};
  for(const data of encounters)for(const e of data.enemies.filter(e=>(foeArts as readonly string[]).includes(e.art??''))){
   for(const intent of data.intents.filter(i=>i.sourceId===e.id)){(found[e.art!]??=new Set()).add(intent.name);expect(unitClip(e.art!,undefined,intent.name)).toBe(foeClip[intent.name as keyof typeof foeClip]);}
  }
  for(const art of foeArts)expect([...found[art]!].sort()).toEqual([...foeIntents[art]].sort());
 });
 for(const art of foeArts)for(const name of foeIntents[art])it(`uses the real ${name} cue for ${art} without inventing a projectile`,()=>{
  const f=unitA10Fixture(art,name),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe(name);
  const pose=unitPose(turn,f.data)!,clip=unitClip(art,undefined,name)!;
  expect(clip).toBe(foeClip[name as keyof typeof foeClip]);
  const contact=contactOf[clip as keyof typeof contactOf];
  expect(unitRelease(art,clip)).toBeUndefined();
  for(const p of [0,.5,1])expect(unitSample(pose,'prepare',p,clip,art)!.to).toBeLessThan(contact);
  expect(unitSample(pose,'recover',0,clip,art)!.from).toBe(contact);
 });
 it('gives each foe attack and skill their own frames and leaves unmapped intents procedural',()=>{
  for(const art of foeArts){
   const seq=(clip:'attack'|'skill')=>JSON.stringify([...[0,.4,.99].map(p=>unitSample('slash','prepare',p,clip,art)!.from),...[0,.5,.99].map(p=>unitSample('slash','recover',p,clip,art)!.from)]);
   expect(seq('attack')).not.toBe(seq('skill'));
   expect(unitClip(art,undefined,'Rune Lash')).toBeUndefined();expect(unitClip(art,'attack',undefined)).toBeUndefined();
  }
 });
 it('uses actual hit and enemy-down events on the foe',()=>{
  for(const art of foeArts){
   const hit=unitA10Fixture(art,undefined,'normal');expect(hit.result.turns.some(t=>unitReactions(t,hit.data).get('f1')?.pose==='hit')).toBe(true);
   const down=unitA10Fixture(art,undefined,'enemy-down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get('f1')?.pose==='down')).toBe(true);
  }
 });
 it('maps hit, down (final grounded frame 21) and the 0-damage block reaction, keeping the fallback for the rest',()=>{
  for(const art of foeArts){
   expect(unitSample('hit','reaction',0,undefined,art)!.from).toBe(17);expect(unitSample('hit','reaction',1,undefined,art)!.to).toBe(18);
   expect(unitSample('down','reaction',0,undefined,art)!.from).toBe(19);expect(unitSample('down','reaction',1,undefined,art)!.to).toBe(21);
   expect(unitSample('block','reaction',0,undefined,art)!.from).toBe(22);expect(unitSample('block','reaction',1,undefined,art)!.to).toBe(23);
   expect(unitSample('dodge','reaction',.5,undefined,art)).toBeUndefined();expect(unitSample('counter','reaction',.5,undefined,art)).toBeUndefined();
   expect(unitKey(art)).toBe(`unit-pilot-${art}`);
  }
 });
 it('treats a fully absorbed hit as the block reaction in the real mapping',()=>{
  const f=unitA10Fixture('raider');const turn=f.result.turns[0]!;
  const zero={...turn,events:turn.events.map(e=>e.type==='damage'&&e.targetId==='f1'?{...e,amount:0}:e)};
  expect(unitReactions(zero,f.data).get('f1')?.pose).toBe('block');
 });
 it('keeps shared scale/pivot, lossless budgets, the documented layout and the left-facing atlas',()=>{
  for(const name of foeArts){const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);
   expect(Object.keys(a.frames)).toHaveLength(24);expect(m.frames).toBe(24);
   // Exact idle lockbacks: the first and last cell of both moves; reaction cells are all distinct from idle.
   for(const i of [1,8,9,16])expect(a.frames[i]).toEqual(a.frames[0]);
   for(const i of [17,18,19,20,21,22,23])expect(a.frames[i]).not.toEqual(a.frames[0]);
   expect(new Set([19,20,21].map(i=>JSON.stringify(a.frames[i].frame))).size).toBe(3);
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){expect(v.sourceSize).toEqual({w:512,h:512});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(500);}
   expect(unitDisplayRatio(name)).toBe(2);expect(unitRegistry[name].sheet).toBe(name);
   expect('idleLoop' in unitRegistry[name]).toBe(false);expect(unitIdleFrame(name,300)).toBeUndefined();
  }
  // The Raider atlas already faces left; the shipped static mirror applies to the unpacked sheet only (BattleScene never flips a packed atlas).
  expect(mirroredArt.has('raider')).toBe(true);
 });
 it('packs only the verified Codex strips (raw SHA-256 matches the delivered manifest)',()=>{
  const delivered=JSON.parse(readFileSync('incoming/ART-UNIT-ANIMATION-A10-001/validation.json','utf8')).files as Record<string,{sha256:string}>;
  const report=JSON.parse(readFileSync('incoming/ART-UNIT-ANIMATION-A10-001/validation-normalized.json','utf8')) as Record<string,{strips:Record<string,{sha256:string}>;facing:string}>;
  let strips=0;
  for(const art of foeArts){expect(report[art]!.facing).toBe('left');for(const [name,s] of Object.entries(report[art]!.strips)){expect(delivered[`raw/${name}.png`]!.sha256).toBe(s.sha256);strips++;}}
  expect(strips).toBe(10);
 });
});
