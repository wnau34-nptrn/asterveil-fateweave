import { describe, expect, it } from 'vitest';
import { BREATH, HeroLife, LOW_HP, breathAt } from '../src/game/visuals/hero-life';

const sprite = () => {
  const s = { x: 0, y: 0, rotation: 0, scaleX: 2, scaleY: 2,
    setPosition(x: number, y: number) { s.x = x; s.y = y; }, setRotation(r: number) { s.rotation = r; }, setScale(x: number, y: number) { s.scaleX = x; s.scaleY = y; } };
  return s;
};
// Time (ms) from one breath peak to the next, sampled every 10 ms.
const breathPeriod = (life: HeroLife, s: ReturnType<typeof sprite>) => {
  const peaks: number[] = []; let prev = 0, rising = false;
  for (let t = 0; t < 30000; t += 10) { life.update(10); if (rising && s.scaleY < prev) peaks.push(t); rising = s.scaleY > prev; prev = s.scaleY; }
  return (peaks.at(-1)! - peaks.at(-3)!) / 2;
};

describe('hero life (presentation only, owner 2026-11-27)', () => {
  it('keeps the former gentle breath: scale only, never a sway, float, tilt or step', () => {
    for (let t = 0; t < BREATH.period; t += 50) {
      const o = breathAt(t, 0, 0);
      expect(o.sy).toBeGreaterThanOrEqual(0); expect(o.sy).toBeLessThanOrEqual(BREATH.swell + 1e-9);
      expect(o.sx).toBeLessThanOrEqual(0); expect(o.sx).toBeGreaterThanOrEqual(-BREATH.narrow - 1e-9);
    }
    const life = new HeroLife(), s = sprite();
    life.bind('h1', s, true); life.set('h1', { alive: true, low: false });
    for (let i = 0; i < 300; i++) { life.update(16); expect([s.x, s.y, s.rotation]).toEqual([0, 0, 0]); }
  });
  it('breathes slower while HP is low', () => {
    expect(LOW_HP).toBe(.3);
    const calm = new HeroLife(), a = sprite(); calm.bind('h1', a, true); calm.set('h1', { alive: true, low: false });
    const tired = new HeroLife(), b = sprite(); tired.bind('h1', b, true); tired.set('h1', { alive: true, low: true });
    const p1 = breathPeriod(calm, a), p2 = breathPeriod(tired, b);
    expect(p1).toBeGreaterThan(BREATH.period * .9); expect(p1).toBeLessThan(BREATH.period * 1.1);
    expect(p2).toBeGreaterThan(p1 * 1.3);
  });
  it('pauses for motions, restores when off or downed, and steps aside for drawn idle loops', () => {
    const life = new HeroLife(), s = sprite();
    life.bind('h1', s, true); life.set('h1', { alive: true, low: false });
    for (let i = 0; i < 60; i++) life.update(16);
    expect(s.scaleY).not.toBe(2);
    life.pause('h1', true); expect([s.scaleX, s.scaleY]).toEqual([2, 2]); life.update(16); expect(s.scaleY).toBe(2);
    life.pause('h1', false); for (let i = 0; i < 60; i++) life.update(16); expect(s.scaleY).not.toBe(2);
    life.setEnabled(false); expect(s.scaleY).toBe(2); life.update(16); expect(s.scaleY).toBe(2);
    life.setEnabled(true); life.set('h1', { alive: false, low: false }); expect(s.scaleY).toBe(2); life.update(16); expect(s.scaleY).toBe(2);
    const drawn = new HeroLife(), d = sprite(); drawn.bind('h2', d, false); drawn.set('h2', { alive: true, low: true });
    for (let i = 0; i < 200; i++) drawn.update(16);
    expect([d.scaleX, d.scaleY]).toEqual([2, 2]);
  });
});
