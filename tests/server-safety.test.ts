import { describe, expect, it } from 'vitest';
import { SESSION_HEADER } from '../src/server/account-object';
import { CONTENT_HEADER, handle, LIMITS, RateLimiter } from '../src/server/api';
import { DELETE_GRACE_MS, PURGE_MARGIN_MS, purgeDue } from '../src/server/deletion';
import { durableGate, handleLimitRequest, ipKey, type RateGate } from '../src/server/rate-limit';
import { legacyImportOpen } from '../src/server/worker';
import { ServerClient, type ServerPort } from '../src/platform/server-client';
import { withGoogle } from './fixtures/google-fake';
import { server, VERSION, type Server } from './fixtures/server-fakes';

// P09-02g: account deletion with a 14-day grace period and the hourly purge, rate limits that hold across isolates, and
// the dated close of local-save import. See docs/design/p09/SAFETY_P09_02G_TH.md.

const DAY = 24 * 60 * 60 * 1000;
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
const post = (s: Server, path: string, body: unknown, token?: string, ip = '198.51.100.7') =>
  call(s, path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
let ipN = 0;
async function guest(s: Server) {
  const r = await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': `203.0.113.${ipN++ % 250}` } });
  return await r.json() as { accountId: string; token: string };
}
let n = 0;
const deviceToken = () => { n++; return `${n.toString(16).padStart(32, 'a')}.${n.toString(16).padStart(64, 'b')}`; };
const game = (token: string) => ({ Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: 'f'.repeat(32) });
const enter = (s: Server, token: string) => call(s, '/v1/session', { method: 'POST', headers: game(token) });
const info = async (s: Server, token: string) => (await call(s, '/v1/account', { headers: { Authorization: `Bearer ${token}` } })).json() as Promise<Record<string, unknown>>;
const purge = (s: Server) => purgeDue(s.d1, async id => (await s.deps.game(id).fetch(new Request('https://game/purge', { method: 'POST' }))).status === 200, s.clock.t);
const audit = (s: Server, id: string) => (s.d1.db.prepare('SELECT action, detail FROM account_audit WHERE account_id = ? ORDER BY id').all(id) as { action: string; detail: string }[]);
const commander = { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายลบ' };
async function play(s: Server, token: string) {
  await enter(s, token);
  const r = await call(s, '/v1/command', { method: 'POST', headers: { ...game(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: 'request-del-0000001', seq: 1, command: { kind: 'createCommander', commander, replace: false } }) });
  expect(r.status).toBe(200);
}

describe('P09-02g account deletion', () => {
  it('needs the confirm word, then waits 14 days: other devices are signed out, the game refuses, the account can still be read', async () => {
    const s = server(); const a = await guest(s); await play(s, a.token);
    const other = deviceToken();
    s.d1.db.prepare('INSERT INTO devices (id, account_id, token_hash, created_at, last_seen) VALUES (?, ?, ?, 0, 0)').run(other.split('.')[0]!, a.accountId, 'x');
    expect(await (await post(s, '/v1/account/delete', {}, a.token)).json()).toEqual({ error: 'confirm_required' });
    expect((await post(s, '/v1/account/delete', { confirm: 'yes' }, a.token)).status).toBe(400);
    const asked = s.clock.t + 1000;
    const r = await post(s, '/v1/account/delete', { confirm: 'delete' }, a.token);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ accountId: a.accountId, status: 'deleting', google: false, recoveryCodeAt: null, deleteAfter: asked + DELETE_GRACE_MS });
    expect(s.d1.db.prepare('SELECT COUNT(*) AS n FROM devices WHERE account_id = ? AND revoked_at IS NULL').get(a.accountId)).toEqual({ n: 1 });
    // Asking again keeps the first deadline.
    expect((await (await post(s, '/v1/account/delete', { confirm: 'delete' }, a.token)).json() as { deleteAfter: number }).deleteAfter).toBe(asked + DELETE_GRACE_MS);
    // Game routes and other account routes refuse; reading the account works.
    const refused = await enter(s, a.token);
    expect(refused.status).toBe(403); expect(await refused.json()).toEqual({ error: 'account_deleting' });
    expect((await post(s, '/v1/recovery-code', {}, a.token)).status).toBe(403);
    expect((await info(s, a.token)).status).toBe('deleting');
    expect(audit(s, a.accountId)).toEqual([{ action: 'delete_requested', detail: 'revoked:1' }]);
    // Nothing is purged inside the grace period (or before the margin after it).
    s.clock.t = asked + DELETE_GRACE_MS + PURGE_MARGIN_MS - 5000;
    expect(await purge(s)).toEqual({ due: 0, purged: 0, failed: 0 });
    expect(s.objects.has(a.accountId)).toBe(true);
  });

  it('cancels from the same device or after signing in again on another device, back to guest or linked', async () => {
    const s = server(); const g = await withGoogle(s);
    const a = await guest(s); await play(s, a.token);
    await post(s, '/v1/link', { idToken: await g.token({ sub: 'g-del' }) }, a.token);
    await post(s, '/v1/account/delete', { confirm: 'delete' }, a.token);
    // A new device signs in with Google while the account waits, and cancels.
    const fresh = deviceToken();
    expect(await (await post(s, '/v1/signin', { idToken: await g.token({ sub: 'g-del' }), token: fresh })).json()).toEqual({ accountId: a.accountId });
    const back = await post(s, '/v1/account/cancel', {}, fresh);
    expect(back.status).toBe(200); expect(await back.json()).toMatchObject({ status: 'linked', deleteAfter: null });
    expect((await enter(s, fresh)).status).toBe(200);
    expect(await (await post(s, '/v1/account/cancel', {}, fresh)).json()).toEqual({ error: 'not_deleting' });
    // A guest account, cancelled from its own device with its recovery code used on a new one.
    const b = await guest(s);
    const { code } = await (await post(s, '/v1/recovery-code', {}, b.token)).json() as { code: string };
    await post(s, '/v1/account/delete', { confirm: 'delete' }, b.token);
    const viaCode = deviceToken();
    expect((await post(s, '/v1/recover', { code, token: viaCode })).status).toBe(200);
    expect(await (await post(s, '/v1/account/cancel', {}, viaCode)).json()).toMatchObject({ status: 'guest', deleteAfter: null });
    expect(audit(s, b.accountId).map(r => r.action)).toEqual(['delete_requested', 'delete_cancelled']);
  });

  it('after the grace period refuses to cancel, then the purge removes the Durable Object data and every D1 row, once', async () => {
    const s = server(); const g = await withGoogle(s);
    const a = await guest(s); await play(s, a.token);
    await post(s, '/v1/link', { idToken: await g.token({ sub: 'g-gone' }) }, a.token);
    await post(s, '/v1/recovery-code', {}, a.token);
    s.d1.db.prepare('INSERT INTO admins (account_id, granted_at) VALUES (?, 0)').run(a.accountId);
    const keep = await guest(s); await play(s, keep.token);
    await post(s, '/v1/account/delete', { confirm: 'delete' }, a.token);
    s.clock.t += DELETE_GRACE_MS;
    expect(await (await post(s, '/v1/account/cancel', {}, a.token)).json()).toEqual({ error: 'too_late' });
    s.clock.t += PURGE_MARGIN_MS;
    // The object fails once: D1 is left as it is, and the next run retries.
    expect(await purgeDue(s.d1, async () => false, s.clock.t)).toEqual({ due: 1, purged: 0, failed: 1 });
    expect(s.d1.db.prepare('SELECT COUNT(*) AS n FROM accounts WHERE id = ?').get(a.accountId)).toEqual({ n: 1 });
    expect(await purge(s)).toEqual({ due: 1, purged: 1, failed: 0 });
    expect(s.objects.has(a.accountId)).toBe(false);
    for (const t of ['accounts WHERE id', 'devices WHERE account_id', 'identities WHERE account_id', 'recovery_codes WHERE account_id', 'admins WHERE account_id']) {
      expect(s.d1.db.prepare(`SELECT COUNT(*) AS n FROM ${t} = ?`).get(a.accountId)).toEqual({ n: 0 });
    }
    expect(audit(s, a.accountId).map(r => r.action)).toEqual(['delete_requested', 'purged']);
    expect(JSON.stringify(s.d1.db.prepare('SELECT * FROM account_audit').all())).not.toContain('g-gone');
    // The old credential is dead (the Google identity row is gone above); the other account is untouched.
    expect((await info(s, a.token).catch(() => null))).toEqual({ error: 'unauthorized' });
    expect((await enter(s, keep.token)).status).toBe(200);
    expect(await purge(s)).toEqual({ due: 0, purged: 0, failed: 0 });
  });

  it('the client maps 403 account_deleting to the deleting state and calls delete/cancel', async () => {
    const s = server(); const port: ServerPort = {
      fetch: (url, init) => { s.clock.t += 1000; return handle(new Request(url, init), s.deps); },
      sleep: async () => {}, randomHex: b => Array.from({ length: b * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };
    const store = new Map<string, string>();
    const c = new ServerClient('https://api.test', VERSION, { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); }, removeItem: k => { store.delete(k); } }, port);
    expect((await c.enter()).kind).toBe('state');
    const asked = await c.deleteAccount();
    expect(asked.kind === 'ok' && asked.value.status).toBe('deleting');
    expect(await c.enter()).toEqual({ kind: 'failed', reason: 'deleting' });
    expect(await c.state()).toEqual({ kind: 'failed', reason: 'deleting' });
    const back = await c.cancelDeletion();
    expect(back.kind === 'ok' && back.value.status).toBe('guest');
    expect((await c.enter()).kind).toBe('state');
  });
});

// Two Worker isolates (each with its own in-memory filter) that share one Durable Object gate.
function sharedGate(clock: { t: number }): RateGate {
  const objects = new Map<string, RateLimiter>();
  return durableGate({
    idFromName: name => name,
    get: id => ({ fetch: r => { const key = id as string; if (!objects.has(key)) objects.set(key, new RateLimiter()); return handleLimitRequest(objects.get(key)!, r, clock.t); } }),
  });
}

describe('P09-02g rate limits across isolates', () => {
  it('holds the guest limit per IP (and per IPv6 /64) when requests land on different isolates', async () => {
    const s = server(); const gate = sharedGate(s.clock);
    const isolates = [new RateLimiter(), new RateLimiter(), new RateLimiter()];
    const make = (i: number, ip: string) => handle(new Request('https://api.test/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': ip } }), { ...s.deps, limiter: isolates[i % 3]!, gate });
    const statuses: number[] = [];
    for (let i = 0; i < LIMITS.guestPerMinute + 3; i++) statuses.push((await make(i, `2001:db8:1:2:${i.toString(16)}::1`)).status);
    expect(statuses.filter(x => x === 201)).toHaveLength(LIMITS.guestPerMinute);
    expect(statuses.slice(-3)).toEqual([429, 429, 429]);
    // Another network is not affected; a minute later the same one may again.
    expect((await make(0, '198.51.100.20')).status).toBe(201);
    s.clock.t += 61_000;
    expect((await make(1, '2001:db8:1:2::9')).status).toBe(201);
  });

  it('counts commands in the account Durable Object, whichever isolate forwards them', async () => {
    const s = server(); const a = await guest(s); await enter(s, a.token);
    const isolates = Array.from({ length: LIMITS.commandPerSecond + 2 }, () => new RateLimiter());
    const statuses: number[] = [];
    for (let i = 0; i < isolates.length; i++) {
      const r = await handle(new Request('https://api.test/v1/command', { method: 'POST', headers: { ...game(a.token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: `request-lim-${String(i).padStart(6, '0')}`, seq: 99, command: { kind: 'rest' } }) }), { ...s.deps, limiter: isolates[i]! });
      statuses.push(r.status);
    }
    expect(statuses.filter(x => x === 429)).toHaveLength(2);
    expect(statuses.slice(-2)).toEqual([429, 429]);
  });

  it('lets requests through when the limiter object cannot be reached, and normalizes addresses', async () => {
    const broken = durableGate({ idFromName: n => n, get: () => ({ fetch: () => Promise.reject(new Error('down')) }) });
    expect(await broken.allow('guest:x', 1, 60_000)).toBe(true);
    expect(ipKey('2001:0db8:0001:0002:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:1:2::/64');
    expect(ipKey('2001:db8:1:2::1')).toBe('2001:db8:1:2::/64');
    expect(ipKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(ipKey('::1')).toBe('0:0:0:0::/64');
    expect(ipKey(' 203.0.113.9 ')).toBe('203.0.113.9');
    expect(ipKey(null)).toBe('unknown');
    const lim = new RateLimiter();
    expect((await handleLimitRequest(lim, new Request('https://limit/allow', { method: 'POST', body: '{"key":"k","limit":0,"windowMs":1}' }), 0)).status).toBe(400);
    expect((await handleLimitRequest(lim, new Request('https://limit/other', { method: 'POST', body: '{}' }), 0)).status).toBe(404);
  });
});

describe('P09-02g dated close of local-save import (D11)', () => {
  it('is open until LEGACY_IMPORT=closed or until LEGACY_IMPORT_UNTIL passes; a bad date closes it', () => {
    const at = Date.parse('2026-12-01T00:00:00+07:00');
    expect(legacyImportOpen({}, at)).toBe(true);
    expect(legacyImportOpen({ LEGACY_IMPORT: 'open' }, at)).toBe(true);
    expect(legacyImportOpen({ LEGACY_IMPORT: 'closed' }, at)).toBe(false);
    expect(legacyImportOpen({ LEGACY_IMPORT_UNTIL: '2026-12-01T00:00:00+07:00' }, at - 1)).toBe(true);
    expect(legacyImportOpen({ LEGACY_IMPORT_UNTIL: '2026-12-01T00:00:00+07:00' }, at)).toBe(false);
    expect(legacyImportOpen({ LEGACY_IMPORT_UNTIL: 'soon' }, at)).toBe(false);
    expect(DAY * 14).toBe(DELETE_GRACE_MS);
  });
});
