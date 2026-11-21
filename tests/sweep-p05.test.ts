import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { forestMap } from '../src/content/world/chapter-forest';
import { chapterOne } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import { canonicalJson, emptyBook, processCommand, type CommandRequest } from '../src/core/command/command-envelope';
import { applyCommand, isRejected, parseCommand, type CommandContext, type GameCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import { SAVE_VERSION, parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { BANK_CAP, TOME_CAP } from '../src/core/world/caps';
import { depart, newProfile } from '../src/core/world/profile';
import { sweep, sweepBook, sweepReason, sweepsLeft } from '../src/core/world/sweep';
import { emptyTomes, partyLine } from '../src/core/world/tomes';
import type { Profile } from '../src/core/world/types';

// P05-05 sweep prototype (save v62): a cleared map pays a fixed repeat reward for one supply. Covers the clear unlock,
// the all-or-nothing payment, the shared normal/hard limit per map and day, supplies over days, retries and the save.
const home = chapterOne; const DAY = 20_772; const R = gameRules.sweep;
const stocked = (patch: Partial<Profile> = {}): Profile => base({ sweep: { day: DAY, supply: R.cap, used: {}, count: 0 }, ...patch });
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' },
  cleared: MAPS.map(m => m.id), bank: { ore: 100, gold: 100, shard: 7, dust: 10 }, ...patch });
const ok = (p: Profile, map = home, hard = false, day = DAY): Profile => {
  const r = sweep(p, map, hard, day, sweepBook(p, map, day).count); if (r.event.type !== 'swept') throw new Error(`blocked: ${JSON.stringify(r.event)}`); return r.profile;
};
const refused = (p: Profile, map = home, hard = false, day = DAY, serial = sweepBook(p, map, day).count): string => {
  const r = sweep(p, map, hard, day, serial); expect(r.profile).toBe(p); return r.event.type === 'blocked' ? r.event.reason : '';
};
const ctx = (): CommandContext => ({ home, maps: MAPS, lookup, seeds: sequenceSeeds([]) });
const cmd = (p: Profile, patch: Partial<Extract<GameCommand, { kind: 'sweep' }>> = {}): GameCommand => ({ kind: 'sweep', mapId: home.id, hard: false, day: DAY, serial: p.sweep?.count ?? 0, ...patch });
const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); return raw; };

describe('P05-05 sweep content', () => {
  it('every map shares the sweep rules and has its own repeat reward from existing resources', () => {
    // P04-06 budget (docs/validation/p04-06-2026-11-15): 2 a day kept up to 6 (three days, a 3-session week loses none).
    expect(gameRules.sweep).toEqual({ daily: 2, cap: 6, cost: 1, perMapDaily: 3 });
    for (const m of MAPS) {
      expect(m.sweep).toBe(gameRules.sweep);
      const { normal, hard } = m.sweepReward!;
      for (const r of [normal, hard]) expect(Object.keys(r).every(k => ['ore', 'gold', 'dust', 'tomes'].includes(k))).toBe(true);
      // OD-41: hard pays the same ore/gold/dust; only tomes may be better. A map without tomes sweeps none.
      expect({ ...hard, tomes: 0 }).toEqual({ ...normal, tomes: 0 }); expect(hard.tomes ?? 0).toBeGreaterThanOrEqual(normal.tomes ?? 0);
      if (!m.tomes) { expect(normal.tomes).toBeUndefined(); expect(hard.tomes).toBeUndefined(); }
    }
  });
  it('a whole day of supplies pays less than one quick manual clear of each map (measured 2026-11-15)', () => {
    // Quick (rush) completed runs carried home about 46/45/144 ore and 20/21/75 gold on maps 1/2/3.
    const quick = [{ ore: 46, gold: 20 }, { ore: 45, gold: 21 }, { ore: 144, gold: 75 }];
    MAPS.forEach((m, i) => { const r = m.sweepReward!.normal; expect(r.ore * 2).toBeLessThanOrEqual(quick[i]!.ore); expect(r.gold * 2).toBeLessThanOrEqual(quick[i]!.gold); });
    const best = [...MAPS].sort((a, b) => b.sweepReward!.normal.ore - a.sweepReward!.normal.ore).slice(0, 2).reduce((n, m) => n + m.sweepReward!.normal.ore * m.sweep.perMapDaily, 0);
    expect(best).toBeLessThanOrEqual(quick[1]!.ore + quick[2]!.ore);
  });
});

describe('P05-05 sweep rules', () => {
  it('opens only for a cleared map, and hard only after the hard clear', () => {
    expect(refused(base({ cleared: [ruinsMap.id] }), forestMap)).toBe('uncleared');
    expect(refused(base(), home, true)).toBe('hard');
    expect(sweepReason(base({ clearedHard: [home.id] }), home, true, DAY)).toBe('');
    expect(refused(base(), { ...home, sweepReward: undefined })).toBe('unknown');
    for (const day of [-1, 1.5, 1_000_000]) expect(refused(base(), home, false, day, 0)).toBe('day');
  });
  it('pays the shown reward and takes the supply in one step, touching nothing else', () => {
    const p = base({ choices: { 'forest-shrine': 'pray' }, storyQuests: [ruinsMap.id], quests: { 'broker-proven': { progress: 4, claimed: false } }, shop: { repel: 1 }, refreshes: 1, taken: [0] });
    const out = ok(p); const r = home.sweepReward!.normal; const line = partyLine(home, p.party.deployed);
    expect(out.bank).toEqual({ ore: 100 + r.ore, gold: 100 + r.gold, shard: 7, dust: 10 + r.dust! });
    const tomes = emptyTomes(); tomes[line].small = r.tomes!; expect(out.tomes).toEqual(tomes);
    expect(out.sweep).toEqual({ day: DAY, supply: R.daily - 1, used: { [home.id]: 1 }, count: 1 });
    // Everything a real expedition would move stays as it was: no EXP, items, cores, counters, quests, market or board.
    // P05-06: on the quest board it counts only as one sweep.
    expect(out.board!.days.at(-1)!.n).toEqual({ sweeps: 1 }); expect(out.board!.weeks.at(-1)!).toMatchObject({ n: { sweeps: 1 }, jobs: {} });
    expect({ ...out, bank: p.bank, tomes: undefined, sweep: undefined, board: undefined }).toEqual({ ...p, tomes: undefined, sweep: undefined, board: undefined });
    expect(p.sweep).toBeUndefined(); expect(p.bank.ore).toBe(100);
  });
  it('hard pays its own row and shares the map limit with normal', () => {
    let p = stocked({ clearedHard: [home.id] });
    p = ok(p, home, true); expect(p.tomes![partyLine(home, p.party.deployed)].small).toBe(home.sweepReward!.hard.tomes);
    p = ok(p, home, false); p = ok(p, home, true);
    expect(sweepsLeft(sweepBook(p, home, DAY), home)).toBe(0);
    expect(refused(p, home, false)).toBe('quota'); expect(refused(p, home, true)).toBe('quota');
    // Another map has its own three, and tomorrow this one opens again.
    expect(sweepReason(p, forestMap, false, DAY)).toBe(''); expect(sweepReason(p, home, true, DAY + 1)).toBe('');
  });
  it('supplies: two on the first day, two more each day up to six, and none when the clock goes back', () => {
    let p = base();
    expect(sweepBook(p, home, DAY).supply).toBe(R.daily);
    for (const m of [home, forestMap]) p = ok(p, m);
    expect(p.sweep!.supply).toBe(0); expect(refused(p, ruinsMap)).toBe('supply');
    expect(refused(p, ruinsMap, false, DAY - 3)).toBe('supply'); expect(sweepBook(p, home, DAY - 3)).toEqual(p.sweep);
    expect(sweepBook(p, home, DAY + 1)).toEqual({ day: DAY + 1, supply: 2, used: {}, count: 2 });
    expect(sweepBook(p, home, DAY + 2).supply).toBe(4); expect(sweepBook(p, home, DAY + 3).supply).toBe(6); expect(sweepBook(p, home, DAY + 40).supply).toBe(6);
    p = ok(p, ruinsMap, false, DAY + 40); expect(p.sweep).toEqual({ day: DAY + 40, supply: 5, used: { [ruinsMap.id]: 1 }, count: 3 });
    // Back on an earlier date the book keeps its own day: the count of that day still stands.
    expect(sweepsLeft(sweepBook(p, ruinsMap, DAY), ruinsMap)).toBe(2);
  });
  it('a full store refuses the sweep and keeps the supply', () => {
    expect(refused(base({ bank: { ore: BANK_CAP.ore - 1, gold: 0, shard: 0, dust: 0 } }))).toBe('full');
    const tomes = emptyTomes(); const p = base(); tomes[partyLine(home, p.party.deployed)].small = TOME_CAP - home.sweepReward!.normal.tomes! + 1;
    expect(refused({ ...p, tomes })).toBe('full');
  });
  it('a repeated request is refused instead of paid twice', () => {
    const p = base(); const once = sweep(p, home, false, DAY, 0).profile;
    expect(refused(once, home, false, DAY, 0)).toBe('stale'); expect(refused(p, home, false, DAY, 1)).toBe('stale');
    expect(sweep(once, home, false, DAY, 1).event.type).toBe('swept');
  });
});

describe('P05-05 sweep command', () => {
  it('runs the same rule, only at camp, and never for anything but a map', () => {
    const p = base(); const game: Game = { profile: p, run: null };
    const out = applyCommand(game, cmd(p), ctx()); if (isRejected(out)) throw new Error(out.rejected);
    expect(out.game.profile).toEqual({ ...sweep(p, home, false, DAY, 0).profile, last: null }); expect(out.events[0]).toMatchObject({ type: 'swept', mapId: home.id, supply: R.daily - 1, left: 2 });
    // The same command again (a double tap or a resend) changes nothing.
    expect(applyCommand(out.game, cmd(p), ctx())).toEqual({ rejected: 'stale' });
    expect(applyCommand(game, cmd(p, { mapId: 'world-boss' }), ctx())).toEqual({ rejected: 'unknown' });
    const away = depart(p, home, lookup, 9);
    expect(applyCommand({ profile: away.profile, run: away.run }, cmd(p), ctx())).toEqual({ rejected: 'inRun' });
    expect(parseCommand(cmd(p))).toEqual(cmd(p));
    for (const bad of [{ ...cmd(p), day: '1' }, { kind: 'sweep', mapId: home.id, hard: false, day: DAY }, { ...cmd(p), times: 3 }]) expect(parseCommand(bad)).toBeUndefined();
  });
  it('a retried request gets the stored answer and is paid once', () => {
    const p = base(); const game: Game = { profile: p, run: null };
    const sha = (c: unknown) => createHash('sha256').update(canonicalJson(c)).digest('hex');
    const req: CommandRequest = { requestId: 'req_sweep_0000000001', seq: 1, command: cmd(p) };
    const first = processCommand(game, emptyBook(), req, sha(req.command), ctx()); if (first.kind !== 'committed') throw new Error(first.kind);
    const again = processCommand(first.game, first.book, req, sha(req.command), ctx());
    expect(again).toEqual({ kind: 'replayed', reply: first.reply });
    // A new request carrying the old serial is refused by the rule.
    const stale = processCommand(first.game, first.book, { requestId: 'req_sweep_0000000002', seq: 2, command: cmd(p) }, sha(cmd(p)), ctx());
    expect(stale.kind === 'committed' && stale.reply).toEqual({ seq: 2, status: 'rejected', reason: 'stale' });
    expect(stale.kind === 'committed' && stale.game).toBe(first.game); expect(first.game!.profile.sweep!.count).toBe(1);
  });
});

describe('save v62', () => {
  const swept = (): Profile => ok(ok(base({ choices: { 'forest-shrine': 'pray' }, storyQuests: [ruinsMap.id] })), forestMap);
  it('round-trips the sweep book beside the v61 story state, and a v61 save loads without one', () => {
    expect(SAVE_VERSION).toBe(66);
    const p = swept(); const raw = write({ profile: p, run: null }); expect(JSON.parse(raw).version).toBe(66);
    const back = parseGame(raw, home, lookup, MAPS); expect(back).toEqual({ profile: p, run: null });
    expect(back.profile.choices).toEqual({ 'forest-shrine': 'pray' }); expect(back.profile.storyQuests).toEqual([ruinsMap.id]);
    const old = base({ choices: { 'forest-shrine': 'pray' } });
    expect(parseGame(JSON.stringify({ version: 61, profile: old, run: null }), home, lookup, MAPS)).toEqual({ profile: old, run: null });
    // A run in progress keeps the book too.
    const away = depart(p, home, lookup, 9); const mid = write({ profile: away.profile, run: away.run });
    expect(parseGame(mid, home, lookup, MAPS).profile.sweep).toEqual(p.sweep);
  });
  it('rejects a book outside the rules', () => {
    const p = swept(); const bad = (sweepPatch: unknown, patch: Partial<Profile> = {}) => () => parseGame(JSON.stringify({ version: 62, profile: { ...p, ...patch, sweep: sweepPatch }, run: null }), home, lookup, MAPS);
    const b = p.sweep!;
    expect(bad({ ...b, supply: R.cap + 1 })).toThrow(); expect(bad({ ...b, supply: -1 })).toThrow(); expect(bad({ ...b, day: 1.5 })).toThrow(); expect(bad({ ...b, count: -1 })).toThrow();
    expect(bad({ ...b, used: { [home.id]: 4 } })).toThrow(); expect(bad({ ...b, used: { [home.id]: 0 } })).toThrow(); expect(bad({ ...b, bonus: 1 })).toThrow(); expect(bad(null)).toThrow();
    expect(bad(b, { cleared: [ruinsMap.id, forestMap.id] })).toThrow();
    // A map that no longer exists is dropped, as cleared maps are.
    expect(parseGame(JSON.stringify({ version: 62, profile: { ...p, sweep: { ...b, used: { ...b.used, 'gone-map': 2 } } }, run: null }), home, lookup, MAPS).profile.sweep).toEqual(b);
  });
});
