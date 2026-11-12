import { authenticate, createGuest, type D1Like } from './accounts';
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
export const LIMITS = { commandPerSecond: 10, guestPerMinute: 5, readPerSecond: 10 } as const;

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

const ROUTES: Record<string, 'GET' | 'POST'> = { '/v1/guest': 'POST', '/v1/session': 'POST', '/v1/state': 'GET', '/v1/command': 'POST', '/v1/verify': 'POST' };
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
  // Every game route: the device must run the same content as the server (a server deployed without one refuses all).
  if (!deps.contentVersion) return error('content_version_unset', 503);
  if (request.headers.get(CONTENT_HEADER) !== deps.contentVersion) return json({ error: 'content_version', server: deps.contentVersion }, 409);
  const accountId = await authenticate(deps.db, request.headers.get('Authorization'));
  if (!accountId) return error('unauthorized', 401, { 'WWW-Authenticate': 'Bearer' });
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
