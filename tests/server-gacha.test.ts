import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { canonicalJson, emptyBook, type CommandReply } from '../src/core/command/command-envelope';
import type { Game } from '../src/core/save/expedition-save';
import { newProfile } from '../src/core/world/profile';
import type { GachaEntry, Profile } from '../src/core/world/types';
import { handleAccountRequest, sqlStore, SESSION_HEADER } from '../src/server/account-object';
import { GameHost, memoryStore, type HostStore } from '../src/server/game-host';
import { telemetryOf } from '../src/server/telemetry';
import { GAME_CONTEXT } from '../src/server/worker';
import { fakeDurableState, VERSION } from './fixtures/server-fakes';

// P10 free-ticket gacha on the server: the pull is a camp command, so the account's Durable Object draws the seed,
// applies the rules, writes the state, the log row (with the seed) and the ledger receipt `gacha:<serial>` in one commit.
// A retry is answered from the book, a reused request id with another payload or a stale sequence is refused, and the
// log replays to the same wallet.
const G = home.gacha;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' },
  cleared: MAPS.map(m => m.id), gacha: { tickets: 25, points: 75, serial: 0, history: [] }, ...patch });
const sha = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');
function seeded<T extends HostStore & { state?: unknown; snapshots?: unknown[] }>(s: T, profile = base()): T {
  const game: Game = { profile, run: null };
  if ('snapshots' in s && Array.isArray(s.snapshots)) { (s as unknown as ReturnType<typeof memoryStore>).state = { game, book: emptyBook() }; s.snapshots.push({ seq: 0, game, origin: 'import', at: 0 }); }
  return s;
}
function setup(store: HostStore = seeded(memoryStore())) {
  let n = 0, rid = 0;
  const host = new GameHost(store, GAME_CONTEXT, () => 9001 + 17 * n++, VERSION, () => 1_800_000_000_000);
  const send = (command: unknown, requestId = `req-${String(++rid).padStart(16, '0')}`, seq = host.view().lastSeq + 1) =>
    host.command({ requestId, seq, command }, sha(command));
  return { host, store, send };
}
const pull = (count = 10) => ({ kind: 'gachaPull', count, config: G.version });
const reply = (a: { status: number; body: unknown }) => a.body as CommandReply;

describe('P10 gacha on the server', () => {
  it('a pull commits tickets, points, results and one receipt together; the log replays it', () => {
    const t = setup(); const a = t.send(pull());
    const body = reply(a); expect(a.status).toBe(200); expect(body.status).toBe('applied');
    if (body.status !== 'applied') return;
    const entry = (body.events.find(e => e.type === 'gacha') as { entry: GachaEntry }).entry;
    expect(body.view.profile.gacha).toMatchObject({ tickets: 15, points: 85, serial: 1 });
    expect(body.receipts).toEqual(['gacha:1']);
    const row = t.store.ledger().find(r => r.receipt === 'gacha:1')!;
    expect(row).toMatchObject({ kind: 'gacha', ref: 'pull:10', gacha: entry }); expect(row.gacha!.results).toHaveLength(10);
    expect(JSON.stringify(body.view)).not.toContain('"seed"');
    expect(t.host.verify()).toMatchObject({ ok: true, seq: 1 });
  });
  it('a retry gets the same answer and spends nothing more; a reused id with another payload and a stale seq are refused', () => {
    const t = setup(); const once = t.send(pull(), 'req-aaaaaaaaaaaaaaaa');
    const again = t.send(pull(), 'req-aaaaaaaaaaaaaaaa', 1);
    expect(again).toMatchObject({ status: 200, replayed: true }); expect(JSON.stringify(again.body)).toBe(JSON.stringify(once.body));
    expect(t.send(pull(1), 'req-aaaaaaaaaaaaaaaa', 1)).toMatchObject({ status: 409, body: { error: 'request_reused' } });
    // Two devices racing with the same sequence number: only the first commits.
    expect(t.send(pull(1), 'req-bbbbbbbbbbbbbbbb', 1)).toMatchObject({ status: 409, body: { error: 'stale' } });
    expect(t.store.load()!.game!.profile.gacha!.tickets).toBe(15); expect(t.store.ledger().filter(r => r.kind === 'gacha')).toHaveLength(1);
  });
  it('refuses another config version, too few tickets and a locked cabinet without drawing a seed', () => {
    const t = setup(seeded(memoryStore(), base({ gacha: { tickets: 5, points: 0, serial: 0, history: [] } })));
    expect(reply(t.send({ kind: 'gachaPull', count: 1, config: G.version + 1 }))).toMatchObject({ status: 'rejected', reason: 'config' });
    expect(reply(t.send(pull(10)))).toMatchObject({ status: 'rejected', reason: 'tickets' });
    const closed = setup(seeded(memoryStore(), base({ cleared: [home.id] })));
    expect(reply(closed.send(pull(1)))).toMatchObject({ status: 'rejected', reason: 'locked' });
    expect((t.store as ReturnType<typeof memoryStore>).log.every(e => e.seeds.length === 0)).toBe(true);
    expect(t.host.verify()).toMatchObject({ ok: true });
  });
  it('the exchange takes 80 points once; a second one without points is refused', () => {
    const t = setup(seeded(memoryStore(), base({ gacha: { tickets: 0, points: 85, serial: 0, history: [] } })));
    const ok = reply(t.send({ kind: 'gachaExchange', heroId: 'astrid', config: G.version }));
    expect(ok.status).toBe('applied'); if (ok.status !== 'applied') return;
    expect(ok.view.profile.gacha!.points).toBe(5); expect(ok.view.profile.members.astrid).toBeTruthy(); expect(ok.receipts).toEqual(['gacha:1']);
    expect(reply(t.send({ kind: 'gachaExchange', heroId: 'astrid', config: G.version }))).toMatchObject({ status: 'rejected', reason: 'points' });
  });
  it('counts draws for the daily telemetry with no account id', () => {
    const t = setup(); const before = t.store.load()!.game; const a = reply(t.send(pull()));
    if (a.status !== 'applied') throw new Error('not applied');
    const items = telemetryOf(before, t.store.load()!.game, a.events).filter(i => i.kind === 'gacha');
    expect(items).toHaveLength(10); expect(items.every(i => /^(full|shard:[12])$/.test(i.key))).toBe(true);
  });
});

describe('P10 gacha journal in the Durable Object', () => {
  it('keeps each entry in the ledger (detail column) and pages it newest first through /gacha', async () => {
    const state = fakeDurableState(); const store = sqlStore(state);
    const game: Game = { profile: base({ gacha: { tickets: 30, points: 0, serial: 0, history: [] } }), run: null };
    store.commitImport({ game, book: emptyBook() }, { seq: 0, game, origin: 'import', at: 0 }, { requestId: 'imp', payloadSha256: 'x', saveVersion: 66, seq: 0, at: 0 }, '{}');
    const t = setup(store);
    for (let i = 0; i < 3; i++) expect(reply(t.send(pull())).status).toBe('applied');
    expect(sqlStore(state).ledger().filter(r => r.kind === 'gacha').map(r => r.gacha!.serial)).toEqual([1, 2, 3]);
    const session = 'sess-0123456789abcdef0123';
    t.host.claim(session);
    const page = async (q: string) => (await handleAccountRequest(t.host, new Request(`https://game/gacha${q}`, { headers: { [SESSION_HEADER]: session } }))).json() as Promise<{ entries: { entry: GachaEntry }[]; more: boolean }>;
    const first = await page('?limit=2'); expect(first.entries.map(e => e.entry.serial)).toEqual([3, 2]); expect(first.more).toBe(true);
    const next = await page('?before=2&limit=2'); expect(next.entries.map(e => e.entry.serial)).toEqual([1]); expect(next.more).toBe(false);
    expect((await handleAccountRequest(t.host, new Request('https://game/gacha?limit=99', { headers: { [SESSION_HEADER]: session } }))).status).toBe(400);
    expect((await handleAccountRequest(t.host, new Request('https://game/gacha', { headers: { [SESSION_HEADER]: 'sess-other-device-000000' } }))).status).toBe(423);
  });
});

describe('P10 D24: a local wallet never becomes online rights', () => {
  it('the one-time import keeps the characters but starts the wallet empty', () => {
    const profile = base({ gacha: { tickets: 500, points: 79, serial: 0, history: [] } });
    const payload = JSON.stringify({ version: 66, profile, run: null });
    const digest = createHash('sha256').update(payload).digest('hex');
    const t = setup(memoryStore());
    const answer = t.host.importSave({ format: 1, requestId: `imp_${digest.slice(0, 40)}`, baseRevision: 0, saveVersion: 66, payload, payloadBytes: Buffer.byteLength(payload), payloadSha256: digest });
    expect(answer.status).toBe(201);
    const stored = t.store.load()!.game!.profile;
    expect(stored.gacha).toBeUndefined(); expect(stored.company).toEqual(profile.company);
  });
});
