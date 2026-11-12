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
    let token = this.token() ?? this.memoryToken;
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
    const token = this.token() ?? this.memoryToken;
    if (!token) return { kind: 'failed', reason: 'unauthorized' };
    const r = await this.request('/v1/state', { method: 'GET', headers: this.headers(token, false) });
    if (r?.status === 423) return { kind: 'otherDevice' };
    if (!r || r.status !== 200) return { kind: 'failed', reason: ServerClient.failure(r) };
    const state = await r.json() as ServerState;
    this.lastSeq = state.lastSeq;
    return { kind: 'state', state };
  }

  async send(command: GameCommand): Promise<ServerOutcome> {
    if (this.pending) return { kind: 'failed', reason: 'network' };
    this.pending = { requestId: `c${this.port.randomHex(16)}`, seq: this.lastSeq + 1, command };
    return this.retry();
  }

  // Sends the unanswered request again: same requestId, same seq, same command.
  async retry(): Promise<ServerOutcome> {
    const req = this.pending; const token = this.token() ?? this.memoryToken;
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
