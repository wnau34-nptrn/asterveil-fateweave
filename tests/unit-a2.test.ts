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
   for(const intent of data.intents.filter(i=>ids.some(id=>id===i.sourceId))){names.add(intent.name);expect(unitClip('foe_vargoth_guard',undefined,intent.name)).toBe(intent.kind==='energy'?'skill':'attack');}
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
  expect(unitClip('foe_vargoth_guard',undefined,intent)).toBe(intent==='Rift Bolt'?'skill':'attack');
 });
 it('uses actual down/revive, counter, cancellation and Rouse guard events',()=>{
  const revive=unitA2Fixture('revive','revive');expect(revive.state.heroes[0]!.hp).toBe(0);expect(revive.result.state.heroes[0]!.hp).toBeGreaterThan(0);
  const down=unitA2Fixture('attack','enemy-down');expect(down.result.turns.some(t=>unitReactions(t).get('f1')?.pose==='down')).toBe(true);
  const counter=unitA2Fixture('guard','counter','Crushing Blow');expect(counter.result.turns.some(t=>t.events.some(e=>e.type==='counter'&&e.sourceId==='guardian'))).toBe(true);
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
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);expect(Object.keys(a.frames)).toHaveLength(name==='aegis'?32:24);
   for(const i of [1,8,9,16,...(name==='aegis'?[22,29]:[])])expect(a.frames[i]).toEqual(a.frames[0]);
  }
  expect(unitDisplayRatio('guardian')*.36).toBeCloseTo(1);expect(unitDisplayRatio('foe_vargoth_guard')).toBe(2);
 });
});
