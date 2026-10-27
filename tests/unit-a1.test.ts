import {describe,it,expect} from 'vitest';
import {unitA1Fixture,eiraActions} from './fixtures/unit-a1';
import {unitClip,unitSample,unitKey,unitDisplayRatio} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import manifest from '../src/game/visuals/unit-atlases.json';
import {heroes} from '../src/content/heroes/team';
import {talentTrees} from '../src/content/heroes/talents';
import {readFileSync} from 'node:fs';
describe('A1 real action coverage and lifecycle',()=>{
 it('accounts for every current starting/star/tree Eira action',()=>{
  const hero=heroes.find(h=>h.id==='weaver')!;
  const current=new Set([...hero.actions,hero.unlocks!.skill,...talentTrees.weaver!.flatMap(n=>'unlock' in n.effect?[n.effect.unlock]:[])]);
  expect([...current].sort()).toEqual([...eiraActions].sort());
 });
 for(const action of eiraActions)it(`maps every usable Eira action ${action} without changing its outcomes`,()=>{
  const f=unitA1Fixture(action),turn=f.result.turns[0]!;
  expect(f.result.state.commands).toHaveLength(1);expect(turn.action).toBe(action);
  const clip=unitClip('weaver',turn.action,undefined)!;
  expect(clip).toBe(['ward','sigil','aegis'].includes(action)?'skill':'attack');
  const pose=unitPose(turn,f.data)!;
  for(const p of [0,.1,.5,.9,1])expect(unitSample(pose,'prepare',p,clip,'weaver')!.to).toBeLessThan(clip==='attack'?5:13);
  expect(unitSample(pose,'recover',0,clip,'weaver')!.from).toBe(clip==='attack'?5:13);
  for(const t of f.result.turns.filter(t=>t.side==='enemy'))expect(unitClip('foe_sprite',undefined,t.intent?.name)).toBe('attack');
 });
 it('uses resolver-owned down/revive and keeps unknown actions on procedural fallback',()=>{
  const f=unitA1Fixture('revive','revive');
  expect(f.state.heroes.find(h=>h.id==='weaver')!.hp).toBe(0);
  expect(f.result.state.heroes.find(h=>h.id==='weaver')!.hp).toBeGreaterThan(0);
  const down=unitA1Fixture('attack','enemy-down').result.turns.find(t=>t.events.some(e=>e.type==='down'))!;
  expect(unitReactions(down).get('b1')!.pose).toBe('down');
  expect(unitClip('weaver','unknown',undefined)).toBeUndefined();expect(unitKey('foe_sprite')).toBe('unit-pilot-sprite');
  expect(unitDisplayRatio('weaver')*.42).toBe(1);expect(unitDisplayRatio('tracer')).toBe(2);
 });
 it('keeps complete trimmed frames under both A1 budgets and aliases exact seed endpoints',()=>{
  for(const name of ['eira','sprite'] as const){
   const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);
   expect(Object.keys(a.frames)).toHaveLength(22);
   for(const i of [1,8,9,16])expect(a.frames[i]).toEqual(a.frames[0]);
  }
 });
});
