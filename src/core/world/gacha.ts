import { BANK_CAP } from './caps';
import { addDuplicate, featureOpen, joinCompany } from './profile';
import type { GachaBook, GachaEntry, GachaResult, GachaRules, MapDefinition, Profile, ProfileResult } from './types';

// P10 free-ticket gacha (owner OD-58, 2026-11-21; docs/design/GACHA_P10_SPEC_TH.md). Pure rules: the random draws come
// from one seed per pull command (`seed`, from the command's `SeedSource`: the server's online, the device's offline) and
// are never stored, so a device cannot see or steer the next result. A pull spends tickets, gains one point per pull and
// turns each draw into a grant in order (a 10-pull is ten 1-pulls on the same stream: `1×10 = 10×1`). No guarantee
// beyond the published rates; the exchange is the chosen-character path.

const MEMBER_SHARD_CAP = 9_999; // the save validator's limit for `MemberProgress.shards`
const BP = 10_000;
export const emptyGacha = (): GachaBook => ({ tickets: 0, points: 0, serial: 0, history: [] });

// A uniform draw in [0, n) for draw `index` of `seed` (32-bit mix, multiply-shift: no modulo bias worth counting).
export function gachaDraw(seed: number, index: number, n: number): number {
  let t = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b); t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35); t = (t ^ (t >>> 16)) >>> 0;
  return Math.floor((t / 4_294_967_296) * n);
}

// The published rates: per character, the chance of a full copy and of each shard quantity, in basis points as exact
// fractions (numerator over `BP × pool × weights`). They add up to exactly 100%.
export interface GachaRate { heroId: string; full: number; shards: { qty: number; chance: number }[] }
export function gachaRates(rules: GachaRules): { rates: GachaRate[]; full: number; shards: { qty: number; chance: number }[] } {
  const n = rules.pool.length; const w = rules.shardWeights.reduce((a, s) => a + s.weight, 0);
  const shard = (weight: number) => (BP - rules.fullBp) * weight / (BP * w);
  return {
    full: rules.fullBp / BP,
    shards: rules.shardWeights.map(s => ({ qty: s.qty, chance: shard(s.weight) })),
    rates: rules.pool.map(heroId => ({ heroId, full: rules.fullBp / BP / n, shards: rules.shardWeights.map(s => ({ qty: s.qty, chance: shard(s.weight) / n })) })),
  };
}

// One draw → (character, full copy or shards). Draw k of a pull uses stream indexes 3k, 3k+1, 3k+2.
export function gachaOutcome(rules: GachaRules, seed: number, k: number): { heroId: string; full: boolean; qty: number } {
  const full = gachaDraw(seed, 3 * k, BP) < rules.fullBp;
  const heroId = rules.pool[gachaDraw(seed, 3 * k + 1, rules.pool.length)]!;
  if (full) return { heroId, full, qty: 0 };
  const total = rules.shardWeights.reduce((a, s) => a + s.weight, 0);
  let pick = gachaDraw(seed, 3 * k + 2, total);
  const qty = rules.shardWeights.find(s => (pick -= s.weight) < 0)!.qty;
  return { heroId, full, qty };
}

// Applies one draw (or an exchange: a full copy) to `profile` in place and says what it granted.
function grant(profile: Profile, map: MapDefinition, book: GachaBook, heroId: string, full: boolean, qty: number): GachaResult {
  const member = profile.members[heroId];
  if (full) {
    if (!member) { joinCompany(profile, map, heroId); return { heroId, full, qty: 0, grant: 'joined' }; }
    const maxed = member.stars >= map.company.maxStars;
    addDuplicate(profile, map, heroId);
    return { heroId, full, qty: map.company.shardsPerDuplicate, grant: maxed ? 'universal' : 'duplicate' };
  }
  // D19: shards of a member at full stars are kept (no automatic conversion before a promotion policy exists).
  if (member) { member.shards += qty; return { heroId, full, qty, grant: 'shards' }; }
  const pending = (book.pending ??= {}); pending[heroId] = (pending[heroId] ?? 0) + qty;
  if (pending[heroId]! < map.gacha.unlockShards) return { heroId, full, qty, grant: 'stored' };
  pending[heroId]! -= map.gacha.unlockShards;
  joinCompany(profile, map, heroId); // moves the rest of `pending` into the new member's shards
  return { heroId, full, qty, grant: 'unlocked' };
}

function record(profile: Profile, map: MapDefinition, book: GachaBook, entry: Omit<GachaEntry, 'serial'>): GachaEntry {
  const full: GachaEntry = { serial: ++book.serial, ...entry };
  book.history = [...book.history, full].slice(-map.gacha.historyKeep);
  if (book.pending && !Object.keys(book.pending).length) delete book.pending;
  profile.gacha = book;
  return full;
}

// The worst a command could add to one member or to the universal shards stays within the save's ceilings.
function roomFor(profile: Profile, map: MapDefinition, copies: number): boolean {
  const add = copies * Math.max(map.company.shardsPerDuplicate, ...map.gacha.shardWeights.map(s => s.qty));
  return profile.bank.shard + add <= BANK_CAP.shard && Object.values(profile.members).every(m => m.shards + add <= MEMBER_SHARD_CAP);
}

// '' when the pull can be made. 'locked' (the cabinet opens with the hiring board, after MAP2: D18), 'config' (the
// player saw another config version), 'count' (not 1 or 10), 'tickets' (too few), 'points' (the point ceiling) or 'full'.
export function pullReason(profile: Profile, maps: readonly MapDefinition[], map: MapDefinition, count: number, config: number): string {
  if (!featureOpen(profile, maps, 'gacha')) return 'locked';
  if (config !== map.gacha.version) return 'config';
  if (!map.gacha.counts.includes(count)) return 'count';
  const book = profile.gacha ?? emptyGacha();
  if (book.tickets < count * map.gacha.ticketCost) return 'tickets';
  if (book.points + count > map.gacha.pointCap) return 'points';
  return roomFor(profile, map, count) ? '' : 'full';
}
export function gachaPull(initial: Profile, maps: readonly MapDefinition[], map: MapDefinition, count: number, config: number, seed: number): ProfileResult {
  const reason = pullReason(initial, maps, map, count, config);
  if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const book = profile.gacha ?? emptyGacha();
  const tickets = count * map.gacha.ticketCost; book.tickets -= tickets; book.points += count;
  const results: GachaResult[] = [];
  for (let k = 0; k < count; k++) { const o = gachaOutcome(map.gacha, seed >>> 0, k); results.push(grant(profile, map, book, o.heroId, o.full, o.qty)); }
  const entry = record(profile, map, book, { kind: 'pull', config, tickets, points: count, results });
  return { profile, event: { type: 'gacha', entry } };
}

// '' when `heroId` can be taken for points: as `pullReason`, plus 'unknown' (not in the cabinet) and 'points' (too few).
export function exchangeReason(profile: Profile, maps: readonly MapDefinition[], map: MapDefinition, heroId: string, config: number): string {
  if (!featureOpen(profile, maps, 'gacha')) return 'locked';
  if (config !== map.gacha.version) return 'config';
  if (!map.gacha.pool.includes(heroId)) return 'unknown';
  if ((profile.gacha?.points ?? 0) < map.gacha.exchangePoints) return 'points';
  return roomFor(profile, map, 1) ? '' : 'full';
}
export function gachaExchange(initial: Profile, maps: readonly MapDefinition[], map: MapDefinition, heroId: string, config: number): ProfileResult {
  const reason = exchangeReason(initial, maps, map, heroId, config);
  if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const book = profile.gacha!;
  book.points -= map.gacha.exchangePoints;
  const result = grant(profile, map, book, heroId, true, 0);
  const entry = record(profile, map, book, { kind: 'exchange', config, tickets: 0, points: map.gacha.exchangePoints, results: [result] });
  return { profile, event: { type: 'gacha', entry } };
}

// Free tickets from a reward (quest board, World Boss trio). False when they would pass the ceiling (the claim is refused).
export const ticketsFit = (profile: Profile, map: MapDefinition, tickets = 0): boolean => (profile.gacha?.tickets ?? 0) + tickets <= map.gacha.ticketCap;
export function addTickets(profile: Profile, tickets = 0): void {
  if (tickets > 0) (profile.gacha ??= emptyGacha()).tickets += tickets;
}
