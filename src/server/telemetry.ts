import type { ClientEvent } from '../core/command/client-view';
import type { Game } from '../core/save/expedition-save';
import type { D1Like } from './accounts';

// P09-03 minimal telemetry (docs/design/p09/TELEMETRY_P09_03_TH.md). Daily totals only: the server derives game events
// from commands it already runs (nothing the device says about the game is counted), and the device reports only fixed
// error codes. No account id, device, IP or free text is stored.

export interface TelemetryItem { kind: TelemetryKind; key: string }
export type TelemetryKind = 'session' | 'commander' | 'run_start' | 'run_end' | 'battle' | 'client_error' | 'feedback';

const SAFE_KEY = /^[a-z0-9_:-]{1,64}$/i;
const safe = (s: string) => SAFE_KEY.test(s) ? s : 'other';

// What one committed command did, by comparing the game before and after (and the command's events).
export function telemetryOf(before: Game | null, after: Game | null, events: readonly ClientEvent[]): TelemetryItem[] {
  const out: TelemetryItem[] = [];
  if (!before?.profile.commander && after?.profile.commander) out.push({ kind: 'commander', key: 'created' });
  for (const e of events) if (e.type === 'departed') out.push({ kind: 'run_start', key: safe(`${e.mapId}${e.hard ? ':hard' : ''}`) });
  const settled = events.find(e => e.type === 'settled');
  const prevRun = before?.run ?? null, nextRun = after?.run ?? null;
  if (prevRun?.battle && (!nextRun || !nextRun.battle || nextRun.battle.encounterId !== prevRun.battle.encounterId || nextRun.battle.commands.length < prevRun.battle.commands.length)) {
    let result: 'won' | 'lost' | 'left';
    if (nextRun) result = nextRun.wins > prevRun.wins ? 'won' : nextRun.defeats > prevRun.defeats ? 'lost' : 'left';
    else result = settled?.type === 'settled' ? (settled.outcome === 'complete' ? 'won' : settled.outcome === 'wiped' ? 'lost' : 'left') : 'left';
    out.push({ kind: 'battle', key: safe(`${prevRun.battle.encounterId}:${result}`) });
  }
  if (settled?.type === 'settled') out.push({ kind: 'run_end', key: safe(`${settled.run.mapId}${settled.run.hard ? ':hard' : ''}:${settled.outcome}`) });
  return out;
}

// The Asia/Bangkok calendar day (the owner's day), as YYYY-MM-DD.
export const telemetryDay = (now: number): string => new Date(now + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function recordTelemetry(db: D1Like, items: readonly TelemetryItem[], now: number): Promise<void> {
  if (items.length === 0) return;
  const day = telemetryDay(now);
  const counts = new Map<string, { kind: string; key: string; n: number }>();
  for (const i of items) {
    const id = `${i.kind}\u0000${i.key}`;
    const c = counts.get(id) ?? { kind: i.kind, key: safe(i.key), n: 0 };
    c.n++; counts.set(id, c);
  }
  await db.batch([...counts.values()].map(c => db.prepare(
    'INSERT INTO telemetry_daily (day, kind, key, count) VALUES (?, ?, ?, ?) ON CONFLICT(day, kind, key) DO UPDATE SET count = count + excluded.count',
  ).bind(day, c.kind, c.key, c.n)));
}

export interface TelemetryRow { day: string; kind: string; key: string; count: number }
export async function readTelemetry(db: D1Like, now: number, days: number): Promise<TelemetryRow[]> {
  const from = telemetryDay(now - (days - 1) * 24 * 60 * 60 * 1000);
  return (await db.prepare('SELECT day, kind, key, count FROM telemetry_daily WHERE day >= ? ORDER BY day DESC, kind, key LIMIT 2000').bind(from).all<TelemetryRow>()).results;
}

// ---- device error reports ----

export const CLIENT_ERROR_CODES = ['js_error', 'promise_error', 'network', 'server', 'content_version', 'other_device', 'deleting', 'unauthorized'] as const;
export const CLIENT_PLACES = ['title', 'commander', 'lobby', 'world', 'battle', 'account', 'unknown'] as const;
export const MAX_CLIENT_EVENTS = 10;
// `{ events: [{ code, place }] }`; anything outside the vocabulary is refused as a whole.
export function clientErrors(body: unknown): TelemetryItem[] | null {
  const events = typeof body === 'object' && body !== null ? (body as { events?: unknown }).events : undefined;
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_CLIENT_EVENTS) return null;
  const out: TelemetryItem[] = [];
  for (const e of events) {
    const { code, place } = (typeof e === 'object' && e !== null ? e : {}) as { code?: unknown; place?: unknown };
    if (!(CLIENT_ERROR_CODES as readonly unknown[]).includes(code) || !(CLIENT_PLACES as readonly unknown[]).includes(place)) return null;
    out.push({ kind: 'client_error', key: `${code as string}:${place as string}` });
  }
  return out;
}

// ---- feedback ----

export const FEEDBACK_CATEGORIES = ['bug', 'balance', 'idea', 'other'] as const;
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number];
export const FEEDBACK_MAX_CHARS = 1000;
export interface FeedbackInput { category: FeedbackCategory; text: string; place: string }

export function feedbackInput(body: Record<string, unknown>): FeedbackInput | null {
  const { category, text, place } = body;
  if (!(FEEDBACK_CATEGORIES as readonly unknown[]).includes(category)) return null;
  if (typeof text !== 'string') return null;
  // Control characters out (keep newlines and tabs), trimmed, by code points.
  // eslint-disable-next-line no-control-regex
  const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (clean.length === 0 || [...clean].length > FEEDBACK_MAX_CHARS) return null;
  const where = (CLIENT_PLACES as readonly unknown[]).includes(place) ? place as string : 'unknown';
  return { category: category as FeedbackCategory, text: clean, place: where };
}

export async function saveFeedback(db: D1Like, accountId: string, input: FeedbackInput, contentVersion: string, now: number): Promise<number> {
  const row = await db.prepare('INSERT INTO feedback (account_id, category, text, place, content_version, at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(accountId, input.category, input.text, input.place, contentVersion, now).first<{ id: number }>();
  return row?.id ?? 0;
}

export interface FeedbackRow { id: number; accountId: string; category: string; text: string; place: string; contentVersion: string; at: number }
export async function readFeedback(db: D1Like, before: number | null, limit: number): Promise<FeedbackRow[]> {
  const rows = (await db.prepare(`SELECT id, account_id, category, text, place, content_version, at FROM feedback ${before ? 'WHERE id < ?' : ''} ORDER BY id DESC LIMIT ?`)
    .bind(...(before ? [before, limit] : [limit])).all<{ id: number; account_id: string; category: string; text: string; place: string; content_version: string; at: number }>()).results;
  return rows.map(r => ({ id: r.id, accountId: r.account_id, category: r.category, text: r.text, place: r.place, contentVersion: r.content_version, at: r.at }));
}
