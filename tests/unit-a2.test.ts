import {describe,it,expect} from 'vitest';
import {aegisActions,guardIntents,unitA2Fixture} from './fixtures/unit-a2';
import {heroes} from '../src/content/heroes/team';
import {talentTrees} from '../src/content/heroes/talents';
import {encounters} from '../src/content/encounters/catalog';
import {SPECIES} from '../src/content/enemies/species';
import {unitClip,unitSample,unitDisplayRatio} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
describe('A2 actual content, clips and lifecycle',()=>{
 it('covers every Knight starting/star/tree action, not only Guard/Bash',()=>{
  const h=heroes.find(h=>h.id==='guardian')!;
  expect([...new Set([...h.actions,h.unlocks!.skill,...talentTrees.guardian!.flatMap(n=>'unlock' in n.effect?[n.effect.unlock]:[])])].sort()).toEqual([...aegisActions].sort());
 });
 it('audits every encounter and species intent using the guard identity',()=>{
  const names=new Set<string>();const usedEncounters:string[]=[];
  for(const data of encounters){
   const ids=data.enemies.filter(e=>e.art==='foe_vargoth_guard').map(e=>e.id);
   if(ids.length)usedEncounters.push(data.id);
   for(const intent of data.intents.filter(i=>ids.some(id=>id===i.sourceId))){names.add(intent.name);expect(unitClip('foe_vargoth_guard',undefined,intent.name)).toBe(intent.kind==='energy'?'skill':intent.name==='Shield Smash'?'bash':'attack');}
  }
  for(const m of SPECIES.vargothGuard.moves)names.add(m.name);
  expect([...names].sort()).toEqual([...guardIntents].sort());expect(usedEncounters.sort()).toEqual(['first-clash','vanguard-captain']);
 });
 for(const action of aegisActions)it(`routes ${action} with cue-owned contact and resolver outcome`,()=>{
  const f=unitA2Fixture(action),turn=f.result.turns[0]!,pose=unitPose(turn,f.data)!;
  expect(turn.action).toBe(action);expect(f.result.state.commands).toHaveLength(1);
  const clip=unitClip('guardian',action,undefined)!,contact=action==='attack'?5:action==='bash'?26:13;
  expect(clip).toBe(action==='attack'?'attack':action==='bash'?'bash':'skill');
  for(const p of [0,.1,.5,.99,1])expect(unitSample(pose,'prepare',p,clip,'guardian')!.to).toBeLessThan(contact);
  expect(unitSample(pose,'recover',0,clip,'guardian')!.from).toBe(contact);
 });
 for(const intent of guardIntents)it(`uses real ${intent} without inventing damage type`,()=>{
  const f=unitA2Fixture('attack','normal',intent),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe(intent);expect(turn.intent!.kind).toBe(intent==='Rift Bolt'?'energy':'physical');
  expect(unitClip('foe_vargoth_guard',undefined,intent)).toBe(intent==='Rift Bolt'?'skill':intent==='Shield Smash'?'bash':'attack');
 });
 it('uses actual down/revive, counter, cancellation and Rouse guard events',()=>{
  const revive=unitA2Fixture('revive','revive');expect(revive.state.heroes[0]!.hp).toBe(0);expect(revive.result.state.heroes[0]!.hp).toBeGreaterThan(0);
  const down=unitA2Fixture('attack','enemy-down');expect(down.result.turns.some(t=>unitReactions(t).get('f1')?.pose==='down')).toBe(true);
  const counter=unitA2Fixture('guard','counter','Crushing Blow');const reply=counter.result.turns.find(t=>t.events.some(e=>e.type==='counter'&&e.sourceId==='guardian'))!;expect(reply).toBeDefined();expect(unitReactions(reply,counter.data).get('guardian')!.pose).toBe('counter');
  expect(unitSample('counter','reaction',0,undefined,'guardian')!.from).toBe(30);expect(unitSample('counter','reaction',.5,undefined,'guardian')!.from).toBe(5);
  const dead={...reply,events:[...reply.events,{type:'down' as const,targetId:'guardian',text:''}],after:undefined};expect(unitReactions(dead,counter.data).get('guardian')!.pose).toBe('down');
  const other={...reply,events:reply.events.map(e=>({...e,sourceId:e.sourceId==='guardian'?'garran':e.sourceId,targetId:e.targetId==='guardian'?'garran':e.targetId}))};expect(unitReactions(other,counter.data).get('garran')!.pose).toBe('hit');
  const thorns={...reply,events:reply.events.map(e=>e.type==='counter'&&e.sourceId==='guardian'?{...e,text:'Thorns strike back.'}:e)};expect(unitReactions(thorns,counter.data).get('guardian')!.pose).toBe('hit');
  const reflect=unitA2Fixture('bash','reflect');expect(reflect.result.turns.some(t=>t.events.some(e=>e.type==='cancel'))).toBe(true);
  const rouse=unitA2Fixture('rouse','wounded');expect(rouse.result.turns[0]!.events.some(e=>e.type==='guard')).toBe(true);
 });
 it('adds A2 reaction sprites while preserving explicit dodge/unknown fallback',()=>{
  expect(unitSample('block','reaction',0,undefined,'guardian')!.from).toBe(30);
  expect(unitSample('block','reaction',0,undefined,'foe_vargoth_guard')!.from).toBe(22);
  expect(unitSample('counter','reaction',.5,undefined,'guardian')).toBeDefined();
  for(const art of ['guardian','foe_vargoth_guard']){expect(unitSample('dodge','reaction',.5,undefined,art)).toBeUndefined();expect(unitClip(art,'future',undefined)).toBeUndefined();}
  expect(unitSample('block','reaction',.5,undefined,'weaver')).toBeUndefined();
 });
 it('keeps shared scale/pivot, lossless reconstruction and per-art budgets',()=>{
  for(const name of ['aegis','vargoth'] as const){const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);expect(Object.keys(a.frames)).toHaveLength(32);
   for(const i of [1,8,9,16,...(name==='aegis'?[22,29]:[24,31])])expect(a.frames[i]).toEqual(a.frames[0]);
  }
  expect(unitDisplayRatio('guardian')*.36).toBeCloseTo(1);expect(unitDisplayRatio('foe_vargoth_guard')).toBe(2);
 });
});
describe('Aegis A2-002 redraw packing',()=>{
 it('packs the anatomy-locked cells with idle on the locked frames and the unchanged frame layout',()=>{
  const a=JSON.parse(readFileSync('public/assets/units/'+manifest.aegis.atlas,'utf8'));
  for(const i of [1,8,9,16,22,29])expect(a.frames[i]).toEqual(a.frames[0]);
  // contact frames come from cells 004 / 010 / 016 and differ from idle
  for(const i of [5,13,26])expect(a.frames[i]).not.toEqual(a.frames[0]);
  expect(manifest.aegis.image).toMatch(/^aegis_a2\./);
 });
});
