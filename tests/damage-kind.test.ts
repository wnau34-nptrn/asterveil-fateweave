import { describe, expect, it } from 'vitest';
import type { Intent } from '../src/core/battle/types';
import { damageKindOf, damageKindText, kindGlyph, kindPill } from '../src/ui/damage-kind';

const base = { sourceId: 'e1', targetSlot: 0, name: 'x', damage: 10, round: 1 } as unknown as Intent;
describe('incoming damage kind badge', () => {
  it('names physical as กายภาพ and energy as เวท, with a word and a shape (not colour alone)', () => {
    expect(damageKindText.physical).toBe('กายภาพ'); expect(damageKindText.energy).toBe('เวท');
    expect(kindPill('physical')).toContain('กายภาพ'); expect(kindPill('energy')).toContain('เวท');
    expect(kindPill('physical')).toContain('<svg'); expect(kindGlyph('energy')).toContain('data-kind="energy"');
  });
  it('shows a kind only for an intent that deals damage of its own', () => {
    expect(damageKindOf({ ...base, kind: 'energy' })).toBe('energy');
    expect(damageKindOf({ ...base, kind: 'physical' })).toBe('physical');
    expect(damageKindOf({ ...base, kind: 'physical', charge: true } as Intent)).toBeUndefined();
    expect(damageKindOf({ ...base, kind: 'physical', special: 'phase' } as Intent)).toBeUndefined();
    expect(damageKindOf(null)).toBeUndefined();
  });
});
