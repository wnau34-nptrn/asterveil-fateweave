import { bankFits, TOME_CAP } from './caps';
import { emptyTomes, partyLine } from './tomes';
import { rosterIds } from './world';
import type {
  BoardBook, BoardKind, BoardObjective, BoardRules, BoardSet, BoardTab, ExpeditionState, MapDefinition, Profile, ProfileResult,
  RunOutcome, SweepReward,
} from './types';

// P05-06 quest board prototype (docs/design/CHAT_MARKET_QUEST_BOARD_TH.md §5): daily and weekly objectives and the six
// contracts (P05-01 inventory §2.3, OD-37). Pure rules: the calendar day is an argument (the device's date offline, as
// for the sweep; the server's clock and ledger are P09 work). Progress is never accepted or claimed in advance: a run
// that settles and a sweep add to the open periods by themselves, and each objective pays once per period while its
// claim window lasts. The six camp side quests stay one-time (`profile.ts` claimQuest) and are not part of this book.
export const MAX_BOARD_DAY = 999_999;
export const MAX_BOARD_COUNT = 9_999;
export const BOARD_KINDS: readonly BoardKind[] = ['wins', 'completes', 'chests', 'herbs', 'elites', 'events', 'finds', 'sweeps', 'contracts'];
const validDay = (day: number): boolean => Number.isInteger(day) && day >= 0 && day <= MAX_BOARD_DAY;
// Weeks start on Monday (day 0, 1970-01-01, was a Thursday), on the same device calendar as the day.
export const weekOf = (day: number): number => Math.floor((day + 3) / 7);
const emptyDay = (day: number): BoardBook['days'][number] => ({ day, n: {}, claimed: [] });
const emptyWeek = (week: number): BoardBook['weeks'][number] => ({ week, n: {}, claimed: [], jobs: {} });

// The book as it stands on `day`. Every day since the book was last brought up opens its own daily set, so a player who
// missed days finds up to `keepDays` sets (today and the catch-up days) still to do; older sets close with whatever was
// left unclaimed. A new week opens a new weekly set and keeps last week's open to claim (no more progress there). A day
// earlier than the book's (a clock set back) changes nothing.
export function boardBook(profile: Pick<Profile, 'board'>, rules: BoardRules, day: number): BoardBook {
  const b = profile.board;
  if (!b) return { day, days: [emptyDay(day)], weeks: [emptyWeek(weekOf(day))] };
  const book = structuredClone(b); if (day <= b.day) return book;
  for (let d = Math.max(b.day + 1, day - rules.keepDays + 1); d <= day; d++) book.days.push(emptyDay(d));
  book.days = book.days.filter(s => s.day > day - rules.keepDays);
  const week = weekOf(day);
  if (week > book.weeks.at(-1)!.week) book.weeks.push(emptyWeek(week));
  book.weeks = book.weeks.filter(s => s.week >= week - 1); book.day = day;
  return book;
}
export const count = (set: BoardSet, kind: BoardKind): number => set.n[kind] ?? 0;
export const objectiveDone = (o: BoardObjective, set: BoardSet): boolean => count(set, o.kind) >= o.target || (!!o.alt && count(set, o.alt.kind) >= o.alt.target);
// How much more of `kind` the set's unfinished objectives can use.
function need(list: readonly BoardObjective[], set: BoardSet, kind: BoardKind): number {
  let most = 0;
  for (const o of list) if (!objectiveDone(o, set)) {
    if (o.kind === kind) most = Math.max(most, o.target - count(set, kind));
    if (o.alt?.kind === kind) most = Math.max(most, o.alt.target - count(set, kind));
  }
  return most;
}
const bump = (set: BoardSet, kind: BoardKind, n: number): void => { if (n > 0) set.n[kind] = Math.min(MAX_BOARD_COUNT, count(set, kind) + n); };

// Adds counts to the open periods (mutates `book`). Today's set takes what it can use first; what is left fills the
// catch-up days oldest first, and anything still left stays on today's count. The week takes everything. `jobs` are the
// contracts done on `mapId`, recorded on this week.
export function addBoard(book: BoardBook, rules: BoardRules, add: Partial<Record<BoardKind, number>>, jobs: readonly string[] = [], mapId?: string): void {
  const today = book.days.at(-1)!; const week = book.weeks.at(-1)!;
  for (const kind of BOARD_KINDS) {
    let n = add[kind] ?? 0; if (n <= 0) continue;
    bump(week, kind, n);
    const first = Math.min(n, need(rules.daily, today, kind)); bump(today, kind, first); n -= first;
    for (const set of book.days.slice(0, -1)) { const k = Math.min(n, need(rules.daily, set, kind)); bump(set, kind, k); n -= k; }
    bump(today, kind, n);
  }
  if (mapId) for (const id of jobs) { const at = week.jobs[id] ??= []; if (!at.includes(mapId)) at.push(mapId); }
}

// The contracts a settled run fulfilled (only a completed run counts; nothing is lost when one fails, OD-37).
export function contractsMet(run: ExpeditionState, outcome: RunOutcome, map: MapDefinition): string[] {
  const rules = map.board; const c = map.contract; if (outcome !== 'complete' || !c) return [];
  const calm = map.events.filter(e => e.kind !== 'rift' && e.kind !== 'merchant');
  const own = rosterIds(run).filter(id => !run.guests?.includes(id) && !run.recruited?.includes(id));
  const met: Record<string, boolean> = {
    swift: run.steps <= c.swiftSteps,
    explorer: map.chests.every(x => run.openedChests.includes(x.id)) && map.puzzles.secrets.every(x => run.secrets.includes(x.id)),
    bloodless: calm.length > 0 && calm.every(e => run.eventsDone.includes(e.id) && !!run.choices?.[e.id] && run.choices[e.id] !== 'fight'),
    small: !run.hard && own.length <= rules.smallTeam,
    unharmed: !run.downed,
    herbs: map.herbs.length > 0 && map.herbs.every(h => run.herbs.includes(h.id)),
  };
  return rules.contracts.filter(x => met[x.kind]).map(x => x.id);
}
// What a settled run adds to the board (herbs are lost on a wipe, as for the side quests).
export function runCounts(run: ExpeditionState, outcome: RunOutcome, jobs: readonly string[]): Partial<Record<BoardKind, number>> {
  return {
    wins: run.wins, completes: outcome === 'complete' ? 1 : 0, chests: run.openedChests.length, herbs: outcome === 'wiped' ? 0 : run.herbs.length,
    elites: run.elitesDefeated.length + Object.values(run.respawns).reduce((a, b) => a + b, 0), events: run.eventsDone.length,
    finds: run.solved.length + run.secrets.length, contracts: jobs.length,
  };
}
// Settling hook (mutates `profile`): a run stamped with the day it set out counts there (or on a later day the book has
// already reached). A run without a day (set out before v63) adds nothing.
export function settleBoard(profile: Profile, run: ExpeditionState, outcome: RunOutcome, map: MapDefinition): void {
  if (run.day === undefined) return;
  const book = boardBook(profile, map.board, run.day); const jobs = contractsMet(run, outcome, map);
  addBoard(book, map.board, runCounts(run, outcome, jobs), jobs, map.id); profile.board = book;
}

// The objective (or contract) and its period's set, for the claim.
function entry(book: BoardBook, rules: BoardRules, maps: readonly MapDefinition[], tab: BoardTab, id: string, period: number): { done: boolean; set?: BoardSet; reward?: SweepReward } {
  if (tab === 'contract') {
    if (!rules.contracts.some(c => c.id === id)) return { done: false };
    const set = book.weeks.find(s => s.week === period); const at = set?.jobs[id] ?? [];
    const best = maps.filter(m => at.includes(m.id) && m.contract).sort((a, b) => b.chapter - a.chapter)[0];
    return { done: !!best, ...(set ? { set } : {}), ...(best ? { reward: best.contract!.reward } : {}) };
  }
  const o = (tab === 'daily' ? rules.daily : rules.weekly).find(x => x.id === id); if (!o) return { done: false };
  const set = tab === 'daily' ? book.days.find(s => s.day === period) : book.weeks.find(s => s.week === period);
  return { done: !!set && objectiveDone(o, set), ...(set ? { set } : {}), reward: o.reward };
}
// '' when the reward can be claimed. Otherwise: 'unknown' (no such task), 'day', 'expired' (the period has closed or not
// opened), 'claimed', 'progress' or 'full' (a storage ceiling).
export function boardClaimReason(profile: Profile, maps: readonly MapDefinition[], tab: BoardTab, id: string, period: number, day: number): string {
  const home = maps[0]; if (!home) return 'unknown';
  const rules = home.board;
  if (tab !== 'contract' && !(tab === 'daily' ? rules.daily : rules.weekly).some(o => o.id === id)) return 'unknown';
  if (tab === 'contract' && !rules.contracts.some(c => c.id === id)) return 'unknown';
  if (!validDay(day) || !Number.isInteger(period)) return 'day';
  const book = boardBook(profile, rules, day); const e = entry(book, rules, maps, tab, id, period);
  if (!e.set) return 'expired';
  if (e.set.claimed.includes(id)) return 'claimed';
  if (!e.done || !e.reward) return 'progress';
  const r = e.reward;
  if (!bankFits(profile.bank, { ore: r.ore, gold: r.gold, dust: r.dust ?? 0, shard: r.shard ?? 0 })) return 'full';
  return (profile.tomes?.[partyLine(home, profile.party.deployed)].small ?? 0) + (r.tomes ?? 0) > TOME_CAP ? 'full' : '';
}
// All or nothing: the reward and the claimed mark change in one returned profile (a repeated claim is refused as
// 'claimed', so a retry never pays twice).
export function claimBoard(initial: Profile, maps: readonly MapDefinition[], tab: BoardTab, id: string, period: number, day: number): ProfileResult {
  const reason = boardClaimReason(initial, maps, tab, id, period, day); if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const home = maps[0]!; const book = boardBook(profile, home.board, day);
  const e = entry(book, home.board, maps, tab, id, period); const r = e.reward!;
  e.set!.claimed.push(id); profile.board = book;
  profile.bank.ore += r.ore; profile.bank.gold += r.gold; profile.bank.dust += r.dust ?? 0; profile.bank.shard += r.shard ?? 0;
  if (r.tomes) (profile.tomes ??= emptyTomes())[partyLine(home, profile.party.deployed)].small += r.tomes;
  return { profile, event: { type: 'boardClaimed', tab, id, period, reward: r } };
}
