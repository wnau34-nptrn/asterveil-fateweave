import {describe,it,expect} from 'vitest';
import {bossArts,bossMoves,phaseNames,sheetOf,unitA9Fixture,type BossArt} from './fixtures/unit-a9';
import {encounters} from '../src/content/encounters/catalog';
import {unitClip,unitSample,unitDisplayRatio,unitDownFrame,unitSoleOrigin,unitIdleFrame,unitKey,unitRegistry,unitSheets} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import {mirroredArt} from '../src/game/visuals/assets';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
// move clip of every real intent / phase name; each move owns four unique frames starting at 1 + 4 * (n - 1).
const clipOf:Record<BossArt,Record<string,string>>={
 foe_matriarch:{'Thorn Tempest':'move1','Briar Lash':'move2','Gather Thorns':'move3','Thorn Bloom':'move4','Thorn Storm':'move4','Thorn Rage':'move5'},
 foe_juggernaut:{'Horn Charge':'move1','Shard Burst':'move2'},
 foe_sentinel:{'Rift Cataclysm':'move1','Raking Slash':'move2','Crushing Blow':'move3','Rift Bolt':'move4','Rift Wave':'move4','Rift Gathering':'move5','Rift Awakening':'move6','Call the Rift':'move7'},
 foe_captain:{'War Cry':'move1','Crushing Blow':'move2','Call the Hunt':'move3'},
};
const baseOf=(clip:string)=>1+4*(Number(clip.slice(4))-1);
const layout={foe_matriarch:{frames:26,hit:21,down:23},foe_juggernaut:{frames:14,hit:9,down:11},foe_sentinel:{frames:34,hit:29,down:31},foe_captain:{frames:18,hit:13,down:15}} as const;
describe('A9 boss bodies: actual intents, phases, clips and layout',()=>{
 it('maps every real intent and phase name of the four bosses across all encounters',()=>{
  const found:Record<string,Set<string>>={};
  for(const data of encounters)for(const e of data.enemies.filter(e=>(bossArts as readonly string[]).includes(e.art??''))){
   const names=[...data.intents.filter(i=>i.sourceId===e.id).map(i=>i.name),...(data.phases??[]).filter(p=>p.sourceId===e.id).map(p=>p.name)];
   for(const name of names){(found[e.art!]??=new Set()).add(name);expect(unitClip(e.art!,undefined,name),`${e.art} ${name}`).toBe(clipOf[e.art as BossArt][name]);}
  }
  for(const art of bossArts)expect([...found[art]!].sort()).toEqual([...bossMoves[art]].sort());
  for(const art of bossArts)expect(Object.keys(unitRegistry[art].intents).sort()).toEqual([...bossMoves[art]].sort());
 });
 for(const art of bossArts)for(const name of bossMoves[art])it(`plays the real ${name} turn of ${art} once, ending on the seed`,()=>{
  const f=unitA9Fixture(art,name),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe(name);
  // Phase gestures exist only on the generated phase-change turn; a regular move never carries a phase name.
  expect(turn.intent!.special==='phase').toBe((phaseNames as readonly string[]).includes(name));
  const pose=unitPose(turn,f.data)!,clip=unitClip(art,undefined,name)!,base=baseOf(clip);
  expect(clip).toBe(clipOf[art][name]);
  const prepare=[0,.3,.6,.99].map(p=>unitSample(pose,'prepare',p,clip,art)!),recover=[0,.4,.99].map(p=>unitSample(pose,'recover',p,clip,art)!);
  // Contact (first recover frame) is never shown during the windup; the windup begins on the seed and the clip returns to frame 0.
  for(const s of prepare){expect([base,base+1,0]).toContain(s.from);expect(s.to).not.toBe(base+2);}
  expect(prepare[0]!.from).toBe(0);expect(prepare[3]!.to).toBe(base+1);
  expect(recover[0]!.from).toBe(base+2);expect(recover[2]!.to).toBe(0);
 });
 it('gives each distinct move of a boss its own frames',()=>{
  for(const art of bossArts){
   const clips=[...new Set(Object.values(clipOf[art]))];
   const seq=(clip:string)=>JSON.stringify([...[0,.5,.99].map(p=>unitSample('smash','prepare',p,clip as 'move1',art)!.from),...[0,.5,.99].map(p=>unitSample('smash','recover',p,clip as 'move1',art)!.from)]);
   expect(new Set(clips.map(seq)).size).toBe(clips.length);
  }
 });
 it('uses actual hit, down and enemy-down events with the identity-owned final pose',()=>{
  for(const art of bossArts){
   const l=layout[art];
   expect(unitSample('hit','reaction',0,undefined,art)!.from).toBe(l.hit);expect(unitSample('hit','reaction',1,undefined,art)!.to).toBe(l.hit+1);
   expect(unitSample('down','reaction',0,undefined,art)!.from).toBe(l.down);expect(unitSample('down','reaction',1,undefined,art)!.to).toBe(l.down+2);
   expect(unitDownFrame(art)).toBe(l.down+2);expect(l.down+3).toBe(l.frames);
   expect(unitSample('dodge','reaction',.5,undefined,art)).toBeUndefined();expect(unitSample('block','reaction',.5,undefined,art)).toBeUndefined();expect(unitClip(art,'future',undefined)).toBeUndefined();
   const down=unitA9Fixture(art,bossMoves[art][0]!,'enemy-down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get('f1')?.pose==='down')).toBe(true);
   const hurt=unitA9Fixture(art,bossMoves[art][0]!,'hurt');expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get('sefa')?.pose==='hit')).toBe(true);
  }
  // Existing identities keep the shared layout: final down frame 21, soles at 496/512.
  for(const art of ['sefa','lio','foe_riftweaver','foe_tusker','guardian','nobody']){expect(unitDownFrame(art)).toBe(21);expect(unitSoleOrigin(art)).toBe(496/512);}
 });
 it('keeps the seed scale, 7/8 sole origin, lossless budgets and documented frame layout',()=>{
  for(const art of bossArts){
   const name=sheetOf[art],m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(unitKey(art)).toBe(`unit-pilot-${name}`);expect(unitSheets[art]).toBe(name);
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);
   expect(Object.keys(a.frames)).toHaveLength(layout[art].frames);expect(m.frames).toBe(layout[art].frames);expect(m.image).toMatch(/\.[a-f0-9]{12}\.webp$/);
   const cell=a.frames['0'].sourceSize.w;
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{y:number;h:number}}[]){expect(v.sourceSize).toEqual({w:cell,h:cell});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(cell);}
   // The cell stands for 1024 seed units (ratio 2 on a 512 static seed); its soles sit at 7/8 so the Captain axe fits below them.
   expect(unitDisplayRatio(art)).toBe(2);expect(unitSoleOrigin(art)).toBe(.875);
   expect(unitIdleFrame(art,300)).toBeUndefined();expect('idleLoop' in unitRegistry[art]).toBe(false);
  }
 });
 it('never flips a packed Matriarch atlas again: only the static seed is mirrored',()=>{
  expect(mirroredArt.has('foe_matriarch')).toBe(true);
  for(const art of bossArts)expect(unitKey(art)).toBeDefined();
 });
});
