// P09-02b: development guest accounts. The server makes a random account id and a random device token; D1 keeps only
// the SHA-256 of the token. A token is `<deviceId>.<secret>`: the id finds the row, the hash proves the secret.
// Google sign-in, recovery codes and token rotation come later (docs/design/p09/ACCOUNT_FLOW_TH.md).

// The subset of Cloudflare's D1 API used here (tests pass an in-memory fake).
export interface D1Result<T> { results: T[] }
export interface D1Stmt { bind(...values: unknown[]): D1Stmt; first<T>(): Promise<T | null>; all<T>(): Promise<D1Result<T>>; run(): Promise<unknown> }
export interface D1Like { prepare(sql: string): D1Stmt; batch(statements: D1Stmt[]): Promise<unknown> }

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export const randomHex = (bytes: number): string => hex(crypto.getRandomValues(new Uint8Array(bytes)));
export async function sha256Hex(text: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
}
const TOKEN = /^([0-9a-f]{32})\.([0-9a-f]{64})$/;

// Same-length comparison without an early exit.
function equalHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface GuestAccount { accountId: string; token: string }

export async function createGuest(db: D1Like, now: number): Promise<GuestAccount> {
  const accountId = randomHex(16), deviceId = randomHex(16), secret = randomHex(32);
  await db.batch([
    db.prepare("INSERT INTO accounts (id, status, created_at) VALUES (?, 'guest', ?)").bind(accountId, now),
    db.prepare('INSERT INTO devices (id, account_id, token_hash, created_at, last_seen) VALUES (?, ?, ?, ?, ?)')
      .bind(deviceId, accountId, await sha256Hex(secret), now, now),
  ]);
  return { accountId, token: `${deviceId}.${secret}` };
}

// The account a bearer token belongs to, or null (unknown, revoked or a non-guest/linked account).
export async function authenticate(db: D1Like, authorization: string | null): Promise<string | null> {
  const m = /^Bearer (\S+)$/.exec(authorization ?? '');
  const parts = m ? TOKEN.exec(m[1]!) : null;
  if (!parts) return null;
  const row = await db.prepare(
    "SELECT d.account_id AS account, d.token_hash AS hash FROM devices d JOIN accounts a ON a.id = d.account_id WHERE d.id = ? AND d.revoked_at IS NULL AND a.status IN ('guest','linked')",
  ).bind(parts[1]).first<{ account: string; hash: string }>();
  if (!row) return null;
  return equalHex(row.hash, await sha256Hex(parts[2]!)) ? row.account : null;
}
