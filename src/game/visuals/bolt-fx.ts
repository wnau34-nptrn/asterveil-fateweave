import Phaser from 'phaser';

// Bolt "Astral Thread" (docs/combat-presentation/vfx-art-direction, storyboard v1): gather → comet head with a
// tapered, length-limited wake → petal impact at the real recipient's body → dissolving threads. Code-drawn layers
// only (no storyboard pixels). Presentation only: callers pass the actual recipient and outcome from events.
export interface FxContext {
  scene: Phaser.Scene;
  // Puts the object in the scene's effect layer, which cleanup destroys (and fades it when `fade` is given).
  add(item: Phaser.GameObjects.Graphics, fade?: number): void;
  quiet: boolean; reduced: boolean;
  // Slot scale: 1 at a 96 px unit; effects shrink with the field.
  scale: number;
}
interface Point { x: number; y: number }
const CORE = 0xf3f8ff, SKY = 0x9fd8ff, VIOLET = 0xa98bff, DEEP = 0x7a5cf0, PEARL = 0x9be6f5;

function star(g: Phaser.GameObjects.Graphics, r: number, inner = .2): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * inner : r; pts.push(new Phaser.Math.Vector2(Math.cos(a) * rr, Math.sin(a) * rr)); }
  g.fillPoints(pts, true);
}
// A petal pointing along +x from the origin, drawn with two curved edges.
function petal(len: number, width: number): Phaser.Math.Vector2[] {
  const top = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(0, 0), new Phaser.Math.Vector2(len * .45, -width), new Phaser.Math.Vector2(len, 0)).getPoints(8);
  const bottom = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(len, 0), new Phaser.Math.Vector2(len * .45, width), new Phaser.Math.Vector2(0, 0)).getPoints(8);
  return [...top, ...bottom];
}
const rotate = (pts: Phaser.Math.Vector2[], a: number) => pts.map(p => p.clone().rotate(a));

// Gather at the staff, then fly the comet to the contact point; arrives exactly at `contactMs`.
export function boltCast(ctx: FxContext, from: Point, to: Point, contactMs: number): void {
  const { scene, scale: s, quiet } = ctx, angle = Math.atan2(to.y - from.y, to.x - from.x);
  const tip = { x: from.x + Math.cos(angle) * 16 * s, y: from.y + Math.sin(angle) * 16 * s - 6 * s };
  const gather = Math.min(100, Math.round(contactMs * .34)), travel = Math.max(1, contactMs - gather);
  // 01 Gather: a violet crescent sweeps around the staff tip while a small bright core condenses.
  const crescent = scene.add.graphics({ x: tip.x, y: tip.y });
  crescent.lineStyle(8 * s, DEEP, .55).beginPath().arc(0, 0, 28 * s, -2.7, -0.1).strokePath();
  crescent.lineStyle(4.5 * s, VIOLET, 1).beginPath().arc(0, 0, 28 * s, -2.5, -0.3).strokePath();
  crescent.lineStyle(2 * s, CORE, 1).beginPath().arc(0, 0, 26 * s, -2.2, -0.6).strokePath();
  ctx.add(crescent, gather + 160);
  scene.tweens.add({ targets: crescent, rotation: 1.4, duration: gather + 160, ease: 'Sine.Out' });
  const core = scene.add.graphics({ x: tip.x, y: tip.y });
  core.fillStyle(VIOLET, .6).fillCircle(0, 0, 13 * s).fillStyle(SKY, .9).fillCircle(0, 0, 6.5 * s).fillStyle(CORE, 1).fillCircle(0, 0, 3.2 * s);
  core.setBlendMode(Phaser.BlendModes.ADD).setScale(.2); ctx.add(core);
  scene.tweens.add({ targets: core, scale: 1, duration: gather, ease: 'Quad.Out', onComplete: () => core.destroy() });
  if (!quiet) for (let i = 0; i < 3; i++) {
    const a = angle + Math.PI + (i - 1) * .9, spark = scene.add.graphics({ x: tip.x + Math.cos(a) * 20 * s, y: tip.y + Math.sin(a) * 20 * s });
    spark.fillStyle(CORE, .9).fillCircle(0, 0, 1.3 * s); spark.setBlendMode(Phaser.BlendModes.ADD); ctx.add(spark);
    scene.tweens.add({ targets: spark, x: tip.x, y: tip.y, alpha: .2, duration: gather, ease: 'Quad.In', onComplete: () => spark.destroy() });
  }
  // 02 Travel: a needle-star head with a tapered wake that never exceeds half the path or the length cap.
  const path = Math.hypot(to.x - tip.x, to.y - tip.y), cap = Math.min((quiet ? 70 : 110) * s, path / 2);
  const wake = scene.add.graphics(); wake.setBlendMode(Phaser.BlendModes.ADD); ctx.add(wake);
  const head = scene.add.graphics({ x: tip.x, y: tip.y });
  const needle = [new Phaser.Math.Vector2(22 * s, 0), new Phaser.Math.Vector2(0, -6.5 * s), new Phaser.Math.Vector2(-12 * s, 0), new Phaser.Math.Vector2(0, 6.5 * s)];
  head.fillStyle(DEEP, .45).fillCircle(0, 0, 16 * s).fillStyle(VIOLET, .7).fillCircle(0, 0, 10 * s).fillStyle(SKY, 1).fillPoints(needle, true).fillStyle(CORE, 1);
  star(head, 12 * s, .22);
  head.setRotation(angle).setBlendMode(Phaser.BlendModes.ADD).setVisible(false); ctx.add(head);
  const drawWake = (x: number, y: number, done: number) => {
    const len = Math.min(cap, done), back = { x: x - Math.cos(angle) * len, y: y - Math.sin(angle) * len }, nx = -Math.sin(angle), ny = Math.cos(angle);
    wake.clear();
    if (len < 2) return;
    const taper = (w: number) => [new Phaser.Math.Vector2(x + nx * w, y + ny * w), new Phaser.Math.Vector2(back.x, back.y), new Phaser.Math.Vector2(x - nx * w, y - ny * w)];
    wake.fillStyle(DEEP, .35).fillPoints(taper(13 * s), true).fillStyle(VIOLET, .6).fillPoints(taper(8 * s), true).fillStyle(SKY, .9).fillPoints(taper(3 * s), true);
  };
  scene.tweens.add({ targets: head, x: to.x, y: to.y, delay: gather, duration: travel, ease: 'Quad.In',
    onStart: () => head.setVisible(true),
    onUpdate: () => { drawWake(head.x, head.y, Math.hypot(head.x - tip.x, head.y - tip.y)); },
    onComplete: () => { head.destroy(); wake.destroy(); } });
}

// 03 Contact + 04 Dissolve at the real recipient. `blocked`: the barrier took the whole hit (no body flash, a smaller
// pearl impact at the shield); `dodged`: the bolt fizzles past without petals.
export function boltImpact(ctx: FxContext, at: Point, from: Point | undefined, life: number, outcome: 'hit' | 'blocked' | 'dodged'): void {
  const { scene, scale: s, quiet, reduced } = ctx, angle = from ? Math.atan2(at.y - from.y, at.x - from.x) : 0;
  if (outcome === 'dodged') {
    for (let i = 0; i < (quiet ? 2 : 4); i++) {
      const a = angle + (i - 1.5) * .35, spark = scene.add.graphics({ x: at.x, y: at.y });
      spark.fillStyle(SKY, .9).fillCircle(0, 0, 1.5 * s); spark.setBlendMode(Phaser.BlendModes.ADD); ctx.add(spark, Math.min(life, 260));
      if (!reduced) scene.tweens.add({ targets: spark, x: at.x + Math.cos(a) * 34 * s, y: at.y + Math.sin(a) * 34 * s, duration: Math.min(life, 260), ease: 'Quad.Out' });
    }
    return;
  }
  const blocked = outcome === 'blocked', tint = blocked ? PEARL : VIOLET, size = blocked ? .75 : 1;
  const burst = Math.min(life, 340);
  // Petals open around the contact point, rotated to the bolt's direction.
  const petals = scene.add.graphics({ x: at.x, y: at.y });
  const count = quiet ? 4 : 6;
  for (let i = 0; i < count; i++) {
    const a = angle + i * Math.PI * 2 / count + Math.PI / count;
    petals.fillStyle(DEEP, .4).fillPoints(rotate(petal(52 * s * size, 14 * s * size), a), true);
    petals.fillStyle(tint, .75).fillPoints(rotate(petal(48 * s * size, 9.5 * s * size), a), true);
    petals.fillStyle(CORE, .9).fillPoints(rotate(petal(30 * s * size, 3 * s * size), a), true);
  }
  petals.setBlendMode(Phaser.BlendModes.ADD); ctx.add(petals, burst);
  // A small four-point star at the core; no full-body white flash.
  const flash = scene.add.graphics({ x: at.x, y: at.y });
  flash.fillStyle(tint, .5); star(flash, 42 * s * size, .16); flash.fillStyle(CORE, 1); star(flash, 24 * s * size, .18);
  flash.setRotation(angle + Math.PI / 4).setBlendMode(Phaser.BlendModes.ADD); ctx.add(flash, Math.min(life, 220));
  // Reduced motion: an immediate, quieter static mark that leaves the target and its number readable.
  if (reduced) { petals.setScale(.7).setAlpha(.45); flash.setScale(.6).setAlpha(.5); return; }
  petals.setScale(.45); flash.setScale(.6);
  scene.tweens.add({ targets: petals, scale: 1.1, rotation: .35, duration: burst, ease: 'Cubic.Out' });
  scene.tweens.add({ targets: flash, scale: 1, duration: 90, ease: 'Quad.Out' });
  if (quiet) return;
  for (let i = 0; i < 5; i++) {
    const a = angle + Math.PI + (i - 2) * .55, spark = scene.add.graphics({ x: at.x, y: at.y });
    spark.fillStyle(i % 2 ? CORE : SKY, 1).fillCircle(0, 0, 1.4 * s); spark.setBlendMode(Phaser.BlendModes.ADD); ctx.add(spark, burst);
    scene.tweens.add({ targets: spark, x: at.x + Math.cos(a) * (20 + i * 3) * s, y: at.y + Math.sin(a) * (20 + i * 3) * s + 8 * s, duration: burst, ease: 'Quad.Out' });
  }
  if (blocked) return;
  // 04 Dissolve: two thin threads curl around the target and drift upward.
  for (const side of [-1, 1]) {
    const thread = scene.add.graphics({ x: at.x, y: at.y });
    const curve = new Phaser.Curves.CubicBezier(new Phaser.Math.Vector2(side * 6 * s, 18 * s), new Phaser.Math.Vector2(side * 30 * s, 10 * s),
      new Phaser.Math.Vector2(side * 26 * s, -24 * s), new Phaser.Math.Vector2(side * 4 * s, -30 * s));
    thread.lineStyle(2 * s, VIOLET, .75); curve.draw(thread, 16); thread.lineStyle(.8 * s, CORE, .8); curve.draw(thread, 16);
    thread.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0); ctx.add(thread);
    scene.tweens.add({ targets: thread, alpha: { from: .9, to: 0 }, y: at.y - 10 * s, delay: Math.min(110, life / 3), duration: Math.max(60, life - Math.min(110, life / 3)), ease: 'Sine.Out' });
  }
}
