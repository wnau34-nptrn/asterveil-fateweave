import { weekOf } from '../core/world/board';
import { WB_BOSSES, type WbBossId, type WorldBossRules } from '../core/world/types';
import { isWbBoss, MAX_WB_DAMAGE, sharedHpFor, trioLive, trioSharedHp, type WorldBossShared } from '../core/world/world-boss';
import type { DurableStateLike } from './account-object';
import { serverDay } from './ledger';

// P11-04 World Boss, part 1 (docs/design/WORLD_BOSS_P11_04_TH.md); P11-05 trio, step 3 (WORLD_BOSS_TRIO_P11_05_TH.md
// §5). One Durable Object (name `world-boss`) keeps each week's shared HP bars and every attempt that hit them: one bar
// (`warden`) in a warden week, three (`kragmor`/`valdrakk`/`morvane`) from `trio.from` on. Accounts never write here
// directly: an account's object commits the attempt (replayed by the rules, rewards receipted in its own
// `reward_ledger`) and keeps the hit in its outbox; the Worker hands the outbox here and tells the account which hits
// were taken. A hit is taken once (its id is `<account>:w<week>:a<attempt>`, the attempt number unique over the three
// bosses), so a resend after a lost answer changes nothing; the HP removed is at most what its bar had left, so attempts
// that finish together never take a bar below 0, and attempts after the kill still count for their players (personal
// rewards) but remove nothing (`applied` 0). A hit on a bar the week does not have (a trio boss in a warden week, or the
// reverse) is acknowledged and takes nothing; the rules never make one. Pure apart from the injected store and clock.

export type BarBoss = WbBossId | 'warden';
// `accounts`: accounts that hit the bar; `attempts`: hits taken (both feed the next week's HP).
export interface BossBar { week: number; boss: BarBoss; hp: number; left: number; accounts: number; attempts: number; opened: number }
export interface Hit { id: string; week: number; account: string; damage: number; boss?: WbBossId }
export interface BossStore {
  // The bars a week has (none before it opens).
  bars(week: number): BossBar[];
  // Opens a week's bars together.
  open(bars: readonly BossBar[]): void;
  hit(id: string): { applied: number } | null;
  // Must insert the hit and update its bar (left, accounts, attempts) atomically.
  take(hit: Hit, applied: number, firstOfAccount: boolean, at: number): void;
  hasAccount(week: number, boss: BarBoss, account: string): boolean;
  // Leaderboard (owner 2026-11-28 “เพิ่ม Leader board”): accounts of a week ranked by the damage they dealt (every
  // attempt's own damage, not only what the bar still had), one bar or all bars; ties go to the earlier first hit.
  board(week: number, boss: BarBoss | undefined, account: string, limit: number): Board;
}
export interface BoardRow { account: string; total: number; attempts: number; best: number }
export interface Board { rows: BoardRow[]; you: (Omit<BoardRow, 'account'> & { rank: number }) | null; players: number }
export const BOARD_LIMIT = 20;
export const barOf = (h: Pick<Hit, 'boss'>): BarBoss => h.boss ?? 'warden';

const HIT_ID = /^[0-9a-f]{32}:w\d{1,6}:a\d{1,2}$/;
export const isHit = (v: unknown): v is Hit => {
  if (typeof v !== 'object' || v === null) return false;
  const h = v as Record<string, unknown>;
  return Object.keys(h).length === ('boss' in h ? 5 : 4) && ('boss' in h ? isWbBoss(h.boss) : true)
    && typeof h.id === 'string' && HIT_ID.test(h.id) && Number.isSafeInteger(h.week) && (h.week as number) >= 0
    && typeof h.account === 'string' && h.id.startsWith(`${h.account}:w${h.week}:`) && Number.isSafeInteger(h.damage) && (h.damage as number) >= 1 && (h.damage as number) <= MAX_WB_DAMAGE;
};

export class WorldBossHost {
  constructor(private readonly store: BossStore, private readonly rules: WorldBossRules, private readonly now: () => number = () => Date.now()) {}
  // The server's week (Monday on the game calendar, `ledger.ts`).
  week(): number { return weekOf(serverDay(this.now())); }
  // The bars a week stands with.
  bossesOf(week: number): readonly BarBoss[] { return trioLive(this.rules, week) ? WB_BOSSES : ['warden']; }
  // This week and last week only; a week opens on first touch with every bar's HP fixed from last week: the warden's
  // from last week's accounts, a trio boss's from last week's attempts on it (the first trio week: the warden's attempts
  // ÷ 3 for each).
  private ensure(week: number): BossBar[] | null {
    const current = this.week();
    if (week !== current && week !== current - 1) return null;
    const have = this.store.bars(week); if (have.length) return have;
    const last = this.store.bars(week - 1); const at = this.now();
    const lastWarden = last.find(b => b.boss === 'warden');
    const bars = this.bossesOf(week).map((boss): BossBar => {
      const hp = boss === 'warden' ? sharedHpFor(this.rules, lastWarden?.accounts ?? 0)
        : trioSharedHp(this.rules, last.find(b => b.boss === boss)?.attempts ?? Math.floor((lastWarden?.attempts ?? 0) / 3));
      return { week, boss, hp, left: hp, accounts: 0, attempts: 0, opened: at };
    });
    this.store.open(bars); return bars;
  }
  bars(week = this.week()): BossBar[] | null { return this.ensure(week); }
  // One bar (`null`: a week outside the window, or a bar the week does not have).
  status(week = this.week(), boss: BarBoss = 'warden'): BossBar | null { return this.ensure(week)?.find(b => b.boss === boss) ?? null; }
  // Takes each new hit once. Answers the ids it has now (taken before or now; a hit for a closed week or a bar the week
  // does not have is acknowledged without taking anything) and what each removed.
  contribute(hits: readonly Hit[]): { taken: string[]; applied: Record<string, number> } {
    const taken: string[] = []; const applied: Record<string, number> = {};
    for (const h of hits) {
      const seen = this.store.hit(h.id);
      if (seen) { taken.push(h.id); applied[h.id] = seen.applied; continue; }
      const bar = this.ensure(h.week)?.find(b => b.boss === barOf(h));
      if (!bar) { taken.push(h.id); applied[h.id] = 0; continue; }
      const cut = Math.max(0, Math.min(h.damage, bar.left));
      this.store.take(h, cut, !this.store.hasAccount(h.week, bar.boss, h.account), this.now());
      taken.push(h.id); applied[h.id] = cut;
    }
    return { taken, applied };
  }
  // This week's or last week's leaderboard (`null`: a week outside the window).
  board(week: number, boss: BarBoss | undefined, account: string, limit = BOARD_LIMIT): (Board & { week: number }) | null {
    if (!this.ensure(week)) return null;
    return { week, ...this.store.board(week, boss, account, limit) };
  }
}
// The memory store's hits grouped per account like the SQL store's read.
function aggregate(hits: readonly { account: string; damage: number; at: number }[]): Agg[] {
  const by = new Map<string, Agg>();
  for (const h of hits) {
    const r = by.get(h.account) ?? { account: h.account, damage: 0, n: 0, best: 0, at: h.at };
    r.damage += h.damage; r.n++; r.best = Math.max(r.best, h.damage); r.at = Math.min(r.at, h.at); by.set(h.account, r);
  }
  return [...by.values()];
}
export function memoryBossStore(): BossStore & { weeks: BossBar[]; hits: (Hit & { applied: number })[] } {
  const s = {
    weeks: [] as BossBar[], hits: [] as (Hit & { applied: number; at: number })[],
    bars: (week: number) => s.weeks.filter(x => x.week === week).map(b => ({ ...b })),
    open: (bars: readonly BossBar[]) => { s.weeks.push(...bars.map(b => ({ ...b }))); },
    hit: (id: string) => { const h = s.hits.find(x => x.id === id); return h ? { applied: h.applied } : null; },
    take: (hit: Hit, applied: number, first: boolean, at: number) => {
      if (s.hits.some(x => x.id === hit.id)) throw new Error('hit');
      const w = s.weeks.find(x => x.week === hit.week && x.boss === barOf(hit))!; w.left -= applied; w.attempts++; if (first) w.accounts++;
      s.hits.push({ ...hit, applied, at });
    },
    hasAccount: (week: number, boss: BarBoss, account: string) => s.hits.some(x => x.week === week && barOf(x) === boss && x.account === account),
    board: (week: number, boss: BarBoss | undefined, account: string, limit: number) => rankAgg(aggregate(s.hits.filter(x => x.week === week && (!boss || barOf(x) === boss))), account, limit),
  };
  return s;
}

const SCHEMA = [
  // P11-05: one row per week and boss (replaces P11-04's `weeks`, whose rows become the `warden` bars below).
  `CREATE TABLE IF NOT EXISTS bars (week INTEGER NOT NULL, boss TEXT NOT NULL, hp INTEGER NOT NULL, left_hp INTEGER NOT NULL,
     accounts INTEGER NOT NULL, attempts INTEGER NOT NULL, opened INTEGER NOT NULL, PRIMARY KEY (week, boss))`,
  'CREATE TABLE IF NOT EXISTS hits (id TEXT PRIMARY KEY, week INTEGER NOT NULL, account TEXT NOT NULL, damage INTEGER NOT NULL, applied INTEGER NOT NULL, at INTEGER NOT NULL)',
];
// Runs when the object starts (before any request): P11-04 objects get `hits.boss` (old rows: the warden) and their
// `weeks` rows copied into `bars` as the warden's (attempts counted from the hits), once, in one transaction.
function migrate(state: DurableStateLike): void {
  const { sql } = state.storage;
  state.storage.transactionSync(() => {
    for (const q of SCHEMA) sql.exec(q);
    const cols = new Set(sql.exec<{ name: string }>('PRAGMA table_info(hits)').toArray().map(c => c.name));
    if (!cols.has('boss')) sql.exec("ALTER TABLE hits ADD COLUMN boss TEXT NOT NULL DEFAULT 'warden'");
    sql.exec('CREATE INDEX IF NOT EXISTS hits_bar_account ON hits (week, boss, account)');
    sql.exec('DROP INDEX IF EXISTS hits_week_account');
    if (sql.exec('PRAGMA table_info(weeks)').toArray().length) {
      sql.exec(`INSERT OR IGNORE INTO bars (week, boss, hp, left_hp, accounts, attempts, opened)
        SELECT w.week, 'warden', w.hp, w.left_hp, w.accounts, (SELECT COUNT(*) FROM hits h WHERE h.week = w.week), w.opened FROM weeks w`);
      sql.exec('DROP TABLE weeks');
    }
  });
}
type Agg = { account: string; damage: number; n: number; best: number; at: number };
// Ranked by total damage, then the earlier first hit, then the account id (stable).
const rankAgg = (rows: readonly Agg[], account: string, limit: number): Board => {
  const all = [...rows].sort((a, b) => b.damage - a.damage || a.at - b.at || (a.account < b.account ? -1 : 1));
  const i = all.findIndex(r => r.account === account), mine = all[i];
  return { rows: all.slice(0, limit).map(r => ({ account: r.account, total: r.damage, attempts: r.n, best: r.best })), players: all.length,
    you: mine ? { rank: i + 1, total: mine.damage, attempts: mine.n, best: mine.best } : null };
};
type BarRow = { week: number; boss: string; hp: number; left_hp: number; accounts: number; attempts: number; opened: number };
export function sqlBossStore(state: DurableStateLike): BossStore {
  const { sql } = state.storage;
  migrate(state);
  return {
    bars(week) {
      return sql.exec<BarRow>('SELECT week, boss, hp, left_hp, accounts, attempts, opened FROM bars WHERE week = ? ORDER BY rowid', week).toArray()
        .map(r => ({ week: r.week, boss: r.boss as BarBoss, hp: r.hp, left: r.left_hp, accounts: r.accounts, attempts: r.attempts, opened: r.opened }));
    },
    open(bars) {
      state.storage.transactionSync(() => {
        for (const b of bars) sql.exec('INSERT INTO bars (week, boss, hp, left_hp, accounts, attempts, opened) VALUES (?, ?, ?, ?, ?, ?, ?)', b.week, b.boss, b.hp, b.left, b.accounts, b.attempts, b.opened);
      });
    },
    hit(id) { const r = sql.exec<{ applied: number }>('SELECT applied FROM hits WHERE id = ?', id).toArray()[0]; return r ? { applied: r.applied } : null; },
    take(hit, applied, first, at) {
      state.storage.transactionSync(() => {
        sql.exec('INSERT INTO hits (id, week, account, damage, applied, at, boss) VALUES (?, ?, ?, ?, ?, ?, ?)', hit.id, hit.week, hit.account, hit.damage, applied, at, barOf(hit));
        sql.exec('UPDATE bars SET left_hp = left_hp - ?, accounts = accounts + ?, attempts = attempts + 1 WHERE week = ? AND boss = ?', applied, first ? 1 : 0, hit.week, barOf(hit));
      });
    },
    hasAccount(week, boss, account) { return sql.exec('SELECT 1 FROM hits WHERE week = ? AND boss = ? AND account = ? LIMIT 1', week, boss, account).toArray().length > 0; },
    // One grouped read per account of the week (a week holds at most a few attempts per account), ranked like the memory store.
    board(week, boss, account, limit) {
      const rows = boss
        ? sql.exec<Agg>('SELECT account, SUM(damage) AS damage, COUNT(*) AS n, MAX(damage) AS best, MIN(at) AS at FROM hits WHERE week = ? AND boss = ? GROUP BY account', week, boss).toArray()
        : sql.exec<Agg>('SELECT account, SUM(damage) AS damage, COUNT(*) AS n, MAX(damage) AS best, MIN(at) AS at FROM hits WHERE week = ? GROUP BY account', week).toArray();
      return rankAgg(rows, account, limit);
    },
  };
}

// What a device reads of a bar; `WorldBossShared` is what an account object's claim runs with (no `boss` for the warden).
export interface PublicBar { week: number; boss: BarBoss; hp: number; left: number; accounts: number; attempts: number }
const publicBar = (b: BossBar | null): PublicBar | null => b && { week: b.week, boss: b.boss, hp: b.hp, left: Math.max(0, b.left), accounts: b.accounts, attempts: b.attempts };
export const sharedOfBar = (b: Pick<PublicBar, 'week' | 'boss' | 'hp' | 'left'>): WorldBossShared =>
  ({ week: b.week, hp: b.hp, left: b.left, ...(b.boss === 'warden' ? {} : { boss: b.boss }) });
const isBarBoss = (v: string): v is BarBoss => v === 'warden' || isWbBoss(v);
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
// The Durable Object's requests (from the Worker only): `GET /status?week=&boss=` (`status`: that bar, the warden's by
// default; `bars`: every bar of the week) and `POST /contribute { hits }`.
export async function handleBossRequest(host: WorldBossHost, request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/status' && request.method === 'GET') {
    const raw = url.searchParams.get('week'); const week = raw === null ? host.week() : Number(raw);
    const boss = url.searchParams.get('boss') ?? 'warden';
    if (!Number.isSafeInteger(week) || !isBarBoss(boss)) return reply({ error: 'invalid_request' }, 400);
    const bars = host.bars(week) ?? [];
    return reply({ week: host.week(), status: publicBar(bars.find(b => b.boss === boss) ?? null), bars: bars.map(b => publicBar(b)!) });
  }
  // `GET /board?account=&boss=&last=1`: this week's (or last week's) leaderboard; `boss` absent or `all` = every bar.
  if (url.pathname === '/board' && request.method === 'GET') {
    const account = url.searchParams.get('account') ?? '', boss = url.searchParams.get('boss') ?? 'all';
    if (!/^[0-9a-f]{32}$/.test(account) || (boss !== 'all' && !isBarBoss(boss))) return reply({ error: 'invalid_request' }, 400);
    const week = host.week() - (url.searchParams.get('last') === '1' ? 1 : 0);
    const board = host.board(week, boss === 'all' ? undefined : boss as BarBoss, account);
    return board ? reply(board) : reply({ error: 'invalid_request' }, 400);
  }
  if (url.pathname === '/contribute' && request.method === 'POST') {
    let body: unknown;
    try { body = JSON.parse(await request.text()); } catch { return reply({ error: 'invalid_json' }, 400); }
    const hits = typeof body === 'object' && body !== null ? (body as { hits?: unknown }).hits : undefined;
    if (!Array.isArray(hits) || hits.length > 64 || !hits.every(isHit)) return reply({ error: 'invalid_request' }, 400);
    return reply(host.contribute(hits));
  }
  return reply({ error: 'not_found' }, 404);
}
