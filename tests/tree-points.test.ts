import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { SAVE_VERSION, parseGame, saveGame, upgradeStoredGame, type Game } from '../src/core/save/expedition-save';
import { depart, learnTalent, newProfile, resetTalents, settle, talentReason } from '../src/core/world/profile';
import { talentPoints, talentsSpent, talentsValid, treeClears } from '../src/core/world/talents';
import type { Profile, Talents } from '../src/core/world/types';
import { capXp, learnRunTalent, levelOf } from '../src/core/world/world';
import { xpAt } from './fixtures/camp-level';
import { bigTreeIds, countBuilds } from './sim/tree-points';

// P04-03 (owner OD-02/19/20/27, save v60): tree points come from the camp level (Lv2–10) and first map clears, the same
// for every member; stars give none. Proposal and counts: docs/design/p04/TREE_BIGPICTURE_P04_03_TH.md.
const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); return raw; };
const cleared = MAPS.slice(0, 3).map(m => m.id);
// Legal with the old ★5 allowance (9 + 4 = 13) and one rank over the new one (12).
const thirteen: Talents = { a1: 2, a2i: 1, a3: 1, a3s: 1, b1: 2, b2: 1, b3r: 1, c1: 2, c1s: 1, c2v: 1 };
const ten: Talents = { a1: 2, a2d: 1, a3: 1, a3s: 1, b1: 1, b2: 1, b3r: 1, c1: 2 };
function camp(): Profile {
  const p = newProfile(map, 11, ['guardian', 'tracer', 'weaver', 'healer']); p.tutorialDone = true; p.campXp = capXp(map); p.cleared = [...cleared];
  p.members.guardian = { stars: 5, shards: 0 }; p.members.tracer = { stars: 3, shards: 0, talents: { ...ten }, loadout: ['mark', 'execute', 'lunge'] };
  return p;
}
const v59 = (profile: Profile, run: unknown = null): string => JSON.stringify({ version: 59, profile, run });

describe('tree points from the camp level and first clears (P04-03)', () => {
  it('gives 9 for Lv2–10 and one per first clear, whatever the stars', () => {
    expect(SAVE_VERSION).toBe(60);
    expect([1, 2, 10, 30].map(lv => talentPoints(map, lv))).toEqual([0, 1, 9, 9]);
    expect(talentPoints(map, 10, 3)).toBe(12);
    expect(treeClears({ cleared })).toBe(3); expect(treeClears({ clears: 2 })).toBe(2); expect(treeClears({})).toBe(0);
    let p = camp(); p.cleared = [];
    for (const [node, want] of Object.entries(thirteen)) for (let i = 0; i < want!; i++) { const r = learnTalent(p, map, 'guardian', node); if (r.event.type === 'blocked') break; p = r.profile; }
    // A ★5 knight stops at the camp's 9 points; the tenth needs a first clear.
    expect(talentsSpent(p.members.guardian!.talents)).toBe(9);
    expect(talentReason(p, map, 'guardian', 'c1')).toBe('points');
    expect(talentReason({ ...p, cleared: [cleared[0]!] }, map, 'guardian', 'c1')).toBe('');
  });
  it('a first normal clear adds a point; a hard clear and a repeat do not', () => {
    const p = { ...camp(), cleared: [] as string[] }; p.campXp = xpAt(4);
    const out = depart(p, map, lookup, 3); expect(out.run.clears).toBeUndefined();
    const home = settle(out.profile, { ...out.run, completed: true, bossDefeated: true }, 'complete', map);
    expect(home.cleared).toEqual([map.id]); expect(talentPoints(map, levelOf(map, home), treeClears(home))).toBe(talentPoints(map, levelOf(map, p)) + 1);
    const again = depart(home, map, lookup, 4); expect(again.run.clears).toBe(1);
    const twice = settle(again.profile, { ...again.run, completed: true, bossDefeated: true }, 'complete', map);
    expect(treeClears(twice)).toBe(1);
    const hard = { ...twice, cleared: [...cleared] }, h = depart(hard, map, lookup, 5, { maps: MAPS });
    const after = settle(h.profile, { ...h.run, completed: true, bossDefeated: true }, 'complete', map);
    expect(after.clearedHard).toEqual([map.id]); expect(treeClears(after)).toBe(3);
  });
  it('a run spends with the clears it set out with', () => {
    const p = camp(); p.members.guardian!.talents = { ...thirteen, c2v: 0 }; delete p.members.guardian!.talents.c2v;
    const run = depart(p, map, lookup, 9).run; expect(run.clears).toBe(3);
    expect(learnRunTalent(run, map, lookup, 'guardian', 'c2v').state).toBe(run);
    const spare = structuredClone(run); delete spare.members.guardian!.talents!.b3r;
    expect(learnRunTalent(spare, map, lookup, 'guardian', 'c2v').state.members.guardian!.talents!.c2v).toBe(1);
    expect(learnRunTalent({ ...spare, clears: 2 }, map, lookup, 'guardian', 'c2v').state.members.guardian!.talents!.c2v).toBeUndefined();
  });
});

describe('save v60 (P04-03)', () => {
  it('resets a tree that is over the new allowance, free, and keeps every other build', () => {
    const old = camp(); old.members.guardian!.talents = { ...thirteen }; old.members.guardian!.loadout = ['guard', 'bulwark', 'rally'];
    const g = parseGame(v59(old), map, lookup, MAPS);
    expect(g.profile.members.guardian).toEqual({ stars: 5, shards: 0 });
    expect(g.profile.members.tracer).toEqual(old.members.tracer);
    expect(g.profile.treeReset).toEqual(['guardian']);
    // The notice travels with the save and leaves when the member spends a point again; resetting stays free.
    const again = parseGame(write(g), map, lookup, MAPS); expect(again.profile.treeReset).toEqual(['guardian']);
    const learnt = learnTalent(again.profile, map, 'guardian', 'a1').profile; expect(learnt.treeReset).toBeUndefined();
    expect(resetTalents(learnt, 'guardian').profile.members.guardian!.talents).toBeUndefined();
    // The same save at the current version is over the allowance and is refused.
    expect(() => parseGame(JSON.stringify({ version: 60, profile: old, run: null }), map, lookup, MAPS)).toThrow();
    expect(() => parseGame(JSON.stringify({ version: 60, profile: { ...camp(), treeReset: ['nobody'] }, run: null }), map, lookup, MAPS)).toThrow();
  });
  it('lets a run in progress finish with what it had spent, then resets at home', () => {
    const old = camp(); old.members.guardian!.talents = { ...thirteen };
    const out = depart(old, map, lookup, 21); const legacyRun = structuredClone(out.run) as unknown as Record<string, unknown>; delete legacyRun.clears;
    const g = parseGame(v59(out.profile, legacyRun), map, lookup, MAPS);
    expect(g.run!.members.guardian!.talents).toEqual(thirteen); expect(g.run!.clears).toBe(4);
    expect(g.profile.members.guardian!.talents).toBeUndefined(); expect(g.profile.treeReset).toEqual(['guardian']);
    expect(parseGame(write(g), map, lookup, MAPS).run!.clears).toBe(4);
    const home = settle(g.profile, g.run!, 'withdrawn', map);
    expect(home.members.guardian!.talents).toBeUndefined(); expect(home.members.tracer!.talents).toEqual(ten); expect(home.treeReset).toEqual(['guardian']);
  });
  it('converts a stored server game the same way and leaves a current one untouched', () => {
    const old = camp(); old.members.guardian!.talents = { ...thirteen };
    const stored = { profile: old, run: null }; const up = upgradeStoredGame(stored, MAPS);
    expect(up).not.toBe(stored); expect(up.profile.members.guardian!.talents).toBeUndefined(); expect(up.profile.treeReset).toEqual(['guardian']);
    expect(stored.profile.members.guardian!.talents).toEqual(thirteen);
    expect(upgradeStoredGame(up, MAPS)).toBe(up);
    const fine = { profile: camp(), run: null }; expect(upgradeStoredGame(fine, MAPS)).toBe(fine);
  });
});

describe('legal big-tree builds by point total', () => {
  it('the enumerator agrees with the game rule on sampled full builds', () => {
    for (const id of ['guardian', 'healer', 'metta']) {
      const seen: Talents[] = []; countBuilds(id, 12, 10, t => seen.push(t));
      expect(seen.length).toBeGreaterThan(20);
      for (const t of seen) { expect(talentsValid(map, id, 10, t, 3), `${id} ${JSON.stringify(t)}`).toBe(true); expect(talentsValid(map, id, 10, t, 2)).toBe(false); }
    }
  });
  it('12 points leave a choice in every class; 15 would buy everything a class tree holds at Lv10', () => {
    expect(countBuilds('guardian', 12)).toMatchObject({ full: 160, spare: 0, skills: 4 });
    expect(countBuilds('healer', 12)).toMatchObject({ full: 48, spare: 0, skills: 4 });
    expect(countBuilds('guardian', 15)).toMatchObject({ full: 8, spare: 1 });
    expect(countBuilds('healer', 15)).toMatchObject({ full: 8, spare: 2 });
    expect(countBuilds('metta', 15)).toMatchObject({ full: 56, spare: 0 });
    for (const id of bigTreeIds()) { const c = countBuilds(id, 12); expect(c.spare, id).toBe(0); expect(c.full, id).toBeGreaterThanOrEqual(40); expect(c.skills, id).toBe(c.allSkills); }
  });
});
