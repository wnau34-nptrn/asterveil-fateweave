import { describe, expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chooseLoadout, depart, learnTalent, newProfile, resetTalents, settle, talentReason } from '../src/core/world/profile';
import { chooseRunLoadout, heroDef, memberDef, skillChoices, starred } from '../src/core/world/world';
import { isBigTree, talentPoints } from '../src/core/world/talents';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import type { Profile } from '../src/core/world/types';

// Knight big tree (master plan A6, docs/design/SKILL_TREE_KNIGHT_TH.md): 3 branches × 4 tiers, pick-one modifiers,
// three equipped skills, one point per level and per star.
const knightAt = (level: number, stars = 1): Profile => { const p = newProfile(map, 3); p.members.guardian = { stars, dupes: 0, level, exp: 0 }; return p; };
const learn = (p: Profile, ...nodes: string[]) => nodes.reduce((q, n) => { const r = learnTalent(q, map, 'guardian', n); expect(r.event.type, n).toBe('talent'); return r.profile; }, p);
const base = heroDef(lookup, map, 'guardian')!;
describe('knight big tree: shape and gates', () => {
  it('has three branches of four tiers with six active skills', () => {
    const tree = map.talents.guardian!; expect(isBigTree(tree)).toBe(true);
    for (const b of ['a', 'b', 'c']) expect(new Set(tree.filter(n => n.branch === b).map(n => n.tier))).toEqual(new Set([1, 2, 3, 4]));
    const all = Object.fromEntries(tree.map(n => [n.id, n.max]));
    expect(skillChoices(base, map, all)).toEqual(['guard', 'bash', 'bulwark', 'challenge', 'rally', 'rouse']);
    expect(isBigTree(map.talents.toma)).toBe(true);
  });
  it('points come from levels and stars', () => {
    expect(talentPoints(map, { stars: 1, dupes: 0, level: 1 }, 'guardian')).toBe(0);
    expect(talentPoints(map, { stars: 3, dupes: 0, level: 5 }, 'guardian')).toBe(6);
    expect(talentPoints(map, { stars: 3, dupes: 0, level: 5 }, 'toma')).toBe(6);
  });
  it('tiers open by level and need the branch tier before them; choices exclude each other', () => {
    let p = knightAt(4, 3);
    expect(talentReason(p, map, 'guardian', 'a2i')).toBe('level');
    p = knightAt(5, 3); expect(talentReason(p, map, 'guardian', 'a2i')).toBe('locked');
    p = learn(p, 'a1'); expect(talentReason(p, map, 'guardian', 'a2i')).toBe('');
    p = learn(p, 'a2i'); expect(talentReason(p, map, 'guardian', 'a2t')).toBe('choice');
    expect(talentReason(p, map, 'guardian', 'c2b')).toBe('locked');
    p = learn(p, 'c1s', 'c2v'); expect(talentReason(p, map, 'guardian', 'c2b')).toBe('choice');
    expect(talentReason(p, map, 'guardian', 'a3')).toBe('level');
  });
});
describe('knight big tree: skills, loadout and battle buttons', () => {
  it('stars no longer unlock his skills; the tree and grants do', () => {
    expect(starred(base, 5, map).actions).toEqual(['attack', 'guard', 'bash']); expect(starred(base, 5, map).passive).toBeUndefined();
    const granted = starred(base, 5, map, 1, {}, undefined, { grants: ['c1s', 'a4'] });
    expect(granted.actions).toEqual(['attack', 'guard', 'bash', 'rally']); expect(granted.passive).toBe('stand');
    expect(starred(base, 1, map, 10, { b1: 1, b2: 1 }).actions).toEqual(['attack', 'guard', 'bash', 'challenge']);
    expect(starred(base, 1, map, 10, { a1: 1, a2i: 1, a3: 1 }).armour).toBe(6);
  });
  it('chooses up to three unlocked skills in the lobby and on the map; reset returns to the default', () => {
    let p = learn(knightAt(6, 3), 'b1', 'b2', 'c1s');
    expect(chooseLoadout(p, map, lookup, 'guardian', ['bulwark']).event).toEqual({ type: 'blocked', reason: 'locked' });
    expect(chooseLoadout(p, map, lookup, 'guardian', ['guard', 'bash', 'rally', 'challenge']).event).toEqual({ type: 'blocked', reason: 'size' });
    p = chooseLoadout(p, map, lookup, 'guardian', ['challenge', 'rally', 'guard']).profile;
    expect(memberDef(lookup, map, p.members, 'guardian')!.actions).toEqual(['attack', 'challenge', 'rally', 'guard']);
    const { profile, run } = depart(p, map, lookup, 9);
    const moved = chooseRunLoadout(run, map, lookup, 'guardian', ['bash', 'challenge']).state;
    expect(moved.members.guardian!.loadout).toEqual(['bash', 'challenge']);
    expect(settle(profile, moved, 'withdrawn', map).members.guardian!.loadout).toEqual(['bash', 'challenge']);
    expect(resetTalents(p, 'guardian').profile.members.guardian!.loadout).toBeUndefined();
  });
});
describe('save v34', () => {
  const raw = (game: Parameters<typeof saveGame>[1]) => { let out = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { out = v; } }, game); return out; };
  it('round-trips tree ranks, grants and loadouts and rejects a locked loadout', () => {
    const p = chooseLoadout(learn({ ...knightAt(6, 3), members: { ...knightAt(6, 3).members, guardian: { stars: 3, dupes: 0, level: 6, exp: 0, grants: ['c1s'] } } }, 'b1', 'b2'), map, lookup, 'guardian', ['challenge', 'rally']).profile;
    const text = raw({ profile: p, run: null }); expect(JSON.parse(text).version).toBe(39);
    expect(parseGame(text, map, lookup).profile.members.guardian).toEqual(p.members.guardian);
    const bad = JSON.parse(text); bad.profile.members.guardian.loadout = ['rouse']; expect(() => parseGame(JSON.stringify(bad), map, lookup)).toThrow();
  });
  it('v33 refunds the old knight ranks, grants star skills and sends a changed run home', () => {
    const p = knightAt(4, 5); const { run } = depart(p, map, lookup, 5);
    const old = JSON.parse(raw({ profile: p, run })); old.version = 33;
    old.profile.members.guardian.talents = { root: 1, a1: 2 }; old.run.members.guardian.talents = { root: 1, a1: 2 };
    const back = parseGame(JSON.stringify(old), map, lookup);
    expect(back.run).toBeNull(); expect(back.profile.members.guardian).toMatchObject({ stars: 5, grants: ['a4', 'c1s'] });
    expect(back.profile.members.guardian!.talents).toBeUndefined();
    const plain = JSON.parse(raw({ profile: p, run })); plain.version = 33;
    expect(parseGame(JSON.stringify(plain), map, lookup).run).not.toBeNull();
  });
});
