// P09-01 design-stage pure checks (docs/design/p09/). Not wired into the game, the Worker or any database yet, and nothing
// here changes the local save (v58) or its rules. With the server deciding everything (owner D10 = ค), `checkUpload` and
// `decideUpload` serve the one-time import of an existing local save (and admin restores); the payload is the exact local
// save string, replayed with `parseGame` from `core/save` separately. `decideCommand` orders the commands of normal play.
// No clocks, randomness, crypto or browser APIs: the caller computes the SHA-256 digest with its platform's crypto.

export const CLOUD_FORMAT = 1;
// Draft ceiling (fresh v58 saves are ~0.8–2.2 KB; localStorage allows ~5 MB). Validated again before P09-02.
export const MAX_PAYLOAD_BYTES = 256 * 1024;
const REQUEST_ID = /^[A-Za-z0-9_-]{16,64}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

// What a device sends to store its save. `baseRevision` is the server revision the device last synced (0 = none).
export interface CloudSaveUpload {
  format: typeof CLOUD_FORMAT;
  requestId: string;
  baseRevision: number;
  saveVersion: number;
  payload: string;
  payloadBytes: number;
  payloadSha256: string;
}
// What the server keeps for an account (one current row; history is kept separately).
export interface CloudSaveHead { revision: number; saveVersion: number; payloadSha256: string }
// A request already committed, kept so a retry after a lost response gets the same answer.
export interface CommittedRequest { requestId: string; payloadSha256: string; revision: number }

export type UploadIssue = 'shape' | 'format' | 'requestId' | 'baseRevision' | 'saveVersion' | 'tooLarge' | 'bytes' | 'digestFormat'
  | 'digestMismatch' | 'payloadJson' | 'payloadVersion';
export type Checked = { ok: true; upload: CloudSaveUpload } | { ok: false; issue: UploadIssue };

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

// UTF-8 byte length without TextEncoder (keeps the module free of platform globals). Lone surrogates count as U+FFFD.
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length && (text.charCodeAt(i + 1) & 0xfc00) === 0xdc00) { bytes += 4; i++; }
    else bytes += 3;
  }
  return bytes;
}

// Structure, size and integrity only. `digest` is the server's own SHA-256 of `payload`; `supported` says which local
// save versions this server build can replay. Replay validation (`parseGame`) is the next, separate step.
export function checkUpload(v: unknown, digest: string, supported: (version: number) => boolean, maxBytes = MAX_PAYLOAD_BYTES): Checked {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return { ok: false, issue: 'shape' };
  const u = v as Record<string, unknown>;
  const keys = ['format', 'requestId', 'baseRevision', 'saveVersion', 'payload', 'payloadBytes', 'payloadSha256'];
  if (Object.keys(u).length !== keys.length || !keys.every(k => k in u)) return { ok: false, issue: 'shape' };
  if (u.format !== CLOUD_FORMAT) return { ok: false, issue: 'format' };
  if (typeof u.requestId !== 'string' || !REQUEST_ID.test(u.requestId)) return { ok: false, issue: 'requestId' };
  if (!isCount(u.baseRevision)) return { ok: false, issue: 'baseRevision' };
  if (!isCount(u.saveVersion) || u.saveVersion < 1 || !supported(u.saveVersion)) return { ok: false, issue: 'saveVersion' };
  if (typeof u.payload !== 'string' || !isCount(u.payloadBytes)) return { ok: false, issue: 'shape' };
  if (u.payloadBytes > maxBytes || u.payload.length > maxBytes) return { ok: false, issue: 'tooLarge' };
  const bytes = utf8Bytes(u.payload);
  if (bytes > maxBytes) return { ok: false, issue: 'tooLarge' };
  if (bytes !== u.payloadBytes) return { ok: false, issue: 'bytes' };
  if (typeof u.payloadSha256 !== 'string' || !SHA256_HEX.test(u.payloadSha256)) return { ok: false, issue: 'digestFormat' };
  if (u.payloadSha256 !== digest) return { ok: false, issue: 'digestMismatch' };
  let parsed: unknown;
  try { parsed = JSON.parse(u.payload); } catch { return { ok: false, issue: 'payloadJson' }; }
  if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: unknown }).version !== u.saveVersion) return { ok: false, issue: 'payloadVersion' };
  return { ok: true, upload: u as unknown as CloudSaveUpload };
}

// How the server answers a checked upload (after replay validation passed). Pure compare-and-swap on the revision.
export type UploadDecision =
  | { kind: 'store'; revision: number }        // baseRevision matches the head: write as revision + 1
  | { kind: 'replayed'; revision: number }     // same requestId and payload already committed: answer as before, write nothing
  | { kind: 'unchanged'; revision: number }    // the head already holds this exact payload (another retry path)
  | { kind: 'requestReused' }                  // same requestId with a different payload: reject
  | { kind: 'downgrade'; saveVersion: number } // an older save format must not overwrite a newer one
  | { kind: 'conflict'; revision: number };    // the head moved on since this device synced

export function decideUpload(head: CloudSaveHead | null, committed: readonly CommittedRequest[], upload: CloudSaveUpload): UploadDecision {
  const seen = committed.find(r => r.requestId === upload.requestId);
  if (seen) return seen.payloadSha256 === upload.payloadSha256 ? { kind: 'replayed', revision: seen.revision } : { kind: 'requestReused' };
  if (!head) return upload.baseRevision === 0 ? { kind: 'store', revision: 1 } : { kind: 'conflict', revision: 0 };
  if (upload.saveVersion < head.saveVersion) return { kind: 'downgrade', saveVersion: head.saveVersion };
  if (head.payloadSha256 === upload.payloadSha256) return { kind: 'unchanged', revision: head.revision };
  if (upload.baseRevision === head.revision) return { kind: 'store', revision: head.revision + 1 };
  return { kind: 'conflict', revision: head.revision };
}

// Server-authoritative play (owner D10 = ค, 2026-11-11; docs/design/p09/SERVER_AUTHORITY_TH.md). The device sends commands,
// never state. Each command carries the account's next sequence number and a requestId; the server applies commands one at a
// time in sequence order with the same pure rules the game uses. This decides only ordering and retries, not the command's
// legality (that is the rules' job).
export interface CommandEnvelope { requestId: string; seq: number; kind: string; argsSha256: string }
// What the server remembers: the last applied sequence number and recent results by requestId (kept for retries).
export interface CommandLog { lastSeq: number; recent: readonly { requestId: string; seq: number; argsSha256: string }[] }
export type CommandDecision =
  | { kind: 'apply' }                  // seq = lastSeq + 1 and the requestId is new: run the rules, store, answer
  | { kind: 'replayed'; seq: number }  // already applied with the same arguments: answer the stored result, change nothing
  | { kind: 'requestReused' }          // same requestId, different command: reject
  | { kind: 'stale'; lastSeq: number } // an older seq that is not a retry: the device is behind, it must reload state
  | { kind: 'gap'; lastSeq: number }   // a seq beyond lastSeq + 1: an earlier command never arrived, resend from lastSeq + 1
  | { kind: 'invalid' };               // malformed envelope

export function decideCommand(log: CommandLog, cmd: CommandEnvelope): CommandDecision {
  if (!REQUEST_ID.test(cmd.requestId) || !Number.isSafeInteger(cmd.seq) || cmd.seq < 1 || !/^[a-z][A-Za-z0-9]{0,31}$/.test(cmd.kind) || !SHA256_HEX.test(cmd.argsSha256)) return { kind: 'invalid' };
  const seen = log.recent.find(r => r.requestId === cmd.requestId);
  if (seen) return seen.seq === cmd.seq && seen.argsSha256 === cmd.argsSha256 ? { kind: 'replayed', seq: seen.seq } : { kind: 'requestReused' };
  if (cmd.seq <= log.lastSeq) return { kind: 'stale', lastSeq: log.lastSeq };
  if (cmd.seq > log.lastSeq + 1) return { kind: 'gap', lastSeq: log.lastSeq };
  return { kind: 'apply' };
}
