import { describe, expect, it } from 'vitest';
import { classTone } from '../src/ui/portraits';

// Owner 2026-11-26: the character page is lit in its class colour; a parked second character of a class shares it (OD-14).
describe('classTone', () => {
  const heroes = [{ id: 'metta', role: 'Saint', color: 0xd4b46b }, { id: 'thiran', role: 'Saint', color: 0x7cb6ac }, { id: 'mira', role: 'Archer', color: 0x6fbf73 }];
  it('uses the class lead colour as a six-digit hex', () => {
    expect(classTone(heroes[2]!, heroes)).toBe('#6fbf73');
    expect(classTone({ role: 'X', color: 0x00a0ff }, heroes)).toBe('#00a0ff');
  });
  it('gives a parked character its class lead colour', () => {
    expect(classTone(heroes[1]!, heroes, ['thiran'])).toBe('#d4b46b');
    expect(classTone(heroes[0]!, heroes, ['thiran'])).toBe('#d4b46b');
  });
});
