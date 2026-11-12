/* global fetch, URL, process, crypto, performance, TextEncoder, console, AbortSignal */
// P09-02b smoke test against a running API (local `wrangler dev` or the deployed dev Worker):
//   node cloudflare/smoke.mjs <base-url> <content-version>
// Creates a throwaway guest, sends createCommander → depart, retries a request, reads the state, checks the one-session
// lock (423 other_device), runs the replay audit,
// checks no seed leaves the server and prints bytes and round-trip times. Prints no token.
import assert from 'node:assert/strict';

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
assert.deepEqual((await call('verify', '/v1/verify', { method: 'POST', token })).json, { ok: true, seq: 2 });
console.log('label\tstatus\tbytes\tms');
for (const r of rows) console.log(`${r.label}\t${r.status}\t${r.bytes}\t${r.ms}`);
console.log('SMOKE OK');
