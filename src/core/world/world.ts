import { replay } from '../battle/engine';
import type { BattleState, Command, EncounterDefinition } from '../battle/types';
import type { ActiveBattle, BattleKind, Direction, ExpeditionState, MapDefinition, Point, Tile, WorldResult, ZoneDefinition } from './types';

// Pure expedition rules: no DOM, Phaser, clocks or Math.random. Every roll is
// derived from (seed, rolls) so a reload can never re-roll an outcome.
export type EncounterLookup = (id: string) => EncounterDefinition | undefined;
const offsets: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

export function rollPercent(seed: number, index: number): number {
  let t = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) % 100;
}
export function tileAt(map: MapDefinition, p: Point): Tile | undefined {
  const ch = map.rows[p.y]?.[p.x];
  if (ch === undefined) return undefined;
  if (ch === '#') return { kind: 'wall', zoneId: '' };
  const special = ({ S: 'start', C: 'camp', B: 'boss', G: 'goal' } as const)[ch as 'S'];
  if (special) return { kind: special, zoneId: map.specialZones[ch as 'S'] };
  return { kind: 'floor', zoneId: map.floorZones[ch] ?? '' };
}
export const zoneOf = (map: MapDefinition, id: string): ZoneDefinition | undefined => map.zones.find(z => z.id === id);
export function findTiles(map: MapDefinition, kind: Tile['kind']): Point[] {
  const found: Point[] = [];
  map.rows.forEach((row, y) => [...row].forEach((_, x) => { if (tileAt(map, { x, y })?.kind === kind) found.push({ x, y }); }));
  return found;
}
export const startOf = (map: MapDefinition): Point => findTiles(map, 'start')[0]!;
export const isRevealed = (state: ExpeditionState, map: MapDefinition, p: Point): boolean => state.revealed[p.y * map.rows[0]!.length + p.x] === '1';
// Tiles that can trigger an encounter roll; start/camp/goal and safe zones never do.
function rollingZone(map: MapDefinition, p: Point): ZoneDefinition | undefined {
  const tile = tileAt(map, p); const zone = tile && zoneOf(map, tile.zoneId);
  return tile?.kind === 'floor' && zone && !zone.safe ? zone : undefined;
}
export function encounterChance(state: ExpeditionState, map: MapDefinition, p: Point = state.position): number {
  const zone = rollingZone(map, p);
  return zone ? Math.min(zone.cap, zone.base + state.pressure) : 0;
}
export function reveal(state: ExpeditionState, map: MapDefinition): void {
  const width = map.rows[0]!.length; const cells = [...state.revealed]; const r = map.revealRadius;
  for (let y = state.position.y - r; y <= state.position.y + r; y++) for (let x = state.position.x - r; x <= state.position.x + r; x++) {
    if (y >= 0 && y < map.rows.length && x >= 0 && x < width) cells[y * width + x] = '1';
  }
  state.revealed = cells.join('');
}
export function fullParty(lookup: EncounterLookup, map: MapDefinition): Record<string, number> {
  return Object.fromEntries(lookup(map.tutorialEncounterId)!.heroes.map(h => [h.id, h.maxHp]));
}
export function newExpedition(map: MapDefinition, lookup: EncounterLookup, seed: number): ExpeditionState {
  const width = map.rows[0]!.length;
  const state: ExpeditionState = {
    mapId: map.id, mapVersion: map.version, seed: seed >>> 0, rolls: 0, position: startOf(map), steps: 0, pressure: 0,
    revealed: '0'.repeat(width * map.rows.length), hp: fullParty(lookup, map), camp: null,
    tutorialDone: false, bossDefeated: false, completed: false, wins: 0, defeats: 0, battle: null,
  };
  reveal(state, map);
  return state;
}
const startBattle = (state: ExpeditionState, kind: BattleKind, encounterId: string): ActiveBattle =>
  ({ kind, encounterId, entry: { ...state.hp }, commands: [] });

export function move(initial: ExpeditionState, map: MapDefinition, dir: Direction): WorldResult {
  if (initial.battle || initial.completed) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const target = { x: initial.position.x + offsets[dir].x, y: initial.position.y + offsets[dir].y };
  const tile = tileAt(map, target);
  if (!tile) return { state: initial, event: { type: 'blocked', reason: 'edge' } };
  if (tile.kind === 'wall') return { state: initial, event: { type: 'blocked', reason: 'wall' } };
  const state = structuredClone(initial);
  // The boss is visible and blocks its tile: stepping into it starts the fight in place.
  if (tile.kind === 'boss' && !state.bossDefeated) {
    state.battle = startBattle(state, 'boss', map.bossEncounterId);
    return { state, event: { type: 'encounter', kind: 'boss', encounterId: map.bossEncounterId, chance: 100 } };
  }
  state.position = target; state.steps++; reveal(state, map);
  if (tile.kind === 'goal') { state.completed = true; return { state, event: { type: 'goal' } }; }
  const zone = rollingZone(map, target);
  if (!zone) return { state, event: { type: 'moved', chance: 0 } };
  const chance = encounterChance(state, map);
  if (rollPercent(state.seed, state.rolls++) < chance) {
    state.pressure = 0;
    let encounterId = map.tutorialEncounterId; let kind: BattleKind = 'tutorial';
    if (state.tutorialDone) {
      kind = 'random';
      const total = zone.pool.reduce((sum, e) => sum + e.weight, 0);
      let pick = rollPercent(state.seed, state.rolls++) % total;
      encounterId = zone.pool.find(e => (pick -= e.weight) < 0)!.encounterId;
    }
    state.battle = startBattle(state, kind, encounterId);
    return { state, event: { type: 'encounter', kind, encounterId, chance } };
  }
  state.pressure = Math.min(zone.cap, state.pressure + zone.step);
  return { state, event: { type: 'moved', chance } };
}

export function canRest(state: ExpeditionState, map: MapDefinition): boolean {
  return !state.battle && !state.completed && tileAt(map, state.position)?.kind === 'camp';
}
export function rest(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): WorldResult {
  if (!canRest(initial, map)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  state.hp = fullParty(lookup, map); state.pressure = 0; state.camp = { ...state.position };
  return { state, event: { type: 'rested' } };
}

// The battle's committed commands are replayed from the recorded entry; the world
// never trusts a supplied HP snapshot.
export function battleState(state: ExpeditionState, lookup: EncounterLookup): BattleState | undefined {
  const battle = state.battle; const data = battle && lookup(battle.encounterId);
  return battle && data ? replay(data, battle.commands, { hp: battle.entry }) : undefined;
}
export function recordBattle(initial: ExpeditionState, lookup: EncounterLookup, commands: readonly Command[]): ExpeditionState {
  if (!initial.battle) throw new Error('No active battle.');
  const state = structuredClone(initial); state.battle!.commands = commands.map(c => ({ ...c }));
  battleState(state, lookup);
  return state;
}
// Applies a finished battle. Victory keeps the surviving HP; defeat returns to the
// last camp (or start) with a recovered party. A lost tutorial simply restarts.
export function finishBattle(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): WorldResult {
  const result = battleState(initial, lookup);
  if (!initial.battle || !result || result.outcome === 'active') throw new Error('The battle has not finished.');
  const state = structuredClone(initial); const { kind, encounterId } = initial.battle;
  if (result.outcome === 'victory') {
    state.hp = Object.fromEntries(result.heroes.map(h => [h.id, h.hp]));
    state.battle = null; state.wins++;
    if (kind === 'tutorial') state.tutorialDone = true;
    if (kind === 'boss') state.bossDefeated = true;
    return { state, event: { type: 'victory', kind, encounterId } };
  }
  state.defeats++;
  if (kind === 'tutorial') { state.battle = startBattle({ ...state, hp: fullParty(lookup, map) }, 'tutorial', encounterId); return { state, event: { type: 'defeat', kind, encounterId } }; }
  state.battle = null; state.hp = fullParty(lookup, map); state.pressure = 0;
  state.position = state.camp ? { ...state.camp } : startOf(map); reveal(state, map);
  return { state, event: { type: 'defeat', kind, encounterId } };
}
