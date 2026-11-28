import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import { canonicalJson, emptyBook, type CommandReply } from '../src/core/command/command-envelope';
import { SAVE_VERSION, type Game } from '../src/core/save/expedition-save';
import { weekOf } from '../src/core/world/board';
import { newProfile } from '../src/core/world/profile';
import { levelOf } from '../src/core/world/world';
import type { MapDefinition, Profile, WbBossId } from '../src/core/world/types';
import { trioSharedHp, wbEncounter } from '../src/core/world/world-boss';
import { HITS_HEADER, SESSION_HEADER, sqlStore } from '../src/server/account-object';
import { CONTENT_HEADER, handle } from '../src/server/api';
import { GameHost, memoryStore, type GameContext } from '../src/server/game-host';
import { GAME_DAY_OFFSET_MINUTES } from '../src/server/ledger';
import { GAME_CONTEXT } from '../src/server/worker';
import { handleBossRequest, memoryBossStore, sqlBossStore, WorldBossHost, type PublicBar } from '../src/server/world-boss';
import { currentSave } from './fixtures/current-save';
import { fakeDurableState, server, storedGame, VERSION, type Server } from './fixtures/server-fakes';
import { wbTurns } from './fixtures/world-boss';

// P11-05 step 3 (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §5): the World Boss object keeps three bars a week from
// `trio.from` on (the warden's one bar before it, and P11-04 tables migrate to it), each bar's HP from last week's
// attempts on that boss, hits carry their boss, claims read the bar the id names, the ledger records boss shards, and
// `/verify` replays trio attempts and claims. The shipped rules start the trio in week 2969 (OD-52); these tests schedule it at W (2968) on a copy.

const rules = gameRules.worldBoss; const trio = rules.trio;
const D = 20_773; const W = weekOf(D); // D is a Monday
const HOUR = 3_600_000, DAY_MS = 24 * HOUR;
const midnight = (d: number) => d * DAY_MS - GAME_DAY_OFFSET_MINUTES * 60_000;
const sha = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');
const commander = { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' } as const;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(MAPS[0]!, 5), tutorialDone: true, commander: { ...commander },
  cleared: MAPS.map(m => m.id), bank: { ore: 100, gold: 100, shard: 7, dust: 10 }, ...patch });
// The maps with the trio scheduled from week `from`, and the server context and rules that use them.
const live = (from = W): MapDefinition[] => MAPS.map((m, i) => i ? m : { ...m, worldBoss: { ...m.worldBoss, trio: { ...m.worldBoss.trio, from } } });
const LIVE = live(); const LIVE_CTX: GameContext = { ...GAME_CONTEXT, home: LIVE[0]!, maps: LIVE };
const liveRules = LIVE[0]!.worldBoss;
const attemptCmd = (g: Game, boss: WbBossId, n = (g.profile.worldBoss?.weeks.find(w => w.week === W)?.attempts ?? 0) + 1) =>
  ({ kind: 'worldBoss', attempt: n, boss, commands: wbTurns(wbEncounter(g.profile, LIVE[0]!, lookup, boss)!, rules.maxRounds) });
const hit = (acc: string, n: number, damage: number, boss?: WbBossId, week = W) => ({ id: `${acc}:w${week}:a${n}`, week, account: acc, damage, ...(boss ? { boss } : {}) });
const A = 'a'.repeat(32), B = 'b'.repeat(32), C = 'c'.repeat(32);
type Applied = Extract<CommandReply, { status: 'applied' }>;

describe('P11-05 World Boss object: three bars', () => {
  it('a warden week has the one warden bar; a trio week opens three, each from last week\'s attempts on it', () => {
    const clock = { t: midnight(D - 7) + HOUR }; const store = memoryBossStore();
    const boss = new WorldBossHost(store, liveRules, () => clock.t);
    // Week W-1 is before `from`: the warden alone, as in P11-04.
    expect(boss.bars()!.map(b => b.boss)).toEqual(['warden']);
    boss.contribute([hit(A, 1, 100, undefined, W - 1), hit(A, 2, 100, undefined, W - 1), hit(B, 1, 100, undefined, W - 1), hit(C, 1, 100, undefined, W - 1),
      hit(C, 2, 100, undefined, W - 1), hit(C, 3, 100, undefined, W - 1), hit(C, 4, 100, undefined, W - 1)]);
    expect(boss.status(W - 1)).toMatchObject({ accounts: 3, attempts: 7 });
    // The first trio week: the warden's 7 attempts ÷ 3 = 2 each, so every bar opens at the minimum.
    clock.t = midnight(D) + HOUR;
    const first = boss.bars()!;
    expect(first.map(b => [b.boss, b.hp, b.left])).toEqual(['kragmor', 'valdrakk', 'morvane'].map(b => [b, trio.hp.min, trio.hp.min]));
    expect(boss.status(W, 'warden')).toBeNull();
    // Five attempts on Kragmor and two on Valdrakk; next week Kragmor has 5 × 400 = 2000, the others the minimum.
    for (let n = 1; n <= 5; n++) boss.contribute([hit(A, n, 10, 'kragmor')]);
    boss.contribute([hit(B, 1, 10, 'valdrakk'), hit(B, 2, 10, 'valdrakk')]);
    clock.t = midnight(D + 7) + HOUR;
    expect(boss.bars()!.map(b => [b.boss, b.hp])).toEqual([['kragmor', trioSharedHp(liveRules, 5)], ['valdrakk', trio.hp.min], ['morvane', trio.hp.min]]);
    expect(trioSharedHp(liveRules, 5)).toBe(2000);
  });

  it('the shipped rules (OD-52): week 2968 is the warden\'s, week 2969 opens the trio from the warden\'s attempts ÷ 3', () => {
    expect(W).toBe(2968); expect(trio.from).toBe(W + 1);
    const clock = { t: midnight(D) + HOUR }; const boss = new WorldBossHost(memoryBossStore(), rules, () => clock.t);
    expect(boss.bars()!.map(b => b.boss)).toEqual(['warden']);
    const hits = Array.from({ length: 30 }, (_, i) => hit(`${i % 10}`.repeat(32), Math.floor(i / 10) + 1, 50));
    boss.contribute(hits);
    expect(boss.status(W)).toMatchObject({ accounts: 10, attempts: 30 });
    clock.t = midnight(D + 7) + HOUR;
    expect(boss.bars()!.map(b => [b.boss, b.hp, b.left])).toEqual(['kragmor', 'valdrakk', 'morvane'].map(b => [b, 4000, 4000]));
    expect(boss.status(W + 1, 'warden')).toBeNull();
    expect(boss.status(W)).toMatchObject({ attempts: 30, left: boss.status(W)!.hp - 1500 });
  });

  it('each hit lowers only its own bar, once, never below 0; a hit on a bar the week lacks takes nothing', () => {
    const clock = { t: midnight(D) + HOUR }; const store = memoryBossStore();
    const boss = new WorldBossHost(store, liveRules, () => clock.t);
    expect(boss.contribute([hit(A, 1, 600, 'kragmor')]).applied).toEqual({ [`${A}:w${W}:a1`]: 600 });
    // Two attempts finishing together on Kragmor: the second takes what is left (the kill), the third nothing.
    const both = boss.contribute([hit(B, 1, 800, 'kragmor'), hit(C, 1, 300, 'kragmor'), hit(C, 2, 300, 'morvane')]);
    expect(both.applied).toEqual({ [`${B}:w${W}:a1`]: 800, [`${C}:w${W}:a1`]: 100, [`${C}:w${W}:a2`]: 300 });
    expect(boss.contribute([hit(A, 2, 50, 'kragmor')]).applied).toEqual({ [`${A}:w${W}:a2`]: 0 });
    expect(boss.bars()!.map(b => [b.boss, b.left, b.accounts, b.attempts])).toEqual([['kragmor', 0, 3, 4], ['valdrakk', 1500, 0, 0], ['morvane', 1200, 1, 1]]);
    // A resend answers what the hit took the first time; a warden hit in a trio week is acknowledged and takes nothing.
    expect(boss.contribute([hit(A, 1, 600, 'kragmor')]).applied).toEqual({ [`${A}:w${W}:a1`]: 600 });
    expect(boss.contribute([hit(A, 3, 999)])).toEqual({ taken: [`${A}:w${W}:a3`], applied: { [`${A}:w${W}:a3`]: 0 } });
    expect(store.hits).toHaveLength(5);
  });

  it('a P11-04 object\'s weeks become warden bars (attempts counted from its hits) and its hits the warden\'s', async () => {
    const state = fakeDurableState(); const { sql } = state.storage;
    // The P11-04 schema and rows, as an object running the previous release holds them.
    sql.exec('CREATE TABLE weeks (week INTEGER PRIMARY KEY, hp INTEGER NOT NULL, left_hp INTEGER NOT NULL, accounts INTEGER NOT NULL, opened INTEGER NOT NULL)');
    sql.exec('CREATE TABLE hits (id TEXT PRIMARY KEY, week INTEGER NOT NULL, account TEXT NOT NULL, damage INTEGER NOT NULL, applied INTEGER NOT NULL, at INTEGER NOT NULL)');
    sql.exec('CREATE INDEX hits_week_account ON hits (week, account)');
    sql.exec('INSERT INTO weeks VALUES (?, 3000, 2100, 2, 5)', W - 1);
    for (const [id, acc] of [[`${A}:w${W - 1}:a1`, A], [`${A}:w${W - 1}:a2`, A], [`${B}:w${W - 1}:a1`, B]] as const) sql.exec('INSERT INTO hits VALUES (?, ?, ?, 300, 300, 7)', id, W - 1, acc);
    const clock = { t: midnight(D - 7) + 2 * HOUR };
    const host = new WorldBossHost(sqlBossStore(state), liveRules, () => clock.t);
    expect(host.status()).toEqual({ week: W - 1, boss: 'warden', hp: 3000, left: 2100, accounts: 2, attempts: 3, opened: 5 });
    expect(sql.exec('PRAGMA table_info(weeks)').toArray()).toEqual([]);
    // Old hits are the warden's: a resend is acknowledged as before, and the account is already counted.
    expect(host.contribute([hit(A, 1, 300, undefined, W - 1), hit(A, 3, 100, undefined, W - 1)]).applied).toEqual({ [`${A}:w${W - 1}:a1`]: 300, [`${A}:w${W - 1}:a3`]: 100 });
    expect(host.status()).toMatchObject({ left: 2000, accounts: 2, attempts: 4 });
    // Starting again (a new isolate) migrates nothing twice.
    const again = new WorldBossHost(sqlBossStore(state), liveRules, () => clock.t);
    expect(again.status()).toMatchObject({ left: 2000, attempts: 4 });
    // The first trio week opens from the warden's 4 attempts ÷ 3.
    clock.t = midnight(D) + HOUR;
    expect(again.bars()!.map(b => b.hp)).toEqual([trio.hp.min, trio.hp.min, trio.hp.min]);
    const status = await (await handleBossRequest(again, new Request(`https://boss/status?week=${W}&boss=valdrakk`))).json() as { week: number; status: PublicBar; bars: PublicBar[] };
    expect(status.status).toMatchObject({ boss: 'valdrakk', hp: trio.hp.min }); expect(status.bars.map(b => b.boss)).toEqual(['kragmor', 'valdrakk', 'morvane']);
    expect((await handleBossRequest(again, new Request(`https://boss/status?boss=nobody`))).status).toBe(400);
    expect((await handleBossRequest(again, new Request('https://boss/contribute', { method: 'POST', body: JSON.stringify({ hits: [{ ...hit(A, 1, 5), boss: 'nobody' }] }) }))).status).toBe(400);
  });
});

describe('P11-05 trio on the account object', () => {
  it('a trio attempt receipts its boss and shards and queues a hit for that bar; a shared claim reads that boss\'s bar and replays', () => {
    const state = fakeDurableState(); const store = sqlStore(state);
    const game: Game = { profile: base(), run: null }; let n = 0;
    const h = new GameHost(store, LIVE_CTX, () => 7 + n++, VERSION, () => midnight(D) + HOUR);
    store.commitImport({ game, book: emptyBook() }, { seq: 0, game, origin: 'import', at: 0 }, { requestId: 'imp', payloadSha256: 'x', saveVersion: SAVE_VERSION, seq: 0, at: 0 }, '{}');
    let seq = 0;
    const send = (command: unknown, boss?: { week: number; hp: number; left: number; boss?: WbBossId }) => { seq++; return h.command({ requestId: `req-${String(seq).padStart(16, '0')}`, seq, command }, sha(command), boss).body as CommandReply; };
    const cur = () => store.load()!.game!;
    const one = send(attemptCmd(cur(), 'kragmor')) as Applied;
    expect(one.receipts).toEqual([`wb:w${W}:a1`]);
    const two = send(attemptCmd(cur(), 'valdrakk')) as Applied;
    expect(two.receipts).toEqual([`wb:w${W}:a2`, `wb:w${W}:p-2`]);
    const damage = (r: Applied) => (r.events.find(e => e.type === 'wbAttempt') as unknown as { damage: number }).damage;
    const team = expect.objectContaining({ heroes: expect.any(Array) });
    expect(store.pendingHits()).toEqual([{ id: `w${W}:a1`, week: W, damage: damage(one), boss: 'kragmor', team }, { id: `w${W}:a2`, week: W, damage: damage(two), boss: 'valdrakk', team }]);
    // The warden's bar or another boss's never pays a trio milestone.
    expect(send({ kind: 'claimWorldBoss', id: 'kragmor:s-50', week: W }, { week: W, hp: 1500, left: 0 })).toMatchObject({ status: 'rejected', reason: 'expired' });
    expect(send({ kind: 'claimWorldBoss', id: 'kragmor:s-50', week: W }, { week: W, hp: 1500, left: 0, boss: 'valdrakk' })).toMatchObject({ status: 'rejected', reason: 'expired' });
    expect(send({ kind: 'claimWorldBoss', id: 'morvane:s-50', week: W }, { week: W, hp: 1500, left: 0, boss: 'morvane' })).toMatchObject({ status: 'rejected', reason: 'absent' });
    expect(send({ kind: 'claimWorldBoss', id: 'kragmor:s-50', week: W }, { week: W, hp: 1500, left: 700, boss: 'kragmor' })).toMatchObject({ status: 'applied', receipts: [`wb:w${W}:kragmor:s-50`] });
    const shards = trio.attemptShards;
    expect(store.ledger().map(r => [r.receipt, r.boss, r.shards])).toEqual([
      [`wb:w${W}:a1`, 'kragmor', shards], [`wb:w${W}:a2`, 'valdrakk', shards], [`wb:w${W}:p-2`, 'valdrakk', trio.personal[0]!.shards],
      [`wb:w${W}:kragmor:s-50`, 'kragmor', trio.shared[0]!.shards],
    ]);
    expect(cur().profile.bossShards).toEqual({ kragmor: shards + trio.shared[0]!.shards!, valdrakk: shards + trio.personal[0]!.shards! });
    // Admin verify replays the trio attempts and the claim with its recorded bar; a changed record fails.
    expect(h.verify()).toMatchObject({ ok: true });
    const claimSeq = seq;
    state.db.prepare('UPDATE log SET boss = ? WHERE seq = ?').run(JSON.stringify({ week: W, hp: 1500, left: 700, boss: 'valdrakk' }), claimSeq);
    expect(h.verify()).toMatchObject({ ok: false, seq: claimSeq, reason: 'status' });
  });

  it('a P11-04 account object gains the boss columns; its warden hits and receipts read as before', () => {
    const state = fakeDurableState(); const { sql } = state.storage;
    sql.exec('CREATE TABLE wb_hits (id TEXT PRIMARY KEY, week INTEGER NOT NULL, damage INTEGER NOT NULL, sent INTEGER NOT NULL, at INTEGER NOT NULL)');
    sql.exec(`CREATE TABLE reward_ledger (receipt TEXT PRIMARY KEY, seq INTEGER NOT NULL, kind TEXT NOT NULL, period TEXT NOT NULL,
      ref TEXT NOT NULL, reward TEXT NOT NULL, day INTEGER NOT NULL, at INTEGER NOT NULL)`);
    sql.exec('INSERT INTO wb_hits VALUES (?, ?, 120, 0, 1)', `w${W}:a1`, W);
    sql.exec("INSERT INTO reward_ledger VALUES (?, 1, 'worldBoss', ?, 'attempt', '{\"ore\":6,\"gold\":3}', 1, 1)", `wb:w${W}:a1`, `w${W}`);
    const store = sqlStore(state);
    expect(store.pendingHits()).toEqual([{ id: `w${W}:a1`, week: W, damage: 120 }]);
    expect(store.ledger()).toEqual([{ receipt: `wb:w${W}:a1`, seq: 1, kind: 'worldBoss', period: `w${W}`, ref: 'attempt', reward: { ore: 6, gold: 3 }, day: 1, at: 1 }]);
  });

  it('the in-memory store keeps the hit\'s boss like the SQL one', () => {
    const store = memoryStore(); const game: Game = { profile: base(), run: null };
    store.state = { game, book: emptyBook() };
    const h = new GameHost(store, LIVE_CTX, () => 3, VERSION, () => midnight(D) + HOUR);
    const cmd = attemptCmd(game, 'morvane');
    expect(h.command({ requestId: 'req-0000000000000001', seq: 1, command: cmd }, sha(cmd)).body).toMatchObject({ status: 'applied' });
    expect(store.pendingHits()).toEqual([expect.objectContaining({ id: `w${W}:a1`, boss: 'morvane', team: expect.objectContaining({ level: expect.any(Number) }) })]);
  });
});

// ---- Worker + Durable Objects (real SQLite in Node) ----
const SESSION = 'a'.repeat(32);
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: SESSION, 'Content-Type': 'application/json' });
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
async function player(s: Server, ip = '198.51.100.7') {
  const g = await (await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': ip } })).json() as { accountId: string; token: string };
  await call(s, '/v1/session', { method: 'POST', headers: headers(g.token) });
  const payload = currentSave({ profile: base(), run: null }); const digest = createHash('sha256').update(payload).digest('hex');
  s.clock.t += 12_000;
  const imp = await call(s, '/v1/import', { method: 'POST', headers: headers(g.token), body: JSON.stringify({ format: 1, requestId: `imp_${digest.slice(0, 40)}`, baseRevision: 0, saveVersion: SAVE_VERSION, payload, payloadBytes: new TextEncoder().encode(payload).byteLength, payloadSha256: digest }) });
  expect(imp.status).toBe(201);
  let seq = 0;
  const send = async (command: unknown) => (await (await call(s, '/v1/command', { method: 'POST', headers: headers(g.token), body: JSON.stringify({ requestId: `wb-${g.accountId.slice(0, 8)}-${String(++seq).padStart(6, '0')}`, seq, command }) })).json()) as CommandReply;
  return { ...g, send };
}
interface Status { week: number; current: PublicBar | null; last: PublicBar | null; bars: PublicBar[]; lastBars: PublicBar[] }
const status = async (s: Server, token: string) => (await (await call(s, '/v1/worldboss', { headers: headers(token) })).json()) as Status;
const left = (st: Status) => Object.fromEntries(st.bars.map(b => [b.boss, b.left]));

describe('P11-05 trio through the Worker', () => {
  it('/v1/worldboss answers the warden while `from` is unset (the live rules)', async () => {
    const s = server(); s.clock.t = midnight(D) + HOUR;
    const p = await player(s);
    const st = await status(s, p.token);
    expect(st.current).toMatchObject({ boss: 'warden', hp: rules.hp.min }); expect(st.bars.map(b => b.boss)).toEqual(['warden']);
    // Last week opens on first read too (as in P11-04): the warden's bar only.
    expect(st.lastBars.map(b => [b.week, b.boss])).toEqual([[W - 1, 'warden']]); expect(st.last).toMatchObject({ week: W - 1, boss: 'warden' });
  });

  it('three bars; an attempt lowers its boss\'s bar once; a claim pays from the bar its id names; the outbox keeps the boss', async () => {
    const s = server(undefined, undefined, LIVE_CTX); s.clock.t = midnight(D) + HOUR;
    const p = await player(s);
    const before = await status(s, p.token);
    expect(before.current).toBeNull(); expect(before.bars.map(b => [b.boss, b.hp, b.left])).toEqual(['kragmor', 'valdrakk', 'morvane'].map(b => [b, trio.hp.min, trio.hp.min]));
    const r = await p.send(attemptCmd(storedGame(s, p.accountId)!, 'valdrakk')) as Applied;
    expect(r.status).toBe('applied');
    const dmg = (r.events.find(e => e.type === 'wbAttempt') as unknown as { damage: number }).damage;
    expect(left(await status(s, p.token))).toEqual({ kragmor: trio.hp.min, valdrakk: Math.max(0, trio.hp.min - dmg), morvane: trio.hp.min });
    // Leaderboard (2026-11-28): the hit carried the attempt's team (camp level and fielded heroes with stars) to the board.
    const g0 = storedGame(s, p.accountId)!;
    const board = await (await call(s, '/v1/worldboss/board?boss=valdrakk', { headers: headers(p.token) })).json() as { rows: { you: boolean; total: number; team: unknown }[] };
    expect(board.rows).toEqual([expect.objectContaining({ you: true, total: dmg, team: { level: levelOf(LIVE[0]!, g0.profile), heroes: g0.profile.party.deployed.map(id => [id, g0.profile.members[id]!.stars]) } })]);
    // A second account takes Valdrakk past half: the claim pays from Valdrakk's bar, not from Kragmor's.
    s.boss.host.contribute([{ id: `${'f'.repeat(32)}:w${W}:a1`, week: W, account: 'f'.repeat(32), damage: trio.hp.min, boss: 'valdrakk' }]);
    expect(await p.send({ kind: 'claimWorldBoss', id: 'kragmor:s-50', week: W })).toMatchObject({ status: 'rejected' });
    expect(await p.send({ kind: 'claimWorldBoss', id: 'valdrakk:s-50', week: W })).toMatchObject({ status: 'applied', receipts: [`wb:w${W}:valdrakk:s-50`] });
    // The shared object is down: the hit waits with its boss and lands on Morvane's bar with the next answer.
    s.boss.up = false;
    const m = await p.send(attemptCmd(storedGame(s, p.accountId)!, 'morvane')) as Applied;
    expect(m.status).toBe('applied');
    expect(s.objects.get(p.accountId)!.host.pendingHits()).toEqual([expect.objectContaining({ id: `w${W}:a2`, boss: 'morvane' })]);
    s.boss.up = true;
    const st = await call(s, '/v1/state', { headers: headers(p.token) });
    expect(st.headers.get(HITS_HEADER)).toBeNull();
    const mDmg = (m.events.find(e => e.type === 'wbAttempt') as unknown as { damage: number }).damage;
    const after = await status(s, p.token);
    expect(after.bars.find(b => b.boss === 'morvane')).toMatchObject({ left: trio.hp.min - mDmg, accounts: 1, attempts: 1 });
    expect(after.bars.find(b => b.boss === 'kragmor')).toMatchObject({ left: trio.hp.min, attempts: 0 });
    // Admin-style replay of the account's whole log passes.
    expect(s.objects.get(p.accountId)!.host.verify()).toMatchObject({ ok: true });
    // Next week: last week's bars are reported, this week's open from them (Valdrakk 2 attempts → still the minimum).
    s.clock.t = midnight(D + 7) + HOUR;
    const next = await status(s, p.token);
    expect(next.lastBars.map(b => [b.boss, b.attempts])).toEqual([['kragmor', 0], ['valdrakk', 2], ['morvane', 1]]);
    expect(next.bars.every(b => b.week === W + 1 && b.hp === trio.hp.min)).toBe(true);
  });
});
