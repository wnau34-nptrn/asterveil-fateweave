-- OD-56 friends and private chat (docs/design/FRIENDS_TH.md). All server-side; the device only ever sees a friend code,
-- the pseudonymous handle and opaque random references (`ref`, 16 hex) scoped to its own rows, never an account id.
-- Every row is removed with either account when it is purged (deletion.ts).
CREATE TABLE friend_codes (
  account_id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
-- A pending request; both sides name it with the same `ref`.
CREATE TABLE friend_requests (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  ref TEXT NOT NULL UNIQUE,
  at INTEGER NOT NULL,
  PRIMARY KEY (from_id, to_id)
);
CREATE INDEX friend_requests_to ON friend_requests(to_id);
-- A friendship is two rows, one per side, each with that side's own `ref` for the other.
CREATE TABLE friends (
  account_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  ref TEXT NOT NULL,
  since INTEGER NOT NULL,
  PRIMARY KEY (account_id, friend_id)
);
CREATE UNIQUE INDEX friends_ref ON friends(account_id, ref);
CREATE INDEX friends_friend ON friends(friend_id);
-- A block (account-wide, every device): the blocked account cannot request or message the blocker.
CREATE TABLE friend_blocks (
  account_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  ref TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (account_id, blocked_id)
);
CREATE UNIQUE INDEX friend_blocks_ref ON friend_blocks(account_id, ref);
CREATE INDEX friend_blocks_blocked ON friend_blocks(blocked_id);
