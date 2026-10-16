import { entryReason, withParty } from '../battle/engine';
import type { ActionId, Command } from '../battle/types';
import { COMPANY_CAP, PARTY_SLOTS, RESERVE_SLOTS, type ActiveBattle, type ExpeditionState, type MapDefinition, type Point, type Profile, type Roster, type RunOutcome } from '../world/types';
import { battleState, expToNext, finishBattle, fullParty, heroCatalog, heroDef, memberDef, rosterIds, tileAt, type EncounterLookup } from '../world/world';
import { itemValid } from '../world/equipment';
import { commanderReason, newProfile, settle, talentsValid } from '../world/profile';
import type { Item, MemberProgress, Talents } from '../world/types';

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
const SAVE_VERSION = 11;
export interface Game { profile: Profile; run: ExpeditionState | null }
const actions: readonly ActionId[] = ['attack', 'guard', 'bash', 'mark', 'execute', 'bolt', 'ward', 'heal', 'prayer', 'brace', 'pierce', 'hinder', 'volley', 'acid', 'haste', 'ambush', 'evade', 'taunt', 'slam', 'valor', 'mend',
  'rally', 'finisher', 'sigil', 'sanctuary', 'spearwall', 'weakshot', 'bomb', 'backstab', 'quake', 'finale'];

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
function itemOf(v: unknown, map: MapDefinition, lookup: EncounterLookup, found = false): Item {
  const i = structuredClone(obj(v)) as unknown as Item;
  if (!itemValid(map, i, heroCatalog(lookup, map).map(h => h.id), found)) throw new Error('Invalid item');
  return i;
}
function membersOf(v: unknown, map: MapDefinition, ids: readonly string[], lookup: EncounterLookup): Record<string, MemberProgress> {
  const raw = obj(v);
  if (Object.keys(raw).length !== ids.length) throw new Error('Invalid members');
  return Object.fromEntries(ids.map(id => {
    const m = obj(raw[id]); const keys = Object.keys(m);
    if (keys.some(k => !['stars', 'dupes', 'level', 'exp', 'talents', 'gear'].includes(k)) || ('level' in m) !== ('exp' in m)) throw new Error('Invalid members');
    if (!isInt(m.stars, 1, map.company.maxStars) || !isInt(m.dupes, 0, 99)) throw new Error('Invalid members');
    const out: MemberProgress = { stars: m.stars, dupes: m.dupes };
    if ('level' in m) {
      if (!isInt(m.level, 1, map.progression.levelCap) || !isInt(m.exp, 0, expToNext(map, m.level) - 1)) throw new Error('Invalid members');
      Object.assign(out, { level: m.level, exp: m.exp });
    }
    if ('talents' in m) {
      const t = obj(m.talents) as Talents;
      if (!Object.keys(t).length || !talentsValid(map, id, out.level ?? 1, t)) throw new Error('Invalid talents');
      out.talents = { ...t };
    }
    if ('gear' in m) {
      const g = obj(m.gear) as Record<string, unknown>;
      if (!Object.keys(g).length) throw new Error('Invalid gear');
      out.gear = {};
      for (const [slot, raw] of Object.entries(g)) {
        const item = itemOf(raw, map, lookup);
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
function foundOf(v: unknown, map: MapDefinition, lookup: EncounterLookup): Item[] {
  if (!Array.isArray(v) || v.length > 99) throw new Error('Invalid found');
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
  if (s.mapId !== map.id || s.mapVersion !== map.version) throw new Error('Map changed');
  const cells = map.rows.length * map.rows[0]!.length;
  if (typeof s.revealed !== 'string' || s.revealed.length !== cells || /[^01]/.test(s.revealed)) throw new Error('Invalid fog');
  for (const key of ['tutorialDone', 'bossDefeated', 'completed', 'restReady'] as const) if (typeof s[key] !== 'boolean') throw new Error('Invalid flag');
  if (!isInt(s.seed, 0, 0xffffffff) || !isInt(s.rolls) || !isInt(s.steps) || !isInt(s.pressure, 0, 100) || !isInt(s.wins) || !isInt(s.defeats)) throw new Error('Invalid counters');
  const roster = rosterOf(s.roster, lookup, map);
  const ids = [...roster.deployed, ...roster.reserve];
  const members = membersOf(s.members, map, ids, lookup);
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
    // Validate against the encounter as fought by this run's deployed party (stars included).
    if (entryReason(withParty(data, roster.deployed.map(id => memberDef(lookup, map, members, id)!)), { hp: entry })) throw new Error('Invalid entry');
    if (b.level !== undefined && !isInt(b.level, 1, 99)) throw new Error('Invalid battle');
    battle = { kind: b.kind as ActiveBattle['kind'], encounterId: data.id, entry, commands: b.commands.map(command), ...(b.level !== undefined ? { level: b.level as number } : {}) };
  }
  const state: ExpeditionState = {
    mapId: map.id, mapVersion: map.version, seed: s.seed as number, rolls: s.rolls as number, position: point(s.position, map),
    steps: s.steps as number, pressure: s.pressure as number, revealed: s.revealed, roster, members, hp,
    camp: s.camp === null ? null : point(s.camp, map),
    resources: { ore: r.ore as number, ember: r.ember as number, seal: r.seal as number }, openedChests: [...s.openedChests as string[]], restReady: s.restReady as boolean,
    tutorialDone: s.tutorialDone as boolean, bossDefeated: s.bossDefeated as boolean,
    completed: s.completed as boolean, wins: s.wins as number, defeats: s.defeats as number, battle,
    found: foundOf(s.found, map, lookup), dry: isInt(s.dry, 0, map.equipment.pity) ? s.dry : badRun(),
  };
  if (state.camp && tileAt(map, state.camp)?.kind !== 'camp') throw new Error('Invalid camp');
  // A battle can end on enemy opening turns before any command; apply it now.
  if (battle && battleState(state, map, lookup)!.outcome !== 'active') return finishBattle(state, map, lookup).state;
  return state;
}
function parseProfile(v: unknown, version: number, map: MapDefinition, lookup: EncounterLookup): Profile {
  const p = obj(v);
  if (!isInt(p.seed, 0, 0xffffffff) || !isInt(p.returns) || !isInt(p.expeditions) || !isInt(p.completes) || typeof p.tutorialDone !== 'boolean') throw new Error('Invalid profile');
  const company = p.company;
  if (!Array.isArray(company) || !company.length || company.length > COMPANY_CAP || new Set(company).size !== company.length
    || company.some(id => typeof id !== 'string' || !heroDef(lookup, map, id))) throw new Error('Invalid company');
  const party = rosterOf(p.party, lookup, map);
  if ([...party.deployed, ...party.reserve].some(id => !company.includes(id))) throw new Error('Invalid party');
  const members = membersOf(p.members, map, company as string[], lookup);
  const bank = obj(p.bank); if (version < 9) bank.dust = 0;
  if (Object.keys(bank).length !== 3 || !isInt(bank.ore, 0, 9999999) || !isInt(bank.seal, 0, 99999) || !isInt(bank.dust, 0, 9999999)) throw new Error('Invalid bank');
  if (version < 9) Object.assign(p, { items: [], nextItem: 1 });
  if (version < 11) p.forge = 0;
  if (!isInt(p.forge)) throw new Error('Invalid forge');
  if (!isInt(p.nextItem, 1) || !Array.isArray(p.items) || p.items.length > map.equipment.bagCap) throw new Error('Invalid items');
  const items = p.items.map(i => itemOf(i, map, lookup));
  const uids = [...items, ...Object.values(members).flatMap(m => Object.values(m.gear ?? {}))].map(i => i!.uid);
  if (new Set(uids).size !== uids.length || uids.some(u => u >= (p.nextItem as number))) throw new Error('Invalid items');
  if (!Array.isArray(p.taken) || new Set(p.taken).size !== p.taken.length || p.taken.some(i => !isInt(i, 0, map.company.offers - 1))) throw new Error('Invalid board');
  let last: Profile['last'] = null;
  if (p.last !== null) {
    const l = obj(p.last);
    if (version < 9) Object.assign(l, { items: 0, salvaged: 0 });
    if (!['complete', 'withdrawn', 'wiped'].includes(l.outcome as string) || !isInt(l.ore) || !isInt(l.seal) || !isInt(l.steps) || !isInt(l.wins) || !isInt(l.items) || !isInt(l.salvaged)) throw new Error('Invalid result');
    last = { outcome: l.outcome as RunOutcome, ore: l.ore, seal: l.seal, steps: l.steps, wins: l.wins, items: l.items, salvaged: l.salvaged };
  }
  let commander: Profile['commander'] = null;
  if (p.commander !== null && p.commander !== undefined) {
    const c = obj(p.commander);
    if (Object.keys(c).length !== 3 || typeof c.name !== 'string' || typeof c.crest !== 'string' || typeof c.color !== 'string') throw new Error('Invalid commander');
    commander = { name: c.name, crest: c.crest, color: c.color };
    if (commanderReason(commander)) throw new Error('Invalid commander');
  } else if (p.commander === undefined && version >= 6) throw new Error('Invalid commander');
  return { seed: p.seed, returns: p.returns, tutorialDone: p.tutorialDone, commander, company: [...company as string[]], members, party,
    bank: { ore: bank.ore as number, seal: bank.seal as number, dust: bank.dust as number }, items, nextItem: p.nextItem as number, forge: p.forge as number, taken: [...p.taken as number[]], expeditions: p.expeditions, completes: p.completes, last };
}
// A run that already reached the goal or lost every brought member is settled on load.
function settleFinished(game: Game, map: MapDefinition): Game {
  const run = game.run; if (!run) return game;
  if (run.completed) return { profile: settle(game.profile, run, 'complete', map), run: null };
  if (!run.battle && rosterIds(run).every(id => run.hp[id] === 0)) return { profile: settle(game.profile, run, 'wiped', map), run: null };
  return game;
}
export function parseGame(raw: string, map: MapDefinition, lookup: EncounterLookup): Game {
  const envelope = obj(JSON.parse(raw)); const version = envelope.version as number;
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, SAVE_VERSION].includes(version)) throw new Error('Unsupported save version');
  if (version < 5) {
    const run = parseRun(envelope.state, version, map, lookup);
    const profile = newProfile(map, (run.seed ^ 0x5bd1e995) >>> 0);
    profile.company = rosterIds(run); profile.members = structuredClone(run.members); profile.party = structuredClone(run.roster);
    profile.tutorialDone = run.tutorialDone;
    return settleFinished({ profile, run }, map);
  }
  const profile = parseProfile(envelope.profile, version, map, lookup);
  const run = envelope.run === null ? null : parseRun(envelope.run, version, map, lookup);
  if (run && rosterIds(run).some(id => !profile.company.includes(id))) throw new Error('Run member left the company');
  return settleFinished({ profile, run }, map);
}
export function loadGame(storage: StoragePort | undefined, map: MapDefinition, lookup: EncounterLookup): Game | undefined {
  try {
    const raw = storage?.getItem(expeditionKey);
    return raw ? parseGame(raw, map, lookup) : undefined;
  } catch { return undefined; }
}
