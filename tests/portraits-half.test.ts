import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import revs from '../src/game/visuals/portraits-half.json';
import { portrait } from '../src/ui/portraits';

// Perf audit R10: half-size portrait atlases for the small DOM portraits; the masters stay for the story figure.
function webpSize(path: string): [number, number] {
  const b = readFileSync(path), kind = b.subarray(12, 16).toString('ascii');
  if (kind === 'VP8L') { const bits = b.readUInt32LE(21); return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  throw new Error(`${path}: ${kind}`);
}
describe('half-size portrait atlases (R10)', () => {
  for (const [name, rev] of Object.entries(revs)) it(`${name}_half is the master at exactly half size, current revision`, () => {
    const [w, h] = webpSize(`public/assets/art/${name}.webp`), [hw, hh] = webpSize(`public/assets/art/${name}_half.webp`);
    expect([hw, hh]).toEqual([w / 2, h / 2]);
    expect(createHash('sha256').update(readFileSync(`public/assets/art/${name}_half.webp`)).digest('hex').slice(0, 8)).toBe(rev);
  });
  it('small portraits use the half atlas; the story figure keeps the master', () => {
    expect(portrait('garran')).toContain(`portraits_mercs_half.webp?v=${revs.portraits_mercs}`);
    expect(portrait('garran')).toContain('width="512"');
    expect(portrait('garran', true)).toContain('portraits_mercs.webp');
    expect(portrait('foe_kragmor')).toContain('portraits_worldboss.webp');
  });
});
