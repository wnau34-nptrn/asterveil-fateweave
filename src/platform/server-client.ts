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
export type ServerFailure = 'content_version' | 'unauthorized' | 'network' | 'server';
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
export interface AccountInfo { accountId: string; status: 'guest' | 'linked' | 'deleting' | 'suspended'; google: boolean; recoveryCodeAt: number | null }
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

  private token(): string | null { try { return this.storage?.getItem(TOKEN_KEY + this.base) ?? null; } catch { return null; } }
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
    try { this.storage?.setItem(TOKEN_KEY + this.base, token); } catch { /* token kept for this page only */ }
    this.memoryToken = token;
    return token;
  }
  private memoryToken: string | null = null;

  private static failure(r: Response | null): ServerFailure {
    if (!r) return 'network';
    if (r.status === 401) return 'unauthorized';
    if (r.status === 409) return 'content_version';
    return 'server';
  }

  // Entering the game on this page: make a guest account the first time, then take the account over (D12) and read it.
  async enter(): Promise<EnterOutcome> {
    let token = this.memoryToken ?? this.token();
    for (let tries = 0; tries < 2; tries++) {
      if (!token) { const made = await this.newGuest(); if (made === 'network' || made === 'server') return { kind: 'failed', reason: made }; token = made; }
      const r = await this.request('/v1/session', { method: 'POST', headers: this.headers(token, false) });
      // A development token the server no longer knows (its database was reset): start a new guest account once.
      if (r?.status === 401 && tries === 0) { try { this.storage?.removeItem?.(TOKEN_KEY + this.base); } catch { /* ignore */ } this.memoryToken = null; token = null; continue; }
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
  // A new recovery code (replaces the old one); shown once.
  async recoveryCode(): Promise<AccountOutcome<string>> {
    const headers = this.bearer(false);
    if (!headers) return { kind: 'failed', reason: 'unauthorized' };
    return this.accountCall('/v1/recovery-code', { method: 'POST', headers }, 201, b => (b as { code: string }).code);
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
    if (out.kind === 'ok') {
      try { this.storage?.setItem(TOKEN_KEY + this.base, token); } catch { /* kept for this page only */ }
      this.memoryToken = token; this.pending = undefined; this.lastSeq = 0;
    }
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
