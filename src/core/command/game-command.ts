import type { ActionId, BossPower, Command } from '../battle/types';
import type { Game } from '../save/expedition-save';
import { applyCampEquipment, applyRunEquipment, type AutoEquipmentPlan } from '../world/auto-equipment';
import { BOSS_POWERS, chooseBossTarget } from '../world/boss-equipment';
import { placeCampMember } from '../world/camp-team';
import { craftWeapon, enhanceTo, fuse, lockEquipment, raiseItemLevel, reroll, smelt, transferAffix } from '../world/forge';
import { applyPreset, applyRunPreset, clearPreset, renamePreset, savePreset } from '../world/presets';
import {
  brew, buy, canWithdraw, chooseLoadout, claimGuide, claimQuest, createCommander, depart, dismiss, equip, hardReason, hire,
  learnTalent, mapUnlocked, newProfile, refreshBoard, resetTalents, salvage, setArchived, setPartyLane, settle, unequip, upgrade,
  type Group,
} from '../world/profile';
import { collectOverflow, departureBlocked, expandStorage, recycleSelection, type StorageSource } from '../world/storage';
import { chooseHuntTarget } from '../world/targeted-loot';
import { raiseSkill, tradeTomes } from '../world/tomes';
import {
  GEAR_SLOTS, POTION_IDS, SHOP_ITEMS, TOME_LINES, TOME_SIZES,
  type Commander, type Direction, type EventChoice, type ExpeditionState, type GearSlot, type Lane, type MapDefinition, type Point,
  type PotionId, type Profile, type ProfileEvent, type ProfileResult, type RunOutcome, type ShopItemId, type TalentNode, type TomeLine,
  type TomeSize, type WorldEvent, type WorldResult,
} from '../world/types';
import {
  battleState, chooseEvent, chooseRunLoadout, draftPick, finishBattle, learnRunTalent, move, moveMember, openChest, recordBattle,
  rest, revive, setLane, startPrologue, swapMembers, takeOff, travel, usePotion, wear, type BagList, type BattleReplay, type EncounterLookup,
} from '../world/world';
import type { SeedSource } from './seed-source';

// P09-02a: every camp and map action the game shell performs, as plain JSON, and one pure processor that runs it by
// calling the existing rule functions (no rule is written twice). Today the browser runs it locally; later a server
// (P09-02b, owner D10 = ค) runs the same code and keeps the seeds. Battle turns stay `core/battle` `Command`s and arrive
// here as one `battle` command carrying the full committed list. See docs/design/p09/COMMAND_LAYER_TH.md.

// Camp (lobby) commands: only while no expedition is running.
export type CampCommand =
  | { kind: 'createCommander'; commander: Commander; replace: boolean }
  | { kind: 'hire'; index: number }
  | { kind: 'refreshBoard' }
  | { kind: 'buy'; item: ShopItemId; heroId?: string }
  | { kind: 'smelt'; dust: number }
  | { kind: 'upgrade'; heroId: string }
  | { kind: 'setArchived'; heroId: string; archived: boolean }
  | { kind: 'dismiss'; heroId: string }
  | { kind: 'placeMember'; heroId: string; group: Group; other?: string; lane?: Lane }
  | { kind: 'setPartyLane'; heroId: string; lane: Lane; other?: string }
  | { kind: 'preset'; action: 'apply' | 'save' | 'rename' | 'clear'; slot: number; name?: string }
  | { kind: 'raiseSkill'; heroId: string; action: ActionId }
  | { kind: 'tradeTomes'; line: TomeLine; size: TomeSize; to?: TomeLine }
  | { kind: 'learnTalent'; heroId: string; node: TalentNode }
  | { kind: 'chooseLoadout'; heroId: string; actions: ActionId[] }
  | { kind: 'resetTalents'; heroId: string }
  | { kind: 'claimGuide'; id: string; skip: boolean }
  | { kind: 'equip'; heroId: string; uid: number }
  | { kind: 'unequip'; heroId: string; slot: GearSlot }
  | { kind: 'autoEquipCamp'; plan: AutoEquipmentPlan }
  | { kind: 'transferAffix'; uid: number; index: number; donor: number; sourceIndex: number }
  | { kind: 'craftWeapon'; heroId: string; level: number }
  | { kind: 'bossTarget'; target: BossPower }
  | { kind: 'huntTarget'; target?: string }
  | { kind: 'collectOverflow'; ids: number[] }
  | { kind: 'recycleStored'; source: StorageSource; ids: number[] }
  | { kind: 'expandStorage' }
  | { kind: 'salvage'; uids: number[] }
  | { kind: 'enhance'; uid: number; target: number }
  | { kind: 'lockEquipment'; uid: number }
  | { kind: 'fuse'; uid: number; donors?: number[] }
  | { kind: 'raiseItemLevel'; uid: number; target: number }
  | { kind: 'reroll'; uid: number; index: number }
  | { kind: 'brew'; potion: PotionId }
  | { kind: 'claimQuest'; questId: string }
  | { kind: 'depart'; mapId?: string; hard: boolean };
// Map (expedition) commands: only while an expedition is running.
export type RunCommand =
  | { kind: 'move'; dir: Direction }
  | { kind: 'travel'; to: Point }
  | { kind: 'rest' }
  | { kind: 'revive'; heroId: string }
  | { kind: 'swapMembers'; a: string; b: string }
  | { kind: 'setLane'; heroId: string; lane: Lane; other?: string }
  | { kind: 'moveMember'; heroId: string }
  | { kind: 'runPreset'; slot: number }
  | { kind: 'withdraw' }
  | { kind: 'openChest' }
  | { kind: 'usePotion'; potion: PotionId; heroId?: string }
  | { kind: 'chooseEvent'; choice: EventChoice }
  | { kind: 'draftPick'; index: number }
  | { kind: 'learnRunTalent'; heroId: string; node: TalentNode }
  | { kind: 'chooseRunLoadout'; heroId: string; actions: ActionId[] }
  | { kind: 'wear'; heroId: string; from: BagList; index: number }
  | { kind: 'takeOff'; heroId: string; slot: GearSlot }
  | { kind: 'autoEquipRun'; plan: AutoEquipmentPlan }
  | { kind: 'battle'; commands: Command[] };
export type GameCommand = CampCommand | RunCommand;
export type CommandKind = GameCommand['kind'];

// What happened, for the shell to describe; the outcomes themselves are in the returned game.
export type CommandEvent = ProfileEvent | WorldEvent
  | { type: 'departed'; mapId: string; hard: boolean }
  // The finished run as it was settled, for the shell's run summary (a server would send a seed-free view instead).
  | { type: 'settled'; outcome: RunOutcome; run: ExpeditionState };
// `battles` (P09-02f): how a `battle` command replays its turns; the server passes a `battleMemo` that resolves only the
// new ones (same resolver, same result). Default: the full replay.
export interface CommandContext { home: MapDefinition; maps: readonly MapDefinition[]; lookup: EncounterLookup; seeds: SeedSource; battles?: BattleReplay }
export type CommandResult = { game: Game; events: CommandEvent[] } | { rejected: string };
export const isRejected = (r: CommandResult): r is { rejected: string } => 'rejected' in r;

// ---- Shape check for commands arriving as untrusted JSON (a server must call this before `applyCommand`). ----
type Field = 'int' | 'str' | 'bool' | 'ints' | 'strs' | 'point' | 'object' | 'commands' | readonly string[];
type Spec = Record<string, Field | { optional: Field }>;
const opt = (f: Field) => ({ optional: f });
const DIRECTIONS = ['up', 'down', 'left', 'right'] as const, LANES = ['front', 'back'] as const, GROUPS = ['deployed', 'reserve', 'bench'] as const;
const EVENT_CHOICES = ['fight', 'sneak', 'pray', 'offer', 'buy-salve', 'buy-tonic', 'buy-repel', 'help'] as const;
const SPECS: Record<CommandKind, Spec> = {
  createCommander: { commander: 'object', replace: 'bool' }, hire: { index: 'int' }, refreshBoard: {}, buy: { item: SHOP_ITEMS, heroId: opt('str') },
  smelt: { dust: 'int' }, upgrade: { heroId: 'str' }, setArchived: { heroId: 'str', archived: 'bool' }, dismiss: { heroId: 'str' },
  placeMember: { heroId: 'str', group: GROUPS, other: opt('str'), lane: opt(LANES) }, setPartyLane: { heroId: 'str', lane: LANES, other: opt('str') },
  preset: { action: ['apply', 'save', 'rename', 'clear'], slot: 'int', name: opt('str') }, raiseSkill: { heroId: 'str', action: 'str' },
  tradeTomes: { line: TOME_LINES, size: TOME_SIZES, to: opt(TOME_LINES) }, learnTalent: { heroId: 'str', node: 'str' },
  chooseLoadout: { heroId: 'str', actions: 'strs' }, resetTalents: { heroId: 'str' }, claimGuide: { id: 'str', skip: 'bool' },
  equip: { heroId: 'str', uid: 'int' }, unequip: { heroId: 'str', slot: GEAR_SLOTS }, autoEquipCamp: { plan: 'object' },
  transferAffix: { uid: 'int', index: 'int', donor: 'int', sourceIndex: 'int' }, craftWeapon: { heroId: 'str', level: 'int' },
  bossTarget: { target: BOSS_POWERS }, huntTarget: { target: opt('str') }, collectOverflow: { ids: 'ints' },
  recycleStored: { source: ['bag', 'overflow'], ids: 'ints' }, expandStorage: {}, salvage: { uids: 'ints' }, enhance: { uid: 'int', target: 'int' },
  lockEquipment: { uid: 'int' }, fuse: { uid: 'int', donors: opt('ints') }, raiseItemLevel: { uid: 'int', target: 'int' }, reroll: { uid: 'int', index: 'int' },
  brew: { potion: POTION_IDS }, claimQuest: { questId: 'str' }, depart: { mapId: opt('str'), hard: 'bool' },
  move: { dir: DIRECTIONS }, travel: { to: 'point' }, rest: {}, revive: { heroId: 'str' }, swapMembers: { a: 'str', b: 'str' },
  setLane: { heroId: 'str', lane: LANES, other: opt('str') }, moveMember: { heroId: 'str' }, runPreset: { slot: 'int' }, withdraw: {}, openChest: {},
  usePotion: { potion: POTION_IDS, heroId: opt('str') }, chooseEvent: { choice: EVENT_CHOICES }, draftPick: { index: 'int' },
  learnRunTalent: { heroId: 'str', node: 'str' }, chooseRunLoadout: { heroId: 'str', actions: 'strs' },
  wear: { heroId: 'str', from: ['found', 'spare'], index: 'int' }, takeOff: { heroId: 'str', slot: GEAR_SLOTS }, autoEquipRun: { plan: 'object' },
  battle: { commands: 'commands' },
};
export const COMMAND_KINDS = Object.keys(SPECS) as CommandKind[];
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const COMMAND_KEYS = ['beat', 'heroId', 'action', 'targetId', 'cooldownAction', 'cooldownTargetId', 'recipientId'] as const;
const isBattleCommand = (c: unknown): boolean => isObject(c) && isInt(c.beat) && ['heroId', 'action', 'targetId'].every(k => typeof c[k] === 'string')
  && ['cooldownAction', 'cooldownTargetId', 'recipientId'].every(k => c[k] === undefined || typeof c[k] === 'string')
  && Object.keys(c).every(k => (COMMAND_KEYS as readonly string[]).includes(k));
function fits(field: Field, v: unknown): boolean {
  if (Array.isArray(field)) return typeof v === 'string' && field.includes(v);
  switch (field) {
    case 'int': return isInt(v);
    case 'str': return typeof v === 'string';
    case 'bool': return typeof v === 'boolean';
    case 'ints': return Array.isArray(v) && v.every(isInt);
    case 'strs': return Array.isArray(v) && v.every(s => typeof s === 'string');
    case 'point': return isObject(v) && isInt(v.x) && isInt(v.y) && Object.keys(v).length === 2;
    case 'object': return isObject(v);
    case 'commands': return Array.isArray(v) && v.every(isBattleCommand);
    default: return false;
  }
}
// Returns the command when it has a known kind, exactly the expected fields and the expected JSON types. Values are
// still checked by the rules at commit (an unknown hero, an empty slot, a stale plan…).
export function parseCommand(raw: unknown): GameCommand | undefined {
  if (!isObject(raw) || typeof raw.kind !== 'string' || !Object.hasOwn(SPECS, raw.kind)) return;
  const spec = SPECS[raw.kind as CommandKind];
  for (const key of Object.keys(raw)) if (key !== 'kind' && !Object.hasOwn(spec, key)) return;
  for (const [key, f] of Object.entries(spec)) {
    const field = typeof f === 'object' && !Array.isArray(f) ? (f as { optional: Field }).optional : f as Field;
    const optional = field !== f;
    if (raw[key] === undefined ? !optional : !fits(field, raw[key])) return;
  }
  return raw as unknown as GameCommand;
}

// ---- The processor. ----
const reject = (rejected: string): CommandResult => ({ rejected });
// The map an expedition runs on (as the shell's `map` getter: the run's map, else the frontier map).
const runMap = (ctx: CommandContext, run: ExpeditionState): MapDefinition => ctx.maps.find(m => m.id === run.mapId) ?? ctx.home;
// Lobby services commit the profile with the one-shot `last` note cleared, as the shell always did.
function camp(result: ProfileResult, expect?: ProfileEvent['type']): CommandResult {
  const e = result.event;
  if (e.type === 'blocked') return reject(e.reason);
  if (expect && e.type !== expect) return reject(e.type);
  return { game: { profile: { ...result.profile, last: null }, run: null }, events: [e] };
}
function onRun(game: Game, result: WorldResult, expect?: WorldEvent['type']): CommandResult {
  const e = result.event;
  if (e.type === 'blocked') return reject(e.reason);
  if (expect && e.type !== expect) return reject(e.type);
  return { game: { profile: game.profile, run: result.state }, events: [e] };
}
// Settling the run into the profile happens in the same write that clears it.
function settled(profile: Profile, run: ExpeditionState, outcome: RunOutcome, map: MapDefinition, events: CommandEvent[]): CommandResult {
  return { game: { profile: settle(profile, run, outcome, map), run: null }, events: [...events, { type: 'settled', outcome, run }] };
}
const sameCommand = (a: Command, b: Command) => COMMAND_KEYS.every(k => a[k] === b[k]);

function applyCampCommand(game: Game | null, cmd: CampCommand, ctx: CommandContext): CommandResult {
  const { home: map, maps, lookup } = ctx;
  if (cmd.kind === 'createCommander') {
    // Every map shares the company rules (`content/world/rules.ts`), so a fresh profile starts from the frontier map.
    const base = cmd.replace || !game ? newProfile(map, ctx.seeds.next(), map.firstCompany) : game.profile;
    const result = createCommander(base, cmd.commander);
    if (result.event.type !== 'commander') return reject(result.event.type === 'blocked' ? result.event.reason : result.event.type);
    return { game: { profile: result.profile, run: cmd.replace ? null : game?.run ?? null }, events: [result.event] };
  }
  if (!game) return reject('noGame');
  if (game.run) return reject('inRun');
  const p = game.profile;
  switch (cmd.kind) {
    case 'hire': return camp(hire(p, map, lookup, cmd.index));
    case 'refreshBoard': return camp(refreshBoard(p, map));
    case 'buy': return camp(buy(p, map, cmd.item, cmd.heroId));
    case 'smelt': return camp(smelt(p, map, cmd.dust));
    case 'upgrade': return camp(upgrade(p, map, cmd.heroId));
    case 'setArchived': return camp(setArchived(p, cmd.heroId, cmd.archived));
    case 'dismiss': return camp(dismiss(p, map, cmd.heroId));
    case 'placeMember': return camp(placeCampMember(p, map, lookup, cmd.heroId, cmd.group, cmd.other, cmd.lane));
    case 'setPartyLane': return camp(setPartyLane(p, map, lookup, cmd.heroId, cmd.lane, cmd.other));
    case 'preset': return camp(cmd.action === 'apply' ? applyPreset(p, map, cmd.slot) : cmd.action === 'save' ? savePreset(p, map, lookup, cmd.slot, cmd.name)
      : cmd.action === 'rename' ? renamePreset(p, cmd.slot, cmd.name ?? '') : clearPreset(p, cmd.slot));
    case 'raiseSkill': return camp(raiseSkill(p, maps, map, lookup, cmd.heroId, cmd.action));
    case 'tradeTomes': return camp(tradeTomes(p, maps, map, cmd.line, cmd.size, cmd.to));
    case 'learnTalent': return camp(learnTalent(p, map, cmd.heroId, cmd.node));
    case 'chooseLoadout': return camp(chooseLoadout(p, map, lookup, cmd.heroId, cmd.actions));
    case 'resetTalents': return camp(resetTalents(p, cmd.heroId));
    case 'claimGuide': return camp(claimGuide(p, maps, cmd.id, cmd.skip), 'guide');
    case 'equip': return camp(equip(p, cmd.heroId, cmd.uid));
    case 'unequip': return camp(unequip(p, map, cmd.heroId, cmd.slot));
    case 'autoEquipCamp': return camp(applyCampEquipment(p, cmd.plan));
    case 'transferAffix': return camp(transferAffix(p, map, cmd.uid, cmd.index, cmd.donor, cmd.sourceIndex));
    case 'craftWeapon': return camp(craftWeapon(p, map, cmd.heroId, cmd.level));
    case 'bossTarget': return camp(chooseBossTarget(p, map, cmd.target));
    case 'huntTarget': return camp(chooseHuntTarget(p, cmd.target));
    case 'collectOverflow': return camp(collectOverflow(p, map, cmd.ids));
    case 'recycleStored': return camp(recycleSelection(p, map, cmd.source, cmd.ids));
    case 'expandStorage': return camp(expandStorage(p, map));
    case 'salvage': return camp(salvage(p, map, cmd.uids));
    case 'enhance': return camp(enhanceTo(p, map, cmd.uid, cmd.target));
    case 'lockEquipment': return camp(lockEquipment(p, cmd.uid));
    case 'fuse': return camp(fuse(p, map, cmd.uid, cmd.donors));
    case 'raiseItemLevel': return camp(raiseItemLevel(p, map, cmd.uid, cmd.target));
    case 'reroll': return camp(reroll(p, map, cmd.uid, cmd.index));
    case 'brew': return camp(brew(p, map, cmd.potion));
    case 'claimQuest': return camp(claimQuest(p, map, cmd.questId));
    case 'depart': {
      if (departureBlocked(p)) return reject('storage');
      // The prologue always starts on the first map; otherwise the named open map (default: the furthest open one).
      const open = maps.filter(m => mapUnlocked(p, maps, m.id));
      const chosen = !p.tutorialDone ? maps[0]! : open.find(m => m.id === cmd.mapId) ?? open.at(-1)!;
      if (cmd.mapId && chosen.id !== cmd.mapId) return reject('mapClosed');
      if (cmd.hard) { const reason = hardReason(p, maps, chosen.id); if (reason) return reject(reason); }
      const out = depart(p, chosen, lookup, ctx.seeds.next(), cmd.hard ? { maps } : undefined);
      const events: CommandEvent[] = [{ type: 'departed', mapId: chosen.id, hard: cmd.hard }];
      // A first expedition meets Vargoth's vanguard before the first step.
      const prologue = startPrologue(out.run, chosen);
      if (prologue.event.type === 'encounter') events.push(prologue.event);
      return { game: { profile: { ...out.profile, last: null }, run: prologue.event.type === 'encounter' ? prologue.state : out.run }, events };
    }
  }
}

function applyRunCommand(game: Game | null, cmd: RunCommand, ctx: CommandContext): CommandResult {
  if (!game?.run) return reject('noRun');
  const { home, lookup } = ctx; const run = game.run; const map = runMap(ctx, run);
  // Bag and team changes on the map follow the frontier map's rules, as the shell always called them.
  switch (cmd.kind) {
    case 'move': {
      const result = move(run, map, cmd.dir, lookup);
      if (result.event.type === 'goal') return settled(game.profile, result.state, 'complete', map, [result.event]);
      return onRun(game, result);
    }
    case 'travel': return onRun(game, travel(run, map, cmd.to), 'travelled');
    case 'rest': return onRun(game, rest(run, map, lookup), 'rested');
    case 'revive': return onRun(game, revive(run, map, lookup, cmd.heroId), 'revived');
    case 'swapMembers': return onRun(game, swapMembers(run, cmd.a, cmd.b), 'roster');
    case 'setLane': return onRun(game, setLane(run, home, lookup, cmd.heroId, cmd.lane, cmd.other), 'roster');
    case 'moveMember': return onRun(game, moveMember(run, cmd.heroId), 'roster');
    case 'runPreset': return onRun(game, applyRunPreset(run, game.profile.presets?.[cmd.slot] ?? undefined, cmd.slot), 'roster');
    case 'withdraw': return canWithdraw(run, map) ? settled(game.profile, run, 'withdrawn', map, []) : reject('withdraw');
    case 'openChest': return onRun(game, openChest(run, map), 'chest');
    case 'usePotion': return onRun(game, usePotion(run, map, lookup, cmd.potion, cmd.heroId), 'potion');
    case 'chooseEvent': return onRun(game, chooseEvent(run, map, lookup, cmd.choice));
    case 'draftPick': return onRun(game, draftPick(run, map, cmd.index, lookup), 'drafted');
    case 'learnRunTalent': return onRun(game, learnRunTalent(run, home, lookup, cmd.heroId, cmd.node), 'talent');
    case 'chooseRunLoadout': return onRun(game, chooseRunLoadout(run, home, lookup, cmd.heroId, cmd.actions), 'talent');
    case 'wear': return onRun(game, wear(run, home, lookup, cmd.heroId, cmd.from, cmd.index), 'equipped');
    case 'takeOff': return onRun(game, takeOff(run, home, lookup, cmd.heroId, cmd.slot), 'equipped');
    case 'autoEquipRun': return onRun(game, applyRunEquipment(run, home, lookup, cmd.plan), 'equipped');
    case 'battle': {
      if (!run.battle) return reject('noBattle');
      // Turns are only ever added: the committed ones must stay as they were.
      const kept = run.battle.commands;
      if (cmd.commands.length < kept.length || kept.some((c, i) => !sameCommand(c, cmd.commands[i]!))) return reject('rewrite');
      let next: ExpeditionState, outcome: string;
      // The resolver replays every turn and refuses an illegal or stale one.
      const play = ctx.battles;
      try { next = recordBattle(run, map, lookup, cmd.commands, play); outcome = battleState(next, map, lookup, play)!.outcome; } catch { return reject('illegal'); }
      if (outcome === 'active') return { game: { profile: game.profile, run: next }, events: [] };
      const result = finishBattle(next, map, lookup, play);
      // Every brought member down: the expedition fails and settles home in this write.
      if (result.event.type === 'defeat' && result.event.wiped) return settled(game.profile, result.state, 'wiped', map, [result.event]);
      return { game: { profile: game.profile, run: result.state }, events: [result.event] };
    }
  }
}

const CAMP_KINDS = new Set<CommandKind>(COMMAND_KINDS.slice(0, COMMAND_KINDS.indexOf('depart') + 1));
// Pure: never mutates `game`; seeds come only from `ctx.seeds` (createCommander with a new profile, depart).
export function applyCommand(game: Game | null, cmd: GameCommand, ctx: CommandContext): CommandResult {
  return CAMP_KINDS.has(cmd.kind) ? applyCampCommand(game, cmd as CampCommand, ctx) : applyRunCommand(game, cmd as RunCommand, ctx);
}
