-- P09-02e (owner D11): one-time import of an existing local save. `legacy_fingerprint` is the SHA-256 of the exact local
-- save string an account imported; one account per save (a unique index lets the many accounts without an import keep
-- NULL). The save itself, its replay and the account's game live in the account's Durable Object.
ALTER TABLE accounts ADD COLUMN legacy_fingerprint TEXT;
CREATE UNIQUE INDEX accounts_legacy_fingerprint ON accounts(legacy_fingerprint);
