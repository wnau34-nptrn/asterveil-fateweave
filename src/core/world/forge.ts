import type { Item, MapDefinition, Profile, ProfileResult } from './types';
import { affixPool, GEAR_SPECIALS, RARITIES } from './equipment';
import { rollPercent } from './world';

// Forge (2D-4): enhance, fuse and reroll in the lobby. Pure rules on the profile. Fuse and reroll draw from
// (seed, forge), so a reload cannot change a result once it is saved. Items may sit in the bag or be worn.
const blocked = (profile: Profile, reason: string): ProfileResult => ({ profile, event: { type: 'blocked', reason } });
// Finds a bag or worn item by uid (in the given profile, so a clone can be edited in place).
export function findItem(profile: Profile, uid: number): { item: Item; owner?: string } | undefined {
  const bag = profile.items.find(i => i.uid === uid); if (bag) return { item: bag };
  for (const [owner, m] of Object.entries(profile.members)) for (const item of Object.values(m.gear ?? {})) if (item?.uid === uid) return { item, owner };
  return undefined;
}
// ---- Enhance: always succeeds ----
export function enhanceCost(map: MapDefinition, item: Item): { ore: number; dust: number } | undefined {
  const f = map.equipment.forge; const next = (item.plus ?? 0) + 1;
  return next > f.plusCap[item.rarity]! ? undefined : { ore: f.ore + f.orePerPlus * next, dust: Math.ceil(next * f.dustPerPlus) };
}
export function enhanceReason(profile: Profile, map: MapDefinition, uid: number): string {
  const found = findItem(profile, uid); if (!found) return 'unknown';
  const cost = enhanceCost(map, found.item); if (!cost) return 'maxed';
  return profile.bank.ore < cost.ore ? 'ore' : profile.bank.dust < cost.dust ? 'dust' : '';
}
export function enhance(initial: Profile, map: MapDefinition, uid: number): ProfileResult {
  const reason = enhanceReason(initial, map, uid); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const { item } = findItem(profile, uid)!; const cost = enhanceCost(map, item)!;
  profile.bank.ore -= cost.ore; profile.bank.dust -= cost.dust; item.plus = (item.plus ?? 0) + 1;
  return { profile, event: { type: 'forged', uid, action: 'enhance' } };
}
// ---- Fuse: the main piece (bag or worn) plus bag pieces of the same slot and rarity → one rarity up ----
// The main piece keeps its class, level, set and affixes, gains affixes up to the new rarity's count (a legendary
// also gains a special) and keeps half its enhance level. The other pieces are used up.
export function fuseMaterials(profile: Profile, map: MapDefinition, uid: number): Item[] {
  const main = findItem(profile, uid)?.item; if (!main) return [];
  // The cheapest matching bag pieces go first: lowest enhance, then lowest level.
  return profile.items.filter(i => i.uid !== uid && i.slot === main.slot && i.rarity === main.rarity)
    .sort((a, b) => (a.plus ?? 0) - (b.plus ?? 0) || a.level - b.level || a.uid - b.uid).slice(0, map.equipment.forge.fuseCount - 1);
}
export function fuseReason(profile: Profile, map: MapDefinition, uid: number): string {
  const main = findItem(profile, uid)?.item; if (!main) return 'unknown';
  if (main.rarity >= RARITIES - 1) return 'maxed';
  return fuseMaterials(profile, map, uid).length < map.equipment.forge.fuseCount - 1 ? 'materials' : '';
}
export function fuse(initial: Profile, map: MapDefinition, uid: number): ProfileResult {
  const reason = fuseReason(initial, map, uid); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const used = fuseMaterials(profile, map, uid).map(i => i.uid);
  const { item } = findItem(profile, uid)!; const roll = () => rollPercent(profile.seed ^ 0x6f726765, profile.forge++);
  item.rarity++;
  const pool = affixPool(item.slot).filter(a => !item.affixes.includes(a));
  while (item.affixes.length < map.equipment.affixCount[item.rarity]! && pool.length) item.affixes.push(pool.splice((roll() * 7919 + roll()) % pool.length, 1)[0]!);
  if (item.rarity === RARITIES - 1) item.special = GEAR_SPECIALS[(roll() * 7919 + roll()) % GEAR_SPECIALS.length]!;
  const half = Math.floor((item.plus ?? 0) / 2); if (half) item.plus = half; else delete item.plus;
  profile.items = profile.items.filter(i => !used.includes(i.uid));
  return { profile, event: { type: 'forged', uid, action: 'fuse' } };
}
// ---- Reroll: one chosen affix becomes a different one the piece does not have yet ----
export function rerollReason(profile: Profile, map: MapDefinition, uid: number, index: number): string {
  const item = findItem(profile, uid)?.item; if (!item || !Number.isInteger(index) || !item.affixes[index]) return 'unknown';
  if (!affixPool(item.slot).some(a => !item.affixes.includes(a))) return 'maxed';
  return profile.bank.seal < map.equipment.forge.rerollSeals ? 'seal' : '';
}
export function reroll(initial: Profile, map: MapDefinition, uid: number, index: number): ProfileResult {
  const reason = rerollReason(initial, map, uid, index); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const { item } = findItem(profile, uid)!;
  const pool = affixPool(item.slot).filter(a => !item.affixes.includes(a));
  item.affixes[index] = pool[(rollPercent(profile.seed ^ 0x6f726765, profile.forge++) * 7919 + rollPercent(profile.seed ^ 0x6f726765, profile.forge++)) % pool.length]!;
  profile.bank.seal -= map.equipment.forge.rerollSeals;
  return { profile, event: { type: 'forged', uid, action: 'reroll' } };
}

// ---- Smelt: ore into veil dust at a poor rate, capped per return home (owner-approved 2026-10-16). ----
export const smeltLeft = (profile: Profile, map: MapDefinition): number => Math.max(0, map.equipment.forge.smeltCap - profile.smelted);
export function smeltReason(profile: Profile, map: MapDefinition, dust: number): string {
  if (!Number.isInteger(dust) || dust < 1) return 'unknown';
  if (dust > smeltLeft(profile, map)) return 'limit';
  return profile.bank.ore < dust * map.equipment.forge.smeltOre ? 'ore' : '';
}
export function smelt(initial: Profile, map: MapDefinition, dust: number): ProfileResult {
  const reason = smeltReason(initial, map, dust); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial);
  profile.bank.ore -= dust * map.equipment.forge.smeltOre; profile.bank.dust += dust; profile.smelted += dust;
  return { profile, event: { type: 'smelted', dust } };
}
