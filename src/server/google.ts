// P09-02d (owner D1): checks a Google Identity Services ID token on the server. The token is an RS256 JWT; its key comes
// from Google's published JWKS (cached as long as Google's Cache-Control allows, fetched again once when an unknown key
// id appears). Accepted only with issuer accounts.google.com, audience = our OAuth Web Client ID and an expiry in the
// future (60 s clock skew). Only the stable subject (`sub`) is used; no e-mail or name is read or stored.

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_ISSUERS: readonly string[] = ['accounts.google.com', 'https://accounts.google.com'];
const SKEW_S = 60;
const MAX_TOKEN = 4096;
const REFETCH_GAP_MS = 60_000;

export type GoogleReason = 'malformed' | 'algorithm' | 'key' | 'signature' | 'issuer' | 'audience' | 'expired' | 'jwks';
export type GoogleCheck = { ok: true; sub: string } | { ok: false; reason: GoogleReason };
export type GoogleVerifier = (idToken: string, now: number) => Promise<GoogleCheck>;

interface Jwk { kid?: string; kty?: string; alg?: string; n?: string; e?: string; use?: string }

function b64urlBytes(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - text.length % 4) % 4));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  } catch { return null; }
}
function b64urlJson(text: string): Record<string, unknown> | null {
  const bytes = b64urlBytes(text);
  if (!bytes) return null;
  try {
    const v: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : null;
  } catch { return null; }
}
function maxAge(response: Response): number {
  const m = /max-age=(\d+)/i.exec(response.headers.get('Cache-Control') ?? '');
  return Math.min(Math.max(m ? Number(m[1]) : 3600, 60), 86_400) * 1000;
}

// `fetchJwks` is `() => fetch(GOOGLE_JWKS_URL)` in the Worker; tests hand in their own key set.
export function googleVerifier(clientId: string, fetchJwks: () => Promise<Response>): GoogleVerifier {
  let keys = new Map<string, CryptoKey>();
  let expires = 0, fetchedAt = -Infinity;
  async function refresh(now: number): Promise<boolean> {
    fetchedAt = now;
    try {
      const r = await fetchJwks();
      if (!r.ok) return false;
      const body = await r.json() as { keys?: Jwk[] };
      const next = new Map<string, CryptoKey>();
      for (const k of body.keys ?? []) {
        if (k.kty !== 'RSA' || !k.kid || !k.n || !k.e || (k.alg && k.alg !== 'RS256') || (k.use && k.use !== 'sig')) continue;
        next.set(k.kid, await crypto.subtle.importKey('jwk', { kty: 'RSA', n: k.n, e: k.e, alg: 'RS256', ext: true },
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
      }
      keys = next; expires = now + maxAge(r);
      return true;
    } catch { return false; }
  }
  async function key(kid: string, now: number): Promise<CryptoKey | 'jwks' | null> {
    if (now >= expires && !(await refresh(now)) && keys.size === 0) return 'jwks';
    const found = keys.get(kid);
    if (found) return found;
    // A key Google rotated in since the last fetch: fetch again, at most once a minute.
    if (now - fetchedAt < REFETCH_GAP_MS) return null;
    if (!(await refresh(now))) return 'jwks';
    return keys.get(kid) ?? null;
  }
  return async (idToken, now) => {
    if (typeof idToken !== 'string' || idToken.length > MAX_TOKEN) return { ok: false, reason: 'malformed' };
    const parts = idToken.split('.');
    if (parts.length !== 3) return { ok: false, reason: 'malformed' };
    const [h, p, s] = parts as [string, string, string];
    const header = b64urlJson(h), payload = b64urlJson(p), signature = b64urlBytes(s);
    if (!header || !payload || !signature) return { ok: false, reason: 'malformed' };
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return { ok: false, reason: 'algorithm' };
    const k = await key(header.kid, now);
    if (k === 'jwks') return { ok: false, reason: 'jwks' };
    if (!k) return { ok: false, reason: 'key' };
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, signature, new TextEncoder().encode(`${h}.${p}`));
    if (!valid) return { ok: false, reason: 'signature' };
    if (typeof payload.iss !== 'string' || !GOOGLE_ISSUERS.includes(payload.iss)) return { ok: false, reason: 'issuer' };
    const aud = payload.aud;
    if (!clientId || !(aud === clientId || (Array.isArray(aud) && aud.length === 1 && aud[0] === clientId))) return { ok: false, reason: 'audience' };
    if (payload.azp !== undefined && payload.azp !== clientId) return { ok: false, reason: 'audience' };
    const sec = now / 1000;
    if (typeof payload.exp !== 'number' || payload.exp + SKEW_S <= sec) return { ok: false, reason: 'expired' };
    if (typeof payload.iat === 'number' && payload.iat - SKEW_S > sec) return { ok: false, reason: 'expired' };
    if (typeof payload.sub !== 'string' || !/^[0-9A-Za-z_-]{1,255}$/.test(payload.sub)) return { ok: false, reason: 'malformed' };
    return { ok: true, sub: payload.sub };
  };
}
