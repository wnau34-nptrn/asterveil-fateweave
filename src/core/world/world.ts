import { replay, withLevel, withParty } from '../battle/engine';
import { boulderAt, leverPuzzleAt, openPit, passableWall, runePuzzleAt, secretAt } from './puzzles';
import type { BattleState, Command, EncounterDefinition, HeroDefinition, HeroTalents } from '../battle/types';
import type { ActiveBattle, BattleKind, ChestDefinition, Company, Direction, ExpGain, ExpeditionState, LootTable, MapDefinition, MemberProgress, Point, PotionId, Resources, Talents, Tile, WorldEvent, WorldResult, ZoneDefinition, Gear, Item, EliteDefinition, EventChoice, MapEventDefinition, MapEventKind, GearSlot } from './types';
import { gearTotals, rollItem } from './equipment';
import { memberTalentReason } from './talents';
import type { TalentNode } from './types';
import { PARTY_SLOTS, POTION_IDS, RESERVE_SLOTS, SET_IDS } from './types';

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
  // A repel potion stops random encounters while it lasts.
  const zone = state.repel > 0 ? undefined : rollingZone(map, p);
  return zone ? Math.min(zone.cap, zone.base + state.pressure) : 0;
}
export function reveal(state: ExpeditionState, map: MapDefinition): void {
  const width = map.rows[0]!.length; const cells = [...state.revealed]; const r = map.revealRadius;
  for (let y = state.position.y - r; y <= state.position.y + r; y++) for (let x = state.position.x - r; x <= state.position.x + r; x++) {
    if (y >= 0 && y < map.rows.length && x >= 0 && x < width) cells[y * width + x] = '1';
  }
  state.revealed = cells.join('');
}
// Hero definitions available to the company: the teaching encounter's party plus the map's
// hireable mercenaries (a test can also extend the teaching party through the lookup).
export function heroCatalog(lookup: EncounterLookup, map: MapDefinition): readonly HeroDefinition[] {
  const base = lookup(map.tutorialEncounterId)!.heroes;
  return [...base, ...map.mercenaries.filter(m => !base.some(h => h.id === m.id))];
}
export function heroDef(lookup: EncounterLookup, map: MapDefinition, id: string): HeroDefinition | undefined {
  return heroCatalog(lookup, map).find(h => h.id === id);
}
export const rosterIds = (state: ExpeditionState): string[] => [...state.roster.deployed, ...state.roster.reserve];
// Each star above ★1 adds `starStatPercent` to max HP, Attack and skill power. SPD never
// changes, so stars cannot reorder turns. Talents (2D-1b) add their stat percents and build
// `talents` for the resolver; no talents leaves the definition unchanged.
export function starred(base: HeroDefinition, stars: number, map: MapDefinition, level = 1, talents: Talents = {}, gear?: Gear): HeroDefinition {
  // Stars and levels add up: each star `starStatPercent`, each level above 1 `levelStatPercent`.
  const bonus = (stars - 1) * map.company.starStatPercent + (level - 1) * map.progression.levelStatPercent;
  const gained = talentEffects(map, base.id, talents);
  // Equipment adds flat max HP and SPD, and Attack/Support/HP percents on top of stars, levels and talents
  // (stats design 2026-10-17); Armour, Resistance and Leech go to the battle as they are.
  const worn = gearTotals(map, gear);
  const equipped = !!(worn.hp || worn.hpPercent || worn.attackPercent || worn.support || worn.speed || worn.armour || worn.resist || worn.leech || worn.gear);
  if (!bonus && !gained.any && !equipped) return base;
  const scale = (n: number, extra: number) => Math.round(n * (100 + bonus + extra) / 100);
  // ★3 adds the class's third skill; ★5 switches on its passive.
  const skill = stars >= 3 && base.unlocks && !base.actions.includes(base.unlocks.skill) ? [base.unlocks.skill] : [];
  // Damaging skills grow by the same Attack percent as the basic attack.
  const damageBonus = bonus + gained.attack + worn.attackPercent;
  return { ...base, maxHp: scale(base.maxHp, gained.hp + worn.hpPercent) + worn.hp, attack: scale(base.attack, damageBonus - bonus), speed: base.speed + worn.speed,
    skillBonus: bonus + gained.skill + worn.support, damageBonus, actions: [...base.actions, ...skill],
    ...(worn.armour ? { armour: worn.armour } : {}), ...(worn.resist ? { resist: worn.resist } : {}), ...(worn.leech ? { leech: worn.leech } : {}),
    ...(stars >= 5 && base.unlocks ? { passive: base.unlocks.passive } : {}), ...(gained.talents ? { talents: gained.talents } : {}), ...(worn.gear ? { gear: worn.gear } : {}) };
}
// Sums spent talent ranks into stat percents and the resolver's `HeroTalents`.
export function talentEffects(map: MapDefinition, heroId: string, talents: Talents): { any: boolean; hp: number; attack: number; skill: number; talents?: HeroTalents } {
  const out = { any: false, hp: 0, attack: 0, skill: 0 }; const t: HeroTalents = {};
  for (const node of map.talents[heroId] ?? []) {
    const ranks = talents[node.id] ?? 0; if (!ranks) continue;
    const e = node.effect; out.any = true;
    if ('stat' in e) out[e.stat] += e.percent * ranks;
    else if ('power' in e) (t.power ??= {})[e.power] = (t.power[e.power] ?? 0) + e.amount * ranks;
    else if ('rule' in e) (t.rules ??= {})[e.rule] = Math.round(((t.rules[e.rule] ?? 0) + e.amount * ranks) * 100) / 100;
    else (t.caps ??= {})[e.cap] = e.amount ?? 0;
  }
  return Object.keys(t).length ? { ...out, talents: t } : out;
}
export function memberDef(lookup: EncounterLookup, map: MapDefinition, members: ExpeditionState['members'], id: string): HeroDefinition | undefined {
  const base = heroDef(lookup, map, id);
  return base && wounded(starred(base, members[id]?.stars ?? 1, map, members[id]?.level ?? 1, members[id]?.talents, members[id]?.gear), members[id]?.wound);
}
// ---- Levels (2D-1) ----
export const levelOf = (m: MemberProgress | undefined): number => m?.level ?? 1;
// EXP needed to go from `level` to the next one.
export const expToNext = (map: MapDefinition, level: number): number => map.progression.nextBase + map.progression.nextPerLevel * level;
// Monster level of a floor tile: the zone's low end at its southern (entrance) rows, rising to the high end in the north.
export function monsterLevelAt(map: MapDefinition, p: Point): number | undefined {
  const tile = tileAt(map, p); const zone = tile && zoneOf(map, tile.zoneId); if (!zone?.levels) return undefined;
  const ys = map.rows.flatMap((_, y) => map.rows[y]!.split('').some((_, x) => tileAt(map, { x, y })?.zoneId === zone.id) ? [y] : []);
  const [lo, hi] = zone.levels; const top = Math.min(...ys), bottom = Math.max(...ys);
  return bottom === top ? lo : lo + Math.round((bottom - p.y) / (bottom - top) * (hi - lo));
}
// EXP multiplier by how far a member's level is above the monster's (never zero), with a bonus for fighting up.
export function expPercent(memberLevel: number, monsterLevel: number): number {
  const gap = memberLevel - monsterLevel;
  return gap <= -3 ? 110 : gap <= 2 ? 100 : gap === 3 ? 75 : gap === 4 ? 50 : gap === 5 ? 25 : 10;
}
// Max HP for the given members (default: the starting roster at ★1).
export function fullParty(lookup: EncounterLookup, map: MapDefinition, ids?: readonly string[], members: ExpeditionState['members'] = {}): Record<string, number> {
  return Object.fromEntries((ids ?? map.startingRoster).map(id => [id, memberDef(lookup, map, members, id)!.maxHp]));
}
// An expedition starts with the team brought from the lobby (roster + their stars) at full HP.
export function newExpedition(map: MapDefinition, lookup: EncounterLookup, seed: number, company?: Company, tutorialDone = false): ExpeditionState {
  const width = map.rows[0]!.length;
  const roster = company ? structuredClone(company.roster) : { deployed: [...map.startingRoster], reserve: [] };
  const members = company ? structuredClone(company.members) : Object.fromEntries(map.startingRoster.map(id => [id, { stars: 1, dupes: 0 }]));
  const state: ExpeditionState = {
    mapId: map.id, mapVersion: map.version, seed: seed >>> 0, rolls: 0, position: startOf(map), steps: 0, pressure: 0,
    revealed: '0'.repeat(width * map.rows.length), roster, members,
    hp: fullParty(lookup, map, [...roster.deployed, ...roster.reserve], members), camp: null,
    resources: { ore: 0, gold: 0, ember: 0, seal: 0 }, openedChests: [], restReady: true,
    tutorialDone, bossDefeated: false, completed: false, wins: 0, defeats: 0, battle: null, found: [], dry: 0,
    potions: company?.potions ? { ...company.potions } : { salve: 0, tonic: 0, repel: 0 }, repel: 0,
    elitesDefeated: [], eventsDone: [], dust: 0, herbs: [], visited: [], respawns: {}, spare: [],
    runes: {}, solved: [], levers: [], boulders: {}, secrets: [],
  };
  reveal(state, map);
  return state;
}
const startBattle = (state: ExpeditionState, kind: BattleKind, encounterId: string, level?: number, source?: string): ActiveBattle =>
  ({ kind, encounterId, entry: Object.fromEntries(state.roster.deployed.map(id => [id, state.hp[id]!])), commands: [], ...(level ? { level } : {}), ...(source ? { source } : {}) });
// Prologue (lore 2026-10-16): on a company's first expedition, Vargoth's vanguard attacks at the start tile
// before the first step. The battle is the ordinary tutorial battle; old saves still meet it on the first step.
export function startPrologue(initial: ExpeditionState, map: MapDefinition): WorldResult {
  if (initial.tutorialDone || initial.battle || initial.completed || initial.steps > 0) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  state.battle = startBattle(state, 'tutorial', map.tutorialEncounterId);
  return { state, event: { type: 'encounter', kind: 'tutorial', encounterId: map.tutorialEncounterId, chance: 100 } };
}
// ---- Phase 3A: elites and events ----
// An elite that can be walked around (not `forced`) pays the richer optional-elite reward.
export const optionalElite = (map: MapDefinition, source?: string): boolean => map.elites.some(e => e.id === source && !e.forced && !e.mini);
export const miniBoss = (map: MapDefinition, source?: string): boolean => map.elites.some(e => e.id === source && e.mini);
// The rift seal (3B): which objectives this run has done, and whether enough are done to face the boss.
export function questDone(state: ExpeditionState, map: MapDefinition): string[] {
  return map.quest.objectives.filter(o => o.kind === 'chests' ? state.openedChests.length >= o.count
    : o.kind === 'elite' ? state.elitesDefeated.includes(o.target) : state.eventsDone.includes(o.target)).map(o => o.id);
}
export const questComplete = (state: ExpeditionState, map: MapDefinition): boolean => questDone(state, map).length >= map.quest.need;
// A shrine wound lowers max HP by a percent for the rest of the run.
export const wounded = (def: HeroDefinition, wound = 0): HeroDefinition => wound ? { ...def, maxHp: Math.max(1, Math.round(def.maxHp * (100 - wound) / 100)) } : def;
export const eliteAt = (map: MapDefinition, p: Point): EliteDefinition | undefined => map.elites.find(e => e.x === p.x && e.y === p.y);
export const eventAt = (map: MapDefinition, p: Point): MapEventDefinition | undefined => map.events.find(e => e.x === p.x && e.y === p.y);
// An unbeaten elite blocks its tile; an unfinished event is waiting on its tile.
export const eliteBlocks = (state: ExpeditionState, map: MapDefinition, p: Point): EliteDefinition | undefined => { const e = eliteAt(map, p); return e && !state.elitesDefeated.includes(e.id) ? e : undefined; };
export const pendingEvent = (state: ExpeditionState, map: MapDefinition, p: Point = state.position): MapEventDefinition | undefined => { const e = eventAt(map, p); return e && !state.eventsDone.includes(e.id) ? e : undefined; };

// `lookup` lets gear Trail regen heal on the step (stats design); without it the step heals nobody.
export function move(initial: ExpeditionState, map: MapDefinition, dir: Direction, lookup?: EncounterLookup): WorldResult {
  if (initial.battle || initial.completed) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const target = { x: initial.position.x + offsets[dir].x, y: initial.position.y + offsets[dir].y };
  const tile = tileAt(map, target);
  if (!tile) return { state: initial, event: { type: 'blocked', reason: 'edge' } };
  // 3C: opened puzzle doors and secret walls can be walked through; everything else that is '#' blocks.
  if (tile.kind === 'wall' && !passableWall(initial, map, target)) return { state: initial, event: { type: 'blocked', reason: 'wall' } };
  if (!initial.roster.deployed.some(id => initial.hp[id]! > 0)) return { state: initial, event: { type: 'blocked', reason: 'party' } };
  if (openPit(initial, map, target)) return { state: initial, event: { type: 'blocked', reason: 'pit' } };
  const state = structuredClone(initial);
  // A boulder in the way is pushed one tile in the walking direction: onto plain floor, or into its pit, which it fills.
  const boulder = boulderAt(state, map, target); let pushed: WorldEvent | undefined;
  if (boulder) {
    const next = { x: target.x + offsets[dir].x, y: target.y + offsets[dir].y }; const into = tileAt(map, next);
    const pit = boulder.pit.x === next.x && boulder.pit.y === next.y;
    const free = into?.kind === 'floor' && !boulderAt(state, map, next) && !openPit(state, map, next) && !eliteAt(map, next) && !eventAt(map, next) && !chestAt(map, next)
      && !runePuzzleAt(map, next) && !leverPuzzleAt(map, next);
    if (!pit && !free) return { state: initial, event: { type: 'blocked', reason: 'stone' } };
    if (pit) { state.solved.push(boulder.id); delete state.boulders[boulder.id]; } else state.boulders[boulder.id] = next;
    pushed = { type: 'pushed', puzzleId: boulder.id, filled: pit };
  }
  // The boss is visible and blocks its tile: stepping into it starts the fight in place.
  // Until the rift seal is broken (enough objectives), the boss cannot be challenged.
  if (tile.kind === 'boss' && !state.bossDefeated && !questComplete(state, map)) return { state: initial, event: { type: 'blocked', reason: 'sealed' } };
  if (tile.kind === 'boss' && !state.bossDefeated) {
    state.battle = startBattle(state, 'boss', map.bossEncounterId, map.bossLevel);
    return { state, event: { type: 'encounter', kind: 'boss', encounterId: map.bossEncounterId, chance: 100 } };
  }
  // An elite holds its gate the same way: stepping into it starts the fight; beaten, the gate is open for the run.
  const elite = eliteBlocks(state, map, target);
  if (elite) {
    state.battle = startBattle(state, 'elite', elite.encounterId, elite.level !== undefined ? elite.level + (state.respawns[elite.id] ?? 0) : undefined, elite.id);
    return { state, event: { type: 'encounter', kind: 'elite', encounterId: elite.encounterId, chance: 100 } };
  }
  state.position = target; state.steps++; reveal(state, map);
  if (lookup) trailRegen(state, map, lookup);
  // 3C: puzzle tiles answer instead of rolling an encounter on that step.
  if (pushed) return { state, event: pushed };
  // 3D: a glowing herb is picked up (once per run) instead of rolling an encounter.
  const herb = map.herbs.find(h => h.x === target.x && h.y === target.y);
  if (herb && !state.herbs.includes(herb.id)) { state.herbs.push(herb.id); return { state, event: { type: 'herb', herbId: herb.id } }; }
  const secret = secretAt(map, target);
  if (secret && !state.secrets.includes(secret.id)) { state.secrets.push(secret.id); return { state, event: { type: 'secret', secretId: secret.id } }; }
  const runes = runePuzzleAt(map, target);
  if (runes && !state.solved.includes(runes.id)) {
    // The right stone advances the sequence; a wrong one resets it (and counts as the first stone if it is the first).
    const index = runes.stones.findIndex(s => s.x === target.x && s.y === target.y); const at = state.runes[runes.id] ?? 0;
    const reset = index !== at; const step = reset ? (index === 0 ? 1 : 0) : at + 1;
    const solved = step >= runes.stones.length;
    if (solved) { state.solved.push(runes.id); delete state.runes[runes.id]; } else state.runes[runes.id] = step;
    return { state, event: { type: 'rune', puzzleId: runes.id, step, solved, reset } };
  }
  const levers = leverPuzzleAt(map, target);
  if (levers && !state.solved.includes(levers.id)) {
    const key = `${levers.id}:${levers.levers.findIndex(l => l.x === target.x && l.y === target.y)}`;
    if (!state.levers.includes(key)) {
      state.levers.push(key);
      const pulled = state.levers.filter(k => k.startsWith(`${levers.id}:`)).length; const solved = pulled >= levers.levers.length;
      if (solved) state.solved.push(levers.id);
      return { state, event: { type: 'lever', puzzleId: levers.id, pulled, solved } };
    }
  }
  // Reaching a camp makes it the defeat return point, whether or not the party rests.
  if (tile.kind === 'camp') { state.camp = { ...target }; if (!state.visited.includes(key(target))) state.visited.push(key(target)); }
  if (tile.kind === 'goal') { state.completed = true; return { state, event: { type: 'goal' } }; }
  // An event tile asks for a choice instead of rolling an encounter.
  const waiting = pendingEvent(state, map, target);
  if (waiting) return { state, event: { type: 'event', eventId: waiting.id } };
  const zone = rollingZone(map, target);
  if (!zone) return { state, event: { type: 'moved', chance: 0 } };
  // Each step through an encounter zone uses up one step of repel, with no roll and no pressure.
  if (state.repel > 0) { state.repel--; return { state, event: { type: 'moved', chance: 0 } }; }
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
    // Random encounters take the monster level of the tile; the tutorial and boss keep their own.
    state.battle = startBattle(state, kind, encounterId, kind === 'random' ? monsterLevelAt(map, target) : undefined);
    return { state, event: { type: 'encounter', kind, encounterId, chance } };
  }
  state.pressure = Math.min(zone.cap, state.pressure + zone.step);
  return { state, event: { type: 'moved', chance } };
}

export const atCamp = (state: ExpeditionState, map: MapDefinition): boolean =>
  !state.battle && !state.completed && tileAt(map, state.position)?.kind === 'camp';
// Camps and the map entrance are muster points: the brought team can be rearranged there
// and the expedition can be left (withdrawn) to return to the lobby.
export const atMuster = (state: ExpeditionState, map: MapDefinition): boolean =>
  !state.battle && !state.completed && ['camp', 'start'].includes(tileAt(map, state.position)?.kind ?? '');
export function canRest(state: ExpeditionState, map: MapDefinition): boolean { return atCamp(state, map) && state.restReady; }
const percentOf = (max: number, percent: number) => Math.max(1, Math.ceil(max * percent / 100));
// A rest heals standing members by a share of max HP; the fallen need an ember each.
export function rest(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): WorldResult {
  if (!canRest(initial, map)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial); const full = fullParty(lookup, map, rosterIds(state), state.members);
  for (const [id, max] of Object.entries(full)) if (state.hp[id]! > 0) state.hp[id] = Math.min(max, state.hp[id]! + percentOf(max, map.camp.restHealPercent));
  state.pressure = 0; state.camp = { ...state.position }; state.restReady = false;
  // 4C: beaten optional elites (not gate guards, not the mini-boss) return after a rest, one level higher.
  const respawned = map.elites.filter(e => !e.forced && !e.mini && state.elitesDefeated.includes(e.id)).map(e => e.id);
  for (const id of respawned) { state.elitesDefeated = state.elitesDefeated.filter(e => e !== id); state.respawns[id] = (state.respawns[id] ?? 0) + 1; }
  return { state, event: { type: 'rested', ...(respawned.length ? { respawned } : {}) } };
}
export function canRevive(state: ExpeditionState, map: MapDefinition, heroId: string): boolean {
  return atCamp(state, map) && state.resources.ember > 0 && state.hp[heroId] === 0;
}
export function revive(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, heroId: string): WorldResult {
  if (!canRevive(initial, map, heroId)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  state.hp[heroId] = percentOf(memberDef(lookup, map, state.members, heroId)!.maxHp, map.camp.reviveHpPercent); state.resources.ember--;
  return { state, event: { type: 'revived', heroId } };
}

// Roster management anywhere outside battle (map bag, owner 2026-10-17): a deployed member and a reserve member
// trade places, or one member moves to a free slot on the other side. At least one member stays deployed.
export const canManage = (state: ExpeditionState): boolean => !state.battle && !state.completed;
// Spend only unallocated level points during exploration. Reset remains a lobby action.
export function learnRunTalent(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, id: string, node: TalentNode): WorldResult {
  if (!canManage(initial) || !rosterIds(initial).includes(id) || memberTalentReason(map, id, initial.members[id], node)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial), m = state.members[id]!;
  m.talents = { ...m.talents, [node]: (m.talents?.[node] ?? 0) + 1 };
  // Learning a max-HP talent must not heal living or fallen heroes for free.
  capHp(state, map, lookup, id);
  return { state, event: { type: 'talent', heroId: id } };
}
export function swapMembers(initial: ExpeditionState, a: string, b: string): WorldResult {
  const { deployed, reserve } = initial.roster;
  const [d, r] = deployed.includes(a) ? [a, b] : [b, a];
  if (!canManage(initial) || !deployed.includes(d) || !reserve.includes(r)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  state.roster.deployed[deployed.indexOf(d)] = r; state.roster.reserve[reserve.indexOf(r)] = d;
  return { state, event: { type: 'roster' } };
}
export function moveMember(initial: ExpeditionState, id: string): WorldResult {
  const { deployed, reserve } = initial.roster;
  const toReserve = deployed.includes(id);
  const ok = canManage(initial) && (toReserve ? deployed.length > 1 && reserve.length < RESERVE_SLOTS : reserve.includes(id) && deployed.length < PARTY_SLOTS);
  if (!ok) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  const from = toReserve ? state.roster.deployed : state.roster.reserve; const to = toReserve ? state.roster.reserve : state.roster.deployed;
  from.splice(from.indexOf(id), 1); to.push(id);
  return { state, event: { type: 'roster' } };
}

// Map bag gear (owner 2026-10-17): outside battle a brought member wears an item found this run (`found`) or one
// of the company's own items taken off on the map (`spare`); the item it replaces goes back to the list it
// belongs to (uid 0 = found, else spare). HP never rises from gear and is capped at the new maximum.
export type BagList = 'found' | 'spare';
export function wearReason(state: ExpeditionState, heroId: string, from: BagList, index: number): string {
  const item = state[from][index];
  if (!canManage(state)) return 'busy';
  if (!item || !state.members[heroId]) return 'unknown';
  return item.slot === 'weapon' && item.hero !== heroId ? 'class' : '';
}
export function wear(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, heroId: string, from: BagList, index: number): WorldResult {
  const reason = wearReason(initial, heroId, from, index); if (reason) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial); const m = state.members[heroId]!;
  const [item] = state[from].splice(index, 1); const old = m.gear?.[item!.slot];
  if (old) (old.uid ? state.spare : state.found).push(old);
  m.gear = { ...m.gear, [item!.slot]: item! };
  capHp(state, map, lookup, heroId);
  return { state, event: { type: 'equipped', heroId } };
}
export function takeOff(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, heroId: string, slot: GearSlot): WorldResult {
  const item = initial.members[heroId]?.gear?.[slot];
  if (!canManage(initial) || !item) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial); const m = state.members[heroId]!;
  delete m.gear![slot]; if (!Object.keys(m.gear!).length) delete m.gear;
  (item.uid ? state.spare : state.found).push(item);
  capHp(state, map, lookup, heroId);
  return { state, event: { type: 'equipped', heroId } };
}
function capHp(state: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, id: string): void {
  const max = memberDef(lookup, map, state.members, id)!.maxHp; state.hp[id] = Math.min(state.hp[id] ?? 0, max);
}

// Loot consumes rolls from the same (seed, rolls) stream, so it is fixed once saved.
function rollLoot(state: ExpeditionState, table: LootTable): Resources {
  const range = ([lo, hi]: readonly [number, number]) => lo + (hi > lo ? rollPercent(state.seed, state.rolls++) % (hi - lo + 1) : 0);
  const extra = ([base, chance]: readonly [number, number]) => base + (chance > 0 && rollPercent(state.seed, state.rolls++) < chance ? 1 : 0);
  // Gold rolls last so the ore, ember and seal rolls of earlier saves keep their order.
  const ore = range(table.ore); const ember = extra(table.ember); const seal = extra(table.seal); const gold = range(table.gold);
  const loot = { ore, gold, ember, seal };
  state.resources = { ore: state.resources.ore + ore, gold: state.resources.gold + gold, ember: state.resources.ember + ember, seal: state.resources.seal + seal };
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
  const loot = rollLoot(state, map.loot.chest[chest.tier]);
  // Chests may also hold one potion (2D-5) when the party can still carry it.
  const table = map.potions.chest[chest.tier]; let potion: PotionId | undefined;
  if (rollPercent(state.seed, state.rolls++) < table.chance) {
    const total = POTION_IDS.reduce((sum, id) => sum + table.weights[id], 0); let pick = rollPercent(state.seed, state.rolls++) % total;
    const id = POTION_IDS.find(p => (pick -= table.weights[p]) < 0)!;
    if (state.potions[id] < map.potions.carry) { state.potions[id]++; potion = id; }
  }
  return { state, event: { type: 'chest', chestId: chest.id, loot, ...(potion ? { potion } : {}) } };
}
// ---- Map potions (2D-5): used outside battle only ----
export function potionReason(state: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, potion: PotionId, targetId?: string): string {
  if (state.battle || state.completed) return 'busy';
  if (state.potions[potion] <= 0) return 'none';
  const hurt = (id: string) => state.hp[id]! > 0 && state.hp[id]! < memberDef(lookup, map, state.members, id)!.maxHp;
  if (potion === 'salve') return !targetId || !rosterIds(state).includes(targetId) ? 'target' : state.hp[targetId] === 0 ? 'down' : hurt(targetId) ? '' : 'full';
  if (potion === 'tonic') return rosterIds(state).some(hurt) ? '' : 'full';
  return state.repel > 0 ? 'active' : '';
}
export function usePotion(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, potion: PotionId, targetId?: string): WorldResult {
  const reason = potionReason(initial, map, lookup, potion, targetId); if (reason) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial); state.potions[potion]--;
  if (potion === 'repel') { state.repel = map.potions.repelSteps; return { state, event: { type: 'potion', potion } }; }
  const heal: Record<string, number> = {};
  for (const id of potion === 'salve' ? [targetId!] : rosterIds(state)) {
    const max = memberDef(lookup, map, state.members, id)!.maxHp; if (!state.hp[id]) continue;
    const amount = Math.min(max - state.hp[id]!, Math.ceil(max * (potion === 'salve' ? map.potions.salvePercent : map.potions.tonicPercent) / 100));
    if (amount > 0) { state.hp[id]! += amount; heal[id] = amount; }
  }
  return { state, event: { type: 'potion', potion, heal } };
}
const noLoot: LootTable = { ore: [0, 0], gold: [0, 0], ember: [0, 0], seal: [0, 0] };
function battleLoot(state: ExpeditionState, map: MapDefinition, kind: BattleKind): LootTable {
  if (kind === 'tutorial') return map.loot.tutorial;
  if (kind === 'boss') return map.loot.boss;
  return zoneOf(map, tileAt(map, state.position)?.zoneId ?? '')?.loot ?? noLoot;
}

// Event choices (3A). Valid only while standing on the unfinished event and outside battle. Fights start a battle
// that finishes the event on victory; other choices finish it at once (the merchant stays open for more trades).
export function eventChoiceReason(state: ExpeditionState, map: MapDefinition, choice: EventChoice): string {
  const ev = pendingEvent(state, map); const r = map.eventRules;
  if (!ev || state.battle || state.completed) return 'busy';
  const allowed: Record<MapEventKind, readonly EventChoice[]> = { bandits: ['fight', 'sneak'], shrine: ['pray', 'offer'], merchant: ['buy-salve', 'buy-tonic', 'buy-repel'], traveller: ['help'], rift: ['fight'] };
  if (!allowed[ev.kind].includes(choice)) return 'choice';
  if (choice === 'offer' && state.resources.ore < r.offerOre) return 'ore';
  if (choice === 'help' && state.potions.salve < 1) return 'salve';
  if (choice.startsWith('buy-')) {
    const potion = choice.slice(4) as PotionId;
    if (state.potions[potion] >= map.potions.carry) return 'carry';
    if (state.resources.ore < r.merchant[potion]) return 'ore';
  }
  return '';
}
export function chooseEvent(initial: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, choice: EventChoice): WorldResult {
  if (eventChoiceReason(initial, map, choice)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial); const ev = pendingEvent(state, map)!; const r = map.eventRules;
  const zone = zoneOf(map, tileAt(map, state.position)!.zoneId); const level = monsterLevelAt(map, state.position) ?? 1;
  if (choice === 'fight') {
    let encounterId = r.riftEncounterId; let lv = level;
    if (ev.kind === 'bandits') {
      const pool = zone?.pool ?? []; const total = pool.reduce((sum, e) => sum + e.weight, 0);
      let pick = rollPercent(state.seed, state.rolls++) % Math.max(1, total);
      encounterId = pool.find(e => (pick -= e.weight) < 0)?.encounterId ?? r.riftEncounterId; lv = level + r.banditLevelBonus;
    }
    state.battle = startBattle(state, 'event', encounterId, lv, ev.id);
    return { state, event: { type: 'encounter', kind: 'event', encounterId, chance: 100 } };
  }
  const heal: Record<string, number> = {};
  if (choice === 'sneak') state.pressure = zone?.cap ?? state.pressure;
  if (choice === 'pray') {
    // Healing first at the old maximum, then the wound lowers every brought member's maximum for the run.
    for (const id of rosterIds(state)) {
      const max = memberDef(lookup, map, state.members, id)!.maxHp; if (!state.hp[id]) continue;
      const amount = Math.min(max - state.hp[id]!, Math.ceil(max * r.prayHeal / 100)); if (amount > 0) { state.hp[id]! += amount; heal[id] = amount; }
    }
    for (const id of rosterIds(state)) {
      const m = state.members[id]!; state.members[id] = { ...m, wound: Math.min(r.maxWound, (m.wound ?? 0) + r.prayWound) };
      state.hp[id] = Math.min(state.hp[id]!, memberDef(lookup, map, state.members, id)!.maxHp);
    }
  }
  if (choice === 'offer') { state.resources.ore -= r.offerOre; state.resources.seal += r.offerSeal; }
  if (choice === 'help') { state.potions.salve--; state.resources.ore += r.traveller.ore; state.resources.seal += r.traveller.seal; }
  if (choice.startsWith('buy-')) { const potion = choice.slice(4) as PotionId; state.resources.ore -= r.merchant[potion]; state.potions[potion]++; }
  if (ev.kind !== 'merchant') state.eventsDone.push(ev.id);
  return { state, event: { type: 'eventDone', eventId: ev.id, choice, ...(Object.keys(heal).length ? { heal } : {}) } };
}
// Map stats from gear (stats design 2026-10-17): every `regenSteps` steps each standing brought member heals its
// Trail regen; the deployed members' Luck adds to the battle drop chance, capped.
function trailRegen(state: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): void {
  if (state.steps % map.equipment.regenSteps) return;
  for (const id of rosterIds(state)) {
    const regen = gearTotals(map, state.members[id]?.gear).regen; const hp = state.hp[id] ?? 0;
    if (regen && hp > 0) state.hp[id] = Math.min(memberDef(lookup, map, state.members, id)!.maxHp, hp + regen);
  }
}
export const partyLuck = (state: Pick<ExpeditionState,'members'|'roster'>, map: MapDefinition): number =>
  Math.min(map.equipment.luckCap, state.roster.deployed.reduce((n, id) => n + gearTotals(map, state.members[id]?.gear).luck, 0));
// Equipment drop (2D-2): random victories drop at `dropPercent`, guaranteed after `pity` dry wins; the boss
// always drops `bossDrops` items with better rarity weights; the tutorial never drops. The item's level is the monster level,
// and a weapon is made for one of the brought members. Found items ride with the run until it is settled.
function dropItems(state: ExpeditionState, map: MapDefinition, kind: BattleKind, level: number, source?: string): Item[] {
  const rules = map.equipment;
  if (kind === 'tutorial') return [];
  // Event fights: bandits always drop an item; a rift pays in veil dust instead.
  if (kind === 'event' && !state.eventsDone.includes(source ?? '')) return [];
  if (kind === 'event' && map.events.find(e => e.id === source)?.kind === 'rift') return [];
  if (kind === 'random') {
    const lucky = rollPercent(state.seed, state.rolls++) < rules.dropPercent + partyLuck(state, map) || state.dry + 1 >= rules.pity;
    if (!lucky) { state.dry++; return []; }
    state.dry = 0;
  }
  // Sets come from the zone the battle was fought in; the boss can drop any set.
  const sets = kind === 'boss' ? SET_IDS : zoneOf(map, tileAt(map, state.position)?.zoneId ?? '')?.sets ?? [];
  const weights = kind === 'boss' ? rules.bossRarityWeights : kind === 'elite' ? (miniBoss(map, source) ? map.eventRules.miniBoss.rarityWeights : optionalElite(map, source) ? map.eventRules.optionalElite.rarityWeights : map.eventRules.eliteRarityWeights) : rules.rarityWeights;
  const items = Array.from({ length: kind === 'boss' ? rules.bossDrops : 1 }, () => rollItem(rules, () => rollPercent(state.seed, state.rolls++), level, weights, rosterIds(state), sets));
  state.found.push(...items);
  return items;
}
// The encounter as fought by the deployed party, in slot order.
export function battleData(state: ExpeditionState, map: MapDefinition, lookup: EncounterLookup): EncounterDefinition | undefined {
  const base = state.battle && lookup(state.battle.encounterId);
  const data = base && withLevel(base, state.battle!.level ?? base.level ?? 1, map.progression.monsterLevelPercent);
  const party = state.roster.deployed.map(id => memberDef(lookup, map, state.members, id));
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
// Every brought member (deployed and reserve, standing or fallen) gains the victory's EXP, tapered by
// their level against the monster level. Level-ups raise max HP; standing members gain the difference.
function gainExp(state: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, data: EncounterDefinition, kind: BattleKind, source?: string): Record<string, ExpGain> {
  const rules = map.progression; const level = data.level ?? 1;
  const base = data.enemies.length * (rules.expBase + rules.expPerLevel * level) * (kind === 'boss' ? rules.bossExpMultiplier : kind === 'elite' ? (miniBoss(map, source) ? map.eventRules.miniBoss.exp : optionalElite(map, source) ? map.eventRules.optionalElite.exp : map.eventRules.eliteExp) : 1);
  const gains: Record<string, ExpGain> = {};
  for (const id of rosterIds(state)) {
    const member = state.members[id] ?? { stars: 1, dupes: 0 }; const before = memberDef(lookup, map, state.members, id)!.maxHp;
    const percent = expPercent(levelOf(member), level); const gained = Math.round(base * percent / 100);
    let lv = levelOf(member), exp = (member.exp ?? 0) + gained; const start = lv;
    while (lv < rules.levelCap && exp >= expToNext(map, lv)) { exp -= expToNext(map, lv); lv++; }
    if (lv >= rules.levelCap) exp = 0;
    state.members[id] = { ...member, level: lv, exp };
    const after = memberDef(lookup, map, state.members, id)!.maxHp;
    if (state.hp[id]! > 0) state.hp[id] = Math.min(after, state.hp[id]! + after - before);
    gains[id] = { gained, percent, level: lv, levelsUp: lv - start };
  }
  return gains;
}
// Applies a finished battle. Victory keeps the surviving HP, rolls loot and relights
// the campfire; defeat leaves the deployed members down at the last camp (or entrance).
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
    // Elites stay beaten and events finished for the rest of the run; a rift pays veil dust.
    const source = initial.battle.source; let dust = 0;
    if (kind === 'elite' && source) state.elitesDefeated.push(source);
    if (kind === 'event' && source) {
      state.eventsDone.push(source);
      if (map.events.find(e => e.id === source)?.kind === 'rift') { dust = map.eventRules.riftDust; state.dust += dust; }
    }
    const data = battleData(initial, map, lookup)!;
    const exp = gainExp(state, map, lookup, data, kind, source);
    // A mini-boss pays its own loot table instead of the zone's.
    const loot = rollLoot(state, miniBoss(map, source) ? map.eventRules.miniBoss.loot : battleLoot(state, map, kind));
    if (kind === 'elite' && optionalElite(map, source) && !state.respawns[source ?? '']) {
      const { gold, seal } = map.eventRules.optionalElite;
      loot.gold += gold; loot.seal += seal; state.resources.gold += gold; state.resources.seal += seal;
    }
    const items = dropItems(state, map, kind, data.level ?? 1, source);
    return { state, event: { type: 'victory', kind, encounterId, loot, exp, ...(items[0] ? { item: items[0] } : {}), ...(items.length > 1 ? { items } : {}), ...(dust ? { dust } : {}) } };
  }
  state.defeats++;
  if (kind === 'tutorial') {
    state.battle = { kind: 'tutorial', encounterId, entry: fullParty(lookup, map, state.roster.deployed, state.members), commands: [] };
    return { state, event: { type: 'defeat', kind, encounterId } };
  }
  // The fallen stay fallen; the party retreats to the last camp reached (or the entrance).
  // When every brought member is down the expedition has failed (`wiped`) and the shell
  // settles it back to the lobby in the same write.
  for (const h of result.heroes) state.hp[h.id] = 0;
  state.battle = null; state.pressure = 0;
  state.position = state.camp ? { ...state.camp } : startOf(map); reveal(state, map);
  const wiped = rosterIds(state).every(id => state.hp[id] === 0);
  return { state, event: { type: 'defeat', kind, encounterId, ...(wiped ? { wiped } : {}) } };
}

// ---- 4B: free camp travel. From a camp or the entrance, the party travels to any camp reached this run (or the
// entrance) with no encounter roll; it becomes the return point like walking there would.
const key = (p: Point): string => `${p.x},${p.y}`;
export function travelTargets(state: ExpeditionState, map: MapDefinition): Point[] {
  if (!atMuster(state, map)) return [];
  return [startOf(map), ...findTiles(map, 'camp').filter(c => state.visited.includes(key(c)))].filter(p => p.x !== state.position.x || p.y !== state.position.y);
}
export function travel(initial: ExpeditionState, map: MapDefinition, to: Point): WorldResult {
  if (!travelTargets(initial, map).some(p => p.x === to.x && p.y === to.y)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  state.position = { ...to }; state.pressure = 0;
  if (tileAt(map, to)?.kind === 'camp') state.camp = { ...to };
  reveal(state, map);
  return { state, event: { type: 'travelled', to: { ...to } } };
}
