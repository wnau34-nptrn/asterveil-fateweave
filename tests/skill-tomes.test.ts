import { describe, expect, it } from 'vitest';
import { beginBattle, previewCommand, resolveCommand, skillCooldown, skillPower, guardReductionOf } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../src/core/battle/types';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { forestMap } from '../src/content/world/chapter-forest';
import { MAPS } from '../src/content/world/maps';
import { depart, dismiss, newProfile, settle } from '../src/core/world/profile';
import { battleTomes, chestTomes, emptyTomes, partyLine, raiseSkill, skillLevelReason, tradeTomes } from '../src/core/world/tomes';
import { memberDef } from '../src/core/world/world';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import type { Profile } from '../src/core/world/types';

// Skill tomes (docs/design/SKILL_TOMES_TH.md, owner-approved 2026-10-22): Lv1–5 per member's active skill, paid in the
// class's tome line, gold and (Lv5) a rift core; the resolver reads the levels from the hero definition only.
const levelled = (id: string, levels: Partial<Record<ActionId, number>>, actions?: ActionId[]): EncounterDefinition =>
  ({ ...veilSiege, heroes: veilSiege.heroes.map(h => h.id === id ? { ...h, skillLevels: levels, ...(actions ? { actions: ['attack', ...actions] } : {}) } : h) });
const turnOf = (d: EncounterDefinition, id: string): BattleState => { const s = structuredClone(beginBattle(d).state); s.turnIndex = s.order.indexOf(id); return s; };
const cast = (d: EncounterDefinition, s: BattleState, heroId: string, action: ActionId, targetId: string) => {
  const c = { beat: s.beat, heroId, action, targetId }; const r = resolveCommand(s, d, c); expect(previewCommand(s, d, c)).toEqual(r); return r;
};

describe('skill levels in battle', () => {
  it('a skill with power gains 8% per level; Lv5 with a cooldown of 3+ trades its last step for one round less', () => {
    expect([1, 2, 3, 4, 5].map(l => skillPower(levelled('guardian', { bash: l }), 'guardian', 'bash'))).toEqual([18, 19, 21, 22, 24]);
    expect(skillCooldown(levelled('guardian', { bash: 5 }), 'guardian', 'bash')).toBe(2);
    const storm = levelled('weaver', { storm: 5 }, ['storm']);
    expect(skillPower(storm, 'weaver', 'storm')).toBe(Math.round(10 * 1.24)); expect(skillCooldown(storm, 'weaver', 'storm')).toBe(3);
    expect(cast(storm, turnOf(storm, 'weaver'), 'weaver', 'storm', 'enemies').turns[0]!.state.heroes.find(h => h.id === 'weaver')!.cooldowns.storm).toBe(1 + 3);
  });
  it('a percent skill gains 2 points per level; a skill without numbers shields its user', () => {
    expect(guardReductionOf(levelled('guardian', { guard: 3 }), 'guardian')).toBeCloseTo(0.69);
    expect(skillPower(levelled('guardian', { bulwark: 4 }, ['bulwark']), 'guardian', 'bulwark')).toBe(66);
    const mark = levelled('tracer', { mark: 3 }); const r = cast(mark, turnOf(mark, 'tracer'), 'tracer', 'mark', 'f1');
    expect(r.turns[0]!.state.heroes.find(h => h.id === 'tracer')!.barrier).toBe(6);
    // Lv5 mark (no cooldown) shields 12.
    const five = levelled('tracer', { mark: 5 }); expect(cast(five, turnOf(five, 'tracer'), 'tracer', 'mark', 'f1').turns[0]!.state.heroes.find(h => h.id === 'tracer')!.barrier).toBe(12);
  });
  it('members carry their levels into battle through the world definition', () => {
    const p = newProfile(map, 3); p.members.guardian = { stars: 1, dupes: 0, skillLevels: { bash: 3 } };
    expect(memberDef(lookup, map, p.members, 'guardian')!.skillLevels).toEqual({ bash: 3 });
  });
});

const open = (): Profile => { const p = newProfile(map, 5); p.cleared = ['ruined-border', 'deep-forest']; p.bank.gold = 500; p.tomes = emptyTomes(); p.tomes.bulwark = { small: 10, medium: 3, large: 1 }; p.riftCore = 1; return p; };
describe('raising skill levels at the camp', () => {
  it('opens after map 2 and pays the table one level at a time', () => {
    const closed = { ...open(), cleared: ['ruined-border'] }; expect(skillLevelReason(closed, MAPS, map, lookup, 'guardian', 'bash')).toBe('locked');
    let p = open();
    for (const [level, gold, bag] of [[2, 495, { small: 8, medium: 3, large: 1 }], [3, 487, { small: 4, medium: 3, large: 1 }], [4, 472, { small: 4, medium: 1, large: 1 }], [5, 442, { small: 4, medium: 1, large: 0 }]] as const) {
      const r = raiseSkill(p, MAPS, map, lookup, 'guardian', 'bash'); expect(r.event).toEqual({ type: 'skillLevel', heroId: 'guardian', action: 'bash', level });
      p = r.profile; expect(p.bank.gold).toBe(gold); expect(p.tomes!.bulwark).toEqual(bag);
    }
    expect(p.riftCore).toBe(0); expect(skillLevelReason(p, MAPS, map, lookup, 'guardian', 'bash')).toBe('max');
  });
  it('refuses locked skills, missing tomes, gold or a rift core, and changes nothing', () => {
    const p = open();
    expect(skillLevelReason(p, MAPS, map, lookup, 'guardian', 'rally')).toBe('skill'); expect(skillLevelReason(p, MAPS, map, lookup, 'guardian', 'attack')).toBe('skill');
    expect(skillLevelReason({ ...p, tomes: emptyTomes() }, MAPS, map, lookup, 'guardian', 'bash')).toBe('tomes');
    expect(skillLevelReason({ ...p, bank: { ...p.bank, gold: 4 } }, MAPS, map, lookup, 'guardian', 'bash')).toBe('gold');
    const four = structuredClone(p); four.members.guardian!.skillLevels = { bash: 4 }; four.riftCore = 0;
    expect(skillLevelReason(four, MAPS, map, lookup, 'guardian', 'bash')).toBe('core');
    expect(raiseSkill(four, MAPS, map, lookup, 'guardian', 'bash').profile).toBe(four);
  });
  it('trades three tomes up a size, or two into another line', () => {
    const p = open(); const up = tradeTomes(p, MAPS, map, 'bulwark', 'small').profile.tomes!;
    expect(up.bulwark).toEqual({ small: 7, medium: 4, large: 1 });
    const swap = tradeTomes(p, MAPS, map, 'bulwark', 'medium', 'accord').profile.tomes!;
    expect(swap.bulwark.medium).toBe(1); expect(swap.accord.medium).toBe(1);
    expect(tradeTomes(p, MAPS, map, 'bulwark', 'large').event).toEqual({ type: 'blocked', reason: 'size' });
    expect(tradeTomes(p, MAPS, map, 'bulwark', 'small', 'bulwark').event).toEqual({ type: 'blocked', reason: 'line' });
  });
  it('dismissing a member returns half the tomes spent on them', () => {
    const p = open(); p.company.push('tracer'); p.members.tracer = { stars: 1, dupes: 0, skillLevels: { execute: 3, mark: 4 } };
    // execute Lv3 = small 6; mark Lv4 = small 6 + medium 2 → half: small 6, medium 1 (blade line).
    expect(dismiss(p, map, 'tracer').profile.tomes!.blade).toEqual({ small: 6, medium: 1, large: 0 });
  });
});

describe('tome rewards', () => {
  const run = () => depart(open(), map, lookup, 9).run;
  it('every fourth ordinary win pays a small tome, lines in turn; elites two; nothing on a map without tomes', () => {
    const s = run(); const got = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(() => battleTomes(s, map, 'random', s.roster.deployed).tomes);
    expect(got.map(t => t ? Object.entries(t).find(([, v]) => v.small)![0] : '-')).toEqual(['-', '-', '-', 'bulwark', '-', '-', '-', 'blade', '-', '-', '-', 'accord']);
    expect(battleTomes(s, map, 'elite', s.roster.deployed).tomes!.bulwark.small).toBe(2);
    const ruins = MAPS[0]!; expect(battleTomes(structuredClone(s), ruins, 'random', s.roster.deployed)).toEqual({});
  });
  it('the boss pays its map’s tomes in the party’s line; hard mode ×1.5 and a rift core', () => {
    const s = run(); const b = battleTomes(s, map, 'boss', ['guardian', 'garran', 'tracer']);
    expect(b.tomes!.bulwark).toEqual({ small: 2, medium: 3, large: 0 }); expect(b.riftCore).toBeUndefined();
    const hard = { ...run(), hard: true as const }; const h = battleTomes(hard, map, 'boss', ['tracer', 'weaver']);
    expect(h.tomes!.blade).toEqual({ small: 3, medium: 4, large: 0 }); expect(h.riftCore).toBe(1); expect(hard.riftCore).toBe(1);
    const forest = battleTomes(depart(open(), forestMap, lookup, 9).run, forestMap, 'boss', ['healer']);
    expect(forest.tomes!.accord).toEqual({ small: 2, medium: 1, large: 0 });
  });
  it('rare chests pay a small tome; settling brings them home (a wipe keeps half) and a first clear adds its own', () => {
    const s = run(); s.openedChests.push('x'); expect(chestTomes(s, map, 'rare')!.bulwark.small).toBe(1);
    s.tomes!.blade.small = 3;
    const home = settle(open(), s, 'withdrawn', map); expect(home.tomes!.bulwark.small).toBe(11); expect(home.tomes!.blade.small).toBe(3); expect(home.last!.tomes).toBe(4);
    expect(settle(open(), s, 'wiped', map).tomes!.blade.small).toBe(1);
    const first = settle(open(), { ...s, bossDefeated: true }, 'complete', map);
    const line = partyLine(map, s.roster.deployed); expect(first.tomes![line].large).toBe(open().tomes![line].large + 1);
    // A10: rift cores come from hard mode only, so Lv5 waits for it.
    expect(first.riftCore).toBe(1);
  });
});

describe('save v37', () => {
  const raw = (game: Parameters<typeof saveGame>[1]) => { let out = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { out = v; } }, game); return out; };
  it('round-trips skill levels, tomes, rift cores and run finds', () => {
    const p = open(); p.members.guardian!.skillLevels = { bash: 3, guard: 2 }; const { profile, run } = depart(p, map, lookup, 4);
    battleTomes(run, map, 'elite', run.roster.deployed); run.tomeWins = 2;
    const text = raw({ profile, run }); expect(JSON.parse(text).version).toBe(41);
    expect(parseGame(text, map, lookup, MAPS)).toEqual({ profile, run });
  });
  it('rejects levels out of range or for another class’s skill, and tomes on a map without them', () => {
    const p = open(); const bad = (patch: (j: { profile: { members: Record<string, Record<string, unknown>>; tomes: Record<string, Record<string, number>> } }) => void) => { const j = JSON.parse(raw({ profile: p, run: null })); patch(j); return () => parseGame(JSON.stringify(j), map, lookup); };
    expect(bad(j => { j.profile.members.guardian!.skillLevels = { bash: 6 }; })).toThrow();
    expect(bad(j => { j.profile.members.guardian!.skillLevels = { bolt: 2 }; })).toThrow();
    expect(bad(j => { j.profile.tomes.blade!.small = -1; })).toThrow();
    const ruins = depart(p, MAPS[0]!, lookup, 4); ruins.run.tomes = emptyTomes();
    expect(() => parseGame(raw(ruins), MAPS[0]!, lookup, MAPS)).toThrow();
  });
  it('v36 refunds the release A classes’ small-tree ranks, grants their star skills and sends a changed run home', () => {
    const p = newProfile(map, 3); p.members.tracer = { stars: 5, dupes: 0, level: 4, exp: 0 }; p.members.guardian = { stars: 1, dupes: 0, level: 4, exp: 0, talents: { a1: 2 } };
    const { run } = depart(p, map, lookup, 5);
    const old = JSON.parse(raw({ profile: p, run })); old.version = 36;
    old.profile.members.tracer.talents = { root: 1, a1: 2 }; old.run.members.tracer.talents = { root: 1, a1: 2 };
    const back = parseGame(JSON.stringify(old), map, lookup);
    expect(back.run).toBeNull(); expect(back.profile.members.tracer).toMatchObject({ stars: 5, grants: ['a4', 'b2'] });
    expect(back.profile.members.tracer!.talents).toBeUndefined(); expect(back.profile.members.guardian!.talents).toEqual({ a1: 2 });
  });
});
