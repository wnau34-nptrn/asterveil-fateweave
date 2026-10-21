import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as frontier } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import { parseGame } from '../src/core/save/expedition-save';
import { depart, mapUnlocked, newProfile, settle } from '../src/core/world/profile';
import type { MapDefinition, Profile } from '../src/core/world/types';

// Chapters (owner 2026-10-17): maps share the game rules, open in order and remember which ones were cleared.
const teaching: MapDefinition = { ...frontier, id: 'test-teaching', name: 'แผนที่ทดสอบ', chapter: 1 };
const maps = [teaching, frontier];
const ready = (): Profile => ({ ...newProfile(frontier, 4), tutorialDone: true });

describe('chapters', () => {
  it('every map carries the shared game rules', () => {
    for (const m of MAPS) for (const k of Object.keys(gameRules) as (keyof typeof gameRules)[]) expect(m[k]).toBe(gameRules[k]);
    expect(frontier).toMatchObject({ id: 'veil-frontier', chapter: 3, clearStory: 'warden' });
  });
  it('the first map is open; a later map opens once the one before it is cleared', () => {
    const p = ready();
    expect(mapUnlocked(p, maps, teaching.id)).toBe(true); expect(mapUnlocked(p, maps, frontier.id)).toBe(false);
    expect(mapUnlocked(p, maps, 'nowhere')).toBe(false);
    expect(mapUnlocked({ ...p, cleared: [teaching.id] }, maps, frontier.id)).toBe(true);
  });
  it('a completed run marks its map cleared once; withdrawals and wipes do not', () => {
    const { profile, run } = depart(ready(), frontier, lookup, 3);
    expect(settle(profile, run, 'withdrawn', frontier).cleared).toEqual([]);
    expect(settle(profile, run, 'wiped', frontier).cleared).toEqual([]);
    const once = settle(profile, { ...run, completed: true }, 'complete', frontier);
    expect(once.cleared).toEqual([frontier.id]);
  });
  it('v27 and older companies skip the teaching maps; finished ones also count the frontier cleared', () => {
    const p = ready() as unknown as Record<string, unknown>; delete p.cleared;
    const v21 = (patch: object) => JSON.stringify({ version: 21, profile: { ...p, ...patch }, run: null });
    expect(parseGame(v21({}), frontier, lookup, maps).profile.cleared).toEqual([teaching.id]);
    expect(parseGame(v21({ completes: 2 }), frontier, lookup, maps).profile.cleared).toEqual([teaching.id, frontier.id]);
    expect(parseGame(v21({ tutorialDone: false }), frontier, lookup, maps).profile.cleared).toEqual([]);
  });
  it('v28 keeps only known map ids and resolves the run on its own map', () => {
    const { profile, run } = depart({ ...ready(), cleared: [teaching.id] }, teaching, lookup, 5);
    const game = parseGame(JSON.stringify({ version: 28, profile, run }), frontier, lookup, maps);
    expect(game.profile.cleared).toEqual([teaching.id]); expect(game.run!.mapId).toBe(teaching.id);
    expect(() => parseGame(JSON.stringify({ version: 28, profile: { ...profile, cleared: ['nowhere'] }, run: null }), frontier, lookup, maps)).toThrow();
  });
});
