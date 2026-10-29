import type {BattleEvent,TurnStage} from '../../core/battle/types';
import type {FxContext} from './bolt-fx';
import art from './command-art.json';

// C5.9 command VFX (ART-VFX-COMMAND-001 R2): Brann's Taunt, Aegis's Challenge and Garran's War Cry.
// Presentation only: every cue comes from an event the resolver actually emitted.
//  - Taunt: self stance on the warden (`taunt` event, target = caster); no foe impact.
//  - Challenge: the real selected foe (`taunt` event, target = that foe); one thread, never fanned out.
//  - War Cry: a self buff on the caster. Impacts belong only to the later `War cry counter.` events, one per real counter target.
export const COMMAND_ATLAS='command-fx';
export const commandAtlasUrls=():[string,string]=>[`${import.meta.env.BASE_URL}assets/fx/command_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/command_fx.json`];
export const commandSkills=['taunt','challenge','warcry'] as const;
export type CommandSkill=typeof commandSkills[number];
export const isCommandSkill=(action:string|undefined):action is CommandSkill=>commandSkills.some(s=>s===action);
// chest/forward = caster upper body (never the floor), shield/crown = shield front / just above its rim, foe = resolved foe body.
export type CommandSpot='chest'|'forward'|'shield'|'crown'|'foe';
export interface CommandCue {kind:'cast'|'counter';skill:CommandSkill;sourceId:string;targetId:string;event:BattleEvent;blocked:boolean}
export interface CommandPoint {x:number;y:number;size:number;side:1|-1}
export type CommandLookup=(id:string,spot:CommandSpot)=>CommandPoint|undefined;
export interface CommandContexts {front:FxContext}

export const WAR_CRY_COUNTER='War cry counter.';
export function commandCues(turn:TurnStage):CommandCue[]{
  if(turn.events.some(e=>e.type==='cancel'))return [];
  const cues:CommandCue[]=[];
  if(turn.side==='hero'&&isCommandSkill(turn.action)){
    const skill=turn.action;
    const own=turn.events.filter(e=>e.sourceId===turn.actorId&&!!e.targetId);
    const event=skill==='warcry'?own.find(e=>e.type==='buff'&&e.targetId===turn.actorId)
      :skill==='taunt'?own.find(e=>e.type==='taunt'&&e.targetId===turn.actorId)
      :own.find(e=>e.type==='taunt'&&e.targetId!==turn.actorId);
    if(event)cues.push({kind:'cast',skill,sourceId:turn.actorId,targetId:event.targetId!,event,blocked:false});
  }
  // A recorded ally's later physical hit: one impact per real counter target, drawn on the foe that was struck back.
  for(const e of turn.events)if(e.type==='counter'&&e.text===WAR_CRY_COUNTER&&e.sourceId&&e.targetId)
    cues.push({kind:'counter',skill:'warcry',sourceId:e.sourceId,targetId:e.targetId,event:e,blocked:!e.amount});
  return cues;
}

// Display widths of the full 256px texture at a 390px game / 111px unit slot (art handoff ranges).
const widths:Record<string,number>={
  taunt_prepare:54,taunt_pulse:88,taunt_motes:60,taunt_settle:34,
  challenge_prepare:54,challenge_crest:60,challenge_settle:28,
  warcry_prepare:54,warcry_cone:120,warcry_impact:48,warcry_wisps:58};
// Challenge thread: pivot at its tail; its tip reaches (237-24)/256 of the texture width.
const THREAD_REACH=(237-24)/256,THREAD_HEIGHT=150;
const prepareSpot:Record<CommandSkill,CommandSpot>={taunt:'chest',challenge:'shield',warcry:'forward'};
const settleSpot:Record<CommandSkill,CommandSpot>={taunt:'chest',challenge:'crown',warcry:'forward'};
const peakSpot:Record<CommandSkill,CommandSpot>={taunt:'chest',challenge:'shield',warcry:'forward'};

interface Placed {img:Phaser.GameObjects.Image;name:string}
function put(ctx:FxContext,id:string,spot:CommandSpot,lookup:CommandLookup,name:string,tag:string,o:{dx?:number;dy?:number;scale?:number}={}):Phaser.GameObjects.Image|undefined{
  const point=lookup(id,spot);if(!point)return;
  const pivot=(art as Record<string,number[]>)[name]!;
  const img=ctx.scene.add.image(point.x,point.y,COMMAND_ATLAS,name);
  img.setOrigin(pivot[0],pivot[1]);
  const base=()=>widths[name]!*(lookup(id,spot)?.size??point.size)/111/img.width*(ctx.quiet?.9:1);
  img.setData('commandName',name);img.setData('commandTag',tag);img.setData('commandDx',o.dx??0);img.setData('commandDy',o.dy??0);img.setData('commandScale',o.scale??1);
  const follow=()=>{const p=lookup(id,spot);if(!p||!img.active)return;
    img.setPosition(p.x+(img.getData('commandDx') as number)*p.size*p.side,p.y+(img.getData('commandDy') as number)*p.size);
    img.setScale(base()*(img.getData('commandScale') as number));
    if(p.side<0)img.setScale(-Math.abs(img.scaleX),img.scaleY);};
  if(!ctx.reduced)img.setData('commandFollow',follow);follow();ctx.add(img);
  return img;
}
// Challenge thread: tail at the shield front, tip at the one resolved foe; length and angle follow both bodies.
function putThread(ctx:FxContext,from:string,to:string,lookup:CommandLookup,tag:string):Phaser.GameObjects.Image|undefined{
  const start=lookup(from,'shield'),end=lookup(to,'foe');if(!start||!end)return;
  const pivot=(art as Record<string,number[]>)['challenge_thread']!;
  const img=ctx.scene.add.image(start.x,start.y,COMMAND_ATLAS,'challenge_thread').setOrigin(pivot[0],pivot[1]);
  img.setData('commandName','challenge_thread');img.setData('commandTag',tag);
  const follow=()=>{const a=lookup(from,'shield'),b=lookup(to,'foe');if(!a||!b||!img.active)return;
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
    img.setPosition(a.x,a.y).setRotation(Math.atan2(dy,dx)).setScale(Math.max(.2,dist/(img.width*THREAD_REACH)),THREAD_HEIGHT*a.size/111/img.width*(ctx.quiet?.9:1));};
  if(!ctx.reduced)img.setData('commandFollow',follow);follow();ctx.add(img);
  return img;
}
export function commandPrepare(ctxs:CommandContexts,turn:TurnStage,lookup:CommandLookup,contactMs:number):void{
  const ctx=ctxs.front;if(ctx.reduced||!isCommandSkill(turn.action))return;
  const cue=commandCues(turn).find(c=>c.kind==='cast');if(!cue)return;
  const img=put(ctx,cue.sourceId,prepareSpot[cue.skill],lookup,`${cue.skill}_prepare`,'prepare');if(!img)return;
  img.setAlpha(.2);
  ctx.scene.tweens.add({targets:img,alpha:ctx.quiet?.56:.86,duration:Math.max(1,contactMs),onComplete:()=>img.destroy()});
}
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
export function commandContact(ctxs:CommandContexts,cue:CommandCue,lookup:CommandLookup,life:number):void{
  const ctx=ctxs.front,quiet=ctx.quiet,reduced=ctx.reduced,opacity=reduced?.76:quiet?.74:.98;
  const tag=`${cue.skill}-${cue.kind}`;
  const layers:Placed[]=[];const keep=(img:Phaser.GameObjects.Image|undefined,name:string)=>{if(img)layers.push({img,name});return img;};
  const d=Math.max(1,Math.min(life,520));
  if(cue.kind==='counter'){
    const impact=keep(put(ctx,cue.targetId,'foe',lookup,'warcry_impact',tag),'impact');if(!impact)return;
    if(cue.blocked)impact.setTint(0x8addf5);
    impact.setAlpha(opacity);
    if(reduced){ctx.scene.tweens.add({targets:impact,alpha:0,duration:d,onComplete:()=>impact.destroy()});return;}
    ctx.scene.tweens.add({targets:impact,alpha:0,duration:Math.min(d,420),onUpdate:t=>{
      if(!impact.active)return;const p=t.progress;impact.setData('commandScale',.7+.35*Math.min(1,p/.3));impact.alpha=opacity*(p<.35?1:Math.max(0,1-(p-.35)/.65));},onComplete:()=>impact.destroy()});
    return;
  }
  const skill=cue.skill;let main:Phaser.GameObjects.Image|undefined,detail:Phaser.GameObjects.Image|undefined;
  if(skill==='taunt'){main=keep(put(ctx,cue.sourceId,peakSpot.taunt,lookup,'taunt_pulse',tag),'pulse');detail=keep(put(ctx,cue.sourceId,'chest',lookup,'taunt_motes',tag),'motes');}
  else if(skill==='challenge'){main=keep(put(ctx,cue.sourceId,'shield',lookup,'challenge_crest',tag),'crest');detail=keep(putThread(ctx,cue.sourceId,cue.targetId,lookup,tag),'thread');}
  else{main=keep(put(ctx,cue.sourceId,'forward',lookup,'warcry_cone',tag),'cone');}
  if(!main)return;
  main.setAlpha(opacity);detail?.setAlpha(opacity);
  if(reduced){ctx.scene.tweens.add({targets:main,alpha:0,duration:d,onUpdate:()=>{if(detail?.active)detail.alpha=main!.alpha;},onComplete:()=>{main!.destroy();detail?.destroy();}});return;}
  const settle=keep(put(ctx,cue.sourceId,settleSpot[skill],lookup,`${skill}_${skill==='warcry'?'wisps':'settle'}`,tag),'settle');settle?.setAlpha(0);
  ctx.scene.tweens.add({targets:main,alpha:0,duration:d,onUpdate:t=>{
    if(!main!.active)return;const p=t.progress,fade=opacity*Math.max(0,1-Math.max(0,p-.32)/.4);
    if(skill==='taunt'){main!.setData('commandDx',.9*Math.min(1,p/.7)).setData('commandScale',.8+.25*Math.min(1,p/.4));
      if(detail?.active){detail.setData('commandDx',.2+1.1*Math.min(1,p/.8)).alpha=fade*Math.min(1,p/.2);}}
    else if(skill==='challenge'){main!.setData('commandScale',.85+.15*Math.min(1,p/.25));if(detail?.active)detail.alpha=opacity*Math.max(0,1-Math.max(0,p-.42)/.3)*Math.min(1,p/.1);}
    else main!.setData('commandScale',.6+.4*Math.min(1,p/.35)).setData('commandDx',.12*Math.min(1,p/.5));
    main!.alpha=fade;
    if(settle?.active){const rise=clamp01((p-.30)/.25),out=skill==='challenge'?1:Math.max(0,1-Math.max(0,p-.72)/.28);settle.alpha=opacity*rise*out;}
  },onComplete:()=>{for(const l of layers)l.img.destroy();}});
}
