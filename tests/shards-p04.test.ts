import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { forestMap as chapterForest } from '../src/content/world/chapter-forest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { parseGame, SAVE_VERSION, upgradeStoredGame } from '../src/core/save/expedition-save';
import { addDuplicate, buyReason, departure, newProfile, settle, upgrade } from '../src/core/world/profile';
import type { Profile } from '../src/core/world/types';

// P04-02 (owner OD-15–OD-24, docs/design/p04/SCOPE_P04_00_TH.md): character shards, universal shards in place of contract
// seals, first-clear shards, story-duplicate compensation, and the no-loss v58 → v59 save conversion.

const per = map.company.shardsPerDuplicate;

describe('P04-02 shards', () => {
  it('uses the drafted costs: shards 10/20/30/40 (a duplicate = 10) and ore 15/30/45/70', () => {
    expect(per).toBe(10);
    expect(map.company.starCosts.map(c => [c.shards, c.ore])).toEqual([[10, 15], [20, 30], [30, 45], [40, 70]]);
    expect(map.company.starCosts.reduce((a, c) => a + c.ore, 0)).toBe(160);
    expect(map.shop.items.shard).toEqual({ price: 60, limit: 1 });
    expect(map.progression.firstClearShards).toBe(10);
  });

  it('takes a member from ★1 to ★5 with universal shards alone', () => {
    let p: Profile = { ...newProfile(map, 5), bank: { ore: 160, gold: 0, shard: 100, dust: 0 } };
    for (let i = 0; i < 4; i++) p = upgrade(p, map, 'guardian').profile;
    expect(p.members.guardian).toMatchObject({ stars: 5, shards: 0 }); expect(p.bank).toMatchObject({ ore: 0, shard: 0 });
  });

  it('a duplicate pays character shards, or universal shards once the member is at full stars (OD-04)', () => {
    const p = newProfile(map, 5);
    addDuplicate(p, map, 'guardian'); expect(p.members.guardian!.shards).toBe(per); expect(p.bank.shard).toBe(0);
    p.members.guardian!.stars = map.company.maxStars; addDuplicate(p, map, 'guardian');
    expect(p.members.guardian!.shards).toBe(per); expect(p.bank.shard).toBe(per);
    // The paid routes stay closed for a full-star member (no cheap universal shards from the board or a contract).
    expect(buyReason({ ...p, bank: { ...p.bank, gold: 999 } }, map, 'contract', 'guardian')).toBe('maxed');
  });

  it('pays universal shards for the first normal clear of a map once, and the hard first clear its own', () => {
    const p = newProfile(map, 5); const run = { ...departure(p, map, lookup, 3), tutorialDone: true };
    const first = settle(p, run, 'complete', map);
    expect(first.bank.shard).toBe(map.progression.firstClearShards);
    const again = settle(first, { ...departure(first, map, lookup, 4), tutorialDone: true }, 'complete', map);
    expect(again.bank.shard).toBe(first.bank.shard);
    expect(settle(p, run, 'withdrawn', map).bank.shard).toBe(0);
    const hard = settle(again, { ...departure(again, map, lookup, 5), tutorialDone: true, hard: true }, 'complete', map);
    expect(hard.bank.shard).toBe(again.bank.shard + map.progression.hardFirstClear.shard);
  });

  it('pays a story recruit the company already had as one duplicate, once (OD-22)', () => {
    const recruit = chapterForest.recruits![0]!.hero;
    const p = newProfile(chapterForest, 5, [...chapterForest.startingRoster, recruit]);
    const run = { ...departure(p, chapterForest, lookup, 3), tutorialDone: true };
    const once = settle(p, run, 'complete', chapterForest);
    expect(once.members[recruit]!.shards).toBe(per); expect(once.storyShards).toContain(recruit);
    const twice = settle(once, { ...departure(once, chapterForest, lookup, 4), tutorialDone: true }, 'complete', chapterForest);
    expect(twice.members[recruit]!.shards).toBe(per);
    // Not on a withdrawal.
    expect(settle(p, run, 'withdrawn', chapterForest).members[recruit]!.shards).toBe(0);
  });
});

describe('save v59 (P04-02)', () => {
  it('converts v58 duplicates, seals, a bought seal and the last result with no loss, and marks story recruits met', () => {
    expect(SAVE_VERSION).toBe(60);
    const p = newProfile(map, 7, ['guardian', 'tracer', 'weaver', 'healer']);
    const legacy = JSON.parse(JSON.stringify(p)) as Record<string, unknown> & { members: Record<string, Record<string, unknown>>; bank: Record<string, unknown> };
    for (const m of Object.values(legacy.members)) { delete m.shards; m.dupes = 0; }
    legacy.members.guardian!.dupes = 3; legacy.members.guardian!.stars = 2;
    legacy.bank = { ore: 5, gold: 6, seal: 2, dust: 7 };
    legacy.shop = { seal: 2 };
    legacy.last = { outcome: 'complete', ore: 1, gold: 1, seal: 1, steps: 3, wins: 1, items: 0, salvaged: 0 };
    const back = parseGame(JSON.stringify({ version: 58, profile: legacy, run: null }), map, lookup, MAPS).profile;
    expect(back.members.guardian).toMatchObject({ stars: 2, shards: 30 });
    expect(back.bank).toEqual({ ore: 5, gold: 6, shard: 20, dust: 7 });
    expect(back.shop).toEqual({ shard: 1 });
    expect(back.last).toMatchObject({ shard: 10 });
    // tracer, weaver and healer are story recruits of maps 1–2: already met, so never paid again.
    expect(back.storyShards?.sort()).toEqual(['healer', 'tracer', 'weaver']);
  });

  it('converts a carried run seal and run members, and refuses a v59 save that still has old keys', () => {
    const p = newProfile(map, 7); const run = departure(p, map, lookup, 3);
    const legacyRun = JSON.parse(JSON.stringify(run)) as Record<string, unknown> & { members: Record<string, Record<string, unknown>>; resources: Record<string, unknown> };
    for (const m of Object.values(legacyRun.members)) { m.dupes = (m.shards as number) / per; delete m.shards; }
    legacyRun.resources = { ore: 4, gold: 3, ember: 0, seal: 2 };
    const legacyProfile = JSON.parse(JSON.stringify(p)) as Record<string, unknown> & { members: Record<string, Record<string, unknown>>; bank: Record<string, unknown> };
    for (const m of Object.values(legacyProfile.members)) { m.dupes = 0; delete m.shards; }
    legacyProfile.bank = { ore: 0, gold: 0, seal: 0, dust: 0 };
    const back = parseGame(JSON.stringify({ version: 58, profile: legacyProfile, run: legacyRun }), map, lookup, MAPS);
    expect(back.run!.resources).toEqual({ ore: 4, gold: 3, ember: 0, shard: 20 });
    expect(() => parseGame(JSON.stringify({ version: 60, profile: legacyProfile, run: null }), map, lookup, MAPS)).toThrow();
  });
});

describe('server-kept games from before v59 (P04-02)', () => {
  it('converts a stored v58 game when it is read, and leaves a current game as it is', () => {
    const p = newProfile(map, 7); const game = { profile: p, run: null };
    expect(upgradeStoredGame(game, MAPS)).toBe(game);
    const legacy = JSON.parse(JSON.stringify(game)) as { profile: Record<string, unknown> & { members: Record<string, Record<string, unknown>>; bank: Record<string, unknown> } };
    for (const m of Object.values(legacy.profile.members)) { m.dupes = 2; delete m.shards; }
    legacy.profile.bank = { ore: 1, gold: 2, seal: 3, dust: 4 };
    const up = upgradeStoredGame(legacy, MAPS) as unknown as { profile: Profile };
    expect(up.profile.bank).toEqual({ ore: 1, gold: 2, shard: 30, dust: 4 });
    expect(Object.values(up.profile.members).every(m => m.shards === 20)).toBe(true);
    expect(legacy.profile.bank).toHaveProperty('seal'); // the stored copy is not mutated
  });
});
