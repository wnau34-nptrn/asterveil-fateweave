// UX audit P2-2 part 1 (docs/UX_GAMEFEEL_AUDIT.md, game-feel skill): impact shake from decaying trauma.
// Shake = trauma², so a light hit barely moves the field and a down punches; the offset comes from summed sines at
// unrelated rates (smooth, never a per-frame random buzz) and returns to exactly 0 when trauma runs out. Hits add
// trauma instead of restarting it. Pure presentation: it only moves the field layer, never rules or timing.
export const SHAKE = { maxPx: 4, decayPerSec: 7.2, light: .8, heavy: 1 } as const;
export const addTrauma = (current: number, amount: number): number => Math.min(1, Math.max(0, current) + Math.max(0, amount));
export const shakeMs = (trauma: number): number => Math.max(0, trauma) / SHAKE.decayPerSec * 1000;
export function shakeOffset(trauma: number, timeSec: number, maxPx: number = SHAKE.maxPx): { x: number; y: number } {
  const k = Math.max(0, Math.min(1, trauma)) ** 2 * maxPx; if (!k) return { x: 0, y: 0 };
  const t = timeSec * 30;   // ≈5–16 Hz: a few swings inside a 140 ms hit, small steps between 60 fps frames
  return { x: k * (.7 * Math.sin(t * 1.7) + .3 * Math.sin(t * 2.9 + 1.3)), y: k * (.7 * Math.sin(t * 2.3 + .7) + .3 * Math.sin(t * 3.3 + 2.1)) };
}
