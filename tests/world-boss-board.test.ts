import { describe, expect, it } from 'vitest';
import { gameRules } from '../src/content/world/rules';
import { weekOf } from '../src/core/world/board';
import type { WbBossId } from '../src/core/world/types';
import { SESSION_HEADER } from '../src/server/account-object';
import { CONTENT_HEADER, handle } from '../src/server/api';
import { chatHandle } from '../src/server/chat';
import { GAME_DAY_OFFSET_MINUTES } from '../src/server/ledger';
import { handleBossRequest, memoryBossStore, sqlBossStore, WorldBossHost, type BossStore } from '../src/server/world-boss';
import { fakeDurableState, server, VERSION, type Server } from './fixtures/server-fakes';

// World Boss leaderboard (owner 2026-11-28 “เพิ่ม Leader board”): accounts of the week ranked by the damage they dealt,
// ties to the earlier first hit; one bar or every bar; the Worker shows anonymous camp handles, never account ids.
const rules = gameRules.worldBoss;
const D = 20_773, W = weekOf(D), HOUR = 3_600_000, DAY_MS = 24 * HOUR;
const midnight = (d: number) => d * DAY_MS - GAME_DAY_OFFSET_MINUTES * 60_000;
const A = 'a'.repeat(32), B = 'b'.repeat(32), C = 'c'.repeat(32), E = 'e'.repeat(32);
const hit = (acc: string, n: number, damage: number, boss?: WbBossId, week = W) => ({ id: `${acc}:w${week}:a${n}`, week, account: acc, damage, ...(boss ? { boss } : {}) });

function play(store: BossStore, clock: { t: number }) {
  const host = new WorldBossHost(store, rules, () => clock.t);
  // A deals 300 then 200 (500), B 500 in one hit later (ties with A: A hit first), C 900; E never plays.
  host.contribute([hit(A, 1, 300)]); clock.t += 1000;
  host.contribute([hit(B, 1, 500)]); clock.t += 1000;
  host.contribute([hit(A, 2, 200), hit(C, 1, 900)]); clock.t += 1000;
  // A resend counts once.
  host.contribute([hit(A, 1, 300)]);
  return host;
}

describe('World Boss leaderboard: ranking', () => {
  for (const [name, make] of [['memory', () => memoryBossStore()], ['sql', () => sqlBossStore(fakeDurableState())]] as const) {
    it(`${name} store: total damage, ties to the earlier first hit, own rank, players and the row limit`, () => {
      const clock = { t: midnight(D) + HOUR }; const host = play(make(), clock);
      const board = host.board(W, undefined, A)!;
      expect(board.rows).toEqual([
        { account: C, total: 900, attempts: 1, best: 900 }, { account: A, total: 500, attempts: 2, best: 300 }, { account: B, total: 500, attempts: 1, best: 500 },
      ]);
      expect(board).toMatchObject({ week: W, players: 3, you: { rank: 2, total: 500, attempts: 2, best: 300 } });
      expect(host.board(W, undefined, E)!.you).toBeNull();
      expect(host.board(W, undefined, B, 1)!).toMatchObject({ rows: [{ account: C }], you: { rank: 3 } });
      // One bar only: the warden's bar is every hit here; another bar has none.
      expect(host.board(W, 'warden', A)!.players).toBe(3);
      expect(host.board(W, 'kragmor', A)!).toMatchObject({ rows: [], players: 0, you: null });
      // Last week is readable; older weeks are not.
      expect(host.board(W - 1, undefined, A)!.rows).toEqual([]);
      expect(host.board(W - 2, undefined, A)).toBeNull();
    });
  }

  it('the object answers /board for this week or last, and refuses a bad account or boss', async () => {
    const clock = { t: midnight(D) + HOUR }; const host = play(memoryBossStore(), clock);
    const read = async (q: string) => handleBossRequest(host, new Request(`https://boss/board?${q}`));
    expect(await (await read(`account=${B}`)).json()).toMatchObject({ week: W, players: 3, you: { rank: 3 } });
    expect(await (await read(`account=${B}&last=1`)).json()).toMatchObject({ week: W - 1, players: 0, you: null });
    expect(await (await read(`account=${A}&boss=kragmor`)).json()).toMatchObject({ players: 0 });
    expect((await read('account=nope')).status).toBe(400);
    expect((await read(`account=${A}&boss=nobody`)).status).toBe(400);
  });
});

// ---- through the Worker ----
const SESSION = 'a'.repeat(32);
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: SESSION });
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
async function guest(s: Server) {
  const g = await (await call(s, '/v1/guest', { method: 'POST', headers: { 'CF-Connecting-IP': '198.51.100.7' } })).json() as { accountId: string; token: string };
  return g;
}

describe('World Boss leaderboard: /v1/worldboss/board', () => {
  it('shows camp handles and the caller\'s own row and rank, never account ids', async () => {
    const s = server(); s.clock.t = midnight(D) + HOUR;
    const me = await guest(s);
    s.boss.host.contribute([hit(C, 1, 900), hit(me.accountId, 1, 400), hit(B, 1, 100)]);
    const r = await call(s, '/v1/worldboss/board', { headers: headers(me.token) });
    expect(r.status).toBe(200);
    const text = await r.text(); const body = JSON.parse(text);
    expect(body).toMatchObject({ week: W, boss: 'all', players: 3, you: { rank: 2, total: 400, attempts: 1, best: 400 } });
    expect(body.rows).toEqual([
      { rank: 1, handle: await chatHandle(C), total: 900, attempts: 1, best: 900, you: false },
      { rank: 2, handle: await chatHandle(me.accountId), total: 400, attempts: 1, best: 400, you: true },
      { rank: 3, handle: await chatHandle(B), total: 100, attempts: 1, best: 100, you: false },
    ]);
    for (const id of [C, B, me.accountId]) expect(text).not.toContain(id);
    expect((await call(s, '/v1/worldboss/board?boss=nobody', { headers: headers(me.token) })).status).toBe(400);
    expect(await (await call(s, '/v1/worldboss/board?last=1', { headers: headers(me.token) })).json()).toMatchObject({ week: W - 1, players: 0, rows: [], you: null });
    expect((await call(s, '/v1/worldboss/board', { headers: { [CONTENT_HEADER]: VERSION } })).status).toBe(401);
  });
});
