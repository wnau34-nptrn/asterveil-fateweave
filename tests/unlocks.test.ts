import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne } from '../src/content/world/chapter1';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { forestMap } from '../src/content/world/chapter-forest';
import { MAPS } from '../src/content/world/maps';
import { parseGame } from '../src/core/save/expedition-save';
import { featureMap, featureOpen, newProfile } from '../src/core/world/profile';
import type { LobbyFeature } from '../src/core/world/types';

// Master plan A3 (owner 2026-10-21): lobby systems open by chapter; older companies keep everything.
describe('lobby systems by chapter', () => {
  const fresh = () => newProfile(ruinsMap, 3, ruinsMap.firstCompany);
  it('chapter-1 systems open after map 1; later ones fall back to the latest built map before them', () => {
    expect(featureMap(MAPS, 'forge')!.id).toBe(ruinsMap.id); expect(featureMap(MAPS, 'level')!.id).toBe(forestMap.id);
    for (const f of ['hire', 'team', 'fuse', 'transfer', 'bossCharm'] as LobbyFeature[]) expect(featureMap(MAPS, f)!.id).toBe(chapterOne.id);
    const p = fresh(); expect(featureOpen(p, MAPS, 'forge')).toBe(false); expect(featureOpen(p, MAPS, 'hire')).toBe(false);
    const after1 = { ...p, cleared: [ruinsMap.id] };
    expect(featureOpen(after1, MAPS, 'forge')).toBe(true); expect(featureOpen(after1, MAPS, 'tree')).toBe(true); expect(featureOpen(after1, MAPS, 'hire')).toBe(false);
    expect(featureOpen({ ...after1, cleared: [ruinsMap.id, chapterOne.id] }, MAPS, 'transfer')).toBe(true);
  });
  it('a company from an older save that finished the prologue is a veteran with everything open', () => {
    const p = { ...newProfile(chapterOne, 3), tutorialDone: true };
    const old = parseGame(JSON.stringify({ version: 30, profile: p, run: null }), chapterOne, lookup, MAPS).profile;
    expect(old.veteran).toBe(true); expect(featureOpen(old, MAPS, 'transfer')).toBe(true);
    expect(parseGame(JSON.stringify({ version: 30, profile: { ...p, tutorialDone: false }, run: null }), chapterOne, lookup, MAPS).profile.veteran).toBeUndefined();
    expect(parseGame(JSON.stringify({ version: 31, profile: p, run: null }), chapterOne, lookup, MAPS).profile.veteran).toBeUndefined();
    expect(() => parseGame(JSON.stringify({ version: 31, profile: { ...p, veteran: 'yes' }, run: null }), chapterOne, lookup, MAPS)).toThrow();
  });
});
