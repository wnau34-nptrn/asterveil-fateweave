import type {BattleEvent,TurnStage} from '../../core/battle/types';
import type {FxContext} from './bolt-fx';
import art from './arcane-seal-art.json';

// C5.7 Arcane Seal (ART-VFX-ARCANE-SEAL-001 R2): Mark, Sigil Bind, Arcane Storm and Dispel.
// Presentation only: cues come from the events the resolver actually emitted for the hero's own cast.
export const SEAL_ATLAS='arcane-seal-fx';
export const sealAtlasUrls=():[string,string]=>[`${import.meta.env.BASE_URL}assets/fx/arcane_seal_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/arcane_seal_fx.json`];
export const sealSkills=['mark','sigil','storm','dispel'] as const;
export type SealSkill=typeof sealSkills[number];
export const isSealSkill=(action:string|undefined):action is SealSkill=>sealSkills.some(s=>s===action);
export type SealSpot='hand'|'centre'|'feet';
export interface SealCue {skill:SealSkill;sourceId:string;targetId:string;event:BattleEvent;outcome:'hit'|'blocked'|'dodged';
  // Sigil/Dispel settle only when the bind or removal really happened.
  applied:boolean;index:number}
export interface SealPoint {x:number;y:number;size:number;side:1|-1}
export type SealLookup=(id:string,spot:SealSpot)=>SealPoint|undefined;
export interface SealContexts {front:FxContext;back:FxContext}

export function sealEvents(turn:TurnStage):BattleEvent[]{
  if(turn.side!=='hero'||!isSealSkill(turn.action)||turn.events.some(e=>e.type==='cancel'))return [];
  return turn.events.filter(e=>!!e.targetId&&e.sourceId===turn.actorId&&(turn.action==='mark'?e.type==='mark':e.type==='damage'||e.type==='dodge'));
}
export function sealCues(turn:TurnStage):SealCue[]{
  const skill=turn.action as SealSkill;
  return sealEvents(turn).map((event,index)=>({skill,sourceId:event.sourceId!,targetId:event.targetId!,event,index,
    outcome:event.type==='dodge'?'dodged' as const:event.type==='damage'&&!event.amount?'blocked' as const:'hit' as const,
    applied:skill==='mark'||skill==='storm'||turn.events.some(e=>e.targetId===event.targetId&&e.sourceId===turn.actorId&&e.type===(skill==='sigil'?'sigil':'dispel'))}));
}
// Suggested canvas widths (px at a 390px game, 111px unit slot), from the art handoff.
const widths:Record<SealSkill,Record<'prepare'|'peak'|'settle',number>>={
  mark:{prepare:44,peak:72,settle:34},sigil:{prepare:46,peak:102,settle:98},
  storm:{prepare:48,peak:86,settle:69},dispel:{prepare:46,peak:94,settle:100}};
const spots:Record<SealSkill,Record<'peak'|'settle',SealSpot>>={
  mark:{peak:'centre',settle:'centre'},sigil:{peak:'feet',settle:'feet'},storm:{peak:'centre',settle:'feet'},dispel:{peak:'centre',settle:'centre'}};
type Phase='prepare'|'peak'|'settle';
const spotOf=(skill:SealSkill,phase:Phase):SealSpot=>phase==='prepare'?'hand':spots[skill][phase];
// Layers on the unit's body sit in front (hollow shapes keep faces clear); floor layers sit behind the unit.
export const sealLayer=(skill:SealSkill,phase:Phase):'front'|'back'=>spotOf(skill,phase)==='feet'?'back':'front';

function paint(ctxs:SealContexts,cue:SealCue,lookup:SealLookup,phase:Phase,o:{dx?:number;dy?:number}={}){
  const spot=spotOf(cue.skill,phase),ctx=ctxs[sealLayer(cue.skill,phase)],id=phase==='prepare'?cue.sourceId:cue.targetId;
  const point=lookup(id,spot);if(!point)return;
  const name=`${cue.skill}_${phase}`,pivot=(art as Record<string,number[]>)[name]!;
  const img=ctx.scene.add.image(point.x,point.y,SEAL_ATLAS,name);
  img.setOrigin(pivot[0],pivot[1]).setScale(widths[cue.skill][phase]*point.size/111/img.width*(ctx.quiet?.9:1));
  img.setData('sealSkill',cue.skill);img.setData('sealTarget',cue.targetId);img.setData('sealPhase',phase);img.setData('sealDx',o.dx??0);img.setData('sealDy',o.dy??0);
  if(phase==='prepare')img.setData('sealPrepare',true);
  const follow=()=>{const p=lookup(id,spot);if(p&&img.active){
    const dx=(img.getData('sealDx') as number)*p.size*p.side,dy=(img.getData('sealDy') as number)*p.size;
    img.setPosition(p.x+dx,p.y+dy+(cue.outcome==='dodged'&&phase!=='prepare'?p.size*.2:0));}};
  if(!ctx.reduced)img.setData('sealFollow',follow);follow();ctx.add(img);
  if(cue.outcome==='blocked'&&phase!=='prepare')img.setTint(0x8addf5);
  return img;
}
export function sealPrepare(ctxs:SealContexts,turn:TurnStage,lookup:SealLookup,contactMs:number):void{
  const ctx=ctxs.front;if(ctx.reduced||!isSealSkill(turn.action))return;
  const cue=sealCues(turn)[0];if(!cue)return;
  const img=paint(ctxs,cue,lookup,'prepare');if(!img)return;img.setAlpha(.2);
  ctx.scene.tweens.add({targets:img,alpha:ctx.quiet?.56:.86,duration:Math.max(1,contactMs),onComplete:()=>img.destroy()});
}
export function sealContact(ctxs:SealContexts,cue:SealCue,lookup:SealLookup,life:number):void{
  const ctx=ctxs.front,quiet=ctx.quiet,reduced=ctx.reduced,opacity=(reduced?.76:quiet?.74:.98)*(cue.outcome==='dodged'?.6:1);
  const side=cue.index%2?-1:1,storm=cue.skill==='storm';
  const peak=paint(ctxs,cue,lookup,'peak',storm?{dx:.22*side,dy:-.5}:{});if(!peak)return;peak.setAlpha(opacity);
  if(reduced)return;
  const settles=cue.outcome!=='dodged'&&cue.applied;
  const settle=settles?paint(ctxs,cue,lookup,'settle',cue.skill==='mark'?{dx:.3,dy:-.1}:storm?{dx:0,dy:0}:{}):undefined;
  settle?.setAlpha(0);
  const d=Math.max(1,Math.min(life,520));
  ctx.scene.tweens.add({targets:peak,alpha:0,duration:d,onUpdate:t=>{
    if(!peak.active)return;const p=t.progress;
    if(storm)peak.setData('sealDy',-.5*Math.max(0,1-p/.55)).setData('sealDx',.22*side*Math.max(0,1-p/.55));
    peak.alpha=opacity*(settle?Math.max(0,1-Math.max(0,p-.30)/.45):Math.max(0,1-Math.max(0,p-.55)/.45));
    if(settle?.active){settle.alpha=opacity*Math.min(1,Math.max(0,(p-.30)/.25))*(cue.skill==='mark'?1:Math.max(0,1-Math.max(0,p-.75)/.25));
      if(cue.skill==='mark')settle.setData('sealDx',.3*Math.min(1,p/.6));}
  },onComplete:()=>{peak.destroy();settle?.destroy();}});
}
