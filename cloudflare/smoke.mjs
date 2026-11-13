/* global fetch, URL, process, crypto, performance, TextEncoder, console, AbortSignal, Buffer */
// P09-02b smoke test against a running API (local `wrangler dev` or the deployed dev Worker):
//   node cloudflare/smoke.mjs <base-url> <content-version>
// Creates a throwaway guest, sends createCommander → depart, retries a request, reads the state, checks the one-session
// lock (423 other_device), runs the replay audit, moves the account with a recovery code and checks Google sign-in is
// configured (P09-02d), checks that the audit is admin-only (P09-02f: with ADMIN_D1_CONFIG set, the throwaway account is
// made an admin in D1 for the check and the row removed afterwards), signs devices out (P09-02f), asks for and cancels
// an account deletion (P09-02g),
// checks no seed leaves the server and prints bytes and round-trip times. Prints no token.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// P09-02f: admin rows are only ever written with `wrangler d1 execute` (no API grants admin). Wrangler's output can
// carry the account owner's e-mail, so nothing it prints is shown.
const adminConfig = process.env.ADMIN_D1_CONFIG;
function d1(sql) {
  try { execFileSync('npx', ['--yes', 'wrangler@4.153.0', 'd1', 'execute', 'DB', '--remote', '--config', adminConfig, '--command', sql], { stdio: 'ignore', timeout: 120000 }); }
  catch { throw new Error('wrangler d1 execute failed (output hidden)'); }
}
const ACCOUNT = /^[0-9a-f]{32}$/;

const [base, version] = process.argv.slice(2);
if (!base || !version) throw new Error('usage: node cloudflare/smoke.mjs <base-url> <content-version>');
const HIDDEN = ['seed', 'rolls', 'forge'];
const keysDeep = (v, out = new Set()) => {
  if (Array.isArray(v)) v.forEach(x => keysDeep(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.add(k); keysDeep(x, out); }
  return out;
};
const rows = [];
const SESSION = crypto.randomUUID().replaceAll('-', ''), OTHER = crypto.randomUUID().replaceAll('-', '');
async function call(label, path, { method = 'GET', token, body, contentVersion = version, session = SESSION } = {}) {
  const headers = { 'X-Fateweave-Content': contentVersion, 'X-Fateweave-Session': session };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t = performance.now();
  const r = await fetch(new URL(path, base), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const text = await r.text(); const ms = performance.now() - t;
  rows.push({ label, status: r.status, bytes: new TextEncoder().encode(text).byteLength, ms: Math.round(ms) });
  const json = text ? JSON.parse(text) : null;
  assert.deepEqual([...keysDeep(json)].filter(k => HIDDEN.includes(k)), [], `${label} leaked a hidden key`);
  return { status: r.status, json, text };
}
const rid = () => `smoke-${crypto.randomUUID().replaceAll('-', '')}`;
const commander = { name: 'สโมก', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' };

assert.equal((await call('health', '/health')).status, 200);
const g = await call('guest', '/v1/guest', { method: 'POST' });
assert.equal(g.status, 201);
const token = g.json.token;
assert.equal((await call('wrong content', '/v1/state', { token, contentVersion: 'other' })).status, 409);
assert.deepEqual((await call('session (empty)', '/v1/session', { method: 'POST', token })).json, { lastSeq: 0, view: null });
const first = { requestId: rid(), seq: 1, command: { kind: 'createCommander', commander, replace: false } };
const c1 = await call('createCommander', '/v1/command', { method: 'POST', token, body: first });
assert.equal(c1.status, 200, c1.text); assert.equal(c1.json.status, 'applied', c1.text);
const retry = await call('createCommander retry', '/v1/command', { method: 'POST', token, body: first });
assert.equal(retry.text, c1.text);
assert.equal((await call('gap', '/v1/command', { method: 'POST', token, body: { requestId: rid(), seq: 9, command: { kind: 'rest' } } })).json.error, 'gap');
const d = await call('depart', '/v1/command', { method: 'POST', token, body: { requestId: rid(), seq: 2, command: { kind: 'depart', hard: false } } });
assert.equal(d.json.status, 'applied', d.text);
const s = await call('state', '/v1/state', { token });
assert.equal(s.json.lastSeq, 2);
// D12: another device enters, this one gets 423, then enters again.
assert.equal((await call('other device enters', '/v1/session', { method: 'POST', token, session: OTHER })).status, 200);
assert.equal((await call('replaced device', '/v1/state', { token })).status, 423);
assert.equal((await call('enter again', '/v1/session', { method: 'POST', token })).status, 200);
assert.deepEqual((await call('verify (not admin)', '/v1/verify', { method: 'POST', token })).json, { error: 'forbidden' });
if (adminConfig) {
  assert.match(g.json.accountId, ACCOUNT);
  d1(`INSERT OR IGNORE INTO admins (account_id, granted_at, note) VALUES ('${g.json.accountId}', ${Date.now()}, 'ci smoke')`);
  try { assert.deepEqual((await call('verify (admin)', '/v1/verify', { method: 'POST', token })).json, { ok: true, seq: 2, from: 0 }); }
  finally { d1(`DELETE FROM admins WHERE account_id = '${g.json.accountId}'`); }
}
// P09-02d account: a recovery code moves the account to a new device credential once; Google sign-in is configured
// and the Worker reaches Google's key set (a well-formed token with an unknown key id is refused as `key`, not `jwks`).
const account = await call('account', '/v1/account', { token });
assert.equal(account.json.status, 'guest', account.text);
const issued = await call('recovery-code', '/v1/recovery-code', { method: 'POST', token });
assert.equal(issued.status, 201, issued.text);
const hexOf = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
const moved = `${hexOf(16)}.${hexOf(32)}`;
const recovered = await call('recover', '/v1/recover', { method: 'POST', body: { code: issued.json.code, token: moved } });
assert.deepEqual(recovered.json, { accountId: g.json.accountId }, recovered.text);
assert.equal((await call('recover again', '/v1/recover', { method: 'POST', body: { code: issued.json.code, token: `${hexOf(16)}.${hexOf(32)}` } })).status, 404);
assert.equal((await call('new device enters', '/v1/session', { method: 'POST', token: moved, session: OTHER })).status, 200);
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = `${b64({ alg: 'RS256', kid: 'smoke-unknown', typ: 'JWT' })}.${b64({ sub: 'smoke' })}.${Buffer.from('x').toString('base64url')}`;
const link = await call('link (unknown key)', '/v1/link', { method: 'POST', token: moved, body: { idToken: fakeJwt } });
assert.deepEqual(link.json, { error: 'google_token', reason: 'key' }, link.text);
// P09-02f sign-out: the new device signs the old one out, then itself (warned first: no Google, the code was used).
assert.deepEqual((await call('sign out others', '/v1/sessions/revoke', { method: 'POST', token: moved, body: { scope: 'others' } })).json, { revoked: 1 });
assert.equal((await call('old device signed out', '/v1/account', { token })).status, 401);
assert.deepEqual((await call('sign out (warned)', '/v1/sessions/revoke', { method: 'POST', token: moved, body: {} })).json, { error: 'unrecoverable' });
assert.deepEqual((await call('sign out (confirmed)', '/v1/sessions/revoke', { method: 'POST', token: moved, body: { confirm: true } })).json, { revoked: 1 });
assert.equal((await call('signed out', '/v1/account', { token: moved })).status, 401);
// P09-02g deletion: a second throwaway guest asks for deletion (the game then refuses), cancels, and asks again; it is
// left waiting, so the hourly purge removes it after the grace period.
const del = (await call('guest (deletion)', '/v1/guest', { method: 'POST' })).json.token;
assert.equal((await call('delete (no confirm)', '/v1/account/delete', { method: 'POST', token: del, body: {} })).status, 400);
const asked = await call('delete', '/v1/account/delete', { method: 'POST', token: del, body: { confirm: 'delete' } });
assert.equal(asked.json.status, 'deleting', asked.text); assert.ok(asked.json.deleteAfter > Date.now() + 13 * 86400000, asked.text);
assert.deepEqual((await call('session while deleting', '/v1/session', { method: 'POST', token: del })).json, { error: 'account_deleting' });
assert.equal((await call('cancel deletion', '/v1/account/cancel', { method: 'POST', token: del })).json.status, 'guest');
assert.equal((await call('session after cancel', '/v1/session', { method: 'POST', token: del })).status, 200);
assert.equal((await call('delete again', '/v1/account/delete', { method: 'POST', token: del, body: { confirm: 'delete' } })).json.status, 'deleting');
console.log('label\tstatus\tbytes\tms');
for (const r of rows) console.log(`${r.label}\t${r.status}\t${r.bytes}\t${r.ms}`);
console.log('SMOKE OK');
