import {describe,it,expect} from 'vitest';
import {serenActions,myconIntents,unitA3Fixture} from './fixtures/unit-a3';
import {heroes} from '../src/content/heroes/team';
import {talentTrees} from '../src/content/heroes/talents';
import {encounters} from '../src/content/encounters/catalog';
import {unitClip,unitSample,unitDisplayRatio} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
const clipOf={attack:'attack',heal:'skill',revive:'skill',bless:'skill',prayer:'prayer',halo:'prayer',sanctuary:'sanctuary'} as const;
const contactOf={attack:5,skill:13,prayer:26,sanctuary:34} as const;
describe('A3 Seren / Hollow Mycon actual content, clips and lifecycle',()=>{
 it('covers every Priest starting/star/tree action',()=>{
  const h=heroes.find(h=>h.id==='healer')!;
  expect([...new Set([...h.actions,h.unlocks!.skill,...talentTrees.healer!.flatMap(n=>'unlock' in n.effect?[n.effect.unlock]:[])])].sort()).toEqual([...serenActions].sort());
 });
 it('audits every encounter using Hollow Mycon and its intents',()=>{
  const names=new Set<string>(),used:string[]=[];
  for(const data of encounters){
   const ids=data.enemies.filter(e=>e.art==='foe_mycon').map(e=>e.id);if(ids.length)used.push(data.id);
   for(const intent of data.intents.filter(i=>ids.some(id=>id===i.sourceId))){names.add(intent.name);expect(intent.kind).toBe('energy');expect(unitClip('foe_mycon',undefined,intent.name)).toBe('skill');}
  }
  expect([...names].sort()).toEqual([...myconIntents].sort());expect(used).toEqual(['thicket-ambush']);
 });
 for(const action of serenActions){
  const scenario=action==='revive'?'revive':'normal';
  it(`routes ${action} with cue-owned contact and resolver outcome`,()=>{
   const f=unitA3Fixture(action,scenario),turn=f.result.turns[0]!,pose=unitPose(turn,f.data)!;
   expect(turn.action).toBe(action);expect(f.result.state.commands).toHaveLength(scenario==='revive'?3:1);
   const clip=unitClip('healer',action,undefined)!;expect(clip).toBe(clipOf[action]);
   const contact=contactOf[clip as keyof typeof contactOf];
   for(const p of [0,.1,.5,.99,1])expect(unitSample(pose,'prepare',p,clip,'healer')!.to).toBeLessThan(contact);
   expect(unitSample(pose,'recover',0,clip,'healer')!.from).toBe(contact);
  });
 }
 it('uses the real Spore Hex cue without inventing a projectile',()=>{
  const f=unitA3Fixture('attack'),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe('Spore Hex');expect(turn.intent!.kind).toBe('energy');
  const pose=unitPose(turn,f.data)!,clip=unitClip('foe_mycon',undefined,'Spore Hex')!;expect(clip).toBe('skill');
  for(const p of [0,.5,1])expect(unitSample(pose,'prepare',p,clip,'foe_mycon')!.to).toBeLessThan(13);
  expect(unitSample(pose,'recover',0,clip,'foe_mycon')!.from).toBe(13);
 });
 it('uses actual hit, down and revive events for both identities',()=>{
  const hurt=unitA3Fixture('attack','hurt');expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get('healer')?.pose==='hit')).toBe(true);
  const down=unitA3Fixture('attack','down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get('healer')?.pose==='down')).toBe(true);
  const mushroom=unitA3Fixture('attack','enemy-down');expect(mushroom.result.turns.some(t=>unitReactions(t,mushroom.data).get('b1')?.pose==='down')).toBe(true);
  const revive=unitA3Fixture('revive','revive');expect(revive.state.heroes.find(h=>h.id==='guardian')!.hp).toBe(0);expect(revive.result.state.heroes.find(h=>h.id==='guardian')!.hp).toBeGreaterThan(0);
 });
 it('adds A3 reaction sprites while preserving unknown fallback',()=>{
  expect(unitSample('hit','reaction',0,undefined,'healer')!.from).toBe(17);expect(unitSample('down','reaction',1,undefined,'healer')!.to).toBe(21);
  expect(unitSample('block','reaction',0,undefined,'healer')!.from).toBe(38);expect(unitSample('block','reaction',1,undefined,'healer')!.to).toBe(39);
  expect(unitSample('hit','reaction',0,undefined,'foe_mycon')!.from).toBe(17);expect(unitSample('down','reaction',1,undefined,'foe_mycon')!.to).toBe(21);
  for(const art of ['healer','foe_mycon']){expect(unitSample('dodge','reaction',.5,undefined,art)).toBeUndefined();expect(unitClip(art,'future',undefined)).toBeUndefined();expect(unitSample('counter','reaction',.5,undefined,art)).toBeUndefined();}
  expect(unitSample('block','reaction',.5,undefined,'foe_mycon')).toBeUndefined();
  expect(unitClip('healer',undefined,'Spore Hex')).toBeUndefined();expect(unitClip('foe_mycon','attack',undefined)).toBeUndefined();
 });
 it('keeps shared scale/pivot, lossless budgets and the documented frame layout',()=>{
  const layout={seren:{frames:40,locked:[1,8,9,16,22,29,30,37]},mycon:{frames:22,locked:[1,2,3,4,5,6,7,8,9,16]}} as const;
  for(const name of ['seren','mycon'] as const){const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);expect(Object.keys(a.frames)).toHaveLength(layout[name].frames);expect(m.frames).toBe(layout[name].frames);
   for(const i of layout[name].locked)expect(a.frames[i]).toEqual(a.frames[0]);
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){expect(v.sourceSize).toEqual({w:512,h:512});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(500);}
  }
  expect(unitDisplayRatio('healer')*.36).toBeCloseTo(1);expect(unitDisplayRatio('foe_mycon')).toBe(2);
 });
});
