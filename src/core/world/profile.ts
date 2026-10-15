import type { Commander, ExpeditionState, MapDefinition, Profile, ProfileResult, RunOutcome } from './types';
import { COMPANY_CAP, PARTY_SLOTS, RESERVE_SLOTS } from './types';
import { heroCatalog, newExpedition, rollPercent, type EncounterLookup } from './world';

// Pure lobby rules: the persistent mercenary company, the bank, the hiring board, the
// team chosen for the next expedition, and settling a finished expedition back home.
export function newProfile(map: MapDefinition, seed: number): Profile {
  return {
    seed: seed >>> 0, returns: 0, tutorialDone: false, commander: null,
    company: [...map.startingRoster], members: Object.fromEntries(map.startingRoster.map(id => [id, { stars: 1, dupes: 0 }])),
    party: { deployed: [...map.startingRoster], reserve: [] },
    bank: { ore: 0, seal: 0 }, taken: [], expeditions: 0, completes: 0, last: null,
  };
}
const blocked = (profile: Profile, reason: string): ProfileResult => ({ profile, event: { type: 'blocked', reason } });

// Commander: a name (1–20 code points after trimming, Thai marks included, no control characters) plus one crest
// and one banner colour from fixed lists. The commander leads the company but never fights.
export const COMMANDER_CRESTS = ['star', 'guard', 'flag', 'bolt', 'heal', 'mark'] as const;
export const COMMANDER_COLORS = ['gold', 'cyan', 'violet', 'coral', 'mint', 'rose'] as const;
export const NAME_MAX = 20;
export const normalizeName = (name: string): string => name.normalize('NFC').replace(/\s+/g, ' ').trim();
export function commanderReason(c: Commander): string {
  const name = normalizeName(c.name);
  if (!name) return 'name';
  if ([...name].length > NAME_MAX || /[<>]/.test(name) || [...name].some(ch => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)) return 'name';
  if (!(COMMANDER_CRESTS as readonly string[]).includes(c.crest)) return 'crest';
  return (COMMANDER_COLORS as readonly string[]).includes(c.color) ? '' : 'color';
}
export function createCommander(initial: Profile, c: Commander): ProfileResult {
  const reason = commanderReason(c); if (reason) return blocked(initial, reason);
  return { profile: { ...structuredClone(initial), commander: { name: normalizeName(c.name), crest: c.crest, color: c.color } }, event: { type: 'commander' } };
}

// The board is derived from (seed, returns): reloads cannot re-roll it and it refreshes
// every time an expedition comes home. Company members can be offered (duplicates).
export function boardOffers(profile: Profile, map: MapDefinition, lookup: EncounterLookup): string[] {
  const pool = heroCatalog(lookup, map).map(h => h.id); const offers: string[] = [];
  const salt = Math.imul(profile.returns + 1, 0x2c1b3c6d) >>> 0;
  for (let i = 0; offers.length < Math.min(map.company.offers, pool.length); i++) {
    const left = pool.filter(id => !offers.includes(id));
    offers.push(left[(rollPercent(profile.seed ^ salt, i) * 7919 + i) % left.length]!);
  }
  return offers;
}
export function hireReason(profile: Profile, map: MapDefinition, lookup: EncounterLookup, index: number): string {
  const id = boardOffers(profile, map, lookup)[index];
  if (!id || profile.taken.includes(index)) return 'taken';
  if (profile.bank.ore < map.company.hireCost) return 'ore';
  if (profile.members[id]) return profile.members[id]!.stars >= map.company.maxStars ? 'maxed' : '';
  return profile.company.length >= COMPANY_CAP ? 'full' : '';
}
// Hiring someone already in the company stores a duplicate for star upgrades instead.
// A new mercenary joins the company and, if there is room, the reserve for the next trip.
export function hire(initial: Profile, map: MapDefinition, lookup: EncounterLookup, index: number): ProfileResult {
  const reason = hireReason(initial, map, lookup, index); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const id = boardOffers(profile, map, lookup)[index]!;
  const duplicate = !!profile.members[id];
  profile.bank.ore -= map.company.hireCost; profile.taken.push(index);
  if (duplicate) profile.members[id]!.dupes++;
  else {
    profile.members[id] = { stars: 1, dupes: 0 }; profile.company.push(id);
    if (profile.party.reserve.length < RESERVE_SLOTS) profile.party.reserve.push(id);
  }
  return { profile, event: { type: 'hired', heroId: id, duplicate } };
}
// Cost of the next star: duplicates first; one contract seal may stand in for a missing duplicate.
export function upgradeCost(profile: Profile, map: MapDefinition, id: string): { dupes: number; seals: number; ore: number } | undefined {
  const m = profile.members[id]; const cost = m && map.company.starCosts[m.stars - 1];
  if (!m || !cost || m.stars >= map.company.maxStars) return undefined;
  const dupes = Math.min(m.dupes, cost.dupes);
  return { dupes, seals: cost.dupes - dupes, ore: cost.ore };
}
export function upgradeReason(profile: Profile, map: MapDefinition, id: string): string {
  const cost = upgradeCost(profile, map, id);
  if (!cost) return 'maxed';
  if (cost.seals > 1 || cost.seals > profile.bank.seal) return 'dupes';
  return profile.bank.ore < cost.ore ? 'ore' : '';
}
export function upgrade(initial: Profile, map: MapDefinition, id: string): ProfileResult {
  const reason = upgradeReason(initial, map, id); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const cost = upgradeCost(profile, map, id)!; const m = profile.members[id]!;
  m.dupes -= cost.dupes; m.stars++; profile.bank.seal -= cost.seals; profile.bank.ore -= cost.ore;
  return { profile, event: { type: 'upgraded', heroId: id, stars: m.stars } };
}
// Dismissing loses the member's stars and duplicates; half the hire cost comes back.
export function dismissReason(profile: Profile, id: string): string {
  if (!profile.company.includes(id)) return 'unknown';
  return profile.party.deployed.length === 1 && profile.party.deployed[0] === id ? 'last' : '';
}
export function dismiss(initial: Profile, map: MapDefinition, id: string): ProfileResult {
  const reason = dismissReason(initial, id); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial);
  profile.company = profile.company.filter(m => m !== id); delete profile.members[id];
  profile.party.deployed = profile.party.deployed.filter(m => m !== id); profile.party.reserve = profile.party.reserve.filter(m => m !== id);
  profile.bank.ore += map.company.dismissRefund;
  return { profile, event: { type: 'dismissed', heroId: id } };
}

// Team selection: every company member is in one group. Swap two members of different
// groups, or move one into a free slot of another group. One member always stays deployed.
export type Group = 'deployed' | 'reserve' | 'bench';
export function groupOf(profile: Profile, id: string): Group | undefined {
  if (profile.party.deployed.includes(id)) return 'deployed';
  if (profile.party.reserve.includes(id)) return 'reserve';
  return profile.company.includes(id) ? 'bench' : undefined;
}
export function placeMember(initial: Profile, id: string, target: Group, other?: string): ProfileResult {
  const from = groupOf(initial, id);
  if (!from || from === target || (other && groupOf(initial, other) !== target)) return blocked(initial, 'busy');
  const profile = structuredClone(initial); const { party } = profile;
  const list = (g: Group) => g === 'deployed' ? party.deployed : g === 'reserve' ? party.reserve : undefined;
  const src = list(from); const dst = list(target);
  if (other) {
    if (src) src[src.indexOf(id)] = other;
    if (dst) dst[dst.indexOf(other)] = id;
  } else {
    if (dst && dst.length >= (target === 'deployed' ? PARTY_SLOTS : RESERVE_SLOTS)) return blocked(initial, 'full');
    if (src) src.splice(src.indexOf(id), 1);
    dst?.push(id);
  }
  if (!party.deployed.length) return blocked(initial, 'last');
  return { profile, event: { type: 'party' } };
}

// Starts an expedition with the chosen 4 + 4 at full HP and their current stars.
export function departure(profile: Profile, map: MapDefinition, lookup: EncounterLookup, seed: number): ExpeditionState {
  const ids = [...profile.party.deployed, ...profile.party.reserve];
  return newExpedition(map, lookup, seed, { roster: structuredClone(profile.party), members: Object.fromEntries(ids.map(id => [id, { ...profile.members[id]! }])) }, profile.tutorialDone);
}
// Share of carried ore/seals kept when the expedition ends this way (embers never leave the map).
export const keptPercent: Record<RunOutcome, number> = { complete: 100, withdrawn: 100, wiped: 50 };
export function settle(initial: Profile, run: ExpeditionState, outcome: RunOutcome): Profile {
  const profile = structuredClone(initial); const pct = keptPercent[outcome];
  const ore = Math.floor(run.resources.ore * pct / 100); const seal = Math.floor(run.resources.seal * pct / 100);
  profile.bank.ore += ore; profile.bank.seal += seal;
  profile.tutorialDone ||= run.tutorialDone; profile.expeditions++; if (outcome === 'complete') profile.completes++;
  profile.returns++; profile.taken = [];
  profile.last = { outcome, ore, seal, steps: run.steps, wins: run.wins };
  return profile;
}
// Withdrawal is allowed at a camp or the map entrance, outside battle.
export { atMuster as canWithdraw } from './world';
