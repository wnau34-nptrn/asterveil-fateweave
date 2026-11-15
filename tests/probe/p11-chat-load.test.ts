import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAT_LIMITS, ChatHost, handleChatRequest } from '../../src/server/chat';
import { fakeDurableState } from '../fixtures/server-fakes';

// P11 load probe of the single `Chat` Durable Object: many sends and reads through `handleChatRequest` on the real
// SQLite store (node:sqlite in memory, the same SQL as the object). Like the World Boss probe (p1104-boss-load) this
// measures the handler + SQL cost per request and the invariants under pile-up, not Cloudflare network or queueing.
// `CHAT_LOAD_OUT=<file> npx vitest run tests/probe/p11-chat-load.test.ts` writes the table; without it a small run checks the invariants.
const big = process.env.CHAT_LOAD_OUT !== undefined;
const N = big ? 2000 : 150;
const acct = (n: number): string => n.toString(16).padStart(32, '0');
const post = (n: number, text: string) => new Request('https://chat/post', { method: 'POST', body: JSON.stringify({ account: acct(n), text }) });
const read = (n: number, after: number) => new Request(`https://chat/read?account=${acct(n)}&after=${after}`);

function fresh() {
  const clock = { t: 50_000_000 }; const state = fakeDurableState(); const host = new ChatHost(state, () => clock.t);
  return { clock, state, call: (r: Request) => handleChatRequest(host, r) };
}
const out: string[] = ['| scenario | requests | ms | req/s | µs/req |', '|---|---|---|---|---|'];
async function timed(name: string, requests: Request[], s: ReturnType<typeof fresh>): Promise<Response[]> {
  const t0 = performance.now(); const res = await Promise.all(requests.map(r => s.call(r))); const ms = performance.now() - t0;
  out.push(`| ${name} | ${requests.length} | ${ms.toFixed(0)} | ${(requests.length / (ms / 1000)).toFixed(0)} | ${(ms * 1000 / requests.length).toFixed(0)} |`);
  return res;
}

describe('P11 Chat object under load', () => {
  it('one send per account at once: every send stored with a unique id, the newest 500 kept', async () => {
    const s = fresh();
    const res = await timed(`${N} accounts send one message each at the same moment`, Array.from({ length: N }, (_, i) => post(i + 1, `สวัสดีจากค่าย ${i}`)), s);
    expect(res.every(r => r.status === 201)).toBe(true);
    const ids = await Promise.all(res.map(async r => (await r.json() as { message: { id: number } }).message.id));
    expect([...ids].sort((a, b) => a - b)).toEqual(Array.from({ length: N }, (_, i) => i + 1)); // unique, no gaps (order follows the async handle hash)
    const kept = s.state.db.prepare('SELECT COUNT(*) AS n, MIN(id) AS lo, MAX(id) AS hi FROM messages').get() as { n: number; lo: number; hi: number };
    expect(kept).toEqual({ n: Math.min(N, CHAT_LIMITS.keepMessages), lo: Math.max(1, N - CHAT_LIMITS.keepMessages + 1), hi: N });
  });

  it('a flood from one account is paced: one per 4 s and 8 a minute, the rest 429', async () => {
    const s = fresh();
    const burst = await timed('one account sends 200 at once', Array.from({ length: 200 }, (_, i) => post(1, `สแปม ${i}`)), s);
    expect(burst.filter(r => r.status === 201)).toHaveLength(1); expect(burst.filter(r => r.status === 429)).toHaveLength(199);
    let ok = 0; for (let i = 0; i < 30; i++) { s.clock.t += CHAT_LIMITS.gapMs; if ((await s.call(post(1, `ช้า ๆ ${i}`))).status === 201) ok++; }
    expect(ok).toBeLessThanOrEqual(CHAT_LIMITS.perMinute * 2 + 1);
  });

  it('every account polls at once (8 s cadence): answers stay within 50 messages and carry no account ids', async () => {
    const s = fresh();
    for (let i = 1; i <= 120; i++) { s.clock.t += 100; await s.call(post(i, `ข้อความ ${i}`)); }
    const res = await timed(`${N} accounts poll from 0 (50 newest each)`, Array.from({ length: N }, (_, i) => read(i + 1, 0)), s);
    const bodies = await Promise.all(res.map(r => r.json() as Promise<{ messages: { id: number }[] }>));
    expect(bodies.every(b => b.messages.length === CHAT_LIMITS.readBatch)).toBe(true);
    expect(JSON.stringify(bodies[0])).not.toContain(acct(1));
    const res2 = await timed(`${N} accounts poll with nothing new`, Array.from({ length: N }, (_, i) => read(i + 1, 120)), s);
    expect((await Promise.all(res2.map(r => r.json() as Promise<{ messages: unknown[] }>))).every(b => b.messages.length === 0)).toBe(true);
    if (big) writeFileSync(process.env.CHAT_LOAD_OUT!, out.join('\n') + '\n');
  });
});
