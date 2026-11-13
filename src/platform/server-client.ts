import type { ClientGame } from '../core/command/client-view';
import type { CommandReply, CommandRequest } from '../core/command/command-envelope';
import type { GameCommand } from '../core/command/game-command';
import type { StoragePort } from '../core/save/expedition-save';

// P09-02c: the game's connection to the development API (docs/design/p09/SERVER_P09_02B_TH.md §3). It keeps the guest
// token, this page's session id (D12: one session plays an account at a time) and the account's last sequence number,
// and sends one command at a time as `{ requestId, seq, command }`. A request that got no answer is sent again with the
// same requestId and seq, so the server either runs it once or hands back the answer it already stored. The server
// decides every outcome (owner D10 = ค); the device only ever receives seed-free views. Off unless switched on
// (`serverSwitch`); local play is the default.

export const CONTENT_HEADER = 'X-Fateweave-Content';
export const SESSION_HEADER = 'X-Fateweave-Session';
export interface ServerState { lastSeq: number; view: ClientGame | null }
// `deleting` (P09-02g): the account waits for deletion; the game refuses until the player cancels in the account panel.
export type ServerFailure = 'content_version' | 'unauthorized' | 'network' | 'server' | 'deleting';
export type ServerOutcome =
  // The command used its sequence number: applied (new view + events) or refused by the rules (nothing changed).
  | { kind: 'reply'; reply: CommandReply }
  // The command did not run because this device was behind (409 stale/gap): here is the server's current state.
  | { kind: 'resynced'; state: ServerState }
  // Another session entered the account (423): nothing runs here until this one enters again.
  | { kind: 'otherDevice' }
  // No definitive answer; `retry()` sends the same request again.
  | { kind: 'failed'; reason: ServerFailure };
// P09-02d account (owner D1): Google link/sign-in and one-time recovery codes.
export interface AccountInfo { accountId: string; status: 'guest' | 'linked' | 'deleting' | 'suspended'; google: boolean; recoveryCodeAt: number | null; deleteAfter?: number | null; admin?: boolean }
// `refused`: the server answered with a definite no (`identity_in_use`, `already_linked`, `not_linked`, `invalid_code`,
// `google_token`, `google_unset`, `rate_limited`, …); `failed`: no definite answer.
export type AccountOutcome<T> = { kind: 'ok'; value: T } | { kind: 'refused'; error: string } | { kind: 'failed'; reason: ServerFailure };
// P09-02e (owner D11): importing this device's local save once. `refused` carries the server's reason (`has_game`,
// `already_imported`, `fingerprint_used`, `replay_failed`, `import_closed`, `too_large`, an envelope issue, …).
export type ImportOutcome = { kind: 'imported'; state: ServerState; from: number } | { kind: 'refused'; error: string } | { kind: 'otherDevice' } | { kind: 'failed'; reason: ServerFailure };
export type EnterOutcome = { kind: 'state'; state: ServerState } | { kind: 'otherDevice' } | { kind: 'failed'; reason: ServerFailure };

export interface ServerPort {
  fetch(url: string, init: RequestInit): Promise<Response>;
  sleep(ms: number): Promise<void>;
  randomHex(bytes: number): string;
  now?(): number;
}
export const browserServerPort = (): ServerPort => ({
  fetch: (url, init) => fetch(url, init),
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  randomHex: bytes => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), b => b.toString(16).padStart(2, '0')).join(''),
});

// Attempts for one request before reporting `network`/`server` (backoff 0.4 s, 0.8 s, 1.6 s, 3.2 s).
export const SEND_ATTEMPTS = 5;
const TIMEOUT_MS = 15_000;
const TOKEN_KEY = 'fateweave-server-token:';
// P09-03 rotation: the next credential is stored before it is sent (so a lost answer never strands the device), and the
// time of the last rotation decides when the next one is due.
const NEXT_KEY = 'fateweave-server-token-next:';
const AT_KEY = 'fateweave-server-token-at:';
export const ROTATE_EVERY_MS = 24 * 60 * 60 * 1000;
// P09-03 device error reports (fixed vocabulary, see src/server/telemetry.ts); each code/place once per page load.
export type ReportCode = 'js_error' | 'promise_error' | 'network' | 'server' | 'content_version' | 'other_device' | 'deleting' | 'unauthorized';
export type ReportPlace = 'title' | 'commander' | 'lobby' | 'world' | 'battle' | 'account' | 'unknown';
export type FeedbackCategory = 'bug' | 'balance' | 'idea' | 'other';
export interface FeedbackRow { id: number; accountId: string; category: string; text: string; place: string; contentVersion: string; at: number }
export interface TelemetryRow { day: string; kind: string; key: string; count: number }
const SERVER_KEY = 'fateweave-server';

// The switch: `?server=<https url>` turns server play on and remembers the address; `?server=off` turns it off again
// (remembered too, also over a build preset).
// A build may preset an address with VITE_FATEWEAVE_API. Only https (or http on localhost) is accepted.
export function serverSwitch(search: string, storage: StoragePort | undefined, preset = ''): string | undefined {
  const asked = new URLSearchParams(search).get('server');
  if (asked === 'off' || asked === 'local') { try { storage?.setItem(SERVER_KEY, 'off'); } catch { /* not remembered */ } return undefined; }
  const valid = (raw: string | null | undefined) => {
    if (!raw) return undefined;
    try {
      const url = new URL(raw);
      const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      return url.protocol === 'https:' || (local && url.protocol === 'http:') ? url.origin : undefined;
    } catch { return undefined; }
  };
  const chosen = valid(asked);
  if (chosen) { try { storage?.setItem(SERVER_KEY, chosen); } catch { /* not remembered */ } return chosen; }
  let saved: string | null = null;
  try { saved = storage?.getItem(SERVER_KEY) ?? null; } catch { /* unreadable */ }
  return saved === 'off' ? undefined : valid(saved) ?? valid(preset);
}

export class ServerClient {
  private lastSeq = 0;
  // A request sent but not yet answered for sure; `retry()` sends it again unchanged.
  private pending: CommandRequest | undefined;
  readonly session: string;
  constructor(readonly base: string, private readonly contentVersion: string, private readonly storage: StoragePort | undefined,
    private readonly port: ServerPort = browserServerPort()) {
    this.session = port.randomHex(16);
  }
  get waitingRetry(): boolean { return this.pending !== undefined; }

  private token(): string | null { return this.read(TOKEN_KEY); }
  private read(key: string): string | null { try { return this.storage?.getItem(key + this.base) ?? null; } catch { return null; } }
  private write(key: string, value: string): boolean { try { if (!this.storage) return false; this.storage.setItem(key + this.base, value); return true; } catch { return false; } }
  private drop(key: string): void { try { this.storage?.removeItem?.(key + this.base); } catch { /* ignore */ } }
  private now(): number { return this.port.now?.() ?? Date.now(); }
  // This device's credential from now on (after a new guest, a sign-in, a recovery or a rotation).
  private keep(token: string): void {
    this.write(TOKEN_KEY, token); this.write(AT_KEY, String(this.now())); this.drop(NEXT_KEY);
    this.memoryToken = token;
  }
  private forget(): void { this.drop(TOKEN_KEY); this.drop(NEXT_KEY); this.drop(AT_KEY); this.memoryToken = null; }

  // P09-03: replaces the credential's secret about once a day. The server keeps the old one working for a few minutes,
  // so a lost answer is simply sent again with the stored next credential. Without storage nothing rotates (the
  // credential ends with the page anyway). Failures leave the current credential in use.
  private async freshen(token: string): Promise<string> {
    if (!this.storage) return token;
    const device = token.split('.')[0]!;
    let next = this.read(NEXT_KEY);
    if (!next && this.now() - Number(this.read(AT_KEY) ?? '0') < ROTATE_EVERY_MS) return token;
    if (!next || next.split('.')[0] !== device) {
      next = `${device}.${this.port.randomHex(32)}`;
      if (!this.write(NEXT_KEY, next)) return token;
    }
    const r = await this.request('/v1/token/rotate', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ token: next }) });
    if (r?.status === 200) { this.keep(next); return next; }
    if (r?.status === 400 || r?.status === 409) this.drop(NEXT_KEY);
    return token;
  }
  private headers(token: string, json: boolean): Record<string, string> {
    return { Authorization: `Bearer ${token}`, [CONTENT_HEADER]: this.contentVersion, [SESSION_HEADER]: this.session, ...(json ? { 'Content-Type': 'application/json' } : {}) };
  }

  // One request with retries on no answer, 5xx and 429. Returns the final response, or null when none came.
  private async request(path: string, init: RequestInit): Promise<Response | null> {
    let last: Response | null = null;
    for (let attempt = 0; attempt < SEND_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const after = Number(last?.headers.get('Retry-After') ?? '');
        await this.port.sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 5) * 1000 : 400 * 2 ** (attempt - 1));
      }
      try {
        last = await this.port.fetch(this.base + path, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (last.status < 500 && last.status !== 429) return last;
      } catch { last = null; }
    }
    return last;
  }

  private async newGuest(): Promise<string | ServerFailure> {
    const r = await this.request('/v1/guest', { method: 'POST' });
    if (!r) return 'network';
    if (r.status !== 201) return 'server';
    const { token } = await r.json() as { token: string };
    this.keep(token);
    return token;
  }
  private memoryToken: string | null = null;

  private static failure(r: Response | null): ServerFailure {
    if (!r) return 'network';
    if (r.status === 401) return 'unauthorized';
    if (r.status === 409) return 'content_version';
    // Game routes answer 403 only for an account that waits for deletion (`account_deleting`).
    if (r.status === 403) return 'deleting';
    return 'server';
  }

  // Entering the game on this page: make a guest account the first time, then take the account over (D12) and read it.
  async enter(): Promise<EnterOutcome> {
    let token = this.memoryToken ?? this.token();
    let madeGuest = false, triedNext = false;
    for (let tries = 0; tries < 3; tries++) {
      if (!token) { const made = await this.newGuest(); if (made === 'network' || made === 'server') return { kind: 'failed', reason: made }; token = made; madeGuest = true; }
      else token = await this.freshen(token);
      const r = await this.request('/v1/session', { method: 'POST', headers: this.headers(token, false) });
      if (r?.status === 401) {
        // P09-03: a rotation went through but its answer was lost (and the old secret has expired): the stored next
        // credential is the current one.
        const next = this.read(NEXT_KEY);
        if (next && next !== token && !triedNext) { triedNext = true; this.keep(next); token = next; continue; }
        // A development token the server no longer knows (its database was reset): start a new guest account once.
        if (!madeGuest) { this.forget(); token = null; continue; }
      }
      if (r?.status === 423) return { kind: 'otherDevice' };
      if (!r || r.status !== 200) return { kind: 'failed', reason: ServerClient.failure(r) };
      const state = await r.json() as ServerState;
      this.lastSeq = state.lastSeq; this.pending = undefined;
      return { kind: 'state', state };
    }
    return { kind: 'failed', reason: 'unauthorized' };
  }

  // The server's current state for this session (after a 409, or to check on a lost answer).
  async state(): Promise<EnterOutcome> {
    const token = this.memoryToken ?? this.token();
    if (!token) return { kind: 'failed', reason: 'unauthorized' };
    const r = await this.request('/v1/state', { method: 'GET', headers: this.headers(token, false) });
    if (r?.status === 423) return { kind: 'otherDevice' };
    if (!r || r.status !== 200) return { kind: 'failed', reason: ServerClient.failure(r) };
    const state = await r.json() as ServerState;
    this.lastSeq = state.lastSeq;
    return { kind: 'state', state };
  }

  // ---- P09-02d account ----
  private async accountCall<T>(path: string, init: RequestInit, ok: number, read: (body: unknown) => T): Promise<AccountOutcome<T>> {
    const r = await this.request(path, init);
    if (!r) return { kind: 'failed', reason: 'network' };
    const body: unknown = await r.json().catch(() => ({}));
    if (r.status === ok) return { kind: 'ok', value: read(body) };
    if (r.status === 401 && !(body as { error?: string }).error?.startsWith('google')) return { kind: 'failed', reason: 'unauthorized' };
    if (r.status >= 500 && (body as { error?: string }).error !== 'google_unset') return { kind: 'failed', reason: 'server' };
    return { kind: 'refused', error: (body as { error?: string }).error ?? `http_${r.status}` };
  }
  private bearer(json: boolean): Record<string, string> | null {
    const token = this.memoryToken ?? this.token();
    return token ? { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) } : null;
  }
  async account(): Promise<AccountOutcome<AccountInfo>> {
    const headers = this.bearer(false);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall('/v1/account', { method: 'GET', headers }, 200, b => b as AccountInfo);
  }
  // Links Google to the account this device plays. `identity_in_use`: that Google account already has another game
  // account (never merged; `signIn` switches this device to it).
  async link(idToken: string): Promise<AccountOutcome<AccountInfo>> {
    const headers = this.bearer(true);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall('/v1/link', { method: 'POST', headers, body: JSON.stringify({ idToken }) }, 200, b => b as AccountInfo);
  }
  // P09-02g: asks the server to delete this account after the grace period (the panel asks the player to confirm first);
  // answers the account with `status: 'deleting'` and `deleteAfter`. Cancel brings it back (`not_deleting`, `too_late`).
  async deleteAccount(): Promise<AccountOutcome<AccountInfo>> {
    const headers = this.bearer(true);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall('/v1/account/delete', { method: 'POST', headers, body: JSON.stringify({ confirm: 'delete' }) }, 200, b => b as AccountInfo);
  }
  async cancelDeletion(): Promise<AccountOutcome<AccountInfo>> {
    const headers = this.bearer(false);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall('/v1/account/cancel', { method: 'POST', headers }, 200, b => b as AccountInfo);
  }
  // ---- P09-03 reports, feedback and the admin views ----
  private reported = new Set<string>();
  // Fire and forget: one request, no retries, and each code/place at most once per page load.
  report(code: ReportCode, place: ReportPlace): void {
    const token = this.memoryToken ?? this.token();
    const id = `${code}:${place}`;
    if (!token || this.reported.has(id) || this.reported.size >= 20) return;
    this.reported.add(id);
    void this.port.fetch(this.base + '/v1/telemetry', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ code, place }] }), keepalive: true, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => undefined);
  }
  async feedback(category: FeedbackCategory, text: string, place: ReportPlace): Promise<AccountOutcome<number>> {
    const headers = this.bearer(true);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall('/v1/feedback', { method: 'POST', headers, body: JSON.stringify({ category, text, place }) }, 201, b => (b as { id: number }).id);
  }
  async adminFeedback(before?: number): Promise<AccountOutcome<FeedbackRow[]>> {
    const headers = this.bearer(false);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall(`/v1/admin/feedback?limit=30${before ? `&before=${before}` : ''}`, { method: 'GET', headers }, 200, b => (b as { rows: FeedbackRow[] }).rows);
  }
  async adminTelemetry(days = 14): Promise<AccountOutcome<TelemetryRow[]>> {
    const headers = this.bearer(false);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall(`/v1/admin/telemetry?days=${days}`, { method: 'GET', headers }, 200, b => (b as { rows: TelemetryRow[] }).rows);
  }
  // A new recovery code (replaces the old one); shown once.
  async recoveryCode(): Promise<AccountOutcome<string>> {
    const headers = this.bearer(false);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall('/v1/recovery-code', { method: 'POST', headers }, 201, b => (b as { code: string }).code);
  }
  // P09-02f sign-out. `this`: the server revokes this device's credential and the device forgets it (the next `enter()`
  // starts a new guest account); `unrecoverable` is refused unless `confirm` (nothing else could reach the account).
  // `others`: every other device of the account is signed out; this one keeps playing.
  async signOut(scope: 'this' | 'others', confirm = false): Promise<AccountOutcome<number>> {
    const headers = this.bearer(true);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    const out = await this.accountCall('/v1/sessions/revoke', { method: 'POST', headers, body: JSON.stringify(confirm ? { scope, confirm } : { scope }) }, 200,
      b => (b as { revoked: number }).revoked);
    if (out.kind === 'ok' && scope === 'this') { this.forget(); this.pending = undefined; this.lastSeq = 0; }
    return out;
  }
  // Sign-in with Google or a recovery code: this device makes its new credential itself and sends it along, so a
  // retried request whose answer was lost still works (the code is used once). On success the device plays that
  // account from now on; `enter()` takes it over (D12) and reads it.
  async signIn(idToken: string): Promise<AccountOutcome<string>> { return this.switchAccount('/v1/signin', { idToken }); }
  async recover(code: string): Promise<AccountOutcome<string>> { return this.switchAccount('/v1/recover', { code }); }
  private async switchAccount(path: string, body: Record<string, string>): Promise<AccountOutcome<string>> {
    const token = `${this.port.randomHex(16)}.${this.port.randomHex(32)}`;
    const out = await this.accountCall(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, token }) }, 200,
      b => (b as { accountId: string }).accountId);
    if (out.kind === 'ok') { this.keep(token); this.pending = undefined; this.lastSeq = 0; }
    return out;
  }

  // ---- P09-02e: one-time import of the local save (owner D11) ----
  // Sends the exact local save string. The requestId comes from the save's SHA-256, so asking again after a lost
  // answer is the same request and the server answers it as before. On success the server's game is this save.
  async importSave(raw: string): Promise<ImportOutcome> {
    const token = this.memoryToken ?? this.token();
    if (!token) return { kind: 'failed', reason: 'unauthorized' };
    let saveVersion: unknown;
    try { saveVersion = (JSON.parse(raw) as { version?: unknown }).version; } catch { return { kind: 'refused', error: 'payloadJson' }; }
    const bytes = new TextEncoder().encode(raw);
    const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    const upload = { format: 1, requestId: `imp_${sha.slice(0, 40)}`, baseRevision: 0, saveVersion, payload: raw, payloadBytes: bytes.byteLength, payloadSha256: sha };
    const r = await this.request('/v1/import', { method: 'POST', headers: this.headers(token, true), body: JSON.stringify(upload) });
    if (!r) return { kind: 'failed', reason: 'network' };
    if (r.status === 423) return { kind: 'otherDevice' };
    const body: unknown = await r.json().catch(() => ({}));
    if (r.status === 201) {
      const { lastSeq, view, from } = body as ServerState & { from: number };
      this.lastSeq = lastSeq; this.pending = undefined;
      return { kind: 'imported', state: { lastSeq, view }, from };
    }
    const code = (body as { error?: string }).error;
    if (r.status === 401) return { kind: 'failed', reason: 'unauthorized' };
    if (r.status === 409 && code === 'content_version') return { kind: 'failed', reason: 'content_version' };
    if (r.status >= 500 || r.status === 429) return { kind: 'failed', reason: 'server' };
    return { kind: 'refused', error: code ?? `http_${r.status}` };
  }

  async send(command: GameCommand): Promise<ServerOutcome> {
    if (this.pending) return { kind: 'failed', reason: 'network' };
    this.pending = { requestId: `c${this.port.randomHex(16)}`, seq: this.lastSeq + 1, command };
    return this.retry();
  }

  // Sends the unanswered request again: same requestId, same seq, same command.
  async retry(): Promise<ServerOutcome> {
    const req = this.pending; const token = this.memoryToken ?? this.token();
    if (!req) return { kind: 'failed', reason: 'server' };
    if (!token) { this.pending = undefined; return { kind: 'failed', reason: 'unauthorized' }; }
    const r = await this.request('/v1/command', { method: 'POST', headers: this.headers(token, true), body: JSON.stringify(req) });
    if (!r) return { kind: 'failed', reason: 'network' };
    // Still no definitive answer (server error or rate limit after every attempt): keep the request for `retry()`.
    if (r.status >= 500 || r.status === 429) return { kind: 'failed', reason: 'server' };
    if (r.status === 200) {
      const reply = await r.json() as CommandReply;
      this.lastSeq = reply.seq; this.pending = undefined;
      return { kind: 'reply', reply };
    }
    if (r.status === 423) { this.pending = undefined; return { kind: 'otherDevice' }; }
    const body = await r.json().catch(() => ({})) as { error?: string };
    if (r.status === 409 && (body.error === 'stale' || body.error === 'gap' || body.error === 'request_reused')) {
      // Nothing ran for this request: drop it and catch up with the server.
      this.pending = undefined;
      const now = await this.state();
      return now.kind === 'state' ? { kind: 'resynced', state: now.state } : now;
    }
    // A definitive refusal from the front door (content version, auth, size, shape): the request is not kept.
    this.pending = undefined;
    return { kind: 'failed', reason: ServerClient.failure(r) };
  }
}
