import type {BattleEvent,TurnStage} from '../../core/battle/types';
import type {FxContext} from './bolt-fx';
import art from './foe-signature-art.json';

// AV06 foe signature VFX (ART-VFX-FOE-SIGNATURE-001): ten ordinary foe moves, one painted final each
// (prepare -> peak travel + independent impact -> settle). Presentation only; every cue comes from the enemy turn's real
// announced move and the damage/dodge events the resolver actually emitted (Guard redirects included):
//  - prepare gathers at the foe's forward hand (Veil Quake: its feet); no outcome is implied;
//  - travel flies right->left to the hero who actually took (or dodged) the hit; a dodge passes the hero and paints no impact;
//  - impact + settle only on a real damaged recipient (a fully absorbed hit reads blocked: small cyan impact, no settle);
//  - `all` intents draw one smaller instance per real recipient. Boss signature moves are not in this table.
export const FOE_SIGNATURE_ATLAS='foe-signature-fx';
export const foeSignatureAtlasUrls=():[string,string]=>[`${import.meta.env.BASE_URL}assets/fx/foe_signature_fx.webp`,`${import.meta.env.BASE_URL}assets/fx/foe_signature_fx.json`];
// Real intent name -> art slug. Veil Quake is the one physical, ground-level move.
export const foeSignatureMoves={
  'Seed Spark':'seed-spark','Ember Spark':'ember-spark','Spore Hex':'spore-hex','Spore Dust':'spore-dust','Star Flame':'star-flame',
  'Rune Lash':'rune-lash','Rift Needle':'rift-needle','Shard Burst':'shard-burst','Rift Bolt':'rift-bolt-foe','Veil Quake':'veil-quake',
  // W8: the Channeler's species move Rift Beam (not drawn in the package) shares its own Rift Bolt painting: same gesture, same caster.
  'Rift Beam':'rift-bolt-foe',
} as const;
export type FoeSignatureMove=keyof typeof foeSignatureMoves;
export const isFoeSignatureMove=(name:string|undefined):name is FoeSignatureMove=>!!name&&Object.prototype.hasOwnProperty.call(foeSignatureMoves,name);
export const isGroundMove=(move:FoeSignatureMove)=>move==='Veil Quake';

export interface FoeSignatureCue {move:FoeSignatureMove;sourceId:string;targetId:string;event:BattleEvent;outcome:'hit'|'blocked'|'dodged';total:number}
// chest = upper body of the recipient, hand = the foe's forward hand/chest, feet = ground contact.
export type FoeSpot='chest'|'hand'|'feet';
export interface FoePoint {x:number;y:number;size:number}
export type FoeLookup=(id:string,spot:FoeSpot)=>FoePoint|undefined;

// One cue per real damage/dodge event of the foe's own move. A cancelled turn paints nothing.
export function foeSignatureCues(turn:TurnStage):FoeSignatureCue[]{
  const move=turn.intent?.name;
  if(turn.side!=='enemy'||!isFoeSignatureMove(move)||turn.events.some(e=>e.type==='cancel'))return [];
  const events=turn.events.filter(e=>e.sourceId===turn.actorId&&!!e.targetId&&(e.type==='damage'||e.type==='dodge'));
  return events.map(event=>({move,sourceId:turn.actorId,targetId:event.targetId!,event,total:events.length,
    outcome:event.type==='dodge'?'dodged' as const:(event.amount??0)>0?'hit' as const:'blocked' as const}));
}

type Name=`${typeof foeSignatureMoves[FoeSignatureMove]}_${'prepare'|'travel'|'impact'|'settle'}`;
interface ArtInfo {pivot:[number,number];bounds:[number,number,number,number]}
const info=(name:string)=>(art as unknown as Record<string,ArtInfo>)[name]!;
const frameName=(move:FoeSignatureMove,beat:'prepare'|'travel'|'impact'|'settle'):Name=>`${foeSignatureMoves[move]}_${beat}`;
// Texture display widths (art handoff) of the whole 256px square at a 390px game / 111px unit slot.
const WIDTHS={prepare:40,travel:132,impact:52,settle:40};
const FRAME=256;
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));

const spread=(cue:FoeSignatureCue)=>cue.total>1?.78:1;
const px=(ctx:FxContext,beat:keyof typeof WIDTHS,size:number,cue:FoeSignatureCue,extra=1)=>WIDTHS[beat]*size/111/FRAME*(ctx.quiet?.9:1)*spread(cue)*extra;
// W8: Rift Bolt (black core) and Veil Quake (dark fissure) vanish over the dark Channeler/Golem bodies. A soft additive halo
// copy sits BEHIND the painting, slightly larger, so a light rim reads around the shape while its dark contours stay on top.
export const haloMoves:Readonly<Partial<Record<FoeSignatureMove,{tint:number;alpha:number;scale:number}>>>={
  'Rift Bolt':{tint:0xc4a2ff,alpha:.8,scale:1.18},'Rift Beam':{tint:0xc4a2ff,alpha:.8,scale:1.18},'Veil Quake':{tint:0xf0dcb0,alpha:.6,scale:1.1},
};
// Literals keep this module importable by node unit tests: Phaser.BlendModes.ADD and Phaser.TintModes.FILL. The halo is the
// painting's silhouette filled with one light colour, so it glows even where the painting itself is near black.
const ADD=1,FILL=1;
function halo(ctx:FxContext,img:Phaser.GameObjects.Image,name:Name,tag:string,move:FoeSignatureMove):void{
  const spec=haloMoves[move];if(!spec||tag==='settle')return;
  const glow=ctx.scene.add.image(0,0,FOE_SIGNATURE_ATLAS,name).setOrigin(img.originX,img.originY).setBlendMode(ADD).setTint(spec.tint).setTintMode(FILL);
  glow.setData('foeSigHalo',true);glow.setData('foeSigTag',tag);ctx.add(glow);
  const parent=img.parentContainer;if(parent&&glow.parentContainer===parent)parent.moveBelow(glow,img);
  const sync=()=>{
    if(!img.active||!glow.active){ctx.scene.events.off('postupdate',sync);if(glow.active)glow.destroy();return;}
    glow.setPosition(img.x,img.y).setScale(img.scaleX*spec.scale,img.scaleY*spec.scale).setRotation(img.rotation).setVisible(img.visible);
    glow.alpha=img.alpha*spec.alpha*(ctx.quiet?.7:1);
  };
  sync();ctx.scene.events.on('postupdate',sync);img.once('destroy',()=>{ctx.scene.events.off('postupdate',sync);if(glow.active)glow.destroy();});
}
function make(ctx:FxContext,name:Name,tag:string,cue:FoeSignatureCue):Phaser.GameObjects.Image{
  const img=ctx.scene.add.image(0,0,FOE_SIGNATURE_ATLAS,name),p=info(name).pivot;
  img.setOrigin(p[0],p[1]);img.setData('foeSigName',name);img.setData('foeSigTag',tag);img.setData('foeSigEvent',cue.event);img.setData('foeSigTarget',cue.targetId);
  ctx.add(img);halo(ctx,img,name,tag,cue.move);return img;
}
const dirOf=(from:FoePoint,to:FoePoint)=>(from.x>=to.x?1:-1) as 1|-1; // +1: the source stands to the right of the recipient (the normal case)
const spotOf=(cue:FoeSignatureCue,end:'source'|'target'):FoeSpot=>isGroundMove(cue.move)?'feet':end==='source'?'hand':'chest';

// Gather at the foe's forward hand (or feet), then fly to the real recipient. Arrives exactly at `contactMs`.
export function foeSignaturePrepare(ctx:FxContext,cues:readonly FoeSignatureCue[],lookup:FoeLookup,contactMs:number):void{
  const first=cues[0];if(ctx.reduced||!first)return;
  const ground=isGroundMove(first.move),quiet=ctx.quiet;
  const anticipation=Math.max(1,Math.round(contactMs*.26)),travel=Math.max(1,contactMs-anticipation);
  const glint=make(ctx,frameName(first.move,'prepare'),'prepare',first).setAlpha(.2);
  const follow=()=>{
    const from=lookup(first.sourceId,spotOf(first,'source')),to=lookup(first.targetId,spotOf(first,'target'));if(!from||!glint.active)return;
    const dir=to?dirOf(from,to):1,grow=.82+.18*clamp01(((glint.getData('foeSigAge') as number)??0));
    // Veil Quake gathers on the ground just ahead of the foe so the body does not hide it.
    glint.setPosition(from.x-(ground?dir*from.size*.22:0),from.y).setScale(px(ctx,'prepare',from.size,first,grow));
    if(dir<0)glint.setScale(-Math.abs(glint.scaleX),glint.scaleY);
  };
  glint.setData('foeSigFollow',follow);follow();
  ctx.scene.tweens.add({targets:glint,alpha:quiet?.55:.88,duration:anticipation,onUpdate:t=>{glint.setData('foeSigAge',t.progress);},onComplete:()=>glint.destroy()});
  for(const cue of cues)flight(ctx,cue,lookup,anticipation,travel);
}
// The travelling painting. Its left tip (head) leads and runs from the source landmark to the recipient (or past a dodger);
// the body trails behind it, so the shot emerges from the foe's hand instead of appearing mid-air.
// Poses it at flight progress t (0 = head at the foe's hand/feet, 1 = tip at the recipient or past a dodger).
function place(ctx:FxContext,img:Phaser.GameObjects.Image,cue:FoeSignatureCue,from:FoePoint,to:FoePoint,t:number):void{
  const ground=isGroundMove(cue.move),dir=dirOf(from,to),forward=-dir; // forward +1 = the flight points rightwards
  const bounds=info(frameName(cue.move,'travel')).bounds,span=FRAME-2*bounds[0];
  // Never longer than ~115% of the real flight (and not below 62% of the art size), so a close foe cannot smear the painting across its own body.
  const nominal=px(ctx,'travel',to.size,cue,1),fit=Math.max(.62,Math.min(1,Math.abs(from.x-to.x)*1.15/(span*nominal)));
  const s=nominal*fit,half=(FRAME/2-bounds[0])*s;
  const start={x:from.x-dir*(ground?from.size*.22:0),y:from.y};
  const tip=cue.outcome==='dodged'
    ?{x:to.x+forward*to.size*.55,y:to.y+to.size*(ground?0:.16)}
    :{x:to.x+forward*half*.1,y:to.y};
  img.setPosition(start.x+(tip.x-start.x)*t-forward*half,start.y+(tip.y-start.y)*t);
  // Energy paintings tilt along the real flight line; the ground wave stays flat.
  const dx=tip.x-start.x,dy=tip.y-start.y;
  if(dir>0){img.setScale(s);img.rotation=ground?0:Math.atan2(-dy,-dx);}
  else{img.setScale(-s,s);img.rotation=ground?0:Math.atan2(dy,dx);}
}
function flight(ctx:FxContext,cue:FoeSignatureCue,lookup:FoeLookup,anticipation:number,travel:number):void{
  const quiet=ctx.quiet,opacity=quiet?.72:.96;
  const img=make(ctx,frameName(cue.move,'travel'),'travel',cue).setAlpha(0).setVisible(false);
  img.setData('foeSigProgress',0);img.setData('foeSigOutcome',cue.outcome);
  const follow=()=>{
    const from=lookup(cue.sourceId,spotOf(cue,'source')),to=lookup(cue.targetId,spotOf(cue,'target'));if(!from||!to||!img.active)return;
    place(ctx,img,cue,from,to,img.getData('foeSigProgress') as number);
  };
  img.setData('foeSigFollow',follow);follow();
  const fadeOut=cue.outcome==='dodged'?.4:0;
  ctx.scene.tweens.add({targets:img,alpha:opacity,delay:anticipation,duration:travel,
    onStart:()=>{img.setVisible(true);},
    onUpdate:t=>{
      img.setData('foeSigProgress',t.progress);follow();
      img.alpha=opacity*Math.min(1,t.progress/.12)*(fadeOut?clamp01((1-t.progress)/fadeOut):1);
    },
    onComplete:()=>{
      // A hit's painting lingers briefly under the impact; a dodged one has already left the field.
      if(!img.active)return;
      if(cue.outcome==='dodged'){img.destroy();return;}
      ctx.scene.tweens.add({targets:img,alpha:0,duration:quiet?90:150,onComplete:()=>img.destroy()});
    }});
}

// Contact: the independent impact (+ settle) on a real damaged recipient. A dodge paints nothing here (its travel already passed).
export function foeSignatureContact(ctx:FxContext,cue:FoeSignatureCue,lookup:FoeLookup,life:number):void{
  const at=lookup(cue.targetId,spotOf(cue,'target'));if(!at)return;
  const ground=isGroundMove(cue.move),quiet=ctx.quiet,reduced=ctx.reduced,opacity=reduced?.76:quiet?.74:.98;
  const blocked=cue.outcome==='blocked',d=Math.max(1,Math.min(life,520));
  const paint=(name:Name,tag:string,extra=1)=>{
    const img=make(ctx,name,tag,cue).setAlpha(opacity);
    const follow=()=>{const p=lookup(cue.targetId,spotOf(cue,'target'));if(!p||!img.active)return;
      const dy=(img.getData('foeSigDrop') as number|undefined)??0;
      img.setPosition(p.x,p.y+dy*p.size).setScale(px(ctx,name.endsWith('settle')?'settle':'impact',p.size,cue,extra*((img.getData('foeSigGrow') as number|undefined)??1)));
      const src=lookup(cue.sourceId,spotOf(cue,'source'));if(src&&dirOf(src,p)<0)img.setScale(-Math.abs(img.scaleX),img.scaleY);};
    img.setData('foeSigFollow',follow);follow();if(blocked)img.setTint(0x8addf5);return img;
  };
  if(reduced){
    // Reduced motion: a short held peak at the truthful recipient, no sweep across faces.
    const from=lookup(cue.sourceId,spotOf(cue,'source')),still:Phaser.GameObjects.Image[]=[];
    if(from){const peak=make(ctx,frameName(cue.move,'travel'),'travel',cue);place(ctx,peak,cue,from,at,1);peak.setAlpha(opacity);still.push(peak);}
    if(cue.outcome!=='dodged'){const hold=paint(frameName(cue.move,'impact'),'impact',blocked?.7:1);hold.setData('foeSigFollow',undefined);still.push(hold);}
    ctx.scene.tweens.add({targets:still,alpha:0,delay:Math.round(d*.45),duration:d,onComplete:()=>{for(const i of still)i.destroy();}});
    return;
  }
  if(cue.outcome==='dodged')return;
  const impact=paint(frameName(cue.move,'impact'),'impact',blocked?.7:1);
  const settle=blocked||quiet?undefined:paint(frameName(cue.move,'settle'),'settle');settle?.setAlpha(0);
  ctx.scene.tweens.add({targets:impact,alpha:0,duration:Math.min(d,420),onUpdate:t=>{
    const p=t.progress;if(!impact.active)return;
    impact.setData('foeSigGrow',.72+.34*Math.min(1,p/.3));impact.alpha=opacity*(p<.38?1:Math.max(0,1-(p-.38)/.62));},
    onComplete:()=>impact.destroy()});
  if(settle)ctx.scene.tweens.add({targets:settle,alpha:0,duration:d,onUpdate:t=>{
    const p=t.progress;if(!settle.active)return;
    // Chips/ember tongues settle slightly downward while fading; the ground fissure stays put.
    settle.setData('foeSigDrop',ground?0:.09*p);settle.alpha=opacity*clamp01((p-.22)/.18)*Math.max(0,1-Math.max(0,p-.62)/.38);},
    onComplete:()=>settle.destroy()});
}
