import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { checkUpload, CLOUD_FORMAT, decideUpload, MAX_ATTEMPTS, MAX_PAYLOAD_BYTES, syncStep, utf8Bytes, type CloudSaveUpload, type SyncState } from '../src/core/cloud/cloud-save';
import { expeditionKey, parseGame, saveGame, type StoragePort } from '../src/core/save/expedition-save';
import { newProfile } from '../src/core/world/profile';
import { newExpedition } from '../src/core/world/world';

// P09-01 design-stage checks (docs/design/p09/CLOUD_SAVE_ENVELOPE_TH.md). Nothing here is wired into the game.
const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');
const store = (): StoragePort & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
};
const localSave = (): string => {
  const s = store(); const profile = newProfile(map, 9);
  const run = newExpedition(map, lookup, 4, { roster: profile.party, members: structuredClone(profile.members), campXp: profile.campXp }, true);
  expect(saveGame(s, { profile, run })).toBe(true);
  return s.data.get(expeditionKey)!;
};
const upload = (payload: string, patch: Partial<CloudSaveUpload> = {}): CloudSaveUpload => ({
  format: CLOUD_FORMAT, requestId: 'req_0123456789abcdef', baseRevision: 0, saveVersion: 58, payload, payloadBytes: utf8Bytes(payload), payloadSha256: sha(payload), ...patch,
});
const v58 = (n: number): boolean => n === 58;

describe('cloud save envelope checks', () => {
  it('accepts the exact local save string, and the same payload still passes replay validation', () => {
    const raw = localSave(); const u = upload(raw);
    expect(checkUpload(u, sha(raw), v58)).toEqual({ ok: true, upload: u });
    expect(parseGame(u.payload, map, lookup).run).not.toBeNull();
  });

  it('counts UTF-8 bytes like the platform encoder (Thai camp names, emoji)', () => {
    for (const t of ['abc', 'ค่ายทหารรับจ้าง', 'a😀b', '\ud800']) expect(utf8Bytes(t)).toBe(Buffer.byteLength(t, 'utf8'));
  });

  it('rejects malformed envelopes with a specific reason', () => {
    const raw = localSave(); const d = sha(raw);
    const cases: [unknown, string][] = [
      [null, 'shape'], [[], 'shape'], [{ ...upload(raw), extra: 1 }, 'shape'],
      [upload(raw, { format: 2 as typeof CLOUD_FORMAT }), 'format'],
      [upload(raw, { requestId: 'short' }), 'requestId'],
      [upload(raw, { baseRevision: -1 }), 'baseRevision'],
      [upload(raw, { saveVersion: 59 }), 'saveVersion'],
      [upload(raw, { payloadBytes: utf8Bytes(raw) + 1 }), 'bytes'],
      [upload(raw, { payloadSha256: 'ABC' }), 'digestFormat'],
      [upload(raw, { payloadSha256: sha(raw + ' ') }), 'digestMismatch'],
    ];
    for (const [u, issue] of cases) expect(checkUpload(u, d, v58)).toEqual({ ok: false, issue });
    const notJson = '{"version":58'; expect(checkUpload(upload(notJson), sha(notJson), v58)).toEqual({ ok: false, issue: 'payloadJson' });
    const other = JSON.stringify({ version: 57 }); expect(checkUpload(upload(other), sha(other), v58)).toEqual({ ok: false, issue: 'payloadVersion' });
  });

  it('refuses payloads over the size ceiling before hashing or parsing them', () => {
    const big = 'x'.repeat(MAX_PAYLOAD_BYTES + 1);
    expect(checkUpload(upload(big), sha(big), v58)).toEqual({ ok: false, issue: 'tooLarge' });
    const thai = 'ก'.repeat(Math.floor(MAX_PAYLOAD_BYTES / 3) + 1); // fits in UTF-16 length, not in bytes
    expect(checkUpload(upload(thai), sha(thai), v58)).toEqual({ ok: false, issue: 'tooLarge' });
  });

  it('fact for the trust boundary: an edited bank at the ceiling still passes local replay validation', () => {
    const p = newProfile(map, 9); const raw = JSON.stringify({ version: 58, profile: { ...p, bank: { ore: 9_999_999, gold: 9_999_999, seal: 99_999, dust: 9_999_999 } }, run: null });
    expect(parseGame(raw, map, lookup).profile.bank.seal).toBe(99_999);
  });
});

describe('server upload decision (compare-and-swap on revision)', () => {
  const raw = localSave(); const u = upload(raw);
  it('stores the first save and each next revision only on a matching base', () => {
    expect(decideUpload(null, [], u)).toEqual({ kind: 'store', revision: 1 });
    expect(decideUpload(null, [], { ...u, baseRevision: 3 })).toEqual({ kind: 'conflict', revision: 0 });
    const head = { revision: 4, saveVersion: 58, payloadSha256: sha('older') };
    expect(decideUpload(head, [], { ...u, baseRevision: 4 })).toEqual({ kind: 'store', revision: 5 });
    expect(decideUpload(head, [], { ...u, baseRevision: 3 })).toEqual({ kind: 'conflict', revision: 4 });
  });
  it('answers a retried request without writing twice and rejects a reused id with a different payload', () => {
    const head = { revision: 5, saveVersion: 58, payloadSha256: u.payloadSha256 };
    const done = [{ requestId: u.requestId, payloadSha256: u.payloadSha256, revision: 5 }];
    expect(decideUpload(head, done, { ...u, baseRevision: 4 })).toEqual({ kind: 'replayed', revision: 5 });
    expect(decideUpload(head, done, { ...u, payloadSha256: sha('other') })).toEqual({ kind: 'requestReused' });
    expect(decideUpload(head, [], { ...u, requestId: 'req_another_device_01', baseRevision: 2 })).toEqual({ kind: 'unchanged', revision: 5 });
  });
  it('never lets an older save format overwrite a newer one', () => {
    expect(decideUpload({ revision: 2, saveVersion: 59, payloadSha256: sha('n') }, [], { ...u, baseRevision: 2 })).toEqual({ kind: 'downgrade', saveVersion: 59 });
  });
});

describe('device sync status', () => {
  const run = (s: SyncState, ...events: Parameters<typeof syncStep>[1][]): SyncState => events.reduce(syncStep, s);
  it('a guest without an account stays local whatever happens to the network', () => {
    expect(run({ kind: 'guestLocal' }, { type: 'localSaved', digest: 'a' }, { type: 'send', requestId: 'r' }, { type: 'offline' })).toEqual({ kind: 'guestLocal' });
  });
  it('a timeout keeps the same request id for the retry, then settles once', () => {
    const s = run({ kind: 'synced', revision: 3, digest: 'a' }, { type: 'localSaved', digest: 'b' }, { type: 'send', requestId: 'r1' }, { type: 'timeout' });
    expect(s).toEqual({ kind: 'waiting', base: 3, digest: 'b', requestId: 'r1', attempts: 1 });
    const retried = run(s, { type: 'online' }, { type: 'send', requestId: 'ignored' });
    expect(retried).toMatchObject({ kind: 'uploading', requestId: 'r1', attempts: 2 });
    expect(run(retried, { type: 'accepted', revision: 4, digest: 'b' })).toEqual({ kind: 'synced', revision: 4, digest: 'b' });
  });
  it('stops retrying after the attempt limit and keeps the local copy waiting', () => {
    let s: SyncState = run({ kind: 'dirty', base: 1, digest: 'b' }, { type: 'send', requestId: 'r' });
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) s = run(s, { type: 'timeout' }, { type: 'send', requestId: 'x' });
    expect(s).toMatchObject({ kind: 'waiting', requestId: 'r', attempts: MAX_ATTEMPTS });
    expect(run(s, { type: 'localSaved', digest: 'c' })).toMatchObject({ kind: 'waiting', digest: 'b', pending: 'c' });
  });
  it('a save made during an upload follows after it instead of being lost', () => {
    const s = run({ kind: 'dirty', base: 1, digest: 'b' }, { type: 'send', requestId: 'r' }, { type: 'localSaved', digest: 'c' }, { type: 'accepted', revision: 2, digest: 'b' });
    expect(s).toEqual({ kind: 'dirty', base: 2, digest: 'c' });
  });
  it('a conflict waits for the player and is never merged automatically', () => {
    const c = run({ kind: 'dirty', base: 1, digest: 'b' }, { type: 'send', requestId: 'r' }, { type: 'conflict', server: 5 });
    expect(c).toEqual({ kind: 'conflict', base: 1, digest: 'b', server: 5 });
    expect(run(c, { type: 'send', requestId: 'z' })).toEqual(c);
    expect(run(c, { type: 'keptLocal' })).toEqual({ kind: 'dirty', base: 5, digest: 'b' });
    expect(run(c, { type: 'keptCloud', revision: 5, digest: 'srv' })).toEqual({ kind: 'synced', revision: 5, digest: 'srv' });
  });
  it('a rejected upload or newer server format blocks syncing but not playing', () => {
    expect(run({ kind: 'dirty', base: 1, digest: 'b' }, { type: 'send', requestId: 'r' }, { type: 'rejected', reason: 'versionTooNew' })).toEqual({ kind: 'blocked', reason: 'versionTooNew' });
  });
});
