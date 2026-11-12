-- P09-02d (owner D1): Google sign-in and recovery codes (docs/design/p09/ACCOUNT_FLOW_TH.md, SCHEMA_API_DRAFT_TH.md §1).
-- An identity is the provider's stable subject only (no e-mail or name). One Google identity per account and one
-- account per identity. A recovery code is stored as its SHA-256 only; issuing a new one replaces the old one, and a
-- code works once.
CREATE TABLE identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE UNIQUE INDEX identities_account ON identities(account_id, provider);
CREATE TABLE recovery_codes (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id),
  code_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
