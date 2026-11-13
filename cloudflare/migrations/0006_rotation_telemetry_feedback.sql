-- P09-03 (docs/design/p09/TELEMETRY_P09_03_TH.md).
-- Device-credential rotation: the device replaces its secret about once a day; the previous secret's hash keeps working
-- until `prev_until` (a short grace for a lost answer), then never again.
ALTER TABLE devices ADD COLUMN rotated_at INTEGER;
ALTER TABLE devices ADD COLUMN prev_hash TEXT;
ALTER TABLE devices ADD COLUMN prev_until INTEGER;
-- Telemetry: daily totals only (Asia/Bangkok day, a fixed kind and a short key from a fixed vocabulary); no account id,
-- device or IP.
CREATE TABLE telemetry_daily (
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (day, kind, key)
);
-- In-game feedback: the player's own text with the account it came from (removed with the account when it is purged).
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  place TEXT NOT NULL,
  content_version TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX feedback_account ON feedback(account_id);
