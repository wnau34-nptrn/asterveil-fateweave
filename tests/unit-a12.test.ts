import {describe,it,expect} from 'vitest';
import {vi} from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import {unitA12Fixture,unitA12Heroes,a12Actions,type A12Hero} from './fixtures/unit-a12';
import {unitClip,unitSample,unitRelease,unitDisplayRatio,unitDownFrame,unitIdleFrame,unitRegistry,unitSheets,unitKey} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import {heroActions,STILL_ONLY} from '../src/game/visuals/presentation-coverage';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
// A12 (Claude intake 2026-11-05): every real ActionId of the three P03 classes maps to a painted clip; contact = first recover frame.
const clipOf:Record<A12Hero,Record<string,string>>={
 kael:{attack:'attack',gatherfist:'gather',flowfist:'gather',releasefist:'release',perfectfist:'release',circlefist:'circle',storedfist:'stored'},
 wynne:{attack:'attack',threadhex:'knot',knothex:'knot',longthread:'knot',lifetoll:'toll',wovenhex:'weave',tollring:'weave'},
 astrid:{attack:'attack',starneedle:'attack',deflectfate:'deflect',crossing:'deflect',turncycle:'dial',doubledial:'dial',readorbit:'read'},
};
const layout:Record<A12Hero,{frames:number;down:number;clips:string[]}>={kael:{frames:41,down:40,clips:['attack','gather','release','circle','stored']},wynne:{frames:35,down:34,clips:['attack','knot','toll','weave']},astrid:{frames:35,down:34,clips:['attack','deflect','dial','read']}};
describe('A12 Kael, Wynne and Astrid bodies',()=>{
 it('no P03 identity is still-only any more',()=>{expect(Object.keys(STILL_ONLY)).toEqual([]);});
 for(const id of unitA12Heroes){
  it(`maps every real ${id} action to a painted clip`,()=>{
   expect(Object.keys(clipOf[id]).sort()).toEqual([...heroActions(id)].filter(a=>a in clipOf[id]).sort());
   for(const [a,c] of Object.entries(clipOf[id]))expect(unitClip(id,a,undefined),`${id} ${a}`).toBe(c);
   expect(unitClip(id,'future',undefined)).toBeUndefined();
   expect(Object.keys(unitRegistry[id].clips).sort()).toEqual([...layout[id].clips].sort());
  });
  it(`${id}: six slots per clip, contact after the windup, own prone frame`,()=>{
   for(const [clip,range] of Object.entries(unitRegistry[id].clips as Record<string,{prepare:readonly number[];recover:readonly number[]}>)){
    expect(range.prepare.length+range.recover.length).toBe(6);expect(unitRelease(id,clip as never)).toBeUndefined();
    const start=range.prepare[0]!,contact=range.recover[0]!;
    const pose=unitPose(unitA12Fixture(id,'attack').result.turns[0]!,unitA12Fixture(id,'attack').data)!;
    for(const p of [0,.5,1])expect(unitSample(pose,'prepare',p,clip as never,id)!.to).toBeLessThan(contact);
    expect(unitSample(pose,'recover',0,clip as never,id)!.from).toBe(contact);expect(unitSample(pose,'recover',1,clip as never,id)!.to).toBe(start+5);
   }
   for(const pose of ['hit','block','down'] as const)expect(unitSample(pose,'reaction',.5,undefined,id)).toBeDefined();
   expect(unitDownFrame(id)).toBe(layout[id].down);expect(unitSample('down','reaction',1,undefined,id)!.to).toBe(layout[id].down);
   expect(unitKey(id)).toBe(`unit-pilot-${id}`);expect(unitSheets[id]).toBe(id);expect('idleLoop' in unitRegistry[id]).toBe(false);expect(unitIdleFrame(id,300)).toBeUndefined();
  });
  it(`${id}: reactions come from resolver events`,()=>{
   const hurt=unitA12Fixture(id,'attack','hurt'),down=unitA12Fixture(id,'attack','down');
   expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get(id)?.pose==='hit')).toBe(true);
   expect(down.result.turns.some(t=>unitReactions(t,down.data).get(id)?.pose==='down')).toBe(true);
   for(const a of a12Actions(id))expect(unitA12Fixture(id,a).result.turns[0]!.action).toBe(a);
  });
  it(`${id}: lossless atlas within budget, idle slots locked, every drawn frame exists`,()=>{
   const m=manifest[id],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);
   expect(m.frames).toBe(layout[id].frames);expect(Object.keys(a.frames)).toHaveLength(layout[id].frames);expect(m.image).toMatch(new RegExp(`^${id}_a12\\.[a-f0-9]{12}\\.webp$`));
   for(const range of Object.values(unitRegistry[id].clips as Record<string,{prepare:readonly number[]}>))expect(a.frames[String(range.prepare[0])]).toEqual(a.frames[0]);
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{y:number;h:number}}[]){expect(v.sourceSize).toEqual({w:512,h:512});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(500);}
   const used=new Set<number>();for(const c of Object.values(unitRegistry[id].clips as Record<string,{prepare:readonly number[];recover:readonly number[]}>))for(const f of [...c.prepare,...c.recover])used.add(f);
   for(const r of Object.values((unitRegistry[id] as {reactions?:Record<string,readonly number[]>}).reactions??{}))for(const f of r)used.add(f);
   for(const f of used)expect(a.frames[String(f)],`${id} frame ${f}`).toBeDefined();
   expect(unitDisplayRatio(id)*.42).toBeCloseTo(1);
  });
 }
});
