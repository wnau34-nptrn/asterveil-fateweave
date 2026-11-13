import { describe, expect, it } from 'vitest';
import { COMMANDER_COLORS, COMMANDER_CRESTS } from '../src/core/world/profile';
import type { StoragePort } from '../src/core/save/expedition-save';
import { SESSION_HEADER } from '../src/server/account-object';
import { normalizeCode } from '../src/server/accounts';
import { CONTENT_HEADER, handle, LIMITS } from '../src/server/api';
import { googleVerifier } from '../src/server/google';
import { ServerClient, type ServerPort } from '../src/platform/server-client';
import { CLIENT_ID, fakeGoogle, withGoogle } from './fixtures/google-fake';
import { server, VERSION, type Server } from './fixtures/server-fakes';

// P09-02d (owner D1): Google ID-token checks (iss/aud/exp/signature against the JWKS), linking a guest account to
// Google, signing in on another device, one-time recovery codes stored as hashes only, and the D12 lock after a move.
// See docs/design/p09/ACCOUNT_P09_02D_TH.md.

const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
const post = (s: Server, path: string, body: unknown, token?: string) =>
  call(s, path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.7', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
async function guest(s: Server) {
  const r = await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': `203.0.113.${Math.floor(Math.random() * 200)}` } });
  return await r.json() as { accountId: string; token: string };
}
let n = 0;
const deviceToken = () => { n++; return `${n.toString(16).padStart(32, 'd')}.${n.toString(16).padStart(64, 'e')}`; };
const enter = (s: Server, token: string, session: string) => call(s, '/v1/session', { method: 'POST', headers: { Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: session } });
const state = (s: Server, token: string, session: string) => call(s, '/v1/state', { headers: { Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: session } });

describe('P09-02d Google ID token check', () => {
  it('accepts a token signed by a Google key with our audience, issuer and a live expiry, and only reads the subject', async () => {
    const g = await fakeGoogle(); const verify = googleVerifier(CLIENT_ID, () => g.jwks()); const now = Date.now();
    expect(await verify(await g.token(), now)).toEqual({ ok: true, sub: '1234567890' });
    expect(await verify(await g.token({ iss: 'accounts.google.com' }), now)).toEqual({ ok: true, sub: '1234567890' });
    // The key set is fetched once and cached.
    await verify(await g.token({ sub: 'x2' }), now);
    expect(g.fetches).toBe(1);
  });

  it('refuses wrong issuer, audience, authorized party, expiry, algorithm, signature and malformed tokens', async () => {
    const g = await fakeGoogle(); const verify = googleVerifier(CLIENT_ID, () => g.jwks()); const now = Date.now(); const sec = Math.floor(now / 1000);
    const reason = async (t: string) => { const r = await verify(t, now); return r.ok ? 'ok' : r.reason; };
    expect(await reason(await g.token({ iss: 'https://evil.example' }))).toBe('issuer');
    expect(await reason(await g.token({ aud: 'other.apps.googleusercontent.com' }))).toBe('audience');
    expect(await reason(await g.token({ azp: 'other.apps.googleusercontent.com' }))).toBe('audience');
    expect(await reason(await g.token({ exp: sec - 120 }))).toBe('expired');
    expect(await reason(await g.token({ exp: sec - 30 }))).toBe('ok'); // 60 s skew
    expect(await reason(await g.token({ iat: sec + 600 }))).toBe('expired');
    expect(await reason(await g.token({}, { alg: 'HS256' }))).toBe('algorithm');
    const good = await g.token(); const [h, , sig] = good.split('.');
    const forged = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 'victim', exp: sec + 3600 })).toString('base64url');
    expect(await reason(`${h}.${forged}.${sig}`)).toBe('signature');
    const stranger = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    expect(await reason(await g.token({}, { key: stranger.privateKey }))).toBe('signature');
    for (const bad of ['', 'a.b', 'a.b.c', `${h}.!!.${sig}`, 'x'.repeat(5000)]) expect(await reason(bad)).toBe('malformed');
    expect(await reason(await g.token({ sub: 'has space' }))).toBe('malformed');
  });

  it('fetches the key set again once when Google rotates in a new key id, at most once a minute, and reports an unreachable JWKS', async () => {
    const g = await fakeGoogle(); const verify = googleVerifier(CLIENT_ID, () => g.jwks()); let now = Date.now();
    expect((await verify(await g.token(), now)).ok).toBe(true);
    const oldKid = g.kid; await g.rotate();
    now += 30_000; // within a minute of the last fetch: no new fetch for an unknown key
    expect(await verify(await g.token({}, { kid: 'kid-unknown' }), now)).toEqual({ ok: false, reason: 'key' });
    now += 31_000;
    expect((await verify(await g.token(), now)).ok).toBe(true);
    expect(g.fetches).toBe(2);
    expect(await verify(await g.token({}, { kid: oldKid }), now)).toEqual({ ok: false, reason: 'key' });
    const down = await fakeGoogle(); down.fail = true;
    expect(await googleVerifier(CLIENT_ID, () => down.jwks())(await down.token(), Date.now())).toEqual({ ok: false, reason: 'jwks' });
  });
});

describe('P09-02d account routes', () => {
  it('links a guest account to Google, stores only the subject, is idempotent and never merges accounts', async () => {
    const s = server(); const g = await withGoogle(s);
    const a = await guest(s), b = await guest(s);
    const info = await call(s, '/v1/account', { headers: { Authorization: `Bearer ${a.token}` } });
    expect(await info.json()).toEqual({ accountId: a.accountId, status: 'guest', google: false, recoveryCodeAt: null, deleteAfter: null });
    const linked = await post(s, '/v1/link', { idToken: await g.token({ sub: 'g-a' }) }, a.token);
    expect(linked.status).toBe(200);
    expect(await linked.json()).toEqual({ accountId: a.accountId, status: 'linked', google: true, recoveryCodeAt: null, deleteAfter: null });
    expect(s.d1.db.prepare('SELECT * FROM identities').all()).toEqual([{ provider: 'google', subject: 'g-a', account_id: a.accountId, linked_at: expect.any(Number) }]);
    expect(JSON.stringify(s.d1.db.prepare('SELECT * FROM identities, accounts').all())).not.toContain('example.com');
    // Again (a retried request): still linked, one row.
    expect((await post(s, '/v1/link', { idToken: await g.token({ sub: 'g-a' }) }, a.token)).status).toBe(200);
    // The same Google identity on another account: refused, not merged. Another Google on a linked account: refused.
    expect(await (await post(s, '/v1/link', { idToken: await g.token({ sub: 'g-a' }) }, b.token)).json()).toEqual({ error: 'identity_in_use' });
    expect(await (await post(s, '/v1/link', { idToken: await g.token({ sub: 'g-other' }) }, a.token)).json()).toEqual({ error: 'already_linked' });
    expect(s.d1.db.prepare('SELECT COUNT(*) AS n FROM identities').get()).toEqual({ n: 1 });
    // Bad tokens and missing auth.
    const bad = await post(s, '/v1/link', { idToken: await g.token({ aud: 'nope' }) }, b.token);
    expect(bad.status).toBe(401); expect(await bad.json()).toEqual({ error: 'google_token', reason: 'audience' });
    expect((await post(s, '/v1/link', { idToken: 'x' })).status).toBe(401);
    expect((await call(s, '/v1/link', { method: 'POST', headers: { Authorization: `Bearer ${b.token}`, 'Content-Type': 'text/plain' }, body: '{}' })).status).toBe(415);
    expect((await call(s, '/v1/link', { method: 'GET', headers: { Authorization: `Bearer ${b.token}` } })).status).toBe(405);
    // No client id configured: 503.
    delete s.deps.google;
    expect((await post(s, '/v1/link', { idToken: 'x' }, b.token)).status).toBe(503);
  });

  it('signs in on a new device to the same account, which then takes the account over (D12)', async () => {
    const s = server(); const g = await withGoogle(s);
    const a = await guest(s);
    await post(s, '/v1/link', { idToken: await g.token({ sub: 'g-move' }) }, a.token);
    expect((await enter(s, a.token, 'a'.repeat(32))).status).toBe(200);
    const fresh = deviceToken();
    const r = await post(s, '/v1/signin', { idToken: await g.token({ sub: 'g-move' }), token: fresh });
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ accountId: a.accountId });
    // A retry with the same device credential succeeds again and adds no second device.
    expect(await (await post(s, '/v1/signin', { idToken: await g.token({ sub: 'g-move' }), token: fresh })).json()).toEqual({ accountId: a.accountId });
    expect(s.d1.db.prepare('SELECT COUNT(*) AS n FROM devices WHERE account_id = ?').get(a.accountId)).toEqual({ n: 2 });
    expect(JSON.stringify(s.d1.db.prepare('SELECT * FROM devices').all())).not.toContain(fresh.split('.')[1]);
    expect((await enter(s, fresh, 'b'.repeat(32))).status).toBe(200);
    expect((await state(s, a.token, 'a'.repeat(32))).status).toBe(423);
    expect((await state(s, fresh, 'b'.repeat(32))).status).toBe(200);
    // Unknown Google identity, malformed device credential, a credential id already used by another account.
    expect(await (await post(s, '/v1/signin', { idToken: await g.token({ sub: 'g-new' }), token: deviceToken() })).json()).toEqual({ error: 'not_linked' });
    expect((await post(s, '/v1/signin', { idToken: await g.token({ sub: 'g-move' }), token: 'short' })).status).toBe(400);
    const other = await guest(s);
    expect((await post(s, '/v1/signin', { idToken: await g.token({ sub: 'g-move' }), token: other.token })).status).toBe(400);
    expect((await post(s, '/v1/signin', { idToken: await g.token({ sub: 'g-move', exp: 1 }), token: deviceToken() })).status).toBe(401);
  });

  it('issues a recovery code shown once, keeps only its hash, uses it once, and replaces it when issued again', async () => {
    const s = server(); const a = await guest(s);
    const issued = await post(s, '/v1/recovery-code', {}, a.token);
    expect(issued.status).toBe(201);
    const { code } = await issued.json() as { code: string };
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){4}[0-9A-HJKMNP-TV-Z]{4}$/);
    const dump = JSON.stringify(s.d1.db.prepare('SELECT * FROM recovery_codes').all());
    expect(dump).not.toContain(code.replaceAll('-', '')); expect(dump).toContain(a.accountId);
    expect((await (await call(s, '/v1/account', { headers: { Authorization: `Bearer ${a.token}` } })).json() as { recoveryCodeAt: number }).recoveryCodeAt).toBeGreaterThan(0);
    // A second code replaces the first.
    const second = (await (await post(s, '/v1/recovery-code', {}, a.token)).json() as { code: string }).code;
    expect((await post(s, '/v1/recover', { code, token: deviceToken() })).status).toBe(404);
    // Typed loosely (lower case, no dashes, O for 0): accepted once.
    const loose = second.replaceAll('-', '').toLowerCase().replaceAll('0', 'o');
    const device = deviceToken();
    const used = await post(s, '/v1/recover', { code: loose, token: device });
    expect(used.status).toBe(200); expect(await used.json()).toEqual({ accountId: a.accountId });
    expect((await enter(s, device, 'c'.repeat(32))).status).toBe(200);
    // The retry of that request still works; any other use of the code does not.
    expect((await post(s, '/v1/recover', { code: second, token: device })).status).toBe(200);
    expect(await (await post(s, '/v1/recover', { code: second, token: deviceToken() })).json()).toEqual({ error: 'invalid_code' });
    expect(s.d1.db.prepare('SELECT COUNT(*) AS n FROM recovery_codes').get()).toEqual({ n: 0 });
    s.clock.t += 60_000; // a new rate-limit window
    expect((await post(s, '/v1/recover', { code: 'nope', token: deviceToken() })).status).toBe(404);
    expect((await post(s, '/v1/recover', { code: second, token: 'bad' })).status).toBe(400);
    expect(normalizeCode('ABCD-EFGH-JKMN-PQRS-TVWX')).toBe('ABCDEFGHJKMNPQRSTVWX');
    expect(normalizeCode('ABCD-EFGH-JKMN-PQRS-TVWU')).toBeNull();
  });

  it('limits sign-in and recovery attempts per address, and a suspended account cannot be recovered', async () => {
    const s = server(); const a = await guest(s);
    const { code } = await (await post(s, '/v1/recovery-code', {}, a.token)).json() as { code: string };
    s.d1.db.prepare("UPDATE accounts SET status = 'suspended' WHERE id = ?").run(a.accountId);
    expect((await post(s, '/v1/recover', { code, token: deviceToken() })).status).toBe(404);
    for (let i = 1; i < LIMITS.recoverPerMinute; i++) await post(s, '/v1/recover', { code: 'x', token: deviceToken() });
    const limited = await post(s, '/v1/recover', { code, token: deviceToken() });
    expect(limited.status).toBe(429); expect(limited.headers.get('retry-after')).toBe('60');
    const g = await withGoogle(s);
    for (let i = 0; i < LIMITS.signInPerMinute; i++) await post(s, '/v1/signin', { idToken: await g.token(), token: deviceToken() });
    expect((await post(s, '/v1/signin', { idToken: await g.token(), token: deviceToken() })).status).toBe(429);
  });
});

describe('P09-02d client moves between devices', () => {
  const memory = (): StoragePort => { const d = new Map<string, string>(); return { getItem: k => d.get(k) ?? null, setItem: (k, v) => { d.set(k, v); }, removeItem: k => { d.delete(k); } }; };
  let h = 0;
  const port = (s: Server, lose = { next: 0 }): ServerPort => ({
    async fetch(url, init) {
      s.clock.t += 1000;
      const r = await handle(new Request(url, init), s.deps);
      if (lose.next > 0 && /\/v1\/(signin|recover)$/.test(new URL(url).pathname)) { lose.next--; throw new TypeError('connection reset'); }
      return r;
    },
    sleep: async () => {},
    randomHex: bytes => (++h).toString(16).padStart(bytes * 2, '0'),
  });
  const commander = { name: 'ย้ายเครื่อง', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: 'ค่ายทดสอบ' };

  it('a linked account reached by Google on a second device, and by a recovery code on a third, even when answers are lost', async () => {
    const s = server(); const g = await withGoogle(s);
    const phone = new ServerClient('https://api.test', VERSION, memory(), port(s));
    expect((await phone.enter()).kind).toBe('state');
    expect((await phone.send({ kind: 'createCommander', commander, replace: false })).kind).toBe('reply');
    const linked = await phone.link(await g.token({ sub: 'g-phone' }));
    if (linked.kind !== 'ok') throw new Error(JSON.stringify(linked));
    expect(linked.value.google).toBe(true);
    const code = await phone.recoveryCode();
    if (code.kind !== 'ok') throw new Error(JSON.stringify(code));

    const lose = { next: 1 };
    const laptop = new ServerClient('https://api.test', VERSION, memory(), port(s, lose));
    expect((await laptop.enter()).kind).toBe('state'); // its own new guest first
    expect(await laptop.link(await g.token({ sub: 'g-phone' }))).toEqual({ kind: 'refused', error: 'identity_in_use' });
    const signed = await laptop.signIn(await g.token({ sub: 'g-phone' }));
    expect(signed).toEqual({ kind: 'ok', value: linked.value.accountId });
    expect(lose.next).toBe(0); // the first answer was lost and the same request went again
    const there = await laptop.enter();
    if (there.kind !== 'state') throw new Error(JSON.stringify(there));
    expect(there.state.view?.profile.commander?.name).toBe('ย้ายเครื่อง');
    expect((await phone.state()).kind).toBe('otherDevice');

    const tablet = new ServerClient('https://api.test', VERSION, memory(), port(s, { next: 1 }));
    expect(await tablet.recover(code.value)).toEqual({ kind: 'ok', value: linked.value.accountId });
    expect((await tablet.enter()).kind).toBe('state');
    expect(await new ServerClient('https://api.test', VERSION, memory(), port(s)).recover(code.value)).toEqual({ kind: 'refused', error: 'invalid_code' });
  });
});
