import {describe,it,expect} from 'vitest';
import {miraActions,tomaActions,foeArts,foeIntents,unitA4Fixture} from './fixtures/unit-a4';
import {heroes} from '../src/content/heroes/team';
import {mercenaries} from '../src/content/heroes/mercenaries';
import {talentTrees} from '../src/content/heroes/talents';
import {encounters} from '../src/content/encounters/catalog';
import {unitClip,unitSample,unitRelease,unitDisplayRatio,unitIdleFrame,unitRegistry} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import {UnitAnimation} from '../src/game/visuals/unit-animation';
import {unitFrameView} from '../src/game/visuals/unit-frame-view';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
const clipOf={mira:{attack:'attack',hinder:'attack',weakshot:'attack',pin:'attack',track:'attack',volley:'skill',disengage:'disengage'},
 toma:{attack:'attack',acid:'attack',bomb:'attack',smoke:'attack',haste:'skill',fury:'skill',catalyst:'skill'}} as const;
const contactOf={attack:5,skill:13,disengage:26} as const;
const sets={mira:miraActions,toma:tomaActions} as const;
const actionsOf=(id:'mira'|'toma')=>{
 const h=[...heroes,...mercenaries].find(h=>h.id===id)!;
 return [...new Set([...h.actions,h.unlocks!.skill,...talentTrees[id]!.flatMap(n=>'unlock' in n.effect?[n.effect.unlock]:[])])].sort();
};
describe('A4 Mira / Toma / Dew Slime / Ember Slime / Ruin Bat actual content, clips and lifecycle',()=>{
 for(const id of ['mira','toma'] as const)it(`covers every ${id} starting/unlock/tree action`,()=>{
  expect(actionsOf(id)).toEqual([...sets[id]].sort());
  for(const a of sets[id])expect(unitClip(id,a,undefined)).toBe((clipOf[id] as Record<string,string>)[a]);
 });
 it('audits every encounter using the three foes and each of their intents',()=>{
  const found:Record<string,Set<string>>={};
  for(const data of encounters)for(const e of data.enemies.filter(e=>(foeArts as readonly string[]).includes(e.art??''))){
   for(const intent of data.intents.filter(i=>i.sourceId===e.id)){(found[e.art!]??=new Set()).add(intent.name);expect(unitClip(e.art!,undefined,intent.name)).toBeDefined();}
  }
  for(const art of foeArts)expect([...found[art]!]).toEqual([foeIntents[art]]);
 });
 for(const id of ['mira','toma'] as const)for(const action of sets[id]){
  it(`routes ${id} ${action} with cue-owned contact and resolver outcome`,()=>{
   const f=unitA4Fixture(id,action),turn=f.result.turns[0]!,pose=unitPose(turn,f.data)!;
   expect(turn.action).toBe(action);expect(f.result.state.commands).toHaveLength(1);
   const clip=unitClip(id,action,undefined)!,contact=contactOf[clip as keyof typeof contactOf]??13;
   // AV04: a releasing clip reaches its release frame (= the contact frame) at RELEASE_AT, when the flight starts; others never show contact early.
   const release=unitRelease(id,clip);
   for(const p of [0,.1,.5,.99,1]){const s=unitSample(pose,'prepare',p,clip,id)!;
    if(release&&p>=release.at)expect(s).toEqual({from:contact,to:contact,mix:0});else if(release)expect(s.from).toBeLessThan(contact);else expect(s.to).toBeLessThan(contact);}
   if(release){expect(release.frame).toBe(contact);expect(unitSample(pose,'prepare',release.at-.02,clip,id)!.to).toBe(contact);}
   expect(unitSample(pose,'recover',0,clip,id)!.from).toBe(contact);
  });
 }
 for(const art of foeArts)it(`uses the real ${foeIntents[art]} cue for ${art} without inventing a projectile`,()=>{
  const f=unitA4Fixture('mira','attack','normal',art),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe(foeIntents[art]);
  const pose=unitPose(turn,f.data)!,clip=unitClip(art,undefined,foeIntents[art])!;
  expect(clip).toBe(art==='foe_ember_slime'?'skill':'attack');
  const contact=clip==='skill'?13:5;
  for(const p of [0,.5,1])expect(unitSample(pose,'prepare',p,clip,art)!.to).toBeLessThan(contact);
  expect(unitSample(pose,'recover',0,clip,art)!.from).toBe(contact);
 });
 it('uses actual hit, down and enemy-down events',()=>{
  for(const id of ['mira','toma'] as const){
   const hurt=unitA4Fixture(id,'attack','hurt');expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get(id)?.pose==='hit')).toBe(true);
   const down=unitA4Fixture(id,'attack','down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get(id)?.pose==='down')).toBe(true);
  }
  for(const art of foeArts){const f=unitA4Fixture('mira','attack','enemy-down',art);expect(f.result.turns.some(t=>unitReactions(t,f.data).get('f1')?.pose==='down')).toBe(true);}
 });
 it('adds A4 reaction sprites while preserving unknown fallback',()=>{
  for(const art of ['mira','toma','foe_dew_slime','foe_ember_slime','foe_ruin_bat']){
   expect(unitSample('hit','reaction',0,undefined,art)!.from).toBe(17);expect(unitSample('down','reaction',1,undefined,art)!.to).toBe(21);
   expect(unitSample('dodge','reaction',.5,undefined,art)).toBeUndefined();expect(unitSample('counter','reaction',.5,undefined,art)).toBeUndefined();expect(unitClip(art,'future',undefined)).toBeUndefined();
  }
  expect(unitSample('block','reaction',0,undefined,'mira')!.from).toBe(30);expect(unitSample('block','reaction',1,undefined,'mira')!.to).toBe(31);
  expect(unitSample('block','reaction',0,undefined,'toma')!.from).toBe(22);expect(unitSample('block','reaction',1,undefined,'toma')!.to).toBe(23);
  for(const art of foeArts)expect(unitSample('block','reaction',.5,undefined,art)).toBeUndefined();
  expect(unitClip('mira',undefined,'Nip')).toBeUndefined();expect(unitClip('foe_ruin_bat','attack',undefined)).toBeUndefined();
 });
 it('keeps shared scale/pivot, lossless budgets and the documented frame layout',()=>{
  const layout={mira:{frames:32,locked:[1,8,9,16,22,29]},toma:{frames:24,locked:[1,8,9,16]},dew:{frames:22,locked:[9,10,11,12,13,14,15,16]},ember:{frames:22,locked:[1,2,3,4,5,6,7,8]},bat:{frames:26,locked:[9,10,11,12,13,14,15,16]}} as const;
  for(const name of Object.keys(layout) as (keyof typeof layout)[]){const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);expect(Object.keys(a.frames)).toHaveLength(layout[name].frames);expect(m.frames).toBe(layout[name].frames);
   for(const i of layout[name].locked)expect(a.frames[i]).toEqual(a.frames[0]);
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){expect(v.sourceSize).toEqual({w:512,h:512});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(500);}
  }
  expect(unitDisplayRatio('mira')*.42).toBeCloseTo(1);expect(unitDisplayRatio('toma')*.42).toBeCloseTo(1);
  for(const art of foeArts)expect(unitDisplayRatio(art)).toBe(2);
 });
 it('loops only the bat hover, from the documented hover frames',()=>{
  expect(Object.entries(unitRegistry).filter(([,d])=>'idleLoop' in d).map(([id])=>id)).toEqual(['foe_ruin_bat']);
  const seen=[0,150,300,450,600,750].map(t=>unitIdleFrame('foe_ruin_bat',t));expect(seen).toEqual([22,23,24,25,22,23]);
  expect(unitIdleFrame('mira',500)).toBeUndefined();expect(unitIdleFrame('foe_ruin_bat',-100)).toBe(22);
 });
 it('plays the hover loop only while alive, outside motions and with motion allowed',()=>{
  const log:string[]=[];let alive=true;
  const image=(name:string)=>({setFrame:(f:number)=>log.push(name+f),setAlpha:()=>{},setVisible:()=>{}});
  const body={x:0,y:0,rotation:0,scaleX:1,scaleY:1,setPosition(){},setRotation(){},setScale(){}};
  const anim=new UnitAnimation();anim.bind('b1',body,96,()=>{},unitFrameView('foe_ruin_bat',image('p'),image('n'),()=>alive,()=>{}));
  anim.update(10);expect(log).toEqual(['p22']);anim.update(10);expect(log).toEqual(['p22']);anim.update(150);expect(log.at(-1)).toBe('p23');
  anim.setLoops(false);expect(log.at(-1)).toBe('p0');const length=log.length;anim.update(400);expect(log).toHaveLength(length);
  anim.setLoops(true);anim.update(1);expect(log.at(-1)!.startsWith('p2')).toBe(true);
  alive=false;const before=log.length;anim.update(400);expect(log).toHaveLength(before);
 });
});
