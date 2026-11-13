-- P09-02f: admin-only audit routes. An account is an admin only while it has a row here; rows are added and removed by
-- the owner with `wrangler d1 execute` (no API grants admin, and no secret is involved). Every admin action writes one
-- `admin_audit` row: who, what, on which account, and the result.
CREATE TABLE admins (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id),
  granted_at INTEGER NOT NULL,
  note TEXT
);
CREATE TABLE admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  result TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX admin_audit_target ON admin_audit(target, at);
