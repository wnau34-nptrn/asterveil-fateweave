import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LQIP } from '../src/ui/lqip.generated';
import { lqipFor, trackLqip } from '../src/ui/lqip';

describe('LQIP placeholders (B4)', () => {
  it('has one fresh placeholder per scene painting (rerun scripts/build-lqip.py when this fails)', () => {
    const keys = Object.keys(LQIP);
    expect(keys.length).toBeGreaterThanOrEqual(8);
    for (const rel of keys) {
      const file = `public/${rel}`;
      expect(existsSync(file), file).toBe(true);
      expect(LQIP[rel]!.v, `${rel} changed`).toBe(createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12));
      expect(LQIP[rel]!.uri.startsWith('data:image/webp;base64,')).toBe(true);
      expect(LQIP[rel]!.uri.length, rel).toBeLessThan(2500);
    }
  });
  it('covers the paintings the screens use', () => {
    for (const rel of ['title/title_party', 'lobby/lobby_bg', 'art/ruins', 'art/battle_forest', 'art/battle_riftline', 'story/story_awaken', 'story/story_rift', 'story/story_retreat'])
      expect(lqipFor(`/asterveil-fateweave/assets/${rel}.webp?v=abc`), rel).toBeTruthy();
    expect(lqipFor('/assets/world/tileset.webp')).toBeUndefined();
  });
});
describe('trackLqip', () => {
  it('does nothing without a placeholder', () => {
    const host = { style: { setProperty() { throw new Error('should not set'); } }, classList: { add() { throw new Error('no'); } }, dataset: {} } as unknown as HTMLElement;
    expect(() => trackLqip(host, '/assets/world/tileset.webp')).not.toThrow();
  });
});
