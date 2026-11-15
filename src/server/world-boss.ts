import { weekOf } from '../core/world/board';
import type { WorldBossRules } from '../core/world/types';
import { MAX_WB_DAMAGE, sharedHpFor, type WorldBossShared } from '../core/world/world-boss';
import type { DurableStateLike } from './account-object';
import { serverDay } from './ledger';

// P11-04 World Boss, part 1 (docs/design/WORLD_BOSS_P11_04_TH.md): the shared HP. One Durable Object (name
// `world-boss`) keeps each week's shared HP and every attempt that hit it. Accounts never write here directly: an
// account's object commits the attempt (replayed by the rules, rewards receipted in its own `reward_ledger`) and keeps
// the hit in its outbox; the Worker hands the outbox here and tells the account which hits were taken. A hit is taken
// once (its id is `<account>:w<week>:a<attempt>`), so a resend after a lost answer changes nothing; the HP removed is at
// most what was left, so attempts that finish together never take the HP below 0, and attempts after the kill still
// count for their players (personal rewards) but remove nothing (`applied` 0). Pure apart from the injected store and
// clock; tests run it in memory. Load and contention are not tested yet (open item before the external test).

export interface BossWeek extends WorldBossShared { accounts: number; opened: number }
export interface Hit { id: string; week: number; account: string; damage: number }
export interface BossStore {
  week(week: number): BossWeek | null;
  // How many accounts hit the week (for the next week's HP).
  open(week: BossWeek): void;
  hit(id: string): { applied: number } | null;
  // Must insert the hit and update the week (left, accounts) atomically.
  take(hit: Hit, applied: number, firstOfAccount: boolean, at: number): void;
  hasAccount(week: number, account: string): boolean;
}

const HIT_ID = /^[0-9a-f]{32}:w\d{1,6}:a\d{1,2}$/;
export const isHit = (v: unknown): v is Hit => {
  if (typeof v !== 'object' || v === null) return false;
  const h = v as Record<string, unknown>;
  return Object.keys(h).length === 4 && typeof h.id === 'string' && HIT_ID.test(h.id) && Number.isSafeInteger(h.week) && (h.week as number) >= 0
    && typeof h.account === 'string' && h.id.startsWith(`${h.account}:w${h.week}:`) && Number.isSafeInteger(h.damage) && (h.damage as number) >= 1 && (h.damage as number) <= MAX_WB_DAMAGE;
};

export class WorldBossHost {
  constructor(private readonly store: BossStore, private readonly rules: WorldBossRules, private readonly now: () => number = () => Date.now()) {}
  // The server's week (Monday 00:00 on the game calendar, `ledger.ts`).
  week(): number { return weekOf(serverDay(this.now())); }
  // This week and last week only; this week opens on first touch with its HP fixed from last week's accounts.
  private ensure(week: number): BossWeek | null {
    const current = this.week();
    if (week !== current && week !== current - 1) return null;
    const have = this.store.week(week); if (have) return have;
    const hp = sharedHpFor(this.rules, this.store.week(week - 1)?.accounts ?? 0);
    const opened: BossWeek = { week, hp, left: hp, accounts: 0, opened: this.now() };
    this.store.open(opened); return opened;
  }
  status(week = this.week()): BossWeek | null { return this.ensure(week); }
  // Takes each new hit once. Answers the ids it has now (taken before or now; a hit for a closed week is acknowledged
  // without taking anything) and what each removed.
  contribute(hits: readonly Hit[]): { taken: string[]; applied: Record<string, number> } {
    const taken: string[] = []; const applied: Record<string, number> = {};
    for (const h of hits) {
      const seen = this.store.hit(h.id);
      if (seen) { taken.push(h.id); applied[h.id] = seen.applied; continue; }
      const w = this.ensure(h.week);
      if (!w) { taken.push(h.id); applied[h.id] = 0; continue; }
      const cut = Math.min(h.damage, w.left);
      this.store.take(h, cut, !this.store.hasAccount(h.week, h.account), this.now());
      taken.push(h.id); applied[h.id] = cut;
    }
    return { taken, applied };
  }
}

export function memoryBossStore(): BossStore & { weeks: BossWeek[]; hits: (Hit & { applied: number })[] } {
  const s = {
    weeks: [] as BossWeek[], hits: [] as (Hit & { applied: number })[],
    week: (week: number) => { const w = s.weeks.find(x => x.week === week); return w ? { ...w } : null; },
    open: (w: BossWeek) => { s.weeks.push({ ...w }); },
    hit: (id: string) => { const h = s.hits.find(x => x.id === id); return h ? { applied: h.applied } : null; },
    take: (hit: Hit, applied: number, first: boolean) => {
      if (s.hits.some(x => x.id === hit.id)) throw new Error('hit');
      const w = s.weeks.find(x => x.week === hit.week)!; w.left -= applied; if (first) w.accounts++;
      s.hits.push({ ...hit, applied });
    },
    hasAccount: (week: number, account: string) => s.hits.some(x => x.week === week && x.account === account),
  };
  return s;
}

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS weeks (week INTEGER PRIMARY KEY, hp INTEGER NOT NULL, left_hp INTEGER NOT NULL, accounts INTEGER NOT NULL, opened INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS hits (id TEXT PRIMARY KEY, week INTEGER NOT NULL, account TEXT NOT NULL, damage INTEGER NOT NULL, applied INTEGER NOT NULL, at INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS hits_week_account ON hits (week, account)',
];
export function sqlBossStore(state: DurableStateLike): BossStore {
  const { sql } = state.storage;
  for (const q of SCHEMA) sql.exec(q);
  return {
    week(week) {
      const r = sql.exec<{ week: number; hp: number; left_hp: number; accounts: number; opened: number }>('SELECT week, hp, left_hp, accounts, opened FROM weeks WHERE week = ?', week).toArray()[0];
      return r ? { week: r.week, hp: r.hp, left: r.left_hp, accounts: r.accounts, opened: r.opened } : null;
    },
    open(w) { sql.exec('INSERT INTO weeks (week, hp, left_hp, accounts, opened) VALUES (?, ?, ?, ?, ?)', w.week, w.hp, w.left, w.accounts, w.opened); },
    hit(id) { const r = sql.exec<{ applied: number }>('SELECT applied FROM hits WHERE id = ?', id).toArray()[0]; return r ? { applied: r.applied } : null; },
    take(hit, applied, first, at) {
      state.storage.transactionSync(() => {
        sql.exec('INSERT INTO hits (id, week, account, damage, applied, at) VALUES (?, ?, ?, ?, ?, ?)', hit.id, hit.week, hit.account, hit.damage, applied, at);
        sql.exec('UPDATE weeks SET left_hp = left_hp - ?, accounts = accounts + ? WHERE week = ?', applied, first ? 1 : 0, hit.week);
      });
    },
    hasAccount(week, account) { return sql.exec('SELECT 1 FROM hits WHERE week = ? AND account = ? LIMIT 1', week, account).toArray().length > 0; },
  };
}

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const publicWeek = (w: BossWeek | null) => w && { week: w.week, hp: w.hp, left: Math.max(0, w.left), accounts: w.accounts };
// The Durable Object's requests (from the Worker only): `GET /status?week=` and `POST /contribute { hits }`.
export async function handleBossRequest(host: WorldBossHost, request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/status' && request.method === 'GET') {
    const raw = url.searchParams.get('week'); const week = raw === null ? host.week() : Number(raw);
    if (!Number.isSafeInteger(week)) return reply({ error: 'invalid_request' }, 400);
    return reply({ week: host.week(), status: publicWeek(host.status(week)) });
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
