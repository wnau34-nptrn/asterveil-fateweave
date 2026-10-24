import Phaser from 'phaser';
import type { BattleEvent, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';

export const BLADE_ATLAS = 'blade-fx';
export const bladeAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/blade_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/blade_fx.json`];
// One painted family. Count is decorative flecks, never additional strikes.
export const bladeSkills = {
  attack: { shape: 'slash', scale: .95, direction: -.28, count: 2 },
  finisher: { shape: 'slash', scale: 1.12, direction: -.5, count: 3 },
  lunge: { shape: 'thrust', scale: 1.05, direction: 0, count: 2 },
  sweep: { shape: 'slash', scale: 1.18, direction: 0, count: 2 },
  backstab: { shape: 'thrust', scale: 1, direction: .25, count: 2 },
  ambush: { shape: 'slash', scale: 1, direction: .6, count: 2 },
  disarm: { shape: 'slash', scale: .98, direction: -.8, count: 1 },
  parry: { shape: 'slash', scale: .98, direction: .8, count: 2 },
  pierce: { shape: 'thrust', scale: 1.08, direction: 0, count: 2 },
  halt: { shape: 'thrust', scale: .98, direction: -.15, count: 1 },
} as const;
export type BladeSkill = keyof typeof bladeSkills;
export const isBladeSkill = (action: string | undefined): action is BladeSkill => !!action && Object.hasOwn(bladeSkills, action);
// The skill icons' class families: Knight blue/gold, Duelist rose, Scout steel blue, Spear teal.
export const bladePalettes: Readonly<Record<string, number>> = {
  Knight: 0xffda93, Duelist: 0xffc8dc, Scout: 0xa7c9ec, Spear: 0x8de3d8,
  Archer: 0xb3dfa6, Alchemist: 0xffd69b, Warden: 0xc4d1df, Bard: 0xffc1af,
  Mage: 0xd9c7ff, Priest: 0xffedbb,
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
function image(ctx: FxContext, at: Point, frame: string, size: number, tint: number): Phaser.GameObjects.Image {
  const img = ctx.scene.add.image(at.x, at.y, BLADE_ATLAS, frame).setDisplaySize(size, size).setTint(tint);
  ctx.add(img); return img;
}
// All tweens target owned images, so BattleScene.stopEffects cancels every pending animation.
function play(ctx: FxContext, img: Phaser.GameObjects.Image, name: string, life: number): void {
  // Frame progress is independent of opacity: the broad peak stays opaque before the dissolve.
  ctx.scene.tweens.add({ targets: img, alpha: 0, duration: Math.max(1, life), ease: 'Linear',
    onUpdate: tween => {
      if (!img.active) return;
      const p = tween.progress, index = p < .10 ? 0 : p < .52 ? 1 : p < .80 ? 2 : 3;
      img.setFrame(`${name}_${String(index).padStart(2, '0')}`).setAlpha(p < .52 ? 1 : (1 - p) / .48);
    },
    onComplete: () => img.destroy() });
}
function settle(ctx: FxContext, img: Phaser.GameObjects.Image, life: number): void {
  const hold = Math.min(life * .3, 90);
  ctx.scene.tweens.add({ targets: img, alpha: 0, delay: hold, duration: Math.max(1, life - hold), onComplete: () => img.destroy() });
}
export function bladeCast(ctx: FxContext, from: Point, to: Point, contactMs: number, tint: number): void {
  if (ctx.reduced) return;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const glint = image(ctx, { x: from.x + Math.cos(angle) * 18 * ctx.scale, y: from.y - 4 * ctx.scale }, 'glint', 60 * ctx.scale, tint).setAlpha(.45);
  glint.setRotation(angle);
  ctx.scene.tweens.add({ targets: glint, alpha: 1, duration: contactMs, ease: 'Sine.In', onComplete: () => glint.destroy() });
}
export function bladeStance(ctx: FxContext, at: Point, life: number, tint: number): void {
  const glint = image(ctx, at, 'glint', 64 * ctx.scale, tint).setAlpha(.85);
  if (!ctx.reduced) settle(ctx, glint, Math.min(life, 320));
}
export function bladeImpact(ctx: FxContext, cue: BladeCue, at: Point, from: Point | undefined, life: number, tint: number): void {
  const spec = bladeSkills[cue.skill], s = ctx.scale * spec.scale;
  const angle = from ? Math.atan2(at.y - from.y, at.x - from.x) : 0;
  const blocked = cue.outcome === 'blocked', dodged = cue.outcome === 'dodged';
  // Shield contact faces the source; a miss passes outside the body without a contact star.
  const edge = { x: at.x - Math.cos(angle) * 18 * s, y: at.y - Math.sin(angle) * 18 * s };
  const miss = { x: at.x + Math.cos(angle) * 18 * s, y: at.y - 24 * s };
  if (ctx.reduced) {
    image(ctx, dodged ? miss : blocked ? edge : at, dodged ? 'pass' : blocked ? 'deflect' : `${spec.shape}_01`, (dodged ? 54 : 84) * s, blocked ? 0xbff3ff : tint).setRotation(angle + spec.direction).setAlpha(.72);
    return;
  }
  if (dodged) {
    const wisp = image(ctx, miss, 'pass', 86 * s, tint).setRotation(angle).setAlpha(.7);
    ctx.scene.tweens.add({ targets: wisp, alpha: 0, x: miss.x + Math.cos(angle) * 16 * s, duration: Math.min(280, life), onComplete: () => wisp.destroy() }); return;
  }
  if (blocked || cue.event.absorbed) {
    const deflect = image(ctx, edge, 'deflect', 90 * s, 0xbff3ff).setRotation(angle);
    settle(ctx, deflect, Math.min(320, life));
    if (blocked) return;
  }
  const ribbon = image(ctx, at, `${spec.shape}_00`, (ctx.quiet ? 118 : 140) * s, tint).setRotation(angle + spec.direction);
  play(ctx, ribbon, spec.shape, Math.min(life, 350));
  const star = image(ctx, at, 'contact_00', 64 * s, tint).setRotation(angle);
  play(ctx, star, 'contact', Math.min(life, 230));
  if (ctx.quiet) return;
  for (let i = 0; i < spec.count; i++) {
    const a = angle + (i - (spec.count - 1) / 2) * .7;
    const fleck = image(ctx, at, 'flecks', 36 * s, tint).setRotation(a);
    ctx.scene.tweens.add({ targets: fleck, x: at.x + Math.cos(a) * 20 * s, y: at.y + 14 * s, alpha: 0,
      duration: Math.min(life, 320), onComplete: () => fleck.destroy() });
  }
}
