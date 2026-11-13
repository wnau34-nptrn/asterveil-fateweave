import { describe, expect, it } from 'vitest';
import { HIDDEN_PROFILE_KEYS, HIDDEN_RUN_KEYS } from '../src/core/command/client-view';
import { COMMANDER_COLORS, COMMANDER_CRESTS } from '../src/core/world/profile';
import type { Profile } from '../src/core/world/types';
import { SESSION_HEADER, sqlStore } from '../src/server/account-object';
import { CONTENT_HEADER, handle, LIMITS } from '../src/server/api';
import { GameHost, memoryStore, replayLog } from '../src/server/game-host';
import { GAME_CONTEXT } from '../src/server/worker';
import { battleTurns, fakeDurableState, grantAdmin, server, storedGame, VERSION, type Server } from './fixtures/server-fakes';

// P09-02b: the Worker front door and the per-account Durable Object, run in Node with real SQLite (node:sqlite) standing
// in for D1 and the Durable Object's SQL storage. See docs/design/p09/SERVER_P09_02B_TH.md.

const commander = { name: 'ทดสอบ', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: 'ค่ายทดสอบ' };

const call = (s: Server, path: string, init: RequestInit = {}) => handle(new Request(`https://api.test${path}`, init), s.deps);
async function guest(s: Server) {
  const r = await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.9' } });
  expect(r.status).toBe(201);
  return await r.json() as { accountId: string; token: string };
}
const SESSION_A = 'a'.repeat(32), SESSION_B = 'b'.repeat(32);
const gameHeaders = (token: string, version = VERSION, session = SESSION_A) => ({ Authorization: `Bearer ${token}`, [CONTENT_HEADER]: version, [SESSION_HEADER]: session, 'Content-Type': 'application/json' });
let rid = 0;
const requestId = () => `request-${String(++rid).padStart(10, '0')}`;
function send(s: Server, token: string, body: unknown) {
  s.clock.t += 1000; // stay under the per-second command limit
  return call(s, '/v1/command', { method: 'POST', headers: gameHeaders(token), body: JSON.stringify(body) });
}
const HIDDEN = new Set<string>([...HIDDEN_PROFILE_KEYS, ...HIDDEN_RUN_KEYS]);
function keysDeep(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(v => keysDeep(v, out));
  else if (typeof value === 'object' && value !== null) for (const [k, v] of Object.entries(value)) { out.add(k); keysDeep(v, out); }
  return out;
}
const leaks = (text: string) => [...keysDeep(JSON.parse(text))].filter(k => HIDDEN.has(k));
describe('P09-02b Worker front door', () => {
  it('keeps /health exactly as the development probe answered it', async () => {
    const s = server();
    const r = await call(s, '/health');
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.json()).toEqual({ status: 'ok', service: 'asterveil-api', environment: 'dev' });
    const head = await call(s, '/health', { method: 'HEAD' });
    expect(head.status).toBe(200); expect(await head.text()).toBe('');
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const m = await call(s, '/health', { method });
      expect(m.status).toBe(405); expect(m.headers.get('allow')).toBe('GET, HEAD');
    }
    for (const path of ['/', '/accounts', '/rewards', '/health/', '/v1/nope']) expect((await call(s, path)).status).toBe(404);
  });

  it('creates guests with random ids and stores only the token hash', async () => {
    const s = server();
    const a = await guest(s), b = await guest(s);
    expect(a.accountId).toMatch(/^[0-9a-f]{32}$/); expect(a.accountId).not.toBe(b.accountId);
    expect(a.token).toMatch(/^[0-9a-f]{32}\.[0-9a-f]{64}$/);
    const rows = s.d1.db.prepare('SELECT * FROM devices').all() as { token_hash: string }[];
    expect(rows).toHaveLength(2);
    const secret = a.token.split('.')[1]!;
    expect(JSON.stringify(s.d1.db.prepare('SELECT * FROM devices, accounts').all())).not.toContain(secret);
    // Guest creation is limited per address.
    for (let i = 2; i < LIMITS.guestPerMinute; i++) await guest(s);
    expect((await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.9' } })).status).toBe(429);
  });

  it('refuses missing or wrong tokens, other content versions and an unconfigured server', async () => {
    const s = server(); const { token } = await guest(s);
    expect((await call(s, '/v1/state', { headers: { [CONTENT_HEADER]: VERSION } })).status).toBe(401);
    const forged = `${token.split('.')[0]}.${'0'.repeat(64)}`;
    expect((await call(s, '/v1/state', { headers: gameHeaders(forged) })).status).toBe(401);
    const old = await call(s, '/v1/state', { headers: gameHeaders(token, 'other-build') });
    expect(old.status).toBe(409); expect(await old.json()).toEqual({ error: 'content_version', server: VERSION });
    expect((await call(s, '/v1/state', { headers: gameHeaders(token) })).status).toBe(200);
    s.d1.db.prepare('UPDATE devices SET revoked_at = 1').run();
    expect((await call(s, '/v1/state', { headers: gameHeaders(token) })).status).toBe(401);
    const unset = server([], '');
    const g = await guest(unset);
    expect((await call(unset, '/v1/state', { headers: gameHeaders(g.token, '') })).status).toBe(503);
  });

  it('checks method, media type and size before the game sees a command; CORS only for listed origins', async () => {
    const s = server(); const { token } = await guest(s);
    expect((await call(s, '/v1/command', { headers: gameHeaders(token) })).status).toBe(405);
    expect((await call(s, '/v1/command', { method: 'POST', headers: { ...gameHeaders(token), 'Content-Type': 'text/plain' }, body: '{}' })).status).toBe(415);
    const big = JSON.stringify({ requestId: requestId(), seq: 1, command: { kind: 'rest', pad: 'x'.repeat(130 * 1024) } });
    expect((await send(s, token, JSON.parse(big))).status).toBe(413);
    expect((await call(s, '/v1/command', { method: 'POST', headers: gameHeaders(token), body: 'not json' })).status).toBe(400);
    expect((await send(s, token, { requestId: requestId(), seq: 1 })).status).toBe(400);
    expect((await send(s, token, { requestId: 'short', seq: 1, command: { kind: 'rest' } })).status).toBe(400);
    const pre = await call(s, '/v1/command', { method: 'OPTIONS', headers: { Origin: 'https://wnau34-nptrn.github.io' } });
    expect(pre.status).toBe(204); expect(pre.headers.get('access-control-allow-origin')).toBe('https://wnau34-nptrn.github.io');
    const other = await call(s, '/v1/state', { headers: { ...gameHeaders(token), Origin: 'https://evil.example' } });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('limits commands per account per second', async () => {
    const s = server(); const { token } = await guest(s);
    const codes: number[] = [];
    for (let i = 0; i <= LIMITS.commandPerSecond; i++) {
      codes.push((await call(s, '/v1/command', { method: 'POST', headers: gameHeaders(token), body: JSON.stringify({ requestId: requestId(), seq: 99, command: { kind: 'rest' } }) })).status);
    }
    expect(codes.slice(0, -1).every(c => c === 409)).toBe(true); // gap: nothing ran
    expect(codes.at(-1)).toBe(429);
  });
});

describe('P09-02c one session per account (D12)', () => {
  it('lets the newest session play and answers 423 other_device to the one it replaced', async () => {
    const s = server(); const { token } = await guest(s);
    const cmd = (session: string, seq: number) => call(s, '/v1/command', { method: 'POST', headers: gameHeaders(token, VERSION, session),
      body: JSON.stringify({ requestId: requestId(), seq, command: { kind: 'createCommander', commander, replace: false } }) });
    // A missing or malformed session id is refused before the game sees the request.
    const noSession: Record<string, string> = gameHeaders(token); delete noSession[SESSION_HEADER];
    expect((await call(s, '/v1/state', { headers: noSession })).status).toBe(400);
    expect((await call(s, '/v1/state', { headers: gameHeaders(token, VERSION, 'XYZ') })).status).toBe(400);
    // The first session to arrive holds the account.
    expect((await cmd(SESSION_A, 1)).status).toBe(200);
    // Another device enters: it takes over and sees the same state.
    const enter = await call(s, '/v1/session', { method: 'POST', headers: gameHeaders(token, VERSION, SESSION_B) });
    expect(enter.status).toBe(200); expect((await enter.json() as { lastSeq: number }).lastSeq).toBe(1);
    const old = await call(s, '/v1/state', { headers: gameHeaders(token, VERSION, SESSION_A) });
    expect(old.status).toBe(423); expect(await old.json()).toEqual({ error: 'other_device' });
    expect((await cmd(SESSION_A, 2)).status).toBe(423);
    expect((await call(s, '/v1/state', { headers: gameHeaders(token, VERSION, SESSION_B) })).status).toBe(200);
    // Entering again on the first device takes it back; nothing ran on the refused command.
    expect((await call(s, '/v1/session', { method: 'POST', headers: gameHeaders(token, VERSION, SESSION_A) })).status).toBe(200);
    expect((await cmd(SESSION_B, 2)).status).toBe(423);
    const back = await call(s, '/v1/state', { headers: gameHeaders(token, VERSION, SESSION_A) });
    expect((await back.json() as { lastSeq: number }).lastSeq).toBe(1);
  });
});

describe('P09-02b account Durable Object', () => {
  it('runs commands in seq order, answers retries with the same bytes and never sends a seed', async () => {
    const s = server(); const { accountId, token } = await guest(s);
    const empty = await call(s, '/v1/state', { headers: gameHeaders(token) });
    expect(await empty.json()).toEqual({ lastSeq: 0, view: null });

    const first = { requestId: requestId(), seq: 1, command: { kind: 'createCommander', commander, replace: false } };
    const r1 = await send(s, token, first); const t1 = await r1.text();
    expect(r1.status).toBe(200);
    expect(JSON.parse(t1)).toMatchObject({ seq: 1, status: 'applied' });
    expect(leaks(t1)).toEqual([]);
    expect(storedGame(s, accountId)!.profile.seed).toBe(11); // the server seed is kept, not sent

    const again = await send(s, token, first);
    expect(await again.text()).toBe(t1);
    expect(s.objects.get(accountId)!.state.db.prepare('SELECT COUNT(*) AS n FROM log').get()).toEqual({ n: 1 });

    expect(await (await send(s, token, { ...first, command: { kind: 'rest' } })).json()).toEqual({ error: 'request_reused' });
    expect(await (await send(s, token, { requestId: requestId(), seq: 1, command: { kind: 'rest' } })).json()).toEqual({ error: 'stale', lastSeq: 1 });
    expect(await (await send(s, token, { requestId: requestId(), seq: 3, command: { kind: 'rest' } })).json()).toEqual({ error: 'gap', lastSeq: 1 });

    // A command the rules refuse still uses its sequence number and changes nothing.
    const before = storedGame(s, accountId);
    const refused = await (await send(s, token, { requestId: requestId(), seq: 2, command: { kind: 'rest' } })).json();
    expect(refused).toEqual({ seq: 2, status: 'rejected', reason: expect.any(String) });
    expect(storedGame(s, accountId)).toEqual(before);

    const dep = await send(s, token, { requestId: requestId(), seq: 3, command: { kind: 'depart', hard: false } });
    const depText = await dep.text();
    expect(JSON.parse(depText)).toMatchObject({ seq: 3, status: 'applied' });
    expect(leaks(depText)).toEqual([]);
    const g = storedGame(s, accountId)!;
    expect(g.run!.seed).toBe(22);
    expect(depText).not.toContain('"seed"');

    const state = await (await call(s, '/v1/state', { headers: gameHeaders(token) })).text();
    expect(leaks(state)).toEqual([]);
    expect(JSON.parse(state).lastSeq).toBe(3);

    const battle = await send(s, token, { requestId: requestId(), seq: 4, command: { kind: 'battle', commands: battleTurns(g) } });
    const battleText = await battle.text();
    expect(JSON.parse(battleText)).toMatchObject({ seq: 4, status: 'applied' });
    expect(leaks(battleText)).toEqual([]);

    // The stored log replays from nothing to the same snapshot (also through the audit route).
    grantAdmin(s, accountId);
    expect(await (await call(s, '/v1/verify', { method: 'POST', headers: gameHeaders(token) })).json()).toEqual({ ok: true, seq: 4, from: 0 });
    // Accounts never share a Durable Object.
    const other = await guest(s);
    expect(await (await call(s, '/v1/state', { headers: gameHeaders(other.token) })).json()).toEqual({ lastSeq: 0, view: null });
  });

  it('replay notices changed seeds, a changed status or a changed snapshot', () => {
    const store = memoryStore();
    let seeds = [5, 6];
    const h = new GameHost(store, GAME_CONTEXT, () => seeds.shift()!, VERSION, () => 0);
    expect(h.command({ requestId: requestId(), seq: 1, command: { kind: 'createCommander', commander, replace: false } }, 'a'.repeat(64)).status).toBe(200);
    expect(h.command({ requestId: requestId(), seq: 2, command: { kind: 'depart', hard: false } }, 'b'.repeat(64)).status).toBe(200);
    expect(h.verify()).toEqual({ ok: true, seq: 2, from: 0 });
    seeds = [];
    const log = store.entries();
    expect(replayLog(log.map((e, i) => i === 1 ? { ...e, seeds: [7] } : e), GAME_CONTEXT, store.state!.game).ok).toBe(false);
    expect(replayLog(log.map((e, i) => i === 1 ? { ...e, seeds: [] } : e), GAME_CONTEXT, store.state!.game)).toEqual({ ok: false, seq: 2, reason: 'seeds' });
    expect(replayLog(log.map((e, i) => i === 1 ? { ...e, status: 'rejected' as const } : e), GAME_CONTEXT, store.state!.game)).toEqual({ ok: false, seq: 2, reason: 'status' });
    expect(replayLog(log.slice(1), GAME_CONTEXT, store.state!.game)).toEqual({ ok: false, seq: 2, reason: 'order' });
    expect(replayLog(log.slice(0, 1), GAME_CONTEXT, store.state!.game)).toEqual({ ok: false, seq: 1, reason: 'snapshot' });
  });

  it('writes state and log in one transaction: a failed log write leaves the old state', () => {
    const state = fakeDurableState(); const store = sqlStore(state);
    let n = 100;
    const host = new GameHost(store, GAME_CONTEXT, () => n++, VERSION, () => 0);
    expect(host.command({ requestId: requestId(), seq: 1, command: { kind: 'createCommander', commander, replace: false } }, 'a'.repeat(64)).status).toBe(200);
    // Plant a log row for seq 2 so the next commit's log insert fails.
    state.db.prepare("INSERT INTO log (seq, request_id, command, seeds, status, content_version, at) VALUES (2, 'x', '{}', '[]', 'applied', 'v', 0)").run();
    const fresh = sqlStore(state); // a new instance reads from SQL, not the cache
    const before = fresh.load();
    expect(() => new GameHost(fresh, GAME_CONTEXT, () => n++, VERSION, () => 0)
      .command({ requestId: requestId(), seq: 2, command: { kind: 'depart', hard: false } }, 'b'.repeat(64))).toThrow();
    expect(sqlStore(state).load()).toEqual(before);
  });
});

// Development numbers for owner decision D8 (Free/Paid). Run: SERVER_MEASURE=1 npx vitest run tests/server-api.test.ts -t measure
// Node timings only; Workers CPU time is read from the deployed Worker (see the design note).
describe.runIf(process.env.SERVER_MEASURE === '1')('P09-02b measurements (Node, not Workers)', () => {
  it('reports response bytes and processing time per command', async () => {
    const s = server(Array.from({ length: 500 }, (_, i) => 1000 + i)); const { accountId, token } = await guest(s);
    const rows: string[] = []; let seq = 0;
    const timed = async (label: string, command: unknown) => {
      const t = performance.now(); const r = await send(s, token, { requestId: requestId(), seq: ++seq, command }); const text = await r.text();
      const ms = performance.now() - t; const body = JSON.parse(text);
      rows.push(`${label}\t${body.status ?? r.status}\t${new TextEncoder().encode(text).byteLength}\t${ms.toFixed(2)}`);
      return body;
    };
    await timed('createCommander', { kind: 'createCommander', commander, replace: false });
    await timed('depart(prologue)', { kind: 'depart', hard: false });
    let turns = battleTurns(storedGame(s, accountId)!);
    await timed(`battle(${turns.length} turns)`, { kind: 'battle', commands: turns });
    // A later camp: every map cleared, a full roster and bag (same shape as tests/client-view.test.ts).
    const store = s.objects.get(accountId)!.host['store'] as ReturnType<typeof sqlStore>;
    const cur = store.load()!;
    const { buy, newProfile } = await import('../src/core/world/profile');
    let p: Profile = { ...newProfile(GAME_CONTEXT.home, 4), tutorialDone: true, commander, cleared: GAME_CONTEXT.maps.map(m => m.id), campXp: 400000,
      bank: { ore: 9000, gold: 9000, seal: 60, dust: 9000 } };
    for (let i = 0; i < 6; i++) { const r = buy(p, GAME_CONTEXT.home, 'gearbox'); if (r.event.type !== 'blocked') p = r.profile; }
    seq++;
    store.commit({ game: { profile: p, run: null }, book: { ...cur.book, lastSeq: seq } }, { seq, requestId: requestId(), command: { kind: 'measure-inject' }, seeds: [], status: 'applied', contentVersion: VERSION, at: 0 });
    await timed('hire(late camp)', { kind: 'hire', index: 0 });
    await timed('depart(late camp)', { kind: 'depart', hard: false });
    for (let n = 0; n < 12; n++) {
      const g = storedGame(s, accountId)!;
      if (!g.run) break;
      if (g.run.battle) { turns = battleTurns(g); await timed(`battle(${turns.length} turns)`, { kind: 'battle', commands: turns }); continue; }
      let moved = false;
      for (const dir of ['right', 'down', 'up', 'left']) {
        const before = seq; const r = await timed('move', { kind: 'move', dir });
        if (r.status === 'applied') { moved = true; break; }
        rows.pop(); seq = before + 1;
      }
      if (!moved) break;
    }
    const t = performance.now(); const st = await call(s, '/v1/state', { headers: gameHeaders(token) }); const text = await st.text();
    rows.push(`state\t${st.status}\t${new TextEncoder().encode(text).byteLength}\t${(performance.now() - t).toFixed(2)}`);
    process.stderr.write(`label\tstatus\tbytes\tms\n${rows.join('\n')}\n`);
  });
});
