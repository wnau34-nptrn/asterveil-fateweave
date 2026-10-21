import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap as map } from '../src/content/world/chapter-ruins';
import { chapterOne } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { depart, hardReason, newProfile, settle } from '../src/core/world/profile';
import type { Profile } from '../src/core/world/types';
import { battleData } from '../src/core/world/world';

// Hard mode (master plan A9): opens with chapter 3 and per map after a normal clear; monsters +5 levels; richer
// drops; a one-time first-clear reward.
const open = (): Profile => ({ ...newProfile(map, 4), tutorialDone: true, cleared: [map.id], veteran: true });
describe('hard mode', () => {
  it('opens only after the system unlocks and the map is cleared on normal', () => {
    expect(hardReason({ ...newProfile(map, 4), cleared: [map.id] }, MAPS, map.id)).toBe('locked');
    expect(hardReason({ ...open(), cleared: [] }, MAPS, map.id)).toBe('normal');
    expect(hardReason(open(), MAPS, map.id)).toBe('');
    expect(() => depart({ ...open(), cleared: [] }, map, lookup, 3, { maps: MAPS })).toThrow();
    expect(depart(open(), map, lookup, 3, { maps: MAPS }).run.hard).toBe(true); expect(depart(open(), map, lookup, 3).run.hard).toBeUndefined();
  });
  it('every battle but the prologue fights five levels higher', () => {
    const run = depart(open(), map, lookup, 3, { maps: MAPS }).run;
    const fight = (kind: 'random' | 'tutorial') => battleData({ ...run, battle: { kind, encounterId: 'scout-patrol', entry: Object.fromEntries(run.roster.deployed.map(id => [id, run.hp[id]!])), commands: [], level: 2 } }, map, lookup)!.level;
    expect(fight('random')).toBe(2 + map.progression.hardLevels); expect(fight('tutorial')).toBe(2);
  });
  it('a hard clear records the map and pays the first-clear reward once', () => {
    const p = open(); const run = { ...depart(p, map, lookup, 3, { maps: MAPS }).run, completed: true };
    const once = settle(p, run, 'complete', map); const r = map.progression.hardFirstClear;
    expect(once.clearedHard).toEqual([map.id]); expect(once.bank.gold - p.bank.gold).toBeGreaterThanOrEqual(r.gold);
    const twice = settle(once, run, 'complete', map); expect(twice.bank.seal - once.bank.seal).toBe(0);
  });
  it('saves v33 hard runs and hard clears; a hard clear must also be a normal clear', () => {
    const { profile, run } = depart({ ...open(), clearedHard: [map.id] }, map, lookup, 3, { maps: MAPS }); let raw = '';
    saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, { profile, run });
    const back = parseGame(raw, chapterOne, lookup, MAPS); expect(back.run!.hard).toBe(true); expect(back.profile.clearedHard).toEqual([map.id]);
    const bad = JSON.parse(raw); bad.profile.cleared = []; expect(() => parseGame(JSON.stringify(bad), chapterOne, lookup, MAPS)).toThrow();
  });
});
