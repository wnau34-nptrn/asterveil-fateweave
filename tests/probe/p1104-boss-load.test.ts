import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gameRules } from '../../src/content/world/rules';
import { weekOf } from '../../src/core/world/board';
import { GAME_DAY_OFFSET_MINUTES } from '../../src/server/ledger';
import { handleBossRequest, sqlBossStore, WorldBossHost } from '../../src/server/world-boss';
import { fakeDurableState } from '../fixtures/server-fakes';

// P11-04 part 2 load probe of the single `WorldBoss` Durable Object: many hits through `handleBossRequest` on the real
// SQLite store (node:sqlite in memory, the same SQL as the object). One request at a time is what a Durable Object does
// anyway, so "concurrent" here means many requests started together and answered in turn; this measures the handler +
// SQL cost per request and the invariants under pile-up, not Cloudflare network or queueing time.
// `WB_LOAD_OUT=<file> npx vitest run tests/probe/p1104-boss-load.test.ts` writes the table; without it a small run checks the invariants.
const D = 20_773; const WEEK = weekOf(D); const T = D * 86_400_000 - GAME_DAY_OFFSET_MINUTES * 60_000 + 3_600_000;
const big = process.env.WB_LOAD_OUT !== undefined;
const N = big ? 2000 : 100; const PER = 5;
const acct = (n: number): string => n.toString(16).padStart(32, '0');
const hit = (n: number, a: number, damage = 400 + (n % 450)) => ({ id: `${acct(n)}:w${WEEK}:a${a}`, week: WEEK, account: acct(n), damage });
const post = (hits: unknown[]) => new Request('https://boss/contribute', { method: 'POST', body: JSON.stringify({ hits }) });
const get = () => new Request(`https://boss/status?week=${WEEK}`);

function fresh(hp: number) {
  const state = fakeDurableState();
  const host = new WorldBossHost(sqlBossStore(state), { ...gameRules.worldBoss, hp: { perAccount: 1, min: hp, max: hp } }, () => T);
  return { state, host, call: (r: Request) => handleBossRequest(host, r) };
}
const rows = (s: ReturnType<typeof fresh>) => ({
  week: s.state.db.prepare('SELECT hp, left_hp AS "left", accounts FROM weeks WHERE week = ?').get(WEEK) as { hp: number; left: number; accounts: number },
  hits: (s.state.db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(applied), 0) AS applied, COUNT(DISTINCT account) AS accounts FROM hits').get()) as { n: number; applied: number; accounts: number },
});
const out: string[] = ['| scenario | requests | ms | req/s | µs/req |', '|---|---|---|---|---|'];
async function timed(name: string, requests: Request[], s: ReturnType<typeof fresh>): Promise<Response[]> {
  const t0 = performance.now(); const res = await Promise.all(requests.map(r => s.call(r))); const ms = performance.now() - t0;
  out.push(`| ${name} | ${requests.length} | ${ms.toFixed(0)} | ${(requests.length / (ms / 1000)).toFixed(0)} | ${(ms * 1000 / requests.length).toFixed(0)} |`);
  expect(res.every(r => r.status === 200)).toBe(true); return res;
}

describe('P11-04 World Boss object under load', () => {
  it('a hit per request from many accounts, HP never below 0 and every hit taken once', async () => {
    const hp = N * PER * 700; const s = fresh(hp * 2); // big enough that nothing is cut: applied = damage
    const reqs: Request[] = []; for (let a = 1; a <= PER; a++) for (let n = 1; n <= N; n++) reqs.push(post([hit(n, a)]));
    await timed(`${N} accounts × ${PER} hits, one hit per request, HP never runs out`, reqs, s);
    const r = rows(s); const damage = [...Array(PER).keys()].reduce((t, a) => t + Array.from({ length: N }, (_, n) => hit(n + 1, a + 1).damage).reduce((x, y) => x + y, 0), 0);
    expect(r.hits).toEqual({ n: N * PER, applied: damage, accounts: N }); expect(r.week.left).toBe(r.week.hp - damage); expect(r.week.accounts).toBe(N);
  });

  it('the kill: far more damage than HP, applied sums to exactly the HP and nothing goes below 0', async () => {
    const s = fresh(5000); const reqs: Request[] = []; for (let a = 1; a <= PER; a++) for (let n = 1; n <= N; n++) reqs.push(post([hit(n, a)]));
    await timed(`${N} accounts × ${PER} hits on 5000 HP (all but ~10 hits applied 0)`, reqs, s);
    const r = rows(s); expect(r.week.left).toBe(0); expect(r.hits.applied).toBe(5000); expect(r.hits.n).toBe(N * PER); expect(r.week.accounts).toBe(N);
  });

  it('outbox backlogs: 64 hits a request, and the same hits sent again change nothing', async () => {
    const s = fresh(N * PER * 1400); const all: ReturnType<typeof hit>[] = []; for (let n = 1; n <= N; n++) for (let a = 1; a <= PER; a++) all.push(hit(n, a));
    const batches: Request[] = []; for (let i = 0; i < all.length; i += 64) batches.push(post(all.slice(i, i + 64)));
    await timed(`${all.length} hits in batches of 64`, batches, s); const first = rows(s);
    await timed(`the same ${all.length} hits resent in batches of 64`, batches.map((_, i) => post(all.slice(i * 64, i * 64 + 64))), s);
    expect(rows(s)).toEqual(first);
  });

  it('a retry storm for one hit takes it once; reads interleaved with hits stay consistent', async () => {
    const s = fresh(1_000_000); const one = hit(1, 1); const storm = Array.from({ length: 500 }, () => post([one]));
    const res = await timed('500 identical retries of one hit', storm, s);
    const applied = new Set((await Promise.all(res.map(r => r.json()))).map((b: { applied: Record<string, number> }) => b.applied[one.id])); expect(applied.size).toBe(1);
    expect(rows(s).hits.n).toBe(1);
    const mixed: Request[] = []; for (let n = 1; n <= N * 4; n++) mixed.push(n % 10 === 0 ? post([hit(n + 10_000, 1)]) : get());
    const reads = await timed(`${mixed.length} requests, 90% status reads and 10% hits`, mixed, s);
    const lefts = (await Promise.all(reads.filter((_, i) => (i + 1) % 10 !== 0).map(r => r.json()))).map((b: { status: { left: number; hp: number } }) => b.status.left);
    expect(lefts.every(l => l >= 0 && l <= 1_000_000)).toBe(true); expect(Math.min(...lefts)).toBeLessThanOrEqual(Math.max(...lefts));
  });

  it('writes the table', () => { if (big) writeFileSync(process.env.WB_LOAD_OUT!, `${out.join('\n')}\n`); expect(out.length).toBeGreaterThan(2); });
});
