import Phaser from 'phaser';
import type { BattleEvent, EncounterDefinition, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';
import meta from './defense-art.json';

export const DEFENSE_ATLAS = 'defense-fx';
export const defenseAtlasUrls = (): [string,string] => [`${import.meta.env.BASE_URL}assets/fx/defense_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/defense_fx.json`];
export type DefenseSkill = keyof typeof meta.profiles;
export const isDefenseSkill = (action: string | undefined): action is DefenseSkill => !!action && Object.hasOwn(meta.profiles,action);
export type DefenseCue = { sourceId:string; targetId:string; event:BattleEvent } &
  ({kind:'cast'|'counter'|'redirect'|'save';skill:DefenseSkill}|{kind:'absorb';skill?:never});
export interface DefensePoint { x:number; y:number; footY:number }
export type DefenseLookup = (id:string) => DefensePoint | undefined;

// Casts come from real events and authoritative coverage state. No selected-target fallback.
export function defenseCues(turn:TurnStage,data:EncounterDefinition):DefenseCue[] {
  if(turn.events.some(e=>e.type==='cancel'))return [];
  const cues:DefenseCue[]=[],before=turn.before,after=turn.after;
  const alive=(id:string|undefined)=>!!id&&!!before?.heroes.some(h=>h.id===id&&h.hp>0);
  if(turn.side==='hero'&&isDefenseSkill(turn.action)){
    const skill=turn.action;
    const type=({guard:'guard',aegis:'barrier',rally:'rally',bulwark:'buff',stonearmor:'barrier',guardstone:'buff',halo:'buff',sanctuary:'sanctuary',brace:'brace',spearwall:'brace',hold:'hold'} as const)[skill];
    const events=turn.events.filter(e=>e.type===type&&e.sourceId===turn.actorId);
    const primary=events[0];
    if(primary){
      let ids=events.flatMap(e=>e.targetId?[e.targetId]:[]);
      if(skill==='guard'||skill==='brace'||skill==='spearwall'||skill==='hold')ids=[turn.actorId];
      if(skill==='rally')ids=after?.rally?.heroId===turn.actorId?after.rally.ids:[];
      if(skill==='bulwark')ids=after?.bulwark?.heroId===turn.actorId?data.heroes.filter(h=>h.lane==='front'&&after.heroes.some(a=>a.id===h.id&&a.hp>0)).map(h=>h.id):[];
      if(skill==='halo')ids=after?.halo?.heroId===turn.actorId?after.heroes.filter(h=>h.hp>0).map(h=>h.id):[];
      for(const id of new Set(ids))cues.push({kind:'cast',skill,sourceId:turn.actorId,targetId:id,event:events.find(e=>e.targetId===id)??primary});
    }
  }
  for(const event of turn.events){
    const {sourceId,targetId}=event;if(!sourceId||!targetId)continue;
    if(event.type==='counter'&&(event.amount??0)>0){
      const brace=before?.counter,hold=before?.hold;
      const skill=brace?.heroId===sourceId?(brace.wall?'spearwall':'brace'):hold?.heroId===sourceId?'hold':undefined;
      if(skill)cues.push({kind:'counter',skill,sourceId,targetId,event});
    }
    if(event.type==='damage'&&turn.side==='enemy'){
      if((event.absorbed??0)>0)cues.push({kind:'absorb',sourceId,targetId,event});
      // A guarded dodge has no damage event and cannot fabricate an interception hit.
      if(before?.guard?.heroId===targetId&&before.guard.sourceId===sourceId&&turn.intent?.targetId!==targetId&&alive(targetId))
        cues.push({kind:'redirect',skill:'guard',sourceId,targetId,event});
      if(turn.intent?.stoned&&before?.stone?.heroId===targetId&&alive(targetId))
        cues.push({kind:'redirect',skill:'guardstone',sourceId,targetId,event});
    }
    if(event.type==='sanctuary'&&turn.side==='enemy')cues.push({kind:'save',skill:'sanctuary',sourceId,targetId,event});
  }
  return cues;
}
const scale=(ctx:FxContext)=>ctx.scale/(111/96);
// Small, local gestures: planted earth, coordinated readiness, hovering stone, quiet low crystal.
// The leg auras never move their baseline or grow vertically.
const gestures:Record<DefenseSkill,{x:number;y:number;spread:number}>={
  guard:{x:5,y:0,spread:.04},aegis:{x:0,y:0,spread:.06},rally:{x:0,y:0,spread:.08},
  bulwark:{x:0,y:6,spread:.04},stonearmor:{x:0,y:0,spread:.04},guardstone:{x:0,y:-3,spread:.05},
  halo:{x:0,y:-2,spread:.05},sanctuary:{x:0,y:-4,spread:.08},brace:{x:2,y:0,spread:.03},
  spearwall:{x:0,y:4,spread:.06},hold:{x:0,y:1,spread:.08},
};
function paint(ctx:FxContext,skill:DefenseSkill,phase:'prepare'|'peak'|'tail',point:DefensePoint,command=false):Phaser.GameObjects.Image {
  const p=command?meta.rallyCommand:meta.profiles[skill],s=scale(ctx);
  const bottom=p.anchor==='feet'?point.footY+p.dy*s:point.y+(p.dy+p.height/2)*s;
  const image=ctx.scene.add.image(point.x+p.dx*s,bottom,DEFENSE_ATLAS,`${command?'rally_command':skill}_${phase}`).setOrigin(.5,meta.baseline).setScale(p.fit*s);
  ctx.add(image);return image;
}
// All tweens target owned images; stopEffects kills them. No unowned timers/callback counters.
export function defenseCast(ctx:FxContext,cue:DefenseCue,lookup:DefenseLookup,contactMs:number):void {
  if(ctx.reduced||cue.kind!=='cast')return;
  // One command from the caster; recipients only acknowledge at contact.
  if(cue.skill==='rally'&&cue.targetId!==cue.sourceId)return;
  const at=lookup(cue.targetId);if(!at)return;
  const image=paint(ctx,cue.skill,'prepare',at,cue.skill==='rally').setAlpha(.18);
  ctx.scene.tweens.add({targets:image,alpha:ctx.quiet?.42:.7,duration:Math.max(1,contactMs),ease:'Sine.In',onComplete:()=>image.destroy()});
}
export function defenseContact(ctx:FxContext,cue:DefenseCue,lookup:DefenseLookup,life:number):void {
  const at=lookup(cue.targetId);if(!at)return;
  const duration=Math.max(1,Math.min(life,420)),opacity=ctx.reduced?.55:ctx.quiet?.6:.9;
  if(cue.kind==='counter'||cue.kind==='absorb'){
    const from=lookup(cue.sourceId),angle=from?Math.atan2(at.y-from.y,at.x-from.x):0,s=scale(ctx),counter=cue.kind==='counter';
    const image=ctx.scene.add.image(at.x-(counter?0:Math.cos(angle)*20*s),at.y-(counter?0:Math.sin(angle)*20*s),DEFENSE_ATLAS,counter?'brace_peak':'absorb')
      .setOrigin(.5,counter?.59:.5).setRotation(counter?angle+.7:angle).setAlpha(opacity);
    if(counter)image.setScale(meta.profiles.brace.fit*s*.75);else image.setDisplaySize(44*s,44*s).setTint(0xbff3ff);
    ctx.add(image);
    if(!ctx.reduced)ctx.scene.tweens.add({targets:image,alpha:0,x:image.x+(counter?Math.cos(angle)*10*s:0),y:image.y+(counter?Math.sin(angle)*10*s:0),duration:Math.min(duration,280),ease:'Sine.Out',onComplete:()=>image.destroy()});
    return;
  }
  if(cue.skill==='rally'&&cue.sourceId===cue.targetId){
    const command=paint(ctx,'rally','peak',at,true).setAlpha(opacity);
    if(!ctx.reduced)animatePaint(ctx,command,paint(ctx,'rally','tail',at,true).setAlpha(0),{x:4,y:0,spread:.1},duration,opacity);
  }
  const peak=paint(ctx,cue.skill,'peak',at).setAlpha(opacity);
  if(ctx.reduced)return;
  animatePaint(ctx,peak,paint(ctx,cue.skill,'tail',at).setAlpha(0),gestures[cue.skill],duration,opacity);
}
function animatePaint(ctx:FxContext,peak:Phaser.GameObjects.Image,tail:Phaser.GameObjects.Image,gesture:{x:number;y:number;spread:number},duration:number,opacity:number):void {
  const x=peak.x,y=peak.y,sx=peak.scaleX,sy=peak.scaleY,s=scale(ctx)*(ctx.quiet?.5:1);
  ctx.scene.tweens.add({targets:peak,alpha:0,duration,onUpdate:tween=>{
    if(!peak.active||!tail.active)return;
    const p=tween.progress,blend=Phaser.Math.Clamp((p-.42)/.3,0,1);
    const settle=(1-Phaser.Math.Clamp(p/.4,0,1))**3;
    peak.setPosition(x+gesture.x*s*settle,y+gesture.y*s*settle).setScale(sx*(1-gesture.spread*settle),sy);
    tail.setPosition(peak.x,peak.y).setScale(peak.scaleX,peak.scaleY);
    peak.setAlpha(opacity*(1-blend));tail.setAlpha((ctx.quiet?.25:.42)*blend*(1-Phaser.Math.Clamp((p-.75)/.25,0,1)));
  },onComplete:()=>{peak.destroy();tail.destroy();}});
}
