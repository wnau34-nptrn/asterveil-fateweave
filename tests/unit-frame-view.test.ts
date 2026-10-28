import { describe, it, expect } from 'vitest';
import { unitSample } from '../src/game/visuals/unit-frames';
import { unitFrameView, type FrameImage } from '../src/game/visuals/unit-frame-view';
import { UnitAnimation, type UnitBody } from '../src/game/visuals/unit-animation';
class Image implements FrameImage {
 frame=0;alpha=1;visible=true;
 setFrame(frame:number){this.frame=frame;}
 setAlpha(alpha:number){this.alpha=alpha;}
 setVisible(visible:boolean){this.visible=visible;}
}
class Body implements UnitBody {
 x=0;y=0;rotation=0;scaleX=1;scaleY=1;
 setPosition(x:number,y:number){this.x=x;this.y=y;}
 setRotation(r:number){this.rotation=r;}
 setScale(x:number,y:number){this.scaleX=x;this.scaleY=y;}
}
describe('continuous actor transitions',()=>{
 it('keeps Lyra follow-through after contact and every windup sample before contact',()=>{
  for(const art of ['tracer','foe_hunter'])for(const clip of ['attack','skill'] as const){
   const offset=clip==='attack'?0:8;
   for(let i=0;i<=100;i++){
    const s=unitSample('slash','prepare',i/100,clip,art,210)!;
    expect(s.from).toBeLessThan(5+offset);expect(s.to).toBeLessThan(5+offset);
    if(art==='tracer'&&clip==='attack'){expect(s.from).not.toBe(4);expect(s.to).not.toBe(4);}
   }
   const contact=unitSample('slash','recover',0,clip,art,260)!;
   expect(contact).toEqual({from:5+offset,to:clip==='attack'&&art==='tracer'?4:6+offset,mix:0});
  }
  const sequence=[5,4,6,7,8];let previous=-1;
  for(let i=0;i<=100;i++){
   const s=unitSample('slash','recover',i/100,'attack','tracer',260)!;
   const index=sequence.indexOf(s.from);expect(index).toBeGreaterThanOrEqual(previous);previous=index;
  }
 });
 it('blends only adjacent frames briefly and clears both layers on skip, death and revive',()=>{
  const a=new Image(),b=new Image();let alive=true,aligned=0;
  const view=unitFrameView('tracer',a,b,()=>alive,()=>aligned++);
  let transition=0;
  for(let i=0;i<=100;i++){
   view.show('slash','prepare',i/100,'attack',210);
   expect(a.alpha+b.alpha).toBeCloseTo(1);
   if(b.visible){transition++;expect(a.frame).not.toBe(b.frame);expect(a.alpha).toBeGreaterThan(0);expect(b.alpha).toBeLessThan(1);}
  }
  expect(transition).toBeGreaterThan(0);expect(transition).toBeLessThan(35);expect(aligned).toBe(101);
  view.show('slash','recover',0,'attack',260);expect(a.frame).toBe(5);expect(a.alpha).toBe(1);expect(b.visible).toBe(false);
  alive=false;view.reset();expect(a.frame).toBe(21);expect(a.alpha).toBe(1);expect(b.alpha).toBe(0);expect(b.visible).toBe(false);
  alive=true;view.reset();expect(a.frame).toBe(0);expect(b.visible).toBe(false);
 });
 it('starts and stops movement gently and preserves position when a lunge is interrupted',()=>{
  const body=new Body(),animation=new UnitAnimation();animation.bind('hero',body,96,()=>{});
  animation.begin('hero','thrust',1,200);animation.update(1);expect(body.x).toBeLessThan(.01);
  animation.update(199);expect(body.x).toBe(18);
  animation.react('hero','hit',1,200);expect(body.x).toBe(18);
  animation.update(1);expect(body.x).toBeGreaterThan(17); // no snap back to the slot at the event boundary
  animation.settle();expect(body.x).toBe(0);
  animation.begin('hero','thrust',1,200,'skill');animation.update(200);animation.contact('hero',500);
  animation.update(259);expect(body.x).toBeGreaterThan(0);expect(body.x).toBeLessThan(.001);
  animation.update(1);expect(body.x).toBe(0);
 });
});
