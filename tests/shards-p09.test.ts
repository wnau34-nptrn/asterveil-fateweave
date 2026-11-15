import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import { canonicalJson, emptyBook, type CommandReply } from '../src/core/command/command-envelope';
import type { Game } from '../src/core/save/expedition-save';
import { BANK_CAP } from '../src/core/world/caps';
import { boardClaimReason, claimBoard, weekOf } from '../src/core/world/board';
import { newProfile } from '../src/core/world/profile';
import { sweep } from '../src/core/world/sweep';
import type { BoardBook, Profile, SweepReward } from '../src/core/world/types';
import { GameHost, memoryStore } from '../src/server/game-host';
import { GAME_DAY_OFFSET_MINUTES } from '../src/server/ledger';
import { GAME_CONTEXT } from '../src/server/worker';
import { VERSION } from './fixtures/server-fakes';

// P09 part 2 (OD-17): universal star shards from the weekly quest board. Three weekly tasks that need real play pay 10
// shards a week in all; the sweep and the daily tasks pay none. Each payout is one receipt per week in the reward ledger,
// and the weekly total value stays inside the P04-06 budget (ore/gold were cut to make room).

const rules = gameRules.board; const D = 20_773; const W = weekOf(D); // D is a Monday
const HOUR = 3_600_000, DAY_MS = 24 * HOUR;
const midnight = (d: number) => d * DAY_MS - GAME_DAY_OFFSET_MINUTES * 60_000;
const SHARD_TASKS = ['w-elites', 'w-stories', 'w-jobs'];
// A board whose week `week` already has everything the weekly tasks ask for (as after a week of real play).
const fullWeek = (week: number, day: number): BoardBook => ({ day, days: [{ day, n: {}, claimed: [] }],
  weeks: [{ week, n: { completes: 4, wins: 15, elites: 3, events: 4, contracts: 3 }, claimed: [], jobs: {} }] });
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' },
  cleared: MAPS.map(m => m.id), bank: { ore: 100, gold: 100, shard: 7, dust: 10 }, ...patch });
// Ore-equivalent value used for the budget (board pays 2 ore per gold; the camp shop sells 10 shards for 60 gold).
const value = (r: SweepReward): number => r.ore + 2 * r.gold + 12 * (r.shard ?? 0);
const sha = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');

describe('P09 weekly universal shards: content', () => {
  it('only three weekly tasks that need real play pay shards, 10 a week in all', () => {
    const paying = rules.weekly.filter(o => o.reward.shard);
    expect(paying.map(o => o.id)).toEqual(SHARD_TASKS);
    expect(paying.reduce((n, o) => n + o.reward.shard!, 0)).toBe(10);
    // A sweep can never finish a shard task (login-only play earns no shards).
    expect(paying.every(o => o.kind !== 'sweeps' && o.alt?.kind !== 'sweeps')).toBe(true);
    expect(rules.daily.some(o => o.reward.shard)).toBe(false);
    for (const m of MAPS) {
      expect(m.sweepReward?.normal.shard ?? 0).toBe(0); expect(m.sweepReward?.hard.shard ?? 0).toBe(0);
      expect(m.contract?.reward.shard ?? 0).toBe(0);
    }
  });

  it('keeps the weekly sweep+board value inside the P04-06 budget', () => {
    // P04-06 (before shards): weekly tasks 180 ore / 90 gold; map-3 sweep 30 ore / 15 gold; 2 supplies a day.
    const before = 180 + 2 * 90 + 14 * (30 + 2 * 15);
    const map3 = MAPS[MAPS.length - 1]!; const sweeps = gameRules.sweep.daily * 7;
    const after = rules.weekly.reduce((n, o) => n + value(o.reward), 0) + sweeps * value(map3.sweepReward!.normal);
    expect(after).toBeLessThanOrEqual(before);
    expect(after).toBeGreaterThanOrEqual(before * 0.98); // the shards replace value; they do not shrink the budget
    // Dust and tomes were not traded.
    expect(rules.weekly.map(o => [o.reward.dust ?? 0, o.reward.tomes ?? 0])).toEqual([[0, 0], [0, 2], [4, 0], [3, 0], [0, 2]]);
  });
});

describe('P09 weekly universal shards: claims (offline rules)', () => {
  it('a weekly claim pays its shards once, all or nothing', () => {
    const p = base({ board: fullWeek(W, D) });
    const r = claimBoard(p, MAPS, 'weekly', 'w-elites', W, D);
    expect(r.event).toMatchObject({ type: 'boardClaimed', reward: { shard: 4 } });
    expect(r.profile.bank.shard).toBe(11); expect(p.bank.shard).toBe(7);
    expect(claimBoard(r.profile, MAPS, 'weekly', 'w-elites', W, D).event).toEqual({ type: 'blocked', reason: 'claimed' });
    // A task without shards leaves the shard bank alone.
    expect(claimBoard(r.profile, MAPS, 'weekly', 'w-return', W, D).profile.bank.shard).toBe(11);
  });

  it('is refused at the shard ceiling, changing nothing', () => {
    const p = base({ board: fullWeek(W, D), bank: { ore: 0, gold: 0, shard: BANK_CAP.shard - 3, dust: 0 } });
    expect(boardClaimReason(p, MAPS, 'weekly', 'w-elites', W, D)).toBe('full');
    expect(boardClaimReason(p, MAPS, 'weekly', 'w-stories', W, D)).toBe('');
    expect(claimBoard(p, MAPS, 'weekly', 'w-elites', W, D).profile).toBe(p);
  });

  it('a new week opens new shard tasks on Monday; last week stays claimable only until the week after', () => {
    const p = base({ board: fullWeek(W - 1, D - 1) });
    expect(boardClaimReason(p, MAPS, 'weekly', 'w-elites', W - 1, D)).toBe(''); // catch-up on Monday
    expect(boardClaimReason(p, MAPS, 'weekly', 'w-elites', W, D)).toBe('progress'); // this week has no elites yet
    expect(boardClaimReason(p, MAPS, 'weekly', 'w-elites', W - 1, D + 7)).toBe('expired');
  });

  it('the sweep pays no shards', () => {
    const p = base({ sweep: { day: D, supply: 6, used: {}, count: 0 } }); const map3 = MAPS[MAPS.length - 1]!;
    expect(sweep(p, map3, false, D, 0).profile.bank.shard).toBe(7);
  });
});

describe('P09 weekly universal shards: server ledger', () => {
  function host(start: number, profile: Profile) {
    const store = memoryStore(); const game: Game = { profile, run: null };
    store.state = { game, book: emptyBook() }; store.snapshots.push({ seq: 0, game, origin: 'import', at: 0 });
    const clock = { t: start }; let n = 0; let rid = 0;
    const h = new GameHost(store, GAME_CONTEXT, () => 101 + n++, VERSION, () => clock.t);
    const send = (command: unknown, requestId = `req-${String(++rid).padStart(16, '0')}`) => {
      const seq = h.view().lastSeq + 1; return { requestId, seq, command, answer: h.command({ requestId, seq, command }, sha(command)) };
    };
    return { store, clock, h, send, game: () => store.load()!.game! };
  }
  const reply = (a: { status: number; body: unknown }) => a.body as CommandReply;

  it('the week turns at Monday 00:00 Bangkok: Sunday 23:59 claims last week, a retry after midnight pays nothing more', () => {
    const t = host(midnight(D) - 60_000, base({ board: fullWeek(W - 1, D - 1) }));
    const first = t.send({ kind: 'claimBoard', tab: 'weekly', id: 'w-elites', period: W - 1 }, 'shard-request-000001');
    expect(reply(first.answer)).toMatchObject({ status: 'applied', receipts: [`board:weekly:w${W - 1}:w-elites`] });
    expect(t.game().profile.bank.shard).toBe(11);
    t.clock.t = midnight(D) + 60_000; // Monday: the answer was lost and the device retries
    const again = t.h.command({ requestId: first.requestId, seq: first.seq, command: first.command }, sha(first.command));
    expect(again).toMatchObject({ replayed: true }); expect(JSON.stringify(again.body)).toBe(JSON.stringify(first.answer.body));
    expect(t.game().profile.bank.shard).toBe(11);
    // A fresh request for the same week is refused by the rules; this week's task has no progress yet.
    expect(reply(t.send({ kind: 'claimBoard', tab: 'weekly', id: 'w-elites', period: W - 1 }).answer)).toMatchObject({ status: 'rejected', reason: 'claimed' });
    expect(reply(t.send({ kind: 'claimBoard', tab: 'weekly', id: 'w-elites', period: W }).answer)).toMatchObject({ status: 'rejected', reason: 'progress' });
    // Last week's other shard tasks are still open on Monday, each on its own receipt.
    t.send({ kind: 'claimBoard', tab: 'weekly', id: 'w-stories', period: W - 1 }); t.send({ kind: 'claimBoard', tab: 'weekly', id: 'w-jobs', period: W - 1 });
    const rows = t.store.ledger();
    expect(rows.map(r => [r.receipt, r.reward.shard, r.day])).toEqual([
      [`board:weekly:w${W - 1}:w-elites`, 4, D - 1], [`board:weekly:w${W - 1}:w-stories`, 3, D], [`board:weekly:w${W - 1}:w-jobs`, 3, D]]);
    expect(rows.reduce((n, r) => n + (r.reward.shard ?? 0), 0)).toBe(10); expect(t.game().profile.bank.shard).toBe(17);
    expect(t.h.verify().ok).toBe(true);
  });
});
