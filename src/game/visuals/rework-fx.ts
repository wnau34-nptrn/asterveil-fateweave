import type Phaser from 'phaser';
import type { BattleEvent, BattleState, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';

export const REWORK_ATLAS = 'rework-fx';
export const reworkAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/rework_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/rework_fx.json`];
export type ReworkSpot = 'hand' | 'waist' | 'feet' | 'centre';
export type ReworkKind = 'venom_coat' | 'venom_stack' | 'venom_tick' | 'venom_burst' | 'venom_splash' | 'blade_storm' | 'shadow_cut' | 'shadow_afterimage' | 'arcane_gain' | 'arcane_release' | 'clash';
export interface ReworkCue { kind: ReworkKind; event: BattleEvent; id: string; spot: ReworkSpot; index: number; count: number; width: number }
// The event text is part of the resolver's existing presentation protocol. In particular, a disarm's initial hit is
// NOT a venom burst, and a poison tick can belong to the end of somebody else's turn.
export function reworkCues(turn: TurnStage): ReworkCue[] {
  const cancelled = turn.events.some(e => e.type === 'cancel');
  let blade = 0;
  const total = turn.events.filter(e => e.type === 'damage' && (e.amount ?? 0) > 0 && e.text === 'Blade storm.').length;
  return turn.events.flatMap(event => {
    if (!event.targetId || (cancelled && !(event.type === 'damage' && event.text === 'Poison.'))) return [];
    let kind: ReworkKind | undefined, spot: ReworkSpot = 'waist', width = 52, index = 0, count = 1;
    if (event.type === 'venom') { kind = event.sourceId === event.targetId ? 'venom_coat' : 'venom_stack'; if (kind === 'venom_coat') spot = 'hand'; else if (total && blade) { index = blade - 1; count = total; } }
    else if (event.type === 'arcane' && event.amount) { kind = event.amount > 0 ? 'arcane_gain' : 'arcane_release'; spot = 'hand'; width = event.amount > 0 ? 48 : 70 + Math.min(3, -event.amount) * 8; }
    else if (event.type === 'clash') { kind = 'clash'; spot = 'centre'; width = 90; }
    else if (event.type === 'damage' && (event.amount ?? 0) > 0) {
      if (event.text === 'Poison.') kind = 'venom_tick';
      else if (event.text === 'The venom bursts.') { kind = 'venom_burst'; spot = 'centre'; width = 90; }
      else if (event.text === 'The venom splashes.') { kind = 'venom_splash'; width = 50; }
      else if (turn.action === 'backstab' && event.sourceId === turn.actorId && event.text === 'Blade storm.') { kind = 'blade_storm'; spot = 'centre'; index = blade++; count = total; width = 76; }
      else if (turn.action === 'evade' && event.sourceId === turn.actorId) { kind = 'shadow_cut'; spot = 'centre'; width = 76; }
    } else if (turn.action === 'evade' && event.type === 'evade' && event.targetId === turn.actorId && event.sourceId === turn.actorId) { kind = 'shadow_afterimage'; spot = 'feet'; width = 95; }
    return kind ? [{kind, event, id: event.targetId, spot, width, index, count}] : [];
  });
}
export interface ReworkMark { id: string; frame: 'venom_emblem' | 'arcane_emblem'; count: number; spot: 'hand' | 'waist' }
export function reworkMarks(state: BattleState): ReworkMark[] {
  return [...state.enemies.filter(e => e.hp > 0 && e.venom).map(e => ({id:e.id, frame:'venom_emblem' as const, count:Math.min(3,e.venom!.stacks),spot:'waist' as const})),
    ...state.heroes.filter(h => h.hp > 0 && h.arcane).map(h => ({id:h.id,frame:'arcane_emblem' as const,count:Math.min(3,h.arcane!),spot:'hand' as const}))];
}
export function reworkContact(ctx: FxContext, cue: ReworkCue, at: {x:number;y:number}, life: number, feet?: {x:number;y:number}, from?: {x:number;y:number}): void {
  const blade = cue.kind === 'blade_storm';
  const frames = blade ? [`blade_storm_${cue.index % 4 + 1}`] : ['prepare','peak','end'].map(p => `${cue.kind}_${p}`);
  const sequence = cue.count > 1;
  const duration = blade || sequence ? life / (cue.count + .6) : life;
  const delay = sequence && !ctx.reduced ? cue.index * duration : 0;
  // A reduced-motion stage shows one quiet, static contact instead of four overlapping slashes.
  if (ctx.reduced && blade && cue.index > 0) return;
  const image = ctx.scene.add.image(at.x,at.y,REWORK_ATLAS,frames[ctx.reduced ? Math.min(1,frames.length-1) : 0]);
  image.setDisplaySize(cue.width * ctx.scale / 1.25, cue.width * ctx.scale / 1.25).setAlpha(ctx.reduced ? .55 : ctx.quiet ? .65 : .85);
  if (cue.kind === 'clash' && from) image.setRotation(Math.atan2(at.y-from.y,at.x-from.x) + Math.PI / 4);
  image.setData('reworkKind', cue.kind).setData('reworkEvent', cue.event);
  ctx.add(image);
  if (ctx.reduced) return;
  if (blade && cue.index === cue.count - 1) {
    const ring = ctx.scene.add.image(feet?.x ?? at.x,feet?.y ?? at.y,REWORK_ATLAS,'blade_storm_settle').setDisplaySize(66*ctx.scale/1.25,40*ctx.scale/1.25).setVisible(false);
    ring.setData('reworkKind','blade_storm_settle'); ctx.add(ring);
    ctx.scene.tweens.add({targets:ring,alpha:{from:.6,to:0},delay:cue.count*duration,duration:Math.max(1,life-cue.count*duration),onStart:()=>ring.setVisible(true),onComplete:()=>ring.destroy()});
  }
  image.setVisible(delay === 0);
  // All tween targets are owned images; scene cleanup kills them on skip/resize/hide/restart.
  // Preserve the painted prepare and peak; dissolve only during the existing end beat.
  ctx.scene.tweens.add({targets:image,alpha:{from:image.alpha,to:0},ease:blade?'Linear':(p:number)=>Math.max(0,(p-2/3)*3),delay,duration:Math.max(1,duration),onStart:()=>image.setVisible(true),
    onUpdate:(tween:Phaser.Tweens.Tween)=>{if(image.active)image.setFrame(frames[Math.min(frames.length-1,Math.floor(tween.progress*frames.length))]!);},onComplete:()=>image.destroy()});
}
