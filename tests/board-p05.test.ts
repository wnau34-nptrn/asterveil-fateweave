import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { forestMap } from '../src/content/world/chapter-forest';
import { chapterOne } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import { applyCommand, isRejected, parseCommand, type CommandContext } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import { SAVE_VERSION, parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { BANK_CAP } from '../src/core/world/caps';
import { boardBook, boardClaimReason, claimBoard, contractsMet, weekOf } from '../src/core/world/board';
import { claimQuest, depart, newProfile, settle } from '../src/core/world/profile';
import { sweep, sweepBook } from '../src/core/world/sweep';
import { partyLine } from '../src/core/world/tomes';
import type { BoardTab, ExpeditionState, MapDefinition, Profile, RunOutcome } from '../src/core/world/types';

// P05-06 quest board prototype (save v63): daily/weekly objectives and six contracts counted from settled runs and
// sweeps, paid once per period inside a claim window; the camp side quests stay one-time.
// DAY is a Monday, so DAY..DAY+6 share one week.
const home = chapterOne; const DAY = 20_773; const WEEK = weekOf(DAY); const rules = gameRules.board;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' },
  cleared: MAPS.map(m => m.id), bank: { ore: 100, gold: 100, shard: 7, dust: 10 }, ...patch });
// A run on `map` set out on `day`, with its counters patched, settled with `outcome`.
const played = (p: Profile, patch: Partial<ExpeditionState> = {}, outcome: RunOutcome = 'complete', map: MapDefinition = ruinsMap, day: number | null = DAY): Profile => {
  const out = depart(p, map, lookup, 9, undefined, day ?? undefined); return settle(out.profile, { ...out.run, ...patch }, outcome, map);
};
const claim = (p: Profile, tab: BoardTab, id: string, period: number, day = DAY): Profile => {
  const r = claimBoard(p, MAPS, tab, id, period, day); if (r.event.type !== 'boardClaimed') throw new Error(JSON.stringify(r.event)); return r.profile;
};
const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); return raw; };
const ctx = (): CommandContext => ({ home, maps: MAPS, lookup, seeds: sequenceSeeds([3]) });

describe('P05-06 board content', () => {
  it('one board: 3 daily and 5 weekly tasks with existing resources, six contracts, contracts on every map', () => {
    expect(rules.daily).toHaveLength(3); expect(rules.weekly).toHaveLength(5); expect(rules.contracts.map(c => c.kind)).toEqual(['swift', 'explorer', 'bloodless', 'small', 'unharmed', 'herbs']);
    expect(rules.contracts.every(c => c.id.startsWith('job-'))).toBe(true);
    for (const o of [...rules.daily, ...rules.weekly]) expect(Object.keys(o.reward).every(k => ['ore', 'gold', 'dust', 'tomes', 'shard', 'tickets'].includes(k))).toBe(true);
    // A sweep counts only where an objective names it.
    expect([...rules.daily, ...rules.weekly].filter(o => o.kind === 'sweeps' || o.alt?.kind === 'sweeps').map(o => o.id)).toEqual(['d-patrol', 'w-return']);
    for (const m of MAPS) { expect(m.board).toBe(rules); expect(m.contract!.swiftSteps).toBeGreaterThan(0); }
    // The weekly set is not the dailies done seven times: its targets are above a single daily's.
    expect(rules.weekly.find(o => o.kind === 'wins')!.target).toBeGreaterThan(rules.daily.find(o => o.kind === 'wins')!.target * 3);
  });
});

describe('P05-06 progress', () => {
  it('a settled run counts by itself on the day it set out; a run without a day adds nothing', () => {
    const p = played(base(), { wins: 4, openedChests: ['a', 'b'], steps: 40 }, 'withdrawn');
    const today = p.board!.days.at(-1)!;
    expect(today.day).toBe(DAY); expect(today.n).toMatchObject({ wins: 4, chests: 2 }); expect(today.n.completes).toBeUndefined();
    expect(p.board!.weeks.at(-1)!).toMatchObject({ week: WEEK, n: { wins: 4, chests: 2 }, jobs: {} });
    expect(played(base(), { wins: 4 }, 'complete', ruinsMap, null).board).toBeUndefined();
    // The camp side quests are untouched by the board and stay one-time.
    const q = played(base(), { wins: 4 }); expect(q.quests['broker-proven']?.progress).toBe(4);
  });
  it('a sweep counts only for sweep objectives', () => {
    let p = base(); for (let i = 0; i < 2; i++) p = sweep(p, ruinsMap, false, DAY, sweepBook(p, ruinsMap, DAY).count).profile;
    expect(p.board!.days.at(-1)!.n).toEqual({ sweeps: 2 }); expect(boardClaimReason(p, MAPS, 'daily', 'd-patrol', DAY, DAY)).toBe('');
    expect(boardClaimReason(p, MAPS, 'daily', 'd-job', DAY, DAY)).toBe('progress');
  });
  it('missed days open catch-up sets (up to three); progress fills today first, then the oldest open day', () => {
    let p = played(base(), { wins: 1 });
    p = played(p, { wins: 7 }, 'withdrawn', ruinsMap, DAY + 2);
    const days = p.board!.days; expect(days.map(d => d.day)).toEqual([DAY, DAY + 1, DAY + 2]);
    expect(days.map(d => d.n.wins)).toEqual([3, 2, 3]); expect(p.board!.weeks.at(-1)!.n.wins).toBe(8);
    // Logging in alone gives nothing: a new day only opens empty sets.
    const later = boardBook(p, rules, DAY + 4); expect(later.days.map(d => d.day)).toEqual([DAY + 2, DAY + 3, DAY + 4]);
    expect(later.days.slice(1).every(d => !Object.keys(d.n).length)).toBe(true);
    // A day that closed can no longer be claimed; one inside the window still can.
    expect(boardClaimReason(p, MAPS, 'daily', 'd-patrol', DAY, DAY + 4)).toBe('expired');
    expect(boardClaimReason(p, MAPS, 'daily', 'd-patrol', DAY + 2, DAY + 4)).toBe('');
    // A clock set back opens nothing.
    expect(boardBook(p, rules, DAY - 5)).toEqual(p.board);
  });
  it('a new week starts fresh and keeps last week only to claim', () => {
    let p = played(base(), { wins: 15 }, 'withdrawn');
    const next = (WEEK + 1) * 7 - 3; p = played(p, { wins: 2 }, 'withdrawn', ruinsMap, next);
    expect(p.board!.weeks.map(w => w.week)).toEqual([WEEK, WEEK + 1]); expect(p.board!.weeks.map(w => w.n.wins)).toEqual([15, 2]);
    p = claim(p, 'weekly', 'w-battles', WEEK, next);
    expect(boardClaimReason(p, MAPS, 'weekly', 'w-battles', WEEK, next)).toBe('claimed');
    expect(boardClaimReason(p, MAPS, 'weekly', 'w-battles', WEEK, next + 7)).toBe('expired');
  });
});

describe('P05-06 contracts (OD-37: no fee, no penalty)', () => {
  const small = (p: Profile): Profile => ({ ...p, party: { ...p.party, deployed: p.party.deployed.slice(0, 3), reserve: [] } });
  it('a completed run meets the contracts it qualifies for; a failed one costs nothing', () => {
    const p = small(base()); const out = depart(p, ruinsMap, lookup, 9, undefined, DAY);
    const run = { ...out.run, steps: 12, herbs: ruinsMap.herbs.map(h => h.id) };
    expect(contractsMet(run, 'complete', ruinsMap)).toEqual(expect.arrayContaining(['job-swift', 'job-small', 'job-unharmed']));
    expect(contractsMet({ ...run, steps: ruinsMap.contract!.swiftSteps + 1, downed: 1 }, 'complete', ruinsMap)).not.toContain('job-swift');
    expect(contractsMet({ ...run, downed: 1 }, 'complete', ruinsMap)).not.toContain('job-unharmed');
    expect(contractsMet({ ...run, hard: true }, 'complete', ruinsMap)).not.toContain('job-small');
    for (const o of ['withdrawn', 'wiped'] as const) expect(contractsMet(run, o, ruinsMap)).toEqual([]);
    const lost = settle(out.profile, { ...run, downed: 2 }, 'wiped', ruinsMap); expect(lost.board!.weeks.at(-1)!.jobs).toEqual({});
    expect(lost.bank.ore).toBeGreaterThanOrEqual(out.profile.bank.ore);
  });
  it('bloodless needs every event with a peaceful way done without a fight', () => {
    const run = depart(base(), forestMap, lookup, 9, undefined, DAY).run;
    const calm = forestMap.events.filter(e => e.kind !== 'rift' && e.kind !== 'merchant').map(e => e.id);
    const done = { ...run, eventsDone: calm, choices: Object.fromEntries(calm.map(id => [id, 'pass' as const])) };
    expect(contractsMet(done, 'complete', forestMap)).toContain('job-bloodless');
    expect(contractsMet({ ...done, choices: { ...done.choices, [calm[0]!]: 'fight' } }, 'complete', forestMap)).not.toContain('job-bloodless');
    expect(contractsMet({ ...done, eventsDone: calm.slice(1) }, 'complete', forestMap)).not.toContain('job-bloodless');
  });
  it('each contract pays once a week, with the reward of the best map it was done on', () => {
    let p = played(small(base()), { steps: 10 }); p = played(p, { steps: 20 }, 'complete', chapterOne);
    expect(p.board!.weeks.at(-1)!.jobs['job-unharmed']).toEqual([ruinsMap.id, chapterOne.id]);
    const before = p.bank; p = claim(p, 'contract', 'job-unharmed', WEEK); const r = chapterOne.contract!.reward;
    expect(p.bank).toEqual({ ...before, ore: before.ore + r.ore, gold: before.gold + r.gold, dust: before.dust + r.dust! });
    expect(boardClaimReason(p, MAPS, 'contract', 'job-unharmed', WEEK, DAY)).toBe('claimed');
    expect(boardClaimReason(p, MAPS, 'contract', 'job-explorer', WEEK, DAY)).toBe('progress');
    // Doing it again this week adds no second reward.
    p = played(p, { steps: 10 }); expect(boardClaimReason(p, MAPS, 'contract', 'job-unharmed', WEEK, DAY)).toBe('claimed');
  });
});

describe('P05-06 claims', () => {
  it('pays the shown reward once, all or nothing, and refuses bad requests without change', () => {
    let p = played(base(), { wins: 3 }, 'withdrawn'); const o = rules.daily[0]!; const before = p;
    expect(boardClaimReason(p, MAPS, 'daily', 'nope', DAY, DAY)).toBe('unknown'); expect(boardClaimReason(p, MAPS, 'daily', o.id, DAY, 1.5)).toBe('day');
    expect(boardClaimReason(p, MAPS, 'daily', o.id, DAY - 1, DAY)).toBe('expired');
    expect(boardClaimReason({ ...p, bank: { ...p.bank, ore: BANK_CAP.ore } }, MAPS, 'daily', o.id, DAY, DAY)).toBe('full');
    p = claim(p, 'daily', o.id, DAY);
    expect(p.bank).toEqual({ ...before.bank, ore: before.bank.ore + o.reward.ore, gold: before.bank.gold + o.reward.gold });
    expect(p.board!.days.at(-1)!.claimed).toEqual([o.id]); expect(before.board!.days.at(-1)!.claimed).toEqual([]);
    const again = claimBoard(p, MAPS, 'daily', o.id, DAY, DAY); expect(again.profile).toBe(p); expect(again.event).toEqual({ type: 'blocked', reason: 'claimed' });
    // Small tomes go to the deployed party's line.
    p = played(p, { wins: 0 }); p = claim(p, 'daily', 'd-job', DAY); expect(p.tomes![partyLine(home, p.party.deployed)].small).toBe(1);
    // The side quests keep their own one-time claim.
    const q = claimQuest(played(base(), { wins: 30 }), home, 'broker-proven');
    expect(q.event.type).toBe('claimed'); expect(claimQuest(q.profile, home, 'broker-proven').event).toEqual({ type: 'blocked', reason: 'claimed' });
  });
  it('the command carries the day and the period; the board is closed before the quest board opens', () => {
    const p = played(base(), { wins: 3 }, 'withdrawn'); const cmd = { kind: 'claimBoard', tab: 'daily', id: 'd-patrol', period: DAY, day: DAY } as const;
    expect(parseCommand(cmd)).toEqual(cmd); expect(parseCommand({ ...cmd, tab: 'monthly' })).toBeUndefined();
    const out = applyCommand({ profile: p, run: null }, cmd, ctx()); expect(isRejected(out)).toBe(false);
    expect(applyCommand({ profile: { ...p, cleared: [] }, run: null }, cmd, ctx())).toEqual({ rejected: 'locked' });
    const go = applyCommand({ profile: base(), run: null }, { kind: 'depart', mapId: ruinsMap.id, hard: false, day: DAY }, ctx());
    expect(isRejected(go) ? undefined : go.game.run!.day).toBe(DAY);
  });
});

describe('save v63', () => {
  it('round-trips the board book and the run day; a v62 save loads without them', () => {
    expect(SAVE_VERSION).toBe(71);
    const p = claim(played(base(), { wins: 3, steps: 10 }), 'daily', 'd-patrol', DAY);
    const raw = write({ profile: p, run: null }); expect(JSON.parse(raw).version).toBe(71);
    expect(parseGame(raw, home, lookup, MAPS)).toEqual({ profile: p, run: null });
    const away = depart(p, home, lookup, 9, undefined, DAY + 1); const mid = parseGame(write(away), home, lookup, MAPS);
    expect(mid.run!.day).toBe(DAY + 1); expect(mid.profile.board).toEqual(p.board);
    const old = base(); expect(parseGame(JSON.stringify({ version: 62, profile: old, run: null }), home, lookup, MAPS)).toEqual({ profile: { ...old, pets: { eggs: 2, shards: 0, owned: [], from: ['moon-lake', 'crystal-mine'] } }, run: null }); // v71: eggs of cleared maps 4/5
  });
  it('rejects a book outside the rules', () => {
    const p = claim(played(base(), { wins: 3, steps: 10 }), 'daily', 'd-patrol', DAY); const b = p.board!;
    const bad = (board: unknown) => () => parseGame(JSON.stringify({ version: 63, profile: { ...p, board }, run: null }), home, lookup, MAPS);
    const day = b.days[0]!; const week = b.weeks[0]!;
    expect(bad({ ...b, day: DAY + 1 })).toThrow(); expect(bad({ ...b, extra: 1 })).toThrow(); expect(bad(null)).toThrow();
    expect(bad({ ...b, days: [{ ...day, n: { wins: 0 } }] })).toThrow(); expect(bad({ ...b, days: [{ ...day, n: { gems: 2 } }] })).toThrow();
    expect(bad({ ...b, days: [{ ...day, n: {} }] })).toThrow(); // claimed without the progress
    expect(bad({ ...b, days: [{ ...day, day: DAY - 3 }, day] })).toThrow(); expect(bad({ ...b, days: [day, day] })).toThrow();
    expect(bad({ ...b, weeks: [{ ...week, week: WEEK - 2 }, week] })).toThrow(); expect(bad({ ...b, weeks: [{ ...week, claimed: ['job-explorer'] }] })).toThrow();
    expect(bad({ ...b, weeks: [{ ...week, jobs: { 'job-nope': [home.id] } }] })).toThrow();
    const run = depart(p, home, lookup, 9, undefined, DAY).run;
    expect(() => parseGame(JSON.stringify({ version: 63, profile: p, run: { ...run, day: -1 } }), home, lookup, MAPS)).toThrow();
  });
});
