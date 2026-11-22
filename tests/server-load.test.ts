import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { gameRules } from '../src/content/world/rules';
import type { Game } from '../src/core/save/expedition-save';
import { newProfile } from '../src/core/world/profile';
import { WB_BOSSES, type WbBossId } from '../src/core/world/types';
import { wbEncounter } from '../src/core/world/world-boss';
import { CONTENT_HEADER } from '../src/server/api';
import { SESSION_HEADER } from '../src/server/account-object';
import { currentSave } from './fixtures/current-save';
import { wbTurns } from './fixtures/world-boss';

// P12 staging load test (docs/validation/p12-load/README_TH.md) of the two shared Durable Objects, `WorldBoss` and
// `Chat`, through the real network, Worker, account objects and durable writes. Runs only with LOAD_URL set:
//   LOAD_URL=<staging worker> LOAD_CONTENT=<content version> npx vitest run tests/server-load.test.ts
// Every runner (one IP) makes LOAD_ACCOUNTS guests (≤ 5 a minute per IP, so it waits between them), imports a camp save
// with every map cleared, then for LOAD_CHAT_SECONDS: each account polls chat once a second, sends a message every
// LOAD_CHAT_GAP seconds (under 30 sends a minute per IP and the 4 s / 8 a minute per account pace) and plays its five
// World Boss attempts, each sent twice at once (a retry). P11-05: when the server reports the three trio bars (`trio.from`
// reached), each attempt goes to a random trio boss and every bar is checked on its own; otherwise the warden's one bar. Never point it at the dev API players use: it writes chat
// messages and World Boss damage. Prints a table; prints no token.
const base = process.env.LOAD_URL;
const version = process.env.LOAD_CONTENT ?? '';
const ACCOUNTS = Number(process.env.LOAD_ACCOUNTS ?? 5);
const CHAT_SECONDS = Number(process.env.LOAD_CHAT_SECONDS ?? 120);
const CHAT_GAP = Number(process.env.LOAD_CHAT_GAP ?? 12);
const RUNNER = process.env.LOAD_RUNNER ?? 'a';

const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
const SYLLABLES = ['กา', 'ขอ', 'คิ', 'งู', 'จะ', 'ฉัน', 'ชา', 'ซอ', 'ดี', 'ตา', 'นะ', 'บิน', 'ปลา', 'มา', 'ยา', 'รัก', 'ลม', 'วัน', 'สี', 'หา'];
const word = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => SYLLABLES[b % SYLLABLES.length]).join('');

interface Sample { route: string; status: number; ms: number }
const samples: Sample[] = [];
// The answer fields this test reads (every route's answer is a subset).
interface Body {
  token?: string; lastSeq?: number; status?: string; error?: string; events?: { type?: string; damage?: number }[];
  messages?: { id: number; text: string }[]; message?: { text: string }; week?: number; bars?: { boss: string; hp: number; left: number }[];
  view?: { profile?: { gacha?: { tickets: number; points: number; serial: number } } } | null; entries?: { entry: { serial: number; results: unknown[] } }[]; more?: boolean;
}
async function call(route: string, path: string, init: RequestInit = {}): Promise<{ status: number; text: string; json: Body | null }> {
  const t = performance.now();
  let status: number; let text = '';
  try { const r = await fetch(new URL(path, base), { ...init, signal: AbortSignal.timeout(20_000) }); status = r.status; text = await r.text(); } catch { status = 0; }
  samples.push({ route, status, ms: performance.now() - t });
  let json: Body | null = null; try { json = text ? JSON.parse(text) as Body : null; } catch { /* not JSON */ }
  return { status, text, json };
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface Player { token: string; session: string; seq: number; profile: Game['profile']; headers: (json?: boolean) => Record<string, string> }
async function player(): Promise<Player> {
  let g = await call('guest', '/v1/guest', { method: 'POST' });
  for (let tries = 0; g.status === 429 && tries < 6; tries++) { await sleep(15_000); g = await call('guest', '/v1/guest', { method: 'POST' }); }
  expect(g.status, g.text).toBe(201);
  const p: Player = { token: g.json!.token!, session: hex(16), seq: 0, profile: newProfile(home, 5), headers: (json = false) => ({ Authorization: `Bearer ${p.token}`, [CONTENT_HEADER]: version, [SESSION_HEADER]: p.session, ...(json ? { 'Content-Type': 'application/json' } : {}) }) };
  expect((await call('session', '/v1/session', { method: 'POST', headers: p.headers() })).status).toBe(200);
  // A camp save with every map cleared (the World Boss opens with quests after map 1); the random name makes each
  // save's fingerprint new. Import replays it with `parseGame` like any local save.
  p.profile = { ...newProfile(home, 5), tutorialDone: true, cleared: MAPS.map(m => m.id),
    commander: { name: `โหลด${word(2)}`, crest: 'star', color: 'gold', camp: `ค่าย${word(2)}` } };
  const game: Game = { profile: p.profile, run: null };
  const raw = currentSave(game);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), b => b.toString(16).padStart(2, '0')).join('');
  const body = { format: 1, requestId: `imp_${digest.slice(0, 40)}`, baseRevision: 0, saveVersion: (JSON.parse(raw) as { version: number }).version,
    payload: raw, payloadBytes: new TextEncoder().encode(raw).byteLength, payloadSha256: digest };
  const imp = await call('import', '/v1/import', { method: 'POST', headers: p.headers(true), body: JSON.stringify(body) });
  expect(imp.status, imp.text).toBe(201);
  const st = await call('state', '/v1/state', { headers: p.headers() });
  p.seq = Number(st.json?.lastSeq ?? 0);
  return p;
}

// Every bar of this week (`warden`, or the three trio bosses).
interface Bars { week: number; bars: Record<string, { hp: number; left: number }> }
async function bossLeft(p: Player): Promise<Bars | null> {
  const r = await call('worldboss', '/v1/worldboss', { headers: p.headers() });
  const bars = r.json?.bars;
  return Array.isArray(bars) && bars.length && bars.every(b => typeof b.left === 'number') ? { week: r.json!.week!, bars: Object.fromEntries(bars.map(b => [b.boss, { hp: b.hp, left: b.left }])) } : null;
}
const isTrio = (b: Bars | null) => !!b && WB_BOSSES.every(x => x in b.bars);

// Five attempts, one at a time per account; each request is sent twice at once (a lost answer retried): both answers
// must be the same and the hit counted once.
async function bossRun(p: Player, trio: boolean): Promise<{ damage: Record<string, number>; retriesSame: number; attempts: number }> {
  const turns = new Map<string, ReturnType<typeof wbTurns>>();
  const commandsFor = (boss?: WbBossId) => { const k = boss ?? 'warden'; if (!turns.has(k)) turns.set(k, wbTurns(wbEncounter(p.profile, home, lookup, boss)!, gameRules.worldBoss.maxRounds)); return turns.get(k)!; };
  const damage: Record<string, number> = {}; let retriesSame = 0; let attempts = 0;
  for (let a = 1; a <= gameRules.worldBoss.attempts; a++) {
    const boss = trio ? WB_BOSSES[crypto.getRandomValues(new Uint8Array(1))[0]! % WB_BOSSES.length] : undefined;
    const env = JSON.stringify({ requestId: `load${hex(14)}`, seq: p.seq + 1, command: { kind: 'worldBoss', attempt: a, commands: commandsFor(boss), ...(boss ? { boss } : {}) } });
    const send = () => call('worldBoss', '/v1/command', { method: 'POST', headers: p.headers(true), body: env });
    const [x, y] = await Promise.all([send(), send()]);
    const ok = [x, y].find(r => r.status === 200 && r.json?.status === 'applied');
    if (!ok) break;
    if (x.text === y.text) retriesSame++;
    p.seq++; attempts++;
    for (const e of ok.json!.events ?? []) if (e?.type === 'wbAttempt') damage[boss ?? 'warden'] = (damage[boss ?? 'warden'] ?? 0) + Number(e.damage ?? 0);
  }
  // The outbox path: any hit not yet handed over goes with the next answer.
  await call('state', '/v1/state', { headers: p.headers() });
  return { damage, retriesSame, attempts };
}

async function chatRun(players: Player[], until: number): Promise<{ sent: string[]; seen: Set<string>; refused: Record<string, number> }> {
  const sent: string[] = []; const seen = new Set<string>(); const refused: Record<string, number> = {};
  const poll = async (p: Player) => {
    let after = 0;
    while (Date.now() < until) {
      const r = await call('chat read', `/v1/chat?after=${after}`, { headers: p.headers() });
      if (r.status === 200) { for (const m of r.json?.messages ?? []) { seen.add(m.text); after = Math.max(after, m.id); } }
      await sleep(1000);
    }
  };
  const write = async (p: Player, offset: number) => {
    await sleep(offset);
    while (Date.now() < until - 3000) {
      const text = `${RUNNER} ${word(3)} ${word(2)}`;
      const r = await call('chat send', '/v1/chat/send', { method: 'POST', headers: p.headers(true), body: JSON.stringify({ text }) });
      if (r.status === 201 || r.status === 200) sent.push(r.json?.message?.text ?? text);
      else { const k = `${r.status} ${r.json?.error ?? ''}`; refused[k] = (refused[k] ?? 0) + 1; }
      await sleep(CHAT_GAP * 1000);
    }
  };
  await Promise.all([...players.map(poll), ...players.map((p, i) => write(p, i * (CHAT_GAP * 1000 / players.length)))]);
  // One last read so the newest messages are seen.
  for (const p of players.slice(0, 1)) {
    const r = await call('chat read', '/v1/chat?after=0', { headers: p.headers() });
    for (const m of r.json?.messages ?? []) seen.add(m.text);
  }
  return { sent, seen, refused };
}

function table(): string {
  const groups = new Map<string, Sample[]>();
  for (const s of samples) { if (!groups.has(s.route)) groups.set(s.route, []); groups.get(s.route)!.push(s); }
  const out = ['| route | n | statuses | p50 ms | p95 ms | max ms |', '|---|---|---|---|---|---|'];
  for (const [route, list] of groups) {
    const ms = list.map(s => s.ms).sort((a, b) => a - b); const q = (p: number) => Math.round(ms[Math.min(ms.length - 1, Math.floor(p * ms.length))]!);
    const st = new Map<number, number>(); for (const s of list) st.set(s.status, (st.get(s.status) ?? 0) + 1);
    out.push(`| ${route} | ${list.length} | ${[...st].map(([k, v]) => `${k}×${v}`).join(' ')} | ${q(0.5)} | ${q(0.95)} | ${Math.round(ms.at(-1)!)} |`);
  }
  return out.join('\n');
}
// P10: the tickets the trio's personal milestones paid (2+2 after five attempts) are spent one pull at a time. Each pull
// is sent twice at once with one request id (a lost answer retried: same answer, one charge), and once more under a
// second request id with the same sequence number (another device racing: refused 409 stale, nothing charged). The wallet
// must end at 0 tickets with one point per pull, and the server journal must hold exactly those pulls, in order.
async function gachaRun(p: Player): Promise<{ tickets: number; pulls: number; retriesSame: number; racesRefused: number; journal: number; points: number; left: number; notes: string[] }> {
  const wallet = async () => (await call('state', '/v1/state', { headers: p.headers() })).json?.view?.profile?.gacha ?? { tickets: 0, points: 0, serial: 0 };
  const start = await wallet(); let pulls = 0, retriesSame = 0, racesRefused = 0; const notes: string[] = [];
  const brief = (r: { status: number; json: Body | null; text: string }) => `${r.status}:${r.json?.status ?? r.json?.error ?? r.text.slice(0, 40)}`;
  for (let i = 0; i < start.tickets; i++) {
    const command = { kind: 'gachaPull', count: 1, config: gameRules.gacha.version };
    const env = JSON.stringify({ requestId: `load${hex(14)}`, seq: p.seq + 1, command });
    const race = JSON.stringify({ requestId: `load${hex(14)}`, seq: p.seq + 1, command });
    const send = (body: string) => call('gachaPull', '/v1/command', { method: 'POST', headers: p.headers(true), body });
    const [x, y] = await Promise.all([send(env), send(env)]);
    const ok = [x, y].find(r => r.status === 200 && r.json?.status === 'applied');
    if (!ok) break;
    if (x.text === y.text) retriesSame++; else notes.push(`pull ${i + 1} pair ${brief(x)} / ${brief(y)}`);
    p.seq++; pulls++;
    const late = await send(race);
    if (late.status === 409) racesRefused++; else notes.push(`pull ${i + 1} race ${brief(late)}`);
  }
  const end = await wallet();
  const hist = await call('gachaHistory', '/v1/gacha/history?limit=50', { headers: p.headers() });
  return { tickets: start.tickets, pulls, retriesSame, racesRefused, journal: hist.json?.entries?.length ?? -1, points: end.points - start.points, left: end.tickets, notes };
}

describe.runIf(!!base)('P12 staging load: WorldBoss and Chat objects', () => {
  it('many accounts hit the World Boss and use chat at once; every hit counts once, every message reaches the others', async () => {
    expect(version, 'LOAD_CONTENT').not.toBe('');
    const players: Player[] = [];
    for (let i = 0; i < ACCOUNTS; i++) { players.push(await player()); if (i < ACCOUNTS - 1) await sleep(12_500); }
    const before = await bossLeft(players[0]!);
    const until = Date.now() + CHAT_SECONDS * 1000;
    const trio = isTrio(before);
    const [boss, chat] = await Promise.all([Promise.all(players.map(p => bossRun(p, trio))), chatRun(players, until)]);
    // P10: all accounts spend their trio tickets at the same time (the warden pays none, so this needs the trio).
    const gacha = trio ? await Promise.all(players.map(p => gachaRun(p))) : [];
    await sleep(2000);
    const after = await bossLeft(players[0]!);
    const own: Record<string, number> = {};
    for (const b of boss) for (const [k, v] of Object.entries(b.damage)) own[k] = (own[k] ?? 0) + v;
    const barText = Object.entries(after?.bars ?? {}).map(([k, v]) => `${k} hp ${v.hp}: left ${before?.bars[k]?.left} → ${v.left}, this runner's damage ${own[k] ?? 0}`).join('; ');
    const lines = [
      `runner ${RUNNER} · accounts ${ACCOUNTS} · chat ${CHAT_SECONDS} s, a send every ${CHAT_GAP} s per account`,
      `World Boss week ${after?.week} (${trio ? 'trio' : 'warden'}): ${barText}; ${boss.reduce((t, b) => t + b.attempts, 0)} attempts; identical retry answers ${boss.reduce((t, b) => t + b.retriesSame, 0)}`,
      `gacha: ${trio ? `tickets ${gacha.reduce((t, g) => t + g.tickets, 0)}, pulls ${gacha.reduce((t, g) => t + g.pulls, 0)}, identical retry answers ${gacha.reduce((t, g) => t + g.retriesSame, 0)}, racing requests refused ${gacha.reduce((t, g) => t + g.racesRefused, 0)}, journal entries ${gacha.reduce((t, g) => t + g.journal, 0)}` : 'skipped (warden week pays no tickets; dispatch with trio=now)'}`,
      `chat: sent ${chat.sent.length}, seen by this runner ${chat.sent.filter(t => chat.seen.has(t)).length}, refused ${JSON.stringify(chat.refused)}`,
      table(),
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
    if (process.env.LOAD_OUT) (await import('node:fs')).writeFileSync(process.env.LOAD_OUT, `${lines.join('\n')}\n`);
    // Invariants: no bar goes below 0 and each has lost at least this runner's damage on it (others only lower it);
    // every attempt was applied; a retry gives the same answer; every message this runner sent reached its readers.
    expect(before && after).toBeTruthy();
    for (const bar of Object.values(after!.bars)) expect(bar.left).toBeGreaterThanOrEqual(0);
    if (after!.week === before!.week) {
      expect(Object.keys(after!.bars)).toEqual(Object.keys(before!.bars));
      for (const [k, bar] of Object.entries(after!.bars)) expect(bar.left).toBeLessThanOrEqual(Math.max(0, before!.bars[k]!.left - (own[k] ?? 0)));
    }
    expect(boss.every(b => b.attempts === gameRules.worldBoss.attempts)).toBe(true);
    expect(boss.every(b => b.retriesSame === b.attempts)).toBe(true);
    for (const g of gacha) {
      expect(g.tickets).toBe(gameRules.worldBoss.trio.personal.reduce((t, m) => t + (m.reward.tickets ?? 0), 0));
      expect([g.pulls, g.retriesSame, g.racesRefused, g.journal, g.points, g.left], g.notes.join(' · ')).toEqual([g.tickets, g.tickets, g.tickets, g.tickets, g.tickets, 0]);
    }
    expect(chat.sent.length).toBeGreaterThan(0);
    expect(chat.sent.filter(t => !chat.seen.has(t))).toEqual([]);
    expect(samples.filter(s => s.status === 0 || s.status >= 500).length).toBe(0);
  }, 30 * 60_000);
});
