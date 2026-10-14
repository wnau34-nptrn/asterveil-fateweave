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
}
export interface MapDefinition {
  id: string; version: number; name: string;
  rows: readonly string[];
  // Floor characters map to zones; S/C/B/G take the zone of `specialZone` entries.
  floorZones: Readonly<Record<string, string>>;
  specialZones: Readonly<Record<'S' | 'C' | 'B' | 'G', string>>;
  zones: readonly ZoneDefinition[];
  tutorialEncounterId: string; bossEncounterId: string;
  revealRadius: number;
}

export type BattleKind = 'tutorial' | 'random' | 'boss';
export interface ActiveBattle { kind: BattleKind; encounterId: string; entry: Record<string, number>; commands: Command[] }
export interface ExpeditionState {
  mapId: string; mapVersion: number; seed: number; rolls: number;
  position: Point; steps: number; pressure: number;
  revealed: string; hp: Record<string, number>; camp: Point | null;
  tutorialDone: boolean; bossDefeated: boolean; completed: boolean;
  wins: number; defeats: number; battle: ActiveBattle | null;
}
export type WorldEvent =
  | { type: 'moved'; chance: number }
  | { type: 'blocked'; reason: 'wall' | 'edge' | 'busy' }
  | { type: 'encounter'; kind: BattleKind; encounterId: string; chance: number }
  | { type: 'goal' }
  | { type: 'rested' }
  | { type: 'victory'; kind: BattleKind; encounterId: string }
  | { type: 'defeat'; kind: BattleKind; encounterId: string };
export interface WorldResult { state: ExpeditionState; event: WorldEvent }
