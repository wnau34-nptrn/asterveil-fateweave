import { acceptOutcome, FRIEND_LIMITS, makeFriendCode, normalizeFriendCode, requestOutcome, type RequestFacts, type RequestOutcome } from '../core/chat/friends';
import { randomHex, type D1Like } from './accounts';

// OD-56 friends (docs/design/FRIENDS_TH.md): the friend graph in D1 (migration 0007), next to the accounts it belongs
// to, so a block holds on every device and the account purge removes it. Only the Worker calls these, with the account
// it authenticated. Rows found by `ref` are always looked up among the caller's own rows. Account ids stay here: the
// Worker turns each `other` into the pseudonymous handle before answering.

const ACTIVE = "IN ('guest','linked')";
export interface FriendRow { ref: string; other: string; at: number }
export interface FriendOverview { friends: FriendRow[]; incoming: FriendRow[]; outgoing: FriendRow[]; blocked: FriendRow[] }

// The account's code, made on first use. A clash with another account's code (unique index) draws again.
export async function friendCode(db: D1Like, account: string, now: number, replace = false): Promise<string> {
  if (!replace) {
    const row = await db.prepare('SELECT code FROM friend_codes WHERE account_id = ?').bind(account).first<{ code: string }>();
    if (row) return row.code;
  }
  for (let i = 0; i < 6; i++) {
    const code = makeFriendCode(crypto.getRandomValues(new Uint8Array(8)));
    try {
      await db.prepare(replace
        ? 'INSERT INTO friend_codes (account_id, code, created_at) VALUES (?, ?, ?) ON CONFLICT (account_id) DO UPDATE SET code = excluded.code, created_at = excluded.created_at'
        : 'INSERT INTO friend_codes (account_id, code, created_at) VALUES (?, ?, ?) ON CONFLICT (account_id) DO NOTHING').bind(account, code, now).run();
    } catch { continue; }
    const row = await db.prepare('SELECT code FROM friend_codes WHERE account_id = ?').bind(account).first<{ code: string }>();
    if (row) return row.code;
  }
  throw new Error('friend_code');
}

// Friends and requests of accounts that are being deleted are left out (they come back if the deletion is cancelled).
export async function friendOverview(db: D1Like, account: string): Promise<FriendOverview> {
  const q = (sql: string) => db.prepare(sql).bind(account).all<FriendRow>().then(r => r.results);
  const [friends, incoming, outgoing, blocked] = await Promise.all([
    q(`SELECT f.ref, f.friend_id AS other, f.since AS at FROM friends f JOIN accounts a ON a.id = f.friend_id AND a.status ${ACTIVE} WHERE f.account_id = ? ORDER BY f.since, f.ref`),
    q(`SELECT r.ref, r.from_id AS other, r.at FROM friend_requests r JOIN accounts a ON a.id = r.from_id AND a.status ${ACTIVE} WHERE r.to_id = ? ORDER BY r.at DESC`),
    q(`SELECT r.ref, r.to_id AS other, r.at FROM friend_requests r JOIN accounts a ON a.id = r.to_id AND a.status ${ACTIVE} WHERE r.from_id = ? ORDER BY r.at DESC`),
    q('SELECT ref, blocked_id AS other, at FROM friend_blocks WHERE account_id = ? ORDER BY at DESC'),
  ]);
  return { friends, incoming, outgoing, blocked };
}

const FACTS = `SELECT
  (SELECT status FROM accounts WHERE id = ?2) AS status,
  EXISTS (SELECT 1 FROM friend_blocks WHERE account_id = ?2 AND blocked_id = ?1) AS blockedByThem,
  EXISTS (SELECT 1 FROM friend_blocks WHERE account_id = ?1 AND blocked_id = ?2) AS blockedByMe,
  EXISTS (SELECT 1 FROM friends WHERE account_id = ?1 AND friend_id = ?2) AS friends,
  EXISTS (SELECT 1 FROM friend_requests WHERE from_id = ?1 AND to_id = ?2) AS outgoing,
  EXISTS (SELECT 1 FROM friend_requests WHERE from_id = ?2 AND to_id = ?1) AS incoming,
  (SELECT COUNT(*) FROM friends WHERE account_id = ?1) AS myFriends,
  (SELECT COUNT(*) FROM friend_requests WHERE from_id = ?1) AS myOutgoing,
  (SELECT COUNT(*) FROM friends WHERE account_id = ?2) AS theirFriends,
  (SELECT COUNT(*) FROM friend_requests WHERE to_id = ?2) AS theirIncoming`;
type FactRow = { status: string | null; blockedByThem: number; blockedByMe: number; friends: number; outgoing: number; incoming: number; myFriends: number; myOutgoing: number; theirFriends: number; theirIncoming: number };

// Both friendship rows at once (each side gets its own ref), and any request between the two goes.
function befriend(db: D1Like, a: string, b: string, now: number) {
  return db.batch([
    db.prepare('DELETE FROM friend_requests WHERE (from_id = ?1 AND to_id = ?2) OR (from_id = ?2 AND to_id = ?1)').bind(a, b),
    db.prepare('INSERT INTO friends (account_id, friend_id, ref, since) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING').bind(a, b, randomHex(8), now),
    db.prepare('INSERT INTO friends (account_id, friend_id, ref, since) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING').bind(b, a, randomHex(8), now),
  ]);
}

// A request by code (the only lookup). Unknown codes run the same query as known ones.
export async function requestByCode(db: D1Like, account: string, raw: unknown, now: number): Promise<RequestOutcome | 'invalid_code'> {
  const code = normalizeFriendCode(raw);
  if (!code) return 'invalid_code';
  const target = (await db.prepare('SELECT account_id AS id FROM friend_codes WHERE code = ?').bind(code).first<{ id: string }>())?.id ?? '';
  const f = (await db.prepare(FACTS).bind(account, target).first<FactRow>())!;
  const facts: RequestFacts = {
    known: target !== '', active: f.status === 'guest' || f.status === 'linked', self: target === account,
    blockedByThem: !!f.blockedByThem, blockedByMe: !!f.blockedByMe, friends: !!f.friends, outgoing: !!f.outgoing, incoming: !!f.incoming,
    myFriends: f.myFriends, myOutgoing: f.myOutgoing, theirFriends: f.theirFriends, theirIncoming: f.theirIncoming,
  };
  const out = requestOutcome(facts);
  if (out === 'sent') await db.prepare('INSERT INTO friend_requests (from_id, to_id, ref, at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING').bind(account, target, randomHex(8), now).run();
  if (out === 'accepted') await befriend(db, account, target, now);
  return out;
}

export type RespondResult = 'accepted' | 'declined' | 'not_found' | 'list_full' | 'their_list_full';
export async function respondRequest(db: D1Like, account: string, ref: string, accept: boolean, now: number): Promise<RespondResult> {
  const req = await db.prepare(`SELECT r.from_id AS other FROM friend_requests r JOIN accounts a ON a.id = r.from_id AND a.status ${ACTIVE} WHERE r.to_id = ? AND r.ref = ?`).bind(account, ref).first<{ other: string }>();
  if (!req) return 'not_found';
  if (!accept) { await db.prepare('DELETE FROM friend_requests WHERE to_id = ? AND ref = ?').bind(account, ref).run(); return 'declined'; }
  const n = (await db.prepare('SELECT (SELECT COUNT(*) FROM friends WHERE account_id = ?1) AS mine, (SELECT COUNT(*) FROM friends WHERE account_id = ?2) AS theirs').bind(account, req.other).first<{ mine: number; theirs: number }>())!;
  const out = acceptOutcome(n.mine, n.theirs);
  if (out !== 'accepted') return out;
  await befriend(db, account, req.other, now);
  return 'accepted';
}

export async function cancelRequest(db: D1Like, account: string, ref: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS ok FROM friend_requests WHERE from_id = ? AND ref = ?').bind(account, ref).first<{ ok: number }>();
  if (!row) return false;
  await db.prepare('DELETE FROM friend_requests WHERE from_id = ? AND ref = ?').bind(account, ref).run();
  return true;
}

// Removing a friend ends it for both sides (the other's list loses this account too).
export async function removeFriend(db: D1Like, account: string, ref: string): Promise<boolean> {
  const row = await db.prepare('SELECT friend_id AS other FROM friends WHERE account_id = ? AND ref = ?').bind(account, ref).first<{ other: string }>();
  if (!row) return false;
  await db.prepare('DELETE FROM friends WHERE (account_id = ?1 AND friend_id = ?2) OR (account_id = ?2 AND friend_id = ?1)').bind(account, row.other).run();
  return true;
}

// A block names a friend, an incoming or an outgoing request by its ref. It ends the friendship and any request both
// ways; afterwards the blocked account's requests answer `unavailable` and private messages are refused.
export async function blockByRef(db: D1Like, account: string, ref: string, now: number): Promise<'blocked' | 'not_found' | 'block_list_full'> {
  const row = await db.prepare(`SELECT friend_id AS other FROM friends WHERE account_id = ?1 AND ref = ?2
      UNION ALL SELECT from_id FROM friend_requests WHERE to_id = ?1 AND ref = ?2
      UNION ALL SELECT to_id FROM friend_requests WHERE from_id = ?1 AND ref = ?2 LIMIT 1`).bind(account, ref).first<{ other: string }>();
  if (!row) return 'not_found';
  const n = (await db.prepare('SELECT COUNT(*) AS n FROM friend_blocks WHERE account_id = ?').bind(account).first<{ n: number }>())!.n;
  if (n >= FRIEND_LIMITS.maxBlocks) return 'block_list_full';
  await db.batch([
    db.prepare('DELETE FROM friends WHERE (account_id = ?1 AND friend_id = ?2) OR (account_id = ?2 AND friend_id = ?1)').bind(account, row.other),
    db.prepare('DELETE FROM friend_requests WHERE (from_id = ?1 AND to_id = ?2) OR (from_id = ?2 AND to_id = ?1)').bind(account, row.other),
    db.prepare('INSERT INTO friend_blocks (account_id, blocked_id, ref, at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING').bind(account, row.other, randomHex(8), now),
  ]);
  return 'blocked';
}
export async function unblock(db: D1Like, account: string, ref: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS ok FROM friend_blocks WHERE account_id = ? AND ref = ?').bind(account, ref).first<{ ok: number }>();
  if (!row) return false;
  await db.prepare('DELETE FROM friend_blocks WHERE account_id = ? AND ref = ?').bind(account, ref).run();
  return true;
}

// The friend a private channel may open with: both friendship rows present, the friend active, no block either way.
export async function mutualFriend(db: D1Like, account: string, ref: string): Promise<string | null> {
  const row = await db.prepare(`SELECT f.friend_id AS other FROM friends f
      JOIN friends g ON g.account_id = f.friend_id AND g.friend_id = f.account_id
      JOIN accounts a ON a.id = f.friend_id AND a.status ${ACTIVE}
      WHERE f.account_id = ?1 AND f.ref = ?2
        AND NOT EXISTS (SELECT 1 FROM friend_blocks b WHERE (b.account_id = ?1 AND b.blocked_id = f.friend_id) OR (b.account_id = f.friend_id AND b.blocked_id = ?1))`).bind(account, ref).first<{ other: string }>();
  return row?.other ?? null;
}

// Account purge (deletion.ts): the account's code, and every friendship, request and block on either side, as
// [table, condition on ?1 = the account id].
export const FRIEND_PURGE: readonly (readonly [string, string])[] = [
  ['friend_codes', 'account_id = ?1'],
  ['friends', 'account_id = ?1 OR friend_id = ?1'],
  ['friend_requests', 'from_id = ?1 OR to_id = ?1'],
  ['friend_blocks', 'account_id = ?1 OR blocked_id = ?1'],
];
