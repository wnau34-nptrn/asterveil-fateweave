// P09-01 cloud save envelope — design-stage pure checks (docs/design/p09/CLOUD_SAVE_ENVELOPE_TH.md).
// Not wired into the game, the Worker or any database yet. Nothing here changes the local save (v58) or its rules:
// the payload is the exact local save string; the server replays it with `parseGame` from `core/save` separately.
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

// Device-side sync status (docs/design/p09/ACCOUNT_FLOW_TH.md §3). The local save stays the playable copy in every state.
export type SyncState =
  | { kind: 'guestLocal' }                                                    // no account linked: local only
  | { kind: 'synced'; revision: number; digest: string }
  | { kind: 'dirty'; base: number; digest: string }                           // local differs from the synced revision
  // `digest` is the payload of the request in flight; `pending` a newer local save that follows once it settles.
  | { kind: 'uploading'; base: number; digest: string; requestId: string; attempts: number; pending?: string }
  | { kind: 'waiting'; base: number; digest: string; requestId: string; attempts: number; pending?: string } // offline/timeout: retry same id
  | { kind: 'conflict'; base: number; digest: string; server: number }       // player must choose (never auto-merged)
  | { kind: 'blocked'; reason: 'versionTooNew' | 'rejected' | 'signedOut' };

export type SyncEvent =
  | { type: 'linked'; revision: number; digest: string }
  | { type: 'localSaved'; digest: string }
  | { type: 'send'; requestId: string }
  | { type: 'accepted'; revision: number; digest: string }
  | { type: 'conflict'; server: number }
  | { type: 'timeout' } | { type: 'offline' } | { type: 'online' }
  | { type: 'rejected'; reason: 'versionTooNew' | 'rejected' }
  | { type: 'keptCloud'; revision: number; digest: string }   // player chose the cloud copy (local backed up first)
  | { type: 'keptLocal' }                                     // player chose the local copy: upload on top of server head
  | { type: 'signedOut' };

export const MAX_ATTEMPTS = 5;

// Total, deterministic transitions; an event that does not apply leaves the state unchanged.
export function syncStep(s: SyncState, e: SyncEvent): SyncState {
  if (e.type === 'signedOut') return { kind: 'blocked', reason: 'signedOut' };
  if (e.type === 'linked') return { kind: 'synced', revision: e.revision, digest: e.digest };
  if (s.kind === 'guestLocal' || s.kind === 'blocked') return s;
  switch (e.type) {
    case 'localSaved': {
      if (s.kind === 'synced') return s.digest === e.digest ? s : { kind: 'dirty', base: s.revision, digest: e.digest };
      if (s.kind === 'dirty' || s.kind === 'conflict') return { ...s, digest: e.digest };
      // A save during an upload/wait: the in-flight request keeps its own payload; the newer one follows after.
      return { ...s, pending: e.digest };
    }
    case 'send':
      if (s.kind === 'dirty') return { kind: 'uploading', base: s.base, digest: s.digest, requestId: e.requestId, attempts: 1 };
      // A retry re-sends the same requestId so the server can answer a committed request without writing twice.
      if (s.kind === 'waiting') return s.attempts >= MAX_ATTEMPTS ? s : { ...s, kind: 'uploading', attempts: s.attempts + 1 };
      return s;
    case 'accepted': {
      if (s.kind !== 'uploading' && s.kind !== 'waiting') return s;
      const pending = s.pending;
      return pending && pending !== e.digest ? { kind: 'dirty', base: e.revision, digest: pending } : { kind: 'synced', revision: e.revision, digest: e.digest };
    }
    case 'conflict':
      if (s.kind !== 'uploading' && s.kind !== 'waiting' && s.kind !== 'dirty') return s;
      return { kind: 'conflict', base: s.base, digest: s.kind === 'dirty' ? s.digest : s.pending ?? s.digest, server: e.server };
    case 'timeout': case 'offline':
      return s.kind === 'uploading' ? { ...s, kind: 'waiting' } : s;
    case 'online':
      return s;
    case 'rejected':
      return s.kind === 'uploading' || s.kind === 'waiting' ? { kind: 'blocked', reason: e.reason } : s;
    case 'keptCloud':
      return s.kind === 'conflict' ? { kind: 'synced', revision: e.revision, digest: e.digest } : s;
    case 'keptLocal':
      return s.kind === 'conflict' ? { kind: 'dirty', base: s.server, digest: s.digest } : s;
  }
}
