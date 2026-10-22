import type { ActionId } from '../battle/types';
import type { BattleKind, ChestTier, ExpeditionState, MapDefinition, MemberProgress, Profile, ProfileResult, TomeBag, TomeLine, TomeSize } from './types';
import { TOME_LINES, TOME_SIZES } from './types';
import { featureOpen } from './profile';
import { heroDef, skillChoices, type EncounterLookup } from './world';

// Skill levels with tomes (A6 part 2, docs/design/SKILL_TOMES_TH.md). The tree decides which skills a member has;
// tomes decide how strong each one is (Lv1–5 per member). Levels are raised at the camp only, never in battle.
export const emptyTomes = (): TomeBag => ({ bulwark: { small: 0, medium: 0, large: 0 }, blade: { small: 0, medium: 0, large: 0 }, accord: { small: 0, medium: 0, large: 0 } });
export const tomeCount = (bag: TomeBag | undefined): number => TOME_LINES.reduce((n, l) => n + TOME_SIZES.reduce((m, s) => m + (bag?.[l][s] ?? 0), 0), 0);
export function addTomes(into: TomeBag, add: TomeBag | undefined, percent = 100): void {
  for (const l of TOME_LINES) for (const s of TOME_SIZES) into[l][s] += Math.floor((add?.[l][s] ?? 0) * percent / 100);
}
const bagOf = (line: TomeLine, size: TomeSize, n: number): TomeBag => { const b = emptyTomes(); b[line][size] = n; return b; };
export const tomeLine = (map: MapDefinition, heroId: string): TomeLine => map.progression.skillLevels.lines[heroId] ?? 'blade';
export const skillLevelOf = (m: MemberProgress | undefined, action: ActionId): number => m?.skillLevels?.[action] ?? 1;
// The skills a member can level: Attack has no level; the rest are the member's unlocked active skills.
export function levelableSkills(lookup: EncounterLookup, map: MapDefinition, id: string, m: MemberProgress | undefined): ActionId[] {
  const base = heroDef(lookup, map, id); if (!base || !m) return [];
  const own = skillChoices(base, map, m.talents, m.grants);
  // A small-tree class (release B) keeps its ★3 skill from stars.
  return base.unlocks && m.stars >= 3 && !own.includes(base.unlocks.skill) && !map.talents[id]?.some(n => n.tier !== undefined) ? [...own, base.unlocks.skill] : own;
}
// Every skill of the class (unlocked or not) may hold a level in a save: a forgotten node keeps its skill's level.
export function classSkills(lookup: EncounterLookup, map: MapDefinition, id: string): ActionId[] {
  const base = heroDef(lookup, map, id); if (!base) return [];
  const tree = (map.talents[id] ?? []).flatMap(n => 'unlock' in n.effect ? [n.effect.unlock] : []);
  return [...new Set([...base.actions.filter(a => a !== 'attack'), ...tree, ...base.unlocks ? [base.unlocks.skill] : []])];
}
export const skillLevelCost = (map: MapDefinition, level: number) => map.progression.skillLevels.costs[level - 1];
export function skillLevelReason(profile: Profile, maps: readonly MapDefinition[], map: MapDefinition, lookup: EncounterLookup, id: string, action: ActionId): string {
  if (!featureOpen(profile, maps, 'tomes')) return 'locked';
  const m = profile.members[id]; if (!m || !profile.company.includes(id)) return 'unknown';
  if (!levelableSkills(lookup, map, id, m).includes(action)) return 'skill';
  const level = skillLevelOf(m, action); if (level >= map.progression.skillLevels.max) return 'max';
  const cost = skillLevelCost(map, level)!; const line = tomeLine(map, id);
  if ((profile.tomes?.[line][cost.size] ?? 0) < cost.tomes) return 'tomes';
  if ((profile.riftCore ?? 0) < (cost.core ?? 0)) return 'core';
  return profile.bank.gold < cost.gold ? 'gold' : '';
}
// One level at a time, paid in the class's tome line, gold and (for Lv5) a rift core; all or nothing.
export function raiseSkill(initial: Profile, maps: readonly MapDefinition[], map: MapDefinition, lookup: EncounterLookup, id: string, action: ActionId): ProfileResult {
  const reason = skillLevelReason(initial, maps, map, lookup, id, action); if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const m = profile.members[id]!; const level = skillLevelOf(m, action); const cost = skillLevelCost(map, level)!;
  profile.tomes![tomeLine(map, id)][cost.size] -= cost.tomes; profile.bank.gold -= cost.gold;
  if (cost.core) profile.riftCore = (profile.riftCore ?? 0) - cost.core;
  m.skillLevels = { ...m.skillLevels, [action]: level + 1 };
  return { profile, event: { type: 'skillLevel', heroId: id, action, level: level + 1 } };
}
// Trades at the trainer: `up` turns `tradeUp` tomes into one of the next size (same line); `swap` turns `swap` tomes
// into one of the same size in another line.
export function tradeReason(profile: Profile, maps: readonly MapDefinition[], map: MapDefinition, line: TomeLine, size: TomeSize, to?: TomeLine): string {
  if (!featureOpen(profile, maps, 'tomes')) return 'locked';
  const r = map.progression.skillLevels; const have = profile.tomes?.[line][size] ?? 0;
  if (to === undefined) return size === 'large' ? 'size' : have < r.tradeUp ? 'tomes' : '';
  return to === line || !TOME_LINES.includes(to) ? 'line' : have < r.swap ? 'tomes' : '';
}
export function tradeTomes(initial: Profile, maps: readonly MapDefinition[], map: MapDefinition, line: TomeLine, size: TomeSize, to?: TomeLine): ProfileResult {
  const reason = tradeReason(initial, maps, map, line, size, to); if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const r = map.progression.skillLevels; const bag = profile.tomes!;
  if (to === undefined) { const next = TOME_SIZES[TOME_SIZES.indexOf(size) + 1]!; bag[line][size] -= r.tradeUp; bag[line][next]++; return { profile, event: { type: 'tomeTrade', line, size: next } }; }
  bag[line][size] -= r.swap; bag[to][size]++;
  return { profile, event: { type: 'tomeTrade', line: to, size } };
}
// Dismissing refunds `refundPercent` of the tomes spent on the member (rounded down per size); gold and cores are lost.
export function dismissTomes(map: MapDefinition, id: string, m: MemberProgress | undefined): TomeBag {
  const spent = emptyTomes(); const line = tomeLine(map, id);
  for (const level of Object.values(m?.skillLevels ?? {})) for (let l = 1; l < (level ?? 1); l++) { const c = skillLevelCost(map, l)!; spent[line][c.size] += c.tomes; }
  const out = emptyTomes(); addTomes(out, spent, map.progression.skillLevels.refundPercent); return out;
}
// ---- Rewards on a map that drops tomes (`MapDefinition.tomes`) ----
function give(state: ExpeditionState, bag: TomeBag, core = 0): void {
  addTomes(state.tomes ??= emptyTomes(), bag); if (core) state.riftCore = (state.riftCore ?? 0) + core;
}
// The line a reward goes to when it has no class: in turn bulwark → blade → accord (`n` counts the run's rewards).
const turnLine = (n: number): TomeLine => TOME_LINES[n % TOME_LINES.length]!;
// The line most of the deployed party uses (ties in bulwark → blade → accord order).
export function partyLine(map: MapDefinition, ids: readonly string[]): TomeLine {
  const count = (l: TomeLine) => ids.filter(id => tomeLine(map, id) === l).length;
  return TOME_LINES.reduce((best, l) => count(l) > count(best) ? l : best, TOME_LINES[0]);
}
// A victory: every `battleEvery` ordinary wins pays a small tome, an elite two, the boss its map's reward (hard mode
// ×`hardPercent` and rift cores). Deterministic: no rolls.
export function battleTomes(state: ExpeditionState, map: MapDefinition, kind: BattleKind, party: readonly string[]): { tomes?: TomeBag; riftCore?: number } {
  const r = map.progression.skillLevels; if (!map.tomes || kind === 'tutorial') return {};
  if (kind === 'boss') {
    const line = partyLine(map, party); const pct = state.hard ? r.hardPercent : 100;
    const bag = emptyTomes(); bag[line].medium = Math.floor(map.tomes.boss.medium * pct / 100); bag[line].small = Math.floor(map.tomes.boss.small * pct / 100);
    const core = state.hard ? r.hardCore : 0; give(state, bag, core); return { tomes: bag, ...(core ? { riftCore: core } : {}) };
  }
  if (kind === 'elite') { const bag = bagOf(turnLine(state.tomeWins ?? 0), 'small', r.elite); give(state, bag); return { tomes: bag }; }
  state.tomeWins = (state.tomeWins ?? 0) + 1;
  if (state.tomeWins % r.battleEvery) return {};
  const bag = bagOf(turnLine(state.tomeWins / r.battleEvery - 1), 'small', 1); give(state, bag); return { tomes: bag };
}
export function chestTomes(state: ExpeditionState, map: MapDefinition, tier: ChestTier): TomeBag | undefined {
  if (!map.tomes || !map.progression.skillLevels.chest[tier]) return undefined;
  const bag = bagOf(turnLine(state.openedChests.length - 1), 'small', map.progression.skillLevels.chest[tier]); give(state, bag); return bag;
}
// The first clear of a tome map adds its first-clear tomes (in the party's line) when the run settles.
export function firstClearTomes(map: MapDefinition, party: readonly string[]): { tomes: TomeBag; core: number } | undefined {
  if (!map.tomes) return undefined;
  return { tomes: bagOf(partyLine(map, party), 'large', map.tomes.first.large), core: map.tomes.first.core };
}
