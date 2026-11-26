import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import atlasManifest from '../src/game/visuals/unit-atlases.json';
import { actorArt } from '../src/game/visuals/assets';
import { sequence, unitClip, unitDefinition, unitIdleFrame } from '../src/game/visuals/unit-frames';
import { mineEncounters } from '../src/content/encounters/catalog';
import portraitsHalf from '../src/game/visuals/portraits-half.json';

// ART-UNIT-ANIMATION-MINE-001 (map 5): the five semi-chibi mine foes on the shared 22-frame layout (the bat 26 with its hover).
const foes = {
  foe_crystal_bat: { sheet: 'crystalbat', frames: 26, still: 0, clips: { 'Crystal Cry': 'attack' } },
  foe_ore_golem: { sheet: 'oregolem', frames: 22, still: 1, clips: { 'Ore Fist': 'attack' } },
  foe_possessed_worker: { sheet: 'possessedworker', frames: 22, still: 2, clips: { 'Pick Swing': 'attack' } },
  foe_mine_overseer: { sheet: 'mineoverseer', frames: 22, still: 3, clips: { 'Overseer Hammer': 'attack', 'Crystal Spark': 'skill' } },
  foe_crystal_eater: { sheet: 'crystaleater', frames: 22, still: 4, clips: { 'Crystal Bite': 'attack', 'Shard Eruption': 'skill' } },
} as const;
type Entry = { image: string; atlas: string; width: number; height: number; frames: number; decodedBytes: number; downloadBytes: number };

describe('mine foes', () => {
  for (const [art, f] of Object.entries(foes)) describe(art, () => {
    const m = (atlasManifest as Record<string, Entry>)[f.sheet]!;
    it('has a lossless atlas of full 512 px cells on the shared layout', () => {
      expect(m.frames).toBe(f.frames);
      expect(m.decodedBytes).toBe(m.width * m.height * 4);
      expect(Math.max(m.width, m.height)).toBeLessThanOrEqual(4096);
      const atlas = JSON.parse(readFileSync(`public/assets/units/${m.atlas}`, 'utf8'));
      expect(Object.keys(atlas.frames)).toHaveLength(m.frames);
      expect(readFileSync(`public/assets/units/${m.image}`).subarray(12, 16).toString('ascii')).toBe('VP8L');
      for (const frame of Object.values(atlas.frames) as { sourceSize: { w: number; h: number } }[]) expect(frame.sourceSize).toEqual({ w: 512, h: 512 });
    });
    it('draws each real intent with its own strip, plus hit and down', () => {
      expect(unitDefinition(art)?.intents).toEqual(f.clips);
      for (const [move, clip] of Object.entries(f.clips)) {
        expect(unitClip(art, undefined, move)).toBe(clip);
        expect(sequence('cast', 'prepare', clip, art)?.length).toBeGreaterThan(0);
      }
      expect(sequence('hit', 'reaction', undefined, art)).toEqual([17, 18]);
      expect(sequence('down', 'reaction', undefined, art)).toEqual([19, 20, 21]);
    });
    it('has its still and portrait cell on the foes4 sheets', () => expect(actorArt[art]).toEqual({ sheet: 'foes4', frame: f.still }));
  });
  it('only the bat hovers, on frames 22..25', () => {
    expect([0, 150, 300, 450, 600].map(t => unitIdleFrame('foe_crystal_bat', t))).toEqual([22, 23, 24, 25, 22]);
    for (const a of ['foe_ore_golem', 'foe_possessed_worker', 'foe_mine_overseer', 'foe_crystal_eater']) expect(unitIdleFrame(a, 100)).toBeUndefined();
  });
  it('every mine foe wears its own body (the giant and its fragments since MINE-BOSS-001)', () => {
    const arts = new Set(mineEncounters.flatMap(e => e.enemies.map(enemy => enemy.art)));
    for (const art of Object.keys(foes)) expect(arts.has(art)).toBe(true);
    expect([...arts].filter((a): a is string => !!a && !(a in foes)).sort()).toEqual(['foe_crystal_fragment', 'foe_crystal_giant']);
  });
  it('ships the still, portrait and half-portrait sheets with revisions', () => {
    for (const name of ['units_foes4', 'portraits_foes4', 'portraits_foes4_half']) expect(existsSync(`public/assets/art/${name}.webp`)).toBe(true);
    expect(portraitsHalf.portraits_foes4).toMatch(/^[0-9a-f]{8}$/);
  });
});
