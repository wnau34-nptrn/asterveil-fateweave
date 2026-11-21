import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import { type CommandReply } from '../src/core/command/command-envelope';
import { SAVE_VERSION, type Game } from '../src/core/save/expedition-save';
import { weekOf } from '../src/core/world/board';
import { newProfile } from '../src/core/world/profile';
import type { Profile, WbBossId } from '../src/core/world/types';
import { trioLive, trioSharedHp, wbEncounter, worldBossAttempt } from '../src/core/world/world-boss';
import { CONTENT_HEADER, handle } from '../src/server/api';
import { SESSION_HEADER } from '../src/server/account-object';
import { nextDayAt, serverDay } from '../src/server/ledger';
import type { PublicBar } from '../src/server/world-boss';
import { currentSave } from './fixtures/current-save';
import { server, storedGame, VERSION, type Server } from './fixtures/server-fakes';
import { wbTurns } from './fixtures/world-boss';

// P11-05 go-live check (OD-52, 2026-11-21; docs/validation/p11-05-trio-check-2026-11-21/README_TH.md): the SHIPPED rules
// (no copy with `from` moved), the Worker and the World Boss object with the clock pinned around the real switch,
// Monday 23 Nov 2026 06:00 Bangkok = Sunday 22 Nov 23:00 UTC. Week 2968 is the warden's last; 2969 opens the trio.

const rules = gameRules.worldBoss; const trio = rules.trio;
const SWITCH = Date.parse('2026-11-23T06:00:00+07:00');
const SESSION = 'a'.repeat(32);
const commander = { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' } as const;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(MAPS[0]!, 5), tutorialDone: true, commander: { ...commander },
  cleared: MAPS.map(m => m.id), bank: { ore: 100, gold: 100, shard: 7, dust: 10 }, ...patch });
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: SESSION, 'Content-Type': 'application/json' });
// Each call moves the clock 1 s first (as in the other Worker tests); `at` sets it so the call lands exactly there.
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
const at = (s: Server, ms: number) => { s.clock.t = ms - 1000; };
async function player(s: Server, ip: string) {
  const g = await (await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': ip } })).json() as { accountId: string; token: string };
  await call(s, '/v1/session', { method: 'POST', headers: headers(g.token) });
  const payload = currentSave({ profile: base({ commander: { ...commander, camp: `ค่าย ${ip}` } }), run: null }); const digest = createHash('sha256').update(payload).digest('hex');
  s.clock.t += 12_000;
  const imp = await call(s, '/v1/import', { method: 'POST', headers: headers(g.token), body: JSON.stringify({ format: 1, requestId: `imp_${digest.slice(0, 40)}`, baseRevision: 0, saveVersion: SAVE_VERSION, payload, payloadBytes: new TextEncoder().encode(payload).byteLength, payloadSha256: digest }) });
  expect(imp.status).toBe(201);
  let seq = 0;
  const send = async (command: unknown) => (await (await call(s, '/v1/command', { method: 'POST', headers: headers(g.token), body: JSON.stringify({ requestId: `sw-${g.accountId.slice(0, 8)}-${String(++seq).padStart(6, '0')}`, seq, command }) })).json()) as CommandReply;
  return { ...g, send };
}
const attemptsIn = (g: Game, week: number) => g.profile.worldBoss?.weeks.find(w => w.week === week)?.attempts ?? 0;
const attempt = (g: Game, week: number, boss?: WbBossId) =>
  ({ kind: 'worldBoss', attempt: attemptsIn(g, week) + 1, ...(boss ? { boss } : {}), commands: wbTurns(wbEncounter(g.profile, MAPS[0]!, lookup, boss)!, rules.maxRounds) });
interface Status { week: number; current: PublicBar | null; last: PublicBar | null; bars: PublicBar[]; lastBars: PublicBar[] }
const status = async (s: Server, token: string) => (await (await call(s, '/v1/worldboss', { headers: headers(token) })).json()) as Status;

describe('P11-05 go-live: the week switch at Monday 23 Nov 2026 06:00 Bangkok (shipped rules)', () => {
  it('the calendar: 05:59:59 is week 2968 (the warden), 06:00:00 is week 2969 (the trio); the day reset falls on the switch', () => {
    expect(trio.from).toBe(2969);
    const before = weekOf(serverDay(SWITCH - 1000)), after = weekOf(serverDay(SWITCH));
    expect([before, after]).toEqual([2968, 2969]);
    expect([trioLive(rules, before), trioLive(rules, after)]).toEqual([false, true]);
    // The "resets in" time the device shows on Sunday evening is the switch itself, and Saturday 22 Nov 06:00 is not a week change.
    expect(nextDayAt(Date.parse('2026-11-22T20:00:00+07:00'))).toBe(SWITCH);
    expect(weekOf(serverDay(Date.parse('2026-11-22T06:00:00+07:00')))).toBe(2968);
    expect(weekOf(serverDay(Date.parse('2026-11-16T06:00:00+07:00')))).toBe(2968);
    expect(weekOf(serverDay(Date.parse('2026-11-16T05:59:59+07:00')))).toBe(2967);
    // Offline (`?server=off`), the shell's day is the device's local date 6 h back; on a Bangkok device that is the same week.
    const deviceDay = (ms: number) => { const d = new Date(ms + 7 * 3_600_000 - 6 * 3_600_000); return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000); };
    expect([weekOf(deviceDay(SWITCH - 1000)), weekOf(deviceDay(SWITCH))]).toEqual([2968, 2969]);
  });

  it('offline rules: a warden attempt in 2968, a trio attempt (boss required) in 2969, the warden refused in 2969', () => {
    const p = base(); const map = MAPS[0]!;
    const turns = (boss?: WbBossId) => wbTurns(wbEncounter(p, map, lookup, boss)!, rules.maxRounds);
    const w = worldBossAttempt(p, MAPS, lookup, 2968, 1, turns());
    expect(w.event).toMatchObject({ type: 'wbAttempt', week: 2968, reward: rules.attemptReward });
    expect(worldBossAttempt(p, MAPS, lookup, 2968, 1, turns('kragmor'), 'kragmor').event).toMatchObject({ reason: 'boss' });
    expect(worldBossAttempt(w.profile, MAPS, lookup, 2969, 1, turns(), undefined).event).toMatchObject({ reason: 'boss' });
    const t = worldBossAttempt(w.profile, MAPS, lookup, 2969, 1, turns('morvane'), 'morvane');
    expect(t.event).toMatchObject({ type: 'wbAttempt', week: 2969, boss: 'morvane', shards: trio.attemptShards, reward: trio.attemptReward });
    // The book keeps the warden's week beside the first trio week (its claims stay open a week).
    expect(t.profile.worldBoss!.weeks.map(x => [x.week, x.attempts, !!x.legacy, Object.keys(x.bosses)])).toEqual([[2968, 1, true, []], [2969, 1, false, ['morvane']]]);
    expect(t.profile.bossShards).toEqual({ morvane: trio.attemptShards });
  });

  it('through the Worker: warden until 05:59:59, three bars at 06:00 sized from the warden\'s attempts ÷ 3 × 400, last week\'s claims still pay', async () => {
    const s = server(); at(s, Date.parse('2026-11-23T04:00:00+07:00'));
    const a = await player(s, '198.51.100.7'); const b = await player(s, '198.51.100.8');
    // Week 2968: A plays two warden attempts and B one; a trio boss is refused while the warden stands.
    expect(await a.send(attempt(storedGame(s, a.accountId)!, 2968, 'kragmor'))).toMatchObject({ status: 'rejected', reason: 'boss' });
    for (const p of [a, a, b]) expect(await p.send(attempt(storedGame(s, p.accountId)!, 2968))).toMatchObject({ status: 'applied' });
    // Other camps' warden attempts this week (33 in all with the three above) take the bar past half.
    const before = await status(s, a.token);
    expect(before.week).toBe(2968); expect(before.bars.map(x => x.boss)).toEqual(['warden']);
    const hp = before.current!.hp;
    s.boss.host.contribute(Array.from({ length: 30 }, (_, i) => ({ id: `${String(i % 10).repeat(32)}:w2968:a${Math.floor(i / 10) + 1}`, week: 2968, account: String(i % 10).repeat(32), damage: Math.ceil(hp / 50) })));
    at(s, SWITCH - 1000);
    const last = await status(s, a.token);
    expect(last.week).toBe(2968); expect(last.current).toMatchObject({ boss: 'warden', attempts: 33, accounts: 12 });
    expect(last.current!.left).toBeLessThanOrEqual(hp / 2);

    // 06:00:00: week 2969 opens three bars at floor(33 / 3) × 400 = 4400 each; the warden's 2968 bar is "last week".
    at(s, SWITCH);
    const first = await status(s, a.token);
    expect(first.week).toBe(2969); expect(first.current).toBeNull();
    expect(trioSharedHp(rules, 11)).toBe(4400);
    expect(first.bars.map(x => [x.week, x.boss, x.hp, x.left])).toEqual(['kragmor', 'valdrakk', 'morvane'].map(x => [2969, x, 4400, 4400]));
    expect(first.last).toMatchObject({ week: 2968, boss: 'warden', attempts: 33 }); expect(first.lastBars.map(x => x.boss)).toEqual(['warden']);

    // A warden attempt sent after the switch is refused (not used up); a trio attempt counts and pays boss shards.
    expect(await a.send(attempt(storedGame(s, a.accountId)!, 2969))).toMatchObject({ status: 'rejected', reason: 'boss' });
    const r = await a.send(attempt(storedGame(s, a.accountId)!, 2969, 'valdrakk'));
    expect(r).toMatchObject({ status: 'applied', receipts: ['wb:w2969:a1'] });
    expect(storedGame(s, a.accountId)!.profile.bossShards).toEqual({ valdrakk: trio.attemptShards });
    expect((await status(s, a.token)).bars.find(x => x.boss === 'valdrakk')!.left).toBeLessThan(4400);
    // The warden's week-2968 shared half pays in week 2969 to a camp that fought it; the trio's ids do not apply to 2968.
    expect(await a.send({ kind: 'claimWorldBoss', id: 's-50', week: 2968 })).toMatchObject({ status: 'applied', receipts: ['wb:w2968:s-50'] });
    expect(await a.send({ kind: 'claimWorldBoss', id: 's-100', week: 2968 })).toMatchObject({ status: 'rejected', reason: 'progress' });
    expect(await a.send({ kind: 'claimWorldBoss', id: 'kragmor:s-50', week: 2968 })).toMatchObject({ status: 'rejected' });
    // A week later (Mon 30 Nov 06:00) the warden's week has closed: B, who never claimed, can no longer (the object no
    // longer reports week 2968, so the claim has no shared HP to read: 'offline'; the panel no longer lists that week).
    expect(await b.send({ kind: 'claimWorldBoss', id: 's-50', week: 2968 })).toMatchObject({ status: 'applied' });
    at(s, Date.parse('2026-11-30T06:00:00+07:00'));
    expect(await a.send({ kind: 'claimWorldBoss', id: 's-50', week: 2968 })).toMatchObject({ status: 'rejected' });
    expect(await b.send({ kind: 'claimWorldBoss', id: 's-100', week: 2968 })).toMatchObject({ status: 'rejected', reason: 'offline' });
    // Week 2970 sizes each bar from its own 2969 attempts (Valdrakk 1 → the minimum).
    expect((await status(s, a.token)).bars.map(x => [x.week, x.boss, x.hp])).toEqual(['kragmor', 'valdrakk', 'morvane'].map(x => [2970, x, trio.hp.min]));
    expect(s.objects.get(a.accountId)!.host.verify()).toMatchObject({ ok: true });
  });

  it('no warden attempts in 2968 (a quiet week): the trio opens at the 1500 minimum', async () => {
    const s = server(); at(s, SWITCH + 3_600_000);
    const a = await player(s, '198.51.100.9');
    const st = await status(s, a.token);
    expect(st.week).toBe(2969); expect(st.bars.map(x => x.hp)).toEqual([trio.hp.min, trio.hp.min, trio.hp.min]);
  });
});
