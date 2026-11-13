import { describe, expect, it } from 'vitest';
import { SESSION_HEADER, TELEMETRY_HEADER } from '../src/server/account-object';
import { ROTATE_GRACE_MS } from '../src/server/accounts';
import { CONTENT_HEADER, handle, LIMITS } from '../src/server/api';
import { DELETE_GRACE_MS, PURGE_MARGIN_MS, purgeDue } from '../src/server/deletion';
import { telemetryDay } from '../src/server/telemetry';
import { ROTATE_EVERY_MS, ServerClient, type ServerPort } from '../src/platform/server-client';
import { battleTurns, grantAdmin, server, storedGame, VERSION, type Server } from './fixtures/server-fakes';

// P09-03: device-credential rotation, daily telemetry totals (server-derived + fixed device error codes, no account
// id) and in-game feedback with audited admin reads. See docs/design/p09/TELEMETRY_P09_03_TH.md.

const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const post = (s: Server, path: string, body: unknown, token: string) =>
  call(s, path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...bearer(token) }, body: JSON.stringify(body) });
let ipN = 0;
async function guest(s: Server) {
  const r = await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': `192.0.2.${ipN++ % 250}` } });
  return await r.json() as { accountId: string; token: string };
}
const hex = (n: number, c: string) => c.repeat(n);
const nextOf = (token: string, c = 'c') => `${token.split('.')[0]}.${hex(64, c)}`;
const game = (token: string) => ({ ...bearer(token), [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: 'e'.repeat(32) });
const enter = (s: Server, token: string) => call(s, '/v1/session', { method: 'POST', headers: game(token) });
let rid = 0;
const send = (s: Server, token: string, seq: number, command: unknown) => call(s, '/v1/command', { method: 'POST', headers: { ...game(token), 'Content-Type': 'application/json' },
  body: JSON.stringify({ requestId: `request-tel-${String(++rid).padStart(8, '0')}`, seq, command }) });
const totals = (s: Server) => Object.fromEntries((s.d1.db.prepare('SELECT kind, key, SUM(count) AS n FROM telemetry_daily GROUP BY kind, key').all() as { kind: string; key: string; n: number }[]).map(r => [`${r.kind}|${r.key}`, r.n]));
const commander = { name: 'นับสถิติ', crest: 'star', color: 'gold', camp: 'ค่ายนับ' };

describe('P09-03 device-credential rotation', () => {
  it('replaces the secret, keeps the old one for the grace period only, and answers a retry the same', async () => {
    const s = server(); const a = await guest(s);
    const next = nextOf(a.token);
    expect(await (await post(s, '/v1/token/rotate', { token: next }, a.token)).json()).toEqual({ rotated: true });
    expect((await enter(s, next)).status).toBe(200);
    // The old secret still works for a lost answer, and the same rotation again succeeds.
    expect((await enter(s, a.token)).status).toBe(200);
    expect((await post(s, '/v1/token/rotate', { token: next }, a.token)).status).toBe(200);
    // Another next credential from the old secret: conflict. Another device id: refused.
    expect(await (await post(s, '/v1/token/rotate', { token: nextOf(a.token, 'd') }, a.token)).json()).toEqual({ error: 'rotate_conflict' });
    expect((await post(s, '/v1/token/rotate', { token: `${hex(32, '1')}.${hex(64, '2')}` }, next)).status).toBe(400);
    s.clock.t += ROTATE_GRACE_MS;
    expect((await enter(s, a.token)).status).toBe(401);
    expect((await enter(s, next)).status).toBe(200);
    const row = s.d1.db.prepare('SELECT token_hash, prev_hash, rotated_at FROM devices WHERE id = ?').get(a.token.split('.')[0]!) as Record<string, unknown>;
    expect(JSON.stringify(row)).not.toContain(next.split('.')[1]);
    expect(row.rotated_at).toBeGreaterThan(0);
  });

  it('the client rotates once a day, and recovers when a rotation answer was lost and the grace has passed', async () => {
    const s = server(); const store = new Map<string, string>();
    let drop = false; let clientNow = 1_000_000;
    const port: ServerPort = {
      fetch: async (url, init) => {
        s.clock.t += 1000;
        const r = await handle(new Request(url, init), s.deps);
        if (drop && url.endsWith('/v1/token/rotate')) { drop = false; throw new Error('lost'); }
        return r;
      },
      sleep: async () => {}, now: () => clientNow,
      randomHex: b => Array.from({ length: b * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
    const c = new ServerClient('https://api.test', VERSION, storage, port);
    expect((await c.enter()).kind).toBe('state');
    const first = store.get('fateweave-server-token:https://api.test')!;
    expect((await c.enter()).kind).toBe('state');
    expect(store.get('fateweave-server-token:https://api.test')).toBe(first);
    clientNow += ROTATE_EVERY_MS;
    expect((await new ServerClient('https://api.test', VERSION, storage, port).enter()).kind).toBe('state');
    const second = store.get('fateweave-server-token:https://api.test')!;
    expect(second).not.toBe(first); expect(second.split('.')[0]).toBe(first.split('.')[0]);
    // The server rotates but every answer is lost (all retries); the old secret then expires.
    clientNow += ROTATE_EVERY_MS; drop = true;
    const lostPort: ServerPort = { ...port, fetch: async (url, init) => { const r = await handle(new Request(url, init), s.deps); if (url.endsWith('/v1/token/rotate')) throw new Error('lost'); return r; } };
    await new ServerClient('https://api.test', VERSION, storage, lostPort).enter();
    expect(store.get('fateweave-server-token-next:https://api.test')).toBeTruthy();
    s.clock.t += ROTATE_GRACE_MS + 1000;
    const back = await new ServerClient('https://api.test', VERSION, storage, port).enter();
    expect(back.kind).toBe('state');
    expect(s.d1.db.prepare('SELECT COUNT(*) AS n FROM accounts').get()).toEqual({ n: 1 }); // no new guest account
    expect(store.has('fateweave-server-token-next:https://api.test')).toBe(false);
  });
});

describe('P09-03 telemetry', () => {
  it('counts sessions, commanders, runs and battles from what the server ran, and never passes the header on', async () => {
    const s = server(); const a = await guest(s);
    await enter(s, a.token);
    const made = await send(s, a.token, 1, { kind: 'createCommander', commander, replace: false });
    expect(made.headers.get(TELEMETRY_HEADER)).toBeNull();
    await send(s, a.token, 2, { kind: 'depart', hard: false });
    const g = storedGame(s, a.accountId)!;
    const encounter = g.run!.battle!.encounterId;
    await send(s, a.token, 3, { kind: 'battle', commands: battleTurns(g) });
    // A retry of the same request counts nothing more.
    const t = totals(s);
    expect(t['session|enter']).toBe(1);
    expect(t['commander|created']).toBe(1);
    expect(t[`run_start|${g.run!.mapId}`]).toBe(1);
    expect(t[`battle|${encounter}:won`]).toBe(1);
    expect(JSON.stringify(s.d1.db.prepare('SELECT * FROM telemetry_daily').all())).not.toContain(a.accountId);
    expect((s.d1.db.prepare('SELECT DISTINCT day FROM telemetry_daily').all() as { day: string }[]).map(r => r.day)).toEqual([telemetryDay(s.clock.t)]);
  });

  it('takes device error codes from a fixed list only, rate limited', async () => {
    const s = server(); const a = await guest(s);
    expect((await post(s, '/v1/telemetry', { events: [{ code: 'network', place: 'world' }, { code: 'js_error', place: 'battle' }] }, a.token)).status).toBe(204);
    expect((await post(s, '/v1/telemetry', { events: [{ code: 'my email is x', place: 'world' }] }, a.token)).status).toBe(400);
    expect((await post(s, '/v1/telemetry', { events: [] }, a.token)).status).toBe(400);
    expect((await post(s, '/v1/telemetry', { events: Array(11).fill({ code: 'server', place: 'title' }) }, a.token)).status).toBe(400);
    expect((await call(s, '/v1/telemetry', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })).status).toBe(401);
    expect(totals(s)).toEqual({ 'client_error|network:world': 1, 'client_error|js_error:battle': 1 });
    s.clock.t += 60_000;
    const statuses: number[] = [];
    for (let i = 0; i < LIMITS.telemetryPerMinute + 1; i++) {
      statuses.push((await handle(new Request('https://api.test/v1/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json', ...bearer(a.token) }, body: JSON.stringify({ events: [{ code: 'server', place: 'title' }] }) }), s.deps)).status);
    }
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('P09-03 feedback', () => {
  it('stores feedback with its account, checks it, limits it, refuses while deleting, and is purged with the account', async () => {
    const s = server(); const a = await guest(s);
    const sent = await post(s, '/v1/feedback', { category: 'bug', text: '  ศึกค้าง\u0007 ตอนกดโจมตี  ', place: 'battle' }, a.token);
    expect(sent.status).toBe(201);
    expect(s.d1.db.prepare('SELECT account_id, category, text, place, content_version FROM feedback').all())
      .toEqual([{ account_id: a.accountId, category: 'bug', text: 'ศึกค้าง ตอนกดโจมตี', place: 'battle', content_version: VERSION }]);
    for (const bad of [{ category: 'spam', text: 'x' }, { category: 'idea', text: '   ' }, { category: 'idea', text: 'ก'.repeat(1001) }, { category: 'idea' }]) {
      expect((await post(s, '/v1/feedback', bad, a.token)).status).toBe(400);
    }
    expect((await post(s, '/v1/feedback', { category: 'idea', text: 'ก'.repeat(1000), place: 'nowhere' }, a.token)).status).toBe(201);
    expect((await post(s, '/v1/feedback', { category: 'other', text: 'สาม' }, a.token)).status).toBe(201);
    expect((await post(s, '/v1/feedback', { category: 'other', text: 'สี่' }, a.token)).status).toBe(429);
    expect(totals(s)).toMatchObject({ 'feedback|bug': 1, 'feedback|idea': 1, 'feedback|other': 1 });
    await post(s, '/v1/account/delete', { confirm: 'delete' }, a.token);
    s.clock.t += 600_000;
    expect(await (await post(s, '/v1/feedback', { category: 'other', text: 'ห้า' }, a.token)).json()).toEqual({ error: 'account_deleting' });
    s.clock.t += DELETE_GRACE_MS + PURGE_MARGIN_MS;
    await purgeDue(s.d1, async () => true, s.clock.t);
    expect(s.d1.db.prepare('SELECT COUNT(*) AS n FROM feedback').get()).toEqual({ n: 0 });
  });

  it('lets only admins read feedback and telemetry, and audits every read', async () => {
    const s = server(); const a = await guest(s), boss = await guest(s);
    await post(s, '/v1/feedback', { category: 'idea', text: 'อยากได้โหมดเร็ว', place: 'lobby' }, a.token);
    expect(await (await call(s, '/v1/admin/feedback', { headers: bearer(a.token) })).json()).toEqual({ error: 'forbidden' });
    expect((await call(s, '/v1/admin/telemetry', { headers: bearer(a.token) })).status).toBe(403);
    expect(await (await call(s, '/v1/account', { headers: bearer(a.token) })).json()).not.toHaveProperty('admin');
    grantAdmin(s, boss.accountId);
    expect(await (await call(s, '/v1/account', { headers: bearer(boss.token) })).json()).toMatchObject({ admin: true });
    const fb = await (await call(s, '/v1/admin/feedback?limit=5', { headers: bearer(boss.token) })).json() as { rows: { accountId: string; text: string }[] };
    expect(fb.rows).toEqual([expect.objectContaining({ accountId: a.accountId, text: 'อยากได้โหมดเร็ว', category: 'idea', place: 'lobby' })]);
    const tel = await (await call(s, '/v1/admin/telemetry?days=7', { headers: bearer(boss.token) })).json() as { days: number; rows: unknown[] };
    expect(tel.days).toBe(7); expect(tel.rows).toEqual([expect.objectContaining({ kind: 'feedback', key: 'idea', count: 1 })]);
    expect(s.d1.db.prepare('SELECT admin_id, action, target, result FROM admin_audit ORDER BY id').all()).toEqual([
      { admin_id: boss.accountId, action: 'feedback_read', target: 'latest', result: 'rows:1' },
      { admin_id: boss.accountId, action: 'telemetry_read', target: 'days:7', result: 'rows:1' },
    ]);
  });
});
