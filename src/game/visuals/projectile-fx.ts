import type { BattleEvent, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';
import art from './projectile-art.json';

export const PROJECTILE_ATLAS = 'projectile-fx';
export const projectileAtlasUrls = (): [string,string] => [`${import.meta.env.BASE_URL}assets/fx/projectile_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/projectile_fx.json`];
export const projectileSkills = ['hinder','volley','weakshot','pin','track','disengage','knives'] as const;
export type ProjectileSkill = typeof projectileSkills[number];
export const isProjectileSkill = (action: string | undefined): action is ProjectileSkill => projectileSkills.some(s=>s===action);
export interface ProjectileCue { skill: ProjectileSkill; kind:'cast'|'followup'; sourceId:string; targetId:string; event:BattleEvent; outcome:'hit'|'blocked'|'dodged' }
export interface ProjectilePoint { x:number; y:number; releaseX:number; releaseY:number; size:number }
export type ProjectileLookup = (id:string)=>ProjectilePoint|undefined;

// Each cue owns an existing event, never a selected target or a guessed row/talent count.
// Tracking's actual round-end shot is a counter on the ending actor's stage, not a second cast.
export function projectileCues(turn:TurnStage):ProjectileCue[] {
  const canceled=turn.events.some(e=>e.type==='cancel');
  return turn.events.flatMap(event=>{
    const {sourceId,targetId}=event;if(!sourceId||!targetId)return [];
    const followup=event.type==='counter'&&event.text==='Tracking shot.'
      &&turn.state.heroes.some(h=>h.id===sourceId)&&turn.state.enemies.some(e=>e.id===targetId);
    const cast=!canceled&&turn.side==='hero'&&isProjectileSkill(turn.action)&&sourceId===turn.actorId
      &&(event.type==='damage'||event.type==='dodge');
    if(!cast&&!followup)return [];
    return [{skill:followup?'track':turn.action as ProjectileSkill,kind:followup?'followup':'cast',sourceId,targetId,event,
      outcome:event.type==='dodge'?'dodged':(event.amount??0)>0?'hit':'blocked'}];
  });
}
const lifts:Record<ProjectileSkill,number>={hinder:52,volley:92,weakshot:28,pin:70,track:58,disengage:42,knives:106};
const widths:Record<ProjectileSkill,number>={hinder:72,volley:72,weakshot:76,pin:74,track:74,disengage:72,knives:58};
function paint(ctx:FxContext,skill:ProjectileSkill,phase:'prepare'|'flight'|'tail',width:number,tip=false) {
  const name=`${skill}_${phase}` as keyof typeof art;
  const [left,top,right,bottom]=art[name]!;
  const img=ctx.scene.add.image(0,0,PROJECTILE_ATLAS,name);
  const fit=width/(right!-left!);
  img.setOrigin((tip?right!-5:(left!+right!)/2)/img.width,(top!+bottom!)/2/img.height).setScale(fit);
  ctx.add(img);img.setData('projectileSkill',skill);return img;
}
const unitScale=(ctx:FxContext)=>ctx.scale/(111/96);
function edge(at:ProjectilePoint,outcome:ProjectileCue['outcome']) {
  return {x:at.x-at.size*.40,y:at.y+(outcome==='dodged'?at.size*.25:0)};
}
// Scene refreshes these after unit animation; both endpoints include actual pose and field shake.
// AV04: `releaseAt` is the fraction of the windup at which the caster's body lets go (unit-frames `release`); the flight
// starts on that same frame, never while the body is still drawing. Without a body release the old .22 lead remains.
export function projectilePrepare(ctx:FxContext,cue:ProjectileCue,lookup:ProjectileLookup,contactMs:number,gather=true,releaseAt=.22):void {
  if(ctx.reduced||!lookup(cue.sourceId)||!lookup(cue.targetId))return;
  const s=unitScale(ctx),quiet=ctx.quiet;
  const anticipation=Math.max(1,Math.round(contactMs*releaseAt)),travel=Math.max(1,contactMs-anticipation);
  if(gather){
    const glint=paint(ctx,cue.skill,'prepare',30*s).setAlpha(.2);
    const follow=()=>{const p=lookup(cue.sourceId);if(p&&glint.active)glint.setPosition(p.releaseX,p.releaseY);};
    glint.setData('projectileFollow',follow);glint.setData('projectileEvent',cue.event);follow();
    ctx.scene.tweens.add({targets:glint,alpha:quiet?.55:.88,duration:anticipation,onComplete:()=>glint.destroy()});
  }
  const arrow=paint(ctx,cue.skill,'flight',widths[cue.skill]*s*(quiet?.9:1),true).setAlpha(quiet?.72:.96).setVisible(false);
  arrow.setData('projectileEvent',cue.event);arrow.setData('projectileKind',cue.kind);arrow.setData('projectileSource',cue.sourceId);arrow.setData('projectileTarget',cue.targetId);arrow.setData('projectileProgress',0);
  const follow=()=>{
    const from=lookup(cue.sourceId),at=lookup(cue.targetId);if(!from||!at||!arrow.active)return;
    const to=edge(at,cue.outcome),t=arrow.getData('projectileProgress') as number;
    const dx=to.x-from.releaseX,dy=to.y-from.releaseY;
    const lift=lifts[cue.skill]*s*(quiet?.35:1);
    arrow.setPosition(from.releaseX+dx*t,from.releaseY+dy*t-4*lift*t*(1-t));
    arrow.rotation=Math.atan2(dy-4*lift*(1-2*t),dx);
  };
  arrow.setData('projectileFollow',follow);follow();
  // The tween targets the owned image, so every scene cleanup kills the whole flight.
  ctx.scene.tweens.add({targets:arrow,alpha:quiet?.72:.96,delay:anticipation,duration:travel,
    onStart:()=>arrow.setVisible(true),onUpdate:t=>{arrow.setData('projectileProgress',t.progress);follow();},onComplete:()=>arrow.destroy()});
}
export function projectileContact(ctx:FxContext,cue:ProjectileCue,lookup:ProjectileLookup,life:number):void {
  const point=lookup(cue.targetId);if(!point)return;
  const s=unitScale(ctx),at=edge(point,cue.outcome);
  const opacity=ctx.reduced?.75:ctx.quiet?.65:.95;
  // Reduced motion is an immediate static arrow/wisp at the real recipient, without travel.
  if(ctx.reduced){
    const still=paint(ctx,cue.skill,cue.outcome==='dodged'?'tail':'flight',48*s,true).setPosition(at.x,at.y).setAlpha(opacity);
    still.setData('projectileKind',cue.kind);still.setData('projectileTarget',cue.targetId);return;
  }
  const duration=Math.max(1,Math.min(life,360));
  const parts=[paint(ctx,cue.skill,'tail',46*s),paint(ctx,cue.skill,'tail',58*s).setAlpha(0)];
  if(cue.outcome!=='dodged')parts.push(paint(ctx,cue.skill,'prepare',cue.outcome==='blocked'?14*s:20*s));
  parts.forEach((item,i)=>{
    item.setAlpha(i===1?0:opacity*(i===2?.65:1));item.setData('projectileKind','contact');item.setData('projectileTarget',cue.targetId);
    const follow=()=>{const p=lookup(cue.targetId);if(!p||!item.active)return;const e=edge(p,cue.outcome),drift=(item.getData('projectileDrift') as number)||0;item.setPosition(e.x-drift*s,e.y-(i===1?4:0)*s);};
    item.setData('projectileFollow',follow);follow();
    if(cue.outcome==='blocked')item.setTint(0x8addf5);
    ctx.scene.tweens.add({targets:item,alpha:0,duration,onUpdate:t=>{
      const p=t.progress;item.setData('projectileDrift',(ctx.quiet?3:9)*p);
      item.alpha=opacity*(i===1?Math.sin(p*Math.PI)*.42:i===2?Math.max(0,1-p*3):1-p);follow();
    },onComplete:()=>item.destroy()});
  });
}
