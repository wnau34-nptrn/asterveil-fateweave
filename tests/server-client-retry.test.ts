import { describe, expect, it } from 'vitest';
import { ATTEMPT_TIMEOUT_MS, SEND_ATTEMPTS, ServerClient, type ServerPort } from '../src/platform/server-client';

// R11: a dead connection must reach the player's "cannot connect" card quickly, with the same requestId on every try.
const BASE = 'https://api.test';
const mem = () => { const d = new Map<string, string>(); return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => { d.set(k, v); }, removeItem: (k: string) => { d.delete(k); } }; };
const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });
type Step = 'throw' | number | 'timeout';
function port(steps: Step[]) {
  const p = { calls: [] as { body: string; hasTimeout: boolean }[], sleeps: [] as number[], clock: 0 } as { calls: { body: string; hasTimeout: boolean }[]; sleeps: number[]; clock: number } & ServerPort;
  p.fetch = async (_url, init) => {
    p.calls.push({ body: String(init.body ?? ''), hasTimeout: init.signal instanceof AbortSignal });
    const step = steps[Math.min(p.calls.length - 1, steps.length - 1)]!;
    if (step === 'throw') throw new TypeError('offline');
    if (step === 'timeout') { p.clock += ATTEMPT_TIMEOUT_MS; throw new DOMException('timeout', 'TimeoutError'); }
    if (step === 429) return json(429, {}, { 'Retry-After': '2' });
    return json(step, step === 200 ? { seq: 1, status: 'applied', view: null } : {});
  };
  p.sleep = async ms => { p.sleeps.push(ms); p.clock += ms; };
  p.randomHex = bytes => 'a'.repeat(bytes * 2);
  p.now = () => p.clock;
  return p;
}
async function client(steps: Step[]) {
  const p = port(steps); const c = new ServerClient(BASE, 'v', mem(), p);
  // A stored token and a known sequence number stand in for `enter()`.
  (c as unknown as { memoryToken: string }).memoryToken = 'dev.secret';
  return { p, c };
}
const cmd = { kind: 'rest' } as never;

describe('R11 server-client retry budget', () => {
  it('keeps the drafted numbers: 3 attempts of 7 s', () => { expect(SEND_ATTEMPTS).toBe(3); expect(ATTEMPT_TIMEOUT_MS).toBe(7000); });

  it('gives up on a dead network after 3 tries (~23 s worst case), all with the same requestId', async () => {
    const { p, c } = await client(['timeout']);
    expect(await c.send(cmd)).toEqual({ kind: 'failed', reason: 'network' });
    expect(p.calls).toHaveLength(SEND_ATTEMPTS);
    expect(new Set(p.calls.map(x => x.body)).size).toBe(1);
    expect(p.calls.every(x => x.hasTimeout)).toBe(true);
    expect(p.sleeps).toEqual([400, 800]);
    expect(p.clock).toBeLessThanOrEqual(25_000);
    expect(c.waitingRetry).toBe(true);
  });

  it('reports 5xx as a server failure after 3 tries and keeps the request for retry()', async () => {
    const { p, c } = await client([503]);
    expect(await c.send(cmd)).toEqual({ kind: 'failed', reason: 'server' });
    expect(p.calls).toHaveLength(3);
    expect(c.waitingRetry).toBe(true);
  });

  it('honours Retry-After on 429 and then succeeds on the same requestId', async () => {
    const { p, c } = await client([429, 200]);
    expect((await c.send(cmd)).kind).toBe('reply');
    expect(p.sleeps).toEqual([2000]);
    expect(new Set(p.calls.map(x => x.body)).size).toBe(1);
  });

  it('succeeds on the second try after a timeout and tells the page it is reconnecting', async () => {
    const { p, c } = await client(['timeout', 200]);
    let notes = 0; c.onReconnecting = () => { notes++; };
    expect((await c.send(cmd)).kind).toBe('reply');
    expect(notes).toBe(1); expect(p.calls).toHaveLength(2);
    expect(new Set(p.calls.map(x => x.body)).size).toBe(1);
    expect(c.waitingRetry).toBe(false);
  });

  it('a manual retry() after giving up reuses the pending request unchanged', async () => {
    const { p, c } = await client(['throw', 'throw', 'throw', 200]);
    await c.send(cmd);
    expect((await c.retry()).kind).toBe('reply');
    expect(new Set(p.calls.map(x => x.body)).size).toBe(1);
  });
});
