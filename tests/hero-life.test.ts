import { describe, expect, it } from 'vitest';
import { HeroLife, LIFE_STYLES, LOW_HP, lifeOffset, lifeStyle } from '../src/game/visuals/hero-life';

const sprite = () => {
  const s = { x: 0, y: 0, rotation: 0, scaleX: 2, scaleY: 2,
    setPosition(x: number, y: number) { s.x = x; s.y = y; }, setRotation(r: number) { s.rotation = r; }, setScale(x: number, y: number) { s.scaleX = x; s.scaleY = y; } };
  return s;
};
const zero = { low: 0, ready: 0, relaxed: 0, foe: 0, ally: 0, self: 0 };
const range = (role: string, key: 'y' | 'x' | 'rotation' | 'sy', w = zero) => {
  const values = Array.from({ length: 400 }, (_, i) => lifeOffset(lifeStyle(role), i * 15, 0, w, 1, 1)[key]);
  return Math.max(...values) - Math.min(...values);
};

describe('hero life (presentation only)', () => {
  it('gives every class its own rhythm and stays subtle', () => {
    for (const role of ['Knight', 'Warden', 'Spear', 'Martial', 'Duelist', 'Scout', 'Archer', 'Mage', 'Hexer', 'Seer', 'Saint', 'Priest', 'Alchemist', 'Bard', 'Dancer'])
      expect(LIFE_STYLES[role], role).toBeDefined();
    // Knight: slow, heavy breath, no float or sway. Mage floats. Dancer sways. Archer shifts weight.
    expect(LIFE_STYLES.Knight!.period).toBeGreaterThan(LIFE_STYLES.Dancer!.period * 2);
    expect(range('Knight', 'y')).toBe(0); expect(range('Knight', 'rotation')).toBe(0);
    expect(range('Mage', 'y')).toBeGreaterThan(1.5);
    expect(range('Dancer', 'rotation')).toBeGreaterThan(.04);
    expect(range('Archer', 'x')).toBeGreaterThan(2.5);
    // Never loud: at most ~2.5% swell, 3 px of travel, 0.06 rad at rest.
    for (const role of Object.keys(LIFE_STYLES)) {
      expect(range(role, 'sy'), role).toBeLessThan(.026);
      expect(range(role, 'y'), role).toBeLessThanOrEqual(2.5);
      expect(range(role, 'rotation'), role).toBeLessThan(.06);
    }
  });
  it('low HP breathes faster and slumps; the turn owner steps out and leans toward the skill side', () => {
    const calm = lifeOffset(lifeStyle('Knight'), 0, 0, zero, 1, 1), low = lifeOffset(lifeStyle('Knight'), 0, 0, { ...zero, low: 1 }, 1, 1);
    expect(low.sy).toBeLessThan(calm.sy); expect(low.rotation).toBeGreaterThan(calm.rotation);
    expect(lifeStyle('Knight').period * .6).toBeLessThan(lifeStyle('Knight').period);
    expect(LOW_HP).toBe(.3);
    const ready = lifeOffset(undefined, 0, 0, { ...zero, ready: 1 }, 1, 1), foe = lifeOffset(undefined, 0, 0, { ...zero, ready: 1, foe: 1 }, 1, 1);
    expect(ready.x).toBeGreaterThan(0); expect(foe.x).toBeGreaterThan(ready.x); expect(foe.rotation).toBeGreaterThan(0);
    expect(lifeOffset(undefined, 0, 0, { ...zero, ally: 1 }, 1, 1).rotation).toBeLessThan(0);
    expect(lifeOffset(undefined, 0, 0, { ...zero, relaxed: 1 }, 1, 1).sy).toBeLessThan(0);
  });
  it('drives only the bound sprite, eases postures in, pauses for motions and restores when off or downed', () => {
    const life = new HeroLife(), s = sprite();
    life.bind('h1', s, 'Knight', 96, true);
    life.set('h1', { alive: true, low: false, ready: true, relaxed: false, lean: 'foe' });
    life.update(16);
    expect(life.weights('h1')!.ready).toBeGreaterThan(0); expect(life.weights('h1')!.ready).toBeLessThan(1);
    for (let i = 0; i < 60; i++) life.update(16);
    expect(life.weights('h1')!.ready).toBeGreaterThan(.95); expect(s.x).toBeGreaterThan(0);
    // A motion owns the sprite from its rest pose.
    life.pause('h1', true); expect([s.x, s.y, s.rotation, s.scaleX, s.scaleY]).toEqual([0, 0, 0, 2, 2]);
    life.update(16); expect(s.x).toBe(0);
    life.pause('h1', false); for (let i = 0; i < 30; i++) life.update(16); expect(s.x).toBeGreaterThan(0);
    life.setEnabled(false); expect([s.x, s.rotation, s.scaleY]).toEqual([0, 0, 2]); life.update(16); expect(s.x).toBe(0);
    life.setEnabled(true); life.set('h1', { alive: false, low: false, ready: false, relaxed: false });
    expect([s.x, s.rotation, s.scaleY]).toEqual([0, 0, 2]); life.update(16); expect(s.x).toBe(0);
  });
  it('art with its own standing loop keeps only the posture layer', () => {
    const life = new HeroLife(), s = sprite();
    life.bind('h1', s, 'Mage', 96, false);
    life.set('h1', { alive: true, low: false, ready: false, relaxed: false });
    const seen = new Set<number>(); for (let i = 0; i < 200; i++) { life.update(16); seen.add(s.y); }
    expect([...seen]).toEqual([0]);
  });
});
