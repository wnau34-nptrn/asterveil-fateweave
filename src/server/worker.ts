import { encounterById } from '../content/encounters/catalog';
import { chapterOne } from '../content/world/chapter1';
import { MAPS } from '../content/world/maps';
import type { D1Like } from './accounts';
import { handleAccountRequest, serverSeed, sqlStore, type DurableStateLike } from './account-object';
import { handle, RateLimiter } from './api';
import { GameHost, type GameContext } from './game-host';
import { GOOGLE_JWKS_URL, googleVerifier, type GoogleVerifier } from './google';

// P09-02b Cloudflare entry (bundled by Wrangler from cloudflare/wrangler.json): the Worker and the per-account
// Durable Object class `GameAccount` (SQLite storage). Bindings and vars are declared in wrangler.json.

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}
export interface Env { DB: D1Like; GAME: DurableObjectNamespaceLike; CONTENT_VERSION?: string; ALLOWED_ORIGINS?: string; GOOGLE_CLIENT_ID?: string; LEGACY_IMPORT?: string }

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
  constructor(state: DurableStateLike, env: Env) {
    this.host = new GameHost(sqlStore(state), GAME_CONTEXT, serverSeed, contentVersion(env));
  }
  fetch(request: Request): Promise<Response> { return handleAccountRequest(this.host, request); }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const verify = googleFor(env);
    return handle(request, {
      db: env.DB,
      game: accountId => env.GAME.get(env.GAME.idFromName(accountId)),
      contentVersion: contentVersion(env),
      allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
      now: () => Date.now(),
      limiter,
      // D11: open until the owner closes it before the external test (`LEGACY_IMPORT` = closed).
      legacyImport: env.LEGACY_IMPORT?.trim() !== 'closed',
      ...(verify ? { google: verify } : {}),
    });
  },
};
