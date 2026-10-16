import { replay, withLevel, withParty } from '../battle/engine';
import type { BattleState, Command, EncounterDefinition, HeroDefinition, HeroTalents } from '../battle/types';
import type { ActiveBattle, BattleKind, ChestDefinition, Company, Direction, ExpGain, ExpeditionState, LootTable, MapDefinition, MemberProgress, Point, Resources, Talents, Tile, WorldResult, ZoneDefinition, Gear, Item } from './types';
import { gearTotals, rollItem } from './equipment';
import { PARTY_SLOTS, RESERVE_SLOTS, SET_IDS } from './types';

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
  // Equipment (2D-2) adds flat max HP/Attack/SPD after the percentages, and skill power percent.
  const worn = gearTotals(map, gear); const equipped = !!(worn.hp || worn.attack || worn.skill || worn.speed || worn.hpPercent || worn.attackPercent || worn.gear);
  if (!bonus && !gained.any && !equipped) return base;
  const scale = (n: number, extra: number) => Math.round(n * (100 + bonus + extra) / 100);
  // ★3 adds the class's third skill; ★5 switches on its passive.
  const skill = stars >= 3 && base.unlocks && !base.actions.includes(base.unlocks.skill) ? [base.unlocks.skill] : [];
  return { ...base, maxHp: scale(base.maxHp, gained.hp + worn.hpPercent) + worn.hp, attack: scale(base.attack, gained.attack + worn.attackPercent) + worn.attack, speed: base.speed + worn.speed,
    skillBonus: bonus + gained.skill + worn.skill, actions: [...base.actions, ...skill],
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
  return base && starred(base, members[id]?.stars ?? 1, map, members[id]?.level ?? 1, members[id]?.talents, members[id]?.gear);
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
  return gap <= -3 ? 120 : gap <= 2 ? 100 : gap === 3 ? 75 : gap === 4 ? 50 : gap === 5 ? 25 : 10;
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
    resources: { ore: 0, ember: 0, seal: 0 }, openedChests: [], restReady: true,
    tutorialDone, bossDefeated: false, completed: false, wins: 0, defeats: 0, battle: null, found: [], dry: 0,
  };
  reveal(state, map);
  return state;
}
const startBattle = (state: ExpeditionState, kind: BattleKind, encounterId: string, level?: number): ActiveBattle =>
  ({ kind, encounterId, entry: Object.fromEntries(state.roster.deployed.map(id => [id, state.hp[id]!])), commands: [], ...(level ? { level } : {}) });

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
  return { state, event: { type: 'rested' } };
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

// Roster management at a muster point: a deployed member and a reserve member trade places,
// or one member moves to a free slot on the other side. At least one member stays deployed.
export function swapMembers(initial: ExpeditionState, map: MapDefinition, a: string, b: string): WorldResult {
  const { deployed, reserve } = initial.roster;
  const [d, r] = deployed.includes(a) ? [a, b] : [b, a];
  if (!atMuster(initial, map) || !deployed.includes(d) || !reserve.includes(r)) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial);
  state.roster.deployed[deployed.indexOf(d)] = r; state.roster.reserve[reserve.indexOf(r)] = d;
  return { state, event: { type: 'roster' } };
}
export function moveMember(initial: ExpeditionState, map: MapDefinition, id: string): WorldResult {
  const { deployed, reserve } = initial.roster;
  const toReserve = deployed.includes(id);
  const ok = atMuster(initial, map) && (toReserve ? deployed.length > 1 && reserve.length < RESERVE_SLOTS : reserve.includes(id) && deployed.length < PARTY_SLOTS);
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

// Equipment drop (2D-2): random victories drop at `dropPercent`, guaranteed after `pity` dry wins; the boss
// always drops with better rarity weights; the tutorial never drops. The item's level is the monster level,
// and a weapon is made for one of the brought members. Found items ride with the run until it is settled.
function dropItem(state: ExpeditionState, map: MapDefinition, kind: BattleKind, level: number): Item | undefined {
  const rules = map.equipment;
  if (kind === 'tutorial') return undefined;
  if (kind === 'random') {
    const lucky = rollPercent(state.seed, state.rolls++) < rules.dropPercent || state.dry + 1 >= rules.pity;
    if (!lucky) { state.dry++; return undefined; }
    state.dry = 0;
  }
  // Sets come from the zone the battle was fought in; the boss can drop any set.
  const sets = kind === 'boss' ? SET_IDS : zoneOf(map, tileAt(map, state.position)?.zoneId ?? '')?.sets ?? [];
  const item = rollItem(rules, () => rollPercent(state.seed, state.rolls++), level, kind === 'boss' ? rules.bossRarityWeights : rules.rarityWeights, rosterIds(state), sets);
  state.found.push(item);
  return item;
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
function gainExp(state: ExpeditionState, map: MapDefinition, lookup: EncounterLookup, data: EncounterDefinition, kind: BattleKind): Record<string, ExpGain> {
  const rules = map.progression; const level = data.level ?? 1;
  const base = data.enemies.length * (rules.expBase + rules.expPerLevel * level) * (kind === 'boss' ? rules.bossExpMultiplier : 1);
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
    const data = battleData(initial, map, lookup)!;
    const exp = gainExp(state, map, lookup, data, kind);
    const loot = rollLoot(state, battleLoot(state, map, kind));
    const item = dropItem(state, map, kind, data.level ?? 1);
    return { state, event: { type: 'victory', kind, encounterId, loot, exp, ...(item ? { item } : {}) } };
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
