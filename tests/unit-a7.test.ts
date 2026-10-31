import {describe,it,expect} from 'vitest';
import {unitA7Fixture,unitA7Heroes,stillOnlyHeroes,a7Actions,saintActions,dancerActions,type A7Hero} from './fixtures/unit-a7';
import {mercenaries} from '../src/content/heroes/mercenaries';
import {talentTrees} from '../src/content/heroes/talents';
import {unitClip,unitSample,unitRelease,unitDisplayRatio,unitDownFrame,unitIdleFrame,unitDefinition,unitRegistry,unitSheets,unitKey} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import {unitFrameView} from '../src/game/visuals/unit-frame-view';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
// Expected clip per real ActionId. Missing = anatomy-gated, procedural body (Wila echo foot). Lalin is complete since A7-002.
const saintClips={attack:'attack',saintstrike:'attack',vowstrike:'attack',saintarc:'arc',communion:'communion',sharewound:'communion',lastlight:'lastlight'} as const;
const clipOf:Record<A7Hero,Record<string,string|undefined>>={metta:saintClips,
 lalin:{cadence:'partner',duet:'partner',deepbeat:'partner',closingstep:'closing',attack:'attack',rounddance:'circle',echofoot:'echo'}};
// Contact = first recover frame of each clip (six slots: slot 0 is the seed idle).
const contactOf:Record<A7Hero,Record<string,number>>={metta:{attack:3,arc:9,communion:15,lastlight:22},
 lalin:{partner:4,closing:10,attack:15,circle:21,echo:28}};
const actionsOf=(id:A7Hero|typeof stillOnlyHeroes[number])=>{
 const h=mercenaries.find(h=>h.id===id)!;
 return [...new Set([...h.actions,...(h.unlocks?[h.unlocks.skill]:[]),...talentTrees[id]!.flatMap(n=>'unlock' in n.effect?[n.effect.unlock]:[])])].sort();
};
const layout:Record<A7Hero,{frames:number;idle:number[]}>={metta:{frames:35,idle:[1,7,13,19]},lalin:{frames:41,idle:[1,7,13,19,25]}};
describe('A7 Saint and Dancer bodies: real content, clips, reactions and layout',()=>{
 for(const id of unitA7Heroes)it(`covers every ${id} starting/unlock/tree action`,()=>{
  expect(actionsOf(id)).toEqual([...a7Actions(id)].sort());
  expect(Object.keys(clipOf[id]).sort()).toEqual([...a7Actions(id)].sort());
  for(const a of a7Actions(id))expect(unitClip(id,a,undefined),`${id} ${a}`).toBe(clipOf[id][a]);
  expect(unitClip(id,'future',undefined)).toBeUndefined();
 });
 it('shares the Saint and Dancer action sets',()=>{expect(actionsOf('metta')).toEqual(actionsOf('thiran'));expect(actionsOf('lalin')).toEqual(actionsOf('wila'));expect(saintActions.length+dancerActions.length).toBe(14);});
 for(const id of unitA7Heroes)for(const action of a7Actions(id)){
  it(`routes ${id} ${action} with cue-owned contact and resolver outcome`,()=>{
   const f=unitA7Fixture(id,action),turn=f.result.turns[0]!,pose=unitPose(turn,f.data)!;
   expect(turn.action).toBe(action);expect(f.result.state.commands).toHaveLength(f.prelude.length+1);expect(pose).toBeTruthy();
   const clip=unitClip(id,action,undefined);
   if(!clip){for(const p of [0,.5,1])expect(unitSample(pose,'prepare',p,clip,id)).toBeUndefined();return;}
   const contact=contactOf[id][clip]!;
   expect(unitRelease(id,clip)).toBeUndefined();
   // The windup never shows the contact pose early; recover opens on it.
   for(const p of [0,.1,.5,.99,1])expect(unitSample(pose,'prepare',p,clip,id)!.to).toBeLessThan(contact);
   expect(unitSample(pose,'prepare',0,clip,id)!.from).toBe(layoutStart(id,clip));
   expect(unitSample(pose,'recover',0,clip,id)!.from).toBe(contact);
   expect(unitSample(pose,'recover',1,clip,id)!.to).toBe(layoutStart(id,clip)+5);
  });
 }
 it('draws no heal or damage in the body: outcomes come from the resolver events',()=>{
  const share=unitA7Fixture('metta','sharewound').result.turns[0]!,comm=unitA7Fixture('thiran','communion').result.turns[0]!;
  expect(share.events.some(e=>e.type==='heal')).toBe(true);expect(comm.events.some(e=>e.type==='heal')).toBe(true);
  for(const art of unitA7Heroes)for(const c of Object.values(unitRegistry[art].clips))expect(c.prepare.length+c.recover.length).toBe(6);
 });
 it('keeps anatomy-gated strips procedural instead of falling back to the shared layout',()=>{
  // Lalin has every clip and her own hit/block/down (A7-002); she still has no dodge/counter frames.
  // Odran/Isolde have no registry entry at all: seed + procedural motion until A7-003.
  for(const pose of ['hit','block','down'] as const)expect(unitSample(pose,'reaction',.5,undefined,'lalin')).toBeDefined();
  for(const id of stillOnlyHeroes){expect(unitDefinition(id)).toBeUndefined();expect(unitKey(id)).toBeUndefined();expect(unitClip(id,'attack',undefined)).toBeUndefined();expect(unitDownFrame(id)).toBe(21);}
  expect(Object.keys(unitSheets)).not.toContain('thiran');expect(Object.keys(unitSheets)).not.toContain('wila');expect(Object.keys(manifest)).not.toEqual(expect.arrayContaining(['thiran']));expect(Object.keys(manifest)).not.toContain('wila');
  for(const art of unitA7Heroes)for(const pose of ['dodge','counter'] as const)expect(unitSample(pose,'reaction',.5,undefined,art)).toBeUndefined();
  expect(unitDownFrame('lalin')).toBe(40);
 });
 it('uses actual hit, block frames, and the held prone pose for the Saints',()=>{
  for(const id of ['metta'] as const){
   expect(unitSample('hit','reaction',0,undefined,id)!.from).toBe(25);expect(unitSample('hit','reaction',1,undefined,id)!.to).toBe(27);
   expect(unitSample('block','reaction',0,undefined,id)!.from).toBe(28);expect(unitSample('block','reaction',1,undefined,id)!.to).toBe(30);
   expect(unitSample('down','reaction',0,undefined,id)!.from).toBe(31);expect(unitSample('down','reaction',1,undefined,id)!.to).toBe(34);
   expect(unitDownFrame(id)).toBe(34);
  }
 });
 it('resets a downed actor to its own prone frame and a living one to the seed; shipped identities keep frame 21',()=>{
  for(const [art,down] of [['metta',34],['lalin',40],['sefa',21],['guardian',21],['tracer',21]] as const){
   expect(unitDownFrame(art)).toBe(down);
   let alive=false;const a={frame:-1,alpha:0,setFrame(f:number){this.frame=f;},setAlpha(v:number){this.alpha=v;},setVisible(){}},b={setFrame(){},setAlpha(){},setVisible(){}};
   unitFrameView(art,a,b,()=>alive,()=>undefined).reset();expect(a.frame).toBe(down);alive=true;unitFrameView(art,a,b,()=>alive,()=>undefined).reset();expect(a.frame).toBe(0);
  }
 });
 it('uses actual hit and down events',()=>{
  for(const id of unitA7Heroes){
   const hurt=unitA7Fixture(id,'attack','hurt');expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get(id)?.pose==='hit')).toBe(true);
   const down=unitA7Fixture(id,'attack','down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get(id)?.pose==='down')).toBe(true);
  }
 });
 it('keeps shared scale/pivot, lossless budgets, locked idle slots and the documented frame layout',()=>{
  for(const name of unitA7Heroes){const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);// Lalin (A7-002, lossless fan/ribbon frames, 41 slots) is over the general guideline and reported to the owner: cap 6.5 MB decoded / 2.2 MB download.
   const over=name==='lalin';expect(m.decodedBytes).toBeLessThanOrEqual(over?6_600_000:6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(over?2_200_000:1_500_000);
   expect(Object.keys(a.frames)).toHaveLength(layout[name].frames);expect(m.frames).toBe(layout[name].frames);expect(m.image).toMatch(/_a7\.[a-f0-9]{12}\.webp$/);
   for(const i of layout[name].idle)expect(a.frames[i]).toEqual(a.frames[0]);
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){expect(v.sourceSize).toEqual({w:512,h:512});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(500);}
   // Every frame the registry can draw exists in the atlas.
   const used=new Set<number>();for(const c of Object.values(unitRegistry[name].clips))for(const f of [...c.prepare,...c.recover])used.add(f);
   for(const r of Object.values((unitRegistry[name] as {reactions?:Record<string,readonly number[]>}).reactions??{}))for(const f of r)used.add(f);
   for(const f of used)expect(a.frames[String(f)],`${name} frame ${f}`).toBeDefined();
   expect(unitDisplayRatio(name)*.42).toBeCloseTo(1);
  }
 });
 it('has no hover loop and loads through the optional per-identity sheet',()=>{
  for(const art of unitA7Heroes){expect('idleLoop' in unitRegistry[art]).toBe(false);expect(unitIdleFrame(art,300)).toBeUndefined();expect(unitSheets[art]).toBe(art);expect(unitKey(art)).toBe(`unit-pilot-${art}`);}
 });
});
function layoutStart(id:A7Hero,clip:string):number{
 const range=(unitRegistry[id].clips as Record<string,{prepare:readonly number[];recover:readonly number[]}>)[clip]!;return range.prepare[0]!;
}
