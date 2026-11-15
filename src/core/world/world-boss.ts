import { createBattle, resolveCommand, withParty } from '../battle/engine';
import type { BattleState, Command, EncounterDefinition } from '../battle/types';
import { weekOf } from './board';
import { bankFits, TOME_CAP } from './caps';
import { formation, placed } from './formation';
import { featureOpen } from './profile';
import { emptyTomes, partyLine } from './tomes';
import type { MapDefinition, Profile, ProfileResult, SweepReward, WorldBossBook, WorldBossRules, WorldBossWeek } from './types';
import { memberDef, recommendedLane, type EncounterLookup } from './world';

// P11-04 World Boss, part 1 (docs/design/WORLD_BOSS_P11_04_TH.md). Pure rules shared by the device (offline) and the
// server: the calendar week is an argument (the device's week offline, the server's online, as for the sweep and the
// quest board). An attempt is fought from the camp with the field team at full HP on the same deterministic resolver
// as every battle; the whole committed turn list arrives in one command and is replayed here, so the result is never
// taken from the device. The shared HP lives on the server; these rules only see it as an argument to the shared claim.

export const MAX_WB_WEEK = 200_000;
export const MAX_WB_DAMAGE = 99_999_999;
// The turn list of one attempt: eight rounds of five heroes with room to spare (the command size cap holds anyway).
export const MAX_WB_COMMANDS = 120;

const validWeek = (week: number): boolean => Number.isInteger(week) && week >= 0 && week <= MAX_WB_WEEK;
const emptyWeek = (week: number): WorldBossWeek => ({ week, attempts: 0, damage: 0, best: 0, claimed: [] });
export const wbWeekOf = weekOf;

// The book as it stands in `week`: this week (opened empty) and last week if the book has it; older weeks close.
// A week earlier than the newest in the book (a clock set back) is not brought up: callers refuse it as 'expired'.
export function wbBook(profile: Pick<Profile, 'worldBoss'>, week: number): WorldBossBook {
  const weeks = (profile.worldBoss?.weeks ?? []).filter(w => w.week === week - 1 || w.week === week).map(w => ({ ...w, claimed: [...w.claimed] }));
  if (!weeks.some(w => w.week === week)) weeks.push(emptyWeek(week));
  return { weeks };
}
const newest = (profile: Pick<Profile, 'worldBoss'>): number => profile.worldBoss?.weeks.at(-1)?.week ?? -1;

// The battle as fought: the boss encounter with the camp's field team in its lanes (no fatigue: the camp team is rested).
export function wbEncounter(profile: Profile, map: MapDefinition, lookup: EncounterLookup): EncounterDefinition | undefined {
  const base = lookup(map.worldBoss.encounterId); const ids = profile.party.deployed;
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
  ore: a.ore + r.ore, gold: a.gold + r.gold, dust: (a.dust ?? 0) + (r.dust ?? 0), tomes: (a.tomes ?? 0) + (r.tomes ?? 0), shard: (a.shard ?? 0) + (r.shard ?? 0),
}), { ore: 0, gold: 0, dust: 0, tomes: 0, shard: 0 });
function fits(profile: Profile, map: MapDefinition, r: SweepReward): boolean {
  if (!bankFits(profile.bank, { ore: r.ore, gold: r.gold, dust: r.dust ?? 0, shard: r.shard ?? 0 })) return false;
  return (profile.tomes?.[partyLine(map, profile.party.deployed)].small ?? 0) + (r.tomes ?? 0) <= TOME_CAP;
}
function pay(profile: Profile, map: MapDefinition, r: SweepReward): void {
  profile.bank.ore += r.ore; profile.bank.gold += r.gold; profile.bank.dust += r.dust ?? 0; profile.bank.shard += r.shard ?? 0;
  if (r.tomes) (profile.tomes ??= emptyTomes())[partyLine(map, profile.party.deployed)].small += r.tomes;
}
// The personal milestones the `n`-th finished attempt of a week reaches.
const reached = (rules: WorldBossRules, n: number) => rules.personal.filter(m => m.attempts === n);

// '' when the attempt counts. Otherwise: 'locked' (the system is not open), 'day' (no valid week), 'expired' (a week
// before the book's newest), 'used' (no attempt left this week), 'stale' (`attempt` is not the next attempt: a repeat or
// an old request), 'team' (no field team), 'illegal' (a turn the resolver refuses), 'unfinished' (the battle has not
// ended and the round limit is not reached), 'noDamage' (the boss lost nothing: the attempt does not count and is not
// used up) or 'full' (a storage ceiling).
export function wbAttemptReason(profile: Profile, maps: readonly MapDefinition[], lookup: EncounterLookup, week: number, attempt: number, commands: readonly Command[]): string {
  return attemptOf(profile, maps, lookup, week, attempt, commands).reason;
}
function attemptOf(profile: Profile, maps: readonly MapDefinition[], lookup: EncounterLookup, week: number, attempt: number, commands: readonly Command[]):
  { reason: string; play?: WorldBossPlay; reward?: SweepReward; milestones?: { id: string; reward: SweepReward }[] } {
  const map = maps[0]; if (!map) return { reason: 'locked' };
  const rules = map.worldBoss;
  if (!featureOpen(profile, maps, 'quests')) return { reason: 'locked' };
  if (!validWeek(week)) return { reason: 'day' };
  if (week < newest(profile)) return { reason: 'expired' };
  const w = wbBook(profile, week).weeks.at(-1)!;
  if (w.attempts >= rules.attempts) return { reason: 'used' };
  if (attempt !== w.attempts + 1) return { reason: 'stale' };
  if (commands.length > MAX_WB_COMMANDS) return { reason: 'illegal' };
  const data = wbEncounter(profile, map, lookup); if (!data) return { reason: 'team' };
  let play: WorldBossPlay;
  try { play = wbPlay(data, commands, rules.maxRounds); } catch { return { reason: 'illegal' }; }
  if (!play.done) return { reason: 'unfinished' };
  if (play.damage < 1) return { reason: 'noDamage' };
  const milestones = reached(rules, attempt).filter(m => !w.claimed.includes(m.id)).map(m => ({ id: m.id, reward: m.reward }));
  const reward = rules.attemptReward;
  if (!fits(profile, map, total([reward, ...milestones.map(m => m.reward)]))) return { reason: 'full' };
  return { reason: '', play, reward, milestones };
}
// All or nothing: the attempt, its reward and the personal milestones it reached change in one returned profile; the
// attempt number makes a repeated request 'stale', so a retry never pays twice.
export function worldBossAttempt(initial: Profile, maps: readonly MapDefinition[], lookup: EncounterLookup, week: number, attempt: number, commands: readonly Command[]): ProfileResult {
  const a = attemptOf(initial, maps, lookup, week, attempt, commands);
  if (a.reason) return { profile: initial, event: { type: 'blocked', reason: a.reason } };
  const profile = structuredClone(initial); const map = maps[0]!; const book = wbBook(profile, week); const w = book.weeks.at(-1)!;
  const play = a.play!;
  w.attempts = attempt; w.damage = Math.min(MAX_WB_DAMAGE, w.damage + play.damage); w.best = Math.max(w.best, play.damage);
  for (const m of a.milestones!) w.claimed.push(m.id);
  pay(profile, map, a.reward!); for (const m of a.milestones!) pay(profile, map, m.reward);
  profile.worldBoss = book;
  return { profile, event: { type: 'wbAttempt', week, attempt, damage: play.damage, rounds: play.rounds, outcome: play.state.outcome, reward: a.reward!, milestones: a.milestones! } };
}

// What the server knows of a week's shared HP (`hp` fixed when the week opened, `left` what remains).
export interface WorldBossShared { week: number; hp: number; left: number }
// Whole percent of the shared HP taken (100 once it is gone).
export const sharedPercent = (s: Pick<WorldBossShared, 'hp' | 'left'>): number => s.hp > 0 ? (s.left <= 0 ? 100 : Math.floor((s.hp - s.left) * 100 / s.hp)) : 0;

// '' when the shared milestone can be claimed for `claimWeek` (this week or last week, on the day's week `week`).
// Otherwise: 'unknown', 'locked', 'day', 'offline' (no server progress: the shared HP exists only online), 'expired'
// (an older or future week, or not the week the server answered for), 'absent' (no finished attempt that week: shared
// rewards are for those who took part), 'claimed', 'progress' (the server has not reached the percent) or 'full'.
export function wbClaimReason(profile: Profile, maps: readonly MapDefinition[], id: string, claimWeek: number, week: number, shared?: WorldBossShared): string {
  const map = maps[0]; if (!map) return 'unknown';
  const m = map.worldBoss.shared.find(x => x.id === id); if (!m) return 'unknown';
  if (!featureOpen(profile, maps, 'quests')) return 'locked';
  if (!validWeek(week) || !Number.isInteger(claimWeek)) return 'day';
  if (!shared) return 'offline';
  if (week < newest(profile) || (claimWeek !== week && claimWeek !== week - 1) || shared.week !== claimWeek) return 'expired';
  const w = wbBook(profile, week).weeks.find(x => x.week === claimWeek);
  if (!w?.attempts) return 'absent';
  if (w.claimed.includes(id)) return 'claimed';
  if (sharedPercent(shared) < m.percent) return 'progress';
  return fits(profile, map, m.reward) ? '' : 'full';
}
export function claimWorldBoss(initial: Profile, maps: readonly MapDefinition[], id: string, claimWeek: number, week: number, shared?: WorldBossShared): ProfileResult {
  const reason = wbClaimReason(initial, maps, id, claimWeek, week, shared);
  if (reason) return { profile: initial, event: { type: 'blocked', reason } };
  const profile = structuredClone(initial); const map = maps[0]!; const book = wbBook(profile, week);
  const r = map.worldBoss.shared.find(x => x.id === id)!.reward;
  book.weeks.find(x => x.week === claimWeek)!.claimed.push(id); pay(profile, map, r); profile.worldBoss = book;
  return { profile, event: { type: 'wbClaimed', week: claimWeek, id, reward: r } };
}

// The week's shared HP, fixed when the week opens: `perAccount` for each account that finished an attempt last week,
// within [min, max]. Never changed once the week is open (no raise because many joined).
export const sharedHpFor = (rules: WorldBossRules, lastWeekAccounts: number): number =>
  Math.max(rules.hp.min, Math.min(rules.hp.max, Math.max(0, Math.floor(lastWeekAccounts)) * rules.hp.perAccount));
