// P09-02b: development guest accounts. The server makes a random account id and a random device token; D1 keeps only
// the SHA-256 of the token. A token is `<deviceId>.<secret>`: the id finds the row, the hash proves the secret.
// P09-02d adds Google identities and one-time recovery codes (migration 0002); token rotation comes later
// (docs/design/p09/ACCOUNT_FLOW_TH.md).

// The subset of Cloudflare's D1 API used here (tests pass an in-memory fake).
export interface D1Result<T> { results: T[] }
export interface D1Stmt { bind(...values: unknown[]): D1Stmt; first<T>(): Promise<T | null>; all<T>(): Promise<D1Result<T>>; run(): Promise<unknown> }
export interface D1Like { prepare(sql: string): D1Stmt; batch(statements: D1Stmt[]): Promise<unknown> }

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export const randomHex = (bytes: number): string => hex(crypto.getRandomValues(new Uint8Array(bytes)));
export async function sha256Hex(text: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
}
export const TOKEN = /^([0-9a-f]{32})\.([0-9a-f]{64})$/;

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

// ---- P09-02d: Google identities and recovery codes ----

export const GOOGLE = 'google';
export type AccountStatus = 'guest' | 'linked' | 'deleting' | 'suspended';
export interface AccountInfo { accountId: string; status: AccountStatus; google: boolean; recoveryCodeAt: number | null }

export async function accountInfo(db: D1Like, accountId: string): Promise<AccountInfo | null> {
  const row = await db.prepare(
    `SELECT a.status AS status, (SELECT COUNT(*) FROM identities i WHERE i.account_id = a.id AND i.provider = ?) AS google,
       (SELECT r.created_at FROM recovery_codes r WHERE r.account_id = a.id) AS code FROM accounts a WHERE a.id = ?`,
  ).bind(GOOGLE, accountId).first<{ status: AccountStatus; google: number; code: number | null }>();
  return row ? { accountId, status: row.status, google: row.google > 0, recoveryCodeAt: row.code ?? null } : null;
}

export type LinkResult = 'linked' | 'identity_in_use' | 'already_linked';
// Links a Google subject to this account. Linking the same pair again is a success (a retried request); an identity
// already on another account is never merged (the player may switch to that account instead), and an account keeps
// the one Google identity it has.
export async function linkGoogle(db: D1Like, accountId: string, subject: string, now: number): Promise<LinkResult> {
  for (let tries = 0; tries < 2; tries++) {
    const owner = await db.prepare('SELECT account_id AS account FROM identities WHERE provider = ? AND subject = ?').bind(GOOGLE, subject).first<{ account: string }>();
    if (owner) return owner.account === accountId ? 'linked' : 'identity_in_use';
    const mine = await db.prepare('SELECT subject FROM identities WHERE provider = ? AND account_id = ?').bind(GOOGLE, accountId).first<{ subject: string }>();
    if (mine) return 'already_linked';
    try {
      await db.batch([
        db.prepare('INSERT INTO identities (provider, subject, account_id, linked_at) VALUES (?, ?, ?, ?)').bind(GOOGLE, subject, accountId, now),
        db.prepare("UPDATE accounts SET status = 'linked' WHERE id = ? AND status = 'guest'").bind(accountId),
      ]);
      return 'linked';
    } catch { /* another request linked first (unique constraint): look again */ }
  }
  return 'identity_in_use';
}

// A new device credential the device made itself (`<deviceId>.<secret>`, 128 + 256 random bits), so a retried sign-in
// or recovery whose answer was lost succeeds again with the same credential instead of using the code up twice.
// Returns the account when `token` now belongs to it.
async function adoptDevice(db: D1Like, accountId: string, token: string, now: number): Promise<boolean> {
  const parts = TOKEN.exec(token);
  if (!parts) return false;
  const hash = await sha256Hex(parts[2]!);
  const existing = await db.prepare('SELECT account_id AS account, token_hash AS hash FROM devices WHERE id = ?').bind(parts[1]).first<{ account: string; hash: string }>();
  if (existing) return existing.account === accountId && equalHex(existing.hash, hash);
  try {
    await db.prepare('INSERT INTO devices (id, account_id, token_hash, created_at, last_seen) VALUES (?, ?, ?, ?, ?)').bind(parts[1], accountId, hash, now, now).run();
    return true;
  } catch { return false; }
}

// Signing in on a device with a Google identity that is linked: the device gets a credential of that account.
export async function signInGoogle(db: D1Like, subject: string, token: string, now: number): Promise<string | 'not_linked' | 'bad_token'> {
  const row = await db.prepare(
    "SELECT i.account_id AS account FROM identities i JOIN accounts a ON a.id = i.account_id WHERE i.provider = ? AND i.subject = ? AND a.status IN ('guest','linked')",
  ).bind(GOOGLE, subject).first<{ account: string }>();
  if (!row) return 'not_linked';
  return await adoptDevice(db, row.account, token, now) ? row.account : 'bad_token';
}

// Crockford base32 without I/L/O/U; 20 symbols = 100 random bits, shown as five groups of four.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function normalizeCode(code: string): string | null {
  const clean = code.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return clean.length === 20 && [...clean].every(c => ALPHABET.includes(c)) ? clean : null;
}
export async function issueRecoveryCode(db: D1Like, accountId: string, now: number): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const code = Array.from(bytes, b => ALPHABET[b & 31]).join('');
  await db.prepare('INSERT INTO recovery_codes (account_id, code_hash, created_at) VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET code_hash = excluded.code_hash, created_at = excluded.created_at')
    .bind(accountId, await sha256Hex(code), now).run();
  return code.match(/.{4}/g)!.join('-');
}

// Uses a recovery code once: the device's new credential is added and the code removed in one batch. The insert reads
// the code row, so of two requests racing with one code only the first adds a device. A retry of the same request finds
// its credential already in place and succeeds again.
export async function recoverWithCode(db: D1Like, code: string, token: string, now: number): Promise<string | 'invalid_code' | 'bad_token'> {
  const clean = normalizeCode(code);
  const parts = TOKEN.exec(token);
  if (!parts) return 'bad_token';
  if (!clean) return 'invalid_code';
  const codeHash = await sha256Hex(clean), secretHash = await sha256Hex(parts[2]!);
  const before = await db.prepare('SELECT account_id AS account, token_hash AS hash FROM devices WHERE id = ?').bind(parts[1]).first<{ account: string; hash: string }>();
  if (!before) {
    await db.batch([
      db.prepare(`INSERT INTO devices (id, account_id, token_hash, created_at, last_seen) SELECT ?, r.account_id, ?, ?, ? FROM recovery_codes r
        JOIN accounts a ON a.id = r.account_id WHERE r.code_hash = ? AND a.status IN ('guest','linked')`).bind(parts[1], secretHash, now, now, codeHash),
      db.prepare('DELETE FROM recovery_codes WHERE code_hash = ? AND account_id IN (SELECT account_id FROM devices WHERE id = ?)').bind(codeHash, parts[1]),
    ]);
  }
  const after = before ?? await db.prepare('SELECT account_id AS account, token_hash AS hash FROM devices WHERE id = ?').bind(parts[1]).first<{ account: string; hash: string }>();
  if (!after) return 'invalid_code';
  return equalHex(after.hash, secretHash) ? after.account : 'bad_token';
}
