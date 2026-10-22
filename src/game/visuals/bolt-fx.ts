import Phaser from 'phaser';

// Bolt "Astral Thread" (docs/combat-presentation/vfx-art-direction, storyboard v1): gather → comet head with a
// tapered, length-limited wake on a slight arc → star burst with a shockwave at the real recipient's body →
// dissolving threads. Code-drawn layers only (no storyboard pixels). Presentation only: callers pass the actual
// recipient and outcome from events.
export interface FxContext {
  scene: Phaser.Scene;
  // Puts the object in the scene's effect layer, which cleanup destroys (and fades it when `fade` is given).
  add(item: Phaser.GameObjects.Graphics, fade?: number): void;
  quiet: boolean; reduced: boolean;
  // Slot scale: 1 at a 96 px unit; effects shrink with the field.
  scale: number;
}
interface Point { x: number; y: number }
const CORE = 0xf3f8ff, SKY = 0x9fd8ff, VIOLET = 0xa98bff, DEEP = 0x7a5cf0, INK = 0x2a1466, PEARL = 0x9be6f5;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
const glow = (g: Phaser.GameObjects.Graphics) => g.setBlendMode(Phaser.BlendModes.ADD);

function star(g: Phaser.GameObjects.Graphics, r: number, inner = .2): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * inner : r; pts.push(V(Math.cos(a) * rr, Math.sin(a) * rr)); }
  g.fillPoints(pts, true);
}
// A thin spike from the origin along angle `a`.
const spike = (a: number, len: number, w: number) => [V(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w), V(Math.cos(a) * len, Math.sin(a) * len), V(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w)];
// Uneven ray lengths so the burst never reads as a symmetric snowflake.
const RAYS = [1, .55, .82, .45, .95, .6, .72, .5];

// Gather at the staff, then fly the comet to the contact point on a slight arc; arrives exactly at `contactMs`.
export function boltCast(ctx: FxContext, from: Point, to: Point, contactMs: number): void {
  const { scene, scale: s, quiet } = ctx, angle = Math.atan2(to.y - from.y, to.x - from.x);
  const tip = { x: from.x + Math.cos(angle) * 18 * s, y: from.y + Math.sin(angle) * 18 * s - 8 * s };
  const gather = Math.min(85, Math.round(contactMs * .28)), travel = Math.max(1, contactMs - gather);
  // 01 Gather: a soft halo, a sweeping violet crescent and a condensing bright core, drawn above the caster.
  const halo = scene.add.graphics({ x: tip.x, y: tip.y });
  halo.fillStyle(DEEP, .22).fillCircle(0, 0, 30 * s).fillStyle(VIOLET, .25).fillCircle(0, 0, 18 * s); glow(halo).setScale(.4);
  ctx.add(halo, gather + 140);
  scene.tweens.add({ targets: halo, scale: 1, duration: gather, ease: 'Quad.Out' });
  const crescent = scene.add.graphics({ x: tip.x, y: tip.y });
  crescent.lineStyle(9 * s, INK, .35).beginPath().arc(0, 0, 30 * s, -2.8, 0).strokePath();
  crescent.lineStyle(5 * s, VIOLET, 1).beginPath().arc(0, 0, 30 * s, -2.6, -0.2).strokePath();
  crescent.lineStyle(2.2 * s, CORE, 1).beginPath().arc(0, 0, 28 * s, -2.3, -0.5).strokePath();
  crescent.lineStyle(1.4 * s, SKY, .9).beginPath().arc(0, 0, 22 * s, .4, 1.9).strokePath();
  ctx.add(crescent, gather + 180);
  scene.tweens.add({ targets: crescent, rotation: 1.8, duration: gather + 180, ease: 'Sine.Out' });
  const core = scene.add.graphics({ x: tip.x, y: tip.y });
  core.fillStyle(VIOLET, .6).fillCircle(0, 0, 14 * s).fillStyle(SKY, .9).fillCircle(0, 0, 7 * s).fillStyle(CORE, 1);
  star(core, 12 * s, .22); glow(core).setScale(.2); ctx.add(core);
  scene.tweens.add({ targets: core, scale: 1, rotation: .8, duration: gather, ease: 'Quad.Out', onComplete: () => core.destroy() });
  if (!quiet) for (let i = 0; i < 4; i++) {
    const a = angle + Math.PI + (i - 1.5) * .75, spark = scene.add.graphics({ x: tip.x + Math.cos(a) * 26 * s, y: tip.y + Math.sin(a) * 26 * s });
    spark.fillStyle(CORE, 1).fillCircle(0, 0, 1.8 * s); glow(spark); ctx.add(spark);
    scene.tweens.add({ targets: spark, x: tip.x, y: tip.y, alpha: .3, duration: gather, ease: 'Quad.In', onComplete: () => spark.destroy() });
  }
  // 02 Travel: a comet on a gentle upward arc with a halo and a tapered wake that follows the path, capped in length.
  const dist = Math.hypot(to.x - tip.x, to.y - tip.y), lift = Math.min(40 * s, dist * .14);
  const curve = new Phaser.Curves.QuadraticBezier(V(tip.x, tip.y), V((tip.x + to.x) / 2, (tip.y + to.y) / 2 - lift), V(to.x, to.y));
  const cap = Math.min((quiet ? 70 : 120) * s, dist / 2), trail: Phaser.Math.Vector2[] = [];
  const wake = scene.add.graphics(); glow(wake); ctx.add(wake);
  const head = scene.add.graphics({ x: tip.x, y: tip.y });
  const needle = [V(26 * s, 0), V(0, -7 * s), V(-12 * s, 0), V(0, 7 * s)];
  head.fillStyle(DEEP, .3).fillCircle(0, 0, 24 * s).fillStyle(VIOLET, .55).fillCircle(0, 0, 14 * s).fillStyle(SKY, 1).fillPoints(needle, true).fillStyle(CORE, 1);
  star(head, 13 * s, .22);
  head.setRotation(angle).setVisible(false); glow(head); ctx.add(head);
  const drawWake = () => {
    wake.clear();
    // Keep only the points within the length cap behind the head.
    let len = 0; const pts = [trail[trail.length - 1]!];
    for (let i = trail.length - 2; i >= 0 && len < cap; i--) { len += trail[i]!.distance(trail[i + 1]!); pts.push(trail[i]!); }
    if (pts.length < 2) return;
    for (const [w, color, alpha] of [[16, DEEP, .3], [9, VIOLET, .6], [3.4, SKY, .95]] as const) {
      for (let i = 0; i < pts.length - 1; i++) { const k = 1 - i / (pts.length - 1); wake.lineStyle(Math.max(.5, w * s * k), color, alpha * (.35 + .65 * k)).lineBetween(pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y); }
    }
  };
  const progress = { t: 0 };
  scene.tweens.add({ targets: progress, t: 1, delay: gather, duration: travel, ease: 'Sine.In',
    onStart: () => head.setVisible(true),
    onUpdate: () => {
      const p = curve.getPoint(progress.t), ahead = curve.getTangent(Math.min(1, progress.t));
      head.setPosition(p.x, p.y).setRotation(Math.atan2(ahead.y, ahead.x)); trail.push(p.clone()); drawWake();
    },
    onComplete: () => { head.destroy(); wake.destroy(); } });
}

// 03 Contact + 04 Dissolve at the real recipient. `blocked`: the barrier took the whole hit (no body flash, a smaller
// pearl burst at the shield); `dodged`: the bolt fizzles past without a burst.
export function boltImpact(ctx: FxContext, at: Point, from: Point | undefined, life: number, outcome: 'hit' | 'blocked' | 'dodged'): void {
  const { scene, scale: s, quiet, reduced } = ctx, angle = from ? Math.atan2(at.y - from.y, at.x - from.x) : 0;
  if (outcome === 'dodged') {
    for (let i = 0; i < (quiet ? 2 : 5); i++) {
      const a = angle + (i - 2) * .3, spark = scene.add.graphics({ x: at.x, y: at.y });
      spark.fillStyle(i % 2 ? CORE : SKY, .95).fillCircle(0, 0, 1.8 * s); glow(spark); ctx.add(spark, Math.min(life, 280));
      if (!reduced) scene.tweens.add({ targets: spark, x: at.x + Math.cos(a) * 40 * s, y: at.y + Math.sin(a) * 40 * s, duration: Math.min(life, 280), ease: 'Quad.Out' });
    }
    return;
  }
  const blocked = outcome === 'blocked', tint = blocked ? PEARL : VIOLET, size = (blocked ? .75 : 1) * s, burst = Math.min(life, 360);
  // A dark under-layer keeps the light readable on violet foes.
  const shade = scene.add.graphics({ x: at.x, y: at.y });
  shade.fillStyle(INK, .22).fillCircle(0, 0, 24 * size); ctx.add(shade, Math.min(life, 260));
  // Uneven rays, the longest along the bolt's direction, around a bright four-point core.
  const rays = scene.add.graphics({ x: at.x, y: at.y });
  const count = quiet ? 5 : RAYS.length;
  for (let i = 0; i < count; i++) {
    const a = angle + i * Math.PI * 2 / count, len = 58 * size * RAYS[i]!;
    rays.fillStyle(tint, .55).fillPoints(spike(a, len, 5 * size), true).fillStyle(CORE, .95).fillPoints(spike(a, len * .7, 1.6 * size), true);
  }
  glow(rays); ctx.add(rays, burst);
  const flash = scene.add.graphics({ x: at.x, y: at.y });
  flash.fillStyle(tint, .55); star(flash, 30 * size, .2); flash.fillStyle(CORE, 1); star(flash, 18 * size, .2); flash.fillCircle(0, 0, 4 * size);
  flash.setRotation(angle + Math.PI / 4); glow(flash); ctx.add(flash, Math.min(life, 240));
  // Reduced motion: an immediate, quieter static mark that leaves the target and its number readable.
  if (reduced) { rays.setScale(.65).setAlpha(.45); flash.setScale(.6).setAlpha(.5); shade.setAlpha(.5); return; }
  // Shockwave: one expanding ring with a faint inner echo.
  const ring = scene.add.graphics({ x: at.x, y: at.y });
  ring.lineStyle(4 * size, tint, .8).strokeCircle(0, 0, 30 * size).lineStyle(1.5 * size, CORE, .8).strokeCircle(0, 0, 26 * size); glow(ring).setScale(.35);
  ctx.add(ring, burst);
  rays.setScale(.4); flash.setScale(.5);
  scene.tweens.add({ targets: ring, scale: 1.5, duration: burst, ease: 'Cubic.Out' });
  scene.tweens.add({ targets: rays, scale: 1.05, rotation: .18, duration: burst * .7, ease: 'Expo.Out' });
  scene.tweens.add({ targets: flash, scale: 1.1, duration: 80, ease: 'Quad.Out' });
  if (quiet) return;
  // A swirl of crescent light wraps the target, as in the storyboard's contact panel.
  const swirl = scene.add.graphics({ x: at.x, y: at.y });
  swirl.lineStyle(3 * size, tint, .85).beginPath().arc(0, 0, 36 * size, angle + .6, angle + 2.6).strokePath();
  swirl.lineStyle(1.4 * size, CORE, .9).beginPath().arc(0, 0, 33 * size, angle + 3.6, angle + 5.2).strokePath();
  glow(swirl); ctx.add(swirl, burst);
  scene.tweens.add({ targets: swirl, rotation: .9, duration: burst, ease: 'Sine.Out' });
  for (let i = 0; i < 7; i++) {
    const a = angle + Math.PI + (i - 3) * .45, spark = scene.add.graphics({ x: at.x, y: at.y }), r = (24 + (i % 3) * 8) * size;
    spark.fillStyle(i % 2 ? CORE : SKY, 1).fillCircle(0, 0, 1.8 * s); glow(spark); ctx.add(spark, burst);
    scene.tweens.add({ targets: spark, x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r + 10 * s, duration: burst, ease: 'Quad.Out' });
  }
  if (blocked) return;
  // 04 Dissolve: two threads curl around the target, sparkle and drift upward.
  for (const side of [-1, 1]) {
    const thread = scene.add.graphics({ x: at.x, y: at.y });
    const c = new Phaser.Curves.CubicBezier(V(side * 8 * s, 22 * s), V(side * 40 * s, 12 * s), V(side * 34 * s, -32 * s), V(side * 4 * s, -40 * s));
    thread.lineStyle(4.5 * s, DEEP, .45); c.draw(thread, 20); thread.lineStyle(2.4 * s, VIOLET, .9); c.draw(thread, 20); thread.lineStyle(1 * s, CORE, .95); c.draw(thread, 20);
    for (const t of [.3, .6, .9]) { const p = c.getPoint(t); thread.fillStyle(CORE, 1).fillCircle(p.x, p.y, 1.8 * s); }
    glow(thread).setAlpha(0); ctx.add(thread);
    const delay = Math.min(100, life / 3);
    scene.tweens.add({ targets: thread, alpha: { from: 1, to: 0 }, y: at.y - 16 * s, rotation: side * .25, delay, duration: Math.max(60, life - delay), ease: 'Sine.Out' });
  }
}
