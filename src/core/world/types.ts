import type { Command } from '../battle/types';

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
}
// Up to 4 deployed (slot order = enemy target slots) and 4 in reserve, swapped at camps.
export const PARTY_SLOTS = 4;
export const RESERVE_SLOTS = 4;
export interface Roster { deployed: string[]; reserve: string[] }

export type BattleKind = 'tutorial' | 'random' | 'boss';
export interface ActiveBattle { kind: BattleKind; encounterId: string; entry: Record<string, number>; commands: Command[] }
export interface ExpeditionState {
  mapId: string; mapVersion: number; seed: number; rolls: number;
  position: Point; steps: number; pressure: number;
  // `hp` covers every roster member; the battle entry covers the deployed ones.
  revealed: string; roster: Roster; hp: Record<string, number>; camp: Point | null;
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
  | { type: 'victory'; kind: BattleKind; encounterId: string; loot: Resources }
  | { type: 'defeat'; kind: BattleKind; encounterId: string; rescued?: string };
export interface WorldResult { state: ExpeditionState; event: WorldEvent }
