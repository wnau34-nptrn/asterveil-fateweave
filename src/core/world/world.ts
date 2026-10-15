import { replay, withParty } from '../battle/engine';
import type { BattleState, Command, EncounterDefinition, HeroDefinition } from '../battle/types';
import type { ActiveBattle, BattleKind, ChestDefinition, Direction, ExpeditionState, LootTable, MapDefinition, Point, Resources, Tile, WorldResult, ZoneDefinition } from './types';
import { PARTY_SLOTS, RESERVE_SLOTS } from './types';

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
// Hero definitions available to the roster. Until hiring exists (2C) the catalog is the
// teaching encounter's party; a test can supply a larger one through the lookup.
export function heroCatalog(lookup: EncounterLookup, map: MapDefinition): readonly HeroDefinition[] {
  return lookup(map.tutorialEncounterId)!.heroes;
}
export function heroDef(lookup: EncounterLookup, map: MapDefinition, id: string): HeroDefinition | undefined {
  return heroCatalog(lookup, map).find(h => h.id === id);
}
export const rosterIds = (state: ExpeditionState): string[] => [...state.roster.deployed, ...state.roster.reserve];
// Max HP for the given members (default: the whole roster).
export function fullParty(lookup: EncounterLookup, map: MapDefinition, ids?: readonly string[]): Record<string, number> {
  return Object.fromEntries((ids ?? map.startingRoster).map(id => [id, heroDef(lookup, map, id)!.maxHp]));
}
export function newExpedition(map: MapDefinition, lookup: EncounterLookup, seed: number): ExpeditionState {
  const width = map.rows[0]!.length;
  const state: ExpeditionState = {
    mapId: map.id, mapVersion: map.version, seed: seed >>> 0, rolls: 0, position: startOf(map), steps: 0, pressure: 0,
    revealed: '0'.repeat(width * map.rows.length), roster: { deployed: [...map.startingRoster], reserve: [] }, hp: fullParty(lookup, map), camp: null,
    resources: { ore: 0, ember: 0, seal: 0 }, openedChests: [], restReady: true,
    tutorialDone: false, bossDefeated: false, completed: false, wins: 0, defeats: 0, battle: null,
  };
  reveal(state, map);
  return state;
}
const startBattle = (state: ExpeditionState, kind: BattleKind, encounterId: string): ActiveBattle =>
  ({ kind, encounterId, entry: Object.fromEntries(state.roster.deployed.map(id => [id, state.hp[id]!])), commands: [] });

export function move(initial: ExpeditionState, map: MapDefinition, dir: Direction): WorldResult {
  if (initial.battle || initial.completed) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const target = { x: initial.position.x + offsets[dir].x, y: initial.position.y + offsets[dir].y };
  const tile = tileAt(map, target);
  if (!tile) return { state: initial, event: { type: 'blocked', reason: 'edge' } };
  if (tile.kind === 'wall') return { state: initial, event: { type: 'blocked', reason: 'wall' } };
  if (!initial.roster.deployed.some(id => initial.hp[id]! > 0)) return { state: initial, event: { type: 'blocked', reason: 'party' } };
  const state = structuredClone(initial);
  // The boss is visible and blocks its tile: stepping into it starts the fight in place.
  if (tile.kind === 'boss' && !state.bossDefeated) {
    state.battle = startBattle(state, 'boss', map.bossEncounterId);
    return { state, event: { type: 'encounter', kind: 'boss', encounterId: map.bossEncounterId, chance: 100 } };
  }
  state.position = target; state.steps++; reveal(state, map);
  // Reaching a camp makes it the defeat return point, whether or not the party rests.
  if (tile.kind === 'camp') state.camp = { ...target };
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

export const atCamp = (state: ExpeditionState, map: MapDefinition): boolean =>
  !state.battle && !state.completed && tileAt(map, state.position)?.kind === 'camp';
export function canRest(state: ExpeditionState, map: MapDefinition): boolean { return atCamp(state, map) && state.restReady; }
const percentOf = (max: number, percent: number) => Math.max(1, Math.ceil(max * percent / 100));
// A rest heals standing members by a share of max HP; the fallen need an ember each.
export function rest(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): WorldResult {
  if (!canRest(initial, map)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial); const full = fullParty(lookup, map, rosterIds(state));
  for (const [id, max] of Object.entries(full)) if (state.hp[id]! > 0) state.hp[id] = Math.min(max, state.hp[id]! + percentOf(max, map.camp.restHealPercent));
  state.pressure = 0; state.camp = { ...state.position }; state.restReady = false;
  return { state, event: { type: 'rested' } };
}
export function canRevive(state: ExpeditionState, map: MapDefinition, heroId: string): boolean {
  return atCamp(state, map) && state.resources.ember > 0 && state.hp[heroId] === 0;
}
export function revive(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, heroId: string): WorldResult {
  if (!canRevive(initial, map, heroId)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  state.hp[heroId] = percentOf(heroDef(lookup, map, heroId)!.maxHp, map.camp.reviveHpPercent); state.resources.ember--;
  return { state, event: { type: 'revived', heroId } };
}

// Camp roster management: a deployed member and a reserve member trade places, or one
// member moves to a free slot on the other side. At least one member stays deployed.
export function swapMembers(initial: ExpeditionState, map: MapDefinition, a: string, b: string): WorldResult {
  const { deployed, reserve } = initial.roster;
  const [d, r] = deployed.includes(a) ? [a, b] : [b, a];
  if (!atCamp(initial, map) || !deployed.includes(d) || !reserve.includes(r)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  state.roster.deployed[deployed.indexOf(d)] = r; state.roster.reserve[reserve.indexOf(r)] = d;
  return { state, event: { type: 'roster' } };
}
export function moveMember(initial: ExpeditionState, map: MapDefinition, id: string): WorldResult {
  const { deployed, reserve } = initial.roster;
  const toReserve = deployed.includes(id);
  const ok = atCamp(initial, map) && (toReserve ? deployed.length > 1 && reserve.length < RESERVE_SLOTS : reserve.includes(id) && deployed.length < PARTY_SLOTS);
  if (!ok) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  const from = toReserve ? state.roster.deployed : state.roster.reserve; const to = toReserve ? state.roster.reserve : state.roster.deployed;
  from.splice(from.indexOf(id), 1); to.push(id);
  return { state, event: { type: 'roster' } };
}

// Loot consumes rolls from the same (seed, rolls) stream, so it is fixed once saved.
function rollLoot(state: ExpeditionState, table: LootTable): Resources {
  const [lo, hi] = table.ore;
  const extra = ([base, chance]: readonly [number, number]) => base + (chance > 0 && rollPercent(state.seed, state.rolls++) < chance ? 1 : 0);
  const loot = { ore: lo + (hi > lo ? rollPercent(state.seed, state.rolls++) % (hi - lo + 1) : 0), ember: extra(table.ember), seal: extra(table.seal) };
  state.resources = { ore: state.resources.ore + loot.ore, ember: state.resources.ember + loot.ember, seal: state.resources.seal + loot.seal };
  return loot;
}
export const chestAt = (map: MapDefinition, p: Point): ChestDefinition | undefined => map.chests.find(c => c.x === p.x && c.y === p.y);
export function canOpenChest(state: ExpeditionState, map: MapDefinition): boolean {
  const chest = chestAt(map, state.position);
  return !!chest && !state.battle && !state.completed && !state.openedChests.includes(chest.id);
}
export function openChest(initial: ExpeditionState, map: MapDefinition): WorldResult {
  if (!canOpenChest(initial, map)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial); const chest = chestAt(map, state.position)!;
  state.openedChests.push(chest.id);
  return { state, event: { type: 'chest', chestId: chest.id, loot: rollLoot(state, map.loot.chest[chest.tier]) } };
}
const noLoot: LootTable = { ore: [0, 0], ember: [0, 0], seal: [0, 0] };
function battleLoot(state: ExpeditionState, map: MapDefinition, kind: BattleKind): LootTable {
  if (kind === 'tutorial') return map.loot.tutorial;
  if (kind === 'boss') return map.loot.boss;
  return zoneOf(map, tileAt(map, state.position)?.zoneId ?? '')?.loot ?? noLoot;
}

// The encounter as fought by the deployed party, in slot order.
export function battleData(state: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): EncounterDefinition | undefined {
  const data = state.battle && lookup(state.battle.encounterId);
  const party = state.roster.deployed.map(id => heroDef(lookup, map, id));
  return data && party.every(Boolean) ? withParty(data, party as HeroDefinition[]) : undefined;
}
// The battle's committed commands are replayed from the recorded entry; the world
// never trusts a supplied HP snapshot.
export function battleState(state: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): BattleState | undefined {
  const data = battleData(state, map, lookup);
  return state.battle && data ? replay(data, state.battle.commands, { hp: state.battle.entry }) : undefined;
}
export function recordBattle(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, commands: readonly Command[]): ExpeditionState {
  if (!initial.battle) throw new Error('No active battle.');
  const state = structuredClone(initial); state.battle!.commands = commands.map(c => ({ ...c }));
  battleState(state, map, lookup);
  return state;
}
// Applies a finished battle. Victory keeps the surviving HP, rolls loot and relights
// the campfire; defeat leaves the deployed members down at the last camp (or start).
// A lost tutorial simply restarts at full HP.
export function finishBattle(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): WorldResult {
  const result = battleState(initial, map, lookup);
  if (!initial.battle || !result || result.outcome === 'active') throw new Error('The battle has not finished.');
  const state = structuredClone(initial); const { kind, encounterId } = initial.battle;
  if (result.outcome === 'victory') {
    for (const h of result.heroes) state.hp[h.id] = h.hp;
    state.battle = null; state.wins++; state.restReady = true;
    if (kind === 'tutorial') state.tutorialDone = true;
    if (kind === 'boss') state.bossDefeated = true;
    return { state, event: { type: 'victory', kind, encounterId, loot: rollLoot(state, battleLoot(state, map, kind)) } };
  }
  state.defeats++;
  if (kind === 'tutorial') {
    state.battle = { kind: 'tutorial', encounterId, entry: fullParty(lookup, map, state.roster.deployed), commands: [] };
    return { state, event: { type: 'defeat', kind, encounterId } };
  }
  // The fallen stay fallen; the party retreats to the last camp reached (or start).
  // Only when the whole roster is down does one member get back up, free, and the
  // campfire is relit so the survivor can rest.
  for (const h of result.heroes) state.hp[h.id] = 0;
  state.battle = null; state.pressure = 0;
  state.position = state.camp ? { ...state.camp } : startOf(map); reveal(state, map);
  let rescued: string | undefined;
  if (rosterIds(state).every(id => state.hp[id] === 0)) {
    rescued = state.roster.deployed[0]!;
    state.hp[rescued] = percentOf(heroDef(lookup, map, rescued)!.maxHp, map.camp.reviveHpPercent); state.restReady = true;
  }
  return { state, event: { type: 'defeat', kind, encounterId, ...(rescued ? { rescued } : {}) } };
}
