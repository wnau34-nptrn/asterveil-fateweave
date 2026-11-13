import { currentActorId, resolveCommand } from '../../src/core/battle/engine';
import type { BattleState, Command } from '../../src/core/battle/types';
import type { ClientGame } from '../../src/core/command/client-view';
import { MAPS } from '../../src/content/world/maps';
import { encounterById } from '../../src/content/encounters/catalog';
import { battleData, battleState } from '../../src/core/world/world';
import { gameFromView } from '../../src/ui/server-game';

// P09-02d: plays a fresh account through the API the way the game does (one `battle` command per turn carrying every
// turn so far) to build long battles and a long command log, then runs the replay audit. Used in process
// (SERVER_MEASURE=1, Node timings) and against the deployed dev Worker (MEASURE_URL, Workers CPU from Workers Tail).

export type Transport = (path: string, init: RequestInit) => Promise<Response>;
export interface Row { label: string; seq: number; status: number | string; bytes: number; ms: number; turns?: number; log?: number }
const CONTENT = 'X-Fateweave-Content', SESSION = 'X-Fateweave-Session';
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');

// A slow, legal turn: guard (every round while `stallRounds` lasts, then on odd rounds) when the hero can, otherwise
// hit the standing foe with the most HP.
function nextTurn(st: BattleState, data: NonNullable<ReturnType<typeof battleData>>, stallRounds: number): Command | null {
  const heroId = currentActorId(st);
  if (!heroId) return null;
  const tries: Command[] = [];
  if (st.round <= stallRounds || st.round % 2 === 1) for (const action of ['guard', 'heal', 'ward', 'brace'] as const) tries.push({ beat: st.beat, heroId, action, targetId: heroId });
  for (const e of [...st.enemies].filter(e => e.hp > 0).sort((a, b) => b.hp - a.hp)) tries.push({ beat: st.beat, heroId, action: 'attack', targetId: e.id });
  for (const c of tries) { try { resolveCommand(st, data, c, true); return c; } catch { /* next */ } }
  return null;
}

export async function measure(send: Transport, version: string, opts: { lookup?: typeof encounterById; logTarget: number; verifyAt: readonly number[]; stallRounds?: number; pause?: () => Promise<void>;
  // P09-02f: `/v1/verify` is admin-only; make the fresh account an admin (and undo it with `done`).
  grant?: (accountId: string) => Promise<void> | void; done?: (accountId: string) => Promise<void> | void }): Promise<Row[]> {
  const rows: Row[] = []; const session = hex(16);
  const timed = async (label: string, path: string, init: RequestInit, extra: Partial<Row> = {}) => {
    await opts.pause?.();
    const t = performance.now(); const r = await send(path, init); const text = await r.text(); const ms = performance.now() - t;
    let body: Record<string, unknown>;
    try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { body = { error: 'not_json' }; }
    rows.push({ label, seq: Number(body.seq ?? 0), status: (body.status as string) ?? (body.ok !== undefined ? `${r.status} ok=${String(body.ok)}` : r.status), bytes: new TextEncoder().encode(text).byteLength, ms: Math.round(ms * 10) / 10, ...extra });
    return { status: r.status, body };
  };
  const g = await timed('guest', '/v1/guest', { method: 'POST' });
  const token = g.body.token as string;
  const accountId = g.body.accountId as string;
  await opts.grant?.(accountId);
  const headers = (json: boolean) => ({ Authorization: `Bearer ${token}`, [CONTENT]: version, [SESSION]: session, ...(json ? { 'Content-Type': 'application/json' } : {}) });
  await timed('session', '/v1/session', { method: 'POST', headers: headers(false) });
  let seq = 0; let view: ClientGame | null = null; let battleTurns = 0;
  const command = async (label: string, cmd: unknown, extra: Partial<Row> = {}) => {
    const r = await timed(label, '/v1/command', { method: 'POST', headers: headers(true), body: JSON.stringify({ requestId: `m${hex(12)}`, seq: seq + 1, command: cmd }) }, extra);
    if (r.status !== 200) throw new Error(`${label}: ${r.status} ${JSON.stringify(r.body)}`);
    seq = r.body.seq as number;
    if (r.body.status === 'applied') view = r.body.view as ClientGame;
    return r.body.status === 'applied';
  };
  const verified = new Set<number>();
  const verify = async () => {
    for (const at of opts.verifyAt) if (seq >= at && !verified.has(at)) {
      verified.add(at);
      // A failed or refused audit is a measurement result (e.g. over the CPU limit), not a reason to stop.
      await timed(`verify(log ${seq})`, '/v1/verify', { method: 'POST', headers: headers(false) }, { log: seq });
    }
  };
  await command('createCommander', { kind: 'createCommander', commander: { name: 'วัดผล', crest: 'star', color: 'gold', camp: 'ค่ายวัดผล' }, replace: false });
  const dirs = ['right', 'down', 'left', 'up'] as const; let d = 0; let stuck = 0;
  try { while (seq < opts.logTarget) {
    await verify();
    const game = view ? gameFromView(view) : null;
    if (!game?.run) { await command('depart', { kind: 'depart', hard: false }); continue; }
    const run = game.run; const map = MAPS.find(m => m.id === run.mapId)!;
    if (run.battle) {
      const data = battleData(run, map, opts.lookup ?? encounterById)!; const st = battleState(run, map, opts.lookup ?? encounterById)!;
      const turn = st.outcome === 'active' ? nextTurn(st, data, opts.stallRounds ?? 0) : null;
      const commands = turn ? [...st.commands, turn] : st.commands;
      battleTurns = commands.length;
      if (!(await command(`battle turn ${commands.length}`, { kind: 'battle', commands }, { turns: commands.length })) && !turn) throw new Error('battle stuck');
      continue;
    }
    if (battleTurns) { rows.push({ label: `battle ended (${battleTurns} turns)`, seq, status: '-', bytes: 0, ms: 0, turns: battleTurns }); battleTurns = 0; }
    if (await command('move', { kind: 'move', dir: dirs[d % 4] })) { stuck = 0; if (Math.random() < 0.3) d++; }
    else if (++stuck > 4) { stuck = 0; await command('withdraw', { kind: 'withdraw' }); } else d++;
  } } catch (e) { rows.push({ label: `stopped: ${(e as Error).message.slice(0, 200)}`, seq, status: '-', bytes: 0, ms: 0 }); }
  try {
    await verify();
    await timed(`verify(log ${seq})`, '/v1/verify', { method: 'POST', headers: headers(false) }, { log: seq });
  } finally { await opts.done?.(accountId); }
  return rows;
}

// P09-02f: imports one local save string into a fresh guest account (one `/v1/import`), then plays one command on it
// and audits it (as admin when `grant` is given) — the DO import replays the save with `parseGame`.
export async function measureImport(send: Transport, version: string, raw: string, opts: { grant?: (accountId: string) => Promise<void> | void; done?: (accountId: string) => Promise<void> | void } = {}): Promise<Row[]> {
  const rows: Row[] = []; const session = hex(16);
  const timed = async (label: string, path: string, init: RequestInit) => {
    const t = performance.now(); const r = await send(path, init); const text = await r.text();
    rows.push({ label, seq: 0, status: r.status, bytes: new TextEncoder().encode(text).byteLength, ms: Math.round((performance.now() - t) * 10) / 10 });
    return { status: r.status, text };
  };
  const g = JSON.parse((await timed('guest', '/v1/guest', { method: 'POST' })).text) as { accountId: string; token: string };
  const headers = { Authorization: `Bearer ${g.token}`, [CONTENT]: version, [SESSION]: session, 'Content-Type': 'application/json' };
  await timed('session', '/v1/session', { method: 'POST', headers });
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), b => b.toString(16).padStart(2, '0')).join('');
  const body = { format: 1, requestId: `imp_${digest.slice(0, 40)}`, baseRevision: 0, saveVersion: (JSON.parse(raw) as { version: number }).version,
    payload: raw, payloadBytes: new TextEncoder().encode(raw).byteLength, payloadSha256: digest };
  const r = await timed(`import (${body.payloadBytes} B save)`, '/v1/import', { method: 'POST', headers, body: JSON.stringify(body) });
  if (r.status !== 201) rows.push({ label: `import refused: ${r.text.slice(0, 120)}`, seq: 0, status: '-', bytes: 0, ms: 0 });
  if (opts.grant) {
    await opts.grant(g.accountId);
    try { await timed('verify(after import)', '/v1/verify', { method: 'POST', headers }); } finally { await opts.done?.(g.accountId); }
  }
  return rows;
}

// The rows worth reading: the longest battle's turns, the largest commands and every verify.
export function summary(rows: readonly Row[]): string {
  const turns = rows.filter(r => r.turns !== undefined && r.label.startsWith('battle turn'));
  const longest = Math.max(0, ...rows.filter(r => r.label.startsWith('battle ended')).map(r => r.turns ?? 0), ...turns.map(r => r.turns ?? 0));
  const cmds = rows.filter(r => r.label !== 'guest' && r.label !== 'session' && !r.label.startsWith('verify') && !r.label.startsWith('import') && !r.label.startsWith('battle ended'));
  const ms = cmds.map(r => r.ms).sort((a, b) => a - b);
  const pct = (p: number) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] ?? 0;
  const out = [`commands ${cmds.length} · longest battle ${longest} turns · battles ${rows.filter(r => r.label.startsWith('battle ended')).length}`,
    `command ms p50 ${pct(0.5)} · p95 ${pct(0.95)} · max ${ms.at(-1) ?? 0} · largest reply ${Math.max(...cmds.map(r => r.bytes))} B`];
  for (const r of turns.filter(r => r.turns === longest || ((r.turns ?? 0) > 0 && (r.turns ?? 0) % 25 === 0))) out.push(`${r.label}\tseq ${r.seq}\t${r.bytes} B\t${r.ms} ms`);
  for (const r of rows.filter(r => r.label.startsWith('verify') || r.label.startsWith('import'))) out.push(`${r.label}\t${r.status}\t${r.bytes} B\t${r.ms} ms`);
  for (const r of rows.filter(r => r.label.startsWith('stopped'))) out.push(r.label);
  return out.join('\n');
}
