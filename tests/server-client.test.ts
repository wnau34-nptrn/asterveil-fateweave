import { describe, expect, it } from 'vitest';
import { COMMANDER_COLORS, COMMANDER_CRESTS } from '../src/core/world/profile';
import type { StoragePort } from '../src/core/save/expedition-save';
import { SESSION_HEADER } from '../src/server/account-object';
import { CONTENT_HEADER, handle } from '../src/server/api';
import { SEND_ATTEMPTS, ServerClient, serverSwitch, type ServerPort } from '../src/platform/server-client';
import { gameFromView, resultFromReply } from '../src/ui/server-game';
import { currentSave } from './fixtures/current-save';
import { server, storedGame, VERSION, type Server } from './fixtures/server-fakes';

// P09-02c: the game's API client driven against the real Worker + Durable Object code in process (tests/fixtures).
// Covers the guest token, one-at-a-time `{requestId, seq, command}`, retry on the same requestId after a lost answer,
// catching up on 409 stale, the D12 one-session lock (423) and the content version. See docs/design/p09/CLIENT_SERVER_P09_02C_TH.md.

const BASE = 'https://api.test';
const commander = { name: 'ทดสอบ', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: 'ค่ายทดสอบ' };
const memory = (): StoragePort & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: k => { data.delete(k); } };
};
let n = 0;
interface Wire extends ServerPort { down: boolean; dropAnswers: number; seen: { path: string; body: string }[] }
function wire(s: Server): Wire {
  const w: Wire = {
    down: false, dropAnswers: 0, seen: [],
    async fetch(url, init) {
      if (w.down) throw new TypeError('offline');
      const body = typeof init.body === 'string' ? init.body : '';
      w.seen.push({ path: new URL(url).pathname, body });
      s.clock.t += 1000; // under the per-second limits
      const r = await handle(new Request(url, init), s.deps);
      // The server ran it, but the answer is lost on the way back.
      if (w.dropAnswers > 0 && new URL(url).pathname === '/v1/command') { w.dropAnswers--; throw new TypeError('connection reset'); }
      return r;
    },
    sleep: async () => {},
    randomHex: bytes => (++n).toString(16).padStart(bytes * 2, '0'),
  };
  return w;
}
const lastSeqOf = async (c: ServerClient) => { const st = await c.state(); return st.kind === 'state' ? st.state.lastSeq : -1; };

describe('P09-02c server client', () => {
  it('makes a guest account once, enters, and plays commands that come back as seed-free views', async () => {
    const s = server(); const store = memory(); const w = wire(s);
    const c = new ServerClient(BASE, VERSION, store, w);
    expect(await c.enter()).toEqual({ kind: 'state', state: { lastSeq: 0, view: null } });
    expect([...store.data.keys()].sort()).toEqual([`fateweave-server-token-at:${BASE}`, `fateweave-server-token:${BASE}`]);
    const out = await c.send({ kind: 'createCommander', commander, replace: false });
    if (out.kind !== 'reply' || out.reply.status !== 'applied') throw new Error(JSON.stringify(out));
    expect('seed' in out.reply.view.profile).toBe(false);
    expect(out.reply.view.hireBoard.length).toBeGreaterThan(0);
    // The shell's adapter turns the view into a game for display only (zeros where the server keeps the draws).
    const result = resultFromReply(out.reply);
    if ('rejected' in result) throw new Error('rejected');
    expect(result.game.profile.commander?.name).toBe('ทดสอบ'); expect(result.game.profile.seed).toBe(0);
    const depart = await c.send({ kind: 'depart', hard: false });
    expect(depart.kind === 'reply' && depart.reply.seq).toBe(2);
    // A refusal by the rules still uses its number; the next command goes on from there.
    const refused = await c.send({ kind: 'hire', index: 0 });
    expect(refused).toMatchObject({ kind: 'reply', reply: { seq: 3, status: 'rejected' } });
    expect(await lastSeqOf(c)).toBe(3);
    // A second page on the same browser reuses the token (same account).
    const again = new ServerClient(BASE, VERSION, store, w);
    const entered = await again.enter();
    expect(entered.kind === 'state' && entered.state.lastSeq).toBe(3);
    expect(entered.kind === 'state' && gameFromView(entered.state.view!).run?.mapId).toBeTruthy();
  });

  it('sends a request whose answer was lost again with the same requestId, and the server runs it once', async () => {
    const s = server(); const w = wire(s);
    const c = new ServerClient(BASE, VERSION, memory(), w);
    await c.enter();
    w.dropAnswers = 1;
    const out = await c.send({ kind: 'createCommander', commander, replace: false });
    expect(out).toMatchObject({ kind: 'reply', reply: { seq: 1, status: 'applied' } });
    const sent = w.seen.filter(x => x.path === '/v1/command').map(x => JSON.parse(x.body) as { requestId: string; seq: number });
    expect(sent).toHaveLength(2); expect(sent[1]).toEqual(sent[0]);
    const host = [...s.objects.values()][0]!;
    expect(host.state.db.prepare('SELECT COUNT(*) AS n FROM log').get()).toEqual({ n: 1 });
  });

  it('keeps an unanswered request through an outage and retries it unchanged when asked', async () => {
    const s = server(); const w = wire(s);
    const c = new ServerClient(BASE, VERSION, memory(), w);
    await c.enter();
    w.down = true;
    expect(await c.send({ kind: 'createCommander', commander, replace: false })).toEqual({ kind: 'failed', reason: 'network' });
    expect(c.waitingRetry).toBe(true);
    // Nothing new is sent while a request is still unanswered.
    expect(await c.send({ kind: 'depart', hard: false })).toEqual({ kind: 'failed', reason: 'network' });
    w.down = false; w.dropAnswers = 1; w.seen.length = 0;
    // The answer is lost once more after the server ran it: the retry inside `retry()` gets the stored answer.
    expect(await c.retry()).toMatchObject({ kind: 'reply', reply: { seq: 1, status: 'applied' } });
    expect(c.waitingRetry).toBe(false);
    expect(new Set(w.seen.map(x => x.body)).size).toBe(1);
    expect(SEND_ATTEMPTS).toBeGreaterThan(1);
  });

  it('catches up with the server on 409 stale without running the command', async () => {
    const s = server(); const store = memory(); const w = wire(s);
    const c = new ServerClient(BASE, VERSION, store, w);
    await c.enter();
    await c.send({ kind: 'createCommander', commander, replace: false });
    // The same session's state moved on without this client knowing (e.g. an answer it never saw).
    const token = store.data.get(`fateweave-server-token:${BASE}`)!;
    const direct = await handle(new Request(`${BASE}/v1/command`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: c.session, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'outside-request-0001', seq: 2, command: { kind: 'depart', hard: false } }) }), s.deps);
    expect(direct.status).toBe(200);
    const out = await c.send({ kind: 'refreshBoard' });
    if (out.kind !== 'resynced') throw new Error(JSON.stringify(out));
    expect(out.state.lastSeq).toBe(2); expect(out.state.view?.run).not.toBeNull();
    // The next command continues from the server's number.
    expect(await c.send({ kind: 'rest' })).toMatchObject({ kind: 'reply', reply: { seq: 3 } });
  });

  it('stops the page another session replaced (423) until it enters again (D12)', async () => {
    const s = server(); const store = memory(); const w = wire(s);
    const first = new ServerClient(BASE, VERSION, store, w);
    await first.enter();
    await first.send({ kind: 'createCommander', commander, replace: false });
    const second = new ServerClient(BASE, VERSION, store, w);
    expect((await second.enter()).kind).toBe('state');
    expect(await first.send({ kind: 'depart', hard: false })).toEqual({ kind: 'otherDevice' });
    expect(first.waitingRetry).toBe(false);
    expect((await first.state()).kind).toBe('otherDevice');
    expect((await second.send({ kind: 'depart', hard: false })).kind).toBe('reply');
    const back = await first.enter();
    expect(back.kind === 'state' && back.state.lastSeq).toBe(2);
    expect(await second.send({ kind: 'rest' })).toEqual({ kind: 'otherDevice' });
  });

  it('reports a content version the server does not run, and starts a new guest when the token is unknown', async () => {
    const s = server(); const store = memory();
    expect(await new ServerClient(BASE, 'old-build', store, wire(s)).enter()).toEqual({ kind: 'failed', reason: 'content_version' });
    store.data.set(`fateweave-server-token:${BASE}`, `${'0'.repeat(32)}.${'0'.repeat(64)}`);
    const c = new ServerClient(BASE, VERSION, store, wire(s));
    expect(await c.enter()).toEqual({ kind: 'state', state: { lastSeq: 0, view: null } });
    expect(store.data.get(`fateweave-server-token:${BASE}`)).not.toBe(`${'0'.repeat(32)}.${'0'.repeat(64)}`);
  });
});

describe('P09-02c server switch', () => {
  it('is off by default, remembers an https address, and turns off again', () => {
    const store = memory();
    expect(serverSwitch('', store)).toBeUndefined();
    expect(serverSwitch('?server=http://evil.example', store)).toBeUndefined();
    expect(serverSwitch('?server=javascript:alert(1)', store)).toBeUndefined();
    expect(serverSwitch('?server=https://api.example.dev/path?q=1', store)).toBe('https://api.example.dev');
    expect(serverSwitch('', store)).toBe('https://api.example.dev');
    expect(serverSwitch('?server=off', store)).toBeUndefined();
    expect(serverSwitch('', store)).toBeUndefined();
    expect(serverSwitch('?server=http://localhost:8787', store)).toBe('http://localhost:8787');
    expect(serverSwitch('?server=off', store, 'https://preset.example.dev')).toBeUndefined();
    expect(serverSwitch('', store, 'https://preset.example.dev')).toBeUndefined();
    expect(serverSwitch('', memory(), 'https://preset.example.dev')).toBe('https://preset.example.dev');
  });

  it('P09-02e: imports the local save once; a retry after a lost answer is the same request', async () => {
    const s = server(); const w = wire(s);
    // Another account plays a little; its game written as a local save is the save this device holds.
    const other = new ServerClient(BASE, VERSION, memory(), w);
    await other.enter(); await other.send({ kind: 'createCommander', commander, replace: false });
    const raw = currentSave(storedGame(s, [...s.objects.keys()][0]!)!);
    const c = new ServerClient(BASE, VERSION, memory(), w);
    await c.enter();
    const fetch = w.fetch; let lost = 1;
    w.fetch = async (url, init) => { const r = await fetch(url, init); if (lost > 0 && new URL(url).pathname === '/v1/import') { lost--; throw new TypeError('connection reset'); } return r; };
    s.clock.t += 60_000;
    const out = await c.importSave(raw);
    if (out.kind !== 'imported') throw new Error(JSON.stringify(out));
    expect(out.from).toBe(58); expect(out.state.view?.profile.commander?.name).toBe('ทดสอบ');
    const imports = w.seen.filter(x => x.path === '/v1/import').map(x => (JSON.parse(x.body) as { requestId: string }).requestId);
    expect(imports).toHaveLength(2); expect(new Set(imports).size).toBe(1);
    // The game goes on from the imported save; the same save cannot go into a second account.
    expect(await c.send({ kind: 'hire', index: 99 })).toMatchObject({ kind: 'reply', reply: { seq: 1 } });
    const third = new ServerClient(BASE, VERSION, memory(), w);
    await third.enter(); s.clock.t += 60_000;
    expect(await third.importSave(raw)).toEqual({ kind: 'refused', error: 'fingerprint_used' });
  });
});
