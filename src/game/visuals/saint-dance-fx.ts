import type {BattleEvent,TurnStage} from '../../core/battle/types';
import type {FxContext} from './bolt-fx';
import art from './saint-dance-art.json';

// C12 Batch 1 VFX (ART-VFX-SAINT-DANCE-001 R1): Saint (Metta/Thiran) and Dancer (Lalin/Wila).
// Presentation only: every layer is planned from events the resolver actually emitted for the hero's own cast. Nothing is invented.
//  - Saint moves are strikes: `damage`/`dodge` on the real foes, then a thread from the struck foe(s) to each ally who really
//    received a `Damage becomes an ally’s life.` heal. No heal event, no thread. A dodge gets no body contact (the generic dodge cue stays).
//    The art notes picture Communion/Sharewound as ally-to-ally; the resolver makes both a foe strike with a conversion, so they are routed as that.
//  - Dancer moves restore cooldowns: layers sit only on the real `cooldown` recipients (Rounddance's ring covers exactly those allies, Duet's
//    ribbons join the caster and each real recipient). No heal, barrier or damage is implied. Echofoot is the one Dancer strike (one trail, one contact).
export const SAINT_DANCE_ATLAS='saint-dance-fx';
export const saintDanceAtlasUrls=():[string,string]=>[`${import.meta.env.BASE_URL}assets/fx/saint_dance_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/saint_dance_fx.json`];
export const saintSkills=['saintstrike','communion','saintarc','vowstrike','sharewound','lastlight'] as const;
export const danceSkills=['cadence','duet','rounddance','deepbeat','echofoot','closingstep'] as const;
export const sdSkills=[...saintSkills,...danceSkills] as const;
export type SdSkill=typeof sdSkills[number];
export const isSdSkill=(action:string|undefined):action is SdSkill=>sdSkills.some(s=>s===action);
export type SdSpot='hand'|'waist'|'feet';
export interface SdTarget {id:string;spot:SdSpot}
type Outcome='hit'|'blocked'|'dodged';
// stand: one layer on one anchor; link: thread/ribbon from the centroid of `from` to `at`.
export interface SdPiece {frame:string;mode:'stand'|'link';at:SdTarget;from?:SdTarget[];outcome:Outcome;/** raise the anchors by this fraction of a unit (low leg effects) */lift?:number;/** fraction of the span a link reaches */reach?:number;event?:BattleEvent}
export interface SdPlan {skill:SdSkill;casterId:string;prepare:SdTarget;peaks:SdPiece[];settles:SdPiece[];/** resolver events fully covered by the painted layers (no generic ring/slash on them) */events:BattleEvent[]}
export interface SdPoint {x:number;y:number;size:number;side:1|-1}
export type SdLookup=(id:string,spot:SdSpot)=>SdPoint|undefined;
export interface SdContexts {front:FxContext;back:FxContext}

export const SAINT_HEAL='Damage becomes an ally’s life.';
const outcomeOf=(e:BattleEvent):Outcome=>e.type==='dodge'?'dodged':e.type==='damage'&&!e.amount?'blocked':'hit';
const CONTACT:Record<typeof saintSkills[number],string>={saintstrike:'saintstrike_peak',communion:'saintstrike_peak',sharewound:'saintstrike_peak',saintarc:'saintarc_peak',vowstrike:'vowstrike_peak',lastlight:'lastlight_peak'};
const LINK:Record<typeof saintSkills[number],string>={saintstrike:'saintstrike_settle',communion:'communion_settle',sharewound:'communion_settle',saintarc:'saintstrike_settle',vowstrike:'saintstrike_settle',lastlight:'saintstrike_settle'};

export function sdPlan(turn:TurnStage):SdPlan|undefined{
  if(turn.side!=='hero'||!isSdSkill(turn.action)||turn.events.some(e=>e.type==='cancel'))return;
  const skill=turn.action,id=turn.actorId,own=turn.events.filter(e=>e.sourceId===id);
  const waist=(who:string):SdTarget=>({id:who,spot:'waist'}),feet=(who:string):SdTarget=>({id:who,spot:'feet'}),prepare:SdTarget={id,spot:'hand'};
  const hits=own.filter(e=>!!e.targetId&&(e.type==='damage'||e.type==='dodge'));
  if((saintSkills as readonly string[]).includes(skill)){
    if(!hits.length)return;
    const kind=skill as typeof saintSkills[number],struck=hits.filter(e=>e.type==='damage'),heals=own.filter(e=>e.type==='heal'&&e.text===SAINT_HEAL&&!!e.targetId);
    const sources=struck.map(e=>waist(e.targetId!));
    const peaks:SdPiece[]=struck.map(e=>({frame:CONTACT[kind],mode:'stand',at:waist(e.targetId!),outcome:outcomeOf(e),event:e}));
    const settles:SdPiece[]=struck.length&&skill==='vowstrike'?struck.map(e=>({frame:'vowstrike_settle',mode:'stand' as const,at:waist(e.targetId!),outcome:outcomeOf(e)})):[];
    if(struck.length)for(const h of heals)settles.push({frame:LINK[kind],mode:'link',from:sources,at:waist(h.targetId!),outcome:'hit',event:h});
    return {skill,casterId:id,prepare,peaks,settles,events:[...struck,...(struck.length?heals:[])]};
  }
  const cool=own.filter(e=>e.type==='cooldown'&&!!e.targetId),who=[...new Set(cool.map(e=>e.targetId!))];
  if(skill==='echofoot'){
    if(!hits.length)return;
    const first=hits[0]!,dodged=first.type==='dodge';
    // One trail to the real foe; the spark lands only if the resolver emitted damage. A dodged echo stops short.
    const lift=.13,peaks:SdPiece[]=[{frame:'echofoot_peak',mode:'link',from:[feet(id)],at:feet(first.targetId!),outcome:outcomeOf(first),lift,reach:dodged?.62:1}];
    const settles:SdPiece[]=dodged?[]:[{frame:'echofoot_settle',mode:'link',from:[feet(id)],at:feet(first.targetId!),outcome:outcomeOf(first),lift,event:first}];
    return {skill,casterId:id,prepare:{id,spot:'feet'},peaks,settles,events:hits.filter(e=>e.type==='damage')};
  }
  if(!who.length)return;
  const events=cool;
  if(skill==='cadence')return {skill,casterId:id,prepare,peaks:who.map(w=>({frame:'cadence_peak',mode:'stand' as const,at:waist(w),outcome:'hit' as const})),settles:who.map(w=>({frame:'cadence_settle',mode:'stand' as const,at:waist(w),outcome:'hit' as const})),events};
  if(skill==='duet'){
    // A recipient other than the caster gets a ribbon from the caster; a caster-only recovery stays a still gather.
    const ribbon=(frame:string):SdPiece[]=>who.map(w=>w===id?{frame,mode:'stand',at:waist(w),outcome:'hit'}:{frame,mode:'link',from:[waist(id)],at:waist(w),outcome:'hit'});
    return {skill,casterId:id,prepare,peaks:ribbon('duet_peak'),settles:ribbon('duet_settle'),events};
  }
  if(skill==='rounddance'){
    // One ring at the soles of each ally who really recovered: the formation is two columns of up to three slots, so a single ring cannot enclose the team.
    // The `peak` painting is clipped by its source cell on both sides, so the clean `settle` ring serves as the whole cue.
    return {skill,casterId:id,prepare,peaks:who.map(w=>({frame:'rounddance_settle',mode:'stand' as const,at:feet(w),outcome:'hit' as const})),settles:[],events};
  }
  const name=skill==='deepbeat'?'deepbeat':'closingstep';
  return {skill,casterId:id,prepare,peaks:who.map(w=>({frame:`${name}_peak`,mode:'stand' as const,at:feet(w),outcome:'hit' as const})),settles:who.map(w=>({frame:`${name}_settle`,mode:'stand' as const,at:feet(w),outcome:'hit' as const})),events};
}

// Canvas widths (px of the 256px texture at a 390px game / 111px unit slot) from the art handoff. Links use `thick` (their height) instead.
const widths:Record<string,number>={
  saintstrike_prepare:42,communion_prepare:42,saintarc_prepare:46,vowstrike_prepare:46,sharewound_prepare:42,lastlight_prepare:50,
  cadence_prepare:38,duet_prepare:38,rounddance_prepare:40,deepbeat_prepare:34,echofoot_prepare:40,closingstep_prepare:38,
  saintstrike_peak:66,saintarc_peak:50,vowstrike_peak:82,vowstrike_settle:62,lastlight_peak:96,
  rounddance_settle:128,cadence_peak:76,cadence_settle:58,deepbeat_peak:70,deepbeat_settle:54,closingstep_peak:80,closingstep_settle:60};
const thick:Record<string,number>={saintstrike_settle:60,communion_settle:56,duet_peak:76,duet_settle:70,echofoot_peak:44,echofoot_settle:60};
// Floor rings sit behind the unit (back context) with a thin foreground rim, so they never cover faces or HP labels. Upright swirls/blooms (cadence, closing step)
// would vanish entirely behind an opaque sprite, so they stay in front, anchored below the face (waist/soles).
const BACK=new Set(['rounddance_settle','deepbeat_peak','deepbeat_settle']);
const RIM=new Set(['rounddance_settle','deepbeat_peak','deepbeat_settle']),RIM_ALPHA=.55;
// Rings behind the legs are drawn wider than the art suggestion so they stay readable around the soles.
const FLOOR_SCALE:Record<string,number>={rounddance_settle:1,deepbeat_peak:1.5,deepbeat_settle:1.5,closingstep_peak:1.15,closingstep_settle:1.15};
// Lastlight's burst is brief (art note: roughly the first tenth of the existing window); everything else holds through peak.
const BRIEF=new Set(['lastlight_peak']);
const REACH=240/256; // the painted content spans 8..248 of the 256px canvas
export const sdLayer=(frame:string):'front'|'back'=>BACK.has(frame)?'back':'front';

type Phase='prepare'|'peak'|'settle';
const centroid=(pts:(SdPoint|undefined)[]):SdPoint|undefined=>{
  const p=pts.filter((q):q is SdPoint=>!!q);if(!p.length)return;
  return {x:p.reduce((s,q)=>s+q.x,0)/p.length,y:p.reduce((s,q)=>s+q.y,0)/p.length,size:p[0]!.size,side:p[0]!.side};
};
function paint(ctxs:SdContexts,piece:SdPiece,phase:Phase,lookup:SdLookup):Phaser.GameObjects.Image|undefined{
  const frame=piece.frame,ctx=ctxs[sdLayer(frame)],pivot=(art as Record<string,number[]>)[frame]!;
  const at=(t:SdTarget)=>{const p=lookup(t.id,t.spot);return p&&piece.lift?{...p,y:p.y-piece.lift*p.size}:p;};
  const first=at(piece.at);if(!first)return;
  const img=ctx.scene.add.image(first.x,first.y,SAINT_DANCE_ATLAS,frame).setOrigin(pivot[0],pivot[1]);
  img.setData('sdFrame',frame).setData('sdPhase',phase).setData('songT',1).setData('sdScale',1);
  if(phase==='prepare')img.setData('songPrepare',true);
  let rim:Phaser.GameObjects.Image|undefined;
  const follow=()=>{
    if(!img.active)return;
    const quiet=ctx.quiet?.9:1,local=(img.getData('songLocal') as (()=>{x:number;y:number})|undefined)?.(),pop=img.getData('sdScale') as number;
    const end=at(piece.at);if(!end)return;
    let x=end.x,y=end.y;
    if(piece.mode==='link'){
      const begin=centroid((piece.from??[]).map(at));if(!begin)return;
      const t=(img.getData('songT') as number)*(piece.reach??1),dx=end.x-begin.x,dy=end.y-begin.y,dist=Math.hypot(dx,dy),len=Math.max(14,dist*t),left=dx<0;
      const s=end.size/111,sx=len/(img.width*REACH),sy=Math.min(Math.max(sx*.5,50/256*s),(thick[frame]??60)/256*s*1.9);
      x=begin.x+dx*t/2;y=begin.y+dy*t/2;
      // Art points right; mirror for leftward travel and follow the real direction.
      img.setScale(left?-sx:sx,sy*quiet).setRotation(left?Math.atan2(-dy,-dx):Math.atan2(dy,dx));
    }else{
      const w=(widths[frame]??60)*(FLOOR_SCALE[frame]??1)*end.size/111/img.width*quiet;
      img.setScale(w*pop);
    }
    // Back layers live inside their unit's body: positions are then relative to the body origin.
    img.setPosition(x-(local?.x??0),y-(local?.y??0));
    if(rim?.active)rim.setPosition(x,y).setScale(img.scaleX,img.scaleY).setRotation(img.rotation).setAlpha(img.alpha*RIM_ALPHA);
  };
  // Rings sit behind the sprite, so a fainter copy in front keeps a thin rim across the legs (art note: rear paint + narrow foreground rim).
  if(RIM.has(frame)&&!ctx.reduced&&ctxs.front!==ctx){
    rim=ctxs.front.scene.add.image(first.x,first.y,SAINT_DANCE_ATLAS,frame).setOrigin(pivot[0],pivot[1]);
    rim.setData('songRim',true);ctxs.front.add(rim);img.once('destroy',()=>rim?.destroy());
  }
  if(!ctx.reduced)img.setData('songFollow',follow);follow();ctx.add(img);
  if(piece.outcome==='blocked'&&phase!=='prepare')img.setTint(0x8addf5);
  return img;
}
export function sdPrepare(ctxs:SdContexts,turn:TurnStage,lookup:SdLookup,contactMs:number):boolean{
  const ctx=ctxs.front,plan=sdPlan(turn);if(!plan)return false;
  if(ctx.reduced)return true;
  const img=paint(ctxs,{frame:`${plan.skill}_prepare`,mode:'stand',at:plan.prepare,outcome:'hit'},'prepare',lookup);if(!img)return true;
  img.setAlpha(.2);
  ctx.scene.tweens.add({targets:img,alpha:ctx.quiet?.56:.86,duration:Math.max(1,contactMs),onComplete:()=>img.destroy()});
  return true;
}
// Peak layers at the contact instant, settle layers (threads, ribbons, fragments) after; all fade inside the existing contact window.
export function sdContact(ctxs:SdContexts,plan:SdPlan,lookup:SdLookup,life:number):void{
  const ctx=ctxs.front,quiet=ctx.quiet,reduced=ctx.reduced,opacity=reduced?.76:quiet?.74:.98;
  const d=Math.max(1,Math.min(life,520));
  const make=(pieces:SdPiece[],phase:Phase)=>pieces.flatMap(p=>{
    const img=paint(ctxs,p,phase,lookup);if(!img)return [];
    const dim=p.outcome==='dodged'?.6:p.outcome==='blocked'?.7:1;
    return [{img,p,dim}];
  });
  const peaks=make(plan.peaks,'peak');
  for(const k of peaks)k.img.setAlpha(opacity*k.dim);
  if(reduced){
    // Still layers at their destination: peaks plus the heal/ribbon links that explain a real recipient. No travel, no pop.
    const stills=[...peaks,...make(plan.settles.filter(s=>s.mode==='link'),'settle')];
    for(const k of stills){k.img.setAlpha(opacity*k.dim);ctx.scene.tweens.add({targets:k.img,alpha:0,delay:Math.round(d*.45),duration:d,onComplete:()=>k.img.destroy()});}
    return;
  }
  const settles=make(plan.settles,'settle');
  for(const k of [...peaks,...settles]){
    // Links grow out from their source; contact layers pop in.
    if(k.p.mode==='link')k.img.setData('songT',0);else k.img.setData('sdScale',.8);
    if(k.img.getData('songFollow'))(k.img.getData('songFollow') as ()=>void)();
  }
  for(const k of settles)k.img.setAlpha(0);
  const all=[...peaks,...settles];if(!all.length)return;
  ctx.scene.tweens.add({targets:all[0]!.img,alpha:0,duration:d,onUpdate:t=>{
    const p=t.progress;
    for(const k of peaks)if(k.img.active){
      const brief=BRIEF.has(k.p.frame),linked=k.p.mode==='link';
      k.img.setData('sdScale',.8+.2*Math.min(1,p/.25));
      if(linked)k.img.setData('songT',Math.min(1,p/.5));
      const hold=brief?.12:settles.length?.45:.55,span=brief?.2:settles.length?.4:.45;
      k.img.alpha=opacity*k.dim*Math.max(0,1-Math.max(0,p-hold)/span);
    }
    for(const k of settles)if(k.img.active){
      if(k.p.mode==='link')k.img.setData('songT',Math.min(1,Math.max(0,(p-.12)/.5)));
      k.img.alpha=opacity*k.dim*Math.min(1,Math.max(0,(k.p.mode==='link'?p-.08:p-.3)/.2))*Math.max(0,1-Math.max(0,p-.8)/.2);
    }
  },onComplete:()=>{for(const k of all)k.img.destroy();}});
}
