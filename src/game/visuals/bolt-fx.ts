import Phaser from 'phaser';

// Bolt "Astral Thread" (docs/combat-presentation/vfx-art-direction, storyboard v1; owner passed the slice 2026-10-22):
// gather → comet head with a tapered, length-limited wake on a slight arc → petal burst at the real recipient's body →
// dissolving wisps. Painted layers from ART-VFX-BOLT-001 (public/assets/fx/bolt_fx.*), timed and placed in code.
// Presentation only: callers pass the actual recipient and outcome from events.
export const BOLT_ATLAS = 'bolt-fx';
export const boltAtlasUrls = (): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/bolt_fx.webp`, `${import.meta.env.BASE_URL}assets/fx/bolt_fx.json`];
type FxItem = Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
export interface FxContext {
  scene: Phaser.Scene;
  // Puts the object in the scene's effect layer, which cleanup destroys (and fades it when `fade` is given).
  add(item: FxItem, fade?: number): void;
  quiet: boolean; reduced: boolean;
  // Slot scale: 1 at a 96 px unit; effects shrink with the field.
  scale: number;
}
interface Point { x: number; y: number }
const INK = 0x2a1466, VIOLET = 0xa98bff, PEARL = 0xbff3ff;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
const frame = (name: string, i: number) => `${name}_${String(i).padStart(2, '0')}`;
const sprite = (ctx: FxContext, x: number, y: number, name: string, size: number): Phaser.GameObjects.Image => {
  const img = ctx.scene.add.image(x, y, BOLT_ATLAS, frame(name, 0)); img.setDisplaySize(size, size); ctx.add(img); return img;
};
// Steps an image through `count` atlas frames over `duration` ms after `delay`.
function play(ctx: FxContext, img: Phaser.GameObjects.Image, name: string, count: number, duration: number, delay = 0, loop = false): void {
  ctx.scene.tweens.addCounter({ from: 0, to: count - .001, duration, delay, repeat: loop ? -1 : 0,
    onUpdate: t => { if (img.active) img.setFrame(frame(name, Math.floor(t.getValue() ?? 0))); } });
}

// Gather at the staff, then fly the comet to the contact point on a slight arc; arrives exactly at `contactMs`.
export function boltCast(ctx: FxContext, from: Point, to: Point, contactMs: number): void {
  const { scene, scale: s, quiet } = ctx, angle = Math.atan2(to.y - from.y, to.x - from.x);
  const tip = { x: from.x + Math.cos(angle) * 18 * s, y: from.y + Math.sin(angle) * 18 * s - 8 * s };
  const gather = Math.min(85, Math.round(contactMs * .28)), travel = Math.max(1, contactMs - gather);
  // 01 Gather: the four cast-thread frames condense on the staff tip.
  const cast = sprite(ctx, tip.x, tip.y, 'cast_thread', 92 * s);
  play(ctx, cast, 'cast_thread', 4, gather);
  scene.tweens.add({ targets: cast, alpha: 0, delay: gather, duration: 140, onComplete: () => cast.destroy() });
  // 02 Travel: the comet head shimmers along a gentle upward arc; the tapered wake trails it, capped in length.
  const dist = Math.hypot(to.x - tip.x, to.y - tip.y), lift = Math.min(40 * s, dist * .14);
  const curve = new Phaser.Curves.QuadraticBezier(V(tip.x, tip.y), V((tip.x + to.x) / 2, (tip.y + to.y) / 2 - lift), V(to.x, to.y));
  const cap = Math.min((quiet ? 90 : 140) * s, dist / 2);
  const wake = scene.add.image(tip.x, tip.y, BOLT_ATLAS, 'tapered_wake_00').setOrigin(1, .5).setVisible(false); ctx.add(wake);
  const head = sprite(ctx, tip.x, tip.y, 'comet_core', 72 * s).setVisible(false);
  const core = scene.add.image(tip.x, tip.y, BOLT_ATLAS, 'light_core_00').setDisplaySize(40 * s, 40 * s).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.35).setVisible(false); ctx.add(core);
  play(ctx, head, 'comet_core', 4, 200, gather, true);
  const progress = { t: 0 };
  scene.tweens.add({ targets: progress, t: 1, delay: gather, duration: travel, ease: 'Sine.In',
    onStart: () => { head.setVisible(true); wake.setVisible(true); core.setVisible(true); },
    onUpdate: () => {
      const p = curve.getPoint(progress.t), ahead = curve.getTangent(Math.min(1, progress.t)), a = Math.atan2(ahead.y, ahead.x);
      const len = Math.min(cap, curve.getLength() * progress.t);
      head.setPosition(p.x, p.y).setRotation(a); core.setPosition(p.x, p.y).setRotation(a);
      wake.setPosition(p.x, p.y).setRotation(a).setDisplaySize(Math.max(1, len), 26 * s);
    },
    onComplete: () => { head.destroy(); wake.destroy(); core.destroy(); } });
}

// 03 Contact + 04 Dissolve at the real recipient. `blocked`: the barrier took the whole hit (no body flash, a smaller
// pearl burst at the shield); `dodged`: the bolt fizzles past without a burst.
export function boltImpact(ctx: FxContext, at: Point, from: Point | undefined, life: number, outcome: 'hit' | 'blocked' | 'dodged'): void {
  const { scene, scale: s, quiet, reduced } = ctx, angle = from ? Math.atan2(at.y - from.y, at.x - from.x) : 0;
  const sparks = (count: number, reach: number, spread: number, ms: number) => {
    for (let i = 0; i < count; i++) {
      const a = angle + (i - (count - 1) / 2) * spread, sp = scene.add.image(at.x, at.y, BOLT_ATLAS, frame('spark', i % 3)).setDisplaySize(7 * s, 7 * s);
      ctx.add(sp, ms);
      if (!reduced) scene.tweens.add({ targets: sp, x: at.x + Math.cos(a) * reach * s, y: at.y + Math.sin(a) * reach * s, duration: ms, ease: 'Quad.Out' });
    }
  };
  if (outcome === 'dodged') { sparks(quiet ? 2 : 5, 40, .3, Math.min(life, 280)); return; }
  const blocked = outcome === 'blocked', size = (blocked ? .75 : 1) * s, burst = Math.min(life, 360);
  // A dark under-layer keeps the light readable on violet foes.
  const shade = scene.add.graphics({ x: at.x, y: at.y });
  shade.fillStyle(INK, .22).fillCircle(0, 0, 24 * size); ctx.add(shade, Math.min(life, 260));
  const petals = sprite(ctx, at.x, at.y, 'impact_petals', 112 * size).setRotation(angle);
  if (blocked) petals.setTint(PEARL);
  // Reduced motion: an immediate, quieter static mark that leaves the target and its number readable.
  if (reduced) { petals.setFrame('impact_petals_03').setDisplaySize(72 * size, 72 * size).setAlpha(.5); shade.setAlpha(.5); return; }
  const bloom = Math.min(224, burst * .62);
  play(ctx, petals, 'impact_petals', 8, bloom);
  scene.tweens.add({ targets: petals, alpha: 0, delay: bloom, duration: Math.max(60, burst - bloom), onComplete: () => petals.destroy() });
  // A thin shockwave ring under the petals.
  const ring = scene.add.graphics({ x: at.x, y: at.y });
  ring.lineStyle(2.5 * size, blocked ? PEARL : VIOLET, .7).strokeCircle(0, 0, 30 * size); ring.setBlendMode(Phaser.BlendModes.ADD).setScale(.35);
  ctx.add(ring, burst);
  scene.tweens.add({ targets: ring, scale: 1.5, duration: burst, ease: 'Cubic.Out' });
  if (quiet) return;
  sparks(5, 34, .55, burst);
  if (blocked) return;
  // 04 Dissolve: the wisps curl around the target and fade upward.
  const delay = Math.min(130, life / 3), wisps = sprite(ctx, at.x, at.y, 'dissolve_wisps', 112 * s).setAlpha(0);
  play(ctx, wisps, 'dissolve_wisps', 4, Math.max(120, Math.min(220, life - delay)), delay);
  scene.tweens.add({ targets: wisps, alpha: { from: 1, to: 0 }, y: at.y - 14 * s, delay, duration: Math.max(80, life - delay), ease: 'Sine.In', onComplete: () => wisps.destroy() });
}
