import Phaser from 'phaser';
import type { FxContext } from './bolt-fx';

// Execute "Rose-Gold Edge" and Ward "Luminous Aegis" (A8, same language as bolt-fx.ts). Painted layers from
// ART-VFX-EXEC-WARD-001 (public/assets/fx/{execute,ward}_fx.*), timed and placed in code from the real stage boundaries.
// Presentation only: callers pass the actual recipient and outcome from events; nothing here infers a result.
export const EXECUTE_ATLAS = 'execute-fx', WARD_ATLAS = 'ward-fx';
const atlasUrls = (name: string): [string, string] => [`${import.meta.env.BASE_URL}assets/fx/${name}.webp`, `${import.meta.env.BASE_URL}assets/fx/${name}.json`];
export const executeAtlasUrls = () => atlasUrls('execute_fx');
export const wardAtlasUrls = () => atlasUrls('ward_fx');
interface Point { x: number; y: number }
const PEARL = 0xbff3ff, ROSE_INK = 0x4a1830;
const frame = (name: string, i: number) => `${name}_${String(i).padStart(2, '0')}`;
const sprite = (ctx: FxContext, atlas: string, x: number, y: number, name: string, w: number, h = w): Phaser.GameObjects.Image => {
  const img = ctx.scene.add.image(x, y, atlas, frame(name, 0)); img.setDisplaySize(w, h); ctx.add(img); return img;
};
// Steps an image through `count` atlas frames over `duration` ms after `delay`, then optionally fades it out.
function play(ctx: FxContext, img: Phaser.GameObjects.Image, name: string, count: number, duration: number, delay = 0, fadeMs = 0): void {
  ctx.scene.tweens.addCounter({ from: 0, to: count - .001, duration, delay, onUpdate: t => { if (img.active) img.setFrame(frame(name, Math.floor(t.getValue() ?? 0))); } });
  ctx.scene.tweens.add({ targets: img, alpha: 0, delay: delay + duration, duration: Math.max(1, fadeMs), onComplete: () => img.destroy() });
}
const hidden = (img: Phaser.GameObjects.Image, delay: number, ctx: FxContext) => { img.setVisible(false); ctx.scene.time.delayedCall(delay, () => { if (img.active) img.setVisible(true); }); return img; };

// Before contact: a glint on the blade, then ONE continuous rose-gold cut around the recipient that ends at `contactMs`.
// `contact` says what the cut will hit: dodged strikes leave the glint only.
export function executeCast(ctx: FxContext, from: Point, to: Point, contactMs: number, contact: 'hit' | 'blocked' | 'dodged'): void {
  const { scale: s } = ctx, angle = Math.atan2(to.y - from.y, to.x - from.x), k = contactMs / 298;
  const tip = { x: from.x + Math.cos(angle) * 20 * s, y: from.y + Math.sin(angle) * 20 * s - 4 * s };
  const glint = sprite(ctx, EXECUTE_ATLAS, tip.x, tip.y, 'blade_glint', 104 * s).setRotation(angle);
  play(ctx, glint, 'blade_glint', 4, 150 * k, 0, 40);
  if (contact === 'dodged') return;
  const shade = ctx.scene.add.graphics({ x: to.x, y: to.y }); shade.fillStyle(ROSE_INK, .2).fillCircle(0, 0, 30 * s).setVisible(false); ctx.add(shade, 400);
  ctx.scene.time.delayedCall(150 * k, () => { if (shade.active) shade.setVisible(true); });
  const cut = hidden(sprite(ctx, EXECUTE_ATLAS, to.x, to.y, 'slash_ribbon', 148 * s), 150 * k, ctx);
  cut.setRotation(angle + Math.PI);
  play(ctx, cut, 'slash_ribbon', 4, contactMs - 150 * k, 150 * k, 1);
}

// At contact: the star at the real body (smaller and pearl-tinted when a barrier took everything), the rose Mark
// resonance only on a genuinely marked target, then sparse flecks falling. `dodged` shows passing flecks only.
export function executeImpact(ctx: FxContext, at: Point, life: number, outcome: 'hit' | 'blocked' | 'dodged', marked: boolean): void {
  const { scale: s, quiet, reduced } = ctx, k = life / 552;
  if (reduced) { const img = sprite(ctx, EXECUTE_ATLAS, at.x, at.y, 'contact_star', 62 * s).setFrame('static_impact').setAlpha(.5); if (outcome === 'blocked') img.setTint(PEARL); return; }
  const flecks = () => { const f = sprite(ctx, EXECUTE_ATLAS, at.x, at.y + 6 * s, 'falling_spark', 92 * s); f.setAlpha(outcome === 'dodged' ? .6 : 1); play(ctx, f, 'falling_spark', 4, 232 * k, 120 * k, 1); };
  if (outcome === 'dodged') { flecks(); return; }
  const blocked = outcome === 'blocked', size = (blocked ? .75 : 1) * s;
  // A dark under-layer keeps the rose light readable on violet foes.
  const shade = ctx.scene.add.graphics({ x: at.x, y: at.y }); shade.fillStyle(ROSE_INK, .22).fillCircle(0, 0, 26 * size); ctx.add(shade, 200 * k);
  const star = sprite(ctx, EXECUTE_ATLAS, at.x, at.y, 'contact_star', 92 * size); if (blocked) star.setTint(PEARL);
  play(ctx, star, 'contact_star', 4, 120 * k, 0, 1);
  if (marked && !blocked && !ctx.quiet) { const pulse = sprite(ctx, EXECUTE_ATLAS, at.x, at.y - 34 * s, 'rose_mark_pulse', 46 * s); play(ctx, pulse, 'rose_mark_pulse', 4, 152 * k, 0, 1); }
  if (!quiet) flecks();
}

// Before contact: threads weave at the barrier recipient, then the curved veil closes around them; ends at `contactMs`.
export function wardCast(ctx: FxContext, at: Point, contactMs: number): void {
  const { scale: s } = ctx, k = contactMs / 260, w = 78 * s, h = 104 * s;
  const thread = sprite(ctx, WARD_ATLAS, at.x, at.y, 'weave_thread', w, h); play(ctx, thread, 'weave_thread', 4, 100 * k, 0, 1);
  const veil = hidden(sprite(ctx, WARD_ATLAS, at.x, at.y, 'curved_veil', w, h), 100 * k, ctx); play(ctx, veil, 'curved_veil', 4, 160 * k, 100 * k, 1);
}

// At contact: the veil settles on the real recipient (the Ward's contact cue — never an impact), then dissolves.
// Reduced motion: only the static settle frame, immediately.
export function wardSettle(ctx: FxContext, at: Point, life: number): void {
  const { scale: s, quiet, reduced } = ctx, k = life / 552, w = 78 * s, h = 104 * s;
  if (reduced) { sprite(ctx, WARD_ATLAS, at.x, at.y, 'settle', 68 * s, 90 * s).setFrame('static_impact').setAlpha(.45); return; }
  const settle = sprite(ctx, WARD_ATLAS, at.x, at.y, 'settle', w, h); play(ctx, settle, 'settle', 4, 160 * k, 0, 1);
  if (!quiet) {
    const rim = sprite(ctx, WARD_ATLAS, at.x, at.y, 'rim_crescent', w, h).setAlpha(.8); play(ctx, rim, 'rim_crescent', 4, 160 * k, 0, 1);
    const rune = sprite(ctx, WARD_ATLAS, at.x, at.y, 'sparse_rune', 46 * s, 88 * s); play(ctx, rune, 'sparse_rune', 4, 160 * k, 0, 1);
  }
  const fade = sprite(ctx, WARD_ATLAS, at.x, at.y, 'dissolve', w, h); hidden(fade, 160 * k, ctx); play(ctx, fade, 'dissolve', 4, 230 * k, 160 * k, 1);
}
