import { GOOGLE, type D1Like } from './accounts';

// P09-02g: account deletion with a grace period (docs/design/p09/SAFETY_P09_02G_TH.md, ACCOUNT_FLOW_TH.md).
// Request: status `deleting`, `delete_after` = now + DELETE_GRACE_MS, every other device signed out, one audit row. The
// requesting device stays signed in so it can cancel; any device can also sign in again (Google / recovery code) to
// cancel. While `deleting` the game routes refuse (403 account_deleting). Cancel: back to `linked`/`guest`. Purge (the
// hourly Cron): once `delete_after` has passed by PURGE_MARGIN_MS, the account's Durable Object data is deleted, then its
// D1 rows (P09-03: its feedback too), in that order, so a failed run is simply retried. `account_audit` keeps only the random id, action and time.

export const DELETE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
// Cancel is allowed until `delete_after`; the purge waits this much longer, so the two never overlap.
export const PURGE_MARGIN_MS = 60 * 60 * 1000;
// Accounts purged per Cron run (each costs one Durable Object request and one D1 batch).
export const PURGE_BATCH = 20;
// The device must send this exact word (the panel asks the player to type a Thai phrase first).
export const DELETE_CONFIRM = 'delete';

export async function auditAccount(db: D1Like, accountId: string, action: string, detail: string, now: number): Promise<void> {
  await db.prepare('INSERT INTO account_audit (account_id, action, detail, at) VALUES (?, ?, ?, ?)').bind(accountId, action, detail, now).run();
}

// Asks for deletion. A repeated request keeps the first deadline.
export async function requestDeletion(db: D1Like, accountId: string, deviceId: string, now: number): Promise<{ deleteAfter: number; revoked: number }> {
  const row = await db.prepare('SELECT status, delete_after AS at FROM accounts WHERE id = ?').bind(accountId).first<{ status: string; at: number | null }>();
  if (row?.status === 'deleting' && row.at !== null) return { deleteAfter: row.at, revoked: 0 };
  const others = await db.prepare('SELECT COUNT(*) AS n FROM devices WHERE account_id = ? AND id <> ? AND revoked_at IS NULL').bind(accountId, deviceId).first<{ n: number }>();
  const deleteAfter = now + DELETE_GRACE_MS;
  await db.batch([
    db.prepare("UPDATE accounts SET status = 'deleting', delete_after = ? WHERE id = ? AND status IN ('guest','linked')").bind(deleteAfter, accountId),
    db.prepare('UPDATE devices SET revoked_at = ? WHERE account_id = ? AND id <> ? AND revoked_at IS NULL').bind(now, accountId, deviceId),
    db.prepare('INSERT INTO account_audit (account_id, action, detail, at) VALUES (?, ?, ?, ?)').bind(accountId, 'delete_requested', `revoked:${others?.n ?? 0}`, now),
  ]);
  return { deleteAfter, revoked: others?.n ?? 0 };
}

export type CancelResult = 'cancelled' | 'not_deleting' | 'too_late';
export async function cancelDeletion(db: D1Like, accountId: string, now: number): Promise<CancelResult> {
  const row = await db.prepare('SELECT status, delete_after AS at FROM accounts WHERE id = ?').bind(accountId).first<{ status: string; at: number | null }>();
  if (row?.status !== 'deleting') return 'not_deleting';
  if (row.at === null || row.at <= now) return 'too_late';
  await db.batch([
    db.prepare(`UPDATE accounts SET delete_after = NULL, status = CASE WHEN EXISTS (SELECT 1 FROM identities i WHERE i.account_id = accounts.id AND i.provider = ?)
      THEN 'linked' ELSE 'guest' END WHERE id = ? AND status = 'deleting' AND delete_after > ?`).bind(GOOGLE, accountId, now),
    db.prepare('INSERT INTO account_audit (account_id, action, detail, at) VALUES (?, ?, ?, ?)').bind(accountId, 'delete_cancelled', '', now),
  ]);
  return 'cancelled';
}

// Deletes one account's game data in its Durable Object. Resolves true when the object confirmed.
export type PurgeGame = (accountId: string) => Promise<boolean>;
export interface PurgeReport { due: number; purged: number; failed: number }

export async function purgeDue(db: D1Like, purgeGame: PurgeGame, now: number, limit = PURGE_BATCH): Promise<PurgeReport> {
  const due = (await db.prepare("SELECT id FROM accounts WHERE status = 'deleting' AND delete_after IS NOT NULL AND delete_after <= ? ORDER BY delete_after LIMIT ?")
    .bind(now - PURGE_MARGIN_MS, limit).all<{ id: string }>()).results;
  let purged = 0, failed = 0;
  for (const { id } of due) {
    const ok = await purgeGame(id).catch(() => false);
    if (!ok) { failed++; continue; }
    const guard = '(SELECT 1 FROM accounts WHERE id = ? AND status = \'deleting\' AND delete_after <= ?)';
    await db.batch([
      db.prepare(`DELETE FROM devices WHERE account_id = ? AND EXISTS ${guard}`).bind(id, id, now - PURGE_MARGIN_MS),
      db.prepare(`DELETE FROM identities WHERE account_id = ? AND EXISTS ${guard}`).bind(id, id, now - PURGE_MARGIN_MS),
      db.prepare(`DELETE FROM recovery_codes WHERE account_id = ? AND EXISTS ${guard}`).bind(id, id, now - PURGE_MARGIN_MS),
      db.prepare(`DELETE FROM admins WHERE account_id = ? AND EXISTS ${guard}`).bind(id, id, now - PURGE_MARGIN_MS),
      db.prepare(`DELETE FROM feedback WHERE account_id = ? AND EXISTS ${guard}`).bind(id, id, now - PURGE_MARGIN_MS),
      db.prepare(`INSERT INTO account_audit (account_id, action, detail, at) SELECT ?, 'purged', '', ? WHERE EXISTS ${guard}`).bind(id, now, id, now - PURGE_MARGIN_MS),
      db.prepare("DELETE FROM accounts WHERE id = ? AND status = 'deleting' AND delete_after <= ?").bind(id, now - PURGE_MARGIN_MS),
    ]);
    purged++;
  }
  return { due: due.length, purged, failed };
}
