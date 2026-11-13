import { encounterById } from '../content/encounters/catalog';
import { chapterOne } from '../content/world/chapter1';
import { MAPS } from '../content/world/maps';
import type { D1Like } from './accounts';
import { handleAccountRequest, serverSeed, sqlStore, type DurableStateLike } from './account-object';
import { handle, LIMITS } from './api';
import { purgeDue } from './deletion';
import { durableGate, handleLimitRequest, RateLimiter } from './rate-limit';
import { GameHost, type GameContext } from './game-host';
import { GOOGLE_JWKS_URL, googleVerifier, type GoogleVerifier } from './google';

// P09-02b Cloudflare entry (bundled by Wrangler from cloudflare/wrangler.json): the Worker and the per-account
// Durable Object class `GameAccount` (SQLite storage). Bindings and vars are declared in wrangler.json.

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}
export interface Env {
  DB: D1Like; GAME: DurableObjectNamespaceLike; LIMIT?: DurableObjectNamespaceLike;
  CONTENT_VERSION?: string; ALLOWED_ORIGINS?: string; GOOGLE_CLIENT_ID?: string; LEGACY_IMPORT?: string; LEGACY_IMPORT_UNTIL?: string;
}
interface ExecutionContextLike { waitUntil(promise: Promise<unknown>): void }

// D11 / P09-02g: importing local saves is open until the owner closes it (`LEGACY_IMPORT` = closed) or, when
// `LEGACY_IMPORT_UNTIL` holds an ISO date-time, until that moment (docs/design/p09/SAFETY_P09_02G_TH.md §4).
export function legacyImportOpen(env: Pick<Env, 'LEGACY_IMPORT' | 'LEGACY_IMPORT_UNTIL'>, now: number): boolean {
  if (env.LEGACY_IMPORT?.trim() === 'closed') return false;
  const until = env.LEGACY_IMPORT_UNTIL?.trim();
  if (!until) return true;
  const at = Date.parse(until);
  return Number.isFinite(at) ? now < at : false;
}

// The same content the game shell runs (`ui/game-shell.ts`).
export const GAME_CONTEXT: GameContext = { home: chapterOne, maps: MAPS, lookup: encounterById };
const contentVersion = (env: Env) => env.CONTENT_VERSION?.trim() ?? '';
const limiter = new RateLimiter();
// One verifier per isolate keeps Google's keys cached between requests.
let google: { clientId: string; verify: GoogleVerifier } | undefined;
function googleFor(env: Env): GoogleVerifier | undefined {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() ?? '';
  if (!clientId) return undefined;
  if (google?.clientId !== clientId) google = { clientId, verify: googleVerifier(clientId, () => fetch(GOOGLE_JWKS_URL)) };
  return google.verify;
}

export class GameAccount {
  private readonly host: GameHost;
  private readonly limiter = new RateLimiter(16);
  private purged = false;
  constructor(private readonly state: DurableStateLike, env: Env) {
    this.host = new GameHost(sqlStore(state), GAME_CONTEXT, serverSeed, contentVersion(env));
  }
  fetch(request: Request): Promise<Response> {
    if (this.purged) return Promise.resolve(Response.json({ purged: true }, { status: new URL(request.url).pathname === '/purge' ? 200 : 410 }));
    return handleAccountRequest(this.host, request, {
      limiter: this.limiter, limits: LIMITS,
      purge: async () => { await this.state.storage.deleteAll?.(); this.purged = true; },
    });
  }
}

// P09-02g: one object per rate-limit key (an IP network or an account and route), so the count holds across isolates.
export class RateLimit {
  private readonly limiter = new RateLimiter(4);
  fetch(request: Request): Promise<Response> { return handleLimitRequest(this.limiter, request, Date.now()); }
}

async function purgeGame(env: Env, accountId: string): Promise<boolean> {
  const r = await env.GAME.get(env.GAME.idFromName(accountId)).fetch(new Request('https://game/purge', { method: 'POST' }));
  return r.status === 200;
}

export default {
  fetch(request: Request, env: Env, ctx?: ExecutionContextLike): Promise<Response> {
    const verify = googleFor(env);
    return handle(request, {
      db: env.DB,
      game: accountId => env.GAME.get(env.GAME.idFromName(accountId)),
      contentVersion: contentVersion(env),
      allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
      now: () => Date.now(),
      limiter,
      ...(env.LIMIT ? { gate: durableGate(env.LIMIT) } : {}),
      legacyImport: legacyImportOpen(env, Date.now()),
      ...(ctx ? { defer: (work: Promise<unknown>) => ctx.waitUntil(work) } : {}),
      ...(verify ? { google: verify } : {}),
    });
  },
  // P09-02g: the hourly Cron removes accounts whose deletion grace period has passed.
  scheduled(_event: unknown, env: Env, ctx: ExecutionContextLike): void {
    ctx.waitUntil(purgeDue(env.DB, id => purgeGame(env, id), Date.now()).then(r => { if (r.due) console.log(JSON.stringify({ purge: r })); }));
  },
};
