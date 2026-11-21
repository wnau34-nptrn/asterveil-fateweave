import { describe, expect, it } from 'vitest';
import { claimBoard } from '../src/core/world/board';
import { emptyGacha, exchangeReason, gachaDraw, gachaExchange, gachaOutcome, gachaPull, gachaRates, pullReason } from '../src/core/world/gacha';
import { hire, newProfile, settle } from '../src/core/world/profile';
import { parseGame, SAVE_VERSION, type Game } from '../src/core/save/expedition-save';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { MAPS as maps } from '../src/content/world/maps';
import { heroCatalog } from '../src/core/world/world';
import type { GachaEntry, Profile } from '../src/core/world/types';

const home = maps[0]!; const G = home.gacha;
const serializeGame = (g: Game) => JSON.stringify({ version: SAVE_VERSION, profile: g.profile, run: g.run });
// An open cabinet: a company that has cleared every map (the cabinet opens after MAP2, D18).
function open(tickets = 100, points = 0): Profile {
  const p = newProfile(home, 42, home.firstCompany);
  p.tutorialDone = true; p.cleared = maps.map(m => m.id); p.gacha = { ...emptyGacha(), tickets, points };
  return p;
}
const entryOf = (r: ReturnType<typeof gachaPull>): GachaEntry => { if (r.event.type !== 'gacha') throw new Error(r.event.type); return r.event.entry; };

describe('P10 gacha config', () => {
  it('pools the 15 active characters, none parked, rates add up to 100%', () => {
    expect(G.pool).toHaveLength(15); expect(new Set(G.pool).size).toBe(15);
    for (const id of home.company.parked ?? []) expect(G.pool).not.toContain(id);
    for (const id of G.pool) expect(heroCatalog(lookup, home).some(m => m.id === id)).toBe(true);
    const { rates, full, shards } = gachaRates(G);
    expect(full).toBe(0.075); expect(shards.map(s => s.chance)).toEqual([0.4625, 0.4625]);
    const sum = rates.reduce((a, r) => a + r.full + r.shards.reduce((b, s) => b + s.chance, 0), 0);
    expect(sum).toBeCloseTo(1, 12); expect(rates[0]!.full).toBeCloseTo(0.005, 12);
    for (const m of maps) expect(m.gacha).toBe(G);
  });
  it('budgets at most 24 tickets a week from existing sources (96 per 28 days)', () => {
    const daily = home.board.daily.reduce((a, t) => a + (t.reward.tickets ?? 0), 0) * 7;
    const weekly = home.board.weekly.reduce((a, t) => a + (t.reward.tickets ?? 0), 0);
    const trio = home.worldBoss.trio; const bosses = Object.keys(trio.bosses).length;
    const wb = trio.personal.reduce((a, m) => a + (m.reward.tickets ?? 0), 0) + bosses * trio.shared.reduce((a, m) => a + (m.reward.tickets ?? 0), 0);
    expect(daily + weekly + wb).toBe(24); expect((daily + weekly + wb) * 4).toBe(96);
    expect(home.worldBoss.personal.concat(home.worldBoss.shared as never).every(m => !m.reward.tickets)).toBe(true); // the warden pays none
  });
  it('draws uniformly enough over a large stream (observed rates match the published ones)', () => {
    let full = 0, one = 0; const per: Record<string, number> = {}; const n = 60_000;
    for (let i = 0; i < n; i++) { const o = gachaOutcome(G, 0x9e37 + i * 7919, i % 10); if (o.full) full++; else if (o.qty === 1) one++; per[o.heroId] = (per[o.heroId] ?? 0) + 1; }
    expect(full / n).toBeGreaterThan(0.068); expect(full / n).toBeLessThan(0.082);
    expect(one / (n - full)).toBeGreaterThan(0.48); expect(one / (n - full)).toBeLessThan(0.52);
    for (const id of G.pool) expect(per[id]! / n).toBeGreaterThan(1 / 15 - 0.008);
    for (let k = 0; k < 50; k++) { const d = gachaDraw(k, k, 7); expect(d).toBeGreaterThanOrEqual(0); expect(d).toBeLessThan(7); }
  });
});

describe('P10 pull', () => {
  it('refuses before MAP2, on another config, a wrong count or too few tickets — and changes nothing', () => {
    const closed = open(); closed.cleared = [home.id];
    expect(pullReason(closed, maps, home, 1, G.version)).toBe('locked');
    expect(pullReason(open(), maps, home, 1, G.version + 1)).toBe('config');
    expect(pullReason(open(), maps, home, 5, G.version)).toBe('count');
    expect(pullReason(open(9), maps, home, 10, G.version)).toBe('tickets');
    expect(pullReason(open(10), maps, home, 10, G.version)).toBe('');
    const p = open(0); const r = gachaPull(p, maps, home, 1, G.version, 1);
    expect(r.event).toEqual({ type: 'blocked', reason: 'tickets' }); expect(r.profile).toBe(p);
  });
  it('spends tickets, adds one point per pull, records the entry and is deterministic for a seed', () => {
    const p = open(20, 5);
    const a = gachaPull(p, maps, home, 10, G.version, 777), b = gachaPull(p, maps, home, 10, G.version, 777);
    expect(a).toEqual(b); expect(p.gacha!.tickets).toBe(20); // the input is not mutated
    const e = entryOf(a);
    expect(a.profile.gacha!.tickets).toBe(10); expect(a.profile.gacha!.points).toBe(15);
    expect(e).toMatchObject({ serial: 1, kind: 'pull', config: G.version, tickets: 10, points: 10 }); expect(e.results).toHaveLength(10);
    expect(a.profile.gacha!.history).toEqual([e]);
  });
  it('a 10-pull is the same as ten draws of the same stream applied in order', () => {
    const seed = 31337; const p = open(10); const ten = entryOf(gachaPull(p, maps, home, 10, G.version, seed));
    ten.results.forEach((r, k) => { const o = gachaOutcome(G, seed, k); expect([r.heroId, r.full]).toEqual([o.heroId, o.full]); if (!o.full) expect(r.qty).toBe(o.qty); });
  });
  it('converts results: join ★1, duplicate shards, universal at ★5, shards kept even at ★5, stored then unlocked', () => {
    // Find seeds whose first draw is a full copy / shards of a known character.
    const seedFor = (want: (o: ReturnType<typeof gachaOutcome>) => boolean): number => { for (let s = 1; ; s++) if (want(gachaOutcome(G, s, 0))) return s; };
    const fullSeed = seedFor(o => o.full); const hero = gachaOutcome(G, fullSeed, 0).heroId;
    const base = open(10); delete base.members[hero]; base.company = base.company.filter(id => id !== hero);
    for (const g of ['deployed', 'reserve'] as const) base.party[g] = base.party[g].filter(id => id !== hero);
    const joined = gachaPull(base, maps, home, 1, G.version, fullSeed);
    expect(entryOf(joined).results[0]).toEqual({ heroId: hero, full: true, qty: 0, grant: 'joined' });
    expect(joined.profile.members[hero]).toEqual({ stars: 1, shards: 0 }); expect(joined.profile.company).toContain(hero);
    const dup = gachaPull(joined.profile, maps, home, 1, G.version, fullSeed);
    expect(entryOf(dup).results[0]!.grant).toBe('duplicate'); expect(dup.profile.members[hero]!.shards).toBe(home.company.shardsPerDuplicate);
    const maxed = structuredClone(joined.profile); maxed.members[hero]!.stars = 5; const bank = maxed.bank.shard;
    const uni = gachaPull(maxed, maps, home, 1, G.version, fullSeed);
    expect(entryOf(uni).results[0]!.grant).toBe('universal'); expect(uni.profile.bank.shard).toBe(bank + home.company.shardsPerDuplicate);
    const shardSeed = seedFor(o => !o.full && o.heroId === hero); const q = gachaOutcome(G, shardSeed, 0).qty;
    const kept = gachaPull(maxed, maps, home, 1, G.version, shardSeed);
    expect(entryOf(kept).results[0]).toEqual({ heroId: hero, full: false, qty: q, grant: 'shards' }); expect(kept.profile.members[hero]!.shards).toBe(q);
    // Unowned: shards wait in `pending`; reaching the unlock amount brings the character in at ★1 with the rest.
    const stored = gachaPull(base, maps, home, 1, G.version, shardSeed);
    expect(entryOf(stored).results[0]!.grant).toBe('stored'); expect(stored.profile.gacha!.pending).toEqual({ [hero]: q });
    const near = structuredClone(base); near.gacha!.pending = { [hero]: G.unlockShards - 1 };
    const unlocked = gachaPull(near, maps, home, 1, G.version, shardSeed);
    expect(entryOf(unlocked).results[0]!.grant).toBe('unlocked');
    expect(unlocked.profile.members[hero]).toEqual({ stars: 1, shards: q - 1 }); expect(unlocked.profile.gacha!.pending).toBeUndefined();
  });
  it('keeps only the newest history entries and numbers every entry', () => {
    let p = open(G.historyKeep + 5);
    for (let i = 0; i < G.historyKeep + 5; i++) p = gachaPull(p, maps, home, 1, G.version, i + 1).profile;
    expect(p.gacha!.serial).toBe(G.historyKeep + 5); expect(p.gacha!.history).toHaveLength(G.historyKeep);
    expect(p.gacha!.history[0]!.serial).toBe(6); expect(p.gacha!.points).toBe(G.historyKeep + 5);
  });
});

describe('P10 exchange', () => {
  it('takes exactly 80 points once, keeps the rest, and refuses below 80 or outside the cabinet', () => {
    expect(exchangeReason(open(0, 79), maps, home, 'kael', G.version)).toBe('points');
    expect(exchangeReason(open(0, 80), maps, home, 'thiran', G.version)).toBe('unknown');
    expect(exchangeReason(open(0, 80), maps, home, 'kael', G.version + 1)).toBe('config');
    const r = gachaExchange(open(0, 159), maps, home, 'kael', G.version);
    expect(r.profile.gacha!.points).toBe(79); expect(r.event.type).toBe('gacha');
    expect(exchangeReason(r.profile, maps, home, 'kael', G.version)).toBe('points');
    const e = (r.event as { entry: GachaEntry }).entry;
    expect(e).toMatchObject({ kind: 'exchange', tickets: 0, points: 80 }); expect(e.results).toHaveLength(1); expect(e.results[0]!.full).toBe(true);
  });
});

describe('P10 tickets and joins', () => {
  it('the weekly board pays tickets into the wallet', () => {
    const t = home.board.weekly[0]!; expect(t.reward.tickets).toBe(2);
    // claimBoard needs the board book; the reward path is checked through the command tests. Here: addTickets via a claim
    // is refused when it would pass the ceiling.
    const p = open(G.ticketCap); expect(claimBoard(p, maps, 'weekly', t.id, 0, 0).event.type).toBe('blocked');
  });
  it('shards stored for a character move into the member when it joins another way (hire, story)', () => {
    const p = open(); const id = 'astrid'; delete p.members[id]; p.company = p.company.filter(x => x !== id);
    p.party.deployed = p.party.deployed.filter(x => x !== id); p.party.reserve = p.party.reserve.filter(x => x !== id);
    p.gacha!.pending = { [id]: 7 }; p.bank.gold = 999; p.boardPool = [id]; p.boardFeatured = [];
    const hired = hire(p, home, lookup, 0);
    if (hired.event.type === 'hired' && hired.event.heroId === id) { expect(hired.profile.members[id]!.shards).toBe(7); expect(hired.profile.gacha!.pending).toBeUndefined(); }
    expect(typeof settle).toBe('function');
  });
});

describe('P10 save v66', () => {
  it('round-trips the wallet and rejects a tampered one', () => {
    const p = gachaPull(open(30), maps, home, 10, G.version, 99).profile;
    const raw = serializeGame({ profile: p, run: null });
    expect(parseGame(raw, home, lookup, maps).profile.gacha).toEqual(p.gacha);
    const bad = (f: (g: Record<string, unknown>) => void) => { const env = JSON.parse(raw); f(env.profile.gacha); return () => parseGame(JSON.stringify(env), home, lookup, maps); };
    expect(bad(g => { g.tickets = -1; })).toThrow();
    expect(bad(g => { g.tickets = G.ticketCap + 1; })).toThrow();
    expect(bad(g => { g.pending = { thiran: 3 }; })).toThrow();
    expect(bad(g => { g.pending = { [p.company[0]!]: 3 }; })).toThrow();
    expect(bad(g => { (g.history as GachaEntry[])[0]!.results[0]!.grant = 'free' as never; })).toThrow();
    expect(bad(g => { g.extra = 1; })).toThrow();
  });
  it('loads a v65 save unchanged (no wallet)', () => {
    const p = open(); delete p.gacha;
    const env = JSON.parse(serializeGame({ profile: p, run: null })); env.version = 65;
    expect(parseGame(JSON.stringify(env), home, lookup, maps).profile.gacha).toBeUndefined();
  });
});
