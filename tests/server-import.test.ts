import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../src/core/command/command-envelope';
import { MAX_PAYLOAD_BYTES } from '../src/core/cloud/cloud-save';
import { COMMANDER_COLORS, COMMANDER_CRESTS } from '../src/core/world/profile';
import { SESSION_HEADER } from '../src/server/account-object';
import { sha256Hex } from '../src/server/accounts';
import { CONTENT_HEADER, handle } from '../src/server/api';
import { GameHost, memoryStore, SNAPSHOT_EVERY } from '../src/server/game-host';
import { GAME_CONTEXT } from '../src/server/worker';
import { currentSave } from './fixtures/current-save';
import { legacyEnvelope } from './fixtures/legacy-save';
import { battleTurns, server, storedGame, VERSION, type Server } from './fixtures/server-fakes';

// P09-02e (owner D11): one-time import of a local save into a server account, and Durable Object log snapshots that
// `/verify` replays from. Worker + Durable Object in Node with real SQLite (tests/fixtures/server-fakes.ts).

const commander = { name: 'ทดสอบ', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: 'ค่ายทดสอบ' };
const SESSION_A = 'a'.repeat(32), SESSION_B = 'b'.repeat(32);
const headers = (token: string, session = SESSION_A) => ({ Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: session, 'Content-Type': 'application/json' });
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
let rid = 0;
const requestId = () => `import-test-${String(++rid).padStart(8, '0')}`;

async function account(s: Server) {
  const r = await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': `198.51.100.${rid % 200}` } });
  const g = await r.json() as { accountId: string; token: string };
  expect((await call(s, '/v1/session', { method: 'POST', headers: headers(g.token) })).status).toBe(200);
  return g;
}
const send = (s: Server, token: string, seq: number, command: unknown) =>
  call(s, '/v1/command', { method: 'POST', headers: headers(token), body: JSON.stringify({ requestId: requestId(), seq, command }) });
async function envelope(payload: string, extra: Record<string, unknown> = {}) {
  const sha = await sha256Hex(payload);
  return { format: 1, requestId: `imp_${sha.slice(0, 40)}`, baseRevision: 0, saveVersion: (JSON.parse(payload) as { version: number }).version,
    payload, payloadBytes: new TextEncoder().encode(payload).byteLength, payloadSha256: sha, ...extra };
}
// Imports are limited to a few a minute per account.
const importSave = (s: Server, token: string, body: unknown, session = SESSION_A) =>
  (s.clock.t += 12_000, call(s, '/v1/import', { method: 'POST', headers: headers(token, session), body: JSON.stringify(body) }));
const fingerprint = (s: Server, accountId: string) =>
  (s.d1.db.prepare('SELECT legacy_fingerprint AS fp FROM accounts WHERE id = ?').get(accountId) as { fp: string | null }).fp;

// A real local save string mid-battle: another account plays the prologue part-way, and its game is written the way
// the browser writes a local save.
async function midBattleSave(s: Server): Promise<string> {
  const a = await account(s);
  expect((await send(s, a.token, 1, { kind: 'createCommander', commander, replace: false })).status).toBe(200);
  expect((await send(s, a.token, 2, { kind: 'depart', hard: false })).status).toBe(200);
  const g = storedGame(s, a.accountId)!;
  const turns = battleTurns(g);
  expect(turns.length).toBeGreaterThan(2);
  const r = await send(s, a.token, 3, { kind: 'battle', commands: turns.slice(0, 2) });
  expect(((await r.json()) as { status: string }).status).toBe('applied');
  return currentSave(storedGame(s, a.accountId)!);
}

describe('P09-02e one-time import of a local save (D11)', () => {
  it('imports a mid-battle v58 save once, answers a retry the same, and plays on from it', async () => {
    const s = server(Array.from({ length: 200 }, (_, i) => 101 + i * 7));
    const raw = await midBattleSave(s);
    const b = await account(s);
    const body = await envelope(raw);
    const first = await importSave(s, b.token, body);
    expect(first.status).toBe(201);
    const out = await first.json() as { lastSeq: number; view: { run: { battle: unknown } | null } | null; from: number };
    expect(out.from).toBe(58); expect(out.lastSeq).toBe(0); expect(out.view?.run?.battle).toBeTruthy();
    // The stored game is the save as `parseGame` read it; the raw save and its fingerprint are kept.
    expect(canonicalJson(JSON.parse(currentSave(storedGame(s, b.accountId)!)))).toBe(canonicalJson(JSON.parse(raw)));
    expect(fingerprint(s, b.accountId)).toBe(body.payloadSha256);
    const kept = s.objects.get(b.accountId)!.state.db.prepare('SELECT payload, save_version AS v FROM legacy_import').get() as { payload: string; v: number };
    expect(kept).toEqual({ payload: raw, v: 58 });
    // A retry (lost answer) is the same request: same answer, nothing written twice.
    const again = await importSave(s, b.token, body);
    expect(again.status).toBe(201); expect(await again.json()).toEqual(out);
    // The seed-free view never carries the server's seeds.
    expect(JSON.stringify(out)).not.toMatch(/"seed"|"rolls"/);
    // Play on: finish the battle from the imported state; the audit replays from the import snapshot.
    const turns = battleTurns(storedGame(s, b.accountId)!);
    const r = await send(s, b.token, 1, { kind: 'battle', commands: turns });
    expect(((await r.json()) as { status: string }).status).toBe('applied');
    const verify = await call(s, '/v1/verify', { method: 'POST', headers: headers(b.token) });
    expect(await verify.json()).toEqual({ ok: true, seq: 1, from: 0 });
  });

  it('allows one account per save and one import per account, never over a server game', async () => {
    const s = server(Array.from({ length: 200 }, (_, i) => 301 + i * 11));
    const raw = await midBattleSave(s);
    const b = await account(s), c = await account(s);
    expect((await importSave(s, b.token, await envelope(raw))).status).toBe(201);
    // The same save into another account.
    const used = await importSave(s, c.token, await envelope(raw));
    expect(used.status).toBe(409); expect(await used.json()).toEqual({ error: 'fingerprint_used' });
    expect(fingerprint(s, c.accountId)).toBeNull();
    // Another save into the account that already imported.
    const other = legacyEnvelope({ ...(JSON.parse(raw) as { version: number }) }); other.version = 41;
    const second = await importSave(s, b.token, await envelope(JSON.stringify(other)));
    expect(second.status).toBe(409); expect(await second.json()).toEqual({ error: 'already_imported' });
    // An account that started its game on the server: refused, and the save stays free for another account.
    const d = await account(s);
    expect((await send(s, d.token, 1, { kind: 'createCommander', commander, replace: false })).status).toBe(200);
    const camp = currentSave({ profile: storedGame(s, d.accountId)!.profile, run: null });
    const busy = await importSave(s, d.token, await envelope(camp));
    expect(busy.status).toBe(409); expect(await busy.json()).toEqual({ error: 'has_game' });
    expect(fingerprint(s, d.accountId)).toBeNull();
    expect((await importSave(s, c.token, await envelope(camp))).status).toBe(201);
  });

  it('migrates an older save (v41) the way a local load does', async () => {
    const s = server(Array.from({ length: 200 }, (_, i) => 501 + i * 3));
    const raw = await midBattleSave(s);
    const camp = legacyEnvelope({ version: 41, profile: (JSON.parse(raw) as { profile: unknown }).profile, run: null });
    const b = await account(s);
    const r = await importSave(s, b.token, await envelope(JSON.stringify(camp)));
    expect(r.status).toBe(201);
    const out = await r.json() as { from: number; view: { profile: { company: string[] } } };
    expect(out.from).toBe(41); expect(out.view.profile.company.length).toBeGreaterThan(0);
    expect(storedGame(s, b.accountId)).not.toHaveProperty('migrated');
  });

  it('refuses broken, tampered, oversized and unreplayable saves without holding their fingerprint', async () => {
    const s = server(Array.from({ length: 200 }, (_, i) => 701 + i * 5));
    const raw = await midBattleSave(s);
    const b = await account(s);
    const bad = async (body: unknown, status: number, error: string) => {
      const r = await importSave(s, b.token, body);
      expect([r.status, ((await r.json()) as { error: string }).error]).toEqual([status, error]);
    };
    await bad({ ...(await envelope(raw)), payloadSha256: 'f'.repeat(64) }, 422, 'digestMismatch');
    await bad({ ...(await envelope(raw)), payloadBytes: 3 }, 422, 'bytes');
    await bad({ ...(await envelope(raw)), extra: 1 }, 422, 'shape');
    await bad(await envelope(JSON.stringify({ ...(JSON.parse(raw) as object), version: 59 })), 422, 'saveVersion');
    const huge = JSON.stringify({ version: 58, pad: 'x'.repeat(MAX_PAYLOAD_BYTES) });
    await bad(await envelope(huge), 413, 'too_large');
    // A battle whose recorded turns no longer replay (a foe's turn was rewritten) is refused by `parseGame`.
    const save = JSON.parse(raw) as { run: { battle: { commands: { heroId: string }[] } } };
    save.run.battle.commands[0]!.heroId = 'nobody';
    await bad(await envelope(JSON.stringify(save)), 422, 'replay_failed');
    expect(fingerprint(s, b.accountId)).toBeNull();
    expect(storedGame(s, b.accountId)).toBeNull();
    // The account can still import its real save afterwards.
    expect((await importSave(s, b.token, await envelope(raw))).status).toBe(201);
  });

  it('follows D12 (one session), the content version and the import switch', async () => {
    const s = server(Array.from({ length: 200 }, (_, i) => 901 + i * 9));
    const raw = await midBattleSave(s);
    const b = await account(s);
    expect((await call(s, '/v1/session', { method: 'POST', headers: headers(b.token, SESSION_B) })).status).toBe(200);
    expect((await importSave(s, b.token, await envelope(raw))).status).toBe(423);
    expect(fingerprint(s, b.accountId)).toBe((await envelope(raw)).payloadSha256); // held for this account's retry
    expect((await importSave(s, b.token, await envelope(raw), SESSION_B)).status).toBe(201);
    const old = await call(s, '/v1/import', { method: 'POST', headers: { ...headers(b.token), [CONTENT_HEADER]: 'other' }, body: '{}' });
    expect(old.status).toBe(409);
    const closed = server(); closed.deps.legacyImport = false;
    const c = await account(closed);
    const r = await importSave(closed, c.token, await envelope(raw));
    expect(r.status).toBe(403); expect(await r.json()).toEqual({ error: 'import_closed' });
  });
});

describe('P09-02e log snapshots', () => {
  const ctx = GAME_CONTEXT;
  it('snapshots every SNAPSHOT_EVERY commands and when an expedition ends; verify replays from the latest', () => {
    const store = memoryStore(); let n = 0;
    const host = new GameHost(store, ctx, () => 4242 + n++ * 17, VERSION, () => 1);
    let seq = 0;
    const run = (command: unknown) => { seq++; expect(host.command({ requestId: requestId(), seq, command }, seq.toString(16).padStart(64, '0')).status).toBe(200); };
    run({ kind: 'createCommander', commander, replace: false });
    run({ kind: 'depart', hard: false });
    run({ kind: 'battle', commands: battleTurns(store.state!.game!) });
    // Whether the prologue battle ends the expedition or not, an ended expedition leaves a snapshot at that seq.
    if (store.state!.game!.run === null) expect(store.snapshots.at(-1)?.seq).toBe(seq);
    // Refused commands use sequence numbers too (and change nothing).
    while (seq < 2 * SNAPSHOT_EVERY + 7) run({ kind: 'hire', index: 99 });
    expect(store.snapshots.filter(x => x.origin === 'periodic').map(x => x.seq)).toEqual(expect.arrayContaining([SNAPSHOT_EVERY, 2 * SNAPSHOT_EVERY]));
    expect(host.verify()).toEqual({ ok: true, seq, from: 2 * SNAPSHOT_EVERY });
    // A rewritten entry before the snapshot is outside this audit; one after it is caught.
    store.log[2 * SNAPSHOT_EVERY + 2]!.status = 'applied';
    expect(host.verify()).toMatchObject({ ok: false, reason: 'status', from: 2 * SNAPSHOT_EVERY });
  });
});
