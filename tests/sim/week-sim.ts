// P04-06 farm and quest budget: a company that has finished the campaign (`simulateCampaign`) plays whole weeks on the
// real rules. On a session day it visits the lobby and plays one expedition (OD-06: one run per 20–30 min session) on
// map 3; it may also sweep (best reward first) and claim every quest-board reward it can, exactly as the UI offers.
// A login-only day sweeps and claims without a run. Income is kept apart by source so the board and sweep can be
// compared with real play. Nothing here changes rules; it only measures them.
import { MAPS as ALL_MAPS } from '../../src/content/world/maps';
// Frozen on maps 1–3 (their baselines predate map 4, whose own simulation is tests/lake-sim.test.ts).
const MAPS = ALL_MAPS.filter(m => m.chapter <= 3);
import { boardBook, boardClaimReason, claimBoard } from '../../src/core/world/board';
import { sweep, sweepReason, sweepBook } from '../../src/core/world/sweep';
import { tomeCount } from '../../src/core/world/tomes';
import { claimWorldBoss, wbBook, wbClaimReason, wbEncounter, worldBossAttempt } from '../../src/core/world/world-boss';
import { weekOf } from '../../src/core/world/board';
import { encounterById } from '../../src/content/encounters/catalog';
import { wbTurns } from '../fixtures/world-boss';
import type { MapDefinition, Profile } from '../../src/core/world/types';
import { playExpedition, simulateCampaign, type Policy, type Style } from './balance-sim';

export type Source = 'run' | 'drops' | 'sweep' | 'board' | 'boss';
export interface Income { ore: number; gold: number; dust: number; shard: number; tomes: number }
export interface WeekPlan {
  /** Weekday indexes (0 = Monday) with a 20–30 minute session: one expedition. */ play: readonly number[];
  /** Weekday indexes with a short login: sweep and claim only. */ login?: readonly number[];
  sweep: boolean; board: boolean; hard?: boolean;
  /** P11-04: one World Boss attempt per session (up to the weekly allowance); the shared milestones are taken as reached. */ boss?: boolean;
}
export interface WeekReport { income: Record<Source, Income>; spent: Income; runs: number; complete: number; items: number; sweeps: number; claims: number; blocked: Record<string, number>;
  /** At the week's end, over the field team: stars, skill levels above 1 and forge pluses summed. */ stars: number; skills: number; plus: number;
  /** P11-04: World Boss damage landed this week. */ bossDamage: number }

const zero = (): Income => ({ ore: 0, gold: 0, dust: 0, shard: 0, tomes: 0 });
const home = MAPS[0]!; const last = MAPS[MAPS.length - 1]!;
// Day 20_773 is Monday 2026-11-16 (weekOf changes there); every company starts its first measured week on it.
export const MONDAY = 20_773;

function add(into: Income, before: Profile, after: Profile): void {
  into.ore += after.bank.ore - before.bank.ore; into.gold += after.bank.gold - before.bank.gold; into.dust += after.bank.dust - before.bank.dust;
  into.shard += after.bank.shard - before.bank.shard; into.tomes += tomeCount(after.tomes) - tomeCount(before.tomes);
}
// Best value first: map 3 (hard once it was cleared on hard: same ore, more tomes), then the older maps.
function sweepAll(p: Profile, day: number, r: WeekReport): Profile {
  for (const m of [...MAPS].reverse() as MapDefinition[]) for (const hard of [true, false]) {
    for (;;) {
      const serial = sweepBook(p, m, day).count; const why = sweepReason(p, m, hard, day, serial);
      if (why) { if (why === 'full') r.blocked.sweepFull = (r.blocked.sweepFull ?? 0) + 1; break; }
      const next = sweep(p, m, hard, day, serial).profile; add(r.income.sweep, p, next); p = next; r.sweeps++;
    }
  }
  return p;
}
function claimAll(p: Profile, day: number, r: WeekReport): Profile {
  const book = boardBook(p, home.board, day);
  const asks: [ 'daily' | 'weekly' | 'contract', string, number][] = [
    ...book.days.flatMap(s => home.board.daily.map(o => ['daily', o.id, s.day] as ['daily', string, number])),
    ...book.weeks.flatMap(s => [...home.board.weekly.map(o => ['weekly', o.id, s.week] as ['weekly', string, number]),
      ...home.board.contracts.map(c => ['contract', c.id, s.week] as ['contract', string, number])]),
  ];
  for (const [tab, id, period] of asks) {
    const why = boardClaimReason(p, MAPS, tab, id, period, day);
    if (why) { if (why === 'full') r.blocked.boardFull = (r.blocked.boardFull ?? 0) + 1; continue; }
    const next = claimBoard(p, MAPS, tab, id, period, day).profile; add(r.income.board, p, next); p = next; r.claims++;
  }
  return p;
}

// P11-04: one attempt with the advisor, then every shared milestone of this and last week (the server is assumed to
// have reached them: the most a player can take).
function bossDay(p: Profile, day: number, r: WeekReport): Profile {
  const week = weekOf(day); const w = wbBook(p, week).weeks.at(-1)!;
  if (w.attempts < home.worldBoss.attempts) {
    const data = wbEncounter(p, home, encounterById)!; const res = worldBossAttempt(p, MAPS, encounterById, week, w.attempts + 1, wbTurns(data, home.worldBoss.maxRounds));
    if (res.event.type === 'wbAttempt') { add(r.income.boss, p, res.profile); p = res.profile; r.bossDamage += res.event.damage; } else { const why = `boss:${res.event.type === 'blocked' ? res.event.reason : res.event.type}`; r.blocked[why] = (r.blocked[why] ?? 0) + 1; }
  }
  for (const k of [week - 1, week]) for (const m of home.worldBoss.shared) {
    const shared = { week: k, hp: 1, left: 0 };
    if (wbClaimReason(p, MAPS, m.id, k, week, shared)) continue;
    const next = claimWorldBoss(p, MAPS, m.id, k, week, shared).profile; add(r.income.boss, p, next); p = next;
  }
  return p;
}

/** The endgame company of one campaign (maps 1→3, two normal replays and one hard try), ready to be played weekly. */
export function endgameCompany(seed: number, policy: Policy, style: Style): Profile {
  return simulateCampaign(seed, policy, style, 2, 1).profile;
}

/** Plays `weeks` weeks from Monday `start`; returns one report per week. */
export function simulateWeeks(start: Profile, seed: number, policy: Policy, style: Style, plan: WeekPlan, weeks: number): WeekReport[] {
  let p = start; const out: WeekReport[] = [];
  for (let w = 0; w < weeks; w++) {
    const r: WeekReport = { income: { run: zero(), drops: zero(), sweep: zero(), board: zero(), boss: zero() }, spent: zero(), runs: 0, complete: 0, items: 0, sweeps: 0, claims: 0, blocked: {}, stars: 0, skills: 0, plus: 0, bossDamage: 0 };
    for (let wd = 0; wd < 7; wd++) {
      const day = MONDAY + w * 7 + wd; const session = plan.play.includes(wd);
      if (!session && !plan.login?.includes(wd)) continue;
      if (plan.sweep) p = sweepAll(p, day, r);
      if (session) {
        const hard = !!plan.hard && !!p.clearedHard?.includes(last.id);
        const x = playExpedition(p, last, hard, policy, style, (seed * 7919 + day * 104729) >>> 0, day);
        r.spent.ore += x.spent.ore; r.spent.gold += x.spent.gold; r.spent.dust += x.spent.dust; r.spent.shard += x.spent.shard;
        // Tomes: the lobby spends some before the run, so count only what the run itself carried home.
        const income = r.income.run; income.ore += x.gained.ore; income.gold += x.gained.gold; income.dust += x.gained.dust; income.shard += x.gained.shard;
        income.tomes += tomeCount(x.run.tomes);
        r.income.drops.ore += x.drops.ore; r.income.drops.dust += x.drops.dust; r.items += x.drops.count;
        p = x.profile; r.runs++; if (x.outcome === 'complete') r.complete++;
      }
      if (session && plan.boss) p = bossDay(p, day, r);
      if (plan.board) p = claimAll(p, day, r);
    }
    const team = p.party.deployed.map(id => p.members[id]!);
    r.stars = team.reduce((v, m) => v + m.stars, 0);
    r.skills = team.reduce((v, m) => v + Object.values(m.skillLevels ?? {}).reduce((a, b) => a + (b ?? 1) - 1, 0), 0);
    r.plus = team.reduce((v, m) => v + Object.values(m.gear ?? {}).reduce((a, g) => a + (g?.plus ?? 0), 0), 0);
    out.push(r);
  }
  return out;
}
