import type { ClientEvent } from '../core/command/client-view';
import type { GachaEntry, MapDefinition, Profile, SweepReward, WbBossId } from '../core/world/types';
import { levelOf } from '../core/world/world';

// P09 reward ledger (docs/design/p09/LEDGER_P09_TH.md). Online, the server owns the calendar: it stamps its own day on
// `sweep`, `claimBoard` and `depart` (the device's day is refused) and writes each payout of a sweep or a quest-board
// claim once, under a receipt id, in the same transaction as the game. The rules (`core/world/sweep.ts`, `board.ts`)
// already refuse a second payout; the ledger is the server's own record of what was paid and when, and its unique
// receipt is a second guard: a command whose payout already has a receipt is refused instead of paying again.

// Owner 2026-11-16: the game day (and the Monday week) starts at 06:00 Asia/Bangkok (UTC+7, no daylight saving), i.e.
// 23:00 UTC. The offline device day turns at 06:00 local time too (`src/ui/game-shell.ts`, `today`).
export const GAME_DAY_RESET_HOUR = 6;
export const GAME_DAY_OFFSET_MINUTES = 7 * 60 - GAME_DAY_RESET_HOUR * 60;
const DAY_MS = 86_400_000;
// Days since 1970-01-01 on the game calendar.
export const serverDay = (nowMs: number, offsetMinutes = GAME_DAY_OFFSET_MINUTES): number => Math.floor((nowMs + offsetMinutes * 60_000) / DAY_MS);
// When the next game day starts (ms since epoch), for the device's "resets in" text.
export const nextDayAt = (nowMs: number, offsetMinutes = GAME_DAY_OFFSET_MINUTES): number => (serverDay(nowMs, offsetMinutes) + 1) * DAY_MS - offsetMinutes * 60_000;

// What every answer carries: the game day, when the next one starts and the server's time (all ms since epoch).
export interface ServerClock { day: number; next: number; now: number }

// `period`: `d<day>` for a sweep or a daily task, `w<week>` for a weekly task or a contract.
// `worldBoss` (P11-04): `wb:w<week>:a<attempt>` for an attempt's own reward and `wb:w<week>:<milestone>` for a personal or
// shared milestone; P11-05 trio: the attempt row names its `boss` and the shared ids are `<boss>:s-50`/`<boss>:s-100`
// (`wb:w<week>:kragmor:s-50`), and every trio row records the boss `shards` it paid (missing: none, the warden).
// P10 gacha: one row per committed pull (1 or 10) or exchange, receipt `gacha:<serial>`, `ref` `pull:<count>` or
// `exchange:<heroId>`, the reward empty and the whole entry (cost, points, every result in order) in `gacha`.
// Board and trio rows already carry the tickets they paid in `reward.tickets`.
export interface LedgerRow { receipt: string; seq: number; kind: 'sweep' | 'board' | 'worldBoss' | 'gacha'; period: string; ref: string; reward: SweepReward; day: number; at: number; boss?: WbBossId; shards?: number; gacha?: GachaEntry }
const bossPart = (boss: WbBossId | undefined, shards: number | undefined): Pick<LedgerRow, 'boss' | 'shards'> => boss ? { boss, ...(shards ? { shards } : {}) } : {};

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
    } else if (e.type === 'wbAttempt') {
      const period = `w${e.week}`;
      rows.push({ receipt: `wb:${period}:a${e.attempt}`, seq, kind: 'worldBoss', period, ref: 'attempt', reward: e.reward, day, at, ...bossPart(e.boss, e.shards) });
      for (const m of e.milestones) rows.push({ receipt: `wb:${period}:${m.id}`, seq, kind: 'worldBoss', period, ref: m.id, reward: m.reward, day, at, ...bossPart(e.boss, m.shards) });
    } else if (e.type === 'gacha') {
      const g = e.entry; const ref = g.kind === 'pull' ? `pull:${g.results.length}` : `exchange:${g.results[0]!.heroId}`;
      rows.push({ receipt: `gacha:${g.serial}`, seq, kind: 'gacha', period: `d${day}`, ref, reward: { ore: 0, gold: 0 }, day, at, gacha: g });
    } else if (e.type === 'wbClaimed') {
      rows.push({ receipt: `wb:w${e.week}:${e.id}`, seq, kind: 'worldBoss', period: `w${e.week}`, ref: e.id, reward: e.reward, day, at, ...bossPart(e.boss, e.shards) });
    }
  }
  return rows;
}

// P11-04: an attempt's hit on the shared HP, waiting in the account's outbox until the World Boss object has taken it.
// `id` is local to the account (`w<week>:a<attempt>`); the Worker prefixes the account id. `boss` (P11-05): the trio boss
// whose bar it hits (missing: the warden).
// `team` (leaderboard, owner 2026-11-28 “เห็นรายละเอียดของทีมที่ใช้ เลเวลทีม”): the camp level and the fielded heroes with
// their stars when the attempt was fought (the World Boss fields the camp's deployed team).
export interface HitTeam { level: number; heroes: [string, number][] }
export interface PendingHit { id: string; week: number; damage: number; boss?: WbBossId; team?: HitTeam }
export function teamOf(profile: Profile, home: Pick<MapDefinition, 'progression'>): HitTeam {
  return { level: levelOf(home, profile), heroes: profile.party.deployed.map(id => [id, profile.members[id]?.stars ?? 1]) };
}
export const MAX_TEAM = 5;
export const isTeam = (v: unknown): v is HitTeam => {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return Object.keys(t).length === 2 && Number.isSafeInteger(t.level) && (t.level as number) >= 1 && (t.level as number) <= 999
    && Array.isArray(t.heroes) && t.heroes.length >= 1 && t.heroes.length <= MAX_TEAM
    && t.heroes.every(h => Array.isArray(h) && h.length === 2 && typeof h[0] === 'string' && /^[a-z]{1,24}$/.test(h[0]) && Number.isSafeInteger(h[1]) && h[1] >= 1 && h[1] <= 20);
};
export function hitsOf(events: readonly ClientEvent[], profile?: Profile, home?: Pick<MapDefinition, 'progression'>): PendingHit[] {
  const team = profile && home ? teamOf(profile, home) : undefined;
  return events.flatMap(e => e.type === 'wbAttempt' ? [{ id: `w${e.week}:a${e.attempt}`, week: e.week, damage: e.damage, ...(e.boss ? { boss: e.boss } : {}), ...(team ? { team } : {}) }] : []);
}
