import { canonicalJson, type CommandBook, type CommandRequest } from '../core/command/command-envelope';
import type { CloudSaveUpload } from '../core/cloud/cloud-save';
import type { Game } from '../core/save/expedition-save';
import { sha256Hex } from './accounts';
import { OTHER_DEVICE, type GameHost, type HostState, type HostStore, type ImportRecord, type LogEntry, type Snapshot } from './game-host';

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
  // P09-02e: snapshots the log replays from, and the one imported local save (D11), kept verbatim.
  'CREATE TABLE IF NOT EXISTS snapshots (seq INTEGER PRIMARY KEY, game TEXT, origin TEXT NOT NULL, at INTEGER NOT NULL)',
  `CREATE TABLE IF NOT EXISTS legacy_import (id INTEGER PRIMARY KEY CHECK (id = 1), request_id TEXT NOT NULL, payload_sha256 TEXT NOT NULL,
     save_version INTEGER NOT NULL, seq INTEGER NOT NULL, payload TEXT NOT NULL, at INTEGER NOT NULL)`,
];
const STATE_UPSERT = 'INSERT INTO state (id, game, book, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET game = excluded.game, book = excluded.book, updated_at = excluded.updated_at';
const SNAPSHOT_UPSERT = 'INSERT INTO snapshots (seq, game, origin, at) VALUES (?, ?, ?, ?) ON CONFLICT(seq) DO UPDATE SET game = excluded.game, origin = excluded.origin, at = excluded.at';
const gameText = (game: Game | null) => game ? JSON.stringify(game) : null;

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
    commit(next, e, snapshot) {
      state.storage.transactionSync(() => {
        sql.exec(STATE_UPSERT, gameText(next.game), JSON.stringify(next.book), e.at);
        sql.exec('INSERT INTO log (seq, request_id, command, seeds, status, content_version, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          e.seq, e.requestId, JSON.stringify(e.command), JSON.stringify(e.seeds), e.status, e.contentVersion, e.at);
        if (snapshot) sql.exec(SNAPSHOT_UPSERT, snapshot.seq, gameText(snapshot.game), snapshot.origin, snapshot.at);
      });
      cached = structuredClone(next);
    },
    entries(after = 0) {
      return sql.exec<{ seq: number; request_id: string; command: string; seeds: string; status: LogEntry['status']; content_version: string; at: number }>(
        'SELECT seq, request_id, command, seeds, status, content_version, at FROM log WHERE seq > ? ORDER BY seq', after).toArray()
        .map(r => ({ seq: r.seq, requestId: r.request_id, command: JSON.parse(r.command), seeds: JSON.parse(r.seeds) as number[], status: r.status, contentVersion: r.content_version, at: r.at }));
    },
    latestSnapshot() {
      const r = sql.exec<{ seq: number; game: string | null; origin: Snapshot['origin']; at: number }>('SELECT seq, game, origin, at FROM snapshots ORDER BY seq DESC LIMIT 1').toArray()[0];
      return r ? { seq: r.seq, game: r.game ? JSON.parse(r.game) as Game : null, origin: r.origin, at: r.at } : null;
    },
    imported() {
      const r = sql.exec<{ request_id: string; payload_sha256: string; save_version: number; seq: number; at: number }>(
        'SELECT request_id, payload_sha256, save_version, seq, at FROM legacy_import WHERE id = 1').toArray()[0];
      return r ? { requestId: r.request_id, payloadSha256: r.payload_sha256, saveVersion: r.save_version, seq: r.seq, at: r.at } satisfies ImportRecord : null;
    },
    commitImport(next, snapshot, record, payload) {
      state.storage.transactionSync(() => {
        sql.exec(STATE_UPSERT, gameText(next.game), JSON.stringify(next.book), record.at);
        sql.exec(SNAPSHOT_UPSERT, snapshot.seq, gameText(snapshot.game), snapshot.origin, snapshot.at);
        sql.exec('INSERT INTO legacy_import (id, request_id, payload_sha256, save_version, seq, payload, at) VALUES (1, ?, ?, ?, ?, ?, ?)',
          record.requestId, record.payloadSha256, record.saveVersion, record.seq, payload, record.at);
      });
      cached = structuredClone(next);
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
  const known = (path === '/state' && request.method === 'GET') || ((path === '/command' || path === '/import') && request.method === 'POST');
  if (!known) return reply({ error: 'not_found' }, 404);
  if (!host.admits(session)) return reply(OTHER_DEVICE.body, OTHER_DEVICE.status);
  if (path === '/state') return reply(host.view());
  // P09-02e (D11): the Worker already ran `checkUpload` and holds the save's fingerprint for this account.
  if (path === '/import') {
    let upload: CloudSaveUpload;
    try { upload = JSON.parse(await request.text()) as CloudSaveUpload; } catch { return reply({ error: 'invalid_json' }, 400); }
    const answer = host.importSave(upload);
    return reply(answer.body, answer.status);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(await request.text()); } catch { return reply({ error: 'invalid_json' }, 400); }
  const req = asRequest(parsed);
  if (!req) return reply({ error: 'invalid_request' }, 400);
  // Hash before entering the synchronous load → process → commit section (no await inside it).
  const digest = await sha256Hex(canonicalJson(req.command));
  const answer = host.command(req, digest);
  return reply(answer.body, answer.status);
}
