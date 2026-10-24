import Phaser from 'phaser';
import type { BattleEvent, TurnStage } from '../../core/battle/types';
import type { FxContext } from './bolt-fx';

export const BLADE_ATLAS = 'blade-fx';
export const bladeAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/blade_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/blade_fx.json`];
// One painted family, ten silhouettes and continuous gestures. Cuts use the screen plane;
// thrusts follow the incoming axis. Count is decorative flecks, never additional strikes.
export const bladeSkills = {
  attack:   { shape: 'slash',  width: 112, height: 76, direction: -.45, turn: .35, travel: [4, 8],   offset: [0, 0],   life: 265, core: 40, count: 1 },
  finisher: { shape: 'slash',  width: 142, height: 88, direction: 1.15, turn: -.30, travel: [0, 18],  offset: [0, -6],  life: 300, core: 50, count: 2 },
  lunge:    { shape: 'thrust', width: 142, height: 66, direction: 0,    turn: 0,    travel: [24, 0],  offset: [-10, 0], life: 275, core: 42, count: 1 },
  sweep:    { shape: 'slash',  width: 172, height: 56, direction: .05,  turn: .40,  travel: [12, 0],  offset: [0, 5],   life: 300, core: 38, count: 2 },
  backstab: { shape: 'thrust', width: 104, height: 58, direction: 3.35, turn: -.12, travel: [-18, 0], offset: [12, -2], life: 235, core: 34, count: 1 },
  ambush:   { shape: 'slash',  width: 124, height: 92, direction: -.95, turn: -.65, travel: [6, -20], offset: [0, 8],   life: 280, core: 40, count: 1 },
  disarm:   { shape: 'slash',  width: 88,  height: 64, direction: -.65, turn: 1.05, travel: [-8, -8], offset: [-8, -8], life: 240, core: 30, count: 0 },
  parry:    { shape: 'slash',  width: 110, height: 72, direction: .85,  turn: -.85, travel: [14, -6], offset: [-4, 0],  life: 260, core: 38, count: 1 },
  pierce:   { shape: 'thrust', width: 184, height: 38, direction: 0,    turn: 0,    travel: [10, 0],  offset: [0, 0],   life: 260, core: 34, count: 1 },
  halt:     { shape: 'thrust', width: 88,  height: 82, direction: -.10, turn: .10,  travel: [3, 0],   offset: [-8, 0],  life: 290, core: 44, count: 0 },
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
function play(ctx: FxContext, img: Phaser.GameObjects.Image, name: string, life: number, travel: Point = { x: 0, y: 0 }, turn = 0): void {
  const peak = img.alpha;
  ctx.scene.tweens.add({ targets: img, alpha: 0, x: img.x + travel.x, y: img.y + travel.y, rotation: img.rotation + turn, duration: Math.max(1, life), ease: 'Cubic.Out',
    onUpdate: tween => {
      if (!img.active) return;
      const p = tween.progress, index = p < .08 ? 0 : p < .42 ? 1 : p < .74 ? 2 : 3;
      img.setFrame(`${name}_${String(index).padStart(2, '0')}`).setAlpha(peak * (p < .42 ? 1 : (1 - p) / .58));
    },
    onComplete: () => img.destroy() });
}
function settle(ctx: FxContext, img: Phaser.GameObjects.Image, life: number): void {
  const hold = Math.min(life * .3, 90);
  ctx.scene.tweens.add({ targets: img, alpha: 0, delay: hold, duration: Math.max(1, life - hold), onComplete: () => img.destroy() });
}
export function bladeCast(ctx: FxContext, from: Point, to: Point, contactMs: number, tint: number, skill: BladeSkill): void {
  if (ctx.reduced) return;
  const angle = Math.atan2(to.y - from.y, to.x - from.x), spec = bladeSkills[skill], s = ctx.scale;
  const facing = spec.shape === 'thrust' ? angle : 0;
  const glint = image(ctx, { x: from.x + Math.cos(angle) * 18 * s, y: from.y - 4 * s }, 'glint', 42 * s, tint).setAlpha(.3);
  glint.setDisplaySize((spec.shape === 'thrust' ? 58 : 38) * s, 26 * s).setRotation(facing + spec.direction - spec.turn);
  ctx.scene.tweens.add({ targets: glint, rotation: facing + spec.direction, alpha: .75, duration: contactMs, ease: 'Sine.In', onComplete: () => glint.destroy() });
}
export function bladeStance(ctx: FxContext, at: Point, life: number, tint: number): void {
  const glint = image(ctx, at, 'glint', 48 * ctx.scale, tint).setRotation(-.7).setAlpha(.7);
  if (!ctx.reduced) settle(ctx, glint, Math.min(life, 320));
}
export function bladeImpact(ctx: FxContext, cue: BladeCue, at: Point, from: Point | undefined, life: number, tint: number): void {
  const spec = bladeSkills[cue.skill], s = ctx.scale * (ctx.quiet ? .9 : 1);
  const angle = from ? Math.atan2(at.y - from.y, at.x - from.x) : 0;
  const facing = spec.shape === 'thrust' ? angle : 0;
  const local = (x: number, y: number): Point => ({ x: (Math.cos(facing) * x - Math.sin(facing) * y) * s, y: (Math.sin(facing) * x + Math.cos(facing) * y) * s });
  const offset = local(spec.offset[0], spec.offset[1]), travel = local(spec.travel[0], spec.travel[1]);
  const cutAt = { x: at.x + offset.x, y: at.y + offset.y };
  const blocked = cue.outcome === 'blocked', dodged = cue.outcome === 'dodged';
  // Shield contact faces the source; a miss passes outside the body without a contact star.
  const edge = { x: at.x - Math.cos(angle) * 18 * s, y: at.y - Math.sin(angle) * 18 * s };
  const miss = { x: at.x + Math.cos(angle) * 18 * s, y: at.y - 24 * s };
  if (ctx.reduced) {
    const still = image(ctx, dodged ? miss : blocked ? edge : cutAt, dodged ? 'pass' : blocked ? 'deflect' : `${spec.shape}_01`, 64 * s, blocked ? 0xbff3ff : tint).setRotation(dodged || blocked ? angle : facing + spec.direction).setAlpha(.72);
    if (!dodged && !blocked) still.setDisplaySize(spec.width * .82 * s, spec.height * .82 * s);
    return;
  }
  if (dodged) {
    const wisp = image(ctx, miss, 'pass', 72 * s, tint).setDisplaySize(spec.width * .7 * s, 46 * s).setRotation(angle + spec.direction).setAlpha(.6);
    ctx.scene.tweens.add({ targets: wisp, alpha: 0, x: miss.x + Math.cos(angle) * 16 * s, duration: Math.min(280, life), onComplete: () => wisp.destroy() }); return;
  }
  if (blocked || cue.event.absorbed) {
    const deflect = image(ctx, edge, 'deflect', 72 * s, 0xbff3ff).setRotation(angle).setAlpha(.8);
    settle(ctx, deflect, Math.min(320, life));
    if (blocked) return;
  }
  const ribbon = image(ctx, cutAt, `${spec.shape}_00`, spec.width * s, tint).setDisplaySize(spec.width * s, spec.height * s).setRotation(facing + spec.direction).setAlpha(.82);
  play(ctx, ribbon, spec.shape, Math.min(life, spec.life), travel, spec.turn);
  // Exactly one core at the resolved body contact; the travelling ribbon never creates another hit.
  const star = image(ctx, at, 'contact_00', spec.core * s, tint).setRotation(angle).setAlpha(.78);
  play(ctx, star, 'contact', Math.min(life, 180));
  if (ctx.quiet) return;
  for (let i = 0; i < spec.count; i++) {
    const a = angle + (i - (spec.count - 1) / 2) * .7;
    const fleck = image(ctx, at, 'flecks', 24 * s, tint).setRotation(a).setAlpha(.65);
    ctx.scene.tweens.add({ targets: fleck, x: at.x + Math.cos(a) * 20 * s, y: at.y + 14 * s, alpha: 0,
      duration: Math.min(life, 320), onComplete: () => fleck.destroy() });
  }
}
