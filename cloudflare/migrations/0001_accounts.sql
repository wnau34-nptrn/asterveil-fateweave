-- P09-02b: development guest accounts (docs/design/p09/SERVER_P09_02B_TH.md). Only the SHA-256 of a device token is
-- stored. Google identities, recovery codes, ledger and audit tables follow SCHEMA_API_DRAFT_TH.md in later tasks.
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('guest', 'linked', 'deleting', 'suspended')),
  created_at INTEGER NOT NULL
);
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX devices_account ON devices(account_id);
