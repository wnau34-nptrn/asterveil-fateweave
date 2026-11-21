import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORLD_REV, worldArtUrl } from '../src/game/visuals/world-art';

// B5 (2026-11-21): lossy map atlases built from lossless masters; the URL revision must follow the shipped bytes.
const webpSize = (b: Buffer): { w: number; h: number } => {
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) }; // extended (alpha): canvas size minus one
  expect(kind).toBe('VP8L'); // lossless: 14-bit width/height minus one after the 0x2f signature
  const bits = b.readUInt32LE(21); return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) };
};
describe('map atlas revisions', () => {
  for (const name of Object.keys(WORLD_REV)) {
    it(`${name}: revision matches the shipped file and the CSS url; the master keeps the same size`, () => {
      const shipped = readFileSync(`public/assets/world/${name}.webp`);
      expect(createHash('sha256').update(shipped).digest('hex').slice(0, 8), 'rerun scripts/build-lossy-world.py and bump WORLD_REV').toBe(WORLD_REV[name]);
      expect(worldArtUrl(name)).toContain(`?v=${WORLD_REV[name]}`);
      const css = ['src/ui/world.css', 'src/ui/game-feel.css'].map(f => readFileSync(f, 'utf8')).join('\n');
      expect(css).not.toContain(`/assets/world/${name}.webp')`); // every CSS use carries the revision
      for (const m of css.matchAll(new RegExp(`/assets/world/${name}\\.webp\\?v=(\\w+)`, 'g'))) expect(m[1]).toBe(WORLD_REV[name]);
      expect(existsSync(`assets-master/world/${name}.webp`)).toBe(true);
      expect(webpSize(shipped)).toEqual(webpSize(readFileSync(`assets-master/world/${name}.webp`)));
    });
  }
});
