import type {BattleEvent,TurnStage} from '../../core/battle/types';
import type {FxContext} from './bolt-fx';
import art from './song-shadow-art.json';

// C5.8 Lio's songs (ART-VFX-SONG-SHADOW-001 song R2) and C5.9 Sefa's shadow (shadow R1): Valor, Finale, Dread, Note, Solo, Evade, Decoy.
// Presentation only: every layer is planned from events the resolver actually emitted for the hero's own cast.
//  - Valor/Dread are self songs (one `song` event). Valor's flecks drift to each standing ally; Dread has no single target
//    in the rules (it weakens every enemy move), so its wave is aimed at the enemy side and its tremor marks sit on the
//    foes still standing, never as a hit.
//  - Note: one blade to the real target, one contact per real damage event. Finale of valor: one shared wave, one contact per struck foe;
//    finales of mending/dread only gather (their heal/barrier events keep the existing cues).
//  - Solo: the `Solo.` buff lands on one ally, so the pool/column sit on that ally. Evade: Sefa's own feet. Decoy: beside the covered ally.
export const SONG_ATLAS='song-shadow-fx';
export const songAtlasUrls=():[string,string]=>[`${import.meta.env.BASE_URL}assets/fx/song_shadow_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/song_shadow_fx.json`];
export const songSkills=['valor','finale','dread','note','solo','evade','decoy'] as const;
export type SongSkill=typeof songSkills[number];
export const isSongSkill=(action:string|undefined):action is SongSkill=>songSkills.some(s=>s===action);
export type SongSpot='hand'|'waist'|'feet';
export interface SongTarget {id:string;spot:SongSpot}
export interface SongSettle {at:SongTarget;/** drift from here to `at` (Valor flecks) */from?:SongTarget;event?:BattleEvent;outcome:'hit'|'blocked'|'dodged'}
export interface SongPlan {
  skill:SongSkill;casterId:string;prepare?:SongTarget;
  // One travelling/standing peak layer; `to` lists every real recipient whose centroid it travels toward.
  peak?:{from:SongTarget;to?:SongTarget[];outcome:'hit'|'blocked'|'dodged'};
  settles:SongSettle[];
  // Resolver events fully covered by the painted layers (no extra generic ring on them).
  events:BattleEvent[];
}
export interface SongPoint {x:number;y:number;size:number;side:1|-1}
export type SongLookup=(id:string,spot:SongSpot)=>SongPoint|undefined;
export interface SongContexts {front:FxContext;back:FxContext}

const outcomeOf=(e:BattleEvent):'hit'|'blocked'|'dodged'=>e.type==='dodge'?'dodged':e.type==='damage'&&!e.amount?'blocked':'hit';
export function songPlan(turn:TurnStage):SongPlan|undefined{
  if(turn.side!=='hero'||!isSongSkill(turn.action)||turn.events.some(e=>e.type==='cancel'))return;
  const skill=turn.action,id=turn.actorId,own=turn.events.filter(e=>e.sourceId===id);
  const standing=(side:'heroes'|'enemies')=>(turn.after??turn.state)[side].filter(a=>a.hp>0).map(a=>a.id);
  const feet=(who:string):SongTarget=>({id:who,spot:'feet'}),waist=(who:string):SongTarget=>({id:who,spot:'waist'}),hand:SongTarget={id,spot:'hand'};
  if(skill==='valor'||skill==='dread'){
    const event=own.find(e=>e.type==='song'&&e.targetId===id);if(!event)return;
    if(skill==='valor')return {skill,casterId:id,prepare:feet(id),peak:{from:feet(id),outcome:'hit'},events:[event],
      settles:standing('heroes').filter(a=>a!==id).map(a=>({from:feet(id),at:feet(a),outcome:'hit' as const}))};
    const foes=standing('enemies');
    return {skill,casterId:id,prepare:hand,peak:foes.length?{from:hand,to:foes.map(waist),outcome:'hit'}:undefined,events:[event],
      settles:foes.map(f=>({at:waist(f),outcome:'hit' as const}))};
  }
  if(skill==='note'){
    const hits=own.filter(e=>!!e.targetId&&(e.type==='damage'||e.type==='dodge'));if(!hits.length)return;
    return {skill,casterId:id,prepare:hand,peak:{from:hand,to:[waist(hits[0]!.targetId!)],outcome:outcomeOf(hits[0]!)},events:hits,
      settles:hits.filter(e=>e.type==='damage').map(e=>({at:waist(e.targetId!),event:e,outcome:outcomeOf(e)}))};
  }
  if(skill==='finale'){
    const event=own.find(e=>e.type==='finale');if(!event)return;
    const hits=event.text==='Finale of valor.'?own.filter(e=>!!e.targetId&&(e.type==='damage'||e.type==='dodge')):[];
    if(!hits.length)return {skill,casterId:id,prepare:hand,settles:[],events:[]};
    return {skill,casterId:id,prepare:hand,peak:{from:hand,to:hits.map(e=>waist(e.targetId!)),outcome:'hit'},events:[event,...hits],
      settles:hits.filter(e=>e.type==='damage').map(e=>({at:waist(e.targetId!),event:e,outcome:outcomeOf(e)}))};
  }
  if(skill==='solo'){
    const event=own.find(e=>e.type==='buff'&&e.text==='Solo.'&&!!e.targetId);if(!event)return;
    return {skill,casterId:id,prepare:feet(id),peak:{from:feet(event.targetId!),outcome:'hit'},events:[event],settles:[{at:feet(event.targetId!),outcome:'hit'}]};
  }
  const event=own.find(e=>e.type==='evade'&&(skill==='evade'?e.targetId===id:e.text==='Shadow cover.'&&!!e.targetId));if(!event)return;
  const at=feet(skill==='evade'?id:event.targetId!);
  return {skill,casterId:id,prepare:feet(id),peak:{from:at,outcome:'hit'},events:[event],settles:[{at,outcome:'hit'}]};
}

// Suggested canvas widths (px at a 390px game, 111px unit slot) from the art handoff.
const widths:Record<SongSkill,Record<'prepare'|'peak'|'settle',number>>={
  valor:{prepare:58,peak:76,settle:34},finale:{prepare:42,peak:98,settle:42},dread:{prepare:38,peak:78,settle:24},
  note:{prepare:32,peak:74,settle:34},solo:{prepare:56,peak:48,settle:44},evade:{prepare:62,peak:64,settle:54},decoy:{prepare:40,peak:46,settle:44}};
type Phase='prepare'|'peak'|'settle';
const FLOOR=['valor','solo','evade','decoy'] as const;
const onFloor=(skill:SongSkill)=>(FLOOR as readonly string[]).includes(skill);
// Floor layers sit behind the unit; body layers (hand/waist) in front.
export const songLayer=(skill:SongSkill):'front'|'back'=>onFloor(skill)?'back':'front';
// Floor layers sit behind the unit's sprite, so rings and pools are drawn wider than the art's suggested widths to stay readable around the legs.
const FLOOR_SCALE:Partial<Record<SongSkill,number>>={valor:1.9,solo:1.6,evade:1.7};
const RIM=new Set<SongSkill>(['valor','evade']),RIM_ALPHA=.6;
// The ghost of Decoy and Dread's tremor mark stand beside the target instead of on top of it.
const SIDE:Partial<Record<SongSkill,number>>={decoy:.34,dread:.3};

interface PaintOptions {phase:Phase;at:SongTarget;from?:SongTarget;to?:SongTarget[];outcome?:'hit'|'blocked'|'dodged'}
function paint(ctxs:SongContexts,plan:SongPlan,lookup:SongLookup,o:PaintOptions):Phaser.GameObjects.Image|undefined{
  const {skill}=plan,ctx=ctxs[songLayer(skill)],name=`${skill}_${o.phase}`,pivot=(art as Record<string,number[]>)[name]!;
  const first=lookup(o.at.id,o.at.spot);if(!first)return;
  const img=ctx.scene.add.image(first.x,first.y,SONG_ATLAS,name).setOrigin(pivot[0],pivot[1]);
  img.setData('songSkill',skill).setData('songPhase',o.phase).setData('songT',1);
  if(o.phase==='prepare')img.setData('songPrepare',true);
  const aim=o.phase==='peak'&&!!o.to;
  // Where the layer rests (centroid of the real recipients) and where a travelling layer starts.
  const rest=():SongPoint|undefined=>{
    if(!o.to)return lookup(o.at.id,o.at.spot);
    const pts=o.to.map(t=>lookup(t.id,t.spot)).filter((p):p is SongPoint=>!!p);if(!pts.length)return;
    return {x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:pts.reduce((s,p)=>s+p.y,0)/pts.length,size:pts[0]!.size,side:pts[0]!.side};
  };
  let rim:Phaser.GameObjects.Image|undefined;
  const follow=()=>{
    const end=rest(),begin=o.from?lookup(o.from.id,o.from.spot):end;if(!end||!begin||!img.active)return;
    const t=img.getData('songT') as number,base=widths[skill][o.phase]*(FLOOR_SCALE[skill]??1)*end.size/111/img.width*(ctx.quiet?.9:1);
    let x=begin.x+(end.x-begin.x)*t;const y=begin.y+(end.y-begin.y)*t;
    const sideDx=SIDE[skill];if(sideDx&&o.phase!=='prepare'){x+=sideDx*end.size*end.side*-1;}
    // Floor layers live inside their unit's body: positions are then relative to the body origin.
    const local=(img.getData('songLocal') as (()=>{x:number;y:number})|undefined)?.();
    img.setPosition(x-(local?.x??0),y-(local?.y??0));
    if(aim){const dx=end.x-begin.x,dy=end.y-begin.y,left=dx<0;
      // Art faces right; mirror for leftward travel and tilt along the real direction.
      img.setScale(left?-base:base,base).setRotation(left?Math.atan2(-dy,-dx):Math.atan2(dy,dx));}
    else img.setScale(base);
    if(rim?.active)rim.setPosition(x,y).setScale(img.scaleX,img.scaleY).setAlpha(img.alpha*RIM_ALPHA);
  };
  // Rings and wisps sit behind the sprite, so a fainter copy in front keeps a thin rim across the legs (art note: rear paint + thin foreground rim).
  if(RIM.has(skill)&&!ctx.reduced&&ctxs.front!==ctx){
    rim=ctxs.front.scene.add.image(first.x,first.y,SONG_ATLAS,name).setOrigin(pivot[0],pivot[1]);
    rim.setData('songRim',true);ctxs.front.add(rim);img.once('destroy',()=>rim?.destroy());
  }
  if(!ctx.reduced)img.setData('songFollow',follow);follow();ctx.add(img);
  if(o.outcome==='blocked'&&o.phase!=='prepare')img.setTint(0x8addf5);
  return img;
}
export function songPrepare(ctxs:SongContexts,turn:TurnStage,lookup:SongLookup,contactMs:number):boolean{
  const ctx=ctxs.front,plan=songPlan(turn);if(!plan?.prepare)return false;
  if(ctx.reduced)return true;
  const img=paint(ctxs,plan,lookup,{phase:'prepare',at:plan.prepare});if(!img)return true;img.setAlpha(.2);
  ctx.scene.tweens.add({targets:img,alpha:ctx.quiet?.56:.86,duration:Math.max(1,contactMs),onComplete:()=>img.destroy()});
  return true;
}
// One travelling/standing peak, then one settle per real recipient; all fade inside the existing contact window.
export function songContact(ctxs:SongContexts,plan:SongPlan,lookup:SongLookup,life:number):void{
  const ctx=ctxs.front,quiet=ctx.quiet,reduced=ctx.reduced;
  const peakOutcome=plan.peak?.outcome??'hit',opacity=(reduced?.76:quiet?.74:.98)*(peakOutcome==='dodged'?.6:1);
  const peak=plan.peak?paint(ctxs,plan,lookup,{phase:'peak',at:plan.peak.to?.[0]??plan.peak.from,from:plan.peak.to?plan.peak.from:undefined,to:plan.peak.to,outcome:peakOutcome}):undefined;
  peak?.setAlpha(opacity);
  // A travelling layer starts at the caster's hand; reduced motion keeps it still at its destination.
  if(peak&&plan.peak?.to&&!reduced){peak.setData('songT',0);(peak.getData('songFollow') as (()=>void)|undefined)?.();}
  const d=Math.max(1,Math.min(life,520));
  if(reduced){
    // No travel, no settle layers: one still layer at its destination that fades out.
    if(peak)ctx.scene.tweens.add({targets:peak,alpha:0,delay:Math.round(d*.45),duration:d,onComplete:()=>peak.destroy()});
    return;
  }
  const settles:Phaser.GameObjects.Image[]=[];
  for(const s of plan.settles){
    const img=paint(ctxs,plan,lookup,{phase:'settle',at:s.at,from:s.from,outcome:s.outcome});if(!img)continue;
    img.setAlpha(0);if(s.from)img.setData('songT',0);settles.push(img);
  }
  if(!peak&&!settles.length)return;
  const travel=!!plan.peak?.to;
  ctx.scene.tweens.add({targets:peak??settles[0]!,alpha:0,duration:d,onUpdate:t=>{
    const p=t.progress;
    if(peak?.active){
      if(travel)peak.setData('songT',Math.min(1,p/.55));
      peak.alpha=opacity*(settles.length?Math.max(0,1-Math.max(0,p-.45)/.4):Math.max(0,1-Math.max(0,p-.55)/.45));
    }
    for(const img of settles)if(img.active){
      img.alpha=opacity*Math.min(1,Math.max(0,(p-.32)/.22))*Math.max(0,1-Math.max(0,p-.72)/.28);
      if(plan.skill==='valor')img.setData('songT',Math.min(1,Math.max(0,(p-.30)/.5)));
    }
  },onComplete:()=>{peak?.destroy();for(const img of settles)img.destroy();}});
}
