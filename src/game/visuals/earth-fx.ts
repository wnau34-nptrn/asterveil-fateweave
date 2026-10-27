import type {BattleEvent,TurnStage} from '../../core/battle/types';
import type {FxContext} from './bolt-fx';
import type {HealingCue} from './healing-fx';
import art from './earth-art.json';

export const EARTH_ATLAS='earth-fx';
export const earthAtlasUrls=():[string,string]=>[`${import.meta.env.BASE_URL}assets/fx/earth_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/earth_fx.json`];
export const earthSkills=['bash','slam','quake','tremor'] as const;
export type EarthSkill=typeof earthSkills[number];
export const isEarthSkill=(action:string|undefined):action is EarthSkill=>earthSkills.some(s=>s===action);
export interface EarthCue {skill:EarthSkill;sourceId:string;targetId:string;event:BattleEvent;outcome:'hit'|'blocked'|'dodged'}
export interface EarthPoint {x:number;y:number;size:number}
export type EarthLookup=(id:string,skill:EarthSkill,prepare?:boolean)=>EarthPoint|undefined;
export function earthCues(turn:TurnStage):EarthCue[]{
  if(turn.side!=='hero'||!isEarthSkill(turn.action)||turn.events.some(e=>e.type==='cancel'))return [];
  const skill=turn.action;
  return turn.events.flatMap(event=>event.sourceId===turn.actorId&&event.targetId&&(event.type==='damage'||event.type==='dodge')
    ?[{skill,sourceId:event.sourceId,targetId:event.targetId,event,outcome:event.type==='dodge'?'dodged':(event.amount??0)>0?'hit':'blocked'}]:[]);
}
// Skyhammer's real healing is separate from earth damage. Never infer it from target count.
export function earthHealingEvents(turn:TurnStage):BattleEvent[]{
  return turn.side==='hero'&&turn.action==='quake'&&!turn.events.some(e=>e.type==='cancel')
    ?turn.events.filter(e=>e.type==='heal'&&e.text==='Restored HP.'&&e.sourceId===turn.actorId&&e.targetId===turn.actorId&&(e.amount??0)>0):[];
}
export function earthHealingCues(turn:TurnStage):HealingCue[]{
  // One visual response for simultaneous heals to the same caster; every original event
  // still owns its caption/HP change, and every event is suppressed from generic fallback.
  return earthHealingEvents(turn).slice(0,1).map(event=>({kind:'cast',skill:'heal',sourceId:turn.actorId,targetId:turn.actorId,event}));
}
const widths:Record<EarthSkill,number>={bash:.52,slam:.45,quake:.70,tremor:.70};
function paint(ctx:FxContext,cue:EarthCue,lookup:EarthLookup,phase:'prepare'|'peak'|'tail',width:number){
  const point=lookup(phase==='prepare'?cue.sourceId:cue.targetId,cue.skill,phase==='prepare');if(!point)return;
  const name=`${cue.skill}_${phase}` as keyof typeof art,[left,top,right,bottom]=art[name]!;
  const img=ctx.scene.add.image(point.x,point.y,EARTH_ATLAS,name);
  const ground=phase!=='prepare'&&(cue.skill==='quake'||cue.skill==='tremor');
  const factor=width/(right!-left!),cross=ground?.48:1;
  img.setOrigin((left!+right!)/2/img.width,(phase==='prepare'||cue.skill==='bash'?(top!+bottom!)/2:bottom!)/img.height).setScale(factor,factor*cross);
  img.setData('earthSkill',cue.skill);img.setData('earthTarget',cue.targetId);img.setData('earthPhase',phase);img.setData('earthDrift',0);
  if(phase==='prepare')img.setData('earthPrepare',true);
  const follow=()=>{
    const p=lookup(phase==='prepare'?cue.sourceId:cue.targetId,cue.skill,phase==='prepare');if(!p||!img.active)return;
    const drift=(img.getData('earthDrift') as number)||0;
    img.setPosition(p.x+(cue.skill==='tremor'?-drift:cue.skill==='bash'?-drift*.3:0),p.y+(cue.skill==='slam'?drift*.3:0)+(phase!=='prepare'&&cue.outcome==='dodged'?p.size*.25:0));
  };
  if(!ctx.reduced)img.setData('earthFollow',follow);follow();ctx.add(img);return img;
}
export function earthPrepare(ctx:FxContext,cues:readonly EarthCue[],lookup:EarthLookup,contactMs:number):void{
  const cue=cues[0],point=cue&&lookup(cue.sourceId,cue.skill,true);if(!cue||!point||ctx.reduced)return;
  const img=paint(ctx,cue,lookup,'prepare',(cue.skill==='bash'?30:26)*point.size/111);if(!img)return;
  img.setAlpha(.2);
  ctx.scene.tweens.add({targets:img,alpha:ctx.quiet?.56:.86,duration:Math.max(1,contactMs),onComplete:()=>img.destroy()});
}
export function earthContact(ctx:FxContext,cue:EarthCue,lookup:EarthLookup,life:number):void{
  const point=lookup(cue.targetId,cue.skill);if(!point)return;
  const width=widths[cue.skill]*point.size*(ctx.quiet?.9:1),opacity=ctx.reduced?.76:ctx.quiet?.74:.98;
  const peak=paint(ctx,cue,lookup,cue.outcome==='dodged'?'tail':'peak',width);if(!peak)return;
  peak.setAlpha(opacity);if(cue.outcome==='blocked')peak.setTint(0x8addf5);
  if(ctx.reduced)return;
  const tail=paint(ctx,cue,lookup,'tail',width*.92)!,wake=paint(ctx,cue,lookup,'tail',width*1.06)!;
  tail.setAlpha(0);wake.setAlpha(0);
  if(cue.outcome==='blocked'){tail.setTint(0x8addf5);wake.setTint(0x8addf5);}
  const duration=Math.max(1,Math.min(life,440));
  // All animation belongs to owned images, inside the unchanged presentation stage.
  ctx.scene.tweens.add({targets:peak,alpha:0,duration,onUpdate:t=>{
    if(!peak.active||!tail.active||!wake.active)return;const p=t.progress;
    peak.alpha=opacity*Math.max(0,1-Math.max(0,p-.32)/.40);
    tail.alpha=opacity*Math.sin(p*Math.PI)*.72;wake.alpha=opacity*Math.sin(p*Math.PI)**2*.28;
    tail.setData('earthDrift',p*(ctx.quiet?2:5));wake.setData('earthDrift',p*(ctx.quiet?3:9));
  },onComplete:()=>{peak.destroy();tail.destroy();wake.destroy();}});
}
