import Phaser from 'phaser';
import type { HoldKind } from './boss-signature-fx';

// Boss charge aura (owner request 2026-11-25: "อยากให้ทำ Aura ของบอสให้ดูอลังการกว่านี้").
// Painted around a boss while it holds a charged release (`chargeHolds`), in addition to the hold emblem. It is drawn only
// from the shown state, never changes rules or timing, and is destroyed with the hold. Layers, back to front:
//   1. a ground sigil under the feet: a soft additive pool plus two counter-rotating rune rings;
//   2. a pulsing outer glow on the boss's own sprite (Phaser 4 Glow filter, WebGL only);
//   3. motes rising from the sigil past the body;
//   4. an additive bloom behind the hold emblem.
// The release kind keys shape and strength, not colour alone: unstoppable = toothed rings, brighter glow, faster motes;
// breakable = a ring with visible gaps; normal = smooth dashed rings. Reduced motion / reduced intensity keep every layer
// still (no spin, pulse or motes) and dimmer.

export interface AuraPalette { core: number; rim: number }
// Colour by the move family the hold shows (its frame name), so each boss reads as its own power.
const palettes: readonly [RegExp, AuraPalette][] = [
  [/^(gather-thorns|thorn-)/, { core: 0x46e8b0, rim: 0xc8ffe6 }],
  [/^rift-/, { core: 0xa77bff, rim: 0xeadcff }],
  [/^(horn-charge|crushing-coil|coil-)/, { core: 0xc35cff, rim: 0xf3d6ff }],
  [/^mountain-fall|^titan-/, { core: 0xffa34d, rim: 0xffe7c2 }],
  [/^wing-|^worldshard-/, { core: 0x59dcff, rim: 0xd9f8ff }],
];
export const auraPalette = (frame: string): AuraPalette => palettes.find(([re]) => re.test(frame))?.[1] ?? { core: 0xb99cff, rim: 0xf1e8ff };

export interface AuraOptions {
  frame: string; kind: HoldKind;
  // Body-local landmarks (CSS px): figure box edges and the feet line.
  left: number; right: number; top: number; feet: number;
  emblem?: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  calm: boolean; // reduced motion or reduced intensity
}
export interface BossAura { objects: Phaser.GameObjects.GameObject[]; dispose(): void }

const MOTE = 'boss-aura-mote';
function moteTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(MOTE)) return MOTE;
  const g = scene.make.graphics({}, false);
  for (let r = 8; r > 0; r--) { g.fillStyle(0xffffff, (1 - r / 8) * .35 + .05); g.fillCircle(8, 8, r); }
  g.generateTexture(MOTE, 16, 16); g.destroy();
  return MOTE;
}

// A flat ring on the ground: a circle drawn in a graphics object that spins inside a container squashed to the floor's
// perspective, so spinning never tilts the ellipse.
function ring(scene: Phaser.Scene, rx: number, ry: number, kind: HoldKind, color: number, alpha: number, width: number): { holder: Phaser.GameObjects.Container; spin: Phaser.GameObjects.Graphics } {
  const g = scene.add.graphics();
  g.lineStyle(width, color, alpha);
  const seg = kind === 'unstoppable' ? 18 : kind === 'breakable' ? 7 : 24;
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, span = (kind === 'breakable' ? .62 : .55) * Math.PI * 2 / seg;
    const pts: Phaser.Math.Vector2[] = [];
    for (let k = 0; k <= 6; k++) { const a = a0 + span * k / 6; pts.push(new Phaser.Math.Vector2(Math.cos(a) * rx, Math.sin(a) * rx)); }
    g.strokePoints(pts, false);
    if (kind === 'unstoppable') { // a tooth pointing out from each segment
      const a = a0 + span / 2;
      g.strokePoints([new Phaser.Math.Vector2(Math.cos(a) * rx, Math.sin(a) * rx), new Phaser.Math.Vector2(Math.cos(a) * rx * 1.14, Math.sin(a) * rx * 1.14)], false);
    }
  }
  g.setBlendMode(Phaser.BlendModes.ADD);
  return { holder: scene.add.container(0, 0, [g]).setScale(1, ry / rx), spin: g };
}

export function paintBossAura(scene: Phaser.Scene, body: Phaser.GameObjects.Container, sprites: Phaser.GameObjects.Image[], o: AuraOptions): BossAura {
  const { core, rim } = auraPalette(o.frame), strong = o.kind === 'unstoppable';
  const w = Math.max(40, o.right - o.left), h = Math.max(40, o.feet - o.top), cx = (o.left + o.right) / 2;
  const objects: Phaser.GameObjects.GameObject[] = [], tweens: Phaser.Tweens.Tween[] = [];
  const dim = o.calm ? .7 : 1;
  const under = (obj: Phaser.GameObjects.GameObject) => { body.addAt(obj, 1); objects.push(obj); return obj; }; // above the contact shadow, below the sprite

  // 1. Ground sigil.
  const pool = scene.add.ellipse(cx, o.feet, w * 1.35, w * .36, core, .5 * dim).setBlendMode(Phaser.BlendModes.ADD);
  const inner = ring(scene, w * .5, w * .13, o.kind, rim, dim, 3), outer = ring(scene, w * .72, w * .19, o.kind, core, dim, 4);
  inner.holder.setPosition(cx, o.feet); outer.holder.setPosition(cx, o.feet);
  under(outer.holder); under(inner.holder); under(pool);
  // 4 (behind the body). A tall soft column of light the body stands in.
  const column = scene.add.ellipse(cx, o.feet - h * .45, w * 1.05, h * 1.15, core, .2 * dim).setBlendMode(Phaser.BlendModes.ADD);
  under(column);

  // 2. Glow on the boss's own sprite(s).
  const glows: { sprite: Phaser.GameObjects.Image; glow: Phaser.Filters.Glow }[] = [];
  for (const sprite of sprites) {
    if (!(scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) break;
    sprite.enableFilters();
    const glow = sprite.filters!.internal.addGlow(core, strong ? 8 : 6, 0, 1, false, 12, 14);
    glows.push({ sprite, glow });
  }

  // 3. Rising motes (not in calm mode).
  let motes: Phaser.GameObjects.Particles.ParticleEmitter | undefined;
  if (!o.calm) {
    motes = scene.add.particles(cx, o.feet, moteTexture(scene), {
      x: { min: -w * .55, max: w * .55 }, y: { min: -4, max: 4 },
      speedY: { min: strong ? -70 : -45, max: strong ? -35 : -20 }, speedX: { min: -6, max: 6 },
      scale: { start: strong ? 1.3 : 1.05, end: 0 }, alpha: { start: .95, end: 0 }, lifespan: { min: 900, max: 1500 },
      frequency: strong ? 28 : 40, quantity: 1, tint: [core, rim], blendMode: Phaser.BlendModes.ADD,
    });
    body.add(motes); objects.push(motes);
  }

  // 4. Bloom behind the hold emblem.
  if (o.emblem) {
    const bloom = scene.add.circle(o.emblem.x, o.emblem.y, w * .32, core, .28 * dim).setBlendMode(Phaser.BlendModes.ADD);
    body.addAt(bloom, Math.max(0, body.getIndex(o.emblem))); objects.push(bloom);
    if (!o.calm) tweens.push(scene.tweens.add({ targets: bloom, scale: { from: .85, to: 1.2 }, alpha: { from: .35, to: .15 }, duration: strong ? 520 : 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
  }

  // 5. A shockwave ring that leaves the feet and fades, once per pulse (not in calm mode).
  if (!o.calm) {
    const wave = scene.add.ellipse(cx, o.feet, w * .6, w * .16).setStrokeStyle(strong ? 4 : 3, rim, .9).setBlendMode(Phaser.BlendModes.ADD);
    under(wave); body.moveAbove(wave as Phaser.GameObjects.GameObject, outer.holder as Phaser.GameObjects.GameObject);
    tweens.push(scene.tweens.add({ targets: wave, scale: { from: .5, to: 1.9 }, alpha: { from: 1, to: 0 }, duration: strong ? 900 : 1400, repeat: -1, ease: 'Cubic.Out' }));
  }
  if (!o.calm) {
    tweens.push(scene.tweens.add({ targets: outer.spin, rotation: Math.PI * 2, duration: strong ? 5200 : 9000, repeat: -1 }));
    tweens.push(scene.tweens.add({ targets: inner.spin, rotation: -Math.PI * 2, duration: strong ? 3800 : 6500, repeat: -1 }));
    tweens.push(scene.tweens.add({ targets: [pool, column], alpha: { from: (strong ? .42 : .32), to: .14 }, duration: strong ? 600 : 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    for (const { glow } of glows) tweens.push(scene.tweens.add({ targets: glow, outerStrength: { from: strong ? 5 : 3.5, to: strong ? 11 : 8.5 }, duration: strong ? 600 : 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
  }

  return {
    objects,
    dispose() {
      for (const t of tweens) t.remove();
      for (const { sprite, glow } of glows) if (sprite.active && sprite.filters) sprite.filters.internal.remove(glow);
      for (const obj of objects) obj.destroy();
    },
  };
}
