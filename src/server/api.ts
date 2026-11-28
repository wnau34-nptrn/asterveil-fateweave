import { CHANNELS, dmChannel, WORLD_CHANNEL, type ChannelKind } from '../core/chat/channels';
import { formatFriendCode, FRIEND_LIMITS, FRIEND_REF } from '../core/chat/friends';
import { chatHandle } from './chat';
import { blockByRef, cancelRequest, friendCode, friendOverview, mutualFriend, removeFriend, requestByCode, respondRequest, unblock } from './friends';
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
import { BOSS_HEADER, HITS_HEADER, SESSION_HEADER, TELEMETRY_HEADER } from './account-object';
import type { PendingHit } from './ledger';
import { MAX_COMMAND_BYTES } from './game-host';
import { sharedOfBar, type Board, type PublicBar } from './world-boss';
import { isWbBoss } from '../core/world/world-boss';

// P09-02b: the Worker's front door. Routing, request size/shape limits, content-version check, guest accounts, bearer
// auth and rate limits (P09-02g: shared across isolates through `gate`, see rate-limit.ts); the game itself runs in the account's Durable Object (`account-object.ts`).
// Platform-neutral (standard Request/Response), so tests call it with fakes. Endpoints: docs/design/p09/SERVER_P09_02B_TH.md.

export interface AccountGame { fetch(request: Request): Promise<Response> }
export interface ApiDeps {
  db: D1Like;
  game(accountId: string): AccountGame;
  contentVersion: string;
  // Grace for a deploy (owner 2026-11-20, docs/design/p09/CONTENT_GRACE_TH.md): the game page is published later than this
  // API, so for a few hours devices still on these earlier content versions are accepted. Empty = the strict rule.
  previousVersions?: readonly string[]; previousUntil?: number;
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
  // P11-04: the shared World Boss object (absent: no shared HP; attempts still count for their players, claims refused).
  boss?: AccountGame;
  // P11 chat: the one `Chat` object (absent: chat closed, 503) and who may write (`CHAT_WRITE`: all | linked | off).
  chat?: AccountGame;
  chatWrite?: ChatWrite;
  // OD-56 friends and private chat (`FRIENDS` = on | off; absent counts as on). Off: the friend routes and the private
  // channel answer 403 `friends_off`; the world chat is unchanged.
  friends?: boolean;
}
export type ChatWrite = 'all' | 'linked' | 'off';

export const CONTENT_HEADER = 'X-Fateweave-Content';
// The device may run this server's content, or (until the grace ends) one of the versions the last deploys replaced.
export const graceActive = (deps: Pick<ApiDeps, 'previousVersions' | 'previousUntil'>, now: number): boolean => !!deps.previousVersions?.length && deps.previousUntil !== undefined && now < deps.previousUntil;
export function contentAccepted(deps: Pick<ApiDeps, 'contentVersion' | 'previousVersions' | 'previousUntil'>, header: string | null, now: number): boolean {
  if (header === null) return false;
  return header === deps.contentVersion || (graceActive(deps, now) && deps.previousVersions!.includes(header));
}
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
  // P11 chat (drafts, docs/design/CHAT_P11_TH.md §3): reads per second (first filter), sends per IP network a minute,
  // reports per account in 10 minutes. The per-account send pace is counted exactly in the `Chat` object.
  chatReadPerSecond: 2, chatSendPerIpMinute: 30, chatReportPer10Minutes: 10,
} as const;
const CHAT_BODY_BYTES = 2048;
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
  '/v1/guest': 'POST', '/v1/session': 'POST', '/v1/state': 'GET', '/v1/gacha/history': 'GET', '/v1/command': 'POST', '/v1/worldboss': 'GET', '/v1/worldboss/board': 'GET', '/v1/verify': 'POST', '/v1/import': 'POST',
  '/v1/account': 'GET', '/v1/link': 'POST', '/v1/signin': 'POST', '/v1/recovery-code': 'POST', '/v1/recover': 'POST', '/v1/sessions/revoke': 'POST',
  '/v1/account/delete': 'POST', '/v1/account/cancel': 'POST',
  '/v1/token/rotate': 'POST', '/v1/telemetry': 'POST', '/v1/feedback': 'POST', '/v1/admin/telemetry': 'GET', '/v1/admin/feedback': 'GET',
  '/v1/chat': 'GET', '/v1/chat/send': 'POST', '/v1/chat/report': 'POST', '/v1/admin/chat': 'GET', '/v1/admin/chat/hide': 'POST', '/v1/admin/chat/mute': 'POST',
  '/v1/friends': 'GET', '/v1/friends/request': 'POST', '/v1/friends/respond': 'POST', '/v1/friends/cancel': 'POST', '/v1/friends/remove': 'POST',
  '/v1/friends/block': 'POST', '/v1/friends/unblock': 'POST', '/v1/friends/code': 'POST',
};
const ACCOUNT_ROUTES = new Set(['/v1/account', '/v1/link', '/v1/signin', '/v1/recovery-code', '/v1/recover', '/v1/sessions/revoke', '/v1/account/delete', '/v1/account/cancel',
  '/v1/token/rotate', '/v1/telemetry', '/v1/feedback', '/v1/admin/telemetry', '/v1/admin/feedback',
  '/v1/chat', '/v1/chat/send', '/v1/chat/report', '/v1/admin/chat', '/v1/admin/chat/hide', '/v1/admin/chat/mute',
  '/v1/friends', '/v1/friends/request', '/v1/friends/respond', '/v1/friends/cancel', '/v1/friends/remove', '/v1/friends/block', '/v1/friends/unblock', '/v1/friends/code']);
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
  if (!contentAccepted(deps, request.headers.get(CONTENT_HEADER), now)) {
    // The answer names the server's version and, while a grace is on, the earlier ones it still takes (the deploy reads this to chain them).
    return json({ error: 'content_version', server: deps.contentVersion, ...(graceActive(deps, now) ? { previous: [...deps.previousVersions!], until: deps.previousUntil! } : {}) }, 409);
  }
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
  if (path === '/v1/worldboss') return worldBossRoute(deps);
  if (path === '/v1/worldboss/board') return worldBossBoardRoute(request, accountId, deps);
  const session = request.headers.get(SESSION_HEADER) ?? '';
  if (!SESSION.test(session)) return error('session_required', 400);
  const sessionHeaders = { [SESSION_HEADER]: session };
  if (path === '/v1/session') {
    const entered = await deliverHits(deps, accountId, game, await game.fetch(new Request('https://game/session', { method: 'POST', headers: sessionHeaders })));
    if (entered.status === 200) await track(deps, [{ kind: 'session', key: 'enter' }], now);
    return entered;
  }
  if (path === '/v1/state') return deliverHits(deps, accountId, game, await game.fetch(new Request('https://game/state', { headers: sessionHeaders })));
  if (path === '/v1/gacha/history') { const q = new URL(request.url).search; return game.fetch(new Request(`https://game/gacha${q}`, { headers: sessionHeaders })); }
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return error('unsupported_media_type', 415);
  const body = await readLimited(request, MAX_COMMAND_BYTES);
  if (body === null) return error('too_large', 413);
  const boss = await bossFor(deps, body);
  const answer = await deliverHits(deps, accountId, game,
    await game.fetch(new Request('https://game/command', { method: 'POST', body, headers: { 'Content-Type': 'application/json', ...sessionHeaders, ...(boss ? { [BOSS_HEADER]: boss } : {}) } })));
  const items = answer.headers.get(TELEMETRY_HEADER);
  if (!items) return answer;
  const out = new Response(answer.body, answer);
  out.headers.delete(TELEMETRY_HEADER);
  let parsed: TelemetryItem[] = [];
  try { parsed = JSON.parse(items) as TelemetryItem[]; } catch { /* nothing counted */ }
  await track(deps, parsed, now);
  return out;
}

// P11-04: a `claimWorldBoss` runs with the shared HP of the week it names, read from the World Boss object first (the
// account's object records it in its log so the claim replays the same). P11-05: the bar is the boss the id names
// (`kragmor:s-50`; no prefix: the warden's). Any other command, an unknown boss, or no object: nothing.
async function bossFor(deps: ApiDeps, body: string): Promise<string | undefined> {
  if (!deps.boss) return undefined;
  let week: unknown, id: unknown;
  try { const v = JSON.parse(body) as { command?: { kind?: unknown; week?: unknown; id?: unknown } }; if (v.command?.kind !== 'claimWorldBoss') return undefined; week = v.command.week; id = v.command.id; } catch { return undefined; }
  if (!Number.isSafeInteger(week) || typeof id !== 'string') return undefined;
  const at = id.indexOf(':'); const boss = at < 0 ? 'warden' : id.slice(0, at);
  if (boss !== 'warden' && !isWbBoss(boss)) return undefined;
  try {
    const r = await deps.boss.fetch(new Request(`https://boss/status?week=${week as number}&boss=${boss}`));
    const status = r.ok ? (await r.json() as { status: PublicBar | null }).status : null;
    return status ? JSON.stringify(sharedOfBar(status)) : undefined;
  } catch { return undefined; }
}
// P11-04: hands the account's waiting World Boss hits to the shared object and marks the ones it took. Never changes the
// answer; a failure leaves the hits waiting for the next answer (they are taken once, however often they are sent).
async function deliverHits(deps: ApiDeps, accountId: string, game: AccountGame, answer: Response): Promise<Response> {
  const raw = answer.headers.get(HITS_HEADER);
  if (!raw) return answer;
  const out = new Response(answer.body, answer);
  out.headers.delete(HITS_HEADER);
  if (!deps.boss) return out;
  try {
    const hits = (JSON.parse(raw) as PendingHit[]).map(h => ({ id: `${accountId}:${h.id}`, week: h.week, account: accountId, damage: h.damage, ...(h.boss ? { boss: h.boss } : {}), ...(h.team ? { team: h.team } : {}) }));
    const r = await deps.boss.fetch(new Request('https://boss/contribute', { method: 'POST', body: JSON.stringify({ hits }), headers: { 'Content-Type': 'application/json' } }));
    if (r.ok) {
      const { taken } = await r.json() as { taken: string[] };
      const ids = taken.filter(id => id.startsWith(`${accountId}:`)).map(id => id.slice(accountId.length + 1));
      if (ids.length) await game.fetch(new Request('https://game/hits/taken', { method: 'POST', body: JSON.stringify({ ids }), headers: { 'Content-Type': 'application/json' } }));
    }
  } catch { /* left waiting */ }
  return out;
}
// P11-04: the shared HP of this week and last week, for the World Boss screen. P11-05: `bars` and `lastBars` hold every
// bar of the week (the three trio bosses, or the warden alone); `current`/`last` stay the warden's bar (null in a trio
// week) for the P11-04 screen until step 4 reads the bars.
async function worldBossRoute(deps: ApiDeps): Promise<Response> {
  if (!deps.boss) return error('world_boss_unavailable', 503);
  const now = await deps.boss.fetch(new Request('https://boss/status'));
  if (!now.ok) return error('world_boss_unavailable', 503);
  const current = await now.json() as { week: number; status: PublicBar | null; bars: PublicBar[] };
  const res = await deps.boss.fetch(new Request(`https://boss/status?week=${current.week - 1}`));
  const last = res.ok ? await res.json() as { status: PublicBar | null; bars: PublicBar[] } : { status: null, bars: [] };
  return json({ week: current.week, current: current.status, last: last.status, bars: current.bars, lastBars: last.bars });
}

// Leaderboard (owner 2026-11-28 “เพิ่ม Leader board”): `?boss=all|warden|kragmor|valdrakk|morvane&last=1`. The top
// rows carry the same anonymous camp handle as chat (never an account id); `you` is the caller's own rank, if it hit.
async function worldBossBoardRoute(request: Request, accountId: string, deps: ApiDeps): Promise<Response> {
  if (!deps.boss) return error('world_boss_unavailable', 503);
  const q = new URL(request.url).searchParams, boss = q.get('boss') ?? 'all', last = q.get('last') === '1';
  if (!/^(all|warden|kragmor|valdrakk|morvane)$/.test(boss)) return error('invalid_request', 400);
  const res = await deps.boss.fetch(new Request(`https://boss/board?account=${accountId}&boss=${boss}${last ? '&last=1' : ''}`)).catch(() => null);
  if (!res?.ok) return error('world_boss_unavailable', 503);
  const board = await res.json() as Board & { week: number };
  const rows = await Promise.all(board.rows.map(async (r, i) => ({ rank: i + 1, handle: await chatHandle(r.account), total: r.total, attempts: r.attempts, best: r.best, you: r.account === accountId, ...(r.team ? { team: r.team } : {}) })));
  return json({ week: board.week, boss, players: board.players, rows, you: board.you });
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
  if (path.startsWith('/v1/chat') || path.startsWith('/v1/admin/chat')) return chatRoute(request, path, accountId, auth.status, ip, deps, now);
  if (path.startsWith('/v1/friends')) return friendsRoute(request, path, accountId, auth.status, ip, deps, now);
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

// P11 chat (docs/design/CHAT_P11_TH.md): the Worker authenticates and decides who may write; the `Chat` object filters,
// paces each account exactly and keeps the messages. Admin routes need a D1 `admins` row and are audited.
async function chatRoute(request: Request, path: string, accountId: string, status: string, ip: string, deps: ApiDeps, now: number): Promise<Response> {
  const chat = deps.chat;
  if (!chat) return error('chat_unavailable', 503);
  const call = async (p: string, body?: unknown): Promise<Response | null> => {
    try {
      return await chat.fetch(new Request(`https://chat${p}`, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }));
    } catch { return null; }
  };
  const pass = async (r: Response | null, extra: Record<string, string> = {}): Promise<Response> => {
    if (!r) return error('chat_unavailable', 503);
    return json(await r.json(), r.status, extra);
  };
  // Why this account may not write now (null: it may).
  const writeBlock = (): string | null => {
    if (status === 'deleting') return 'account_deleting';
    if (status === 'suspended') return 'account_suspended';
    if (deps.chatWrite === 'off') return 'chat_readonly';
    if (deps.chatWrite === 'linked' && status !== 'linked') return 'chat_linked_only';
    return null;
  };
  // Channels (owner 2026-11-19, docs/design/CHAT_CHANNELS_TH.md): a device names a channel kind, never a stored id. The
  // world is open; guild answers 403 `chat_channel_closed`. A private channel (OD-56) names the friend by the device's
  // opaque friend ref; the Worker derives the stored id from this account and that friend, only for mutual friends with
  // no block either way (403 `not_friends` otherwise, the same answer whatever the reason).
  const channelFor = async (v: unknown, friend: unknown): Promise<string | Response> => {
    if (v === undefined || v === null || v === 'world') return WORLD_CHANNEL;
    if (typeof v !== 'string' || !(v in CHANNELS)) return error('invalid_request', 400);
    if (!CHANNELS[v as ChannelKind].open || v !== 'dm') return error('chat_channel_closed', 403);
    if (deps.friends === false) return error('friends_off', 403);
    if (status === 'deleting') return deletingError();
    if (typeof friend !== 'string' || !FRIEND_REF.test(friend)) return error('invalid_request', 400);
    const other = await mutualFriend(deps.db, accountId, friend);
    return other ? dmChannel(accountId, other)! : error('not_friends', 403);
  };
  if (path === '/v1/chat') {
    const q = new URL(request.url).searchParams;
    if (!deps.limiter.allow(`chatread:${accountId}`, LIMITS.chatReadPerSecond, 1000, now)) return limited(1);
    const channel = await channelFor(q.get('channel'), q.get('friend')); if (channel instanceof Response) return channel;
    const after = Number.parseInt(q.get('after') ?? '0', 10);
    const r = await call(`/read?account=${accountId}&after=${Number.isSafeInteger(after) && after > 0 ? after : 0}${channel === WORLD_CHANNEL ? '' : `&channel=${encodeURIComponent(channel)}`}`);
    if (!r?.ok) return error('chat_unavailable', 503);
    return json({ ...await r.json() as object, write: writeBlock() });
  }
  if (path === '/v1/chat/send' || path === '/v1/chat/report') {
    const block = writeBlock();
    if (block && (path === '/v1/chat/send' || block.startsWith('account_'))) return error(block, 403);
    if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return error('unsupported_media_type', 415);
    const raw = await readLimited(request, CHAT_BODY_BYTES);
    if (raw === null) return error('too_large', 413);
    let body: Record<string, unknown>;
    try { const v: unknown = JSON.parse(raw); if (typeof v !== 'object' || v === null || Array.isArray(v)) return error('invalid_request', 400); body = v as Record<string, unknown>; } catch { return error('invalid_json', 400); }
    if (path === '/v1/chat/report') {
      if (!await allowed(deps, `chatreport:${accountId}`, LIMITS.chatReportPer10Minutes, 600_000, now)) return limited(600);
      const channel = await channelFor(body.channel, body.friend); if (channel instanceof Response) return channel;
      return pass(await call('/report', { account: accountId, id: body.id, reason: body.reason, channel }));
    }
    if (typeof body.text !== 'string') return error('invalid_request', 400);
    const channel = await channelFor(body.channel, body.friend); if (channel instanceof Response) return channel;
    if (!await allowed(deps, `chatip:${ip}`, LIMITS.chatSendPerIpMinute, 60_000, now)) return limited(60);
    const r = await call('/post', { account: accountId, text: body.text, channel });
    if (r?.status === 429) { const b = await r.json() as { retryAfter?: number }; return json(b, 429, { 'Retry-After': String(b.retryAfter ?? 5) }); }
    return pass(r);
  }
  if (!await isAdmin(deps.db, accountId)) return error('forbidden', 403);
  if (!await allowed(deps, `admin:${accountId}`, LIMITS.adminReadPerMinute, 60_000, now)) return limited(60);
  if (path === '/v1/admin/chat') {
    const r = await call('/admin');
    if (!r?.ok) return error('chat_unavailable', 503);
    const out = await r.json() as { rows: unknown[] };
    await auditAdmin(deps.db, accountId, 'chat_read', 'chat', `rows:${out.rows.length}`, now);
    return json(out);
  }
  const body = await readJson(request);
  if (body instanceof Response) return body;
  if (path === '/v1/admin/chat/hide') {
    const r = await call('/hide', { id: body.id, hidden: body.hidden });
    if (r?.ok) await auditAdmin(deps.db, accountId, body.hidden === true ? 'chat_hide' : 'chat_unhide', `msg:${String(body.id)}`, 'ok', now);
    return pass(r);
  }
  const target = str(body.accountId);
  if (!ACCOUNT_ID.test(target)) return error('invalid_request', 400);
  const r = await call('/mute', { account: target, minutes: body.minutes, by: accountId });
  if (r?.ok) await auditAdmin(deps.db, accountId, 'chat_mute', target, `minutes:${String(body.minutes)}`, now);
  return pass(r);
}

// OD-56 friends (docs/design/FRIENDS_TH.md). The device sees its own code, handles and opaque refs, never an account id.
// A request by code is the only lookup: limited per account and per IP network, and every reason a code cannot be used
// (unknown, blocked, being deleted, inbox full) answers the same 404 `friend_code_unavailable`.
async function friendsRoute(request: Request, path: string, accountId: string, status: string, ip: string, deps: ApiDeps, now: number): Promise<Response> {
  if (deps.friends === false) return error('friends_off', 403);
  if (status === 'deleting') return deletingError();
  if (path === '/v1/friends') {
    if (!deps.limiter.allow(`friendread:${accountId}`, FRIEND_LIMITS.readPerSecond, 1000, now)) return limited(1);
    const [code, all] = await Promise.all([friendCode(deps.db, accountId, now), friendOverview(deps.db, accountId)]);
    // Unread private messages per friend from the chat object (an outage shows none rather than failing the list).
    const channels = all.friends.map(f => dmChannel(accountId, f.other)!);
    let unread: Record<string, number> = {};
    if (deps.chat && channels.length) {
      try {
        const r = await deps.chat.fetch(new Request('https://chat/unread', { method: 'POST', body: JSON.stringify({ account: accountId, channels }), headers: { 'Content-Type': 'application/json' } }));
        if (r.ok) unread = (await r.json() as { unread: Record<string, number> }).unread;
      } catch { /* none */ }
    }
    const view = async (rows: { ref: string; other: string; at: number }[]) => Promise.all(rows.map(async r => ({ ref: r.ref, handle: await chatHandle(r.other), at: r.at })));
    const friends = await Promise.all(all.friends.map(async (f, i) => ({ ref: f.ref, handle: await chatHandle(f.other), since: f.at, unread: unread[channels[i]!] ?? 0 })));
    return json({
      code: formatFriendCode(code), friends, incoming: await view(all.incoming), outgoing: await view(all.outgoing), blocked: await view(all.blocked),
      unread: friends.reduce((n, f) => n + f.unread, 0), limits: { maxFriends: FRIEND_LIMITS.maxFriends, maxOutgoing: FRIEND_LIMITS.maxOutgoing },
    });
  }
  const body = await readJson(request);
  if (body instanceof Response) return body;
  if (path === '/v1/friends/request') {
    if (!await allowed(deps, `friendcode:${accountId}`, FRIEND_LIMITS.codePer10Minutes, 600_000, now)) return limited(600);
    if (!await allowed(deps, `friendcodeip:${ip}`, FRIEND_LIMITS.codePerIpHour, 3_600_000, now)) return limited(3600);
    const out = await requestByCode(deps.db, accountId, body.code, now);
    switch (out) {
      case 'sent': case 'already_sent': return json({ status: 'sent' }, 201);
      case 'accepted': return json({ status: 'friends' });
      case 'unavailable': return error('friend_code_unavailable', 404);
      case 'invalid_code': return error('invalid_code', 400);
      case 'self': return error('friend_self', 409);
      case 'list_full': return error('friend_list_full', 409);
      default: return error(out, 409);
    }
  }
  if (path === '/v1/friends/code') {
    if (!await allowed(deps, `friendrotate:${accountId}`, FRIEND_LIMITS.rotatePerDay, 86_400_000, now)) return limited(3600);
    return json({ code: formatFriendCode(await friendCode(deps.db, accountId, now, true)) });
  }
  if (!await allowed(deps, `friendact:${accountId}`, FRIEND_LIMITS.actionPerMinute, 60_000, now)) return limited(60);
  const ref = str(body.ref);
  if (!FRIEND_REF.test(ref)) return error('invalid_request', 400);
  const done = (ok: boolean) => ok ? json({ ok: true }) : error('not_found', 404);
  switch (path) {
    case '/v1/friends/respond': {
      if (typeof body.accept !== 'boolean') return error('invalid_request', 400);
      const out = await respondRequest(deps.db, accountId, ref, body.accept, now);
      if (out === 'accepted') return json({ status: 'friends' });
      if (out === 'declined') return json({ status: 'declined' });
      return out === 'not_found' ? error('not_found', 404) : error(out === 'list_full' ? 'friend_list_full' : 'friend_list_full_other', 409);
    }
    case '/v1/friends/cancel': return done(await cancelRequest(deps.db, accountId, ref));
    case '/v1/friends/remove': return done(await removeFriend(deps.db, accountId, ref));
    case '/v1/friends/unblock': return done(await unblock(deps.db, accountId, ref));
    default: {
      const out = await blockByRef(deps.db, accountId, ref, now);
      return out === 'blocked' ? json({ ok: true }) : out === 'not_found' ? error('not_found', 404) : error(out, 409);
    }
  }
}
