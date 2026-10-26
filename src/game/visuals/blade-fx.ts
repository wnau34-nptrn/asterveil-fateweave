import Phaser from 'phaser';
import type { BattleEvent, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';

export const BLADE_ATLAS = 'blade-fx';
export const bladeAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/blade_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/blade_fx.json`];
// Selected concept silhouettes, including the thicker Pierce R2. One atlas; per-skill values
// describe footprint and ONE continuous gesture. Decorative flecks never represent extra hits.
export const bladeSkills = {
  attack:   { width:84, height:76, axial:false, cross:1, family:'Duelist', life:270, turn:.22, travel:[4,6], core:14, count:1 },
  finisher: { width:88, height:110, axial:false, cross:1, family:'Duelist', life:310, turn:-.16, travel:[0,12], core:18, count:2 },
  lunge:    { width:116, height:62, axial:true, cross:1, family:'Duelist', life:285, turn:0, travel:[18,0], core:15, count:1 },
  sweep:    { width:142, height:54, axial:false, cross:1, family:'Duelist', life:310, turn:.16, travel:[10,0], core:13, count:1 },
  backstab: { width:76, height:46, axial:true, cross:1, family:'Scout', life:255, turn:0, travel:[-12,0], core:12, count:0 },
  ambush:   { width:88, height:104, axial:false, cross:1, family:'Scout', life:295, turn:-.18, travel:[4,-14], core:14, count:1 },
  disarm:   { width:62, height:72, axial:false, cross:1, family:'Scout', life:260, turn:.45, travel:[-5,-5], core:10, count:0 },
  parry:    { width:88, height:74, axial:false, cross:1, family:'Duelist', life:280, turn:-.32, travel:[8,-3], core:13, count:1 },
  pierce:   { width:130, height:58, axial:true, cross:1.4, family:'Spear', life:285, turn:0, travel:[12,0], core:14, count:1 },
  halt:     { width:74, height:62, axial:true, cross:1, family:'Spear', life:300, turn:0, travel:[2,0], core:16, count:0 },
} as const;
export type BladeSkill = keyof typeof bladeSkills;
export const isBladeSkill = (action: string | undefined): action is BladeSkill => !!action && Object.hasOwn(bladeSkills, action);
// The skill icons' class families: Knight blue/gold, Duelist rose, Scout steel blue, Spear teal.
export const bladePalettes: Readonly<Record<string, number>> = {
  Knight: 0xffda93, Duelist: 0xffc8dc, Scout: 0xa7c9ec, Spear: 0x8de3d8,
  Archer: 0xb3dfa6, Alchemist: 0xffd69b, Warden: 0xc4d1df, Bard: 0xffc1af,
  Mage: 0xd9c7ff, Priest: 0xffedbb, Saint: 0xffedbb, Dancer: 0xf0bfdc,
};
export interface BladeCue { skill: BladeSkill; event: BattleEvent; outcome: 'hit' | 'blocked' | 'dodged'; parried: boolean }
// Resolve routing from events, including Parry's later enemy-stage counter. Never synthesize a hit from a selected target.
export function bladeCues(turn: TurnStage): BladeCue[] {
  if (turn.events.some(e => e.type === 'cancel')) return [];
  return turn.events.flatMap(event => {
    const parried = event.type === 'counter' && turn.events.some(e => e.type === 'parry' && e.sourceId === event.sourceId && e.targetId === event.targetId);
    const primary = ((turn.side === 'hero' && isBladeSkill(turn.action) && turn.action !== 'parry') || (turn.side === 'enemy' && turn.intent?.kind === 'physical')) && event.sourceId === turn.actorId && (event.type === 'damage' || event.type === 'dodge');
    if (!primary && !parried) return [];
    return [{ skill: parried ? 'parry' : turn.side === 'enemy' ? 'attack' : turn.action as BladeSkill, event, parried,
      outcome: event.type === 'dodge' ? 'dodged' : (event.amount ?? 0) > 0 ? 'hit' : 'blocked' }];
  });
}
interface Point { x: number; y: number }
function image(ctx: FxContext, at: Point, frame: string, width: number, height: number, tint: number, cross = 1): Phaser.GameObjects.Image {
  const img = ctx.scene.add.image(at.x, at.y, BLADE_ATLAS, frame).setTint(tint);
  const fit = Math.min(width / img.width, height / (img.height * cross));
  img.setDisplaySize(img.width * fit, img.height * fit * cross);
  ctx.add(img); return img;
}
const ease = (p: number) => 1 - (1 - Phaser.Math.Clamp(p, 0, 1)) ** 3;
const ramp = (p: number, start: number, end: number) => Phaser.Math.Clamp((p - start) / (end - start), 0, 1);
// The selected boards use fixed CSS footprints at a large 390px slot (the context's 1.25 scale).
const scale = (ctx: FxContext) => ctx.scale / 1.25 * (ctx.quiet ? .9 : 1);
const artTint = (skill: BladeSkill, tint: number) => tint === bladePalettes[bladeSkills[skill].family] ? 0xffffff : tint;
function paint(ctx: FxContext, at: Point, skill: BladeSkill, phase: string, size: number, tint: number): Phaser.GameObjects.Image {
  const spec = bladeSkills[skill];
  return image(ctx, at, `${skill}_${phase}`, spec.width * size, spec.height * size, artTint(skill, tint), spec.cross);
}
// Every tween targets an owned image. stopEffects kills it and destroys its paired tail as well.
function settle(ctx: FxContext, img: Phaser.GameObjects.Image, life: number): void {
  ctx.scene.tweens.add({ targets: img, alpha: 0, duration: Math.max(1, life), onComplete: () => img.destroy() });
}
export function bladeCast(ctx: FxContext, from: Point, to: Point, contactMs: number, tint: number, skill: BladeSkill): void {
  if (ctx.reduced) return;
  const angle = Math.atan2(to.y - from.y, to.x - from.x), spec = bladeSkills[skill], s = scale(ctx);
  const at = { x: from.x + Math.cos(angle) * 18 * s, y: from.y + Math.sin(angle) * 18 * s - 4 * s };
  const glint = paint(ctx, at, skill, 'prepare', s * .36, tint).setAlpha(.3);
  const facing = spec.axial ? angle : 0;
  glint.setRotation(facing - spec.turn * .5);
  ctx.scene.tweens.add({ targets: glint, rotation: facing, alpha: .65, duration: Math.max(1, contactMs), ease: 'Sine.In', onComplete: () => glint.destroy() });
}
export function bladeStance(ctx: FxContext, at: Point, life: number, tint: number): void {
  const brace = paint(ctx, at, 'parry', 'prepare', scale(ctx) * .45, tint).setAlpha(.7);
  if (!ctx.reduced) settle(ctx, brace, Math.min(life, 320));
}
export function bladeImpact(ctx: FxContext, cue: BladeCue, at: Point, from: Point | undefined, life: number, tint: number): void {
  const spec = bladeSkills[cue.skill], s = scale(ctx);
  const angle = from ? Math.atan2(at.y - from.y, at.x - from.x) : 0;
  const facing = spec.axial ? angle : 0;
  const blocked = cue.outcome === 'blocked', dodged = cue.outcome === 'dodged';
  const edge = { x: at.x - Math.cos(angle) * 18 * s, y: at.y - Math.sin(angle) * 18 * s };
  // A resolved miss travels on a parallel lane outside the body, with no core or body damage flash.
  const miss = { x: at.x + Math.cos(angle) * 16 * s - Math.sin(angle) * 48 * s, y: at.y + Math.sin(angle) * 16 * s + Math.cos(angle) * 48 * s };
  if (dodged) {
    const wisp = paint(ctx, miss, cue.skill, 'tail', s * .7, tint).setRotation(facing).setAlpha(.45);
    if (!ctx.reduced) ctx.scene.tweens.add({ targets: wisp, alpha: 0, x: miss.x + Math.cos(angle) * 14 * s, y: miss.y + Math.sin(angle) * 14 * s,
      duration: Math.max(1, Math.min(240, life)), onComplete: () => wisp.destroy() });
    return;
  }
  if (blocked || cue.event.absorbed) {
    const deflect = image(ctx, edge, 'deflect', 52 * s, 52 * s, 0xbff3ff).setRotation(angle).setAlpha(.8);
    if (!ctx.reduced) settle(ctx, deflect, Math.min(260, life));
    if (blocked) return;
  }
  const peak = paint(ctx, at, cue.skill, 'peak', s, tint).setRotation(facing).setAlpha(ctx.reduced ? .72 : .88);
  if (ctx.reduced) return;
  const tail = paint(ctx, at, cue.skill, 'tail', s * .76, tint).setRotation(facing).setAlpha(0);
  const w = peak.displayWidth, h = peak.displayHeight;
  const travel = { x: (Math.cos(facing) * spec.travel[0] - Math.sin(facing) * spec.travel[1]) * s,
    y: (Math.sin(facing) * spec.travel[0] + Math.cos(facing) * spec.travel[1]) * s };
  ctx.scene.tweens.add({ targets: peak, alpha: 0, duration: Math.max(1, Math.min(life, spec.life)),
    onUpdate: tween => {
      if (!peak.active || !tail.active) return;
      const p = tween.progress, move = ease(p), blend = ramp(p, .38, .66), grow = .92 + .08 * ease(p / .24);
      peak.setPosition(at.x + travel.x * move, at.y + travel.y * move).setRotation(facing + spec.turn * move)
        .setDisplaySize(w * grow, h * grow).setAlpha(.88 * (1 - blend));
      tail.setPosition(peak.x, peak.y).setRotation(peak.rotation).setAlpha(.5 * blend * (1 - ramp(p, .7, 1)));
    },
    onComplete: () => { peak.destroy(); tail.destroy(); } });
  // One tiny core at the authoritative contact, never a second burst along the travelling edge.
  const core = image(ctx, at, 'contact_00', spec.core * s, spec.core * s, tint).setAlpha(.65);
  settle(ctx, core, Math.min(150, life));
  if (ctx.quiet) return;
  for (let i = 0; i < spec.count; i++) {
    const a = angle + (i - (spec.count - 1) / 2) * .6;
    const fleck = image(ctx, at, 'flecks', 16 * s, 16 * s, tint).setRotation(a).setAlpha(.45);
    ctx.scene.tweens.add({ targets: fleck, x: at.x + Math.cos(a) * 14 * s, y: at.y + 8 * s, alpha: 0,
      duration: Math.max(1, Math.min(life, 240)), onComplete: () => fleck.destroy() });
  }
}
