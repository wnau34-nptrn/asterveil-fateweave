import { describe, expect, it } from 'vitest';
import { SHAKE, addTrauma, shakeMs, shakeOffset } from '../src/game/visuals/impact-shake';

// UX audit P2-2 part 1: trauma-based impact shake (game-feel skill checks).
describe('impact shake', () => {
  it('is exactly still without trauma', () => {
    expect(shakeOffset(0, 1.234)).toEqual({ x: 0, y: 0 });
    expect(shakeOffset(-1, 3)).toEqual({ x: 0, y: 0 });
  });
  it('scales with trauma squared and never passes the cap', () => {
    let light = 0, heavy = 0;
    for (let t = 0; t < 2; t += .001) {
      const l = shakeOffset(SHAKE.light, t), h = shakeOffset(SHAKE.heavy, t);
      light = Math.max(light, Math.abs(l.x), Math.abs(l.y)); heavy = Math.max(heavy, Math.abs(h.x), Math.abs(h.y));
    }
    expect(heavy).toBeLessThanOrEqual(SHAKE.maxPx + 1e-9);
    expect(light).toBeLessThanOrEqual(SHAKE.light ** 2 * SHAKE.maxPx + 1e-9);
    expect(heavy).toBeGreaterThan(light);
  });
  it('moves smoothly between frames (no per-frame random buzz) and is deterministic', () => {
    const frame = 1 / 60; let worst = 0;
    for (let t = 0; t < 1; t += frame) { const a = shakeOffset(1, t), b = shakeOffset(1, t + frame); worst = Math.max(worst, Math.hypot(b.x - a.x, b.y - a.y)); }
    expect(worst).toBeLessThan(SHAKE.maxPx * 1.6);   // a random offset jumps up to 2·√2·max between frames
    expect(shakeOffset(.7, .42)).toEqual(shakeOffset(.7, .42));
  });
  it('adds hits instead of restarting, capped at 1, and decays in a short time', () => {
    expect(addTrauma(.3, SHAKE.light)).toBeCloseTo(1); expect(addTrauma(0, SHAKE.light)).toBe(SHAKE.light); expect(addTrauma(.1, -1)).toBe(.1);
    expect(shakeMs(SHAKE.heavy)).toBeGreaterThan(100); expect(shakeMs(SHAKE.heavy)).toBeLessThanOrEqual(150);
    expect(shakeMs(0)).toBe(0);
  });
});
