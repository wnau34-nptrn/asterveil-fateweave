import { canonicalJson, type CommandBook, type CommandRequest } from '../core/command/command-envelope';
import type { Game } from '../core/save/expedition-save';
import { sha256Hex } from './accounts';
import { OTHER_DEVICE, type GameHost, type HostState, type HostStore, type LogEntry } from './game-host';

// The Worker forwards the device's session id (checked there) in this header.
export const SESSION_HEADER = 'X-Fateweave-Session';

// P09-02b: the Durable Object for one account (SQLite storage backend). It adapts the DO's SQL storage to `HostStore`
// and its HTTP requests from the Worker to `GameHost`. Only the Worker reaches it (no public route).

// The subset of the Durable Object SQLite API used here.
export interface SqlCursor<T> { toArray(): T[] }
export interface SqlStorageLike { exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): SqlCursor<T> }
export interface DurableStateLike { storage: { sql: SqlStorageLike; transactionSync<T>(fn: () => T): T } }

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), game TEXT, book TEXT NOT NULL, updated_at INTEGER NOT NULL)',
  `CREATE TABLE IF NOT EXISTS log (seq INTEGER PRIMARY KEY, request_id TEXT NOT NULL, command TEXT NOT NULL, seeds TEXT NOT NULL,
     status TEXT NOT NULL, content_version TEXT NOT NULL, at INTEGER NOT NULL)`,
  'CREATE TABLE IF NOT EXISTS session (id INTEGER PRIMARY KEY CHECK (id = 1), active TEXT NOT NULL, claimed_at INTEGER NOT NULL)',
];

export function sqlStore(state: DurableStateLike): HostStore {
  const { sql } = state.storage;
  for (const s of SCHEMA) sql.exec(s);
  let cached: HostState | null | undefined;
  let session: string | null | undefined;
  return {
    load() {
      if (cached === undefined) {
        const row = sql.exec<{ game: string | null; book: string }>('SELECT game, book FROM state WHERE id = 1').toArray()[0];
        cached = row ? { game: row.game ? JSON.parse(row.game) as Game : null, book: JSON.parse(row.book) as CommandBook } : null;
      }
      return cached ? structuredClone(cached) : null;
    },
    commit(next, e) {
      state.storage.transactionSync(() => {
        sql.exec('INSERT INTO state (id, game, book, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET game = excluded.game, book = excluded.book, updated_at = excluded.updated_at',
          next.game ? JSON.stringify(next.game) : null, JSON.stringify(next.book), e.at);
        sql.exec('INSERT INTO log (seq, request_id, command, seeds, status, content_version, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          e.seq, e.requestId, JSON.stringify(e.command), JSON.stringify(e.seeds), e.status, e.contentVersion, e.at);
      });
      cached = structuredClone(next);
    },
    entries() {
      return sql.exec<{ seq: number; request_id: string; command: string; seeds: string; status: LogEntry['status']; content_version: string; at: number }>(
        'SELECT seq, request_id, command, seeds, status, content_version, at FROM log ORDER BY seq').toArray()
        .map(r => ({ seq: r.seq, requestId: r.request_id, command: JSON.parse(r.command), seeds: JSON.parse(r.seeds) as number[], status: r.status, contentVersion: r.content_version, at: r.at }));
    },
    activeSession() {
      if (session === undefined) session = sql.exec<{ active: string }>('SELECT active FROM session WHERE id = 1').toArray()[0]?.active ?? null;
      return session;
    },
    setActiveSession(next, at) {
      sql.exec('INSERT INTO session (id, active, claimed_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET active = excluded.active, claimed_at = excluded.claimed_at', next, at);
      session = next;
    },
  };
}

export const serverSeed = (): number => crypto.getRandomValues(new Uint32Array(1))[0]!;

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function asRequest(v: unknown): CommandRequest | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (Object.keys(r).some(k => !['requestId', 'seq', 'command'].includes(k))) return null;
  return typeof r.requestId === 'string' && typeof r.seq === 'number' && 'command' in r ? { requestId: r.requestId, seq: r.seq, command: r.command } : null;
}

// Request handling shared by the real Durable Object and tests.
export async function handleAccountRequest(host: GameHost, request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/verify' && request.method === 'POST') return reply(host.verify());
  const session = request.headers.get(SESSION_HEADER) ?? '';
  // D12: entering on this session takes the account over; any other session now gets 423 until it enters again.
  if (path === '/session' && request.method === 'POST') { host.claim(session); return reply(host.view()); }
  const known = (path === '/state' && request.method === 'GET') || (path === '/command' && request.method === 'POST');
  if (!known) return reply({ error: 'not_found' }, 404);
  if (!host.admits(session)) return reply(OTHER_DEVICE.body, OTHER_DEVICE.status);
  if (path === '/state') return reply(host.view());
  let parsed: unknown;
  try { parsed = JSON.parse(await request.text()); } catch { return reply({ error: 'invalid_json' }, 400); }
  const req = asRequest(parsed);
  if (!req) return reply({ error: 'invalid_request' }, 400);
  // Hash before entering the synchronous load → process → commit section (no await inside it).
  const digest = await sha256Hex(canonicalJson(req.command));
  const answer = host.command(req, digest);
  return reply(answer.body, answer.status);
}
