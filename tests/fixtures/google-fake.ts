import { googleVerifier } from '../../src/server/google';
import type { Server } from './server-fakes';

// P09-02d: a stand-in for Google's signing keys. Tests make RS256 ID tokens with a key pair generated here and the
// verifier fetches the matching JWKS from `jwks()` instead of googleapis.com.

export const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const b64url = (bytes: Uint8Array | string) => {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  return Buffer.from(raw).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};

export interface FakeGoogle {
  kid: string;
  fetches: number;
  jwks(): Promise<Response>;
  token(claims?: Record<string, unknown>, opts?: { kid?: string; alg?: string; key?: CryptoKey }): Promise<string>;
  rotate(): Promise<void>;
  fail: boolean;
}
async function pair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
}
export async function fakeGoogle(): Promise<FakeGoogle> {
  let keys = await pair(); let n = 1;
  const g: FakeGoogle = {
    kid: 'kid-1', fetches: 0, fail: false,
    async jwks() {
      g.fetches++;
      if (g.fail) return new Response('down', { status: 503 });
      const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
      return Response.json({ keys: [{ kty: 'RSA', kid: g.kid, alg: 'RS256', use: 'sig', n: jwk.n, e: jwk.e }] }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    },
    async token(claims = {}, opts = {}) {
      const now = Math.floor(Date.now() / 1000);
      const header = b64url(JSON.stringify({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? g.kid, typ: 'JWT' }));
      const payload = b64url(JSON.stringify({ iss: 'https://accounts.google.com', aud: CLIENT_ID, azp: CLIENT_ID, sub: '1234567890', iat: now, exp: now + 3600, email: 'player@example.com', ...claims }));
      const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', opts.key ?? keys.privateKey, new TextEncoder().encode(`${header}.${payload}`));
      return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
    },
    async rotate() { keys = await pair(); g.kid = `kid-${++n}`; },
  };
  return g;
}
// Gives a test server Google sign-in with the fake keys (the server clock decides expiry).
export async function withGoogle(s: Server): Promise<FakeGoogle> {
  const g = await fakeGoogle();
  s.deps.google = googleVerifier(CLIENT_ID, () => g.jwks());
  s.clock.t = Date.now();
  return g;
}
