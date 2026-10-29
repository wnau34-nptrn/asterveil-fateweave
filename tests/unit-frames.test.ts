import { describe, it, expect } from 'vitest';
import { unitClip, unitFrame, unitKey } from '../src/game/visuals/unit-frames';
import { UnitAnimation, type UnitBody } from '../src/game/visuals/unit-animation';
import { existsSync, readFileSync } from 'node:fs';

class Body implements UnitBody {
  x=0; y=0; rotation=0; scaleX=1; scaleY=1;
  setPosition(x:number,y:number) { this.x=x;this.y=y; }
  setRotation(r:number) {this.rotation=r;}
  setScale(x:number,y:number) {this.scaleX=x;this.scaleY=y;}
}
describe('pilot sprite playback',()=>{
 it('only routes the pilot actions, retaining procedural fallback for all others',()=>{
  expect(unitKey('tracer')).toBe('unit-pilot-lyra');expect(unitKey('foe_hunter')).toBe('unit-pilot-hunter');expect(unitKey('raider')).toBeUndefined();
  expect(unitClip('tracer','attack',undefined)).toBe('attack');expect(unitClip('tracer','execute',undefined)).toBe('skill');expect(unitClip('tracer','sweep',undefined)).toBe('attack');expect(unitClip('tracer','lunge',undefined)).toBe('skill');expect(unitClip('tracer','mark',undefined)).toBeUndefined();expect(unitClip('tracer','parry',undefined)).toBeUndefined();
  expect(unitClip('foe_hunter',undefined,'Shadow Knife')).toBe('skill');expect(unitClip('foe_hunter',undefined,'Raking Slash')).toBe('attack');
 });
 it('never reveals contact before the UI cue, at either speed',()=>{
  for(const clip of ['attack','skill'] as const){
   const start=clip==='attack'?1:9;
   for(const p of [0,.2,.5,.999,1])expect(unitFrame('thrust','prepare',p,clip)).toBeLessThan(start+4);
   expect(unitFrame('thrust','recover',0,clip)).toBe(start+4);expect(unitFrame('thrust','recover',1,clip)).toBe(start+7);
  }
  expect(unitFrame('down','reaction',1)).toBe(21);expect(unitFrame('hit','reaction',1)).toBe(18);expect(unitFrame('block','reaction',.5)).toBeUndefined();
 });
 it('switches to contact synchronously and resets on skip/death/revive without disturbing another actor',()=>{
  const animation=new UnitAnimation(), body=new Body(),other=new Body();let frame=0,alive=true;
  animation.bind('hero',body,96,()=>{}, {show:(pose,phase,p,clip)=>{const f=unitFrame(pose,phase,p,clip);if(f===undefined)return false;frame=f;return true;},reset:()=>{frame=alive?0:21;}});
  animation.bind('other',other,96,()=>{});
  animation.begin('hero','thrust',1,298,'skill');animation.update(297);expect(frame).toBe(12);
  animation.contact('hero',552);expect(frame).toBe(13);animation.update(80);expect(body.rotation).toBe(0);
  animation.update(160);expect(body.x).toBeGreaterThan(0); // subtle 260ms sprite recovery, not the old 240ms
  animation.update(20);expect(body.x).toBe(0);expect(frame).toBe(0);
  animation.begin('other','slash',1,100);animation.update(50);expect(other.x).toBeGreaterThan(0);
  alive=false;animation.reset('hero');expect(frame).toBe(21);expect(other.x).toBeGreaterThan(0);
  animation.react('hero','down',1,400);animation.update(100);expect(frame).toBe(19);
  alive=true;animation.reset('hero');expect(frame).toBe(0);animation.update(1000);expect(frame).toBe(0);
  animation.begin('hero','thrust',1,100,'skill');animation.settle();animation.update(1000);expect(frame).toBe(0);expect(body.x).toBe(0);
 });
 it('ships complete WebP atlases with a consistent cell/pivot and a bounded decoded size',()=>{
  const report=JSON.parse(readFileSync('incoming/ART-UNIT-ANIMATION-PILOT-001/validation.json','utf8'));
  for(const name of ['lyra','hunter']){
   expect(existsSync(`public/assets/units/${name}_pilot.webp`)).toBe(true);
   expect(report[name].frames).toBe(22);expect(report[name].cell).toBe(512);expect(report[name].atlas).toEqual([2048,3072]);expect(report[name].origin).toEqual([.5,496/512]);
   expect(report[name].atlas[0]*report[name].atlas[1]*4).toBeLessThan(26_000_000);
  }
 });
});
