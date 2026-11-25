import Phaser from 'phaser';
import type { HoldKind } from './boss-signature-fx';

// Boss aura (owner 2026-11-25: "อยากให้ทำ Aura ของบอสให้ดูอลังการกว่านี้", then "ทำ Aura เบาๆ ตลอดศึก แล้วแรงขึ้นตอนชาร์จ").
// Every standing boss wears a light ambient aura all battle (`paintAmbient`). While it holds a charged release
// (`chargeHolds`) that is swapped for the full charge aura, painted with the hold emblem. Both are drawn only from the
// shown state and never change rules or timing. Charge layers, back to front:
//   1. a ground sigil under the feet: a soft additive pool plus two counter-rotating rune rings;
//   2. a pulsing outer glow on the boss's own sprite (Phaser 4 Glow filter, WebGL only);
//   3. motes rising from the sigil past the body;
//   4. an additive bloom behind the hold emblem.
// The release kind keys shape and strength, not colour alone: unstoppable = toothed rings, brighter glow, faster motes;
// breakable = a ring with visible gaps; normal = smooth dashed rings. Reduced motion / reduced intensity keep every layer
// still (no spin, pulse or motes) and dimmer.

// `strength` (default 1) scales every layer's opacity and glow for bosses whose own art is already saturated.
export interface AuraPalette { core: number; rim: number; strength?: number }
// Colour by the move family the hold shows (its frame name), so each boss reads as its own power.
const palettes: readonly [RegExp, AuraPalette][] = [
  [/^(gather-thorns|thorn-)/, { core: 0x46e8b0, rim: 0xc8ffe6 }],
  [/^rift-/, { core: 0xa77bff, rim: 0xeadcff }],
  [/^(horn-charge|crushing-coil|coil-)/, { core: 0xc35cff, rim: 0xf3d6ff }],
  [/^mountain-fall|^titan-/, { core: 0xffa34d, rim: 0xffe7c2 }],
  [/^wing-|^worldshard-|^sky-rend|^shard-talon/, { core: 0x59dcff, rim: 0xd9f8ff }],
  [/^(water-veil|surging-wave|great-wave|reflection)/, { core: 0x5fd4ff, rim: 0xdcf6ff }],
  [/^(severing-bolt|fate-lash|shadow-tide|severed-crown|call-the-court)/, { core: 0xff5fcf, rim: 0xffd9f3 }],
  [/^(war-cry|call-the-hunt)/, { core: 0xff7a45, rim: 0xffe0cc }],
  [/^(stone-fist|rift-quake|fault-awakening)/, { core: 0xffa34d, rim: 0xffe7c2 }],
];
const fallback: AuraPalette = { core: 0xb99cff, rim: 0xf1e8ff };
export const auraPalette = (frame: string): AuraPalette => palettes.find(([re]) => re.test(frame))?.[1] ?? fallback;
// Per-boss overrides by unit art (owner 2026-11-25: Kragmor/Valdrakk “เข้มเกินไป และสีไม่เข้า”). Both are violet crystal
// bodies with a cyan core, so their aura follows the body's violet and the core's cyan at a lower strength, for both the
// ambient and the charge aura.
const artPalettes: Readonly<Record<string, AuraPalette>> = {
  foe_kragmor: { core: 0x8a5cff, rim: 0xc9f2ff, strength: .55 },
  foe_valdrakk: { core: 0x9a6cff, rim: 0xbff4ff, strength: .55 },
};
export const artPalette = (art: string | undefined): AuraPalette | undefined => art ? artPalettes[art] : undefined;
// A boss's own colour between charges: the first of its moves with a family colour (move names slugged like frames).
export const bossPalette = (moves: readonly string[]): AuraPalette => {
  for (const move of moves) { const hit = palettes.find(([re]) => re.test(move.toLowerCase().replace(/ /g, '-'))); if (hit) return hit[1]; }
  return fallback;
};

// `ambient`: the light aura every standing boss wears all battle. `charge`: the full aura while it holds a charged release.
export type AuraLevel = 'ambient' | 'charge';
export interface AuraOptions {
  level: AuraLevel; palette: AuraPalette; kind: HoldKind;
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
  if (o.level === 'ambient') return paintAmbient(scene, body, sprites, o);
  const { core, rim } = o.palette, strong = o.kind === 'unstoppable';
  const w = Math.max(40, o.right - o.left), h = Math.max(40, o.feet - o.top), cx = (o.left + o.right) / 2;
  const objects: Phaser.GameObjects.GameObject[] = [], tweens: Phaser.Tweens.Tween[] = [];
  const k = o.palette.strength ?? 1, dim = (o.calm ? .7 : 1) * k;
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
  const glows = addGlows(scene, sprites, core, (strong ? 8 : 6) * k);

  // 3. Rising motes (not in calm mode).
  let motes: Phaser.GameObjects.Particles.ParticleEmitter | undefined;
  if (!o.calm) {
    motes = scene.add.particles(cx, o.feet, moteTexture(scene), {
      x: { min: -w * .55, max: w * .55 }, y: { min: -4, max: 4 },
      speedY: { min: strong ? -70 : -45, max: strong ? -35 : -20 }, speedX: { min: -6, max: 6 },
      scale: { start: strong ? 1.3 : 1.05, end: 0 }, alpha: { start: .95 * k, end: 0 }, lifespan: { min: 900, max: 1500 },
      frequency: strong ? 28 : 40, quantity: 1, tint: [core, rim], blendMode: Phaser.BlendModes.ADD,
    });
    body.add(motes); objects.push(motes);
  }

  // 4. Bloom behind the hold emblem.
  if (o.emblem) {
    const bloom = scene.add.circle(o.emblem.x, o.emblem.y, w * .32, core, .28 * dim).setBlendMode(Phaser.BlendModes.ADD);
    body.addAt(bloom, Math.max(0, body.getIndex(o.emblem))); objects.push(bloom);
    if (!o.calm) tweens.push(scene.tweens.add({ targets: bloom, scale: { from: .85, to: 1.2 }, alpha: { from: .35 * k, to: .15 * k }, duration: strong ? 520 : 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
  }

  // 5. A shockwave ring that leaves the feet and fades, once per pulse (not in calm mode).
  if (!o.calm) {
    const wave = scene.add.ellipse(cx, o.feet, w * .6, w * .16).setStrokeStyle(strong ? 4 : 3, rim, .9).setBlendMode(Phaser.BlendModes.ADD);
    under(wave); body.moveAbove(wave as Phaser.GameObjects.GameObject, outer.holder as Phaser.GameObjects.GameObject);
    tweens.push(scene.tweens.add({ targets: wave, scale: { from: .5, to: 1.9 }, alpha: { from: k, to: 0 }, duration: strong ? 900 : 1400, repeat: -1, ease: 'Cubic.Out' }));
  }
  if (!o.calm) {
    tweens.push(scene.tweens.add({ targets: outer.spin, rotation: Math.PI * 2, duration: strong ? 5200 : 9000, repeat: -1 }));
    tweens.push(scene.tweens.add({ targets: inner.spin, rotation: -Math.PI * 2, duration: strong ? 3800 : 6500, repeat: -1 }));
    tweens.push(scene.tweens.add({ targets: [pool, column], alpha: { from: (strong ? .42 : .32) * k, to: .14 * k }, duration: strong ? 600 : 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    for (const { glow } of glows) tweens.push(scene.tweens.add({ targets: glow, outerStrength: { from: (strong ? 5 : 3.5) * k, to: (strong ? 11 : 8.5) * k }, duration: strong ? 600 : 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
  }

  return disposer(objects, tweens, glows);
}

type Glow = { sprite: Phaser.GameObjects.Image; glow: Phaser.Filters.Glow };
function addGlows(scene: Phaser.Scene, sprites: Phaser.GameObjects.Image[], color: number, strength: number): Glow[] {
  if (!(scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return [];
  return sprites.map(sprite => { sprite.enableFilters(); return { sprite, glow: sprite.filters!.internal.addGlow(color, strength, 0, 1, false, 12, 14) }; });
}

// The light, always-on layer: a faint ground pool, one slow rune ring, a soft breathing outline and sparse motes. No
// column, shockwave or emblem bloom, so the charge aura still reads as a clear step up.
function paintAmbient(scene: Phaser.Scene, body: Phaser.GameObjects.Container, sprites: Phaser.GameObjects.Image[], o: AuraOptions): BossAura {
  const { core, rim } = o.palette, w = Math.max(40, o.right - o.left), cx = (o.left + o.right) / 2;
  const objects: Phaser.GameObjects.GameObject[] = [], tweens: Phaser.Tweens.Tween[] = [], k = o.palette.strength ?? 1, dim = (o.calm ? .7 : 1) * k;
  const under = (obj: Phaser.GameObjects.GameObject) => { body.addAt(obj, 1); objects.push(obj); return obj; };
  const pool = scene.add.ellipse(cx, o.feet, w * 1.15, w * .3, core, .22 * dim).setBlendMode(Phaser.BlendModes.ADD);
  const band = ring(scene, w * .55, w * .14, 'normal', rim, .45 * dim, 2);
  band.holder.setPosition(cx, o.feet);
  under(band.holder); under(pool);
  const glows = addGlows(scene, sprites, core, 2.5 * k);
  if (!o.calm) {
    const motes = scene.add.particles(cx, o.feet, moteTexture(scene), {
      x: { min: -w * .45, max: w * .45 }, y: { min: -4, max: 4 }, speedY: { min: -30, max: -14 }, speedX: { min: -4, max: 4 },
      scale: { start: .7, end: 0 }, alpha: { start: .7 * k, end: 0 }, lifespan: { min: 1200, max: 1800 }, frequency: 260, quantity: 1,
      tint: [core, rim], blendMode: Phaser.BlendModes.ADD,
    });
    body.add(motes); objects.push(motes);
    tweens.push(scene.tweens.add({ targets: band.spin, rotation: Math.PI * 2, duration: 16000, repeat: -1 }));
    tweens.push(scene.tweens.add({ targets: pool, alpha: { from: .24 * k, to: .1 * k }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    for (const { glow } of glows) tweens.push(scene.tweens.add({ targets: glow, outerStrength: { from: 1.5 * k, to: 3.5 * k }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
  }
  return disposer(objects, tweens, glows);
}

function disposer(objects: Phaser.GameObjects.GameObject[], tweens: Phaser.Tweens.Tween[], glows: Glow[]): BossAura {
  return {
    objects,
    dispose() {
      for (const t of tweens) t.remove();
      for (const { sprite, glow } of glows) if (sprite.active && sprite.filters) sprite.filters.internal.remove(glow);
      for (const obj of objects) obj.destroy();
    },
  };
}
