import { createBattle, resolveCommand, withParty } from '../battle/engine';
import type { BattleState, Command, EncounterDefinition } from '../battle/types';
import { weekOf } from './board';
import { bankFits, TOME_CAP } from './caps';
import { formation, placed } from './formation';
import { addTickets, ticketsFit } from './gacha';
import { featureOpen } from './profile';
import { emptyTomes, partyLine } from './tomes';
import { affixPool } from './equipment';
import { storageCap } from './storage';
import type { GearStat, Item, MapDefinition, Profile, ProfileResult, SetId, SweepReward, WbBossId, WorldBossBook, WorldBossRules, WorldBossWeek } from './types';
import { SET_IDS, WB_BOSSES } from './types';
import { memberDef, recommendedLane, type EncounterLookup } from './world';

// P11-04 World Boss, part 1 (docs/design/WORLD_BOSS_P11_04_TH.md); P11-05 trio (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md). Pure rules shared by the device (offline) and the
// server: the calendar week is an argument (the device's week offline, the server's online, as for the sweep and the
// quest board). An attempt is fought from the camp with the field team at full HP on the same deterministic resolver
// as every battle; the whole committed turn list arrives in one command and is replayed here, so the result is never
// taken from the device. The shared HP lives on the server; these rules only see it as an argument to the shared claim.

export const MAX_WB_WEEK = 200_000;
export const MAX_WB_DAMAGE = 99_999_999;
// The turn list of one attempt: eight rounds of five heroes with room to spare (the command size cap holds anyway).
export const MAX_WB_COMMANDS = 120;

const validWeek = (week: number): boolean => Number.isInteger(week) && week >= 0 && week <= MAX_WB_WEEK;
const emptyWeek = (week: number): WorldBossWeek => ({ week, attempts: 0, bosses: {}, claimed: [] });
const copyWeek = (w: WorldBossWeek): WorldBossWeek => ({ week: w.week, attempts: w.attempts, bosses: Object.fromEntries(Object.entries(w.bosses).map(([k, t]) => [k, { ...t }])),
  ...(w.legacy ? { legacy: { ...w.legacy } } : {}), claimed: [...w.claimed] });
export const wbWeekOf = weekOf;
export const isWbBoss = (v: unknown): v is WbBossId => (WB_BOSSES as readonly unknown[]).includes(v);
// P11-05: the trio stands from week `trio.from` on; before it (or if `from` is not set) the warden does. OD-52: from week 2969.
export const trioLive = (rules: WorldBossRules, week: number): boolean => rules.trio.from !== undefined && week >= rules.trio.from;
// A week's total and best damage over the trio and the warden (`legacy`).
export function wbWeekDamage(w: WorldBossWeek): { damage: number; best: number } {
  const tallies = [...Object.values(w.bosses), ...(w.legacy ? [w.legacy] : [])];
  return { damage: Math.min(MAX_WB_DAMAGE, tallies.reduce((n, t) => n + t.damage, 0)), best: tallies.reduce((n, t) => Math.max(n, t.best), 0) };
}

// The book as it stands in `week`: this week (opened empty) and last week if the book has it; older weeks close.
// A week earlier than the newest in the book (a clock set back) is not brought up: callers refuse it as 'expired'.
export function wbBook(profile: Pick<Profile, 'worldBoss'>, week: number): WorldBossBook {
  const weeks = (profile.worldBoss?.weeks ?? []).filter(w => w.week === week - 1 || w.week === week).map(copyWeek);
  if (!weeks.some(w => w.week === week)) weeks.push(emptyWeek(week));
  return { weeks };
}
const newest = (profile: Pick<Profile, 'worldBoss'>): number => profile.worldBoss?.weeks.at(-1)?.week ?? -1;

// The battle as fought: the boss encounter (the warden, or trio `boss`) with the camp's field team in its lanes (no
// fatigue: the camp team is rested).
export function wbEncounter(profile: Profile, map: MapDefinition, lookup: EncounterLookup, boss?: WbBossId): EncounterDefinition | undefined {
  const base = lookup(boss ? map.worldBoss.trio.bosses[boss] : map.worldBoss.encounterId); const ids = profile.party.deployed;
  if (!base || !ids.length) return undefined;
  const party = ids.map(id => memberDef(lookup, map, profile, id));
  if (!party.every(Boolean)) return undefined;
  const lanes = formation({ ...profile.party, lanes: profile.party.lanes ?? {} }, recommendedLane(lookup, map));
  return withParty(base, placed(party as NonNullable<typeof party[number]>[], lanes));
}

export interface WorldBossPlay { state: BattleState; damage: number; rounds: number; done: boolean }
// The boss is the encounter's `boss` foe; its damage is the HP it lost (never below 0, never above its HP).
export function wbDamage(state: BattleState, data: EncounterDefinition): number {
  const boss = data.enemies.find(e => e.boss); const now = boss && state.enemies.find(e => e.id === boss.id);
  return boss && now ? Math.max(0, Math.min(boss.maxHp, boss.maxHp - Math.max(0, now.hp))) : 0;
}
// Resolves the turns in order. A turn after the battle ended, or once round `maxRounds + 1` has begun, is refused like
// any illegal turn (throws). `done`: the battle ended or the round limit was reached.
export function wbPlay(data: EncounterDefinition, commands: readonly Command[], maxRounds: number): WorldBossPlay {
  let state = createBattle(data);
  for (const c of commands) {
    if (state.outcome !== 'active' || state.round > maxRounds) throw new Error('over');
    state = resolveCommand(state, data, c).state;
  }
  const done = state.outcome !== 'active' || state.round > maxRounds;
  return { state, damage: wbDamage(state, data), rounds: Math.min(state.round, maxRounds), done };
}

const total = (parts: readonly SweepReward[]): SweepReward => parts.reduce<SweepReward>((a, r) => ({
  ore: a.ore + r.ore, gold: a.gold + r.gold, dust: (a.dust ?? 0) + (r.dust ?? 0), tomes: (a.tomes ?? 0) + (r.tomes ?? 0), shard: (a.shard ?? 0) + (r.shard ?? 0), tickets: (a.tickets ?? 0) + (r.tickets ?? 0),
}), { ore: 0, gold: 0, dust: 0, tomes: 0, shard: 0, tickets: 0 });
// `shards` more of `boss`'s shards fit under the cap.
const shardsFit = (profile: Profile, map: MapDefinition, boss: WbBossId | undefined, shards: number): boolean =>
  !boss || !shards || (profile.bossShards?.[boss] ?? 0) + shards <= map.worldBoss.trio.shardCap;
function fits(profile: Profile, map: MapDefinition, r: SweepReward, boss?: WbBossId, shards = 0): boolean {
  if (!bankFits(profile.bank, { ore: r.ore, gold: r.gold, dust: r.dust ?? 0, shard: r.shard ?? 0 })) return false;
  if (!shardsFit(profile, map, boss, shards) || !ticketsFit(profile, map, r.tickets)) return false;
  return (profile.tomes?.[partyLine(map, profile.party.deployed)].small ?? 0) + (r.tomes ?? 0) <= TOME_CAP;
}
function pay(profile: Profile, map: MapDefinition, r: SweepReward, boss?: WbBossId, shards = 0): void {
  profile.bank.ore += r.ore; profile.bank.gold += r.gold; profile.bank.dust += r.dust ?? 0; profile.bank.shard += r.shard ?? 0; addTickets(profile, r.tickets);
  if (r.tomes) (profile.tomes ??= emptyTomes())[partyLine(map, profile.party.deployed)].small += r.tomes;
  if (boss && shards) (profile.bossShards ??= {})[boss] = (profile.bossShards[boss] ?? 0) + shards;
}
type Milestone = { id: string; reward: SweepReward; shards?: number };

// '' when the attempt counts. Otherwise: 'locked' (the system is not open), 'day' (no valid week), 'expired' (a week
// before the book's newest), 'boss' (a trio week needs a known `boss`; a warden week takes none), 'used' (no attempt
// left this week), 'stale' (`attempt` is not the next attempt: a repeat or an old request), 'team' (no field team),
// 'illegal' (a turn the resolver refuses), 'unfinished' (the battle has not ended and the round limit is not reached),
// 'noDamage' (the boss lost nothing: the attempt does not count and is not used up) or 'full' (a storage ceiling,
// boss shards included).
export function wbAttemptReason(profile: Profile, maps: readonly MapDefinition[], lookup: EncounterLookup, week: number, attempt: number, commands: readonly Command[], boss?: WbBossId): string {
  return attemptOf(profile, maps, lookup, week, attempt, commands, boss).reason;
}
function attemptOf(profile: Profile, maps: readonly MapDefinition[], lookup: EncounterLookup, week: number, attempt: number, commands: readonly Command[], boss?: WbBossId):
  { reason: string; play?: WorldBossPlay; reward?: SweepReward; shards?: number; milestones?: Milestone[] } {
  const map = maps[0]; if (!map) return { reason: 'locked' };
  const rules = map.worldBoss;
  if (!featureOpen(profile, maps, 'quests')) return { reason: 'locked' };
  if (!validWeek(week)) return { reason: 'day' };
  if (week < newest(profile)) return { reason: 'expired' };
  if (trioLive(rules, week) ? !isWbBoss(boss) : boss !== undefined) return { reason: 'boss' };
  const w = wbBook(profile, week).weeks.at(-1)!;
  if (w.attempts >= rules.attempts) return { reason: 'used' };
  if (attempt !== w.attempts + 1) return { reason: 'stale' };
  if (commands.length > MAX_WB_COMMANDS) return { reason: 'illegal' };
  const data = wbEncounter(profile, map, lookup, boss); if (!data) return { reason: 'team' };
  let play: WorldBossPlay;
  try { play = wbPlay(data, commands, rules.maxRounds); } catch { return { reason: 'illegal' }; }
  if (!play.done) return { reason: 'unfinished' };
  if (play.damage < 1) return { reason: 'noDamage' };
  // The personal milestones the `attempt`-th finished attempt of the week reaches (counted over all three bosses).
  const trio = boss ? rules.trio : undefined;
  const milestones: Milestone[] = trio
    ? trio.personal.filter(m => m.attempts === attempt && !w.claimed.includes(m.id)).map(m => ({ id: m.id, reward: m.reward, shards: m.shards }))
    : rules.personal.filter(m => m.attempts === attempt && !w.claimed.includes(m.id)).map(m => ({ id: m.id, reward: m.reward }));
  const reward = trio ? trio.attemptReward : rules.attemptReward; const shards = trio?.attemptShards;
  const allShards = (shards ?? 0) + milestones.reduce((n, m) => n + (m.shards ?? 0), 0);
  if (!fits(profile, map, total([reward, ...milestones.map(m => m.reward)]), boss, allShards)) return { reason: 'full' };
  return { reason: '', play, reward, milestones, ...(shards !== undefined ? { shards } : {}) };
}
// All or nothing: the attempt, its reward and the personal milestones it reached change in one returned profile; the
// attempt number makes a repeated request 'stale', so a retry never pays twice. A trio attempt (`boss`) adds to that
// boss's tally and pays its shards; a warden attempt adds to `legacy`.
export function worldBossAttempt(initial: Profile, maps: readonly MapDefinition[], lookup: EncounterLookup, week: number, attempt: number, commands: readonly Command[], boss?: WbBossId): ProfileResult {
  const a = attemptOf(initial, maps, lookup, week, attempt, commands, boss);
  if (a.reason) return { profile: initial, event: { type: 'blocked', reason: a.reason } };
  const profile = structuredClone(initial); const map = maps[0]!; const book = wbBook(profile, week); const w = book.weeks.at(-1)!;
  const play = a.play!;
  w.attempts = attempt;
  const tally = boss ? (w.bosses[boss] ??= { attempts: 0, damage: 0, best: 0 }) : (w.legacy ??= { attempts: 0, damage: 0, best: 0 });
  tally.attempts++; tally.damage = Math.min(MAX_WB_DAMAGE, tally.damage + play.damage); tally.best = Math.max(tally.best, play.damage);
  for (const m of a.milestones!) w.claimed.push(m.id);
  pay(profile, map, a.reward!, boss, a.shards); for (const m of a.milestones!) pay(profile, map, m.reward, boss, m.shards);
  profile.worldBoss = book;
  return { profile, event: { type: 'wbAttempt', week, attempt, damage: play.damage, rounds: play.rounds, outcome: play.state.outcome, reward: a.reward!, milestones: a.milestones!,
    ...(boss ? { boss, shards: a.shards! } : {}) } };
}

// P11-05: crafting a trio boss's item (design §2, OD-48/OD-51): no roll. The slot's power and first affix are fixed; the
// player picks the other affixes (distinct, from the slot's pool) and one set or none. Legendary at `craft.level`,
// quality 100%, locked (boss items never feed fusion or transfer). Pays `craft` shards of that boss, ore and dust.
// '' when it can be made; otherwise 'locked' (the forge's craft service is not open), 'unknown', 'affixes', 'set',
// 'pending' (items wait in the overflow tray), 'bag' (storage is full), 'shards', 'ore', 'dust' or 'full'.
export function bossCraftReason(p: Profile, maps: readonly MapDefinition[], boss: WbBossId, affixes: readonly GearStat[], set?: SetId): string {
  const map = maps[0]; if (!map) return 'locked';
  if (!featureOpen(p, maps, 'craft')) return 'locked';
  if (!isWbBoss(boss)) return 'unknown';
  const trio = map.worldBoss.trio; const item = trio.items[boss]; const pool = affixPool(map.equipment, item.slot);
  if (!Array.isArray(affixes) || affixes.length !== map.equipment.affixCount[4]! - 1 || new Set(affixes).size !== affixes.length
    || affixes.some(a => a === item.first || !pool.includes(a))) return 'affixes';
  if (set !== undefined && !SET_IDS.includes(set)) return 'set';
  if (p.overflow?.length) return 'pending';
  if (p.items.length >= storageCap(p, map)) return 'bag';
  if ((p.bossShards?.[boss] ?? 0) < trio.craft.shards) return 'shards';
  if (p.bank.ore < trio.craft.ore) return 'ore'; if (p.bank.dust < trio.craft.dust) return 'dust';
  return Number.isSafeInteger(p.nextItem + 1) ? '' : 'full';
}
export function bossItem(map: MapDefinition, boss: WbBossId, affixes: readonly GearStat[], set: SetId | undefined, uid: number): Item {
  const trio = map.worldBoss.trio; const it = trio.items[boss]; const all = [it.first, ...affixes];
  return { uid, slot: it.slot, rarity: 4, level: trio.craft.level, affixes: all, q: { main: 100, affixes: all.map(() => 100) }, boss: it.power, ...(set ? { set } : {}), locked: true };
}
export function craftBossItem(initial: Profile, maps: readonly MapDefinition[], boss: WbBossId, affixes: readonly GearStat[], set?: SetId): ProfileResult {
  const reason = bossCraftReason(initial, maps, boss, affixes, set);
  if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const map = maps[0]!; const c = map.worldBoss.trio.craft; const uid = profile.nextItem++;
  profile.items.push(bossItem(map, boss, affixes, set, uid));
  profile.bank.ore -= c.ore; profile.bank.dust -= c.dust;
  const left = profile.bossShards![boss]! - c.shards; if (left) profile.bossShards![boss] = left; else delete profile.bossShards![boss];
  if (!Object.keys(profile.bossShards!).length) delete profile.bossShards;
  return { profile, event: { type: 'bossCrafted', uid, boss } };
}

// What the server knows of a week's shared HP (`hp` fixed when the week opened, `left` what remains). `boss` (P11-05):
// the trio boss whose bar it is (missing = the warden's).
export interface WorldBossShared { week: number; hp: number; left: number; boss?: WbBossId }
// Whole percent of the shared HP taken (100 once it is gone).
export const sharedPercent = (s: Pick<WorldBossShared, 'hp' | 'left'>): number => s.hp > 0 ? (s.left <= 0 ? 100 : Math.floor((s.hp - s.left) * 100 / s.hp)) : 0;

// A shared milestone id: the warden's (`s-50`) or a trio boss's (`kragmor:s-50`).
function sharedOf(map: MapDefinition, id: string): { boss?: WbBossId; reward: SweepReward; percent: number; shards?: number } | undefined {
  const at = id.indexOf(':');
  if (at < 0) { const m = map.worldBoss.shared.find(x => x.id === id); return m && { reward: m.reward, percent: m.percent }; }
  const boss = id.slice(0, at); const m = map.worldBoss.trio.shared.find(x => x.id === id.slice(at + 1));
  return isWbBoss(boss) && m ? { boss, reward: m.reward, percent: m.percent, shards: m.shards } : undefined;
}
// '' when the shared milestone can be claimed for `claimWeek` (this week or last week, on the day's week `week`).
// Otherwise: 'unknown', 'locked', 'day', 'offline' (no server progress: the shared HP exists only online, OD-49),
// 'expired' (an older or future week, or not the week or boss the server answered for), 'absent' (no finished attempt
// on that boss — the warden for an id without a prefix — that week: shared rewards are for those who took part),
// 'claimed', 'progress' (the server has not reached the percent) or 'full'.
export function wbClaimReason(profile: Profile, maps: readonly MapDefinition[], id: string, claimWeek: number, week: number, shared?: WorldBossShared): string {
  const map = maps[0]; if (!map) return 'unknown';
  const m = sharedOf(map, id); if (!m) return 'unknown';
  if (!featureOpen(profile, maps, 'quests')) return 'locked';
  if (!validWeek(week) || !Number.isInteger(claimWeek)) return 'day';
  if (!shared) return 'offline';
  if (week < newest(profile) || (claimWeek !== week && claimWeek !== week - 1) || shared.week !== claimWeek || shared.boss !== m.boss) return 'expired';
  const w = wbBook(profile, week).weeks.find(x => x.week === claimWeek);
  if (!(m.boss ? w?.bosses[m.boss]?.attempts : w?.legacy?.attempts)) return 'absent';
  if (w!.claimed.includes(id)) return 'claimed';
  if (sharedPercent(shared) < m.percent) return 'progress';
  return fits(profile, map, m.reward, m.boss, m.shards) ? '' : 'full';
}
export function claimWorldBoss(initial: Profile, maps: readonly MapDefinition[], id: string, claimWeek: number, week: number, shared?: WorldBossShared): ProfileResult {
  const reason = wbClaimReason(initial, maps, id, claimWeek, week, shared);
  if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const map = maps[0]!; const book = wbBook(profile, week);
  const m = sharedOf(map, id)!;
  book.weeks.find(x => x.week === claimWeek)!.claimed.push(id); pay(profile, map, m.reward, m.boss, m.shards); profile.worldBoss = book;
  return { profile, event: { type: 'wbClaimed', week: claimWeek, id, reward: m.reward, ...(m.boss ? { boss: m.boss, shards: m.shards! } : {}) } };
}

// The week's shared HP, fixed when the week opens: `perAccount` for each account that finished an attempt last week,
// within [min, max]. Never changed once the week is open (no raise because many joined).
export const sharedHpFor = (rules: WorldBossRules, lastWeekAccounts: number): number =>
  Math.max(rules.hp.min, Math.min(rules.hp.max, Math.max(0, Math.floor(lastWeekAccounts)) * rules.hp.perAccount));
// P11-05 (OD-51 §9 item 5): a trio boss's shared HP is `perAttempt` × the finished attempts on it last week, within bounds.
export const trioSharedHp = (rules: WorldBossRules, lastWeekAttempts: number): number =>
  Math.max(rules.trio.hp.min, Math.min(rules.trio.hp.max, Math.max(0, Math.floor(lastWeekAttempts)) * rules.trio.hp.perAttempt));
