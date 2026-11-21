import { createHash } from 'node:crypto';
import { createBattle } from '../src/core/battle/engine';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup, WORLD_BOSS_HP } from '../src/content/encounters/catalog';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import { canonicalJson, emptyBook, type CommandReply } from '../src/core/command/command-envelope';
import { applyCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import { parseGame, SAVE_VERSION, type Game } from '../src/core/save/expedition-save';
import { weekOf } from '../src/core/world/board';
import { BANK_CAP } from '../src/core/world/caps';
import { newProfile } from '../src/core/world/profile';
import type { Profile, SweepReward } from '../src/core/world/types';
import {
  claimWorldBoss, sharedHpFor, sharedPercent, wbAttemptReason, wbClaimReason, wbDamage, wbEncounter, wbPlay, worldBossAttempt,
} from '../src/core/world/world-boss';
import { handleAccountRequest, HITS_HEADER, SESSION_HEADER, sqlStore } from '../src/server/account-object';
import { CONTENT_HEADER, handle } from '../src/server/api';
import { GameHost, memoryStore, type HostStore } from '../src/server/game-host';
import { GAME_DAY_OFFSET_MINUTES } from '../src/server/ledger';
import { GAME_CONTEXT } from '../src/server/worker';
import { memoryBossStore, WorldBossHost } from '../src/server/world-boss';
import { currentSave } from './fixtures/current-save';
import { fakeDurableState, server, storedGame, VERSION, type Server } from './fixtures/server-fakes';
import { wbTurns } from './fixtures/world-boss';

// P11-04 World Boss part 1 (docs/design/WORLD_BOSS_P11_04_TH.md): attempts replayed by the deterministic resolver from
// the camp team, weekly allowance and milestones, save v64, and the server: rewards receipted in the account's
// `reward_ledger`, hits handed to the shared World Boss object once, concurrent kills and late arrivals, retries and
// week boundaries on the server calendar, and the weekly budget kept with the sweep cut.

// D is a Monday three weeks before the trio's first week (OD-52: week 2969), so W..W+3 stay the warden's.
const rules = gameRules.worldBoss; const D = 20_752; const W = weekOf(D);
const HOUR = 3_600_000, DAY_MS = 24 * HOUR;
const midnight = (d: number) => d * DAY_MS - GAME_DAY_OFFSET_MINUTES * 60_000;
const commander = { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' } as const;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { ...commander },
  cleared: MAPS.map(m => m.id), bank: { ore: 100, gold: 100, shard: 7, dust: 10 }, ...patch });
const value = (r: SweepReward): number => r.ore + 2 * r.gold + 12 * (r.shard ?? 0);
const sha = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');
const turns = (p: Profile) => { const data = wbEncounter(p, home, lookup)!; return wbTurns(data, rules.maxRounds); };
// Plays `n` attempts of week `week` on the rules directly.
function attempts(p: Profile, n: number, week = W): Profile {
  for (let i = 0; i < n; i++) { const r = worldBossAttempt(p, MAPS, lookup, week, (p.worldBoss?.weeks.find(w => w.week === week)?.attempts ?? 0) + 1, turns(p)); expect(r.event.type).toBe('wbAttempt'); p = r.profile; }
  return p;
}

describe('P11-04 World Boss rules (offline and server alike)', () => {
  it('an attempt is the camp field team against the boss, replayed deterministically, and counts the boss HP lost', () => {
    const p = base(); const data = wbEncounter(p, home, lookup)!;
    expect(data.heroes.map(h => h.id)).toEqual(p.party.deployed);
    expect(data.enemies.find(e => e.boss)!.maxHp).toBe(WORLD_BOSS_HP);
    const list = turns(p); const a = wbPlay(data, list, rules.maxRounds); const b = wbPlay(data, list, rules.maxRounds);
    expect(a.done).toBe(true); expect(a.damage).toBeGreaterThan(0); expect(a.damage).toBeLessThanOrEqual(WORLD_BOSS_HP);
    expect(canonicalJson(a.state)).toBe(canonicalJson(b.state));
    expect(a.state.round > rules.maxRounds || a.state.outcome !== 'active').toBe(true);
    const r = worldBossAttempt(p, MAPS, lookup, W, 1, list);
    expect(r.event).toEqual({ type: 'wbAttempt', week: W, attempt: 1, damage: a.damage, rounds: a.rounds, outcome: a.state.outcome, reward: rules.attemptReward, milestones: [] });
    expect(r.profile.bank).toEqual({ ...p.bank, ore: p.bank.ore + rules.attemptReward.ore, gold: p.bank.gold + rules.attemptReward.gold });
    expect(r.profile.worldBoss).toEqual({ weeks: [{ week: W, attempts: 1, bosses: {}, legacy: { attempts: 1, damage: a.damage, best: a.damage }, claimed: [] }] });
    expect(p.worldBoss).toBeUndefined(); // never mutates its input
  });

  it('refuses a locked camp, an unfinished or illegal list, a turn after the end, a repeat, a sixth attempt and a full bank', () => {
    const p = base(); const list = turns(p);
    expect(wbAttemptReason({ ...p, cleared: [] }, MAPS, lookup, W, 1, list)).toBe('locked');
    expect(wbAttemptReason(p, MAPS, lookup, W, 1, list.slice(0, 3))).toBe('unfinished');
    expect(wbAttemptReason(p, MAPS, lookup, W, 1, [...list, list.at(-1)!])).toBe('illegal');
    expect(wbAttemptReason(p, MAPS, lookup, W, 1, list.map((c, i) => i === 2 ? { ...c, beat: c.beat + 7 } : c))).toBe('illegal');
    expect(wbAttemptReason(p, MAPS, lookup, W, 2, list)).toBe('stale');
    expect(wbAttemptReason({ ...p, party: { ...p.party, deployed: [] } }, MAPS, lookup, W, 1, [])).toBe('team');
    // An attempt that leaves the boss unhurt does not count ('noDamage'); a fresh battle counts 0.
    const data = wbEncounter(p, home, lookup)!;
    expect(wbDamage(createBattle(data), data)).toBe(0);
    const once = attempts(p, 1);
    expect(wbAttemptReason(once, MAPS, lookup, W, 1, list)).toBe('stale');
    const five = attempts(p, rules.attempts);
    expect(wbAttemptReason(five, MAPS, lookup, W, rules.attempts + 1, list)).toBe('used');
    expect(wbAttemptReason({ ...p, bank: { ...p.bank, ore: BANK_CAP.ore } }, MAPS, lookup, W, 1, list)).toBe('full');
  });

  it('pays the personal milestones at 2 and 4 attempts once, and a new week starts over', () => {
    let p = base(); const start = p.bank.shard;
    p = attempts(p, 2); expect(p.bank.shard).toBe(start + 1); expect(p.worldBoss!.weeks[0]!.claimed).toEqual(['p-2']);
    p = attempts(p, 3); expect(p.bank.shard).toBe(start + 3); expect(p.worldBoss!.weeks[0]!.claimed).toEqual(['p-2', 'p-4']);
    expect(p.worldBoss!.weeks[0]!.attempts).toBe(5);
    const next = attempts(p, 1, W + 1);
    expect(next.worldBoss!.weeks.map(w => [w.week, w.attempts])).toEqual([[W, 5], [W + 1, 1]]);
    // Two weeks later the old week closes; a clock set back to an older week is refused.
    const later = attempts(next, 1, W + 3);
    expect(later.worldBoss!.weeks.map(w => w.week)).toEqual([W + 3]);
    expect(wbAttemptReason(later, MAPS, lookup, W + 2, 1, turns(later))).toBe('expired');
  });

  it('shared milestones: online only, this week or last, only with an attempt that week, once each', () => {
    const p = attempts(base(), 1); const half = { week: W, hp: 1000, left: 500 };
    expect(wbClaimReason(p, MAPS, 's-50', W, W)).toBe('offline');
    expect(wbClaimReason(base(), MAPS, 's-50', W, W, half)).toBe('absent');
    expect(wbClaimReason(p, MAPS, 's-100', W, W, half)).toBe('progress');
    expect(wbClaimReason(p, MAPS, 's-50', W, W, { ...half, week: W - 1 })).toBe('expired');
    expect(wbClaimReason(p, MAPS, 'nope', W, W, half)).toBe('unknown');
    const got = claimWorldBoss(p, MAPS, 's-50', W, W, half);
    expect(got.event).toEqual({ type: 'wbClaimed', week: W, id: 's-50', reward: rules.shared[0]!.reward });
    expect(got.profile.bank.gold).toBe(p.bank.gold + 3);
    expect(wbClaimReason(got.profile, MAPS, 's-50', W, W, half)).toBe('claimed');
    // Last week's milestone may still be claimed next week; the week after that it has closed.
    const dead = { week: W, hp: 1000, left: 0 };
    expect(wbClaimReason(got.profile, MAPS, 's-100', W, W + 1, dead)).toBe('');
    expect(wbClaimReason(got.profile, MAPS, 's-100', W, W + 2, dead)).toBe('expired');
    expect(sharedPercent({ hp: 1000, left: 1 })).toBe(99); expect(sharedPercent({ hp: 1000, left: 0 })).toBe(100);
  });

  it('the shared HP is fixed from last week, within its bounds', () => {
    expect(sharedHpFor(rules, 0)).toBe(rules.hp.min);
    expect(sharedHpFor(rules, 100)).toBe(100 * rules.hp.perAccount);
    expect(sharedHpFor(rules, 1e9)).toBe(rules.hp.max);
  });

  it('save v65 keeps the book; a v63 save loads unchanged; a broken book is refused', () => {
    const p = attempts(base(), 2); const game: Game = { profile: p, run: null };
    const raw = currentSave(game); expect(JSON.parse(raw).version).toBe(SAVE_VERSION); expect(SAVE_VERSION).toBe(66);
    expect(parseGame(raw, home, lookup, MAPS).profile.worldBoss).toEqual(p.worldBoss);
    const v63: Profile = { ...p }; delete v63.worldBoss;
    expect(parseGame(JSON.stringify({ version: 63, profile: v63, run: null }), home, lookup, MAPS).profile.worldBoss).toBeUndefined();
    const w = p.worldBoss!.weeks[0]!;
    const bad = (weeks: unknown) => () => parseGame(JSON.stringify({ version: SAVE_VERSION, profile: { ...p, worldBoss: { weeks } }, run: null }), home, lookup, MAPS);
    expect(bad([{ ...w, attempts: rules.attempts + 1 }])).toThrow();
    expect(bad([{ ...w, claimed: [] }])).toThrow(); // p-2 reached but unpaid
    expect(bad([{ ...w, attempts: 1, claimed: ['p-2'] }])).toThrow(); // paid before it was reached
    expect(bad([{ ...w, legacy: { ...w.legacy!, best: w.legacy!.damage + 1 } }])).toThrow();
    expect(bad([{ ...w, week: W - 2 }, w])).toThrow(); // not consecutive
    expect(bad([{ ...w, claimed: ['p-2', 's-77'] }])).toThrow();
  });

  it('the weekly value fits the P04-06 budget with the map-3 sweep cut', () => {
    const wb = rules.attempts * value(rules.attemptReward) + rules.personal.reduce((n, m) => n + value(m.reward), 0) + rules.shared.reduce((n, m) => n + value(m.reward), 0);
    expect(wb).toBe(114);
    const before = 180 + 2 * 90 + 14 * (30 + 2 * 15); // P04-06, before shards and the World Boss
    const board = gameRules.board.weekly.reduce((n, o) => n + value(o.reward), 0);
    const sweeps = gameRules.sweep.daily * 7 * value(home.sweepReward!.normal);
    expect(board + sweeps + wb).toBeLessThanOrEqual(before);
    expect(board + sweeps + wb).toBeGreaterThanOrEqual(before * 0.98);
    // World Boss rewards need a finished attempt: no milestone is paid by a sweep or login.
    expect(home.sweepReward).toEqual({ normal: { ore: 24, gold: 12, dust: 2, tomes: 1 }, hard: { ore: 24, gold: 12, dust: 2, tomes: 2 } });
  });

  it('the command layer runs the same rule offline (device day) and refuses a device day online', () => {
    const p = base(); const g: Game = { profile: p, run: null }; const list = turns(p);
    const ctx = { ...GAME_CONTEXT, seeds: sequenceSeeds([1]) };
    const off = applyCommand(g, { kind: 'worldBoss', attempt: 1, commands: list, day: D }, ctx);
    expect('game' in off && off.game.profile).toEqual(worldBossAttempt(p, MAPS, lookup, W, 1, list).profile);
    expect(applyCommand(g, { kind: 'worldBoss', attempt: 1, commands: list, day: D }, { ...ctx, clock: { day: D } })).toEqual({ rejected: 'client_day' });
    expect(applyCommand(g, { kind: 'claimWorldBoss', id: 's-50', week: W, day: D }, ctx)).toEqual({ rejected: 'offline' });
  });
});

// ---- Server ----
function host(start = midnight(D) + 10 * HOUR, store: HostStore & ReturnType<typeof memoryStore> = memoryStore(), profile = base()) {
  const game: Game = { profile, run: null };
  store.state = { game, book: emptyBook() }; store.snapshots.push({ seq: 0, game, origin: 'import', at: 0 });
  const clock = { t: start }; let n = 0; let rid = 0;
  const h = new GameHost(store, GAME_CONTEXT, () => 101 + n++, VERSION, () => clock.t);
  const send = (command: unknown, boss?: { week: number; hp: number; left: number }, requestId = `req-${String(++rid).padStart(16, '0')}`) => {
    const seq = h.view().lastSeq + 1; return { requestId, seq, answer: h.command({ requestId, seq, command }, sha(command), boss) };
  };
  return { clock, h, store, send, game: () => store.load()!.game! };
}
const body = (a: { status: number; body: unknown }) => a.body as CommandReply;
const attemptCmd = (g: Game, n = (g.profile.worldBoss?.weeks.at(-1)?.attempts ?? 0) + 1) => ({ kind: 'worldBoss', attempt: n, commands: turns(g.profile) });

describe('P11-04 World Boss on the server', () => {
  it('commits an attempt with its receipts and queues one hit; a retry answers the same and adds nothing', () => {
    const s = host(); const cmd = attemptCmd(s.game());
    const first = s.send(cmd); const reply = body(first.answer) as Extract<CommandReply, { status: 'applied' }>;
    expect(reply.status).toBe('applied'); expect(reply.receipts).toEqual([`wb:w${W}:a1`]);
    const ev = reply.events.find(e => e.type === 'wbAttempt') as unknown as { damage: number };
    expect(s.store.pendingHits()).toEqual([{ id: `w${W}:a1`, week: W, damage: ev.damage }]);
    // A new request repeating the attempt number is refused as stale.
    expect(body(s.send(cmd).answer)).toMatchObject({ status: 'rejected', reason: 'stale' });
    // Retry after midnight of the next week: the same stored answer; no second receipt or hit.
    s.clock.t = midnight(D + 7) + HOUR;
    expect(s.h.command({ requestId: first.requestId, seq: first.seq, command: cmd }, sha(cmd)).body).toEqual(reply);
    expect(s.store.ledger().map(r => r.receipt)).toEqual([`wb:w${W}:a1`]); expect(s.store.pendingHits()).toHaveLength(1);
    expect(s.h.verify()).toMatchObject({ ok: true });
  });

  it('the second attempt pays the p-2 milestone under its own receipt; the week turns at Monday 00:00 Bangkok', () => {
    const s = host(midnight(D + 6) + 23 * HOUR); // Sunday 23:00 in Bangkok
    s.send(attemptCmd(s.game()));
    s.clock.t = midnight(D + 7) - 1; // Sunday 23:59:59.999
    const second = body(s.send(attemptCmd(s.game())).answer) as Extract<CommandReply, { status: 'applied' }>;
    expect(second.receipts).toEqual([`wb:w${W}:a2`, `wb:w${W}:p-2`]);
    s.clock.t = midnight(D + 7); // Monday: a fresh week, attempt 1 again
    const next = body(s.send(attemptCmd(s.game(), 1)).answer) as Extract<CommandReply, { status: 'applied' }>;
    expect(next.receipts).toEqual([`wb:w${W + 1}:a1`]);
    expect(s.game().profile.worldBoss!.weeks.map(w => [w.week, w.attempts])).toEqual([[W, 2], [W + 1, 1]]);
    expect(s.h.verify()).toMatchObject({ ok: true });
  });

  it('a shared claim runs with the HP the Worker read, replays from the log, and fails verify if that record is changed', () => {
    const state = fakeDurableState(); const store = sqlStore(state);
    const game: Game = { profile: base(), run: null }; let n = 0;
    const h = new GameHost(store, GAME_CONTEXT, () => 7 + n++, VERSION, () => midnight(D) + HOUR);
    const send = (seq: number, command: unknown, boss?: { week: number; hp: number; left: number }) => h.command({ requestId: `req-${String(seq).padStart(16, '0')}`, seq, command }, sha(command), boss);
    // Start from an import-like snapshot of the game.
    store.commitImport({ game, book: emptyBook() }, { seq: 0, game, origin: 'import', at: 0 }, { requestId: 'imp', payloadSha256: 'x', saveVersion: 64, seq: 0, at: 0 }, '{}');
    expect(body(send(1, attemptCmd(game, 1)))).toMatchObject({ status: 'applied' });
    expect(body(send(2, { kind: 'claimWorldBoss', id: 's-50', week: W }))).toMatchObject({ status: 'rejected', reason: 'offline' });
    expect(body(send(3, { kind: 'claimWorldBoss', id: 's-50', week: W }, { week: W, hp: 1000, left: 400 }))).toMatchObject({ status: 'applied', receipts: [`wb:w${W}:s-50`] });
    expect(h.verify()).toMatchObject({ ok: true });
    state.db.prepare('UPDATE log SET boss = ? WHERE seq = 3').run(JSON.stringify({ week: W, hp: 1000, left: 900 }));
    expect(h.verify()).toMatchObject({ ok: false, seq: 3, reason: 'status' });
  });

  it('the shared object takes each hit once, never goes below 0, and late hits after the kill remove nothing', () => {
    const clock = { t: midnight(D) + HOUR }; const store = memoryBossStore();
    const boss = new WorldBossHost(store, { ...rules, hp: { perAccount: 1, min: 1000, max: 1000 } }, () => clock.t);
    expect(boss.status()).toMatchObject({ week: W, hp: 1000, left: 1000, accounts: 0 });
    const a = 'a'.repeat(32), b = 'b'.repeat(32), c = 'c'.repeat(32);
    const hit = (acc: string, n: number, damage: number, week = W) => ({ id: `${acc}:w${week}:a${n}`, week, account: acc, damage });
    expect(boss.contribute([hit(a, 1, 600)]).applied).toEqual({ [`${a}:w${W}:a1`]: 600 });
    // Two attempts finishing together: the second takes only what is left (the kill), the third nothing.
    const both = boss.contribute([hit(b, 1, 700), hit(c, 1, 300)]);
    expect(both.applied).toEqual({ [`${b}:w${W}:a1`]: 400, [`${c}:w${W}:a1`]: 0 });
    expect(boss.status()).toMatchObject({ left: 0, accounts: 3 });
    // A resend (the answer was lost) is acknowledged with what it took the first time.
    expect(boss.contribute([hit(a, 1, 600)])).toEqual({ taken: [`${a}:w${W}:a1`], applied: { [`${a}:w${W}:a1`]: 600 } });
    expect(store.hits).toHaveLength(3);
    // Next week's HP comes from this week's three accounts; a hit for a closed week is acknowledged, not taken.
    clock.t = midnight(D + 14) + HOUR;
    expect(boss.contribute([hit(a, 2, 50)]).applied).toEqual({ [`${a}:w${W}:a2`]: 0 });
    expect(boss.status(W + 2)).toMatchObject({ week: W + 2, hp: 1000 });
    expect(boss.status(W)).toBeNull();
  });
});

// ---- Worker + Durable Objects (real SQLite in Node) ----
const SESSION = 'a'.repeat(32);
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: SESSION, 'Content-Type': 'application/json' });
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
async function player(s: Server, profile = base()) {
  const g = await (await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': '198.51.100.7' } })).json() as { accountId: string; token: string };
  await call(s, '/v1/session', { method: 'POST', headers: headers(g.token) });
  const payload = currentSave({ profile, run: null }); const digest = createHash('sha256').update(payload).digest('hex');
  s.clock.t += 12_000;
  const imp = await call(s, '/v1/import', { method: 'POST', headers: headers(g.token), body: JSON.stringify({ format: 1, requestId: `imp_${digest.slice(0, 40)}`, baseRevision: 0, saveVersion: SAVE_VERSION, payload, payloadBytes: new TextEncoder().encode(payload).byteLength, payloadSha256: digest }) });
  expect(imp.status).toBe(201);
  let seq = 0;
  const send = async (command: unknown) => (await (await call(s, '/v1/command', { method: 'POST', headers: headers(g.token), body: JSON.stringify({ requestId: `wb-${g.accountId.slice(0, 8)}-${String(++seq).padStart(6, '0')}`, seq, command }) })).json()) as CommandReply;
  return { ...g, send };
}
const shared = async (s: Server, token: string) => (await (await call(s, '/v1/worldboss', { headers: headers(token) })).json()) as { week: number; current: { hp: number; left: number; accounts: number } };

describe('P11-04 World Boss through the Worker', () => {
  it('an attempt lowers the shared HP once; a shared claim pays from the server progress', async () => {
    const s = server(); s.clock.t = midnight(D) + HOUR;
    const p = await player(s);
    const before = await shared(s, p.token); expect(before.week).toBe(W); expect(before.current).toMatchObject({ hp: rules.hp.min, left: rules.hp.min, accounts: 0 });
    const r = await p.send(attemptCmd(storedGame(s, p.accountId)!)) as Extract<CommandReply, { status: 'applied' }>;
    const dmg = (r.events.find(e => e.type === 'wbAttempt') as unknown as { damage: number }).damage;
    const after = await shared(s, p.token);
    expect(after.current).toMatchObject({ left: rules.hp.min - dmg, accounts: 1 });
    expect(s.objects.get(p.accountId)!.host.pendingHits()).toEqual([]);
    // Below 50%: not yet. Once the server is past half, the claim pays.
    expect(await p.send({ kind: 'claimWorldBoss', id: 's-50', week: W })).toMatchObject({ status: 'rejected', reason: 'progress' });
    s.boss.host.contribute([{ id: `${'f'.repeat(32)}:w${W}:a1`, week: W, account: 'f'.repeat(32), damage: rules.hp.min }]);
    expect(await p.send({ kind: 'claimWorldBoss', id: 's-50', week: W })).toMatchObject({ status: 'applied', receipts: [`wb:w${W}:s-50`] });
  });

  it('a hit the shared object did not take waits in the outbox and is sent with the next answer', async () => {
    const s = server(); s.clock.t = midnight(D) + HOUR;
    const p = await player(s);
    s.boss.up = false;
    expect(await p.send(attemptCmd(storedGame(s, p.accountId)!))).toMatchObject({ status: 'applied' }); // the player is paid anyway
    expect(s.objects.get(p.accountId)!.host.pendingHits()).toHaveLength(1);
    s.boss.up = true;
    const state = await call(s, '/v1/state', { headers: headers(p.token) });
    expect(state.status).toBe(200); expect(state.headers.get(HITS_HEADER)).toBeNull();
    expect(s.objects.get(p.accountId)!.host.pendingHits()).toEqual([]);
    expect((await shared(s, p.token)).current.accounts).toBe(1);
  });

  it('the device cannot pass its own shared HP or hits to the account object', async () => {
    const st = fakeDurableState(); const h = new GameHost(sqlStore(st), GAME_CONTEXT, () => 1, VERSION, () => midnight(D));
    // Only the Worker talks to the object; the API builds a fresh request, so device headers never reach it.
    const r = await handleAccountRequest(h, new Request('https://game/hits/taken', { method: 'POST', body: '{"ids":[1]}' }));
    expect(r.status).toBe(400);
  });
});
