import { checkUpload, MAX_PAYLOAD_BYTES } from '../core/cloud/cloud-save';
import { SAVE_VERSION } from '../core/save/expedition-save';
import {
  accountExists, accountInfo, auditAdmin, authenticateAccount, claimFingerprint, createGuest, deviceOf, isAdmin, issueRecoveryCode, linkGoogle, recoverWithCode,
  releaseFingerprint, revokeDevices, rotateDevice, sha256Hex, signInGoogle, type D1Like,
} from './accounts';
import {
  clientErrors, feedbackInput, readFeedback, readTelemetry, recordTelemetry, saveFeedback, type TelemetryItem,
} from './telemetry';
import type { GoogleVerifier } from './google';
import { cancelDeletion, DELETE_CONFIRM, requestDeletion } from './deletion';
import { ipKey, RateLimiter, type RateGate } from './rate-limit';
import { SESSION_HEADER, TELEMETRY_HEADER } from './account-object';
import { MAX_COMMAND_BYTES } from './game-host';

// P09-02b: the Worker's front door. Routing, request size/shape limits, content-version check, guest accounts, bearer
// auth and rate limits (P09-02g: shared across isolates through `gate`, see rate-limit.ts); the game itself runs in the account's Durable Object (`account-object.ts`).
// Platform-neutral (standard Request/Response), so tests call it with fakes. Endpoints: docs/design/p09/SERVER_P09_02B_TH.md.

export interface AccountGame { fetch(request: Request): Promise<Response> }
export interface ApiDeps {
  db: D1Like;
  game(accountId: string): AccountGame;
  contentVersion: string;
  allowedOrigins: readonly string[];
  now(): number;
  // In-isolate first filter; `gate` (P09-02g) is the shared count behind it. Without a gate only the filter applies.
  limiter: RateLimiter;
  gate?: RateGate;
  // P09-02d: checks a Google ID token (iss/aud/exp/signature against Google's JWKS); absent when no client id is set.
  google?: GoogleVerifier;
  // P09-02e (owner D11): importing a local save is allowed only before the external test; `false` closes it (403).
  legacyImport?: boolean;
  // P09-03: runs work after the answer (the Worker's `ctx.waitUntil`); without it the work is awaited (tests).
  defer?(work: Promise<unknown>): void;
}

export const CONTENT_HEADER = 'X-Fateweave-Content';
const HEALTH = { status: 'ok', service: 'asterveil-api', environment: 'dev' } as const;

export { RateLimiter } from './rate-limit';
async function allowed(deps: ApiDeps, key: string, limit: number, windowMs: number, now: number): Promise<boolean> {
  if (!deps.limiter.allow(key, limit, windowMs, now)) return false;
  return deps.gate ? deps.gate.allow(key, limit, windowMs) : true;
}
const limited = (seconds: number) => error('rate_limited', 429, { 'Retry-After': String(seconds) });
export const LIMITS = {
  verifyPerMinute: 10, importPerMinute: 5, commandPerSecond: 10, guestPerMinute: 5, readPerSecond: 10, signInPerMinute: 10, recoverPerMinute: 5, accountPerMinute: 20,
  // P09-03 (drafts): device error reports, feedback (per 10 minutes), admin reads.
  telemetryPerMinute: 6, feedbackPer10Minutes: 3, adminReadPerMinute: 20,
} as const;
// P09-03: adds telemetry items to the daily totals after answering; a failure never changes the answer.
async function track(deps: ApiDeps, items: readonly TelemetryItem[], now: number): Promise<void> {
  if (items.length === 0) return;
  const work = recordTelemetry(deps.db, items, now).catch(() => undefined);
  if (deps.defer) deps.defer(work); else await work;
}
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
  '/v1/account': 'GET', '/v1/link': 'POST', '/v1/signin': 'POST', '/v1/recovery-code': 'POST', '/v1/recover': 'POST', '/v1/sessions/revoke': 'POST',
  '/v1/account/delete': 'POST', '/v1/account/cancel': 'POST',
  '/v1/token/rotate': 'POST', '/v1/telemetry': 'POST', '/v1/feedback': 'POST', '/v1/admin/telemetry': 'GET', '/v1/admin/feedback': 'GET',
};
const ACCOUNT_ROUTES = new Set(['/v1/account', '/v1/link', '/v1/signin', '/v1/recovery-code', '/v1/recover', '/v1/sessions/revoke', '/v1/account/delete', '/v1/account/cancel',
  '/v1/token/rotate', '/v1/telemetry', '/v1/feedback', '/v1/admin/telemetry', '/v1/admin/feedback']);
// P09-02g: what a `deleting` account may still do (read the account, cancel, sign devices out; P09-03: keep its
// credential fresh and report errors).
const WHILE_DELETING = new Set(['/v1/account', '/v1/account/cancel', '/v1/sessions/revoke', '/v1/account/delete', '/v1/token/rotate', '/v1/telemetry']);
const deletingError = () => error('account_deleting', 403);
const ACCOUNT_ID = /^[0-9a-f]{32}$/;
// A session is one page load of the game on one device: 32 random hex digits made by the device (D12).
const SESSION = /^[0-9a-f]{32}$/;

async function route(request: Request, path: string, deps: ApiDeps): Promise<Response> {
  const method = ROUTES[path];
  if (!method) return error('not_found', 404);
  if (request.method !== method) return error('method_not_allowed', 405, { Allow: method });
  const now = deps.now();
  if (path === '/v1/guest') {
    if (!await allowed(deps, `guest:${ipKey(request.headers.get('CF-Connecting-IP'))}`, LIMITS.guestPerMinute, 60_000, now)) return limited(60);
    return json(await createGuest(deps.db, now), 201);
  }
  if (ACCOUNT_ROUTES.has(path)) return accountRoute(request, path, deps, now);
  // Every game route: the device must run the same content as the server (a server deployed without one refuses all).
  if (!deps.contentVersion) return error('content_version_unset', 503);
  if (request.headers.get(CONTENT_HEADER) !== deps.contentVersion) return json({ error: 'content_version', server: deps.contentVersion }, 409);
  const auth = await authenticateAccount(deps.db, request.headers.get('Authorization'), now);
  if (!auth) return error('unauthorized', 401, { 'WWW-Authenticate': 'Bearer' });
  if (auth.status === 'deleting') return deletingError();
  const accountId = auth.accountId;
  if (path === '/v1/import') return importRoute(request, accountId, deps, now);
  if (path === '/v1/verify') return verifyRoute(request, accountId, deps, now);
  // The exact per-account count is kept by the account's Durable Object; this is the in-isolate first filter.
  const writes = path === '/v1/command';
  if (!deps.limiter.allow(`${writes ? 'cmd' : 'read'}:${accountId}`, writes ? LIMITS.commandPerSecond : LIMITS.readPerSecond, 1000, now)) return limited(1);
  const game = deps.game(accountId);
  const session = request.headers.get(SESSION_HEADER) ?? '';
  if (!SESSION.test(session)) return error('session_required', 400);
  const sessionHeaders = { [SESSION_HEADER]: session };
  if (path === '/v1/session') {
    const entered = await game.fetch(new Request('https://game/session', { method: 'POST', headers: sessionHeaders }));
    if (entered.status === 200) await track(deps, [{ kind: 'session', key: 'enter' }], now);
    return entered;
  }
  if (path === '/v1/state') return game.fetch(new Request('https://game/state', { headers: sessionHeaders }));
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return error('unsupported_media_type', 415);
  const body = await readLimited(request, MAX_COMMAND_BYTES);
  if (body === null) return error('too_large', 413);
  const answer = await game.fetch(new Request('https://game/command', { method: 'POST', body, headers: { 'Content-Type': 'application/json', ...sessionHeaders } }));
  const items = answer.headers.get(TELEMETRY_HEADER);
  if (!items) return answer;
  const out = new Response(answer.body, answer);
  out.headers.delete(TELEMETRY_HEADER);
  let parsed: TelemetryItem[] = [];
  try { parsed = JSON.parse(items) as TelemetryItem[]; } catch { /* nothing counted */ }
  await track(deps, parsed, now);
  return out;
}

// P09-02f: the replay audit is for admins only (an account with a row in D1 `admins`, added by the owner; no secret).
// Body (optional): `{ accountId }` to audit another account; default the admin's own. Every audit writes `admin_audit`.
// Answers: the Durable Object's `{ ok, seq, from, reason? }`, 403 forbidden, 404 no_account, 400 invalid_request.
async function verifyRoute(request: Request, adminId: string, deps: ApiDeps, now: number): Promise<Response> {
  if (!await isAdmin(deps.db, adminId)) return error('forbidden', 403);
  if (!await allowed(deps, `verify:${adminId}`, LIMITS.verifyPerMinute, 60_000, now)) return limited(60);
  let target = adminId;
  const text = await readLimited(request, ACCOUNT_BODY_BYTES);
  if (text === null) return error('too_large', 413);
  if (text.trim()) {
    let body: unknown;
    try { body = JSON.parse(text); } catch { return error('invalid_json', 400); }
    const id = typeof body === 'object' && body !== null ? (body as { accountId?: unknown }).accountId : undefined;
    if (id !== undefined && (typeof id !== 'string' || !ACCOUNT_ID.test(id))) return error('invalid_request', 400);
    if (typeof id === 'string') target = id;
  }
  if (target !== adminId && !await accountExists(deps.db, target)) return error('no_account', 404);
  const answer = await deps.game(target).fetch(new Request('https://game/verify', { method: 'POST' }));
  const out = await answer.clone().json().catch(() => ({})) as { ok?: boolean; seq?: number; reason?: string };
  const result = answer.status !== 200 ? `error:${answer.status}` : out.ok ? `ok:${out.seq}` : `fail:${out.reason ?? '?'}:${out.seq}`;
  await auditAdmin(deps.db, adminId, 'verify', target, result, now);
  return answer;
}

// P09-02e (owner D11): one-time import of the device's local save (v1–SAVE_VERSION) into this account. The Worker checks
// the envelope (`checkUpload`: shape, size, the save's SHA-256 and version) and holds the fingerprint in D1; the account's
// Durable Object replays the save with `parseGame` and makes it the account's game. Answers: 201 (also for a retry),
// 403 import_closed, 409 already_imported / fingerprint_used / has_game, 413, 422 <issue> / replay_failed.
async function importRoute(request: Request, accountId: string, deps: ApiDeps, now: number): Promise<Response> {
  if (deps.legacyImport === false) return error('import_closed', 403);
  if (!await allowed(deps, `import:${accountId}`, LIMITS.importPerMinute, 60_000, now)) return limited(60);
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
  const ip = ipKey(request.headers.get('CF-Connecting-IP'));
  // Without a bearer token: sign in with Google, or recover with a code. Both make a device credential.
  if (path === '/v1/signin' || path === '/v1/recover') {
    const [key, limit] = path === '/v1/signin' ? [`signin:${ip}`, LIMITS.signInPerMinute] : [`recover:${ip}`, LIMITS.recoverPerMinute];
    if (!await allowed(deps, key, limit, 60_000, now)) return limited(60);
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
  const auth = await authenticateAccount(deps.db, request.headers.get('Authorization'), now);
  if (!auth) return error('unauthorized', 401, { 'WWW-Authenticate': 'Bearer' });
  const accountId = auth.accountId;
  if (path === '/v1/telemetry' || path === '/v1/feedback' || path.startsWith('/v1/admin/')) return reportRoute(request, path, accountId, auth.status, deps, now);
  if (!await allowed(deps, `account:${accountId}`, LIMITS.accountPerMinute, 60_000, now)) return limited(60);
  if (auth.status === 'deleting' && !WHILE_DELETING.has(path)) return deletingError();
  // `admin: true` (P09-03) only for an admin, so the panel can offer the feedback and telemetry views.
  if (path === '/v1/account') { const info = await accountInfo(deps.db, accountId); return json(info && await isAdmin(deps.db, accountId) ? { ...info, admin: true } : info); }
  // P09-03 rotation: `{ token }` is the device's next credential (same device id). Answers `{ rotated: true }`;
  // 400 invalid_request (another device id or malformed), 409 rotate_conflict.
  if (path === '/v1/token/rotate') {
    const body = await readJson(request);
    if (body instanceof Response) return body;
    const out = await rotateDevice(deps.db, auth, str(body.token), now);
    if (out === 'bad_token') return error('invalid_request', 400);
    if (out === 'conflict') return error('rotate_conflict', 409);
    return json({ rotated: true });
  }
  // P09-02g deletion: `{ confirm: 'delete' }` (the panel has the player type a phrase first). Answers the account with
  // `status: 'deleting'` and `deleteAfter`; a repeat keeps the first deadline. Cancel answers the account again, or
  // 409 not_deleting / too_late.
  if (path === '/v1/account/delete') {
    const body = await readJson(request);
    if (body instanceof Response) return body;
    if (body.confirm !== DELETE_CONFIRM) return error('confirm_required', 400);
    await requestDeletion(deps.db, accountId, deviceOf(request.headers.get('Authorization'))!, now);
    return json(await accountInfo(deps.db, accountId));
  }
  if (path === '/v1/account/cancel') {
    const out = await cancelDeletion(deps.db, accountId, now);
    if (out !== 'cancelled') return error(out, 409);
    return json(await accountInfo(deps.db, accountId));
  }
  if (path === '/v1/recovery-code') return json({ code: await issueRecoveryCode(deps.db, accountId, now) }, 201);
  // P09-02f sign-out: `{ scope?: 'this' | 'others', confirm?: true }` (default this device). 409 unrecoverable: signing
  // this device out would leave no way back into the account (no Google, no recovery code, no other device).
  if (path === '/v1/sessions/revoke') {
    const body = await readJson(request);
    if (body instanceof Response) return body;
    const scope = body.scope ?? 'this';
    if ((scope !== 'this' && scope !== 'others') || (body.confirm !== undefined && typeof body.confirm !== 'boolean')) return error('invalid_request', 400);
    const out = await revokeDevices(deps.db, accountId, deviceOf(request.headers.get('Authorization'))!, scope, body.confirm === true, now);
    if (out === 'unrecoverable') return error('unrecoverable', 409);
    return json(out);
  }
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

// P09-03: device error reports (`{ events: [{ code, place }] }`, fixed vocabulary, daily totals without the account),
// feedback (`{ category, text, place }`, stored with the account), and the admin reads of both (audited).
async function reportRoute(request: Request, path: string, accountId: string, status: string, deps: ApiDeps, now: number): Promise<Response> {
  if (path === '/v1/telemetry') {
    if (!await allowed(deps, `telemetry:${accountId}`, LIMITS.telemetryPerMinute, 60_000, now)) return limited(60);
    const body = await readJson(request);
    if (body instanceof Response) return body;
    const items = clientErrors(body);
    if (!items) return error('invalid_request', 400);
    await track(deps, items, now);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
  if (path === '/v1/feedback') {
    if (status === 'deleting') return deletingError();
    // Checked before counting, so a refused text does not use up the player's sends.
    const body = await readJson(request);
    if (body instanceof Response) return body;
    const input = feedbackInput(body);
    if (!input) return error('invalid_request', 400);
    if (!await allowed(deps, `feedback:${accountId}`, LIMITS.feedbackPer10Minutes, 600_000, now)) return limited(600);
    const id = await saveFeedback(deps.db, accountId, input, deps.contentVersion, now);
    await track(deps, [{ kind: 'feedback', key: input.category }], now);
    return json({ id }, 201);
  }
  if (!await isAdmin(deps.db, accountId)) return error('forbidden', 403);
  if (!await allowed(deps, `admin:${accountId}`, LIMITS.adminReadPerMinute, 60_000, now)) return limited(60);
  const query = new URL(request.url).searchParams;
  if (path === '/v1/admin/telemetry') {
    const days = Math.min(90, Math.max(1, Number.parseInt(query.get('days') ?? '14', 10) || 14));
    const rows = await readTelemetry(deps.db, now, days);
    await auditAdmin(deps.db, accountId, 'telemetry_read', `days:${days}`, `rows:${rows.length}`, now);
    return json({ days, rows });
  }
  const before = Number.parseInt(query.get('before') ?? '', 10);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.get('limit') ?? '30', 10) || 30));
  const rows = await readFeedback(deps.db, Number.isFinite(before) && before > 0 ? before : null, limit);
  await auditAdmin(deps.db, accountId, 'feedback_read', Number.isFinite(before) ? `before:${before}` : 'latest', `rows:${rows.length}`, now);
  return json({ rows });
}
