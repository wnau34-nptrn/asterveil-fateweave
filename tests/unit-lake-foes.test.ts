import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import atlasManifest from '../src/game/visuals/unit-atlases.json';
import { actorArt } from '../src/game/visuals/assets';
import { sequence, unitDefinition, unitIdleFrame } from '../src/game/visuals/unit-frames';
import { encounterById, LAKE_STANDINS } from '../src/content/encounters/catalog';
import { lakeFoeArts, lakeFoeIntents, unitA4Fixture } from './fixtures/unit-a4';

// ART-UNIT-ANIMATION-LAKE-001 (map 4 phase 2): tide slime, mist wisp, stone crab, mirror shade on the shared 22-frame layout.
const sheets = { foe_tide_slime: 'tideslime', foe_mist_wisp: 'mistwisp', foe_stone_crab: 'stonecrab', foe_mirror_shade: 'mirrorshade' } as const;
const clips = { foe_tide_slime: 'skill', foe_mist_wisp: 'attack', foe_stone_crab: 'attack', foe_mirror_shade: 'attack' } as const;
describe('lake foes (phase 2)', () => {
  for (const art of lakeFoeArts) describe(art, () => {
    const m = (atlasManifest as Record<string, { image: string; atlas: string; width: number; height: number; frames: number; decodedBytes: number; downloadBytes: number }>)[sheets[art]]!;
    it('has a lossless atlas whose frames follow the shared layout', () => {
      expect(m.frames).toBe(art === 'foe_mist_wisp' ? 25 : 22);
      expect(m.decodedBytes).toBe(m.width * m.height * 4);
      const atlas = JSON.parse(readFileSync(`public/assets/units/${m.atlas}`, 'utf8'));
      expect(Object.keys(atlas.frames)).toHaveLength(m.frames);
      expect(readFileSync(`public/assets/units/${m.image}`).subarray(12, 16).toString('ascii')).toMatch(/VP8[LX]/);
      for (const f of Object.values(atlas.frames) as { sourceSize: { w: number; h: number } }[]) expect(f.sourceSize).toEqual({ w: 512, h: 512 });
    });
    it('draws its real intent with the clip of the strip it ships, plus hit and down', () => {
      const clip = clips[art];
      expect(unitDefinition(art)?.intents).toEqual({ [lakeFoeIntents[art]]: clip });
      expect(sequence('cast', 'prepare', clip, art)?.length).toBeGreaterThan(0);
      expect(sequence('hit', 'reaction', undefined, art)).toEqual([17, 18]);
      expect(sequence('down', 'reaction', undefined, art)).toEqual([19, 20, 21]);
    });
    it('has a still and portrait cell and a real resolver turn for its intent', () => {
      expect(actorArt[art]!.sheet).toBe('foes3');
      const f = unitA4Fixture('mira', 'attack', 'normal', art); expect(f.result.turns.length).toBeGreaterThan(0);
    });
  });
  it('only the wisp hovers, on frames 22..24', () => {
    expect([0, 160, 320, 480].map(t => unitIdleFrame('foe_mist_wisp', t))).toEqual([22, 23, 24, 22]);
    for (const a of ['foe_tide_slime', 'foe_stone_crab', 'foe_mirror_shade']) expect(unitIdleFrame(a, 100)).toBeUndefined();
  });
  it('ships the foes3 still and portrait sheets, and the lake sets that use only these foes are no stand-ins', () => {
    for (const f of ['units_foes3', 'portraits_foes3', 'portraits_foes3_half']) expect(existsSync(`public/assets/art/${f}.webp`)).toBe(true);
    for (const id of ['lake-slimes', 'lake-mist', 'crab-wall', 'isle-host', 'pavilion-mist']) { expect(encounterById(id)).toBeDefined(); expect(LAKE_STANDINS.has(id)).toBe(false); }
    expect([...LAKE_STANDINS].sort()).toEqual(['elite-shadow-serpent', 'elite-weeping-siren', 'water-spirit']);
  });
});
