-- P09-02g: account deletion with a grace period (docs/design/p09/SAFETY_P09_02G_TH.md). A request sets status
-- `deleting` and `delete_after` (request time + 14 days); the player may cancel until then. The hourly purge removes the
-- account's Durable Object data and its D1 rows. `account_audit` keeps one row per request/cancel/purge: the account's
-- random id, the action and the time only (no identity, IP or game data).
ALTER TABLE accounts ADD COLUMN delete_after INTEGER;
CREATE INDEX accounts_delete_after ON accounts(delete_after) WHERE delete_after IS NOT NULL;
CREATE TABLE account_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX account_audit_account ON account_audit(account_id, at);
