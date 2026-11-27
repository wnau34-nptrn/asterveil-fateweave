import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import victory from '../src/game/visuals/victory-atlases.json';
import { unitRegistry, victoryAtlasUrls, victorySheets } from '../src/game/visuals/unit-frames';

// ART-UNIT-ANIMATION-LIFE-001 R3 (owner picks 2026-11-27: Aegis R3, Eira R3b, Seren R3): small optional cheer atlases.
describe('drawn victory cheers', () => {
  const entries = victory as Record<string, { image: string; atlas: string; frames: number; decodedBytes: number; downloadBytes: number }>;
  it('ships one small atlas per picked hero, kept off the main unit atlases', () => {
    expect(victorySheets().sort()).toEqual(['aegis', 'eira', 'seren']);
    for (const [sheet, entry] of Object.entries(entries)) {
      expect(existsSync(`public/assets/units/${entry.image}`), sheet).toBe(true);
      expect(entry.downloadBytes, sheet).toBeLessThanOrEqual(500_000);
      expect(entry.decodedBytes, sheet).toBeLessThanOrEqual(1.5 * 1024 * 1024);
      expect(victoryAtlasUrls(sheet as never)?.[1]).toContain(entry.atlas);
    }
  });
  it('every cheer frame shares the idle cell (512) and sole line (496); the registry plays frames that exist', () => {
    for (const [sheet, entry] of Object.entries(entries)) {
      const atlas = JSON.parse(readFileSync(`public/assets/units/${entry.atlas}`, 'utf8')) as { frames: Record<string, { sourceSize: { w: number; h: number }; spriteSourceSize: { y: number; h: number } }> };
      for (const [name, f] of Object.entries(atlas.frames)) {
        expect(f.sourceSize, `${sheet} ${name}`).toEqual({ w: 512, h: 512 });
        expect(f.spriteSourceSize.y + f.spriteSourceSize.h, `${sheet} ${name} sole`).toBe(496);
      }
      const owner = Object.values(unitRegistry).find(d => d.sheet === sheet) as { victory?: { frames: readonly number[]; frameMs: number } };
      expect(owner.victory?.frames.every(n => String(n) in atlas.frames), sheet).toBe(true);
      expect(owner.victory!.frames.length * owner.victory!.frameMs).toBeLessThanOrEqual(1000);
    }
  });
});
