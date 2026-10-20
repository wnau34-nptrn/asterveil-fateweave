import type { GearSpecial, HeroGear } from '../battle/types';
import type { EquipmentRules, Gear, GearSlot, GearStat, Item, MapDefinition, SetId, StatCurve } from './types';
import { GEAR_SLOTS, SET_IDS } from './types';

// Pure equipment rules (2D-2, stats design 2026-10-17): item stats, a member's gear totals and item rolls.
// No DOM or Math.random: rolls come from the caller's deterministic stream.
export const GEAR_SPECIALS: readonly GearSpecial[] = ['laststand', 'markhunter', 'renewal'];
export const GEAR_STATS: readonly GearStat[] = ['hp', 'attack', 'support', 'speed', 'armour', 'resist', 'leech', 'barrier', 'regen', 'luck'];
export const RARITIES = 5;
const curve = ([base, per]: StatCurve, level: number) => base + per * (level - 1);
// A support class's weapon has its own main stat and affix pool.
const slotKey = (rules: EquipmentRules, slot: GearSlot, hero?: string): GearSlot | 'supportWeapon' =>
  slot === 'weapon' && hero && rules.supportHeroes.includes(hero) ? 'supportWeapon' : slot;
// The affixes an item of this slot (and, for a weapon, class) can roll.
export const affixPool = (rules: EquipmentRules, slot: GearSlot, hero?: string): GearStat[] => [...rules.affixPools[slotKey(rules, slot, hero)]];
export const mainStats = (rules: EquipmentRules, item: Pick<Item, 'slot' | 'hero'>): Partial<Record<GearStat, StatCurve>> => rules.slotStats[slotKey(rules, item.slot, item.hero)];
// One stat value: its level curve, the forge (main stats only) and its roll quality; at least 1.
const statValue = (rules: EquipmentRules, c: StatCurve, item: Item, quality: number, forged: boolean) =>
  Math.max(1, Math.round(curve(c, item.level) * (forged ? 1 + (item.plus ?? 0) * rules.forge.plusPercent / 100 : 1) * quality / 100));
// Every stat an item gives: its main stats plus one value per affix.
export function itemStats(rules: EquipmentRules, item: Item): Partial<Record<GearStat, number>> {
  const out: Partial<Record<GearStat, number>> = {};
  for (const [stat, c] of Object.entries(mainStats(rules, item)) as [GearStat, StatCurve][]) out[stat] = (out[stat] ?? 0) + statValue(rules, c, item, item.q?.main ?? 100, true);
  item.affixes.forEach((stat, i) => { out[stat] = (out[stat] ?? 0) + statValue(rules, rules.affixStats[stat], item, item.q?.affixes[i] ?? 100, false); });
  return out;
}
// One line of an item's stats with the best value that roll could have had (for the UI's "max" hint).
export interface StatLine { stat: GearStat; value: number; max: number; affix: boolean }
export function statLines(rules: EquipmentRules, item: Item): StatLine[] {
  const best = rules.quality[1];
  return [
    ...(Object.entries(mainStats(rules, item)) as [GearStat, StatCurve][]).map(([stat, c]) => ({ stat, value: statValue(rules, c, item, item.q?.main ?? 100, true), max: statValue(rules, c, item, best, true), affix: false })),
    ...item.affixes.map((stat, i) => ({ stat, value: statValue(rules, rules.affixStats[stat], item, item.q?.affixes[i] ?? 100, false), max: statValue(rules, rules.affixStats[stat], item, best, false), affix: true })),
  ];
}
export const rollQuality = (rules: EquipmentRules, roll: () => number): number => rules.quality[0] + roll() % (rules.quality[1] - rules.quality[0] + 1);
// Gear totals: hp/speed/barrier/regen/luck flat; hp also as a percent (sets); attack and support percents
// (items and sets); armour/resist/leech percents (capped in battle).
export interface GearTotals {
  hp: number; hpPercent: number; attackPercent: number; support: number; speed: number;
  armour: number; resist: number; leech: number; regen: number; luck: number; gear?: HeroGear;
}
// Pieces worn per set (2D-3).
export function setCounts(gear: Gear | undefined): Partial<Record<SetId, number>> {
  const counts: Partial<Record<SetId, number>> = {};
  for (const item of Object.values(gear ?? {})) if (item?.set) counts[item.set] = (counts[item.set] ?? 0) + 1;
  return counts;
}
export function gearTotals(map: MapDefinition, gear: Gear | undefined): GearTotals {
  const sum = Object.fromEntries(GEAR_STATS.map(s => [s, 0])) as Record<GearStat, number>; const specials: GearSpecial[] = [];
  for (const item of Object.values(gear ?? {})) {
    if (!item) continue;
    for (const [stat, v] of Object.entries(itemStats(map.equipment, item)) as [GearStat, number][]) sum[stat] += v;
    if (item.special && !specials.includes(item.special)) specials.push(item.special);
  }
  let hpPercent = 0; const extra: HeroGear = {};
  for (const [id, n] of Object.entries(setCounts(gear)) as [SetId, number][]) {
    const set = map.equipment.sets[id];
    if (n >= 2) for (const { stat, value } of set.two) { if (stat === 'hp') hpPercent += value; else sum[stat] += value; }
    if (n >= 4) {
      const { kind, amount } = set.four;
      if (kind === 'barrier') sum.barrier += amount;
      else if (kind === 'firstStrike') extra.firstStrike = true;
      else if (kind === 'freshHit') extra.freshHit = amount;
      else if (kind === 'thorns') extra.thorns = amount;
      else if (kind === 'freeCast') extra.freeCast = true;
      else extra.overflowCap = amount;
    }
  }
  Object.assign(extra, sum.barrier ? { barrier: sum.barrier } : {}, specials.length ? { specials } : {});
  return { hp: sum.hp, hpPercent, attackPercent: sum.attack, support: sum.support, speed: sum.speed, armour: sum.armour, resist: sum.resist, leech: sum.leech,
    regen: sum.regen, luck: sum.luck, ...(Object.keys(extra).length ? { gear: extra } : {}) };
}
// Rolls one item from `roll()` (0–99 per call): slot, the weapon's class from `heroes`, rarity by weight, distinct affixes,
// a legendary special, a set from `sets` at the rules' set chance (2D-3), and last the roll qualities.
export function rollItem(rules: EquipmentRules, roll: () => number, level: number, weights: readonly number[], heroes: readonly string[], sets: readonly SetId[] = [], target?:{hero:string;bias:number;force:boolean}): Item {
  const pick = <T>(list: readonly T[]) => list[(roll() * 7919 + roll()) % list.length]!;
  const rolledSlot=pick(GEAR_SLOTS),slot=target?.force?'weapon':rolledSlot;
  const total = weights.reduce((a, b) => a + b, 0); let r = (roll() * 100 + roll()) % total; let rarity = 0;
  while (r >= weights[rarity]!) { r -= weights[rarity]!; rarity++; }
  let hero = slot === 'weapon' ? pick(heroes) : undefined;
  if(hero&&target&&(target.force||roll()<target.bias))hero=target.hero;
  const pool = affixPool(rules, slot, hero); const affixes: GearStat[] = [];
  for (let i = 0; i < rules.affixCount[rarity]! && pool.length; i++) affixes.push(pool.splice((roll() * 7919 + roll()) % pool.length, 1)[0]!);
  const special = rarity === RARITIES - 1 ? pick(GEAR_SPECIALS) : undefined;
  const set = sets.length && roll() < rules.setPercent ? pick(sets) : undefined;
  const q = { main: rollQuality(rules, roll), affixes: affixes.map(() => rollQuality(rules, roll)) };
  return { uid: 0, slot, rarity, level, ...(hero ? { hero } : {}), affixes, ...(special ? { special } : {}), ...(set ? { set } : {}), q };
}
// Structural check used by the save and by profile actions.
export function itemValid(map: MapDefinition, item: Item, heroIds: readonly string[], found = false): boolean {
  const rules = map.equipment;
  if (!item || typeof item !== 'object' || !GEAR_SLOTS.includes(item.slot) || !Number.isInteger(item.rarity) || item.rarity < 0 || item.rarity >= RARITIES) return false;
  if (!Number.isInteger(item.level) || item.level < 1 || item.level > 99 || !Number.isInteger(item.uid) || (found ? item.uid !== 0 : item.uid < 1)) return false;
  if ((item.slot === 'weapon') !== (typeof item.hero === 'string') || (item.hero !== undefined && !heroIds.includes(item.hero))) return false;
  const pool = affixPool(rules, item.slot, item.hero);
  if (!Array.isArray(item.affixes) || item.affixes.length !== rules.affixCount[item.rarity] || new Set(item.affixes).size !== item.affixes.length || item.affixes.some(a => !pool.includes(a))) return false;
  const inRange = (n: unknown) => Number.isInteger(n) && (n as number) >= rules.quality[0] && (n as number) <= rules.quality[1];
  if (item.q !== undefined && (typeof item.q !== 'object' || Object.keys(item.q).length !== 2 || !inRange(item.q.main) || !Array.isArray(item.q.affixes)
    || item.q.affixes.length !== item.affixes.length || !item.q.affixes.every(inRange))) return false;
  if ((item.rarity === RARITIES - 1) !== (item.special !== undefined) || (item.special !== undefined && !GEAR_SPECIALS.includes(item.special))) return false;
  if (item.set !== undefined && !SET_IDS.includes(item.set)) return false;
  if (item.plus !== undefined && (!Number.isInteger(item.plus) || item.plus < 1 || item.plus > rules.forge.plusCap[item.rarity]!)) return false;
  if (item.locked !== undefined && item.locked !== true) return false;
  if (item.investment !== undefined && (!item.investment || typeof item.investment !== 'object' || Object.keys(item.investment).length !== 2 || !['ore','dust'].every(k => Number.isSafeInteger(item.investment![k as 'ore'|'dust']) && item.investment![k as 'ore'|'dust'] >= 0))) return false;
  if (item.levelInvestment !== undefined && (!item.levelInvestment || typeof item.levelInvestment !== 'object' || Object.keys(item.levelInvestment).length !== 2 || !['ore','dust'].every(k => Number.isSafeInteger(item.levelInvestment![k as 'ore'|'dust']) && item.levelInvestment![k as 'ore'|'dust'] >= 0))) return false;
  if(item.transferSlot!==undefined&&(found||!item.q||!Number.isInteger(item.transferSlot)||item.transferSlot<0||item.transferSlot>=item.affixes.length))return false;
  const keys = Object.keys(item).filter(k => !['transferSlot', 'uid', 'slot', 'rarity', 'level', 'hero', 'affixes', 'special', 'set', 'plus', 'q', 'locked', 'investment', 'levelInvestment'].includes(k));
  return !keys.length;
}
// Missing ledger = legacy credit for the remaining + level, never inferred lost past upgrades.
export function enhancementInvestment(map: MapDefinition, item: Item): { ore: number; dust: number } {
  if(item.investment)return {...item.investment};
  let ore=0,dust=0;const f=map.equipment.forge;
  for(let n=1;n<=(item.plus??0);n++){ore+=f.ore+f.orePerPlus*n;dust+=Math.ceil(n*f.dustPerPlus);}
  return {ore,dust};
}
export function salvageValue(map: MapDefinition, item: Item): { ore: number; dust: number } {
  const v=map.equipment.salvage[item.rarity]!,paid=enhancementInvestment(map,item);
  return {ore:v.ore+paid.ore+(item.levelInvestment?.ore??0),dust:v.dust+paid.dust+(item.levelInvestment?.dust??0)};
}
