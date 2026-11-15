import { filterChat, type ChatRefusal } from '../core/chat/filter';
import type { DurableStateLike } from './account-object';

// P11 chat (docs/design/CHAT_P11_TH.md): the one `Chat` Durable Object (name `chat`), like `WorldBoss`. It keeps the
// world channel's recent messages, reports and mutes in its SQLite storage. Only the Worker calls it, with an account
// id the Worker has authenticated; the object filters the text again, counts each account's sends exactly (one object
// runs in one place) and applies retention on every send. Pure apart from the injected storage and clock.

export const CHAT_LIMITS = {
  gapMs: 4000, perMinute: 8, perHour: 60, duplicateMs: 60_000,
  readBatch: 50, keepMessages: 500, keepMs: 7 * 86_400_000, keepReportedMs: 30 * 86_400_000,
  hideAtReports: 3, maxMuteMinutes: 30 * 24 * 60,
} as const;
export const CHANNEL = 'world';
export const REPORT_REASONS = ['abuse', 'spam', 'personal', 'other'] as const;
export type ReportReason = typeof REPORT_REASONS[number];
export interface ChatMessage { id: number; handle: string; text: string; at: number; mine: boolean }
export type PostResult = { ok: true; message: ChatMessage; masked: boolean } | { ok: false; error: ChatRefusal | 'muted' | 'too_fast' | 'duplicate'; until?: number; retryAfter?: number };
export type ReportResult = 'reported' | 'already' | 'own' | 'no_message';
export interface AdminRow { id: number; account: string; handle: string; text: string; at: number; hidden: string | null; reports: number; reasons: string[] }

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, account TEXT NOT NULL, handle TEXT NOT NULL,
     text TEXT NOT NULL, at INTEGER NOT NULL, hidden TEXT, reports INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS messages_account_at ON messages (account, at)',
  'CREATE INDEX IF NOT EXISTS messages_at ON messages (at)',
  'CREATE TABLE IF NOT EXISTS reports (message INTEGER NOT NULL, reporter TEXT NOT NULL, reason TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (message, reporter))',
  'CREATE INDEX IF NOT EXISTS reports_reporter ON reports (reporter)',
  'CREATE TABLE IF NOT EXISTS mutes (account TEXT PRIMARY KEY, until INTEGER NOT NULL, by TEXT NOT NULL, at INTEGER NOT NULL)',
];

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// The name shown in chat: `ค่าย-XXXXX` from SHA-256 of the account id (not reversible, never the id itself).
export async function chatHandle(accountId: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`fateweave-chat:${accountId}`)));
  let bits = 0, value = 0, out = '';
  for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5 && out.length < 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; } if (out.length >= 5) break; }
  return `ค่าย-${out}`;
}

type Row = { id: number; account: string; handle: string; text: string; at: number; hidden: string | null; reports: number };

export class ChatHost {
  private readonly sql: DurableStateLike['storage']['sql'];
  constructor(private readonly state: DurableStateLike, private readonly now: () => number = () => Date.now()) {
    this.sql = state.storage.sql;
    for (const q of SCHEMA) this.sql.exec(q);
  }
  private rows<T>(q: string, ...b: unknown[]): T[] { return this.sql.exec<T>(q, ...b).toArray(); }
  private view(r: Row, account: string): ChatMessage { return { id: r.id, handle: r.handle, text: r.text, at: r.at, mine: r.account === account }; }

  mutedUntil(account: string): number | null {
    const r = this.rows<{ until: number }>('SELECT until FROM mutes WHERE account = ?', account)[0];
    return r && r.until > this.now() ? r.until : null;
  }

  // Messages after `after` (the newest `readBatch` of them), and the ids hidden among recent ones so a device that
  // already shows them can take them away.
  read(account: string, after: number): { messages: ChatMessage[]; hidden: number[]; last: number; muted: number | null } {
    const list = this.rows<Row>('SELECT id, account, handle, text, at, hidden, reports FROM messages WHERE channel = ? AND id > ? AND hidden IS NULL ORDER BY id DESC LIMIT ?',
      CHANNEL, after, CHAT_LIMITS.readBatch).reverse();
    const hidden = after > 0 ? this.rows<{ id: number }>('SELECT id FROM messages WHERE id > ? AND id <= ? AND hidden IS NOT NULL', Math.max(0, after - 200), after).map(r => r.id) : [];
    const last = this.rows<{ id: number | null }>('SELECT MAX(id) AS id FROM messages')[0]?.id ?? 0;
    return { messages: list.map(r => this.view(r, account)), hidden, last: Math.max(last, 0), muted: this.mutedUntil(account) };
  }

  post(account: string, handle: string, raw: string): PostResult {
    const now = this.now();
    const until = this.mutedUntil(account);
    if (until) return { ok: false, error: 'muted', until };
    const f = filterChat(raw);
    if (!f.ok) return { ok: false, error: f.error };
    const mine = this.rows<{ at: number; text: string }>('SELECT at, text FROM messages WHERE account = ? AND at > ? ORDER BY at DESC', account, now - 3_600_000);
    const lastAt = mine[0]?.at;
    if (lastAt !== undefined && now - lastAt < CHAT_LIMITS.gapMs) return { ok: false, error: 'too_fast', retryAfter: Math.ceil((CHAT_LIMITS.gapMs - (now - lastAt)) / 1000) };
    if (mine.filter(m => now - m.at < 60_000).length >= CHAT_LIMITS.perMinute) return { ok: false, error: 'too_fast', retryAfter: 60 };
    if (mine.length >= CHAT_LIMITS.perHour) return { ok: false, error: 'too_fast', retryAfter: 600 };
    if (mine[0] && now - mine[0].at < CHAT_LIMITS.duplicateMs && mine[0].text === f.text) return { ok: false, error: 'duplicate' };
    const id = this.state.storage.transactionSync(() => {
      const r = this.rows<{ id: number }>('INSERT INTO messages (channel, account, handle, text, at) VALUES (?, ?, ?, ?, ?) RETURNING id', CHANNEL, account, handle, f.text, now)[0]!.id;
      this.retain(now);
      return r;
    });
    return { ok: true, message: { id, handle, text: f.text, at: now, mine: true }, masked: f.masked };
  }

  // §5 retention: 7 days or the newest 500, reported messages up to 30 days; dangling reports and ended mutes go too.
  private retain(now: number): void {
    this.sql.exec('DELETE FROM messages WHERE (at < ? AND reports = 0) OR at < ?', now - CHAT_LIMITS.keepMs, now - CHAT_LIMITS.keepReportedMs);
    this.sql.exec('DELETE FROM messages WHERE reports = 0 AND id <= (SELECT MAX(id) FROM messages) - ?', CHAT_LIMITS.keepMessages);
    this.sql.exec('DELETE FROM reports WHERE message NOT IN (SELECT id FROM messages)');
    this.sql.exec('DELETE FROM mutes WHERE until <= ?', now);
  }

  report(account: string, id: number, reason: ReportReason): ReportResult {
    const m = this.rows<Row>('SELECT id, account, handle, text, at, hidden, reports FROM messages WHERE id = ?', id)[0];
    if (!m) return 'no_message';
    if (m.account === account) return 'own';
    if (this.rows('SELECT 1 FROM reports WHERE message = ? AND reporter = ?', id, account).length) return 'already';
    this.state.storage.transactionSync(() => {
      this.sql.exec('INSERT INTO reports (message, reporter, reason, at) VALUES (?, ?, ?, ?)', id, account, reason, this.now());
      this.sql.exec("UPDATE messages SET reports = reports + 1, hidden = CASE WHEN hidden IS NULL AND reports + 1 >= ? THEN 'reports' ELSE hidden END WHERE id = ?", CHAT_LIMITS.hideAtReports, id);
    });
    return 'reported';
  }

  // ---- admin (the Worker checks D1 `admins` and audits) ----
  admin(): { rows: AdminRow[]; mutes: { account: string; until: number }[] } {
    const rows = this.rows<Row>('SELECT id, account, handle, text, at, hidden, reports FROM messages WHERE reports > 0 OR hidden IS NOT NULL ORDER BY id DESC LIMIT 50');
    return {
      rows: rows.map(r => ({ ...r, reasons: this.rows<{ reason: string }>('SELECT reason FROM reports WHERE message = ? ORDER BY at', r.id).map(x => x.reason) })),
      mutes: this.rows<{ account: string; until: number }>('SELECT account, until FROM mutes WHERE until > ? ORDER BY until DESC LIMIT 50', this.now()),
    };
  }
  hide(id: number, hidden: boolean): boolean {
    if (!this.rows('SELECT 1 FROM messages WHERE id = ?', id).length) return false;
    this.sql.exec('UPDATE messages SET hidden = ? WHERE id = ?', hidden ? 'admin' : null, id);
    return true;
  }
  mute(account: string, minutes: number, by: string): number | null {
    if (minutes <= 0) { this.sql.exec('DELETE FROM mutes WHERE account = ?', account); return null; }
    const until = this.now() + minutes * 60_000;
    this.sql.exec('INSERT INTO mutes (account, until, by, at) VALUES (?, ?, ?, ?) ON CONFLICT (account) DO UPDATE SET until = excluded.until, by = excluded.by, at = excluded.at', account, until, by, this.now());
    return until;
  }
  // Account deletion (P09-02g purge): everything the account wrote or reported, and its mute.
  purge(account: string): number {
    return this.state.storage.transactionSync(() => {
      const n = this.rows<{ n: number }>('SELECT COUNT(*) AS n FROM messages WHERE account = ?', account)[0]!.n;
      this.sql.exec('DELETE FROM reports WHERE message IN (SELECT id FROM messages WHERE account = ?)', account);
      this.sql.exec('UPDATE messages SET reports = reports - 1 WHERE id IN (SELECT message FROM reports WHERE reporter = ?)', account);
      this.sql.exec('DELETE FROM reports WHERE reporter = ?', account);
      this.sql.exec('DELETE FROM messages WHERE account = ?', account);
      this.sql.exec('DELETE FROM mutes WHERE account = ?', account);
      return n;
    });
  }
}

const ACCOUNT = /^[0-9a-f]{32}$/;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const int = (v: unknown, min: number, max: number) => (Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max ? v as number : null);

// The object's requests (from the Worker only; `account` is the authenticated account):
// `GET /read?account=&after=`, `POST /post { account, text }`, `POST /report { account, id, reason }`,
// `GET /admin`, `POST /hide { id, hidden }`, `POST /mute { account, minutes, by }`, `POST /purge { account }`.
export async function handleChatRequest(host: ChatHost, request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    if (url.pathname === '/read') {
      const account = url.searchParams.get('account') ?? ''; const after = int(Number(url.searchParams.get('after') ?? '0'), 0, Number.MAX_SAFE_INTEGER);
      if (!ACCOUNT.test(account) || after === null) return reply({ error: 'invalid_request' }, 400);
      return reply(host.read(account, after));
    }
    if (url.pathname === '/admin') return reply(host.admin());
    return reply({ error: 'not_found' }, 404);
  }
  if (request.method !== 'POST') return reply({ error: 'not_found' }, 404);
  let b: Record<string, unknown>;
  try { const v: unknown = JSON.parse(await request.text()); if (typeof v !== 'object' || v === null) throw new Error(); b = v as Record<string, unknown>; } catch { return reply({ error: 'invalid_json' }, 400); }
  const account = typeof b.account === 'string' && ACCOUNT.test(b.account) ? b.account : null;
  switch (url.pathname) {
    case '/post': {
      if (!account || typeof b.text !== 'string') return reply({ error: 'invalid_request' }, 400);
      const out = host.post(account, await chatHandle(account), b.text);
      return out.ok ? reply(out, 201) : reply(out, out.error === 'too_fast' ? 429 : out.error === 'muted' ? 403 : 422);
    }
    case '/report': {
      const id = int(b.id, 1, Number.MAX_SAFE_INTEGER); const reason = REPORT_REASONS.find(r => r === b.reason);
      if (!account || id === null || !reason) return reply({ error: 'invalid_request' }, 400);
      const out = host.report(account, id, reason);
      return out === 'reported' || out === 'already' ? reply({ reported: true }) : reply({ error: out }, out === 'own' ? 409 : 404);
    }
    case '/hide': {
      const id = int(b.id, 1, Number.MAX_SAFE_INTEGER);
      if (id === null || typeof b.hidden !== 'boolean') return reply({ error: 'invalid_request' }, 400);
      return host.hide(id, b.hidden) ? reply({ id, hidden: b.hidden }) : reply({ error: 'no_message' }, 404);
    }
    case '/mute': {
      const minutes = int(b.minutes, 0, CHAT_LIMITS.maxMuteMinutes);
      if (!account || minutes === null || typeof b.by !== 'string') return reply({ error: 'invalid_request' }, 400);
      return reply({ account, until: host.mute(account, minutes, b.by) });
    }
    case '/purge': {
      if (!account) return reply({ error: 'invalid_request' }, 400);
      return reply({ purged: host.purge(account) });
    }
  }
  return reply({ error: 'not_found' }, 404);
}
