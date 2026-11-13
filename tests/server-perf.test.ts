import { describe, expect, it } from 'vitest';
import { replay } from '../src/core/battle/engine';
import { battleMemo } from '../src/core/command/battle-memo';
import { canonicalJson } from '../src/core/command/command-envelope';
import { applyCommand, isRejected, parseCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import type { Game } from '../src/core/save/expedition-save';
import { COMMANDER_COLORS, COMMANDER_CRESTS } from '../src/core/world/profile';
import { battleData } from '../src/core/world/world';
import { SESSION_HEADER, sqlStore } from '../src/server/account-object';
import { CONTENT_HEADER, handle } from '../src/server/api';
import { GameHost, replayLog } from '../src/server/game-host';
import { GAME_CONTEXT } from '../src/server/worker';
import { battleTurns, grantAdmin, server, storedGame, VERSION, type Server } from './fixtures/server-fakes';
import { measure } from './fixtures/server-measure';

// P09-02f: the Durable Object resolves only a battle command's new turns (`battleMemo`, same resolver), `/v1/verify` is
// admin-only with an audit row, and `/v1/sessions/revoke` signs a device out. Node + real SQLite (server-fakes).

const commander = { name: 'ทดสอบ', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: 'ค่ายทดสอบ' };
const call = (s: Server, path: string, init: RequestInit = {}) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); };
const SESSION = 'c'.repeat(32);
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, [CONTENT_HEADER]: VERSION, [SESSION_HEADER]: SESSION, 'Content-Type': 'application/json' });
async function guest(s: Server) { return await (await call(s, '/v1/guest', { method: 'POST' })).json() as { accountId: string; token: string }; }
let rid = 0;
const command = async (s: Server, token: string, seq: number, cmd: unknown) =>
  await (await call(s, '/v1/command', { method: 'POST', headers: headers(token), body: JSON.stringify({ requestId: `perf-request-${String(++rid).padStart(10, "0")}`, seq, command: cmd }) })).json() as { seq: number; status: string; reason?: string };
async function inPrologue(s: Server) {
  const g = await guest(s);
  await call(s, '/v1/session', { method: 'POST', headers: headers(g.token) });
  expect(await command(s, g.token, 1, { kind: "createCommander", commander, replace: false })).toMatchObject({ status: "applied" });
  expect((await command(s, g.token, 2, { kind: 'depart', hard: false })).status).toBe('applied');
  return g;
}

describe('P09-02f incremental battle (battleMemo)', () => {
  it('gives the full replay for every prefix, a shorter list, another battle and after an illegal turn', async () => {
    const s = server(); const { accountId } = await inPrologue(s);
    const run = storedGame(s, accountId)!.run!; const data = battleData(run, GAME_CONTEXT.home, GAME_CONTEXT.lookup)!;
    const turns = battleTurns(storedGame(s, accountId)!); const entry = { hp: run.battle!.entry };
    expect(turns.length).toBeGreaterThan(4);
    const memo = battleMemo(); const same = (n: number) => expect(canonicalJson(memo.replay(data, turns.slice(0, n), entry))).toBe(canonicalJson(replay(data, turns.slice(0, n), entry)));
    for (let n = 0; n <= turns.length; n++) same(n);
    // One resolution per turn, the rest reused.
    expect(memo.stats).toMatchObject({ resolved: turns.length, resets: 1 });
    same(2); same(turns.length);
    // A rewritten turn: resolved from that turn on.
    const bad = { ...turns[1]!, beat: turns[1]!.beat + 99 };
    expect(() => memo.replay(data, [turns[0]!, bad], entry)).toThrow();
    expect(() => replay(data, [turns[0]!, bad], entry)).toThrow();
    same(turns.length);
    // Another battle (different entry HP) never reuses the held turns.
    const hurt = { hp: Object.fromEntries(Object.entries(entry.hp).map(([k, v]) => [k, Math.max(1, v - 5)])) };
    const resets = memo.stats.resets;
    expect(canonicalJson(memo.replay(data, turns.slice(0, 3), hurt))).toBe(canonicalJson(replay(data, turns.slice(0, 3), hurt)));
    expect(memo.stats.resets).toBe(resets + 1);
    // A returned state is a copy: changing it changes nothing held.
    const st = memo.replay(data, turns.slice(0, 2), entry); st.heroes[0]!.hp = -1;
    expect(canonicalJson(memo.replay(data, turns.slice(0, 2), entry))).toBe(canonicalJson(replay(data, turns.slice(0, 2), entry)));
  });

  it('plays turn by turn on the server to the same game the full replay gives, after every command', async () => {
    const s = server(Array.from({ length: 4000 }, (_, i) => 7000 + i * 13));
    await measure((path, init) => { s.clock.t += 1000; return handle(new Request(`https://api.test${path}`, init), s.deps); }, VERSION, { logTarget: 140, verifyAt: [] });
    const [accountId, o] = [...s.objects.entries()][0]!;
    const entries = o.host['store'].entries();
    expect(entries.filter(e => (e.command as { kind: string }).kind === 'battle').length).toBeGreaterThan(30);
    // Full replay (no memo) of the whole log reaches the stored game, which the server built with the memo.
    expect(replayLog(entries, GAME_CONTEXT, storedGame(s, accountId))).toEqual({ ok: true, seq: entries.length });
    // And step by step: the memo path and the full path agree after each command.
    let full: Game | null = null, memo: Game | null = null; const play = battleMemo().replay;
    for (const e of entries) {
      const cmd = parseCommand(e.command)!;
      const a = applyCommand(full, cmd, { ...GAME_CONTEXT, seeds: sequenceSeeds(e.seeds) });
      const b = applyCommand(memo, cmd, { ...GAME_CONTEXT, seeds: sequenceSeeds(e.seeds), battles: play });
      expect(isRejected(b)).toBe(isRejected(a));
      if (!isRejected(a) && !isRejected(b)) { full = a.game; memo = b.game; expect(canonicalJson(b)).toBe(canonicalJson(a)); }
    }
  }, 120_000);

  it('refuses an illegal turn without losing the battle, and a fresh object (evicted) continues by full replay', async () => {
    const s = server(); const g = await inPrologue(s);
    const turns = battleTurns(storedGame(s, g.accountId)!);
    expect((await command(s, g.token, 3, { kind: 'battle', commands: turns.slice(0, 2) })).status).toBe('applied');
    const bad = { ...turns[2]!, beat: turns[2]!.beat + 50 };
    expect(await command(s, g.token, 4, { kind: 'battle', commands: [...turns.slice(0, 2), bad] })).toMatchObject({ status: 'rejected', reason: 'illegal' });
    expect((await command(s, g.token, 5, { kind: 'battle', commands: turns.slice(0, 3) })).status).toBe('applied');
    // Eviction: a new host over the same storage has no memo; it resolves from the start.
    const o = s.objects.get(g.accountId)!;
    o.host = new GameHost(sqlStore(o.state), GAME_CONTEXT, sequenceSeeds([1, 2, 3]).next, VERSION, () => s.clock.t);
    expect((await command(s, g.token, 6, { kind: 'battle', commands: turns })).status).toBe('applied');
    expect(storedGame(s, g.accountId)!.run!.battle).toBeNull();
    expect(o.host.verify()).toMatchObject({ ok: true, seq: 6 });
  });
});

describe('P09-02f admin-only /v1/verify', () => {
  it('refuses non-admins, audits every admin check, and checks another account on request', async () => {
    const s = server(); const player = await inPrologue(s); const admin = await guest(s);
    const verify = (token: string, body?: unknown) => call(s, '/v1/verify', { method: 'POST', headers: headers(token), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const r = await verify(player.token);
    expect(r.status).toBe(403); expect(await r.json()).toEqual({ error: 'forbidden' });
    expect(s.d1.db.prepare('SELECT COUNT(*) AS n FROM admin_audit').get()).toEqual({ n: 0 });
    grantAdmin(s, admin.accountId);
    expect(await (await verify(admin.token)).json()).toEqual({ ok: true, seq: 0, from: 0 });
    expect(await (await verify(admin.token, { accountId: player.accountId })).json()).toEqual({ ok: true, seq: 2, from: 0 });
    expect((await verify(admin.token, { accountId: 'f'.repeat(32) })).status).toBe(404);
    expect((await verify(admin.token, { accountId: 'not-an-id' })).status).toBe(400);
    expect((await verify(admin.token, { accountId: 5 })).status).toBe(400);
    expect(s.d1.db.prepare('SELECT admin_id AS a, action, target, result FROM admin_audit ORDER BY id').all()).toEqual([
      { a: admin.accountId, action: 'verify', target: admin.accountId, result: 'ok:0' },
      { a: admin.accountId, action: 'verify', target: player.accountId, result: 'ok:2' },
    ]);
    // A tampered log is reported (and audited) as a failure.
    s.objects.get(player.accountId)!.state.db.prepare("UPDATE log SET status = 'rejected' WHERE seq = 2").run();
    expect(await (await verify(admin.token, { accountId: player.accountId })).json()).toMatchObject({ ok: false, reason: 'status' });
    expect(s.d1.db.prepare('SELECT result FROM admin_audit ORDER BY id DESC LIMIT 1').get()).toEqual({ result: 'fail:status:2' });
    // Removing the row takes admin away.
    s.d1.db.prepare('DELETE FROM admins').run();
    expect((await verify(admin.token)).status).toBe(403);
  });
});

describe('P09-02f sign-out /v1/sessions/revoke', () => {
  const revoke = (s: Server, token: string, body: unknown) => call(s, '/v1/sessions/revoke', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const account = (s: Server, token: string) => call(s, '/v1/account', { headers: { Authorization: `Bearer ${token}` } });

  it('warns before signing out the only way into an unlinked guest, then revokes this device only', async () => {
    const s = server(); const g = await guest(s);
    const r = await revoke(s, g.token, {});
    expect(r.status).toBe(409); expect(await r.json()).toEqual({ error: 'unrecoverable' });
    expect((await account(s, g.token)).status).toBe(200);
    expect((await revoke(s, g.token, { scope: 'sideways' })).status).toBe(400);
    expect((await revoke(s, g.token, { confirm: 'yes' })).status).toBe(400);
    expect(await (await revoke(s, g.token, { confirm: true })).json()).toEqual({ revoked: 1 });
    expect((await account(s, g.token)).status).toBe(401);
    expect((await call(s, '/v1/state', { headers: headers(g.token) })).status).toBe(401);
  });

  it('signs out without a warning when a recovery code exists; `others` signs out every other device', async () => {
    const s = server(); const g = await guest(s);
    const code = (await (await call(s, '/v1/recovery-code', { method: 'POST', headers: { Authorization: `Bearer ${g.token}` } })).json() as { code: string }).code;
    // A second device joins with the code; a third with a fresh code.
    const second = `${'1'.repeat(32)}.${'2'.repeat(64)}`;
    expect((await call(s, '/v1/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, token: second }) })).status).toBe(200);
    const code2 = (await (await call(s, '/v1/recovery-code', { method: 'POST', headers: { Authorization: `Bearer ${second}` } })).json() as { code: string }).code;
    const third = `${'3'.repeat(32)}.${'4'.repeat(64)}`;
    expect((await call(s, '/v1/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code2, token: third }) })).status).toBe(200);
    expect(await (await revoke(s, second, { scope: 'others' })).json()).toEqual({ revoked: 2 });
    expect((await account(s, g.token)).status).toBe(401); expect((await account(s, third)).status).toBe(401);
    expect((await account(s, second)).status).toBe(200);
    expect(await (await revoke(s, second, { scope: 'others' })).json()).toEqual({ revoked: 0 });
    // The account has no Google, no code (used) and no other device: the last one is warned again.
    expect((await revoke(s, second, {})).status).toBe(409);
    await call(s, '/v1/recovery-code', { method: 'POST', headers: { Authorization: `Bearer ${second}` } });
    expect(await (await revoke(s, second, {})).json()).toEqual({ revoked: 1 });
    expect((await account(s, second)).status).toBe(401);
  });

});
