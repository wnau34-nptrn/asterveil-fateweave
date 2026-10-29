import type {BattleEvent,TurnStage} from '../../core/battle/types';
import type {FxContext} from './bolt-fx';
import type {HealingCue} from './healing-fx';
import art from './alchemy-art.json';

export const ALCHEMY_ATLAS='alchemy-fx';
export const alchemyAtlasUrls=():[string,string]=>[`${import.meta.env.BASE_URL}assets/fx/alchemy_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/alchemy_fx.json`];
export const alchemySkills=['acid','bomb','smoke','catalyst','haste','fury'] as const;
export type AlchemySkill=typeof alchemySkills[number];
export const isAlchemySkill=(action:string|undefined):action is AlchemySkill=>alchemySkills.some(s=>s===action);
export interface AlchemyCue {skill:AlchemySkill;sourceId:string;targetId:string;event:BattleEvent;kind:'hit'|'status'|'reaction';outcome:'hit'|'blocked'|'dodged'}
export interface AlchemyPoint {x:number;y:number;size:number}
export type AlchemyLookup=(id:string,skill:AlchemySkill,prepare?:boolean)=>AlchemyPoint|undefined;
// Chain reaction belongs to its event source, even on another actor's stage.
export function alchemyEvents(turn:TurnStage):BattleEvent[]{
  const cast=turn.side==='hero'&&isAlchemySkill(turn.action)&&!turn.events.some(e=>e.type==='cancel');
  return turn.events.filter(e=>!!e.sourceId&&!!e.targetId&&(e.type==='corrode'&&e.text==='Chain reaction.' || cast&&e.sourceId===turn.actorId&&(
    ['acid','bomb','catalyst'].includes(turn.action!)&&(e.type==='damage'||e.type==='dodge') ||
    ['acid','smoke'].includes(turn.action!)&&e.type==='corrode' || turn.action==='smoke'&&e.type==='weaken' ||
    turn.action==='haste'&&e.type==='haste' || turn.action==='fury'&&e.type==='buff'&&e.text==='Fury tonic.')));
}
export function alchemyCues(turn:TurnStage):AlchemyCue[]{
  const events=alchemyEvents(turn);
  return events.flatMap(event=>{
    const residue=event.type==='corrode',reaction=residue&&event.text==='Chain reaction.';
    // The primary Acid hit already includes its residue. Spread is status only.
    if(residue&&!reaction&&turn.action==='acid'&&events.some(e=>e.targetId===event.targetId&&(e.type==='damage'||e.type==='dodge')))return [];
    const skill:AlchemySkill=residue?'acid':turn.action as AlchemySkill;
    return [{skill,sourceId:event.sourceId!,targetId:event.targetId!,event,kind:reaction?'reaction':event.type==='damage'||event.type==='dodge'?'hit':'status',outcome:event.type==='dodge'?'dodged':event.type==='damage'&&!event.amount?'blocked':'hit'}];
  });
}
export function alchemyHealingCues(turn:TurnStage):HealingCue[]{
  if(turn.side!=='hero'||turn.action!=='haste'||turn.events.some(e=>e.type==='cancel'))return [];
  return turn.events.flatMap(event=>event.sourceId===turn.actorId&&event.targetId&&(event.amount??0)>0&&(
    event.type==='heal'&&event.text==='Restored HP.' || event.type==='barrier'&&event.text==='Overflowing light becomes a barrier.')
    ?[{kind:event.type==='barrier'?'barrier':'cast',skill:'heal',sourceId:turn.actorId,targetId:event.targetId,event}]:[]);
}
const widths:Record<AlchemySkill,number>={acid:.56,bomb:.65,smoke:.74,catalyst:.56,haste:.74,fury:.74};
function paint(ctx:FxContext,cue:AlchemyCue,lookup:AlchemyLookup,phase:'prepare'|'peak'|'tail',width:number){
  const id=phase==='prepare'?cue.sourceId:cue.targetId,point=lookup(id,cue.skill,phase==='prepare');if(!point)return;
  const name=`${cue.skill}_${phase}` as keyof typeof art,[left,top,right,bottom]=art[name]!;
  const img=ctx.scene.add.image(point.x,point.y,ALCHEMY_ATLAS,name),factor=width/(right!-left!);
  img.setOrigin((left!+right!)/2/img.width,(top!+bottom!)/2/img.height).setScale(factor);
  img.setData('alchemySkill',cue.skill);img.setData('alchemyTarget',cue.targetId);img.setData('alchemyPhase',phase);img.setData('alchemyDrift',0);
  if(phase==='prepare')img.setData('alchemyPrepare',true);
  const follow=()=>{const p=lookup(id,cue.skill,phase==='prepare');if(p&&img.active){const drift=(img.getData('alchemyDrift') as number)||0;img.setPosition(p.x+drift,p.y-drift*.2+(cue.outcome==='dodged'?p.size*.25:0));}};
  if(!ctx.reduced)img.setData('alchemyFollow',follow);follow();ctx.add(img);return img;
}
export function alchemyPrepare(ctx:FxContext,turn:TurnStage,lookup:AlchemyLookup,contactMs:number):void{
  if(ctx.reduced||turn.side!=='hero'||!isAlchemySkill(turn.action))return;
  const cue=alchemyCues(turn).find(c=>c.sourceId===turn.actorId&&c.kind!=='reaction'),point=cue&&lookup(cue.sourceId,cue.skill,true);if(!cue||!point)return;
  const img=paint(ctx,cue,lookup,'prepare',26*point.size/111);if(!img)return;img.setAlpha(.2);
  ctx.scene.tweens.add({targets:img,alpha:ctx.quiet?.56:.86,duration:Math.max(1,contactMs),onComplete:()=>img.destroy()});
}
export function alchemyContact(ctx:FxContext,cue:AlchemyCue,lookup:AlchemyLookup,life:number):void{
  const point=lookup(cue.targetId,cue.skill);if(!point)return;
  const residue=cue.skill==='acid'&&cue.kind!=='hit',width=(residue?.36:widths[cue.skill])*point.size*(ctx.quiet?.9:1);
  const opacity=(ctx.reduced?.76:ctx.quiet?.74:.98)*(residue?.66:1);
  const peak=paint(ctx,cue,lookup,residue||cue.outcome==='dodged'?'tail':'peak',width);if(!peak)return;peak.setAlpha(opacity);
  if(cue.outcome==='blocked')peak.setTint(0x8addf5);
  if(ctx.reduced)return;
  const tail=paint(ctx,cue,lookup,'tail',width*.95)!;
  tail.setAlpha(0);if(cue.outcome==='blocked')tail.setTint(0x8addf5);
  ctx.scene.tweens.add({targets:peak,alpha:0,duration:Math.max(1,Math.min(life,440)),onUpdate:t=>{
    if(!peak.active||!tail.active)return;const p=t.progress;
    peak.alpha=opacity*Math.max(0,1-Math.max(0,p-.30)/.48);tail.alpha=opacity*Math.sin(p*Math.PI)*.70;
    tail.setData('alchemyDrift',p*(ctx.quiet?2:6));
  },onComplete:()=>{peak.destroy();tail.destroy();}});
}
