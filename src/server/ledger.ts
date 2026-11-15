import type { ClientEvent } from '../core/command/client-view';
import type { SweepReward } from '../core/world/types';

// P09 reward ledger (docs/design/p09/LEDGER_P09_TH.md). Online, the server owns the calendar: it stamps its own day on
// `sweep`, `claimBoard` and `depart` (the device's day is refused) and writes each payout of a sweep or a quest-board
// claim once, under a receipt id, in the same transaction as the game. The rules (`core/world/sweep.ts`, `board.ts`)
// already refuse a second payout; the ledger is the server's own record of what was paid and when, and its unique
// receipt is a second guard: a command whose payout already has a receipt is refused instead of paying again.

// Draft (owner may change): the game day starts at midnight Asia/Bangkok (UTC+7, no daylight saving), so a Thai
// player's server day matches the device day of a correctly set phone.
export const GAME_DAY_OFFSET_MINUTES = 7 * 60;
const DAY_MS = 86_400_000;
// Days since 1970-01-01 on the game calendar.
export const serverDay = (nowMs: number, offsetMinutes = GAME_DAY_OFFSET_MINUTES): number => Math.floor((nowMs + offsetMinutes * 60_000) / DAY_MS);
// When the next game day starts (ms since epoch), for the device's "resets in" text.
export const nextDayAt = (nowMs: number, offsetMinutes = GAME_DAY_OFFSET_MINUTES): number => (serverDay(nowMs, offsetMinutes) + 1) * DAY_MS - offsetMinutes * 60_000;

// What every answer carries: the game day, when the next one starts and the server's time (all ms since epoch).
export interface ServerClock { day: number; next: number; now: number }

// `period`: `d<day>` for a sweep or a daily task, `w<week>` for a weekly task or a contract.
export interface LedgerRow { receipt: string; seq: number; kind: 'sweep' | 'board'; period: string; ref: string; reward: SweepReward; day: number; at: number }

// The payouts an applied command made, read from its events. `sweepCount` is the profile's sweep count after the
// command (each sweep's serial is unique for the account).
export function ledgerRows(events: readonly ClientEvent[], sweepCount: number, day: number, seq: number, at: number): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const e of events) {
    if (e.type === 'swept') {
      rows.push({ receipt: `sweep:${sweepCount}`, seq, kind: 'sweep', period: `d${day}`, ref: `${e.mapId}:${e.hard ? 'hard' : 'normal'}`, reward: e.reward, day, at });
    } else if (e.type === 'boardClaimed') {
      const period = e.tab === 'daily' ? `d${e.period}` : `w${e.period}`;
      rows.push({ receipt: `board:${e.tab}:${period}:${e.id}`, seq, kind: 'board', period, ref: e.id, reward: e.reward, day, at });
    }
  }
  return rows;
}
