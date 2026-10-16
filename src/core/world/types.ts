import type { Command, HeroDefinition } from '../battle/types';

export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Point { x: number; y: number }
export type TileKind = 'wall' | 'floor' | 'start' | 'camp' | 'boss' | 'goal';
export interface Tile { kind: TileKind; zoneId: string }

// Encounter chance per step = min(cap, base + pressure). Pressure grows by `step`
// after every quiet step and resets after an encounter or a camp rest.
export interface ZoneDefinition {
  id: string; name: string; safe: boolean; base: number; step: number; cap: number;
  pool: readonly { encounterId: string; weight: number }[];
  loot?: LootTable;
  // Monster levels (2D-1): the zone's entrance side has the low end, its far (north) side the high end.
  levels?: readonly [number, number];
}
// Map-collected resources. Ore will pay for hiring, embers revive one fallen
// member at a camp, and seals will substitute a duplicate in star upgrades.
export type ResourceId = 'ore' | 'ember' | 'seal';
export type Resources = Record<ResourceId, number>;
// A roll gives `min..max` ore; ember/seal give `[guaranteed, percent chance of one more]`.
export interface LootTable { ore: readonly [number, number]; ember: readonly [number, number]; seal: readonly [number, number] }
export type ChestTier = 'common' | 'rare';
export interface ChestDefinition { id: string; x: number; y: number; tier: ChestTier }
export interface MapDefinition {
  id: string; version: number; name: string;
  rows: readonly string[];
  // Floor characters map to zones; S/C/B/G take the zone of `specialZone` entries.
  floorZones: Readonly<Record<string, string>>;
  specialZones: Readonly<Record<'S' | 'C' | 'B' | 'G', string>>;
  zones: readonly ZoneDefinition[];
  tutorialEncounterId: string; bossEncounterId: string;
  revealRadius: number;
  // Chests sit on floor tiles; loot tables are drafts until playtested.
  chests: readonly ChestDefinition[];
  loot: { tutorial: LootTable; boss: LootTable; chest: Readonly<Record<ChestTier, LootTable>> };
  camp: { restHealPercent: number; reviveHpPercent: number };
  // Hero ids that join free at ★1, deployed in this slot order.
  startingRoster: readonly string[];
  // Hireable mercenaries beyond the teaching party (the hero catalog is both together).
  mercenaries: readonly HeroDefinition[];
  company: CompanyRules;
  progression: ProgressionRules;
}
// Levels and EXP (2D-1, draft numbers). Each level adds `levelStatPercent` to max HP, Attack and skill
// power; monsters gain `monsterLevelPercent` HP/damage per level. EXP per enemy = expBase + expPerLevel × L.
export interface ProgressionRules {
  levelCap: number; levelStatPercent: number; monsterLevelPercent: number;
  expBase: number; expPerLevel: number; bossExpMultiplier: number;
  // EXP to go from level L to L+1 = nextBase + nextPerLevel × L.
  nextBase: number; nextPerLevel: number;
}
// Mercenary company rules (draft numbers). starCosts[i] upgrades ★(i+1) → ★(i+2).
export interface CompanyRules {
  hireCost: number; dismissRefund: number; offers: number; maxStars: number; starStatPercent: number;
  starCosts: readonly { dupes: number; ore: number }[];
}
// `level`/`exp` (2D-1) are optional for older data: missing means level 1 with no EXP.
export interface MemberProgress { stars: number; dupes: number; level?: number; exp?: number }
// The team brought into one expedition and their star progress (fixed during the run).
export interface Company { roster: Roster; members: Record<string, MemberProgress> }

// ---- Lobby profile (persistent between expeditions) ----
export const COMPANY_CAP = 20;
export type RunOutcome = 'complete' | 'withdrawn' | 'wiped';
export interface Bank { ore: number; seal: number }
// The player's commander (non-combat leader of the company), created once (L2).
export interface Commander { name: string; crest: string; color: string }
export interface Profile {
  seed: number; returns: number; tutorialDone: boolean;
  commander: Commander | null;
  // Every owned mercenary in display order, with stars and stored duplicates.
  company: string[]; members: Record<string, MemberProgress>;
  // The 4 + 4 chosen for the next expedition (subset of `company`).
  party: Roster;
  bank: Bank;
  // Hiring board taken indexes for the current `returns` count.
  taken: number[];
  expeditions: number; completes: number;
  last: { outcome: RunOutcome; ore: number; seal: number; steps: number; wins: number } | null;
}
export type ProfileEvent =
  | { type: 'blocked'; reason: string }
  | { type: 'party' }
  | { type: 'commander' }
  | { type: 'hired'; heroId: string; duplicate: boolean }
  | { type: 'upgraded'; heroId: string; stars: number }
  | { type: 'dismissed'; heroId: string };
export interface ProfileResult { profile: Profile; event: ProfileEvent }
// Up to 4 deployed (slot order = enemy target slots) and 4 in reserve, swapped at camps.
export const PARTY_SLOTS = 4;
export const RESERVE_SLOTS = 4;
export interface Roster { deployed: string[]; reserve: string[] }

export type BattleKind = 'tutorial' | 'random' | 'boss';
// `level`: the monster level fixed when the battle started (missing in older saves = the encounter's own level).
export interface ActiveBattle { kind: BattleKind; encounterId: string; entry: Record<string, number>; commands: Command[]; level?: number }
export interface ExpeditionState {
  mapId: string; mapVersion: number; seed: number; rolls: number;
  position: Point; steps: number; pressure: number;
  // `hp` covers every roster member; the battle entry covers the deployed ones.
  revealed: string; roster: Roster; members: Record<string, MemberProgress>;
  hp: Record<string, number>; camp: Point | null;
  // `restReady` is the campfire: one rest, then it needs a won battle to relight.
  resources: Resources; openedChests: string[]; restReady: boolean;
  tutorialDone: boolean; bossDefeated: boolean; completed: boolean;
  wins: number; defeats: number; battle: ActiveBattle | null;
}
export type WorldEvent =
  | { type: 'moved'; chance: number }
  | { type: 'blocked'; reason: 'wall' | 'edge' | 'busy' | 'party' }
  | { type: 'roster' }
  | { type: 'encounter'; kind: BattleKind; encounterId: string; chance: number }
  | { type: 'goal' }
  | { type: 'rested' }
  | { type: 'revived'; heroId: string }
  | { type: 'chest'; chestId: string; loot: Resources }
  | { type: 'victory'; kind: BattleKind; encounterId: string; loot: Resources; exp?: Record<string, ExpGain> }
  | { type: 'defeat'; kind: BattleKind; encounterId: string; wiped?: boolean };
// EXP from one victory for one brought member: `percent` is the level-gap multiplier.
export interface ExpGain { gained: number; percent: number; level: number; levelsUp: number }
export interface WorldResult { state: ExpeditionState; event: WorldEvent }
