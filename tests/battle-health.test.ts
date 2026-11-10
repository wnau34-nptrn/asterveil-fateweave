import { expect, it } from 'vitest';
import { healthRatio, healthTone } from '../src/ui/battle-health';

it('uses exact inclusive 40% orange and 25% red boundaries for both sides', () => {
  expect([100, 41, 40, 26, 25, 1, 0].map(hp => healthTone(hp, 100))).toEqual(['green', 'green', 'orange', 'orange', 'red', 'red', 'red']);
  expect(healthTone(80, 200)).toBe('orange'); expect(healthTone(50, 200)).toBe('red');
  expect(healthRatio(-1, 100)).toBe(0); expect(healthRatio(101, 100)).toBe(1); expect(healthRatio(1, 0)).toBe(0);
});
