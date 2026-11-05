import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TOME_LINES, TOME_SIZES } from '../src/core/world/types';
import { TOME_ATLAS, tomeCell } from '../src/game/visuals/tome-art';

describe('painted tomes (ART-UI-PROGRESS-001)', () => {
  it('maps every line and size to its own cell inside the 3x3 atlas', () => {
    const seen = new Set<string>();
    for (const l of TOME_LINES) for (const z of TOME_SIZES) {
      const c = tomeCell(l, z);
      expect(c.col).toBeGreaterThanOrEqual(0); expect(c.col).toBeLessThan(TOME_ATLAS.cols);
      expect(c.row).toBeGreaterThanOrEqual(0); expect(c.row).toBeLessThan(TOME_ATLAS.rows);
      seen.add(`${c.col},${c.row}`);
    }
    expect(seen.size).toBe(9);
  });
  it('keeps the atlas small (lossless 384x384 WebP under 200 KB)', () => {
    const b = readFileSync('public/assets/ui/progress/tome_items.webp');
    expect(b.byteLength).toBeLessThan(200_000);
  });
});
