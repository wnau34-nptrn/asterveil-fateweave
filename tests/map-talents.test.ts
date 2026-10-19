import { describe, expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { depart, newProfile, resetTalents, settle } from '../src/core/world/profile';
import { learnRunTalent, memberDef } from '../src/core/world/world';
import { parseGame } from '../src/core/save/expedition-save';
import type { TalentNode } from '../src/core/world/types';

function setup(level = 4) {
  const profile = newProfile(map, 77); profile.tutorialDone = true;
  profile.commander = { name: 'อารี', crest: 'star', color: 'gold' };
  profile.members.guardian = { stars: 1, dupes: 0, level, exp: 0 };
  return depart(profile, map, lookup, 1234);
}

describe('passive points during exploration', () => {
  it('uses the same gates and budget as camp, without healing, walking or consuming RNG', () => {
    const game = setup(); game.run.hp.guardian = 11;
    const original = structuredClone(game.run), oldHp = memberDef(lookup, map, original.members, 'guardian')!.maxHp;
    expect(learnRunTalent(original, map, lookup, 'guardian', 'a1').state).toBe(original);
    let run = learnRunTalent(original, map, lookup, 'guardian', 'root').state;
    expect(memberDef(lookup, map, run.members, 'guardian')!.maxHp).toBeGreaterThan(oldHp);
    expect(run.hp.guardian).toBe(11);
    run = learnRunTalent(run, map, lookup, 'guardian', 'b1').state;
    run = learnRunTalent(run, map, lookup, 'guardian', 'b1').state;
    expect(learnRunTalent(run, map, lookup, 'guardian', 'b2').state).toBe(run);
    expect(learnRunTalent(run, map, lookup, 'guardian', 'b3').state).toBe(run);
    expect(run.members.guardian!.talents).toEqual({ root: 1, b1: 2 });
    expect(run.position).toEqual(original.position); expect(run.rolls).toBe(original.rolls); expect(run.steps).toBe(original.steps);
    expect(game.run).toEqual(original); expect(game.profile.members.guardian!.talents).toBeUndefined();
  });
  it('supports brought reserves and fallen heroes, and rejects invalid, unowned, battle and finished actions', () => {
    const game = setup(); game.run.roster.deployed = ['tracer', 'weaver', 'healer']; game.run.roster.reserve = ['guardian']; game.run.hp.guardian = 0;
    const learned = learnRunTalent(game.run, map, lookup, 'guardian', 'root').state;
    expect(learned.members.guardian!.talents).toEqual({ root: 1 }); expect(learned.hp.guardian).toBe(0);
    expect(learnRunTalent(learned, map, lookup, 'guardian', 'root').state).toBe(learned);
    expect(learnRunTalent(learned, map, lookup, 'guardian', 'fake' as TalentNode).state).toBe(learned);
    expect(learnRunTalent(learned, map, lookup, 'mira', 'root').state).toBe(learned);
    for (const run of [{ ...learned, completed: true }, { ...learned, battle: { kind: 'random' as const, encounterId: map.tutorialEncounterId, entry: learned.hp, commands: [] } }]) {
      expect(learnRunTalent(run, map, lookup, 'guardian', 'b1').state).toBe(run);
    }
  });
  it('round-trips existing v21 fields and keeps learned points on every return outcome, with free camp reset', () => {
    const game = setup();
    const old = parseGame(JSON.stringify({ version: 21, ...game }), map, lookup);
    expect(old.run!.members.guardian!.talents).toBeUndefined();
    const run = learnRunTalent(game.run, map, lookup, 'guardian', 'root').state;
    const loaded = parseGame(JSON.stringify({ version: 21, profile: game.profile, run }), map, lookup);
    expect(loaded.run!.members.guardian!.talents).toEqual({ root: 1 });
    expect(learnRunTalent(loaded.run!, map, lookup, 'guardian', 'root').state).toBe(loaded.run);
    for (const outcome of ['withdrawn', 'complete', 'wiped'] as const) {
      const profile = settle(game.profile, loaded.run!, outcome, map);
      expect(profile.members.guardian!.talents).toEqual({ root: 1 });
      const reset = resetTalents(profile, 'guardian');
      expect(reset.profile.members.guardian!.talents).toBeUndefined(); expect(reset.profile.bank).toEqual(profile.bank);
    }
  });
});
