import { checkUpload, MAX_PAYLOAD_BYTES } from '../core/cloud/cloud-save';
import { SAVE_VERSION } from '../core/save/expedition-save';
import { accountInfo, authenticate, claimFingerprint, createGuest, issueRecoveryCode, linkGoogle, recoverWithCode, releaseFingerprint, sha256Hex, signInGoogle, type D1Like } from './accounts';
import type { GoogleVerifier } from './google';
import { SESSION_HEADER } from './account-object';
import { MAX_COMMAND_BYTES } from './game-host';

// P09-02b: the Worker's front door. Routing, request size/shape limits, content-version check, guest accounts, bearer
// auth and best-effort rate limits; the game itself runs in the account's Durable Object (`account-object.ts`).
// Platform-neutral (standard Request/Response), so tests call it with fakes. Endpoints: docs/design/p09/SERVER_P09_02B_TH.md.

export interface AccountGame { fetch(request: Request): Promise<Response> }
export interface ApiDeps {
  db: D1Like;
  game(accountId: string): AccountGame;
  contentVersion: string;
  allowedOrigins: readonly string[];
  now(): number;
  limiter: RateLimiter;
  // P09-02d: checks a Google ID token (iss/aud/exp/signature against Google's JWKS); absent when no client id is set.
  google?: GoogleVerifier;
  // P09-02e (owner D11): importing a local save is allowed only before the external test; `false` closes it (403).
  legacyImport?: boolean;
}

export const CONTENT_HEADER = 'X-Fateweave-Content';
const HEALTH = { status: 'ok', service: 'asterveil-api', environment: 'dev' } as const;

// Fixed one-second/one-minute windows kept in this isolate's memory. Best effort only: Cloudflare may run several
// isolates, so this stops a runaway client, not a determined attacker (see the design note).
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();
  constructor(private readonly max = 50_000) {}
  allow(key: string, limit: number, windowMs: number, now: number): boolean {
    const w = this.windows.get(key);
    if (!w || now - w.start >= windowMs) {
      if (this.windows.size >= this.max) this.windows.clear();
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    return ++w.count <= limit;
  }
}
export const LIMITS = { importPerMinute: 5, commandPerSecond: 10, guestPerMinute: 5, readPerSecond: 10, signInPerMinute: 10, recoverPerMinute: 5, accountPerMinute: 20 } as const;
const ACCOUNT_BODY_BYTES = 8 * 1024;
// The envelope carries the save as a JSON string, so escaping can make it up to about twice the save's size.
export const IMPORT_BODY_BYTES = 2 * MAX_PAYLOAD_BYTES + 1024;

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}
const error = (code: string, status: number, extra: Record<string, string> = {}) => json({ error: code }, status, extra);

function cors(request: Request, deps: ApiDeps): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin || !deps.allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin, Vary: 'Origin',
    'Access-Control-Allow-Headers': `Authorization, Content-Type, ${CONTENT_HEADER}, ${SESSION_HEADER}`,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '600',
  };
}
function withHeaders(response: Response, headers: Record<string, string>): Response {
  if (Object.keys(headers).length === 0) return response;
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  return out;
}

async function readLimited(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > max) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).byteLength > max ? null : text;
}

export async function handle(request: Request, deps: ApiDeps): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/health') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return error('method_not_allowed', 405, { Allow: 'GET, HEAD' });
    const response = json(HEALTH);
    return request.method === 'HEAD' ? new Response(null, { status: 200, headers: response.headers }) : response;
  }
  if (!path.startsWith('/v1/')) return error('not_found', 404);
  const corsHeaders = cors(request, deps);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  return withHeaders(await route(request, path, deps), corsHeaders);
}

const ROUTES: Record<string, 'GET' | 'POST'> = {
  '/v1/guest': 'POST', '/v1/session': 'POST', '/v1/state': 'GET', '/v1/command': 'POST', '/v1/verify': 'POST', '/v1/import': 'POST',
  '/v1/account': 'GET', '/v1/link': 'POST', '/v1/signin': 'POST', '/v1/recovery-code': 'POST', '/v1/recover': 'POST',
};
const ACCOUNT_ROUTES = new Set(['/v1/account', '/v1/link', '/v1/signin', '/v1/recovery-code', '/v1/recover']);
// A session is one page load of the game on one device: 32 random hex digits made by the device (D12).
const SESSION = /^[0-9a-f]{32}$/;

async function route(request: Request, path: string, deps: ApiDeps): Promise<Response> {
  const method = ROUTES[path];
  if (!method) return error('not_found', 404);
  if (request.method !== method) return error('method_not_allowed', 405, { Allow: method });
  const now = deps.now();
  if (path === '/v1/guest') {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!deps.limiter.allow(`guest:${ip}`, LIMITS.guestPerMinute, 60_000, now)) return error('rate_limited', 429, { 'Retry-After': '60' });
    return json(await createGuest(deps.db, now), 201);
  }
  if (ACCOUNT_ROUTES.has(path)) return accountRoute(request, path, deps, now);
  // Every game route: the device must run the same content as the server (a server deployed without one refuses all).
  if (!deps.contentVersion) return error('content_version_unset', 503);
  if (request.headers.get(CONTENT_HEADER) !== deps.contentVersion) return json({ error: 'content_version', server: deps.contentVersion }, 409);
  const accountId = await authenticate(deps.db, request.headers.get('Authorization'));
  if (!accountId) return error('unauthorized', 401, { 'WWW-Authenticate': 'Bearer' });
  if (path === '/v1/import') return importRoute(request, accountId, deps, now);
  const writes = path === '/v1/command';
  if (!deps.limiter.allow(`${writes ? 'cmd' : 'read'}:${accountId}`, writes ? LIMITS.commandPerSecond : LIMITS.readPerSecond, 1000, now)) {
    return error('rate_limited', 429, { 'Retry-After': '1' });
  }
  const game = deps.game(accountId);
  if (path === '/v1/verify') return game.fetch(new Request('https://game/verify', { method: 'POST' }));
  const session = request.headers.get(SESSION_HEADER) ?? '';
  if (!SESSION.test(session)) return error('session_required', 400);
  const sessionHeaders = { [SESSION_HEADER]: session };
  if (path === '/v1/session') return game.fetch(new Request('https://game/session', { method: 'POST', headers: sessionHeaders }));
  if (path === '/v1/state') return game.fetch(new Request('https://game/state', { headers: sessionHeaders }));
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return error('unsupported_media_type', 415);
  const body = await readLimited(request, MAX_COMMAND_BYTES);
  if (body === null) return error('too_large', 413);
  return game.fetch(new Request('https://game/command', { method: 'POST', body, headers: { 'Content-Type': 'application/json', ...sessionHeaders } }));
}

// P09-02e (owner D11): one-time import of the device's local save (v1–SAVE_VERSION) into this account. The Worker checks
// the envelope (`checkUpload`: shape, size, the save's SHA-256 and version) and holds the fingerprint in D1; the account's
// Durable Object replays the save with `parseGame` and makes it the account's game. Answers: 201 (also for a retry),
// 403 import_closed, 409 already_imported / fingerprint_used / has_game, 413, 422 <issue> / replay_failed.
async function importRoute(request: Request, accountId: string, deps: ApiDeps, now: number): Promise<Response> {
  if (deps.legacyImport === false) return error('import_closed', 403);
  if (!deps.limiter.allow(`import:${accountId}`, LIMITS.importPerMinute, 60_000, now)) return error('rate_limited', 429, { 'Retry-After': '60' });
  const session = request.headers.get(SESSION_HEADER) ?? '';
  if (!SESSION.test(session)) return error('session_required', 400);
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return error('unsupported_media_type', 415);
  const body = await readLimited(request, IMPORT_BODY_BYTES);
  if (body === null) return error('too_large', 413);
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return error('invalid_json', 400); }
  const payload = typeof parsed === 'object' && parsed !== null ? (parsed as { payload?: unknown }).payload : undefined;
  const digest = typeof payload === 'string' && payload.length <= MAX_PAYLOAD_BYTES ? await sha256Hex(payload) : '';
  const checked = checkUpload(parsed, digest, v => v >= 1 && v <= SAVE_VERSION);
  if (!checked.ok) return checked.issue === 'tooLarge' ? error('too_large', 413) : error(checked.issue, 422);
  const fingerprint = checked.upload.payloadSha256;
  const claim = await claimFingerprint(deps.db, accountId, fingerprint);
  if (claim !== 'claimed') return error(claim, 409);
  const answer = await deps.game(accountId).fetch(new Request('https://game/import', {
    method: 'POST', body: JSON.stringify(checked.upload), headers: { 'Content-Type': 'application/json', [SESSION_HEADER]: session },
  }));
  if (answer.status === 422 || answer.status === 409) {
    const code = (await answer.clone().json().catch(() => ({})) as { error?: string }).error;
    // Nothing was imported: the save stays free for another account. (`already_imported` means the object holds this
    // account's earlier import, which keeps its fingerprint.)
    if (code !== 'already_imported') await releaseFingerprint(deps.db, accountId, fingerprint);
  }
  return answer;
}

// P09-02d account routes (owner D1): no game content is involved, so no content-version or session header.
async function readJson(request: Request): Promise<Record<string, unknown> | Response> {
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return error('unsupported_media_type', 415);
  const body = await readLimited(request, ACCOUNT_BODY_BYTES);
  if (body === null) return error('too_large', 413);
  try {
    const v: unknown = JSON.parse(body);
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : error('invalid_request', 400);
  } catch { return error('invalid_json', 400); }
}
const str = (v: unknown) => (typeof v === 'string' ? v : '');

async function accountRoute(request: Request, path: string, deps: ApiDeps, now: number): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  // Without a bearer token: sign in with Google, or recover with a code. Both make a device credential.
  if (path === '/v1/signin' || path === '/v1/recover') {
    const [key, limit] = path === '/v1/signin' ? [`signin:${ip}`, LIMITS.signInPerMinute] : [`recover:${ip}`, LIMITS.recoverPerMinute];
    if (!deps.limiter.allow(key, limit, 60_000, now)) return error('rate_limited', 429, { 'Retry-After': '60' });
    const body = await readJson(request);
    if (body instanceof Response) return body;
    if (path === '/v1/recover') {
      const out = await recoverWithCode(deps.db, str(body.code), str(body.token), now);
      if (out === 'bad_token') return error('invalid_request', 400);
      if (out === 'invalid_code') return error('invalid_code', 404);
      return json({ accountId: out });
    }
    if (!deps.google) return error('google_unset', 503);
    const check = await deps.google(str(body.idToken), now);
    if (!check.ok) return json({ error: 'google_token', reason: check.reason }, check.reason === 'jwks' ? 503 : 401);
    const out = await signInGoogle(deps.db, check.sub, str(body.token), now);
    if (out === 'bad_token') return error('invalid_request', 400);
    if (out === 'not_linked') return error('not_linked', 404);
    return json({ accountId: out });
  }
  const accountId = await authenticate(deps.db, request.headers.get('Authorization'));
  if (!accountId) return error('unauthorized', 401, { 'WWW-Authenticate': 'Bearer' });
  if (!deps.limiter.allow(`account:${accountId}`, LIMITS.accountPerMinute, 60_000, now)) return error('rate_limited', 429, { 'Retry-After': '60' });
  if (path === '/v1/account') return json(await accountInfo(deps.db, accountId));
  if (path === '/v1/recovery-code') return json({ code: await issueRecoveryCode(deps.db, accountId, now) }, 201);
  // /v1/link
  if (!deps.google) return error('google_unset', 503);
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const check = await deps.google(str(body.idToken), now);
  if (!check.ok) return json({ error: 'google_token', reason: check.reason }, check.reason === 'jwks' ? 503 : 401);
  const out = await linkGoogle(deps.db, accountId, check.sub, now);
  if (out !== 'linked') return error(out, 409);
  return json(await accountInfo(deps.db, accountId));
}
