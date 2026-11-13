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

// The account a bearer token belongs to and its status, or null (unknown or revoked; a suspended account is refused).
// P09-02g: a `deleting` account still authenticates, so its device can read the account and cancel; routes decide.
// P09-03: after a rotation the previous secret also works until `prev_until` (`previous: true`), then never again.
export interface Authenticated { accountId: string; status: 'guest' | 'linked' | 'deleting'; deviceId: string; previous: boolean }
export async function authenticateAccount(db: D1Like, authorization: string | null, now = Date.now()): Promise<Authenticated | null> {
  const m = /^Bearer (\S+)$/.exec(authorization ?? '');
  const parts = m ? TOKEN.exec(m[1]!) : null;
  if (!parts) return null;
  const row = await db.prepare(
    `SELECT d.account_id AS account, d.token_hash AS hash, d.prev_hash AS prev, d.prev_until AS until, a.status AS status FROM devices d
       JOIN accounts a ON a.id = d.account_id WHERE d.id = ? AND d.revoked_at IS NULL AND a.status IN ('guest','linked','deleting')`,
  ).bind(parts[1]).first<{ account: string; hash: string; prev: string | null; until: number | null; status: 'guest' | 'linked' | 'deleting' }>();
  if (!row) return null;
  const secret = await sha256Hex(parts[2]!);
  if (equalHex(row.hash, secret)) return { accountId: row.account, status: row.status, deviceId: parts[1]!, previous: false };
  if (row.prev && row.until !== null && now < row.until && equalHex(row.prev, secret)) return { accountId: row.account, status: row.status, deviceId: parts[1]!, previous: true };
  return null;
}
// The account of a bearer token that may play (guest or linked), or null.
export async function authenticate(db: D1Like, authorization: string | null, now = Date.now()): Promise<string | null> {
  const a = await authenticateAccount(db, authorization, now);
  return a && a.status !== 'deleting' ? a.accountId : null;
}

// ---- P09-03: device-credential rotation ----

// How long the replaced secret still works (a lost answer is retried within it).
export const ROTATE_GRACE_MS = 10 * 60 * 1000;
export type RotateResult = 'rotated' | 'bad_token' | 'conflict';
// The device sends its next credential (same device id, a new secret it made itself). Presented with the current secret:
// the next one becomes current and the old one keeps working for ROTATE_GRACE_MS. Presented with the previous secret
// (an answer was lost) and the same next credential: a retry, success again. Anything else: `conflict`.
export async function rotateDevice(db: D1Like, auth: Authenticated, next: string, now: number): Promise<RotateResult> {
  const parts = TOKEN.exec(next);
  if (!parts || parts[1] !== auth.deviceId) return 'bad_token';
  const nextHash = await sha256Hex(parts[2]!);
  const row = await db.prepare('SELECT token_hash AS hash FROM devices WHERE id = ?').bind(auth.deviceId).first<{ hash: string }>();
  if (!row) return 'conflict';
  if (auth.previous) return equalHex(row.hash, nextHash) ? 'rotated' : 'conflict';
  if (equalHex(row.hash, nextHash)) return 'rotated';
  await db.prepare('UPDATE devices SET prev_hash = token_hash, prev_until = ?, token_hash = ?, rotated_at = ?, last_seen = ? WHERE id = ? AND token_hash = ?')
    .bind(now + ROTATE_GRACE_MS, nextHash, now, now, auth.deviceId, row.hash).run();
  const after = await db.prepare('SELECT token_hash AS hash FROM devices WHERE id = ?').bind(auth.deviceId).first<{ hash: string }>();
  return after && equalHex(after.hash, nextHash) ? 'rotated' : 'conflict';
}

// ---- P09-02d: Google identities and recovery codes ----

export const GOOGLE = 'google';
export type AccountStatus = 'guest' | 'linked' | 'deleting' | 'suspended';
// `deleteAfter` (P09-02g): when a `deleting` account is removed for good; null otherwise.
export interface AccountInfo { accountId: string; status: AccountStatus; google: boolean; recoveryCodeAt: number | null; deleteAfter: number | null }

export async function accountInfo(db: D1Like, accountId: string): Promise<AccountInfo | null> {
  const row = await db.prepare(
    `SELECT a.status AS status, a.delete_after AS del, (SELECT COUNT(*) FROM identities i WHERE i.account_id = a.id AND i.provider = ?) AS google,
       (SELECT r.created_at FROM recovery_codes r WHERE r.account_id = a.id) AS code FROM accounts a WHERE a.id = ?`,
  ).bind(GOOGLE, accountId).first<{ status: AccountStatus; del: number | null; google: number; code: number | null }>();
  return row ? { accountId, status: row.status, google: row.google > 0, recoveryCodeAt: row.code ?? null, deleteAfter: row.status === 'deleting' ? row.del ?? null : null } : null;
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

// Signing in on a device with a Google identity that is linked: the device gets a credential of that account (also while
// it is `deleting`, so the player can cancel from a new device).
export async function signInGoogle(db: D1Like, subject: string, token: string, now: number): Promise<string | 'not_linked' | 'bad_token'> {
  const row = await db.prepare(
    "SELECT i.account_id AS account FROM identities i JOIN accounts a ON a.id = i.account_id WHERE i.provider = ? AND i.subject = ? AND a.status IN ('guest','linked','deleting')",
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
        JOIN accounts a ON a.id = r.account_id WHERE r.code_hash = ? AND a.status IN ('guest','linked','deleting')`).bind(parts[1], secretHash, now, now, codeHash),
      db.prepare('DELETE FROM recovery_codes WHERE code_hash = ? AND account_id IN (SELECT account_id FROM devices WHERE id = ?)').bind(codeHash, parts[1]),
    ]);
  }
  const after = before ?? await db.prepare('SELECT account_id AS account, token_hash AS hash FROM devices WHERE id = ?').bind(parts[1]).first<{ account: string; hash: string }>();
  if (!after) return 'invalid_code';
  return equalHex(after.hash, secretHash) ? after.account : 'bad_token';
}

// ---- P09-02e: one-time import of a local save (owner D11) ----

export type FingerprintClaim = 'claimed' | 'already_imported' | 'fingerprint_used';
// Holds `fingerprint` (the SHA-256 of the exact save string) for this account before its Durable Object imports the save,
// so two accounts racing with one save cannot both get it (unique index). Claiming the account's own fingerprint again is
// a retry. An account that holds a different fingerprint has imported already.
export async function claimFingerprint(db: D1Like, accountId: string, fingerprint: string): Promise<FingerprintClaim> {
  const read = async () => (await db.prepare('SELECT legacy_fingerprint AS fp FROM accounts WHERE id = ?').bind(accountId).first<{ fp: string | null }>())?.fp ?? null;
  const held = await read();
  if (held) return held === fingerprint ? 'claimed' : 'already_imported';
  try {
    await db.prepare('UPDATE accounts SET legacy_fingerprint = ? WHERE id = ? AND legacy_fingerprint IS NULL').bind(fingerprint, accountId).run();
  } catch { return 'fingerprint_used'; }
  const now = await read();
  return now === fingerprint ? 'claimed' : 'already_imported';
}
// Lets the fingerprint go again when the Durable Object refused the save (it did not replay, or the account already
// had a game), so the save stays importable into another account.
export async function releaseFingerprint(db: D1Like, accountId: string, fingerprint: string): Promise<void> {
  await db.prepare('UPDATE accounts SET legacy_fingerprint = NULL WHERE id = ? AND legacy_fingerprint = ?').bind(accountId, fingerprint).run();
}

// ---- P09-02f: sign-out and admin checks ----

// The device id in a bearer token (the part before the dot), or null.
export function deviceOf(authorization: string | null): string | null {
  const m = /^Bearer (\S+)$/.exec(authorization ?? '');
  return (m && TOKEN.exec(m[1]!)?.[1]) ?? null;
}

export type RevokeScope = 'this' | 'others';
export type RevokeResult = { revoked: number } | 'unrecoverable';
// Sign-out. `this`: the device's own credential stops working (the device forgets it and starts over); refused with
// `unrecoverable` when nothing else could reach the account again (no Google identity, no recovery code, no other
// signed-in device) unless `confirm`. `others`: every other device of the account is signed out (e.g. a lost phone).
// Revoked credentials stay as rows with `revoked_at` (authenticate ignores them); a repeated request revokes nothing more.
export async function revokeDevices(db: D1Like, accountId: string, deviceId: string, scope: RevokeScope, confirm: boolean, now: number): Promise<RevokeResult> {
  if (scope === 'others') {
    const others = await db.prepare('SELECT COUNT(*) AS n FROM devices WHERE account_id = ? AND id <> ? AND revoked_at IS NULL').bind(accountId, deviceId).first<{ n: number }>();
    await db.prepare('UPDATE devices SET revoked_at = ? WHERE account_id = ? AND id <> ? AND revoked_at IS NULL').bind(now, accountId, deviceId).run();
    return { revoked: others?.n ?? 0 };
  }
  if (!confirm) {
    const row = await db.prepare(
      `SELECT (SELECT COUNT(*) FROM identities i WHERE i.account_id = ?) AS ids, (SELECT COUNT(*) FROM recovery_codes r WHERE r.account_id = ?) AS codes,
         (SELECT COUNT(*) FROM devices d WHERE d.account_id = ? AND d.id <> ? AND d.revoked_at IS NULL) AS others`,
    ).bind(accountId, accountId, accountId, deviceId).first<{ ids: number; codes: number; others: number }>();
    if (row && row.ids + row.codes + row.others === 0) return 'unrecoverable';
  }
  await db.prepare('UPDATE devices SET revoked_at = ? WHERE id = ? AND account_id = ? AND revoked_at IS NULL').bind(now, deviceId, accountId).run();
  return { revoked: 1 };
}

export async function isAdmin(db: D1Like, accountId: string): Promise<boolean> {
  return (await db.prepare('SELECT 1 AS yes FROM admins WHERE account_id = ?').bind(accountId).first<{ yes: number }>()) !== null;
}
export async function accountExists(db: D1Like, accountId: string): Promise<boolean> {
  return (await db.prepare('SELECT 1 AS yes FROM accounts WHERE id = ?').bind(accountId).first<{ yes: number }>()) !== null;
}
export async function auditAdmin(db: D1Like, adminId: string, action: string, target: string, result: string, now: number): Promise<void> {
  await db.prepare('INSERT INTO admin_audit (admin_id, action, target, result, at) VALUES (?, ?, ?, ?, ?)').bind(adminId, action, target, result, now).run();
}
