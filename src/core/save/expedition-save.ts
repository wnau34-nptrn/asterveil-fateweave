import { entryReason } from '../battle/engine';
import type { ActionId, Command } from '../battle/types';
import type { ActiveBattle, ExpeditionState, MapDefinition, Point } from '../world/types';
import { battleState, finishBattle, fullParty, tileAt, type EncounterLookup } from '../world/world';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void }
export const expeditionKey = 'asterveil.fateweave.expedition.v1';
// Practice-mode slots from the combat prototype. They are never read again.
export const legacyKeys = ['asterveil.fateweave.battle.v1', 'asterveil.fateweave.battle.v1.rear-ambush', 'asterveil.fateweave.battle.v1.rift-warden', 'asterveil.fateweave.encounter.v1'];
const SAVE_VERSION = 1;
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
function hpRecord(v: unknown, lookup: EncounterLookup, map: MapDefinition): Record<string, number> {
  const raw = obj(v); const full = fullParty(lookup, map);
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
  if (envelope.version !== SAVE_VERSION) throw new Error('Unsupported save version');
  const s = obj(envelope.state);
  if (s.mapId !== map.id || s.mapVersion !== map.version) throw new Error('Map changed');
  const cells = map.rows.length * map.rows[0]!.length;
  if (typeof s.revealed !== 'string' || s.revealed.length !== cells || /[^01]/.test(s.revealed)) throw new Error('Invalid fog');
  for (const key of ['tutorialDone', 'bossDefeated', 'completed'] as const) if (typeof s[key] !== 'boolean') throw new Error('Invalid flag');
  if (!isInt(s.seed, 0, 0xffffffff) || !isInt(s.rolls) || !isInt(s.steps) || !isInt(s.pressure, 0, 100) || !isInt(s.wins) || !isInt(s.defeats)) throw new Error('Invalid counters');
  const hp = hpRecord(s.hp, lookup, map);
  let battle: ActiveBattle | null = null;
  if (s.battle !== null) {
    const b = obj(s.battle); const data = typeof b.encounterId === 'string' ? lookup(b.encounterId) : undefined;
    if (!['tutorial', 'random', 'boss'].includes(b.kind as string) || !data) throw new Error('Invalid battle');
    if (!Array.isArray(b.commands) || b.commands.length > 5000) throw new Error('Invalid battle');
    const entry = hpRecord(b.entry, lookup, map);
    if (entryReason(data, { hp: entry })) throw new Error('Invalid entry');
    battle = { kind: b.kind as ActiveBattle['kind'], encounterId: data.id, entry, commands: b.commands.map(command) };
  } else if (!Object.values(hp).some(v => v > 0)) throw new Error('Party down outside battle');
  const state: ExpeditionState = {
    mapId: map.id, mapVersion: map.version, seed: s.seed as number, rolls: s.rolls as number, position: point(s.position, map),
    steps: s.steps as number, pressure: s.pressure as number, revealed: s.revealed, hp,
    camp: s.camp === null ? null : point(s.camp, map), tutorialDone: s.tutorialDone as boolean, bossDefeated: s.bossDefeated as boolean,
    completed: s.completed as boolean, wins: s.wins as number, defeats: s.defeats as number, battle,
  };
  if (state.camp && tileAt(map, state.camp)?.kind !== 'camp') throw new Error('Invalid camp');
  // A battle can end on enemy opening turns before any command; apply it now.
  if (battle && battleState(state, lookup)!.outcome !== 'active') return finishBattle(state, map, lookup).state;
  return state;
}
export function loadExpedition(storage: StoragePort | undefined, map: MapDefinition, lookup: EncounterLookup): ExpeditionState | undefined {
  try {
    const raw = storage?.getItem(expeditionKey);
    return raw ? parseExpedition(raw, map, lookup) : undefined;
  } catch { return undefined; }
}
