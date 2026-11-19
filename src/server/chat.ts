import { channelKind, channelOpen, WORLD_CHANNEL } from '../core/chat/channels';
import { DM_LIMITS } from '../core/chat/friends';
import { filterChat, type ChatRefusal } from '../core/chat/filter';
import type { DurableStateLike } from './account-object';

// P11 chat (docs/design/CHAT_P11_TH.md): the one `Chat` Durable Object (name `chat`), like `WorldBoss`. It keeps the
// world channel's recent messages, reports and mutes in its SQLite storage; since OD-56 also the private (`dm:`)
// conversations, a read marker per account and conversation (unread counts) and a context snapshot for reported
// private messages. The Worker decides who may use a private channel (mutual friends) and names it; the object only
// checks that the channel is a well-formed open one. Only the Worker calls it, with an account
// id the Worker has authenticated; the object filters the text again, counts each account's sends exactly (one object
// runs in one place) and applies retention on every send. Pure apart from the injected storage and clock.

export const CHAT_LIMITS = {
  gapMs: 4000, perMinute: 8, perHour: 60, duplicateMs: 60_000,
  readBatch: 50, keepMessages: 500, keepMs: 7 * 86_400_000, keepReportedMs: 30 * 86_400_000,
  hideAtReports: 3, maxMuteMinutes: 30 * 24 * 60,
} as const;
export const CHANNEL = WORLD_CHANNEL;
export const REPORT_REASONS = ['abuse', 'spam', 'personal', 'other'] as const;
export type ReportReason = typeof REPORT_REASONS[number];
export interface ChatMessage { id: number; handle: string; text: string; at: number; mine: boolean }
export type PostResult = { ok: true; message: ChatMessage; masked: boolean } | { ok: false; error: ChatRefusal | 'muted' | 'too_fast' | 'duplicate' | 'channel_closed'; until?: number; retryAfter?: number };
export type ReportResult = 'reported' | 'already' | 'own' | 'no_message';
export interface ContextLine { account: string; handle: string; text: string; at: number }
export interface AdminRow { id: number; account: string; handle: string; text: string; at: number; hidden: string | null; reports: number; reasons: string[]; channel: 'world' | 'dm'; context?: ContextLine[] }

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, account TEXT NOT NULL, handle TEXT NOT NULL,
     text TEXT NOT NULL, at INTEGER NOT NULL, hidden TEXT, reports INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS messages_account_at ON messages (account, at)',
  'CREATE INDEX IF NOT EXISTS messages_at ON messages (at)',
  'CREATE TABLE IF NOT EXISTS reports (message INTEGER NOT NULL, reporter TEXT NOT NULL, reason TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (message, reporter))',
  'CREATE INDEX IF NOT EXISTS reports_reporter ON reports (reporter)',
  'CREATE TABLE IF NOT EXISTS mutes (account TEXT PRIMARY KEY, until INTEGER NOT NULL, by TEXT NOT NULL, at INTEGER NOT NULL)',
  // OD-56: private conversations live in the same table under `dm:<a>:<b>`.
  'CREATE INDEX IF NOT EXISTS messages_channel ON messages (channel, id)',
  'CREATE TABLE IF NOT EXISTS reads (channel TEXT NOT NULL, account TEXT NOT NULL, last INTEGER NOT NULL, PRIMARY KEY (channel, account))',
  // The few messages before a reported private message (JSON of {account, handle, text, at}), kept with the report.
  'CREATE TABLE IF NOT EXISTS report_context (message INTEGER PRIMARY KEY, channel TEXT NOT NULL, context TEXT NOT NULL)',
];
const isDm = (channel: string) => channel.startsWith('dm:');
// The send pace of a channel kind: the world's, or the stricter private one (all private conversations together).
const PACE = {
  world: { gapMs: CHAT_LIMITS.gapMs, perMinute: CHAT_LIMITS.perMinute, perHour: CHAT_LIMITS.perHour, where: "channel = 'world'" },
  dm: { gapMs: DM_LIMITS.gapMs, perMinute: DM_LIMITS.perMinute, perHour: DM_LIMITS.perHour, where: "channel LIKE 'dm:%'" },
} as const;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// The name shown in chat: `ค่าย-XXXXX` from SHA-256 of the account id (not reversible, never the id itself).
export async function chatHandle(accountId: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`fateweave-chat:${accountId}`)));
  let bits = 0, value = 0, out = '';
  for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5 && out.length < 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; } if (out.length >= 5) break; }
  return `ค่าย-${out}`;
}

type Row = { id: number; account: string; handle: string; text: string; at: number; hidden: string | null; reports: number; channel?: string };

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
  // A private read marks the conversation read up to its newest message (unread counts).
  read(account: string, after: number, channel: string = CHANNEL): { messages: ChatMessage[]; hidden: number[]; last: number; muted: number | null } {
    const list = channelOpen(channel) ? this.rows<Row>('SELECT id, account, handle, text, at, hidden, reports FROM messages WHERE channel = ? AND id > ? AND hidden IS NULL ORDER BY id DESC LIMIT ?',
      channel, after, CHAT_LIMITS.readBatch).reverse() : [];
    const hidden = after > 0 ? this.rows<{ id: number }>('SELECT id FROM messages WHERE channel = ? AND id > ? AND id <= ? AND hidden IS NOT NULL', channel, Math.max(0, after - 200), after).map(r => r.id) : [];
    const last = this.rows<{ id: number | null }>('SELECT MAX(id) AS id FROM messages WHERE channel = ?', channel)[0]?.id ?? 0;
    if (isDm(channel) && channelOpen(channel) && last) this.markRead(channel, account, last);
    return { messages: list.map(r => this.view(r, account)), hidden, last: Math.max(last, 0), muted: this.mutedUntil(account) };
  }

  private markRead(channel: string, account: string, last: number): void {
    this.sql.exec('INSERT INTO reads (channel, account, last) VALUES (?, ?, ?) ON CONFLICT (channel, account) DO UPDATE SET last = MAX(last, excluded.last)', channel, account, last);
  }
  // Unread messages per private conversation: the other side's visible messages after this account's read marker.
  unread(account: string, channels: readonly string[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const c of channels) {
      if (!isDm(c) || channelKind(c) !== 'dm') continue;
      out[c] = this.rows<{ n: number }>(`SELECT COUNT(*) AS n FROM messages WHERE channel = ? AND account <> ? AND hidden IS NULL
        AND id > COALESCE((SELECT last FROM reads WHERE channel = ? AND account = ?), 0)`, c, account, c, account)[0]!.n;
    }
    return out;
  }

  post(account: string, handle: string, raw: string, channel: string = CHANNEL): PostResult {
    const now = this.now();
    if (!channelOpen(channel)) return { ok: false, error: 'channel_closed' };
    const pace = PACE[isDm(channel) ? 'dm' : 'world'];
    const until = this.mutedUntil(account);
    if (until) return { ok: false, error: 'muted', until };
    const f = filterChat(raw);
    if (!f.ok) return { ok: false, error: f.error };
    const mine = this.rows<{ at: number; text: string; channel: string }>(`SELECT at, text, channel FROM messages WHERE account = ? AND at > ? AND ${pace.where} ORDER BY at DESC`, account, now - 3_600_000);
    const lastAt = mine[0]?.at;
    if (lastAt !== undefined && now - lastAt < pace.gapMs) return { ok: false, error: 'too_fast', retryAfter: Math.ceil((pace.gapMs - (now - lastAt)) / 1000) };
    if (mine.filter(m => now - m.at < 60_000).length >= pace.perMinute) return { ok: false, error: 'too_fast', retryAfter: 60 };
    if (mine.length >= pace.perHour) return { ok: false, error: 'too_fast', retryAfter: 600 };
    const prev = mine.find(m => m.channel === channel);
    if (prev && now - prev.at < CHAT_LIMITS.duplicateMs && prev.text === f.text) return { ok: false, error: 'duplicate' };
    const id = this.state.storage.transactionSync(() => {
      const r = this.rows<{ id: number }>('INSERT INTO messages (channel, account, handle, text, at) VALUES (?, ?, ?, ?, ?) RETURNING id', channel, account, handle, f.text, now)[0]!.id;
      if (isDm(channel)) this.markRead(channel, account, r);
      this.retain(now, channel, r % 50 === 0);
      return r;
    });
    return { ok: true, message: { id, handle, text: f.text, at: now, mine: true }, masked: f.masked };
  }

  // §5 retention: 7 days, reported messages up to 30 days (every channel); the world keeps its newest 500, each private
  // conversation its newest 200 (counted inside the channel just written). Dangling reports, contexts and read markers
  // and ended mutes go too.
  private retain(now: number, channel: string = CHANNEL, sweep = false): void {
    const keepMs = Math.max(CHAT_LIMITS.keepMs, DM_LIMITS.keepMs);
    this.sql.exec('DELETE FROM messages WHERE (at < ? AND reports = 0) OR at < ?', now - keepMs, now - CHAT_LIMITS.keepReportedMs);
    const keep = isDm(channel) ? DM_LIMITS.keepMessages : CHAT_LIMITS.keepMessages;
    this.sql.exec(`DELETE FROM messages WHERE channel = ? AND reports = 0 AND id IN (SELECT id FROM messages WHERE channel = ? ORDER BY id DESC LIMIT -1 OFFSET ?)`, channel, channel, keep);
    this.sql.exec('DELETE FROM reports WHERE message NOT IN (SELECT id FROM messages)');
    this.sql.exec('DELETE FROM report_context WHERE message NOT IN (SELECT id FROM messages)');
    // Read markers of emptied conversations: swept now and then (every 50th message), not on every send.
    if (sweep) this.sql.exec("DELETE FROM reads WHERE channel NOT IN (SELECT DISTINCT channel FROM messages WHERE channel LIKE 'dm:%')");
    this.sql.exec('DELETE FROM mutes WHERE until <= ?', now);
  }

  // A report names the channel it was seen in; a message of another channel is `no_message` (a world report cannot reach
  // a private message). A private report keeps the few messages before it, so an admin sees the conversation's context.
  report(account: string, id: number, reason: ReportReason, channel: string = CHANNEL): ReportResult {
    const m = this.rows<Row>('SELECT id, account, handle, text, at, hidden, reports, channel FROM messages WHERE id = ?', id)[0];
    if (!m || m.channel !== channel) return 'no_message';
    if (m.account === account) return 'own';
    if (this.rows('SELECT 1 FROM reports WHERE message = ? AND reporter = ?', id, account).length) return 'already';
    this.state.storage.transactionSync(() => {
      this.sql.exec('INSERT INTO reports (message, reporter, reason, at) VALUES (?, ?, ?, ?)', id, account, reason, this.now());
      this.sql.exec("UPDATE messages SET reports = reports + 1, hidden = CASE WHEN hidden IS NULL AND reports + 1 >= ? THEN 'reports' ELSE hidden END WHERE id = ?", CHAT_LIMITS.hideAtReports, id);
      if (isDm(channel)) {
        const before = this.rows<ContextLine>('SELECT account, handle, text, at FROM messages WHERE channel = ? AND id < ? ORDER BY id DESC LIMIT ?', channel, id, DM_LIMITS.contextMessages).reverse();
        this.sql.exec('INSERT INTO report_context (message, channel, context) VALUES (?, ?, ?) ON CONFLICT (message) DO NOTHING', id, channel, JSON.stringify(before));
      }
    });
    return 'reported';
  }

  // ---- admin (the Worker checks D1 `admins` and audits) ----
  admin(): { rows: AdminRow[]; mutes: { account: string; until: number }[] } {
    // Private messages appear only once reported (never a whole conversation), with their stored context.
    const rows = this.rows<Row>("SELECT id, account, handle, text, at, hidden, reports, channel FROM messages WHERE reports > 0 OR (hidden IS NOT NULL AND channel = 'world') ORDER BY id DESC LIMIT 50");
    return {
      rows: rows.map(({ channel, ...r }) => {
        const dm = isDm(channel ?? '');
        const ctx = dm ? this.rows<{ context: string }>('SELECT context FROM report_context WHERE message = ?', r.id)[0] : undefined;
        return { ...r, channel: dm ? 'dm' as const : 'world' as const, reasons: this.rows<{ reason: string }>('SELECT reason FROM reports WHERE message = ? ORDER BY at', r.id).map(x => x.reason),
          ...(dm ? { context: ctx ? JSON.parse(ctx.context) as ContextLine[] : [] } : {}) };
      }),
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
  // Account deletion (P09-02g purge): everything the account wrote or reported, and its mute; since OD-56 also every
  // private conversation it was part of (both sides' messages), its read markers and any report context naming it.
  purge(account: string): number {
    return this.state.storage.transactionSync(() => {
      const n = this.rows<{ n: number }>('SELECT COUNT(*) AS n FROM messages WHERE account = ?', account)[0]!.n;
      const mineDm = `channel LIKE 'dm:%' AND (channel LIKE 'dm:' || ? || ':%' OR channel LIKE 'dm:%:' || ?)`;
      this.sql.exec(`DELETE FROM reports WHERE message IN (SELECT id FROM messages WHERE ${mineDm})`, account, account);
      this.sql.exec(`DELETE FROM messages WHERE ${mineDm}`, account, account);
      this.sql.exec(`DELETE FROM reads WHERE account = ? OR ${mineDm}`, account, account, account);
      this.sql.exec(`DELETE FROM report_context WHERE ${mineDm} OR instr(context, ?) > 0 OR message NOT IN (SELECT id FROM messages)`, account, account, account);
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
// `GET /admin`, `POST /hide { id, hidden }`, `POST /mute { account, minutes, by }`, `POST /purge { account }`; OD-56:
// `channel` on read/post/report (a stored id the Worker derived), `POST /unread { account, channels }`.
export async function handleChatRequest(host: ChatHost, request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    if (url.pathname === '/read') {
      const account = url.searchParams.get('account') ?? ''; const after = int(Number(url.searchParams.get('after') ?? '0'), 0, Number.MAX_SAFE_INTEGER);
      if (!ACCOUNT.test(account) || after === null) return reply({ error: 'invalid_request' }, 400);
      const channel = url.searchParams.get('channel') ?? CHANNEL;
      return reply(host.read(account, after, channel));
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
      const out = host.post(account, await chatHandle(account), b.text, typeof b.channel === 'string' ? b.channel : CHANNEL);
      return out.ok ? reply(out, 201) : reply(out, out.error === 'too_fast' ? 429 : out.error === 'muted' || out.error === 'channel_closed' ? 403 : 422);
    }
    case '/report': {
      const id = int(b.id, 1, Number.MAX_SAFE_INTEGER); const reason = REPORT_REASONS.find(r => r === b.reason);
      if (!account || id === null || !reason) return reply({ error: 'invalid_request' }, 400);
      const out = host.report(account, id, reason, typeof b.channel === 'string' ? b.channel : CHANNEL);
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
    case '/unread': {
      if (!account || !Array.isArray(b.channels) || b.channels.length > 200 || !b.channels.every(c => typeof c === 'string')) return reply({ error: 'invalid_request' }, 400);
      return reply({ unread: host.unread(account, b.channels as string[]) });
    }
    case '/purge': {
      if (!account) return reply({ error: 'invalid_request' }, 400);
      return reply({ purged: host.purge(account) });
    }
  }
  return reply({ error: 'not_found' }, 404);
}
