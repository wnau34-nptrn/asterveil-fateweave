import {startBossPlan} from './boss-equipment';
import {startHunt} from './targeted-loot';
import {storageCap,departureBlocked} from './storage';
import { memberTalentReason, talentsSpent } from './talents';
import type { GuideDefinition, GuideKind, LobbyFeature, Commander, ShopItemId, SideQuestKind, ExpeditionState, Gear, GearSlot, Item, MapDefinition, PotionId, Potions, Profile, ProfileResult, RunOutcome, TalentNode } from './types';
import { rollItem, salvageValue } from './equipment';
import { COMPANY_CAP, GEAR_SLOTS, PARTY_SLOTS, POTION_IDS, RESERVE_SLOTS, SET_IDS } from './types';
import { heroCatalog, levelOf, loadoutReason, memberDef, newExpedition, rollPercent, rosterIds, type EncounterLookup } from './world';
import type { ActionId } from '../battle/types';

// Pure lobby rules: the persistent mercenary company, the bank, the hiring board, the
// team chosen for the next expedition, and settling a finished expedition back home.
// `first`: the founding members. The shell starts a brand-new game with `map.firstCompany` (the Knight alone); the
// default, the four teaching heroes, is the company of older saves and of most tests.
export function newProfile(map: MapDefinition, seed: number, first: readonly string[] = map.startingRoster): Profile {
  return {
    bossLoot:{}, hunt:{pity:{}}, seed: seed >>> 0, returns: 0, tutorialDone: false, commander: null,
    company: [...first], members: Object.fromEntries(first.map(id => [id, { stars: 1, dupes: 0 }])),
    party: { deployed: [...first], reserve: [] },
    forgeLevel: map.equipment.forge.itemLevel.baseCap, bank: { ore: 0, gold: 0, seal: 0, dust: 0 }, items: [], overflow:[],storageTier:0, nextItem: 1, forge: 0, potions: { salve: 0, tonic: 0, repel: 0 }, quests: {}, shop: {}, refreshes: 0, smelted: 0, taken: [], expeditions: 0, completes: 0, cleared: [], last: null,
  };
}
const blocked = (profile: Profile, reason: string): ProfileResult => ({ profile, event: { type: 'blocked', reason } });

// Commander: a name (1–20 code points after trimming, Thai marks included, no control characters) plus one crest
// and one banner colour from fixed lists. The commander leads the company but never fights.
export const COMMANDER_CRESTS = ['star', 'guard', 'flag', 'bolt', 'heal', 'mark'] as const;
export const COMMANDER_COLORS = ['gold', 'cyan', 'violet', 'coral', 'mint', 'rose'] as const;
export const NAME_MAX = 20;
export const normalizeName = (name: string): string => name.normalize('NFC').replace(/\s+/g, ' ').trim();
const badName = (raw: string): boolean => {
  const name = normalizeName(raw);
  return !name || [...name].length > NAME_MAX || /[<>]/.test(name) || [...name].some(ch => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127);
};
// A company saved before camp names gets "ค่าย" + the commander's name, cut to the name limit.
export const defaultCamp = (commander: string): string => [...normalizeName(`ค่าย${normalizeName(commander)}`)].slice(0, NAME_MAX).join('').trim();
export function commanderReason(c: Commander): string {
  if (badName(c.name)) return 'name';
  if (badName(c.camp)) return 'camp';
  if (!(COMMANDER_CRESTS as readonly string[]).includes(c.crest)) return 'crest';
  return (COMMANDER_COLORS as readonly string[]).includes(c.color) ? '' : 'color';
}
export function createCommander(initial: Profile, c: Commander): ProfileResult {
  const reason = commanderReason(c); if (reason) return blocked(initial, reason);
  return { profile: { ...structuredClone(initial), commander: { name: normalizeName(c.name), crest: c.crest, color: c.color, camp: normalizeName(c.camp) } }, event: { type: 'commander' } };
}
// The camp can be renamed in the lobby at any time; the name follows the commander rules.
export function renameCamp(initial: Profile, camp: string): ProfileResult {
  if (!initial.commander) return blocked(initial, 'commander');
  if (badName(camp)) return blocked(initial, 'camp');
  if (normalizeName(camp) === initial.commander.camp) return blocked(initial, 'unchanged');
  const profile = structuredClone(initial); profile.commander!.camp = normalizeName(camp);
  return { profile, event: { type: 'commander' } };
}

// The board is derived from (seed, returns): reloads cannot re-roll it and it refreshes
// every time an expedition comes home. Company members can be offered (duplicates).
export function boardOffers(profile: Profile, map: MapDefinition, lookup: EncounterLookup): string[] {
  const pool = heroCatalog(lookup, map).map(h => h.id); const offers: string[] = [];
  // A paid refresh (4A) redraws the board; with no refresh it is the same board as before.
  const salt = (Math.imul(profile.returns + 1, 0x2c1b3c6d) ^ Math.imul(profile.refreshes, 0x165667b1)) >>> 0;
  for (let i = 0; offers.length < Math.min(map.company.offers, pool.length); i++) {
    const left = pool.filter(id => !offers.includes(id));
    offers.push(left[(rollPercent(profile.seed ^ salt, i) * 7919 + i) % left.length]!);
  }
  return offers;
}
export function hireReason(profile: Profile, map: MapDefinition, lookup: EncounterLookup, index: number): string {
  const id = boardOffers(profile, map, lookup)[index];
  if (!id || profile.taken.includes(index)) return 'taken';
  if (profile.bank.gold < map.company.hireCost) return 'gold';
  if (profile.members[id]) return profile.members[id]!.stars >= map.company.maxStars ? 'maxed' : '';
  return profile.company.length >= COMPANY_CAP ? 'full' : '';
}
// A new member starts `joinBehind` levels below the company's best (never below 1), so new recruits are worth bringing.
export const joinLevel = (profile: Profile, map: MapDefinition): number => Math.max(1, Math.max(1, ...Object.values(profile.members).map(m => m.level ?? 1)) - map.progression.joinBehind);
// Hiring someone already in the company stores a duplicate for star upgrades instead.
// A new mercenary joins the company and, if there is room, the reserve for the next trip.
export function hire(initial: Profile, map: MapDefinition, lookup: EncounterLookup, index: number): ProfileResult {
  const reason = hireReason(initial, map, lookup, index); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const id = boardOffers(profile, map, lookup)[index]!;
  const duplicate = !!profile.members[id];
  profile.bank.gold -= map.company.hireCost; profile.taken.push(index);
  if (duplicate) profile.members[id]!.dupes++;
  else {
    profile.members[id] = { stars: 1, dupes: 0, ...(joinLevel(profile, map) > 1 ? { level: joinLevel(profile, map), exp: 0 } : {}) }; profile.company.push(id);
    if (profile.party.reserve.length < RESERVE_SLOTS) profile.party.reserve.push(id);
  }
  return { profile, event: { type: 'hired', heroId: id, duplicate } };
}
// Cost of the next star: duplicates first; contract seals may stand in for up to `sealSharePercent` (rounded up)
// of the duplicates the star needs.
export function upgradeCost(profile: Profile, map: MapDefinition, id: string): { dupes: number; seals: number; ore: number } | undefined {
  const m = profile.members[id]; const cost = m && map.company.starCosts[m.stars - 1];
  if (!m || !cost || m.stars >= map.company.maxStars) return undefined;
  const dupes = Math.min(m.dupes, cost.dupes);
  return { dupes, seals: cost.dupes - dupes, ore: cost.ore };
}
export const sealLimit = (map: MapDefinition, stars: number): number => Math.ceil((map.company.starCosts[stars - 1]?.dupes ?? 0) * map.company.sealSharePercent / 100);
export function upgradeReason(profile: Profile, map: MapDefinition, id: string): string {
  const cost = upgradeCost(profile, map, id);
  if (!cost) return 'maxed';
  if (cost.seals > sealLimit(map, profile.members[id]!.stars) || cost.seals > profile.bank.seal) return 'dupes';
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
  // Their equipment is preserved in the bag or the pending tray.
  for (const item of Object.values(profile.members[id]?.gear ?? {}).sort((a,b)=>Number(!!b?.locked)-Number(!!a?.locked))) if (item) stash(profile, map, item);
  if(profile.hunt?.target===id)delete profile.hunt.target;
  profile.company = profile.company.filter(m => m !== id); delete profile.members[id];
  profile.party.deployed = profile.party.deployed.filter(m => m !== id); profile.party.reserve = profile.party.reserve.filter(m => m !== id);
  profile.bank.gold += map.company.dismissRefund;
  return { profile, event: { type: 'dismissed', heroId: id } };
}

// Talent gates are shared with exploration spending; only the lobby can reset points.
export { talentPoints, talentsSpent, talentOpen, talentsValid } from './talents';
export function talentReason(profile: Profile, map: MapDefinition, id: string, node: TalentNode): string {
  return memberTalentReason(map, id, profile.members[id], node);
}
export function learnTalent(initial: Profile, map: MapDefinition, id: string, node: TalentNode): ProfileResult {
  const reason = talentReason(initial, map, id, node); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const m = profile.members[id]!;
  m.talents = { ...m.talents, [node]: (m.talents?.[node] ?? 0) + 1 };
  return { profile, event: { type: 'talent', heroId: id } };
}
// Resetting is free and returns every point.
export function resetTalents(initial: Profile, id: string): ProfileResult {
  if (!talentsSpent(initial.members[id]?.talents)) return blocked(initial, 'empty');
  // Unlocked skills may go with the points, so the loadout returns to the default.
  const profile = structuredClone(initial); delete profile.members[id]!.talents; delete profile.members[id]!.loadout;
  return { profile, event: { type: 'talent', heroId: id } };
}
// Choosing the battle skills (A6) is free, in the lobby or (`chooseRunLoadout`) on the map outside battle.
export function chooseLoadout(initial: Profile, map: MapDefinition, lookup: EncounterLookup, id: string, loadout: readonly ActionId[]): ProfileResult {
  const reason = loadoutReason(lookup, map, id, initial.members[id], loadout); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); profile.members[id]!.loadout = [...loadout];
  return { profile, event: { type: 'talent', heroId: id } };
}

// ---- Equipment (2D-2): equip, unequip and salvage happen only in the lobby. ----
// Preserve excess rewards and returned owned equipment in a persistent pending tray.
function stash(profile: Profile, map: MapDefinition, item: Item): boolean {
  if (profile.items.length < storageCap(profile,map)) { profile.items.push(item); return true; }
  (profile.overflow??=[]).push(item);return true;
}
export function equipReason(profile: Profile, heroId: string, uid: number): string {
  const item = profile.items.find(i => i.uid === uid);
  if (!item || !profile.members[heroId]) return 'unknown';
  return item.slot === 'weapon' && item.hero !== heroId ? 'class' : '';
}
// Equipping swaps: the slot's previous item returns to the bag in the new item's place.
export function equip(initial: Profile, heroId: string, uid: number): ProfileResult {
  const reason = equipReason(initial, heroId, uid); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const m = profile.members[heroId]!;
  const index = profile.items.findIndex(i => i.uid === uid); const item = profile.items[index]!; const old = m.gear?.[item.slot];
  if (old) profile.items[index] = old; else profile.items.splice(index, 1);
  m.gear = { ...m.gear, [item.slot]: item };
  return { profile, event: { type: 'equipped', heroId } };
}
export function unequip(initial: Profile, map: MapDefinition, heroId: string, slot: GearSlot): ProfileResult {
  const item = initial.members[heroId]?.gear?.[slot];
  if (!item) return blocked(initial, 'unknown');
  if (initial.items.length >= storageCap(initial,map)) return blocked(initial, 'full');
  const profile = structuredClone(initial); const m = profile.members[heroId]!;
  profile.items.push(item); delete m.gear![slot]; if (!Object.keys(m.gear!).length) delete m.gear;
  return { profile, event: { type: 'equipped', heroId } };
}
// Salvages bag items (never equipped ones) into ore and veil dust.
export function salvageReason(initial:Profile,map:MapDefinition,uids:readonly number[]):string {
  const picked=initial.items.filter(i=>uids.includes(i.uid));
  if(!picked.length||picked.length!==uids.length||new Set(uids).size!==uids.length)return 'unknown';
  if(picked.some(i=>i.locked))return 'locked';
  if(uids.length>1&&picked.some(i=>i.boss))return 'protected';
  const total=picked.reduce((v,item)=>{const n=salvageValue(map,item);return {ore:v.ore+n.ore,dust:v.dust+n.dust};},{ore:0,dust:0});
  return !Number.isSafeInteger(total.ore)||!Number.isSafeInteger(total.dust)||initial.bank.ore+total.ore>9999999||initial.bank.dust+total.dust>9999999?'full':'';
}
export function salvage(initial: Profile, map: MapDefinition, uids: readonly number[]): ProfileResult {
  const reason=salvageReason(initial,map,uids);if(reason)return blocked(initial,reason);
  const profile=structuredClone(initial);let ore=0,dust=0;
  for(const item of profile.items.filter(i=>uids.includes(i.uid))){const v=salvageValue(map,item);ore+=v.ore;dust+=v.dust;}
  profile.items=profile.items.filter(i=>!uids.includes(i.uid));profile.bank.ore+=ore;profile.bank.dust+=dust;
  return {profile,event:{type:'salvaged',count:uids.length,ore,dust}};
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
  return depart(profile, map, lookup, seed).run;
}
// Departing also packs up to `carry` of each brewed potion, taken out of the home stock (2D-5).
// Hard mode (A9): open once the system is unlocked (chapter 3) and this map has been cleared on normal.
export function hardReason(profile: Profile, maps: readonly MapDefinition[], mapId: string): string {
  if (!featureOpen(profile, maps, 'hard')) return 'locked';
  return profile.cleared.includes(mapId) ? '' : 'normal';
}
export function depart(initial: Profile, map: MapDefinition, lookup: EncounterLookup, seed: number, hard?: { maps: readonly MapDefinition[] }): { profile: Profile; run: ExpeditionState } {
  if (hard && hardReason(initial, hard.maps, map.id)) throw new Error('Hard mode is not open for this map');
  if(departureBlocked(initial))throw new Error('Resolve overflow before departing');
  const profile = structuredClone(initial); const ids = [...profile.party.deployed, ...profile.party.reserve];
  const potions = Object.fromEntries(POTION_IDS.map(id => [id, Math.min(map.potions.carry, profile.potions[id])])) as Potions;
  for (const id of POTION_IDS) profile.potions[id] -= potions[id];
  const run = newExpedition(map, lookup, seed, { roster: structuredClone(profile.party), members: Object.fromEntries(ids.map(id => [id, { ...profile.members[id]! }])), potions }, profile.tutorialDone);
  run.hunt=startHunt(profile);if(map.bossCharm)run.bossLoot=startBossPlan(profile,map);
  if (hard) run.hard = true;
  // Story recruits not yet in the company come along as guests, in free party slots, at the join level.
  const guests = (map.recruits ?? []).map(r => r.hero).filter(id => !profile.company.includes(id) && !rosterIds(run).includes(id));
  for (const id of guests) {
    const group = run.roster.deployed.length < PARTY_SLOTS ? 'deployed' : run.roster.reserve.length < RESERVE_SLOTS ? 'reserve' : undefined;
    if (!group) break;
    run.roster[group].push(id); run.members[id] = { stars: 1, dupes: 0, ...(joinLevel(profile, map) > 1 ? { level: joinLevel(profile, map), exp: 0 } : {}) };
    run.hp[id] = memberDef(lookup, map, run.members, id)!.maxHp; (run.guests ??= []).push(id);
  }
  return { profile, run };
}
// ---- Potions (2D-5): brewed in the lobby for ore and veil dust; stock at home has no cap. ----
export function brewReason(profile: Profile, map: MapDefinition, potion: PotionId): string {
  const cost = map.potions.brew[potion]; if (!cost) return 'unknown';
  return profile.bank.ore < cost.ore ? 'ore' : profile.bank.dust < cost.dust ? 'dust' : '';
}
export function brew(initial: Profile, map: MapDefinition, potion: PotionId): ProfileResult {
  const reason = brewReason(initial, map, potion); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const cost = map.potions.brew[potion];
  profile.bank.ore -= cost.ore; profile.bank.dust -= cost.dust; profile.potions[potion]++;
  return { profile, event: { type: 'brewed', potion } };
}
// Share of carried ore/seals kept when the expedition ends this way (embers never leave the map).
export const keptPercent: Record<RunOutcome, number> = { complete: 100, withdrawn: 100, wiped: 50 };
export function settle(initial: Profile, settled: ExpeditionState, outcome: RunOutcome, map: MapDefinition): Profile {
  const profile = structuredClone(initial); const pct = keptPercent[outcome]; const run = structuredClone(settled);
  // Story recruits join for good (whatever the outcome); guests who never joined leave, and what they wore goes to the
  // bag (finds) or back to the company's spare items (own items).
  for (const id of run.recruited ?? []) {
    if (profile.members[id]) continue;
    profile.members[id] = { stars: 1, dupes: 0 }; profile.company.push(id);
    const group = profile.party.deployed.length < PARTY_SLOTS ? 'deployed' : profile.party.reserve.length < RESERVE_SLOTS ? 'reserve' : undefined;
    if (group) profile.party[group].push(id);
  }
  for (const id of run.guests ?? []) {
    for (const item of Object.values(run.members[id]?.gear ?? {}) as Item[]) (item.uid ? run.spare : run.found).push(item);
    delete run.members[id];
  }
  if(run.hunt?.target){profile.hunt??={pity:{}};profile.hunt.pity[run.hunt.target]=run.hunt.misses;}
  if(run.bossLoot){const {target,misses,rewarded}=run.bossLoot;profile.bossLoot??={};profile.bossLoot[map.bossEncounterId]={target,misses,rewarded};}
  const ore = Math.floor(run.resources.ore * pct / 100); const seal = Math.floor(run.resources.seal * pct / 100);
  const dust = Math.floor(run.dust * pct / 100); const gold = Math.floor(run.resources.gold * pct / 100);
  profile.bank.ore += ore; profile.bank.gold += gold; profile.bank.seal += seal; profile.bank.dust += dust;
  // Found equipment comes home, in the bag, pending tray or worn; a wiped team keeps only its `wipeKeep` best finds (rarity,
  // then level, then the earliest found). A full bag preserves the rest for an explicit camp choice. Map bag (2026-10-17): members keep
  // what they wear; a lost find leaves its slot to the item the member left the lobby with, when that is spare.
  const kept = new Set(homeItems(run, outcome, map)); let items = 0, salvaged = 0;
  const spare = [...run.spare];
  for (const id of Object.keys(run.members)) {
    const home = profile.members[id]; if (!home) continue;
    const before = home.gear ?? {}; const gear: Gear = {};
    for (const [slot, item] of Object.entries(run.members[id]!.gear ?? {}) as [GearSlot, Item][]) {
      if (item.uid) gear[slot] = item;
      else if (kept.has(item)) { gear[slot] = { ...item, uid: profile.nextItem++, ...(item.boss?{locked:true as const}:{}) }; items++; }
    }
    for (const slot of GEAR_SLOTS) {
      const own = before[slot]; const at = own && !gear[slot] ? spare.findIndex(i => i.uid === own.uid) : -1;
      if (at >= 0) gear[slot] = spare.splice(at, 1)[0]!;
    }
    if (Object.keys(gear).length) home.gear = gear; else delete home.gear;
  }
  // The company's own items taken off on the map always come home, even past the bag limit.
  for(const item of spare)stash(profile,map,item);
  for (const found of run.found) if (kept.has(found)) { if (stash(profile, map, { ...found, uid: profile.nextItem++, ...(found.boss?{locked:true as const}:{}) })) items++; else salvaged++; }
  // Unused potions come home too, unless the team was wiped.
  if (outcome !== 'wiped') for (const id of POTION_IDS) profile.potions[id] += run.potions[id];
  // Levels and EXP earned on the run are kept whatever the outcome (2D-1).
  for (const [id, m] of Object.entries(run.members)) if (profile.members[id] && m.level) profile.members[id] = { ...profile.members[id]!, level: m.level, exp: m.exp ?? 0, ...(m.talents ? { talents: structuredClone(m.talents) } : {}) };
  // A loadout chosen on the map comes home with the member.
  for (const [id, m] of Object.entries(run.members)) if (profile.members[id] && m.loadout) profile.members[id]!.loadout = [...m.loadout];
  // 3D: side quests count what this run did (herbs are lost on a wipe), capped at each target.
  for (const q of map.sideQuests) {
    const now = profile.quests[q.id] ?? { progress: 0, claimed: false }; if (now.claimed) continue;
    const add = sideQuestGain(q.kind, run, outcome, map);
    if (add) profile.quests[q.id] = { ...now, progress: Math.min(q.target, now.progress + add) };
  }
  const levels=map.equipment.forge.itemLevel;
  profile.forgeLevel=Math.max(profile.forgeLevel??levels.baseCap,...levels.unlocks.filter(u=>run.elitesDefeated.includes(u.elite)||(run.respawns[u.elite]??0)>0).map(u=>u.cap),...levels.clears.filter(c=>outcome==='complete'&&c.map===run.mapId).map(c=>c.cap));
  profile.tutorialDone ||= run.tutorialDone; profile.expeditions++; if (outcome === 'complete') profile.completes++;
  if (outcome === 'complete' && !profile.cleared.includes(run.mapId)) profile.cleared.push(run.mapId);
  if (outcome === 'complete' && run.hard && !profile.clearedHard?.includes(run.mapId)) {
    (profile.clearedHard ??= []).push(run.mapId); const r = map.progression.hardFirstClear; profile.bank.gold += r.gold; profile.bank.seal += r.seal;
  }
  profile.returns++; profile.taken = []; profile.shop = {}; profile.refreshes = 0; profile.smelted = 0;
  profile.last = { outcome, ore, gold, seal, steps: run.steps, wins: run.wins, items, salvaged };
  return profile;
}
// Every item found this run, in the bag or worn on the map (uid 0), in that order.
export function runFinds(run: ExpeditionState): Item[] {
  return [...run.found, ...Object.values(run.members).flatMap(m => Object.values(m.gear ?? {}) as Item[]).filter(i => !i.uid)];
}
// The finds that come home: all of them, or after a wipe only the `wipeKeep` best.
export function homeItems(run: ExpeditionState, outcome: RunOutcome, map: MapDefinition): Item[] {
  const finds = runFinds(run); if (outcome !== 'wiped') return finds;
  return finds.map((item, i) => ({ item, i })).sort((a, b) => b.item.rarity - a.item.rarity || b.item.level - a.item.level || a.i - b.i)
    .slice(0, map.equipment.wipeKeep).sort((a, b) => a.i - b.i).map(x => x.item);
}
// Lobby systems by chapter (A3): the map that opens a feature is the built map of the latest chapter at or before the
// one listed; a company that predates the unlocks (`veteran`) has everything open.
export function featureMap(maps: readonly MapDefinition[], feature: LobbyFeature): MapDefinition | undefined {
  const need = maps[0]?.unlocks[feature] ?? 0;
  return [...maps].filter(m => m.chapter <= need).sort((a, b) => b.chapter - a.chapter)[0];
}
export function featureOpen(profile: Profile, maps: readonly MapDefinition[], feature: LobbyFeature): boolean {
  const m = featureMap(maps, feature);
  return !!profile.veteran || !m || profile.cleared.includes(m.id);
}
// Chapters (2026-10-17): the first map is always open; each later map opens once the one before it is cleared.
export function mapUnlocked(profile: Profile, maps: readonly MapDefinition[], id: string): boolean {
  const i = maps.findIndex(m => m.id === id);
  return i === 0 || (i > 0 && profile.cleared.includes(maps[i - 1]!.id));
}
// Withdrawal is allowed at a camp or the map entrance, outside battle.
export { atMuster as canWithdraw } from './world';

// 3D side quests from the camp NPCs: progress is added when a run settles; the reward is claimed once, in the Lobby.
function sideQuestGain(kind: SideQuestKind, run: ExpeditionState, outcome: RunOutcome, map: MapDefinition): number {
  switch (kind) {
    case 'wins': return run.wins;
    case 'elites': return run.elitesDefeated.length + Object.values(run.respawns).reduce((a, b) => a + b, 0);
    case 'secrets': return run.secrets.length;
    case 'puzzles': return run.solved.length;
    case 'rareChests': return run.openedChests.filter(id => map.chests.find(c => c.id === id)?.tier === 'rare').length;
    case 'herbs': return outcome === 'wiped' ? 0 : run.herbs.length;
  }
}
export function claimReason(profile: Profile, map: MapDefinition, questId: string): string {
  const q = map.sideQuests.find(s => s.id === questId); if (!q) return 'quest';
  const now = profile.quests[q.id];
  if (now?.claimed) return 'claimed';
  return (now?.progress ?? 0) >= q.target ? '' : 'progress';
}
export function claimQuest(initial: Profile, map: MapDefinition, questId: string): ProfileResult {
  const reason = claimReason(initial, map, questId); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const q = map.sideQuests.find(s => s.id === questId)!; const r = q.reward;
  profile.bank.ore += r.ore ?? 0; profile.bank.gold += r.gold ?? 0; profile.bank.seal += r.seal ?? 0; profile.bank.dust += r.dust ?? 0;
  for (const id of POTION_IDS) profile.potions[id] += r.potions?.[id] ?? 0;
  profile.quests[q.id] = { progress: q.target, claimed: true };
  return { profile, event: { type: 'claimed', questId: q.id } };
}

// ---- Guided tasks (A4) ----
const ownedItems = (p: Profile): Item[] => [...p.items, ...Object.values(p.members).flatMap(m => Object.values(m.gear ?? {}) as Item[])];
export function guideDone(p: Profile, kind: GuideKind): boolean {
  switch (kind) {
    case 'wear': return Object.values(p.members).some(m => Object.keys(m.gear ?? {}).length > 0);
    case 'enhance': return ownedItems(p).some(i => (i.plus ?? 0) > 0);
    case 'talent': return Object.values(p.members).some(m => Object.values(m.talents ?? {}).some(r => (r ?? 0) > 0));
    case 'brew': return POTION_IDS.some(id => p.potions[id] > 0);
    case 'itemLevel': return ownedItems(p).some(i => !!i.levelInvestment);
    case 'hire': return p.company.length > 4;
    case 'reserve': return p.party.reserve.length > 0;
  }
}
// The guided tasks to show now: their system is open, they are not claimed or skipped, and the company is not a veteran.
export function activeGuides(p: Profile, maps: readonly MapDefinition[]): GuideDefinition[] {
  if (p.veteran) return [];
  return (maps[0]?.guides ?? []).filter(g => !p.guides?.[g.id] && featureOpen(p, maps, g.feature));
}
export function claimGuide(initial: Profile, maps: readonly MapDefinition[], id: string, skip = false): ProfileResult {
  const g = activeGuides(initial, maps).find(x => x.id === id); if (!g) return blocked(initial, 'unknown');
  if (!skip && !guideDone(initial, g.kind)) return blocked(initial, 'notDone');
  const profile = structuredClone(initial); (profile.guides ??= {})[id] = skip ? 'skipped' : 'claimed';
  if (!skip) { const r = g.reward; profile.bank.ore += r.ore ?? 0; profile.bank.gold += r.gold ?? 0; profile.bank.seal += r.seal ?? 0; profile.bank.dust += r.dust ?? 0;
    for (const p of POTION_IDS) profile.potions[p] += r.potions?.[p] ?? 0; }
  return { profile, event: { type: 'guide', id, skipped: skip } };
}

// ---- Camp market and board refresh (4A): paid in gold coins, limited per return home. ----
export function refreshReason(profile: Profile, map: MapDefinition): string {
  const cost = map.shop.refreshCosts[profile.refreshes];
  if (cost === undefined) return 'limit';
  return profile.bank.gold < cost ? 'gold' : '';
}
export function refreshBoard(initial: Profile, map: MapDefinition): ProfileResult {
  const reason = refreshReason(initial, map); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial);
  profile.bank.gold -= map.shop.refreshCosts[profile.refreshes]!; profile.refreshes++; profile.taken = [];
  return { profile, event: { type: 'refreshed' } };
}
export const shopLeft = (profile: Profile, map: MapDefinition, item: ShopItemId): number => map.shop.items[item].limit - (profile.shop[item] ?? 0);
export function buyReason(profile: Profile, map: MapDefinition, item: ShopItemId, heroId?: string): string {
  const def = map.shop.items[item]; if (!def) return 'unknown';
  if (shopLeft(profile, map, item) <= 0) return 'limit';
  if (item === 'contract') {
    const m = heroId ? profile.members[heroId] : undefined;
    if (!m) return 'hero';
    if (m.stars >= map.company.maxStars) return 'maxed';
  }
  if (item === 'gearbox' && profile.items.length >= storageCap(profile,map)) return 'bag';
  return profile.bank.gold < def.price ? 'gold' : '';
}
// The gear box rolls from the profile's lobby roll counter (shared with the forge), so a reload cannot re-roll it.
export function buy(initial: Profile, map: MapDefinition, item: ShopItemId, heroId?: string): ProfileResult {
  const reason = buyReason(initial, map, item, heroId); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial);
  profile.bank.gold -= map.shop.items[item].price; profile.shop[item] = (profile.shop[item] ?? 0) + 1;
  if (item === 'seal') profile.bank.seal++;
  if (item === 'repel') profile.potions.repel++;
  if (item === 'contract') { profile.members[heroId!]!.dupes++; return { profile, event: { type: 'bought', item, heroId: heroId! } }; }
  if (item === 'gearbox') {
    const level = Math.max(...profile.company.map(id => levelOf(profile.members[id])));
    const piece = rollItem(map.equipment, () => rollPercent(profile.seed ^ 0x4f1bbcdc, profile.forge++), level, map.shop.gearboxWeights, profile.company, SET_IDS);
    const uid = profile.nextItem++; profile.items.push({ ...piece, uid });
    return { profile, event: { type: 'bought', item, uid } };
  }
  return { profile, event: { type: 'bought', item } };
}
