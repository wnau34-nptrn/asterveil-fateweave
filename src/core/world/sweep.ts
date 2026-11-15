import { bankFits, TOME_CAP } from './caps';
import { emptyTomes, partyLine } from './tomes';
import { addBoard, boardBook } from './board';
import type { MapDefinition, Profile, ProfileResult, SweepBook, SweepReward } from './types';

// P05-05 sweep prototype (docs/design/WORLD_BOSS_SWEEP_TH.md §4): a cleared map pays a small fixed repeat reward for one
// supply, without an expedition. Pure rules: the calendar day is an argument (the device's date offline; the server's
// clock and ledger are P09 work). A sweep is not an expedition: it gives no camp EXP, items, shards or rift cores, no
// first-clear, chest, secret, puzzle or event reward, and moves no quest, counter, market or hiring-board state. On the
// P05-06 quest board it counts only as a sweep (`sweeps` objectives), never as battles, chests or contracts.
export const MAX_SWEEP_DAY = 999_999;
export const MAX_SWEEP_COUNT = 9_999_999;
const validDay = (day: number): boolean => Number.isInteger(day) && day >= 0 && day <= MAX_SWEEP_DAY;

// The book as it stands on `day`: supplies arrive for every day passed (kept up to the cap) and the per-map counts start
// again. A day earlier than the book's (a clock set back) changes nothing: no supplies, no fresh counts.
export function sweepBook(profile: Pick<Profile, 'sweep'>, map: Pick<MapDefinition, 'sweep'>, day: number): SweepBook {
  const r = map.sweep; const b = profile.sweep;
  if (!b) return { day, supply: r.daily, used: {}, count: 0 };
  if (day <= b.day) return { ...b, used: { ...b.used } };
  return { day, supply: Math.min(r.cap, b.supply + r.daily * (day - b.day)), used: {}, count: b.count };
}
export const sweepReward = (map: MapDefinition, hard: boolean): SweepReward | undefined => map.sweepReward?.[hard ? 'hard' : 'normal'];
// Sweeps left on this map today (normal and hard share the count, so switching mode never passes the limit).
export const sweepsLeft = (book: SweepBook, map: MapDefinition): number => Math.max(0, map.sweep.perMapDaily - (book.used[map.id] ?? 0));

// '' when the sweep can be made. `serial` (when given) must be the book's count: a repeated or out-of-date request is
// refused as 'stale' and changes nothing.
export function sweepReason(profile: Profile, map: MapDefinition, hard: boolean, day: number, serial?: number): string {
  const reward = sweepReward(map, hard); if (!reward) return 'unknown';
  if (!validDay(day)) return 'day';
  if (!profile.cleared.includes(map.id)) return 'uncleared';
  if (hard && !profile.clearedHard?.includes(map.id)) return 'hard';
  const book = sweepBook(profile, map, day);
  if (serial !== undefined && serial !== book.count) return 'stale';
  if (book.count >= MAX_SWEEP_COUNT) return 'full';
  if (sweepsLeft(book, map) <= 0) return 'quota';
  if (book.supply < map.sweep.cost) return 'supply';
  if (!bankFits(profile.bank, { ore: reward.ore, gold: reward.gold, dust: reward.dust ?? 0, shard: reward.shard ?? 0 })) return 'full';
  const line = partyLine(map, profile.party.deployed);
  return (profile.tomes?.[line].small ?? 0) + (reward.tomes ?? 0) > TOME_CAP ? 'full' : '';
}
// All or nothing: the supply, the day's count, the serial and the whole reward change in one returned profile, or the
// profile comes back untouched with the reason.
export function sweep(initial: Profile, map: MapDefinition, hard: boolean, day: number, serial: number): ProfileResult {
  const reason = sweepReason(initial, map, hard, day, serial); if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const reward = sweepReward(map, hard)!; const book = sweepBook(profile, map, day);
  book.supply -= map.sweep.cost; book.used[map.id] = (book.used[map.id] ?? 0) + 1; book.count++; profile.sweep = book;
  profile.bank.ore += reward.ore; profile.bank.gold += reward.gold; profile.bank.dust += reward.dust ?? 0; profile.bank.shard += reward.shard ?? 0;
  if (reward.tomes) (profile.tomes ??= emptyTomes())[partyLine(map, profile.party.deployed)].small += reward.tomes;
  const board = boardBook(profile, map.board, day); addBoard(board, map.board, { sweeps: 1 }); profile.board = board;
  return { profile, event: { type: 'swept', mapId: map.id, hard, reward, supply: book.supply, left: sweepsLeft(book, map) } };
}
