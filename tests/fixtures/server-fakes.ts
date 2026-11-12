import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { sequenceSeeds } from '../../src/core/command/seed-source';
import type { D1Like, D1Stmt } from '../../src/server/accounts';
import { handleAccountRequest, sqlStore, type DurableStateLike } from '../../src/server/account-object';
import { RateLimiter, type ApiDeps } from '../../src/server/api';
import { GameHost } from '../../src/server/game-host';
import { GAME_CONTEXT } from '../../src/server/worker';
import { currentActorId, resolveCommand } from '../../src/core/battle/engine';
import type { Command } from '../../src/core/battle/types';
import type { Game } from '../../src/core/save/expedition-save';
import { battleData, battleState } from '../../src/core/world/world';

// The P09-02b Worker and per-account Durable Object in Node: real SQLite (node:sqlite) stands in for D1 and the Durable
// Object's SQL storage. Shared by tests/server-api.test.ts and tests/server-client.test.ts.

export const VERSION = 'test-content-1';

export function fakeD1(): D1Like & { db: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../cloudflare/migrations/0001_accounts.sql', import.meta.url), 'utf8'));
  const stmt = (sql: string, values: unknown[] = []): D1Stmt => ({
    bind: (...v) => stmt(sql, v),
    first: async <T>() => (db.prepare(sql).get(...values as never[]) ?? null) as T | null,
    all: async <T>() => ({ results: db.prepare(sql).all(...values as never[]) as T[] }),
    run: async () => db.prepare(sql).run(...values as never[]),
  });
  return {
    db, prepare: sql => stmt(sql),
    batch: async (list) => {
      db.exec('BEGIN');
      try { for (const s of list) await s.run(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
      return [];
    },
  };
}
export function fakeDurableState(): DurableStateLike & { db: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    storage: {
      // Like the real API, exec runs the statement at once; the cursor only hands out the rows.
      sql: { exec: <T>(q: string, ...b: unknown[]) => { const rows = db.prepare(q).all(...b as never[]) as T[]; return { toArray: () => rows }; } },
      transactionSync: <T>(fn: () => T): T => {
        db.exec('BEGIN');
        try { const out = fn(); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
      },
    },
  };
}

export interface Server { deps: ApiDeps; d1: ReturnType<typeof fakeD1>; objects: Map<string, { host: GameHost; state: ReturnType<typeof fakeDurableState> }>; clock: { t: number } }
export function server(seeds: number[] = [11, 22, 33, 44, 55, 66, 77, 88, 99], contentVersion = VERSION): Server {
  const d1 = fakeD1(); const objects: Server['objects'] = new Map(); const clock = { t: 1_000_000 };
  const draw = sequenceSeeds(seeds);
  const deps: ApiDeps = {
    db: d1, contentVersion, allowedOrigins: ['https://wnau34-nptrn.github.io'], now: () => clock.t, limiter: new RateLimiter(),
    game(accountId) {
      let o = objects.get(accountId);
      if (!o) { const state = fakeDurableState(); o = { state, host: new GameHost(sqlStore(state), GAME_CONTEXT, () => draw.next(), contentVersion, () => clock.t) }; objects.set(accountId, o); }
      const host = o.host;
      return { fetch: (r: Request) => handleAccountRequest(host, r) };
    },
  };
  return { deps, d1, objects, clock };
}

export const storedGame = (s: Server, accountId: string): Game | null => s.objects.get(accountId)!.host['store'].load()?.game ?? null;

// Plain attacks on the first legal foe until the battle ends (enough for the prologue).
export function battleTurns(g: Game): Command[] {
  const data = battleData(g.run!, GAME_CONTEXT.home, GAME_CONTEXT.lookup)!; let st = battleState(g.run!, GAME_CONTEXT.home, GAME_CONTEXT.lookup)!;
  for (let n = 0; n < 400 && st.outcome === 'active'; n++) {
    const heroId = currentActorId(st)!; let done = false;
    for (const e of st.enemies) {
      try { st = resolveCommand(st, data, { beat: st.beat, heroId, action: 'attack', targetId: e.id }, true).state; done = true; break; } catch { /* next */ }
    }
    if (!done) throw new Error('no legal turn');
  }
  return st.commands;
}
