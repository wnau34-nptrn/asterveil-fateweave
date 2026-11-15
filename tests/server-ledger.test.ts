import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { canonicalJson, emptyBook, type CommandReply } from '../src/core/command/command-envelope';
import { applyCommand, type CommandContext, type GameCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import type { Game } from '../src/core/save/expedition-save';
import { weekOf } from '../src/core/world/board';
import { newProfile } from '../src/core/world/profile';
import type { Profile } from '../src/core/world/types';
import { handleAccountRequest, sqlStore } from '../src/server/account-object';
import { GameHost, memoryStore, type HostStore } from '../src/server/game-host';
import { GAME_DAY_OFFSET_MINUTES, ledgerRows, nextDayAt, serverDay } from '../src/server/ledger';
import { GAME_CONTEXT } from '../src/server/worker';
import { ServerClient, type ServerPort } from '../src/platform/server-client';
import { fakeDurableState, VERSION } from './fixtures/server-fakes';

// P09 reward ledger: online the server stamps the calendar day on sweep / claimBoard / depart, refuses a device day,
// and records each payout once under a receipt in the account's own SQLite. Offline play keeps the device day.

const HOUR = 3_600_000, DAY_MS = 24 * HOUR;
const D = 20_773; // a Monday (weekOf starts weeks on Monday)
// 00:00 Asia/Bangkok on game day `d`, in ms since epoch.
const midnight = (d: number) => d * DAY_MS - GAME_DAY_OFFSET_MINUTES * 60_000;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' },
  cleared: MAPS.map(m => m.id), bank: { ore: 100, gold: 100, shard: 7, dust: 10 }, sweep: { day: D - 2, supply: 6, used: {}, count: 0 }, ...patch });
const sha = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');

function setup(start = midnight(D) + 10 * HOUR, store: HostStore & { seed?(g: Game): void } = seeded(memoryStore())) {
  const clock = { t: start }; let n = 0; let rid = 0;
  const host = new GameHost(store, GAME_CONTEXT, () => 101 + n++, VERSION, () => clock.t);
  const send = (command: unknown, requestId = `req-${String(++rid).padStart(16, '0')}`) => {
    const seq = host.view().lastSeq + 1;
    return { requestId, seq, answer: host.command({ requestId, seq, command }, sha(command)) };
  };
  const game = () => (store.load()?.game ?? null)!;
  return { clock, host, store, send, game };
}
// A memory store holding `base()` as the account's game, with a snapshot to replay from (as after an import).
function seeded<T extends ReturnType<typeof memoryStore>>(s: T, profile = base()): T {
  const game: Game = { profile, run: null };
  s.state = { game, book: emptyBook() }; s.snapshots.push({ seq: 0, game, origin: 'import', at: 0 });
  return s;
}
const sweepCmd = (g: Game, patch: Record<string, unknown> = {}) => ({ kind: 'sweep', mapId: home.id, hard: false, serial: g.profile.sweep?.count ?? 0, ...patch });
const applied = (a: ReturnType<ReturnType<typeof setup>['send']>['answer']) => {
  expect(a.status).toBe(200); const body = a.body as CommandReply; expect(body.status).toBe('applied'); return body as Extract<CommandReply, { status: 'applied' }>;
};
const rejected = (a: ReturnType<ReturnType<typeof setup>['send']>['answer']) => { expect(a.status).toBe(200); return (a.body as Extract<CommandReply, { status: 'rejected' }>).reason; };

describe('P09 server calendar', () => {
  it('the game day turns at midnight Asia/Bangkok; the next day starts exactly there', () => {
    expect(serverDay(midnight(D))).toBe(D); expect(serverDay(midnight(D) - 1)).toBe(D - 1);
    expect(serverDay(midnight(D + 1) - 1)).toBe(D);
    expect(nextDayAt(midnight(D) + 5 * HOUR)).toBe(midnight(D + 1)); expect(nextDayAt(midnight(D))).toBe(midnight(D + 1));
    // 17:00 UTC is midnight in Bangkok.
    expect(new Date(midnight(D)).getUTCHours()).toBe(17);
  });
});

describe('P09 ledger: server-stamped day', () => {
  it('a sweep runs on the server day, pays once and records one receipt', () => {
    const t = setup(); const before = t.game().profile.bank.ore;
    const body = applied(t.send(sweepCmd(t.game())).answer);
    expect(body.receipts).toEqual(['sweep:1']);
    expect(t.game().profile.sweep!.day).toBe(D); expect(t.game().profile.bank.ore).toBeGreaterThan(before);
    expect(t.store.ledger()).toEqual([expect.objectContaining({ receipt: 'sweep:1', kind: 'sweep', period: `d${D}`, ref: `${home.id}:normal`, day: D, seq: 1 })]);
    expect(t.store.entries().at(-1)).toMatchObject({ seq: 1, day: D, status: 'applied' });
  });

  it('refuses a command that names its own day, whatever the day (clock skew cannot move the calendar)', () => {
    const t = setup();
    for (const day of [D, D + 3, D - 9]) {
      expect(rejected(t.send(sweepCmd(t.game(), { day })).answer)).toBe('client_day');
      expect(rejected(t.send({ kind: 'claimBoard', tab: 'daily', id: 'd-patrol', period: D, day }).answer)).toBe('client_day');
      expect(rejected(t.send({ kind: 'depart', mapId: ruinsMap.id, hard: false, day }).answer)).toBe('client_day');
    }
    // Nothing paid or stamped; the sequence numbers were used (as every refused command's are).
    expect(t.store.ledger()).toEqual([]); expect(t.game().profile.bank.ore).toBe(100); expect(t.game().run).toBeNull();
    expect(t.host.view().lastSeq).toBe(9); expect(t.host.verify()).toMatchObject({ ok: true, seq: 9 });
  });

  it('offline (no clock) the device day still decides, and a missing day is refused', () => {
    const ctx: CommandContext = { home, maps: MAPS, lookup, seeds: sequenceSeeds([]) };
    const g: Game = { profile: base(), run: null };
    const out = applyCommand(g, { ...sweepCmd(g), day: D + 1 } as GameCommand, ctx);
    expect('game' in out && out.game.profile.sweep!.day).toBe(D + 1);
    expect(applyCommand(g, sweepCmd(g) as GameCommand, ctx)).toEqual({ rejected: 'day' });
  });

  it('a departure is stamped with the server day for the board', () => {
    const t = setup(midnight(D + 2) + HOUR);
    applied(t.send({ kind: 'depart', mapId: ruinsMap.id, hard: false }).answer);
    expect(t.game().run!.day).toBe(D + 2); expect(t.store.ledger()).toEqual([]);
  });
});

describe('P09 ledger: retries and replay', () => {
  it('a retry after midnight gets the stored answer and pays nothing more', () => {
    const t = setup(midnight(D + 1) - 1000);
    const cmd = sweepCmd(t.game()); const first = t.send(cmd, 'retry-request-000001');
    const once = applied(first.answer); const bank = t.game().profile.bank;
    t.clock.t = midnight(D + 1) + 1000; // the answer was lost; the device sends the same request on the new day
    const again = t.host.command({ requestId: 'retry-request-000001', seq: first.seq, command: cmd }, sha(cmd));
    expect(again).toMatchObject({ status: 200, replayed: true }); expect(JSON.stringify(again.body)).toBe(JSON.stringify(once));
    expect(t.game().profile.bank).toEqual(bank); expect(t.game().profile.sweep!.day).toBe(D);
    expect(t.store.ledger().map(r => r.receipt)).toEqual(['sweep:1']);
  });

  it('verify replays the log with the stamped days across day and week boundaries', () => {
    const t = setup(midnight(D) - 2 * HOUR); // Sunday evening (day D-1, last week)
    applied(t.send(sweepCmd(t.game())).answer);
    t.clock.t = midnight(D) + HOUR; // Monday: a new day and a new week
    applied(t.send(sweepCmd(t.game())).answer); applied(t.send(sweepCmd(t.game())).answer);
    expect(t.store.ledger().map(r => [r.receipt, r.period])).toEqual([['sweep:1', `d${D - 1}`], ['sweep:2', `d${D}`], ['sweep:3', `d${D}`]]);
    expect(weekOf(D - 1)).toBe(weekOf(D) - 1);
    expect(t.host.verify()).toEqual({ ok: true, seq: 3, from: 0 });
    // A log whose stamped day is altered no longer replays to the stored game.
    const tampered = t.store as ReturnType<typeof memoryStore>; tampered.log[0]!.day = D - 5;
    expect(t.host.verify().ok).toBe(false);
  });

  it('a payout whose receipt exists already is refused instead of paid twice, and still replays', () => {
    const s = seeded(memoryStore());
    s.rows.push({ receipt: 'sweep:1', seq: 0, kind: 'sweep', period: `d${D}`, ref: 'x', reward: { ore: 1, gold: 1 }, day: D, at: 0 });
    const t = setup(undefined, s);
    expect(rejected(t.send(sweepCmd(t.game())).answer)).toBe('duplicate_receipt');
    expect(t.game().profile.bank.ore).toBe(100); expect(t.game().profile.sweep!.count).toBe(0);
    expect(s.log.at(-1)).toMatchObject({ status: 'rejected', refused: 'receipt' });
    expect(t.host.verify()).toMatchObject({ ok: true, seq: 1 });
  });
});

describe('P09 ledger: period boundaries', () => {
  it('the per-map daily limit counts on the server day and opens again at Bangkok midnight', () => {
    const t = setup(midnight(D + 1) - 3000);
    for (let i = 0; i < 3; i++) applied(t.send(sweepCmd(t.game())).answer);
    expect(rejected(t.send(sweepCmd(t.game())).answer)).toBe('quota');
    t.clock.t = midnight(D + 1);
    const next = applied(t.send(sweepCmd(t.game())).answer);
    expect(next.receipts).toEqual(['sweep:4']); expect(t.store.ledger().at(-1)!.period).toBe(`d${D + 1}`);
  });

  it('daily claims are receipted per period: a catch-up day from last week and today', () => {
    // Sunday D-1: two sweeps finish the daily patrol of D-1; the weekly return needs 9.
    const t = setup(midnight(D) - 3 * HOUR);
    applied(t.send(sweepCmd(t.game())).answer); applied(t.send(sweepCmd(t.game())).answer);
    t.clock.t = midnight(D) + HOUR; // Monday
    for (let i = 0; i < 2; i++) applied(t.send(sweepCmd(t.game())).answer);
    // Yesterday's daily is still claimable (catch-up), on its own receipt; today's too.
    expect(applied(t.send({ kind: 'claimBoard', tab: 'daily', id: 'd-patrol', period: D - 1 }).answer).receipts).toEqual([`board:daily:d${D - 1}:d-patrol`]);
    expect(applied(t.send({ kind: 'claimBoard', tab: 'daily', id: 'd-patrol', period: D }).answer).receipts).toEqual([`board:daily:d${D}:d-patrol`]);
    expect(rejected(t.send({ kind: 'claimBoard', tab: 'daily', id: 'd-patrol', period: D }).answer)).toBe('claimed');
    // A period the server has not reached yet is not open.
    expect(rejected(t.send({ kind: 'claimBoard', tab: 'daily', id: 'd-patrol', period: D + 1 }).answer)).toBe('expired');
    expect(t.store.ledger().filter(r => r.kind === 'board').map(r => r.period)).toEqual([`d${D - 1}`, `d${D}`]);
    expect(t.host.verify().ok).toBe(true);
  });
});

describe('P09 ledger rows', () => {
  it('weekly tasks and contracts are receipted per week; other events pay nothing', () => {
    const reward = { ore: 4, gold: 2 };
    expect(ledgerRows([
      { type: 'boardClaimed', tab: 'weekly', id: 'w-return', period: weekOf(D), reward },
      { type: 'boardClaimed', tab: 'contract', id: 'job-swift', period: weekOf(D), reward },
      { type: 'boardClaimed', tab: 'daily', id: 'd-patrol', period: D, reward },
      { type: 'departed', mapId: home.id, hard: false },
    ], 0, D, 7, 1).map(r => [r.receipt, r.period, r.kind])).toEqual([
      [`board:weekly:w${weekOf(D)}:w-return`, `w${weekOf(D)}`, 'board'], [`board:contract:w${weekOf(D)}:job-swift`, `w${weekOf(D)}`, 'board'],
      [`board:daily:d${D}:d-patrol`, `d${D}`, 'board'],
    ]);
  });
});

describe('P09 ledger: Durable Object storage', () => {
  it('adds the day columns to an older log, keeps receipts unique and rolls a duplicate back', () => {
    const state = fakeDurableState();
    state.storage.sql.exec(`CREATE TABLE log (seq INTEGER PRIMARY KEY, request_id TEXT NOT NULL, command TEXT NOT NULL, seeds TEXT NOT NULL,
     status TEXT NOT NULL, content_version TEXT NOT NULL, at INTEGER NOT NULL)`);
    state.storage.sql.exec(`INSERT INTO log VALUES (1, 'old', '{"kind":"refreshBoard"}', '[]', 'rejected', 'v', 5)`);
    const store = sqlStore(state);
    expect(store.entries()).toEqual([{ seq: 1, requestId: 'old', command: { kind: 'refreshBoard' }, seeds: [], status: 'rejected', contentVersion: 'v', at: 5 }]);
    sqlStore(state); // a second start finds the columns in place
    const row = { receipt: 'sweep:1', seq: 2, kind: 'sweep' as const, period: `d${D}`, ref: 'm:normal', reward: { ore: 3, gold: 2 }, day: D, at: 9 };
    const entry = { seq: 2, requestId: 'r2', command: {}, seeds: [], status: 'applied' as const, contentVersion: 'v', at: 9, day: D };
    store.commit({ game: null, book: emptyBook() }, entry, undefined, [row]);
    expect(store.hasReceipt('sweep:1')).toBe(true); expect(store.ledger()).toEqual([row]);
    expect(store.entries(1)).toEqual([entry]);
    expect(() => store.commit({ game: null, book: emptyBook() }, { ...entry, seq: 3 }, undefined, [row])).toThrow();
    expect(store.entries().map(e => e.seq)).toEqual([1, 2]);
  });

  it('entering and reading carry the server clock; command answers stay byte-identical on retry', async () => {
    const state = fakeDurableState(); const clock = { t: midnight(D) + 5 * HOUR };
    const store = sqlStore(state);
    const game: Game = { profile: base(), run: null };
    state.storage.sql.exec('INSERT INTO state (id, game, book, updated_at) VALUES (1, ?, ?, 0)', JSON.stringify(game), JSON.stringify(emptyBook()));
    const host = new GameHost(sqlStore(state), GAME_CONTEXT, () => 7, VERSION, () => clock.t); void store;
    const session = { 'X-Fateweave-Session': 's'.repeat(32) };
    const entered = await (await handleAccountRequest(host, new Request('https://game/session', { method: 'POST', headers: session }))).json() as { clock: unknown };
    expect(entered.clock).toEqual({ day: D, next: midnight(D + 1), now: clock.t });
    const body = JSON.stringify({ requestId: 'request-0000000001', seq: 1, command: sweepCmd(game) });
    const post = () => handleAccountRequest(host, new Request('https://game/command', { method: 'POST', headers: session, body }));
    const a = await (await post()).text(); clock.t += DAY_MS; const b = await (await post()).text();
    expect(b).toBe(a); expect(JSON.parse(a)).toMatchObject({ status: 'applied', receipts: ['sweep:1'] });
  });
});

describe('P09 ledger: device side', () => {
  function fakePort(deviceNow: { t: number }, server: { clock: { day: number; next: number; now: number } }) {
    const sent: unknown[] = [];
    const port: ServerPort = {
      now: () => deviceNow.t, sleep: async () => {}, randomHex: n => 'a'.repeat(n * 2),
      fetch: async (url, init) => {
        if (url.endsWith('/v1/session')) return Response.json({ lastSeq: 0, view: null, clock: server.clock });
        if (url.endsWith('/v1/command')) { const req = JSON.parse(String(init.body)) as { seq: number; command: unknown }; sent.push(req.command); return Response.json({ seq: req.seq, status: 'rejected', reason: 'x' }); }
        return new Response(null, { status: 404 });
      },
    };
    return { port, sent };
  }
  it('leaves the device day out of dated commands and shows the server day despite a skewed device clock', async () => {
    const serverNow = midnight(D) + 22 * HOUR; // 22:00 Bangkok
    const device = { t: serverNow + 3 * DAY_MS }; // the device clock is three days ahead
    const { port, sent } = fakePort(device, { clock: { day: D, next: midnight(D + 1), now: serverNow } });
    const store = new Map<string, string>();
    const c = new ServerClient('https://api.test', VERSION, { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); } }, port);
    store.set('fateweave-server-token:https://api.test', 'a'.repeat(32) + '.' + 'b'.repeat(64));
    store.set('fateweave-server-token-at:https://api.test', String(device.t));
    expect(c.day).toBeUndefined();
    expect((await c.enter()).kind).toBe('state');
    expect(c.day).toBe(D);
    await c.send({ kind: 'sweep', mapId: home.id, hard: false, day: D + 3, serial: 0 });
    await c.send({ kind: 'claimBoard', tab: 'daily', id: 'd-patrol', period: D, day: D + 3 });
    await c.send({ kind: 'depart', hard: false, day: D + 3 });
    await c.send({ kind: 'refreshBoard' });
    // P11-04: the World Boss commands are dated the same way.
    await c.send({ kind: 'worldBoss', attempt: 1, commands: [], day: D + 3 });
    await c.send({ kind: 'claimWorldBoss', id: 's-50', week: 1, day: D + 3 });
    expect(sent).toEqual([{ kind: 'sweep', mapId: home.id, hard: false, serial: 0 }, { kind: 'claimBoard', tab: 'daily', id: 'd-patrol', period: D }, { kind: 'depart', hard: false }, { kind: 'refreshBoard' },
      { kind: 'worldBoss', attempt: 1, commands: [] }, { kind: 'claimWorldBoss', id: 's-50', week: 1 }]);
    // Two hours later by the device's own clock the server's midnight has passed: the screens move on to D+1.
    device.t += 2 * HOUR + 1;
    expect(c.day).toBe(D + 1);
  });
});
