import { entryReason } from '../battle/engine';
import type { ActionId, Command } from '../battle/types';
import { PARTY_SLOTS, RESERVE_SLOTS, type ActiveBattle, type ExpeditionState, type MapDefinition, type Point, type Roster } from '../world/types';
import { battleState, finishBattle, fullParty, heroDef, tileAt, type EncounterLookup } from '../world/world';
import type { BoardState, MemberProgress } from '../world/types';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void }
export const expeditionKey = 'asterveil.fateweave.expedition.v1';
// Practice-mode slots from the combat prototype. They are never read again.
export const legacyKeys = ['asterveil.fateweave.battle.v1', 'asterveil.fateweave.battle.v1.rear-ambush', 'asterveil.fateweave.battle.v1.rift-warden', 'asterveil.fateweave.encounter.v1'];
// v1 (phase 1) → v2 (phase 2A): adds resources, opened chests and the campfire flag.
// v2 → v3 (phase 2B): adds the roster. v3 → v4 (phase 2C): adds member stars/duplicates and
// the hiring board. Older saves migrate with empty resources, a lit campfire (v1), the
// starting four deployed (v1–v2), every member at ★1 and no board; the map layout is unchanged.
const SAVE_VERSION = 4;
const actions: readonly ActionId[] = ['attack', 'guard', 'bash', 'mark', 'execute', 'bolt', 'ward', 'heal', 'prayer'];

export function saveExpedition(storage: StoragePort | undefined, state: ExpeditionState): boolean {
  try {
    if (!storage) return false;
    storage.setItem(expeditionKey, JSON.stringify({ version: SAVE_VERSION, state }));
    return true;
  } catch { return false; }
}
export function clearLegacySaves(storage: StoragePort | undefined): void {
  try { for (const key of legacyKeys) storage?.removeItem?.(key); } catch { /* Optional cleanup. */ }
}

const isInt = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid save');
  return v as Record<string, unknown>;
}
function point(v: unknown, map: MapDefinition): Point {
  const p = obj(v); const width = map.rows[0]!.length;
  if (!isInt(p.x, 0, width - 1) || !isInt(p.y, 0, map.rows.length - 1)) throw new Error('Invalid position');
  const tile = tileAt(map, { x: p.x, y: p.y });
  if (!tile || tile.kind === 'wall' || tile.kind === 'boss') throw new Error('Invalid position');
  return { x: p.x, y: p.y };
}
function rosterOf(v: unknown, lookup: EncounterLookup, map: MapDefinition): Roster {
  const r = obj(v); const { deployed, reserve } = r;
  if (!Array.isArray(deployed) || !Array.isArray(reserve) || Object.keys(r).length !== 2) throw new Error('Invalid roster');
  const ids = [...deployed, ...reserve];
  if (!deployed.length || deployed.length > PARTY_SLOTS || reserve.length > RESERVE_SLOTS || new Set(ids).size !== ids.length
    || ids.some(id => typeof id !== 'string' || !heroDef(lookup, map, id))) throw new Error('Invalid roster');
  return { deployed: [...deployed] as string[], reserve: [...reserve] as string[] };
}
function membersOf(v: unknown, map: MapDefinition, ids: readonly string[]): Record<string, MemberProgress> {
  const raw = obj(v);
  if (Object.keys(raw).length !== ids.length) throw new Error('Invalid members');
  return Object.fromEntries(ids.map(id => {
    const m = obj(raw[id]);
    if (Object.keys(m).length !== 2 || !isInt(m.stars, 1, map.company.maxStars) || !isInt(m.dupes, 0, 99)) throw new Error('Invalid members');
    return [id, { stars: m.stars, dupes: m.dupes }];
  }));
}
function boardOf(v: unknown, map: MapDefinition): BoardState | null {
  if (v === null) return null;
  const b = obj(v);
  if (typeof b.key !== 'string' || !/^\d+,\d+:\d+$/.test(b.key) || !Array.isArray(b.taken) || new Set(b.taken).size !== b.taken.length
    || b.taken.some(i => !isInt(i, 0, map.company.offers - 1))) throw new Error('Invalid board');
  return { key: b.key, taken: [...b.taken as number[]] };
}
function hpRecord(v: unknown, lookup: EncounterLookup, map: MapDefinition, ids: readonly string[], members: Record<string, MemberProgress>): Record<string, number> {
  const raw = obj(v); const full = fullParty(lookup, map, ids, members);
  if (Object.keys(raw).length !== Object.keys(full).length) throw new Error('Invalid party');
  return Object.fromEntries(Object.entries(full).map(([id, max]) => {
    if (!isInt(raw[id], 0, max)) throw new Error('Invalid party');
    return [id, raw[id]];
  }));
}
function command(v: unknown): Command {
  const c = obj(v);
  if (!isInt(c.beat, 1) || typeof c.heroId !== 'string' || typeof c.targetId !== 'string' || !actions.includes(c.action as ActionId)) throw new Error('Invalid command');
  return { beat: c.beat, heroId: c.heroId, targetId: c.targetId, action: c.action as ActionId };
}

// Rebuilds the state field by field. Battles are validated by replaying every
// command under the current rules; any mismatch starts a fresh expedition.
export function parseExpedition(raw: string, map: MapDefinition, lookup: EncounterLookup): ExpeditionState {
  const envelope = obj(JSON.parse(raw));
  if (![1, 2, 3, SAVE_VERSION].includes(envelope.version as number)) throw new Error('Unsupported save version');
  const s = obj(envelope.state);
  if (envelope.version === 1) Object.assign(s, { resources: { ore: 0, ember: 0, seal: 0 }, openedChests: [], restReady: true });
  if ((envelope.version as number) < 3) s.roster = { deployed: [...map.startingRoster], reserve: [] };
  if ((envelope.version as number) < 4) {
    const r = obj(s.roster); const ids = [...(r.deployed as unknown[] ?? []), ...(r.reserve as unknown[] ?? [])];
    s.members = Object.fromEntries(ids.map(id => [String(id), { stars: 1, dupes: 0 }])); s.board = null;
  }
  if (s.mapId !== map.id || s.mapVersion !== map.version) throw new Error('Map changed');
  const cells = map.rows.length * map.rows[0]!.length;
  if (typeof s.revealed !== 'string' || s.revealed.length !== cells || /[^01]/.test(s.revealed)) throw new Error('Invalid fog');
  for (const key of ['tutorialDone', 'bossDefeated', 'completed', 'restReady'] as const) if (typeof s[key] !== 'boolean') throw new Error('Invalid flag');
  if (!isInt(s.seed, 0, 0xffffffff) || !isInt(s.rolls) || !isInt(s.steps) || !isInt(s.pressure, 0, 100) || !isInt(s.wins) || !isInt(s.defeats)) throw new Error('Invalid counters');
  const roster = rosterOf(s.roster, lookup, map);
  const ids = [...roster.deployed, ...roster.reserve];
  const members = membersOf(s.members, map, ids); const board = boardOf(s.board, map);
  const hp = hpRecord(s.hp, lookup, map, ids, members);
  const r = obj(s.resources);
  if (Object.keys(r).length !== 3 || !isInt(r.ore, 0, 999999) || !isInt(r.ember, 0, 9999) || !isInt(r.seal, 0, 9999)) throw new Error('Invalid resources');
  const chestIds = map.chests.map(c => c.id);
  if (!Array.isArray(s.openedChests) || s.openedChests.some(id => !chestIds.includes(id)) || new Set(s.openedChests).size !== s.openedChests.length) throw new Error('Invalid chests');
  let battle: ActiveBattle | null = null;
  if (s.battle !== null) {
    const b = obj(s.battle); const data = typeof b.encounterId === 'string' ? lookup(b.encounterId) : undefined;
    if (!['tutorial', 'random', 'boss'].includes(b.kind as string) || !data) throw new Error('Invalid battle');
    if (!Array.isArray(b.commands) || b.commands.length > 5000) throw new Error('Invalid battle');
    const entry = hpRecord(b.entry, lookup, map, roster.deployed, members);
    if (entryReason(data, { hp: entry })) throw new Error('Invalid entry');
    battle = { kind: b.kind as ActiveBattle['kind'], encounterId: data.id, entry, commands: b.commands.map(command) };
  } else if (!Object.values(hp).some(v => v > 0)) throw new Error('Roster down outside battle');
  const state: ExpeditionState = {
    mapId: map.id, mapVersion: map.version, seed: s.seed as number, rolls: s.rolls as number, position: point(s.position, map),
    steps: s.steps as number, pressure: s.pressure as number, revealed: s.revealed, roster, members, board, hp,
    camp: s.camp === null ? null : point(s.camp, map),
    resources: { ore: r.ore as number, ember: r.ember as number, seal: r.seal as number }, openedChests: [...s.openedChests as string[]], restReady: s.restReady as boolean,
    tutorialDone: s.tutorialDone as boolean, bossDefeated: s.bossDefeated as boolean,
    completed: s.completed as boolean, wins: s.wins as number, defeats: s.defeats as number, battle,
  };
  if (state.camp && tileAt(map, state.camp)?.kind !== 'camp') throw new Error('Invalid camp');
  // A battle can end on enemy opening turns before any command; apply it now.
  if (battle && battleState(state, map, lookup)!.outcome !== 'active') return finishBattle(state, map, lookup).state;
  return state;
}
export function loadExpedition(storage: StoragePort | undefined, map: MapDefinition, lookup: EncounterLookup): ExpeditionState | undefined {
  try {
    const raw = storage?.getItem(expeditionKey);
    return raw ? parseExpedition(raw, map, lookup) : undefined;
  } catch { return undefined; }
}
