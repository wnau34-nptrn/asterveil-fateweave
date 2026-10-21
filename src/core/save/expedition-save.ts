import {bossPlanValid,startBossPlan} from '../world/boss-equipment';
import {storageCap} from '../world/storage';
import { entryReason, withParty } from '../battle/engine';
import type { ActionId, Command } from '../battle/types';
import { COMPANY_CAP, PARTY_SLOTS, RESERVE_SLOTS, type ActiveBattle, type ExpeditionState, type MapDefinition, type Point, type Profile, type Roster, type RunOutcome } from '../world/types';
import { skillChoices, battleState, expToNext, findTiles, newExpedition, finishBattle, fullParty, heroCatalog, heroDef, memberDef, rosterIds, tileAt, type EncounterLookup } from '../world/world';
import { affixPool, itemValid } from '../world/equipment';
import { boulderAt, openPit, passableWall } from '../world/puzzles';
import { commanderReason, defaultCamp, newProfile, settle, talentsValid } from '../world/profile';
import { grantsValid, isBigTree } from '../world/talents';
import type { GearSlot, GearStat, Item, MemberProgress, Potions, Talents } from '../world/types';
import { GEAR_SLOTS, POTION_IDS, SHOP_ITEMS, type ShopItemId } from '../world/types';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void }
export const expeditionKey = 'asterveil.fateweave.expedition.v1';
// Practice-mode slots from the combat prototype. They are never read again.
export const legacyKeys = ['asterveil.fateweave.battle.v1', 'asterveil.fateweave.battle.v1.rear-ambush', 'asterveil.fateweave.battle.v1.rift-warden', 'asterveil.fateweave.encounter.v1'];
// v1 (phase 1) → v2 (phase 2A): adds resources, opened chests and the campfire flag.
// v2 → v3 (phase 2B): adds the roster. v3 → v4 (phase 2C): adds member stars/duplicates and
// the hiring board. Older saves migrate with empty resources, a lit campfire (v1), the
// starting four deployed (v1–v2), every member at ★1 and no board; the map layout is unchanged.
// v4 → v5 (lobby L1): the envelope becomes { version, profile, run }. A v1–v4 `state` becomes the
// run (its camp board is dropped) and a profile is built from its roster with an empty bank;
// a run that had already reached the goal is settled into the profile at once.
// v5 → v6 (L2): the profile gains `commander` (null until created; v5 migrates as null).
// v6 → v7 (2D-1): members may carry `level`/`exp` (missing = level 1, no EXP) and an active battle
// its monster `level` (missing = the encounter's own level). v6 data loads unchanged.
// v7 → v8 (2D-1b): members may carry `talents` (ranks per tree node; missing = none). v7 data loads unchanged.
// v8 → v9 (2D-2): members may carry `gear`; the profile gains `items`, `nextItem`, `bank.dust` and the
// last result `items`/`salvaged`; the run gains `found` and `dry`. Older data migrates empty.
// v9 → v10 (2D-3): items may carry `set`. v9 data loads unchanged.
// v10 → v11 (2D-4): items may carry `plus`; the profile gains the `forge` roll counter (older data: 0).
// v11 → v12 (2D-5): the profile gains brewed `potions`; the run gains carried `potions` and `repel` (older data: none).
// v12 → v13 (3A): the run gains `elitesDefeated`, `eventsDone` and `dust`, members a shrine `wound`, battles the
// kinds 'elite'/'event' with a `source`. A run saved on an older map version is settled home as withdrawn.
// v13 → v14: gold coins pay for hiring. Run resources, the bank and the last result gain `gold`; older data
// starts with 0 in the run and one hire's worth in the bank, so a company saved for hiring can still hire.
// v14 → v15 (3C): the run gains puzzle state: `runes`, `solved`, `levers`, `boulders` and `secrets` (older data: none).
// v15 → v16 (3D): the profile gains side-quest `quests`; the run gains picked `herbs` (older data: none).
// v16 → v17 (4A): the profile gains `shop` (market items bought this return) and `refreshes` (older data: none).
// v17 → v18: the profile gains `smelted` (veil dust smelted from ore this return; older data: 0).
// v18 → v19 (4B/4C): the run gains `visited` (camps reached) and `respawns` (optional elite returns); older
// runs start with the camp they last reached and no returns.
// v19 → v20 (map bag): run members may wear items found this run (uid 0) and the run gains `spare`, the
// company's own items taken off on the map (older runs: none). The run's own items must match the profile's.
// v20 → v21 (stats design): items may carry roll qualities `q` (older items: 100%). The `skill` and `heal` affixes
// become `support`; an affix the slot can no longer roll (or a duplicate) becomes the first stat of the slot's pool
// the item does not have yet.
// v21 → v22: optional lock and paid-enhancement ledger. Legacy items retain their shape;
// missing ledger grants credit for the remaining + through enhancementInvestment.
// v22 → v23: permanent area-earned item-Lv cap and optional exact item-level investment.
// Earlier completed expeditions unlock the chapter cap; absent item ledgers never invent level spending.
// v23 → v24: persistent overflow tray and paid permanent camp storage tiers.
// v24 → v25: per-class farming counters; absent run plan preserves legacy loot/RNG until return.
// v25 → v26: optional single-slot affix-transfer binding; missing binding stays unrestricted.
// v26 → v27: optional boss item identity and independent per-boss snapshot/progress.
// v27 → v28 (chapters): the profile gains `cleared`, the maps completed at least once. An existing company counts the
// teaching maps before the frontier as cleared (its owner never has to replay the tutorial maps) and the frontier
// too once it has a completed expedition. Runs load with the map they were started on (`maps`).
// v28 → v29: the commander gains `camp`, the ค่ายทหารรับจ้าง's name (defaults to "ค่าย" + the commander's name).
// v29 → v30: runs may carry story-recruit `guests` and `recruited` (missing = none).
// v30 → v31: lobby systems open by chapter; a company from an older save that finished the prologue is `veteran`.
// v31 → v32: the profile may record guided tasks claimed or skipped (`guides`; missing = none).
// v32 → v33: hard mode: runs may be `hard`; the profile lists `clearedHard` maps (missing = none).
// v33 → v34: big skill trees (A6). A big-tree class's old small-tree ranks are refunded, members get the tree nodes their
// stars used to unlock as `grants`, and members may carry a skill `loadout`. A run whose member lost ranks settles home.
const SAVE_VERSION = 34;
export interface Game { profile: Profile; run: ExpeditionState | null }
const actions: readonly ActionId[] = ['attack', 'guard', 'bash', 'mark', 'execute', 'bolt', 'ward', 'heal', 'prayer', 'brace', 'pierce', 'hinder', 'volley', 'acid', 'haste', 'ambush', 'evade', 'taunt', 'slam', 'valor', 'mend',
  'rally', 'finisher', 'sigil', 'sanctuary', 'spearwall', 'weakshot', 'bomb', 'backstab', 'quake', 'finale', 'challenge', 'bulwark', 'rouse'];

// One key for profile and run, so settling an expedition is a single atomic write.
export function saveGame(storage: StoragePort | undefined, game: Game): boolean {
  try {
    if (!storage) return false;
    storage.setItem(expeditionKey, JSON.stringify({ version: SAVE_VERSION, profile: game.profile, run: game.run }));
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
// `walls` lets the party stand in a doorway or secret passage (3C); the run checks it is really passable.
function point(v: unknown, map: MapDefinition, walls = false): Point {
  const p = obj(v); const width = map.rows[0]!.length;
  if (!isInt(p.x, 0, width - 1) || !isInt(p.y, 0, map.rows.length - 1)) throw new Error('Invalid position');
  const tile = tileAt(map, { x: p.x, y: p.y });
  if (!tile || (tile.kind === 'wall' && !walls) || tile.kind === 'boss') throw new Error('Invalid position');
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
function itemOf(v: unknown, map: MapDefinition, lookup: EncounterLookup, found = false): Item {
  const i = structuredClone(obj(v)) as unknown as Item;
  if (!itemValid(map, i, heroCatalog(lookup, map).map(h => h.id), found)) throw new Error('Invalid item');
  return i;
}
// On a run (`run`), members may also wear items found on this expedition (uid 0).
function membersOf(v: unknown, map: MapDefinition, ids: readonly string[], lookup: EncounterLookup, run = false): Record<string, MemberProgress> {
  const raw = obj(v);
  if (Object.keys(raw).length !== ids.length) throw new Error('Invalid members');
  return Object.fromEntries(ids.map(id => {
    const m = obj(raw[id]); const keys = Object.keys(m);
    if (keys.some(k => !['stars', 'dupes', 'level', 'exp', 'talents', 'gear', 'wound', 'grants', 'loadout'].includes(k)) || ('level' in m) !== ('exp' in m)) throw new Error('Invalid members');
    if (!isInt(m.stars, 1, map.company.maxStars) || !isInt(m.dupes, 0, 99)) throw new Error('Invalid members');
    const out: MemberProgress = { stars: m.stars, dupes: m.dupes };
    if ('wound' in m) { if (!isInt(m.wound, 1, map.eventRules.maxWound)) throw new Error('Invalid members'); out.wound = m.wound; }
    if ('level' in m) {
      if (!isInt(m.level, 1, map.progression.levelCap) || !isInt(m.exp, 0, expToNext(map, m.level) - 1)) throw new Error('Invalid members');
      Object.assign(out, { level: m.level, exp: m.exp });
    }
    if ('grants' in m) { if (!grantsValid(map, id, m.grants)) throw new Error('Invalid talents'); out.grants = [...m.grants as string[]]; }
    if ('talents' in m) {
      const t = obj(m.talents) as Talents;
      if (!Object.keys(t).length || !talentsValid(map, id, out.level ?? 1, t, out.stars, out.grants)) throw new Error('Invalid talents');
      out.talents = { ...t };
    }
    if ('loadout' in m) {
      const base = heroDef(lookup, map, id); const choices = base ? skillChoices(base, map, out.talents, out.grants) : [];
      const l = m.loadout;
      if (!Array.isArray(l) || !l.length || l.length > map.progression.loadoutSize || new Set(l).size !== l.length || l.some(a => !choices.includes(a))) throw new Error('Invalid loadout');
      out.loadout = [...l as ActionId[]];
    }
    if ('gear' in m) {
      const g = obj(m.gear) as Record<string, unknown>;
      if (!Object.keys(g).length) throw new Error('Invalid gear');
      out.gear = {};
      for (const [slot, raw] of Object.entries(g)) {
        const item = itemOf(raw, map, lookup, run && obj(raw).uid === 0);
        if (item.slot !== slot || (item.hero !== undefined && item.hero !== id)) throw new Error('Invalid gear');
        out.gear[item.slot] = item;
      }
    }
    return [id, out];
  }));
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

const badRun = (): never => { throw new Error('Invalid run'); };
function potionsOf(v: unknown, max: number): Potions {
  const p = obj(v);
  if (Object.keys(p).length !== POTION_IDS.length || POTION_IDS.some(id => !isInt(p[id], 0, max))) throw new Error('Invalid potions');
  return Object.fromEntries(POTION_IDS.map(id => [id, p[id] as number])) as Potions;
}
// Cleared maps: a string list without repeats. Ids of maps this build does not know (a removed map, or a caller
// that passes only some maps) are dropped rather than rejecting the company.
function clearedList(v: unknown, maps: readonly MapDefinition[]): string[] {
  if (!Array.isArray(v) || v.some(id => typeof id !== 'string') || new Set(v).size !== v.length) throw new Error('Invalid profile');
  return (v as string[]).filter(id => maps.some(m => m.id === id));
}
function idList(v: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(v) || v.some(id => !allowed.includes(id)) || new Set(v).size !== v.length) throw new Error('Invalid run');
  return [...v as string[]];
}
// A run from an older version of this map cannot be replayed on the new board. Only what settling needs is
// validated, and the run comes home as withdrawn (no battle, no wipe).
class StaleRun extends Error { constructor(readonly run: ExpeditionState) { super('Stale run'); } }
function staleRun(s: Record<string, unknown>, map: MapDefinition, lookup: EncounterLookup): ExpeditionState {
  const roster = rosterOf(s.roster, lookup, map); const ids = [...roster.deployed, ...roster.reserve];
  const members = membersOf(s.members, map, ids, lookup, true); const r = obj(s.resources);
  if (!isInt(r.ore, 0, 999999) || !isInt(r.seal, 0, 9999) || !isInt(s.steps) || !isInt(s.wins)) throw new Error('Invalid run');
  const run = newExpedition(map, lookup, 0, { roster, members });
  return { ...run, resources: { ore: r.ore, gold: isInt(r.gold, 0, 999999) ? r.gold : 0, ember: 0, seal: r.seal }, steps: s.steps, wins: s.wins, found: foundOf(s.found, map, lookup), spare: spareOf(s.spare, map, lookup),
    potions: potionsOf(s.potions, map.potions.carry), dust: isInt(s.dust, 0, 999999) ? s.dust : 0, tutorialDone: s.tutorialDone === true };
}
// 3C puzzle state, validated against the map's puzzles.
function puzzleState(s: Record<string, unknown>, map: MapDefinition): Pick<ExpeditionState, 'runes' | 'solved' | 'levers' | 'boulders' | 'secrets'> {
  const P = map.puzzles;
  const solved = idList(s.solved, [...P.runes, ...P.levers, ...P.boulders].map(x => x.id));
  const secrets = idList(s.secrets, P.secrets.map(x => x.id));
  const levers = idList(s.levers, P.levers.flatMap(l => l.levers.map((_, i) => `${l.id}:${i}`)));
  const runesRaw = obj(s.runes); const runes: Record<string, number> = {};
  for (const [id, n] of Object.entries(runesRaw)) {
    const r = P.runes.find(x => x.id === id);
    if (!r || solved.includes(id) || !isInt(n, 1, r.stones.length - 1)) throw new Error('Invalid puzzle');
    runes[id] = n;
  }
  const bRaw = obj(s.boulders); const boulders: Record<string, Point> = {};
  for (const [id, at] of Object.entries(bRaw)) {
    if (!P.boulders.some(x => x.id === id) || solved.includes(id)) throw new Error('Invalid puzzle');
    const p = point(at, map); if (tileAt(map, p)?.kind !== 'floor') throw new Error('Invalid puzzle');
    boulders[id] = p;
  }
  return { runes, solved, levers, boulders, secrets };
}
function spareOf(v: unknown, map: MapDefinition, lookup: EncounterLookup): Item[] {
  if (!Array.isArray(v) || v.length > 99) throw new Error('Invalid spare');
  return v.map(i => itemOf(i, map, lookup));
}
// The company's own items on a run (worn or taken off on the map) are exactly what its members wore when they
// left the lobby, so the map bag can neither copy nor lose them.
const travelling = (run: ExpeditionState, id: string): boolean => !!run.guests?.includes(id) || !!run.recruited?.includes(id);
function ownItemsMatch(profile: Profile, run: ExpeditionState): boolean {
  const key = (items: Item[]) => items.map(i => JSON.stringify(i)).sort().join('|');
  const ids = rosterIds(run);
  const onRun = [...run.spare, ...ids.flatMap(id => Object.values(run.members[id]?.gear ?? {}) as Item[]).filter(i => i.uid > 0)];
  const home = ids.flatMap(id => Object.values(profile.members[id]?.gear ?? {}) as Item[]);
  return key(onRun) === key(home);
}
function foundOf(v: unknown, map: MapDefinition, lookup: EncounterLookup): Item[] {
  // Bonus rewards must not invalidate an otherwise valid run crossing the former 99-find boundary.
  if (!Array.isArray(v) || v.length > 9999) throw new Error('Invalid found');
  return v.map(i => itemOf(i, map, lookup, true));
}
// Rebuilds a run field by field. Battles are validated by replaying every command under
// the current rules; any mismatch rejects the save.
function parseRun(v: unknown, version: number, map: MapDefinition, lookup: EncounterLookup): ExpeditionState {
  const s = obj(v);
  if (version === 1) Object.assign(s, { resources: { ore: 0, ember: 0, seal: 0 }, openedChests: [], restReady: true });
  if (version < 3) s.roster = { deployed: [...map.startingRoster], reserve: [] };
  if (version < 4) {
    const r = obj(s.roster); const ids = [...(r.deployed as unknown[] ?? []), ...(r.reserve as unknown[] ?? [])];
    s.members = Object.fromEntries(ids.map(id => [String(id), { stars: 1, dupes: 0 }]));
  }
  if (version === 4) delete s.board;
  if (version < 9) Object.assign(s, { found: [], dry: 0 });
  if (version < 12) Object.assign(s, { potions: { salve: 0, tonic: 0, repel: 0 }, repel: 0 });
  if (version < 13) Object.assign(s, { elitesDefeated: [], eventsDone: [], dust: 0 });
  if (version < 14 && s.resources && typeof s.resources === 'object') (s.resources as Record<string, unknown>).gold ??= 0;
  if (version < 15) Object.assign(s, { runes: {}, solved: [], levers: [], boulders: {}, secrets: [] });
  if (version < 16) s.herbs = [];
  if (version < 20) s.spare = [];
  if (version < 19) Object.assign(s, { visited: s.camp && typeof s.camp === 'object' ? [`${(s.camp as Point).x},${(s.camp as Point).y}`] : [], respawns: {} });
  if (s.mapId !== map.id) throw new Error('Map changed');
  if (s.mapVersion !== map.version) throw new StaleRun(staleRun(s, map, lookup));
  const cells = map.rows.length * map.rows[0]!.length;
  if (typeof s.revealed !== 'string' || s.revealed.length !== cells || /[^01]/.test(s.revealed)) throw new Error('Invalid fog');
  for (const key of ['tutorialDone', 'bossDefeated', 'completed', 'restReady'] as const) if (typeof s[key] !== 'boolean') throw new Error('Invalid flag');
  if (!isInt(s.seed, 0, 0xffffffff) || !isInt(s.rolls) || !isInt(s.steps) || !isInt(s.pressure, 0, 100) || !isInt(s.wins) || !isInt(s.defeats)) throw new Error('Invalid counters');
  const roster = rosterOf(s.roster, lookup, map);
  const ids = [...roster.deployed, ...roster.reserve];
  const members = membersOf(s.members, map, ids, lookup, true);
  const hp = hpRecord(s.hp, lookup, map, ids, members);
  const r = obj(s.resources);
  if (Object.keys(r).length !== 4 || !isInt(r.ore, 0, 999999) || !isInt(r.gold, 0, 999999) || !isInt(r.ember, 0, 9999) || !isInt(r.seal, 0, 9999)) throw new Error('Invalid resources');
  const chestIds = map.chests.map(c => c.id);
  if (!Array.isArray(s.openedChests) || s.openedChests.some(id => !chestIds.includes(id)) || new Set(s.openedChests).size !== s.openedChests.length) throw new Error('Invalid chests');
  let battle: ActiveBattle | null = null;
  if (s.battle !== null) {
    const b = obj(s.battle); const data = typeof b.encounterId === 'string' ? lookup(b.encounterId) : undefined;
    if (!['tutorial', 'random', 'boss', 'elite', 'event'].includes(b.kind as string) || !data) throw new Error('Invalid battle');
    if(b.kind==='boss'&&(s.bossDefeated||data.id!==map.bossEncounterId))throw new Error('Invalid boss battle');
    const source = b.source;
    if (b.kind === 'elite' && !map.elites.some(e => e.id === source && e.encounterId === data.id && !(s.elitesDefeated as unknown[]).includes(e.id))) throw new Error('Invalid battle');
    if (b.kind === 'event' && !map.events.some(e => e.id === source && !(s.eventsDone as unknown[]).includes(e.id))) throw new Error('Invalid battle');
    if (!['elite', 'event'].includes(b.kind as string) && source !== undefined) throw new Error('Invalid battle');
    if (!Array.isArray(b.commands) || b.commands.length > 5000) throw new Error('Invalid battle');
    const entry = hpRecord(b.entry, lookup, map, roster.deployed, members);
    // Validate against the encounter as fought by this run's deployed party (stars included).
    if (entryReason(withParty(data, roster.deployed.map(id => memberDef(lookup, map, members, id)!)), { hp: entry })) throw new Error('Invalid entry');
    if (b.level !== undefined && !isInt(b.level, 1, 99)) throw new Error('Invalid battle');
    battle = { kind: b.kind as ActiveBattle['kind'], encounterId: data.id, entry, commands: b.commands.map(command), ...(b.level !== undefined ? { level: b.level as number } : {}), ...(typeof source === 'string' ? { source } : {}) };
  }
  // Story recruits (v30): guests and this run's recruits are roster members from this map's recruit list, never both.
  const recruitIds = (v: unknown): string[] | undefined => {
    if (v === undefined) return undefined;
    const allowed = (map.recruits ?? []).map(r => r.hero).filter(id => [...roster.deployed, ...roster.reserve].includes(id));
    return idList(v, allowed);
  };
  const guests = recruitIds(s.guests), recruited = recruitIds(s.recruited);
  if (s.hard !== undefined && s.hard !== true) throw new Error('Invalid run');
  if (guests && recruited && guests.some(id => recruited.includes(id))) throw new Error('Invalid run');
  const state: ExpeditionState = {
    ...(guests ? { guests } : {}), ...(recruited ? { recruited } : {}), ...(s.hard === true ? { hard: true as const } : {}),
    ...(s.bossLoot===undefined?{}:{bossLoot:bossPlanOf(s.bossLoot,map)}),
    ...(s.hunt===undefined?{}:{hunt:huntPlan(s.hunt,map,lookup)}),
    mapId: map.id, mapVersion: map.version, seed: s.seed as number, rolls: s.rolls as number, position: point(s.position, map, true),
    steps: s.steps as number, pressure: s.pressure as number, revealed: s.revealed, roster, members, hp,
    camp: s.camp === null ? null : point(s.camp, map),
    resources: { ore: r.ore as number, gold: r.gold as number, ember: r.ember as number, seal: r.seal as number }, openedChests: [...s.openedChests as string[]], restReady: s.restReady as boolean,
    tutorialDone: s.tutorialDone as boolean, bossDefeated: s.bossDefeated as boolean,
    completed: s.completed as boolean, wins: s.wins as number, defeats: s.defeats as number, battle,
    found: foundOf(s.found, map, lookup), spare: spareOf(s.spare, map, lookup), dry: isInt(s.dry, 0, map.equipment.pity) ? s.dry : badRun(),
    potions: potionsOf(s.potions, map.potions.carry), repel: isInt(s.repel, 0, map.potions.repelSteps) ? s.repel : badRun(),
    elitesDefeated: idList(s.elitesDefeated, map.elites.map(e => e.id)), eventsDone: idList(s.eventsDone, map.events.map(e => e.id)),
    dust: isInt(s.dust, 0, 999999) ? s.dust : badRun(),
    ...puzzleState(s, map), herbs: idList(s.herbs, map.herbs.map(h => h.id)),
    visited: idList(s.visited, findTiles(map, 'camp').map(c => `${c.x},${c.y}`)), respawns: respawnsOf(s.respawns, map),
  };
  // Standing on a wall is only possible in an opened doorway or a secret passage; never inside a boulder or an open pit.
  if (tileAt(map, state.position)?.kind === 'wall' && !passableWall(state, map, state.position)) throw new Error('Invalid position');
  if (boulderAt(state, map, state.position) || openPit(state, map, state.position)) throw new Error('Invalid position');
  if (state.camp && tileAt(map, state.camp)?.kind !== 'camp') throw new Error('Invalid camp');
  // A battle can end on enemy opening turns before any command; apply it now.
  if (battle && battleState(state, map, lookup)!.outcome !== 'active') return finishBattle(state, map, lookup).state;
  return state;
}
function parseProfile(v: unknown, version: number, map: MapDefinition, lookup: EncounterLookup, maps: readonly MapDefinition[]): Profile {
  const p = obj(v);
  if (!isInt(p.seed, 0, 0xffffffff) || !isInt(p.returns) || !isInt(p.expeditions) || !isInt(p.completes) || typeof p.tutorialDone !== 'boolean') throw new Error('Invalid profile');
  const levels=map.equipment.forge.itemLevel, caps=[levels.baseCap,...levels.unlocks.map(u=>u.cap),...levels.clears.map(c=>c.cap)];
  if(version<23)p.forgeLevel=p.completes>0?Math.max(...caps):levels.baseCap;
  if(!caps.includes(p.forgeLevel as number))throw new Error('Invalid forge level');
  if(version<24){p.storageTier=0;p.overflow=[];}
  if(!isInt(p.storageTier,0,map.equipment.storage.costs.length)||!Array.isArray(p.overflow))throw new Error('Invalid storage');
  const overflow=p.overflow.map(i=>itemOf(i,map,lookup));
  if(version<25)p.hunt={pity:{}};
  const hunt=huntProfile(p.hunt,map,lookup);
  const company = p.company;
  if (!Array.isArray(company) || !company.length || company.length > COMPANY_CAP || new Set(company).size !== company.length
    || company.some(id => typeof id !== 'string' || !heroDef(lookup, map, id))) throw new Error('Invalid company');
  const party = rosterOf(p.party, lookup, map);
  if ([...party.deployed, ...party.reserve].some(id => !company.includes(id))) throw new Error('Invalid party');
  if(hunt.target&&!company.includes(hunt.target))throw new Error('Unowned hunt target');
  const members = membersOf(p.members, map, company as string[], lookup);
  const bank = obj(p.bank); if (version < 9) bank.dust = 0; if (version < 14 && bank.gold === undefined) bank.gold = map.company.hireCost;
  if (Object.keys(bank).length !== 4 || !isInt(bank.gold, 0, 9999999) || !isInt(bank.ore, 0, 9999999) || !isInt(bank.seal, 0, 99999) || !isInt(bank.dust, 0, 9999999)) throw new Error('Invalid bank');
  if (version < 9) Object.assign(p, { items: [], nextItem: 1 });
  if (version < 11) p.forge = 0;
  if (version < 12) p.potions = { salve: 0, tonic: 0, repel: 0 };
  if (version < 16) p.quests = {};
  if (version < 17) Object.assign(p, { shop: {}, refreshes: 0 });
  if (version < 18) p.smelted = 0;
  if (!isInt(p.smelted, 0, map.equipment.forge.smeltCap)) throw new Error('Invalid forge');
  const shop = shopOf(p.shop, map);
  if (!isInt(p.refreshes, 0, map.shop.refreshCosts.length)) throw new Error('Invalid board');
  const quests = questsOf(p.quests, map);
  if (!isInt(p.forge)) throw new Error('Invalid forge');
  if (!isInt(p.nextItem, 1) || !Array.isArray(p.items) || p.items.length > storageCap({storageTier:p.storageTier as number},map)) throw new Error('Invalid items');
  const items = p.items.map(i => itemOf(i, map, lookup));
  const uids = [...items,...overflow, ...Object.values(members).flatMap(m => Object.values(m.gear ?? {}))].map(i => i!.uid);
  if (new Set(uids).size !== uids.length || uids.some(u => u >= (p.nextItem as number))) throw new Error('Invalid items');
  if (!Array.isArray(p.taken) || new Set(p.taken).size !== p.taken.length || p.taken.some(i => !isInt(i, 0, map.company.offers - 1))) throw new Error('Invalid board');
  let last: Profile['last'] = null;
  if (p.last !== null) {
    const l = obj(p.last);
    if (version < 9) Object.assign(l, { items: 0, salvaged: 0 });
    if (version < 14 && l.gold === undefined) l.gold = 0;
    if (!['complete', 'withdrawn', 'wiped'].includes(l.outcome as string) || !isInt(l.ore) || !isInt(l.gold) || !isInt(l.seal) || !isInt(l.steps) || !isInt(l.wins) || !isInt(l.items) || !isInt(l.salvaged)) throw new Error('Invalid result');
    last = { outcome: l.outcome as RunOutcome, ore: l.ore, gold: l.gold as number, seal: l.seal, steps: l.steps, wins: l.wins, items: l.items, salvaged: l.salvaged };
  }
  let commander: Profile['commander'] = null;
  if (p.commander !== null && p.commander !== undefined) {
    const c = obj(p.commander);
    if (version < 29 && typeof c.name === 'string' && c.camp === undefined) c.camp = defaultCamp(c.name);
    if (Object.keys(c).length !== 4 || typeof c.name !== 'string' || typeof c.crest !== 'string' || typeof c.color !== 'string' || typeof c.camp !== 'string') throw new Error('Invalid commander');
    commander = { name: c.name, crest: c.crest, color: c.color, camp: c.camp };
    if (commanderReason(commander)) throw new Error('Invalid commander');
  } else if (p.commander === undefined && version >= 6) throw new Error('Invalid commander');
  const cleared = version < 28 ? legacyCleared(p.tutorialDone === true, (p.completes as number) > 0, map, maps) : clearedList(p.cleared, maps);
  const bossLoot=bossProfileOf(p.bossLoot,map,maps);
  if (p.veteran !== undefined && p.veteran !== true) throw new Error('Invalid profile');
  let guides: Profile['guides'];
  if (p.guides !== undefined) {
    const g = obj(p.guides); const ids = map.guides.map(x => x.id);
    if (Object.entries(g).some(([id, v]) => !ids.includes(id) || (v !== 'claimed' && v !== 'skipped'))) throw new Error('Invalid guides');
    guides = { ...g } as Profile['guides'];
  }
  const veteran = p.veteran === true || (version < 31 && p.tutorialDone === true);
  const clearedHard = p.clearedHard === undefined ? undefined : clearedList(p.clearedHard, maps);
  if (clearedHard?.some(id => !cleared.includes(id))) throw new Error('Invalid profile');
  return {...(clearedHard ? { clearedHard } : {}),...(guides ? { guides } : {}),...(veteran ? { veteran: true as const } : {}),bossLoot,hunt,overflow,storageTier:p.storageTier as number, forgeLevel:p.forgeLevel as number, seed: p.seed, returns: p.returns, tutorialDone: p.tutorialDone, commander, company: [...company as string[]], members, party, cleared,
    bank: { ore: bank.ore as number, gold: bank.gold as number, seal: bank.seal as number, dust: bank.dust as number }, items, nextItem: p.nextItem as number, forge: p.forge as number, potions: potionsOf(p.potions, 9999), quests, shop, refreshes: p.refreshes as number, smelted: p.smelted as number, taken: [...p.taken as number[]], expeditions: p.expeditions, completes: p.completes, last };
}
// Optional elite returns (4C): known optional elites only, 1..99 each.
function respawnsOf(v: unknown, map: MapDefinition): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(obj(v))) {
    if (!map.elites.some(e => e.id === id && !e.forced && !e.mini) || !isInt(n, 1, 99)) throw new Error('Invalid run');
    out[id] = n;
  }
  return out;
}
// Market purchases this return (4A): known items only, within each limit.
function shopOf(v: unknown, map: MapDefinition): Profile['shop'] {
  const out: Profile['shop'] = {};
  for (const [id, n] of Object.entries(obj(v))) {
    const def = map.shop.items[id as ShopItemId];
    if (!def || !(SHOP_ITEMS as readonly string[]).includes(id) || !isInt(n, 1, def.limit)) throw new Error('Invalid shop');
    out[id as ShopItemId] = n;
  }
  return out;
}
// Side-quest progress: known quests only, progress within the target, claimed only when complete.
function questsOf(v: unknown, map: MapDefinition): Profile['quests'] {
  const out: Profile['quests'] = {};
  for (const [id, raw] of Object.entries(obj(v))) {
    const q = map.sideQuests.find(s => s.id === id); const e = obj(raw);
    if (!q || Object.keys(e).length !== 2 || !isInt(e.progress, 0, q.target) || typeof e.claimed !== 'boolean' || (e.claimed && e.progress !== q.target)) throw new Error('Invalid quests');
    out[id] = { progress: e.progress, claimed: e.claimed };
  }
  return out;
}
// A run that already reached the goal or lost every brought member is settled on load.
function settleFinished(game: Game, map: MapDefinition): Game {
  const run = game.run; if (!run) return game;
  if (run.completed) return { profile: settle(game.profile, run, 'complete', map), run: null };
  if (!run.battle && rosterIds(run).every(id => run.hp[id] === 0)) return { profile: settle(game.profile, run, 'wiped', map), run: null };
  return game;
}
// v20 → v21: rewrites every item in the envelope (bag, worn, found, spare) to the stats-design affix pools.
function migrateItems(v: unknown, map: MapDefinition): void {
  if (Array.isArray(v)) { v.forEach(x => migrateItems(x, map)); return; }
  if (!v || typeof v !== 'object') return;
  const o = v as Record<string, unknown>;
  if (typeof o.slot === 'string' && Array.isArray(o.affixes) && (GEAR_SLOTS as readonly string[]).includes(o.slot)) {
    const pool = affixPool(map.equipment, o.slot as GearSlot, typeof o.hero === 'string' ? o.hero : undefined); const out: string[] = [];
    for (const a of o.affixes as unknown[]) {
      const named = a === 'skill' || a === 'heal' ? 'support' : a;
      out.push(typeof named === 'string' && pool.includes(named as GearStat) && !out.includes(named) ? named : pool.find(p => !out.includes(p) && !(o.affixes as unknown[]).includes(p)) ?? pool.find(p => !out.includes(p)) ?? String(named));
    }
    o.affixes = out; return;
  }
  for (const x of Object.values(o)) migrateItems(x, map);
}
// Companies saved before the chapters: the maps before `map` (the frontier) count as cleared once the prologue is
// done, and the frontier itself once an expedition was completed.
function legacyCleared(tutorialDone: boolean, completed: boolean, map: MapDefinition, maps: readonly MapDefinition[]): string[] {
  const at = maps.findIndex(m => m.id === map.id);
  return [...(tutorialDone ? maps.slice(0, Math.max(0, at)).map(m => m.id) : []), ...(completed ? [map.id] : [])];
}
// v34 (A6): refund small-tree ranks of classes that now have a big tree and grant the nodes their stars unlocked.
// A run whose member's ranks were refunded is marked stale so it settles home instead of replaying a changed hero.
function migrateTrees(envelope: Record<string, unknown>, maps: readonly MapDefinition[]): void {
  const tree = (id: string) => maps.map(m => m.talents[id]).find(t => isBigTree(t));
  const fix = (members: unknown): boolean => {
    let refunded = false;
    for (const [id, raw] of Object.entries(members && typeof members === 'object' ? members as Record<string, Record<string, unknown>> : {})) {
      const t = tree(id); if (!t || !raw || typeof raw !== 'object') continue;
      if ('talents' in raw) { delete raw.talents; refunded = true; }
      const stars = typeof raw.stars === 'number' ? raw.stars : 1;
      const grants = t.filter(n => n.legacyStars !== undefined && stars >= n.legacyStars).map(n => n.id);
      if (grants.length) raw.grants = grants;
    }
    return refunded;
  };
  const p = envelope.profile as Record<string, unknown> | undefined; if (p && typeof p === 'object') fix(p.members);
  const r = envelope.run as Record<string, unknown> | null | undefined;
  if (r && typeof r === 'object' && fix(r.members)) r.mapVersion = -1;
}
// `map` is the home map (the frontier); `maps` lists every map a run may have been started on.
export function parseGame(raw: string, map: MapDefinition, lookup: EncounterLookup, maps: readonly MapDefinition[] = [map]): Game {
  const envelope = obj(JSON.parse(raw)); const version = envelope.version as number;
  if (version < 21) migrateItems(envelope, map);
  if (version < 34) migrateTrees(envelope, maps.length ? maps : [map]);
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, SAVE_VERSION].includes(version)) throw new Error('Unsupported save version');
  const runMap = (v: unknown): MapDefinition => maps.find(m => m.id === obj(v).mapId) ?? map;
  if (version < 5) {
    const home = runMap(envelope.state); const run = parseRun(envelope.state, version, home, lookup);
    const profile = newProfile(map, (run.seed ^ 0x5bd1e995) >>> 0);
    profile.company = rosterIds(run); profile.members = structuredClone(run.members); profile.party = structuredClone(run.roster);
    profile.tutorialDone = run.tutorialDone; profile.cleared = legacyCleared(run.tutorialDone, false, map, maps);
    return settleFinished({ profile, run }, home);
  }
  const profile = parseProfile(envelope.profile, version, map, lookup, maps);
  const home = envelope.run === null ? map : runMap(envelope.run);
  let run: ExpeditionState | null;
  try { run = envelope.run === null ? null : parseRun(envelope.run, version, home, lookup); } catch (e) {
    if (!(e instanceof StaleRun)) throw e;
    if (rosterIds(e.run).some(id => !profile.company.includes(id) && !travelling(e.run, id))) throw new Error('Run member left the company', { cause: e });
    if (!ownItemsMatch(profile, e.run)) throw new Error('Run items do not match the company', { cause: e });
    return { profile: settle(profile, e.run, 'withdrawn', home), run: null };
  }
  if (run && rosterIds(run).some(id => !profile.company.includes(id) && !travelling(run, id))) throw new Error('Run member left the company');
  if (run && [...run.guests ?? [], ...run.recruited ?? []].some(id => profile.company.includes(id))) throw new Error('Guest already in the company');
  if(run?.hunt&&run.hunt.target!==profile.hunt?.target)throw new Error('Hunt target mismatch');
  if(run?.hunt?.target&&!profile.company.includes(run.hunt.target))throw new Error('Unowned hunt target');
  if(run?.bossLoot){const before=startBossPlan(profile,home),now=run.bossLoot;
    if(now.target!==before.target||(!run.bossDefeated&&(now.misses!==before.misses||now.rewarded!==before.rewarded))||(run.bossDefeated&&(!now.rewarded||(now.misses!==0&&now.misses!==before.misses+1))))throw new Error('Boss progress mismatch');
  }
  if (run && !ownItemsMatch(profile, run)) throw new Error('Run items do not match the company');
  return settleFinished({ profile, run }, home);
}
export function loadGame(storage: StoragePort | undefined, map: MapDefinition, lookup: EncounterLookup, maps: readonly MapDefinition[] = [map]): Game | undefined {
  try {
    const raw = storage?.getItem(expeditionKey);
    return raw ? parseGame(raw, map, lookup, maps) : undefined;
  } catch { return undefined; }
}

function bossPlanOf(v:unknown,map:MapDefinition):NonNullable<ExpeditionState['bossLoot']> {
  if(!bossPlanValid(v,map))throw new Error('Invalid boss plan');return structuredClone(v);
}
// Boss charm progress is kept per boss: the home map's boss and every map that pays the charm.
function bossProfileOf(v:unknown,home:MapDefinition,maps:readonly MapDefinition[]):NonNullable<Profile['bossLoot']> {
  if(v===undefined)return {};const raw=obj(v),out:NonNullable<Profile['bossLoot']>={};
  for(const [boss,progress]of Object.entries(raw)){const p=obj(progress);const map=[home,...maps.filter(m=>m.bossCharm)].find(m=>m.bossEncounterId===boss);if(!map||Object.keys(p).length!==3)throw new Error('Invalid boss progress');
    const plan=bossPlanOf({version:1,boss,...p},map);out[boss]={target:plan.target,misses:plan.misses,rewarded:plan.rewarded};}
  return out;
}
function huntProfile(v:unknown,map:MapDefinition,lookup:EncounterLookup):NonNullable<Profile['hunt']> {
  const h=obj(v),pity=obj(h.pity),ids=heroCatalog(lookup,map).map(h=>h.id);
  if(Object.keys(h).some(k=>!['target','pity'].includes(k))||(h.target!==undefined&&(typeof h.target!=='string'||!ids.includes(h.target))))throw new Error('Invalid hunt');
  for(const [id,n] of Object.entries(pity))if(!ids.includes(id)||!isInt(n,0,map.equipment.hunt.pityDrops-1))throw new Error('Invalid hunt pity');
  return {pity:{...pity} as Record<string,number>,...(h.target?{target:h.target as string}:{})};
}
function huntPlan(v:unknown,map:MapDefinition,lookup:EncounterLookup):NonNullable<ExpeditionState['hunt']> {
  const p=obj(v),h=huntProfile({target:p.target,pity:{}},map,lookup);
  if(Object.keys(p).some(k=>!['target','misses'].includes(k))||!isInt(p.misses,0,map.equipment.hunt.pityDrops-1)||(!h.target&&p.misses!==0))throw new Error('Invalid hunt plan');
  return {misses:p.misses,...(h.target?{target:h.target}:{})};
}
