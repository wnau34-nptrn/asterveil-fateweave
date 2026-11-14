import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { checkUpload, CLOUD_FORMAT, decideCommand, decideUpload, MAX_PAYLOAD_BYTES, utf8Bytes, type CloudSaveUpload, type CommandEnvelope, type CommandLog } from '../src/core/cloud/cloud-save';
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
  format: CLOUD_FORMAT, requestId: 'req_0123456789abcdef', baseRevision: 0, saveVersion: 60, payload, payloadBytes: utf8Bytes(payload), payloadSha256: sha(payload), ...patch,
});
const v58 = (n: number): boolean => n === 60;

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
      [upload(raw, { saveVersion: 61 }), 'saveVersion'],
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
    const p = newProfile(map, 9); const raw = JSON.stringify({ version: 58, profile: { ...p, bank: { ore: 9_999_999, gold: 9_999_999, shard: 99_999, dust: 9_999_999 } }, run: null });
    expect(parseGame(raw, map, lookup).profile.bank.shard).toBe(99_999);
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
    expect(decideUpload({ revision: 2, saveVersion: 61, payloadSha256: sha('n') }, [], { ...u, baseRevision: 2 })).toEqual({ kind: 'downgrade', saveVersion: 61 });
  });
});

describe('server command order (server decides everything, D10 = ค)', () => {
  const h = (t: string): string => sha(t);
  const cmd = (seq: number, requestId = `req_cmd_${String(seq).padStart(8, '0')}`, args = 'a'): CommandEnvelope => ({ requestId, seq, kind: 'battleCommand', argsSha256: h(args) });
  const log: CommandLog = { lastSeq: 7, recent: [{ requestId: cmd(7).requestId, seq: 7, argsSha256: h('a') }] };
  it('applies only the next command in sequence', () => {
    expect(decideCommand(log, cmd(8))).toEqual({ kind: 'apply' });
    expect(decideCommand(log, cmd(10))).toEqual({ kind: 'gap', lastSeq: 7 });
    expect(decideCommand(log, cmd(5))).toEqual({ kind: 'stale', lastSeq: 7 });
  });
  it('answers a retry after a lost response without applying it twice, and rejects a reused requestId', () => {
    expect(decideCommand(log, cmd(7))).toEqual({ kind: 'replayed', seq: 7 });
    expect(decideCommand(log, cmd(7, cmd(7).requestId, 'other'))).toEqual({ kind: 'requestReused' });
    expect(decideCommand(log, cmd(8, cmd(7).requestId))).toEqual({ kind: 'requestReused' });
  });
  it('rejects malformed envelopes before touching the rules', () => {
    for (const bad of [cmd(0), { ...cmd(8), requestId: 'x' }, { ...cmd(8), kind: 'Drop table' }, { ...cmd(8), argsSha256: 'zz' }, { ...cmd(8), seq: 1.5 }])
      expect(decideCommand(log, bad)).toEqual({ kind: 'invalid' });
  });
});
