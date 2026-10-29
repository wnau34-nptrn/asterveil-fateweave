import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { MAPS } from '../src/content/world/maps';
import { currentHeroId, resolveCommand, targetOptions } from '../src/core/battle/engine';
import type { ActionId, Command } from '../src/core/battle/types';
import { parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { boardOffers, depart, hire, hireReason, learnTalent, newProfile, placeMember, refreshBoard, settle } from '../src/core/world/profile';
import { battleData, battleState, heroCatalog, memberDef, recordBattle, skillChoices } from '../src/core/world/world';
import { memberTalentReason, talentPoints, talentsValid } from '../src/core/world/talents';
import type { MapDefinition, Profile } from '../src/core/world/types';

const added = ['metta', 'thiran', 'lalin', 'wila'];
const legacyMap: MapDefinition = { ...map, mercenaries: map.mercenaries.filter(h => !added.includes(h.id)) };
const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_key, value) => { raw = value; } }, game); return raw; };
const oldEnvelope = (game: Game) => { const value = JSON.parse(write(game)); value.version = 42; return value; };
function offerOf(profile: Profile, id: string): Profile {
  for (let seed = 0; seed < 2000; seed++) {
    const p = { ...profile, seed };
    if (boardOffers(p, map, lookup).includes(id)) return p;
  }
  throw new Error(`No deterministic offer for ${id}`);
}

describe('C12 Batch 1 catalog and hiring', () => {
  it('appends four members without changing the ten existing identities or the free starter pool', () => {
    const catalog = heroCatalog(lookup, map);
    expect(catalog).toHaveLength(14);
    expect(catalog.slice(0, 10)).toEqual(heroCatalog(lookup, legacyMap));
    expect(catalog.slice(10).map(h => h.id)).toEqual(added);
    expect(ruinsMap.draft!.pool).toEqual(['lio', 'brann', 'sefa', 'toma']);
    for (const id of added) expect(ruinsMap.recruits?.some(r => r.hero === id)).toBeFalsy();
    // New roster releases must not dilute the original three offers or their duplicate odds.
    for (let seed = 0; seed < 100; seed++) {
      const p = newProfile(map, seed), before = boardOffers(p, legacyMap, lookup), after = boardOffers(p, map, lookup);
      expect(after.slice(0, 3)).toEqual(before);
      expect(after).toHaveLength(4);
      expect(added).toContain(after[3]);
    }
    const seen = new Set<string>();
    for (let seed = 0; seed < 100; seed++) boardOffers(newProfile(map, seed), map, lookup).forEach(id => seen.add(id));
    for (const id of added) expect(seen.has(id)).toBe(true);
  });
  it('hires to the bench when all four deployed and four reserve slots are occupied, preserving everyone', () => {
    let p = newProfile(map, 1);
    p.company = heroCatalog(lookup, map).slice(0, 8).map(h => h.id);
    p.members = Object.fromEntries(p.company.map(id => [id, { stars: 1, dupes: 0 }]));
    p.party = { deployed: p.company.slice(0, 4), reserve: p.company.slice(4) };
    p.bank.gold = 200;
    p = offerOf(p, 'metta');
    const index = boardOffers(p, map, lookup).indexOf('metta');
    const next = hire(p, map, lookup, index);
    expect(next.event).toEqual({ type: 'hired', heroId: 'metta', duplicate: false });
    expect(next.profile.company).toEqual([...p.company, 'metta']);
    expect(next.profile.party).toEqual(p.party);
    expect(next.profile.members.metta).toEqual({ stars: 1, dupes: 0 });
    expect(parseGame(write({ profile: next.profile, run: null }), map, lookup).profile.taken).toEqual([index]);
    expect(placeMember(next.profile, 'metta', 'deployed').event).toEqual({ type: 'blocked', reason: 'full' });
    const swapped = placeMember(next.profile, 'metta', 'deployed', p.party.deployed[0]);
    expect(swapped.profile.party.deployed).toHaveLength(4);
    expect(swapped.profile.party.reserve).toHaveLength(4);
    expect(swapped.profile.company).toEqual(next.profile.company);
  });
  it('a duplicate at a full 4+4 roster changes only the member duplicate count, gold and taken index', () => {
    let p = newProfile(map, 0);
    p.company = heroCatalog(lookup, map).map(h => h.id);
    p.members = Object.fromEntries(p.company.map(id => [id, { stars: 1, dupes: 0 }]));
    p.party = { deployed: p.company.slice(0, 4), reserve: p.company.slice(4, 8) };
    p.bank.gold = 200; p = offerOf(p, 'lalin');
    const index = boardOffers(p, map, lookup).indexOf('lalin');
    expect(hireReason(p, map, lookup, index)).toBe('');
    const next = hire(p, map, lookup, index);
    expect(next.event).toEqual({ type: 'hired', heroId: 'lalin', duplicate: true });
    expect(next.profile.members.lalin!.dupes).toBe(1);
    expect(next.profile.company).toEqual(p.company);
    expect(next.profile.party).toEqual(p.party);
    expect(next.profile.bank.gold).toBe(p.bank.gold - map.company.hireCost);
    expect(next.profile.taken).toEqual([index]);
    expect(hireReason(next.profile, map, lookup, index)).toBe('taken');
  });
});

describe('C12 personal branches use existing talent budgets and validators', () => {
  for (const id of added) it(`${id}: pays for personal ranks, gates sequentially and round-trips choices`, () => {
    const p = newProfile(map, 2, [id]);
    p.members[id] = { stars: 1, dupes: 0, level: 5, exp: 0 };
    expect(talentPoints(map, p.members[id], id)).toBe(4);
    expect(memberTalentReason(map, id, p.members[id], 'p2')).toBe('locked');
    const first = learnTalent(p, map, id, 'p1').profile;
    expect(first.members[id]!.talents).toEqual({ p1: 1 });
    const second = learnTalent(first, map, id, 'p2').profile;
    expect(second.members[id]!.talents).toEqual({ p1: 1, p2: 1 });
    expect(talentPoints(map, second.members[id], id)).toBe(4);
    expect(talentsValid(map, id, 5, { p1: 1, p2: 1 })).toBe(true);
    expect(talentsValid(map, id, 5, { p2: 1 })).toBe(false);
    expect(talentsValid(map, id, 5, { p1: 2 })).toBe(false);
    expect(talentsValid(map, id, 5, { p1: 1, p2: 1, a1: 2, b1: 1 })).toBe(false);
    expect(talentsValid(map, id, 5, { p1: 1, p2: 1, p3: 1 })).toBe(false);
    expect(memberDef(lookup, map, second.members, id)!.speed).toBe(heroCatalog(lookup, map).find(h => h.id === id)!.speed);
    expect(parseGame(write({ profile: second, run: null }), map, lookup).profile).toEqual(second);
  });
  it('class choice pairs remain exclusive while personal points also consume the shared budget', () => {
    expect(talentsValid(map, 'metta', 5, { a1: 1, a2x: 1, a2y: 1 })).toBe(false);
    expect(talentsValid(map, 'metta', 5, { p1: 1, c1s: 1, c2x: 1 })).toBe(true);
    expect(talentsValid(map, 'metta', 5, { p1: 1, c2x: 1 })).toBe(false);
    const base = heroCatalog(lookup, map).find(h => h.id === 'metta')!;
    expect(skillChoices(base, map, { p1: 1 })).toEqual(['saintstrike', 'communion']);
    expect(skillChoices(base, map, { c1s: 1 })).toEqual(['saintstrike', 'communion', 'sharewound']);
  });
});

describe('C12 v42 → v43 migration', () => {
  it('preserves the legacy paid board indexes and all member investment without inventing new recruits', () => {
    const p = newProfile(legacyMap, 37);
    p.members.guardian = { stars: 3, dupes: 2, level: 5, exp: 1, talents: { a1: 2, c1s: 1 }, loadout: ['guard', 'rally'], skillLevels: { rally: 2 } };
    p.bank = { gold: 99, ore: 87, seal: 3, dust: 11 };
    p.taken = [1]; p.refreshes = 1;
    p.tomes = { bulwark: { small: 4, medium: 2, large: 1 }, blade: { small: 1, medium: 0, large: 0 }, accord: { small: 0, medium: 0, large: 0 } };
    const old = oldEnvelope({ profile: p, run: null });
    const migrated = parseGame(JSON.stringify(old), map, lookup);
    expect(migrated.profile).toEqual({ ...p, boardPool: heroCatalog(lookup, legacyMap).map(h => h.id) });
    expect(boardOffers(migrated.profile, map, lookup)).toEqual(boardOffers(p, legacyMap, lookup));
    expect(migrated.profile.taken).toEqual([1]);
    expect(migrated.profile.company.some(id => added.includes(id))).toBe(false);
    expect(JSON.parse(write(migrated)).version).toBe(43);
    expect(parseGame(write(migrated), map, lookup)).toEqual(migrated);
    const refreshed = refreshBoard(migrated.profile, map).profile;
    expect(refreshed.boardPool).toBeUndefined();
    expect(refreshed.taken).toEqual([]);
  });
  it('keeps a v42 map run, entry HP and a genuine active replay unchanged for the original party', () => {
    const p = newProfile(legacyMap, 11);
    p.members.guardian = { stars: 1, dupes: 0, level: 5, exp: 0, talents: { a1: 1 } };
    const game = depart(p, legacyMap, lookup, 91);
    game.run.hp.guardian = Math.min(game.run.hp.guardian!, 30);
    game.run.battle = { kind: 'random', encounterId: map.tutorialEncounterId, entry: { ...game.run.hp }, commands: [] };
    const state = battleState(game.run, map, lookup)!;
    const data = battleData(game.run, map, lookup)!;
    const heroId = currentHeroId(state, data)!;
    const targetId = targetOptions(state, data, heroId, 'attack').find(t => t.valid)!.id;
    game.run = recordBattle(game.run, map, lookup, [{ heroId, action: 'attack', targetId, beat: state.beat }]);
    const beforeBattle = battleState(game.run, map, lookup);
    const migrated = parseGame(JSON.stringify(oldEnvelope(game)), map, lookup, MAPS);
    expect(migrated.run).toEqual(game.run);
    expect(migrated.run!.hp.guardian).toBe(30);
    expect(migrated.profile.members).toEqual(game.profile.members);
    expect(battleState(migrated.run!, map, lookup)).toEqual(beforeBattle);
    const home = settle(migrated.profile, migrated.run!, 'withdrawn', map);
    expect(home.boardPool).toBeUndefined();
  });
  for (const selection of [
    { action: 'duet', cooldownAction: 'bash' },
    { action: 'echofoot', cooldownTargetId: 'guardian' },
  ] as const) it(`round-trips ${selection.action} selected cooldown metadata and reproduces its result`, () => {
    const p = newProfile(map, 18, ['lalin', 'guardian', 'weaver']);
    p.members.lalin = { stars: 1, dupes: 0, level: 5, exp: 0, talents: { p1: 1, p2: 1, c1s: 1, c2y: 1 }, loadout: ['duet', 'echofoot'] };
    const game = depart(p, map, lookup, 81);
    game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...game.run.hp }, commands: [] };
    const data = battleData(game.run, map, lookup)!;
    let state = battleState(game.run, map, lookup)!;
    for (let n = 0; n < 12; n++) {
      const heroId = currentHeroId(state, data)!;
      if (heroId === 'lalin' && state.round === 2) break;
      const preferred: ActionId = heroId === 'guardian' ? 'bash' : heroId === 'weaver' ? 'ward' : 'attack';
      const options = targetOptions(state, data, heroId, preferred);
      const action = options.some(t => t.valid) ? preferred : 'attack';
      const targetId = targetOptions(state, data, heroId, action).find(t => t.valid)!.id;
      state = resolveCommand(state, data, { heroId, action, targetId, beat: state.beat }).state;
    }
    expect(currentHeroId(state, data)).toBe('lalin');
    expect(state.round).toBe(2);
    const command: Command = { ...selection, heroId: 'lalin', targetId: selection.action === 'duet' ? 'guardian' : 'f1', beat: state.beat };
    state = resolveCommand(state, data, command).state;
    game.run = recordBattle(game.run, map, lookup, state.commands);
    const loaded = parseGame(write(game), map, lookup);
    expect(loaded.run!.battle!.commands.at(-1)).toMatchObject(command);
    expect(battleState(loaded.run!, map, lookup)).toEqual(state);
    for (const badValue of [null, 17, {}, 'unknown']) {
      const malformed = JSON.parse(write(game));
      const last = malformed.run.battle.commands.at(-1);
      if (selection.action === 'duet') last.cooldownAction = badValue;
      else last.cooldownTargetId = badValue;
      expect(() => parseGame(JSON.stringify(malformed), map, lookup)).toThrow();
    }
  });
  it('validates board snapshots, personal-rank injection and unknown skills rather than accepting corrupted v43 data', () => {
    const p = newProfile(map, 1, ['metta']);
    p.members.metta = { stars: 1, dupes: 0, level: 5, exp: 0, talents: { p1: 1 } };
    const base = JSON.parse(write({ profile: p, run: null }));
    for (const boardPool of [['metta'], ['guardian', 'guardian'], []]) {
      expect(() => parseGame(JSON.stringify({ ...base, profile: { ...base.profile, boardPool } }), map, lookup)).toThrow(/board pool/);
    }
    const over = structuredClone(base); over.profile.members.metta.talents = { p1: 1, p2: 1, a1: 2, b1: 1 };
    expect(() => parseGame(JSON.stringify(over), map, lookup)).toThrow(/talents/);
    const foreign = structuredClone(base); foreign.profile.members.metta.skillLevels = { cadence: 2 };
    expect(() => parseGame(JSON.stringify(foreign), map, lookup)).toThrow(/skill levels/);
  });
});
