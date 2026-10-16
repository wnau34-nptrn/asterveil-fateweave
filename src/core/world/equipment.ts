import type { GearSpecial, HeroGear } from '../battle/types';
import type { EquipmentRules, Gear, GearSlot, GearStat, Item, MapDefinition, StatCurve } from './types';
import { GEAR_SLOTS } from './types';

// Pure equipment rules (2D-2): item stats, a member's gear totals and item rolls. No DOM or Math.random:
// rolls come from the caller's deterministic stream.
export const GEAR_SPECIALS: readonly GearSpecial[] = ['laststand', 'markhunter', 'renewal'];
export const GEAR_STATS: readonly GearStat[] = ['hp', 'attack', 'skill', 'heal', 'barrier', 'speed'];
export const RARITIES = 5;
const curve = ([base, per]: StatCurve, level: number) => Math.max(1, Math.round(base + per * (level - 1)));
// Only boots and charms may roll SPD.
export const affixPool = (slot: GearSlot): GearStat[] => GEAR_STATS.filter(s => s !== 'speed' || slot === 'boots' || slot === 'charm');
// Every stat an item gives: its slot's base stats plus one value per affix.
export function itemStats(rules: EquipmentRules, item: Item): Partial<Record<GearStat, number>> {
  const out: Partial<Record<GearStat, number>> = {};
  for (const [stat, c] of Object.entries(rules.slotStats[item.slot]) as [GearStat, StatCurve][]) out[stat] = (out[stat] ?? 0) + curve(c, item.level);
  for (const stat of item.affixes) out[stat] = (out[stat] ?? 0) + curve(rules.affixStats[stat], item.level);
  return out;
}
export interface GearTotals { hp: number; attack: number; skill: number; speed: number; gear?: HeroGear }
export function gearTotals(map: MapDefinition, gear: Gear | undefined): GearTotals {
  const sum: Record<GearStat, number> = { hp: 0, attack: 0, skill: 0, heal: 0, barrier: 0, speed: 0 }; const specials: GearSpecial[] = [];
  for (const item of Object.values(gear ?? {})) {
    if (!item) continue;
    for (const [stat, v] of Object.entries(itemStats(map.equipment, item)) as [GearStat, number][]) sum[stat] += v;
    if (item.special && !specials.includes(item.special)) specials.push(item.special);
  }
  const extra: HeroGear = { ...(sum.heal ? { healBonus: sum.heal } : {}), ...(sum.barrier ? { barrier: sum.barrier } : {}), ...(specials.length ? { specials } : {}) };
  return { hp: sum.hp, attack: sum.attack, skill: sum.skill, speed: sum.speed, ...(Object.keys(extra).length ? { gear: extra } : {}) };
}
// Rolls one item from `roll()` (0–99 per call): slot, the weapon's class from `heroes`, rarity by weight, distinct affixes, a legendary special.
export function rollItem(rules: EquipmentRules, roll: () => number, level: number, weights: readonly number[], heroes: readonly string[]): Item {
  const pick = <T>(list: readonly T[]) => list[(roll() * 7919 + roll()) % list.length]!;
  const slot = pick(GEAR_SLOTS);
  const total = weights.reduce((a, b) => a + b, 0); let r = (roll() * 100 + roll()) % total; let rarity = 0;
  while (r >= weights[rarity]!) { r -= weights[rarity]!; rarity++; }
  const pool = affixPool(slot); const affixes: GearStat[] = [];
  for (let i = 0; i < rules.affixCount[rarity]! && pool.length; i++) affixes.push(pool.splice((roll() * 7919 + roll()) % pool.length, 1)[0]!);
  return { uid: 0, slot, rarity, level, ...(slot === 'weapon' ? { hero: pick(heroes) } : {}), affixes, ...(rarity === RARITIES - 1 ? { special: pick(GEAR_SPECIALS) } : {}) };
}
// Structural check used by the save and by profile actions.
export function itemValid(map: MapDefinition, item: Item, heroIds: readonly string[], found = false): boolean {
  const rules = map.equipment;
  if (!item || typeof item !== 'object' || !GEAR_SLOTS.includes(item.slot) || !Number.isInteger(item.rarity) || item.rarity < 0 || item.rarity >= RARITIES) return false;
  if (!Number.isInteger(item.level) || item.level < 1 || item.level > 99 || !Number.isInteger(item.uid) || (found ? item.uid !== 0 : item.uid < 1)) return false;
  if ((item.slot === 'weapon') !== (typeof item.hero === 'string') || (item.hero !== undefined && !heroIds.includes(item.hero))) return false;
  const pool = affixPool(item.slot);
  if (!Array.isArray(item.affixes) || item.affixes.length !== rules.affixCount[item.rarity] || new Set(item.affixes).size !== item.affixes.length || item.affixes.some(a => !pool.includes(a))) return false;
  if ((item.rarity === RARITIES - 1) !== (item.special !== undefined) || (item.special !== undefined && !GEAR_SPECIALS.includes(item.special))) return false;
  const keys = Object.keys(item).filter(k => !['uid', 'slot', 'rarity', 'level', 'hero', 'affixes', 'special'].includes(k));
  return !keys.length;
}
export const salvageValue = (map: MapDefinition, item: Item) => map.equipment.salvage[item.rarity]!;
