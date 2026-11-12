import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS as maps } from '../src/content/world/maps';
import { resolveCommand, currentActorId } from '../src/core/battle/engine';
import type { Command } from '../src/core/battle/types';
import { applyCommand, COMMAND_KINDS, isRejected, parseCommand, type CommandContext, type CommandKind, type GameCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import { parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { applyCampEquipment, applyRunEquipment, type AutoEquipmentPlan } from '../src/core/world/auto-equipment';
import { chooseBossTarget } from '../src/core/world/boss-equipment';
import { placeCampMember } from '../src/core/world/camp-team';
import { formation } from '../src/core/world/formation';
import { craftWeapon, enhanceTo, fuse, lockEquipment, raiseItemLevel, reroll, smelt, transferAffix } from '../src/core/world/forge';
import { applyPreset, applyRunPreset, clearPreset, renamePreset, savePreset } from '../src/core/world/presets';
import {
  activeGuides, brew, buy, canWithdraw, chooseLoadout, claimGuide, claimQuest, COMMANDER_COLORS, COMMANDER_CRESTS, createCommander, depart, dismiss,
  equip, hire, learnTalent, newProfile, refreshBoard, resetTalents, salvage, setArchived, setPartyLane, settle, unequip, upgrade,
} from '../src/core/world/profile';
import { collectOverflow, expandStorage, recycleSelection } from '../src/core/world/storage';
import { chooseHuntTarget } from '../src/core/world/targeted-loot';
import { raiseSkill, tradeTomes } from '../src/core/world/tomes';
import type { Commander, Direction, ExpeditionState, Lane, Point, Profile, ProfileResult, WorldResult } from '../src/core/world/types';
import {
  battleData, battleState, chooseEvent, chooseRunLoadout, draftOffers, draftPick, findTiles, finishBattle, learnRunTalent, move, moveMember, openChest,
  recordBattle, recommendedLane, rest, revive, setLane, startPrologue, swapMembers, takeOff, tileAt, travel, usePotion, wear,
} from '../src/core/world/world';

// P09-02a: `applyCommand` must give exactly what the shell's direct calls gave (docs/design/p09/COMMAND_LAYER_TH.md).
const ctx = (...seeds: number[]): CommandContext => ({ home, maps, lookup, seeds: sequenceSeeds(seeds) });
const commander: Commander = { name: 'ทดสอบ', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: 'ค่ายทดสอบ' };
const key = (p: Point) => `${p.x},${p.y}`;

// A rich camp: every map cleared, a full bank, a bench member, gear in the bag and a saved team preset.
function campProfile(): Profile {
  let p: Profile = { ...newProfile(home, 4), tutorialDone: true, commander, cleared: maps.map(m => m.id), campXp: 400000,
    bank: { ore: 9000, gold: 9000, seal: 60, dust: 9000 }, potions: { salve: 2, tonic: 1, repel: 1, calm: 0 } };
  for (let i = 0; i < 3; i++) { const r = buy(p, home, 'gearbox'); if (r.event.type !== 'blocked') p = r.profile; }
  p = { ...p, company: [...p.company, 'lio'], members: { ...p.members, lio: { stars: 1, dupes: 0 }, guardian: { ...p.members.guardian!, dupes: 9 } } };
  const saved = savePreset(p, home, lookup, 0, 'หลัก'); if (saved.event.type !== 'blocked') p = saved.profile;
  return p;
}
const campGame = (patch: Partial<Profile> = {}): Game => ({ profile: { ...campProfile(), ...patch }, run: null });
function runGame(patch: Partial<ExpeditionState> = {}, profile: Partial<Profile> = {}): Game {
  const out = depart({ ...campProfile(), ...profile }, home, lookup, 7);
  return { profile: { ...out.profile, last: null }, run: { ...out.run, ...patch } };
}
const campTile = findTiles(home, 'camp')[0]!;
const chest = home.chests[0]!;
const bandit = home.events.find(e => e.kind === 'bandits') ?? home.events[0]!;
const atCamp = (patch: Partial<ExpeditionState> = {}) => runGame({ position: { ...campTile }, camp: { ...campTile }, visited: [key(campTile)], ...patch });
function hurt(g: Game): Game { const r = g.run!; const id = r.roster.deployed[0]!; return { ...g, run: { ...r, hp: { ...r.hp, [id]: 1 } } }; }
const firstItem = (p: Profile) => p.items.find(i => i.slot !== 'weapon') ?? p.items[0]!;
function campPlan(p: Profile): AutoEquipmentPlan {
  const item = firstItem(p); const heroId = p.party.deployed[0]!;
  return { heroId, member: structuredClone(p.members[heroId]!), goal: 'recommended', choices: [{ slot: item.slot, key: `owned:${item.uid}`, item: structuredClone(item) }] };
}
function runPlan(g: Game): AutoEquipmentPlan {
  const r = g.run!; const item = r.found[0]!; const heroId = r.roster.deployed[0]!;
  return { heroId, member: structuredClone(r.members[heroId]!), goal: 'recommended', choices: [{ slot: item.slot, key: 'found:0', item: structuredClone(item) }] };
}
const withReserve = () => runGame({}, { party: { deployed: ['guardian', 'tracer', 'weaver'], reserve: ['healer'] } });
const flip = (r: { deployed: string[]; reserve: string[]; lanes?: Record<string, Lane> }, id: string): Lane => formation(r, recommendedLane(lookup, home))[id] === 'front' ? 'back' : 'front';
const openDir = (): Direction => (['up', 'down', 'left', 'right'] as const).find(d => move(runGame().run!, home, d, lookup).event.type !== 'blocked')!;
const withFound = (): Game => { const p = campProfile(); const item = firstItem(p); return runGame({ found: [{ ...item, uid: 0 }] }); };
// A battle started from an event fight, and a full list of legal turns that ends it.
function inBattle(): Game {
  const g = runGame({ position: { x: bandit.x, y: bandit.y } });
  const r = chooseEvent(g.run!, home, lookup, 'fight');
  if (!r.state.battle) throw new Error('no battle');
  return { ...g, run: r.state };
}
function turns(g: Game, limit = 400): Command[] {
  const data = battleData(g.run!, home, lookup)!; let s = battleState(g.run!, home, lookup)!;
  for (let n = 0; n < limit && s.outcome === 'active'; n++) {
    const heroId = currentActorId(s)!; let done = false;
    for (const e of s.enemies) {
      try { s = resolveCommand(s, data, { beat: s.beat, heroId, action: 'attack', targetId: e.id }, true).state; done = true; break; } catch { /* next target */ }
    }
    if (!done) throw new Error('no legal turn');
  }
  return s.commands;
}

type Direct = (g: Game) => ProfileResult | WorldResult | { game: Game } ;
interface Case { game: () => Game; cmd: GameCommand; direct: Direct; seeds?: number[] }
const P = (g: Game) => g.profile, R = (g: Game) => g.run!;
const presetCase = (action: 'apply' | 'save' | 'rename' | 'clear'): Case => ({ game: campGame, cmd: { kind: 'preset', action, slot: 0, name: 'ชุดใหม่' },
  direct: g => action === 'apply' ? applyPreset(P(g), home, 0) : action === 'save' ? savePreset(P(g), home, lookup, 0, 'ชุดใหม่') : action === 'rename' ? renamePreset(P(g), 0, 'ชุดใหม่') : clearPreset(P(g), 0) });
const CASES: Record<CommandKind, Case> = {
  createCommander: { game: () => campGame(), cmd: { kind: 'createCommander', commander, replace: true }, seeds: [99],
    direct: () => ({ game: { profile: createCommander(newProfile(home, 99, home.firstCompany), commander).profile, run: null } }) },
  hire: { game: campGame, cmd: { kind: 'hire', index: 0 }, direct: g => hire(P(g), home, lookup, 0) },
  refreshBoard: { game: campGame, cmd: { kind: 'refreshBoard' }, direct: g => refreshBoard(P(g), home) },
  buy: { game: campGame, cmd: { kind: 'buy', item: 'repel' }, direct: g => buy(P(g), home, 'repel') },
  smelt: { game: campGame, cmd: { kind: 'smelt', dust: 1 }, direct: g => smelt(P(g), home, 1) },
  upgrade: { game: campGame, cmd: { kind: 'upgrade', heroId: 'guardian' }, direct: g => upgrade(P(g), home, 'guardian') },
  setArchived: { game: campGame, cmd: { kind: 'setArchived', heroId: 'lio', archived: true }, direct: g => setArchived(P(g), 'lio', true) },
  dismiss: { game: campGame, cmd: { kind: 'dismiss', heroId: 'lio' }, direct: g => dismiss(P(g), home, 'lio') },
  placeMember: { game: campGame, cmd: { kind: 'placeMember', heroId: 'lio', group: 'deployed', lane: 'back' }, direct: g => placeCampMember(P(g), home, lookup, 'lio', 'deployed', undefined, 'back') },
  setPartyLane: { game: campGame, cmd: { kind: 'setPartyLane', heroId: 'guardian', lane: flip(campProfile().party, 'guardian') }, direct: g => setPartyLane(P(g), home, lookup, 'guardian', flip(P(g).party, 'guardian')) },
  preset: presetCase('save'),
  raiseSkill: { game: () => campGame({ tomes: { bulwark: { small: 30, medium: 30, large: 30 }, blade: { small: 30, medium: 30, large: 30 }, accord: { small: 30, medium: 30, large: 30 } } }),
    cmd: { kind: 'raiseSkill', heroId: 'guardian', action: 'guard' }, direct: g => raiseSkill(P(g), maps, home, lookup, 'guardian', 'guard') },
  tradeTomes: { game: () => campGame({ tomes: { bulwark: { small: 30, medium: 0, large: 0 }, blade: { small: 0, medium: 0, large: 0 }, accord: { small: 0, medium: 0, large: 0 } } }), cmd: { kind: 'tradeTomes', line: 'bulwark', size: 'small', to: 'blade' },
    direct: g => tradeTomes(P(g), maps, home, 'bulwark', 'small', 'blade') },
  learnTalent: { game: campGame, cmd: { kind: 'learnTalent', heroId: 'guardian', node: 'a1' }, direct: g => learnTalent(P(g), home, 'guardian', 'a1') },
  chooseLoadout: { game: campGame, cmd: { kind: 'chooseLoadout', heroId: 'guardian', actions: ['guard', 'bash'] }, direct: g => chooseLoadout(P(g), home, lookup, 'guardian', ['guard', 'bash']) },
  resetTalents: { game: () => { const g = campGame(); const r = learnTalent(g.profile, home, 'guardian', 'a1'); return { ...g, profile: r.profile }; },
    cmd: { kind: 'resetTalents', heroId: 'guardian' }, direct: g => resetTalents(P(g), 'guardian') },
  claimGuide: { game: () => campGame({ cleared: [] }), cmd: { kind: 'claimGuide', id: activeGuides({ ...campProfile(), cleared: [] }, maps)[0]?.id ?? 'none', skip: true },
    direct: g => claimGuide(P(g), maps, activeGuides(P(g), maps)[0]?.id ?? 'none', true) },
  equip: { game: campGame, cmd: { kind: 'equip', heroId: 'guardian', uid: firstItem(campProfile()).uid }, direct: g => equip(P(g), 'guardian', firstItem(P(g)).uid) },
  unequip: { game: () => { const g = campGame(); return { ...g, profile: equip(g.profile, 'guardian', firstItem(g.profile).uid).profile }; },
    cmd: { kind: 'unequip', heroId: 'guardian', slot: firstItem(campProfile()).slot }, direct: g => unequip(P(g), home, 'guardian', firstItem(campProfile()).slot) },
  autoEquipCamp: { game: campGame, cmd: { kind: 'autoEquipCamp', plan: campPlan(campProfile()) }, direct: g => applyCampEquipment(P(g), campPlan(P(g))) },
  transferAffix: { game: campGame, cmd: { kind: 'transferAffix', uid: 1, index: 0, donor: 2, sourceIndex: 0 }, direct: g => transferAffix(P(g), home, 1, 0, 2, 0) },
  craftWeapon: { game: campGame, cmd: { kind: 'craftWeapon', heroId: 'guardian', level: 1 }, direct: g => craftWeapon(P(g), home, 'guardian', 1) },
  bossTarget: { game: campGame, cmd: { kind: 'bossTarget', target: 'focus' }, direct: g => chooseBossTarget(P(g), home, 'focus') },
  huntTarget: { game: campGame, cmd: { kind: 'huntTarget', target: 'guardian' }, direct: g => chooseHuntTarget(P(g), 'guardian') },
  collectOverflow: { game: () => { const g = campGame(); const [a, ...rest] = g.profile.items; return { ...g, profile: { ...g.profile, items: rest, overflow: [a!] } }; },
    cmd: { kind: 'collectOverflow', ids: [campProfile().items[0]!.uid] }, direct: g => collectOverflow(P(g), home, [P(g).overflow![0]!.uid]) },
  recycleStored: { game: campGame, cmd: { kind: 'recycleStored', source: 'bag', ids: [campProfile().items[0]!.uid] }, direct: g => recycleSelection(P(g), home, 'bag', [P(g).items[0]!.uid]) },
  expandStorage: { game: campGame, cmd: { kind: 'expandStorage' }, direct: g => expandStorage(P(g), home) },
  salvage: { game: campGame, cmd: { kind: 'salvage', uids: [campProfile().items[0]!.uid] }, direct: g => salvage(P(g), home, [P(g).items[0]!.uid]) },
  enhance: { game: campGame, cmd: { kind: 'enhance', uid: campProfile().items[0]!.uid, target: 1 }, direct: g => enhanceTo(P(g), home, P(g).items[0]!.uid, 1) },
  lockEquipment: { game: campGame, cmd: { kind: 'lockEquipment', uid: campProfile().items[0]!.uid }, direct: g => lockEquipment(P(g), P(g).items[0]!.uid) },
  fuse: { game: campGame, cmd: { kind: 'fuse', uid: campProfile().items[0]!.uid }, direct: g => fuse(P(g), home, P(g).items[0]!.uid) },
  raiseItemLevel: { game: campGame, cmd: { kind: 'raiseItemLevel', uid: campProfile().items[0]!.uid, target: 2 }, direct: g => raiseItemLevel(P(g), home, P(g).items[0]!.uid, 2) },
  reroll: { game: campGame, cmd: { kind: 'reroll', uid: campProfile().items[0]!.uid, index: 0 }, direct: g => reroll(P(g), home, P(g).items[0]!.uid, 0) },
  brew: { game: campGame, cmd: { kind: 'brew', potion: 'salve' }, direct: g => brew(P(g), home, 'salve') },
  claimQuest: { game: campGame, cmd: { kind: 'claimQuest', questId: home.sideQuests[0]!.id }, direct: g => claimQuest(P(g), home, home.sideQuests[0]!.id) },
  depart: { game: campGame, cmd: { kind: 'depart', mapId: home.id, hard: false }, seeds: [7], direct: g => { const out = depart(P(g), home, lookup, 7); return { game: { profile: { ...out.profile, last: null }, run: out.run } }; } },
  move: { game: () => runGame(), cmd: { kind: 'move', dir: openDir() }, direct: g => move(R(g), home, openDir(), lookup) },
  travel: { game: () => runGame({ visited: [key(campTile)] }), cmd: { kind: 'travel', to: campTile }, direct: g => travel(R(g), home, campTile) },
  rest: { game: () => hurt(atCamp({ restReady: true })), cmd: { kind: 'rest' }, direct: g => rest(R(g), home, lookup) },
  revive: { game: () => { const g = atCamp(); const id = g.run!.roster.deployed[1]!; return { ...g, run: { ...g.run!, hp: { ...g.run!.hp, [id]: 0 }, resources: { ...g.run!.resources, ember: 1 } } }; },
    cmd: { kind: 'revive', heroId: 'tracer' }, direct: g => revive(R(g), home, lookup, 'tracer') },
  swapMembers: { game: withReserve, cmd: { kind: 'swapMembers', a: 'guardian', b: 'healer' }, direct: g => swapMembers(R(g), 'guardian', 'healer') },
  setLane: { game: () => runGame(), cmd: { kind: 'setLane', heroId: 'guardian', lane: flip(runGame().run!.roster, 'guardian') }, direct: g => setLane(R(g), home, lookup, 'guardian', flip(R(g).roster, 'guardian')) },
  moveMember: { game: withReserve, cmd: { kind: 'moveMember', heroId: 'healer' }, direct: g => moveMember(R(g), 'healer') },
  runPreset: { game: () => runGame(), cmd: { kind: 'runPreset', slot: 0 }, direct: g => applyRunPreset(R(g), P(g).presets?.[0] ?? undefined, 0) },
  withdraw: { game: () => runGame(), cmd: { kind: 'withdraw' }, direct: g => ({ game: { profile: settle(P(g), R(g), 'withdrawn', home), run: null } }) },
  openChest: { game: () => runGame({ position: { x: chest.x, y: chest.y } }), cmd: { kind: 'openChest' }, direct: g => openChest(R(g), home) },
  usePotion: { game: () => { const g = hurt(runGame()); return { ...g, run: { ...g.run!, potions: { salve: 1, tonic: 0, repel: 0, calm: 0 } } }; },
    cmd: { kind: 'usePotion', potion: 'salve', heroId: 'guardian' }, direct: g => usePotion(R(g), home, lookup, 'salve', 'guardian') },
  chooseEvent: { game: () => runGame({ position: { x: bandit.x, y: bandit.y } }), cmd: { kind: 'chooseEvent', choice: 'fight' }, direct: g => chooseEvent(R(g), home, lookup, 'fight') },
  draftPick: { game: () => { const out = depart({ ...campProfile(), company: ['guardian'], party: { deployed: ['guardian'], reserve: [] } }, maps[0]!, lookup, 7); const run = { ...out.run, draft: { left: 1, offers: [] as string[] } };
    run.draft.offers = draftOffers(run, maps[0]!); return { profile: out.profile, run }; }, cmd: { kind: 'draftPick', index: 0 }, direct: g => draftPick(R(g), maps[0]!, 0, lookup) },
  learnRunTalent: { game: () => runGame(), cmd: { kind: 'learnRunTalent', heroId: 'guardian', node: 'a1' }, direct: g => learnRunTalent(R(g), home, lookup, 'guardian', 'a1') },
  chooseRunLoadout: { game: () => runGame(), cmd: { kind: 'chooseRunLoadout', heroId: 'guardian', actions: ['guard', 'bash'] }, direct: g => chooseRunLoadout(R(g), home, lookup, 'guardian', ['guard', 'bash']) },
  wear: { game: withFound, cmd: { kind: 'wear', heroId: 'guardian', from: 'found', index: 0 }, direct: g => wear(R(g), home, lookup, 'guardian', 'found', 0) },
  takeOff: { game: () => { const g = withFound(); return { ...g, run: wear(g.run!, home, lookup, 'guardian', 'found', 0).state }; },
    cmd: { kind: 'takeOff', heroId: 'guardian', slot: firstItem(campProfile()).slot }, direct: g => takeOff(R(g), home, lookup, 'guardian', firstItem(campProfile()).slot) },
  autoEquipRun: { game: withFound, cmd: { kind: 'autoEquipRun', plan: runPlan(withFound()) }, direct: g => applyRunEquipment(R(g), home, lookup, runPlan(g)) },
  battle: { game: inBattle, cmd: { kind: 'battle', commands: turns(inBattle()).slice(0, 1) }, direct: g => ({ game: { profile: P(g), run: recordBattle(R(g), home, lookup, turns(g).slice(0, 1)) } }) },
};
// Fixtures that end in a refusal (equality is then checked on the reason); every other kind must make a real change.
const REFUSED: CommandKind[] = ['claimGuide', 'transferAffix', 'fuse', 'raiseItemLevel', 'claimQuest'];

// What the shell stored after a direct call (or the refusal it ignored).
function expected(g: Game, direct: ReturnType<Direct>): { game: Game } | { rejected: string } {
  if ('game' in direct) return direct;
  const e = direct.event;
  if (e.type === 'blocked') return { rejected: e.reason };
  return 'profile' in direct ? { game: { profile: { ...direct.profile, last: null }, run: null } } : { game: { profile: g.profile, run: direct.state } };
}

describe("P09-02a command layer", () => {
  it('lists every command kind', () => { expect(COMMAND_KINDS.sort()).toEqual((Object.keys(CASES) as CommandKind[]).sort()); });
  for (const kind of Object.keys(CASES) as CommandKind[]) {
    it(`${kind}: equals the direct rule call and never mutates its input`, () => {
      const c = CASES[kind]; const game = c.game(); const before = structuredClone(game);
      const result = applyCommand(game, c.cmd, ctx(...c.seeds ?? []));
      expect(game).toEqual(before);
      const want = expected(c.game(), c.direct(c.game()));
      expect(REFUSED.includes(kind)).toBe('rejected' in want);
      if ('rejected' in want) { expect(result).toEqual(want); return; }
      expect(isRejected(result) ? result : result.game).toEqual(want.game);
    });
  }
  it('extra preset actions and an unmanaged world call also match', () => {
    for (const action of ['apply', 'rename', 'clear'] as const) {
      const c = presetCase(action); const r = applyCommand(c.game(), c.cmd, ctx());
      const want = expected(c.game(), c.direct(c.game()));
      expect('rejected' in want ? r : (r as { game: Game }).game).toEqual('rejected' in want ? want : want.game);
    }
  });
  it('round-trips every command through JSON and accepts it back', () => {
    for (const c of Object.values(CASES)) { const back = JSON.parse(JSON.stringify(c.cmd)); expect(back).toEqual(c.cmd); expect(parseCommand(back)).toEqual(c.cmd); }
  });
  it('rejects malformed commands before they reach the rules', () => {
    for (const bad of [null, 1, 'move', {}, { kind: 'nope' }, { kind: 'move' }, { kind: 'move', dir: 'north' }, { kind: 'move', dir: 'up', extra: 1 },
      { kind: 'hire', index: 1.5 }, { kind: 'hire', index: '0' }, { kind: 'travel', to: { x: 1 } }, { kind: 'salvage', uids: [1, 'a'] },
      { kind: 'battle', commands: [{ beat: 0, heroId: 'a', action: 'attack' }] }, { kind: 'battle', commands: [{ beat: 0, heroId: 'a', action: 'attack', targetId: 'b', hp: 9 }] },
      { kind: 'depart', hard: 'yes' }, { kind: '__proto__' }, { kind: 'toString' }]) expect(parseCommand(bad)).toBeUndefined();
  });
  it('rejects with the rules’ reason, at commit, in the wrong place or with a stale target', () => {
    expect(applyCommand(null, { kind: 'hire', index: 0 }, ctx())).toEqual({ rejected: 'noGame' });
    expect(applyCommand(runGame(), { kind: 'hire', index: 0 }, ctx())).toEqual({ rejected: 'inRun' });
    expect(applyCommand(campGame(), { kind: 'move', dir: 'up' }, ctx())).toEqual({ rejected: 'noRun' });
    expect(applyCommand(campGame(), { kind: 'upgrade', heroId: 'nobody' }, ctx())).toMatchObject({ rejected: expect.any(String) });
    expect(applyCommand(runGame(), { kind: 'rest' }, ctx())).toEqual({ rejected: 'busy' });
    expect(applyCommand(runGame(), { kind: 'battle', commands: [] }, ctx())).toEqual({ rejected: 'noBattle' });
    expect(applyCommand(campGame(), { kind: 'depart', mapId: 'nowhere', hard: false }, ctx(1))).toEqual({ rejected: 'mapClosed' });
    const fight = inBattle(); const all = turns(fight);
    expect(applyCommand(fight, { kind: 'battle', commands: [{ ...all[0]!, beat: 99 }] }, ctx())).toEqual({ rejected: 'illegal' });
    const one = applyCommand(fight, { kind: 'battle', commands: all.slice(0, 2) }, ctx());
    if (isRejected(one)) throw new Error(one.rejected);
    expect(applyCommand(one.game, { kind: 'battle', commands: all.slice(1, 2) }, ctx())).toEqual({ rejected: 'rewrite' });
  });
  it('finishes a battle like the shell: record, finish, and settle a wipe home', () => {
    const fight = inBattle(); const all = turns(fight);
    const r = applyCommand(fight, { kind: 'battle', commands: all }, ctx()); if (isRejected(r)) throw new Error(r.rejected);
    const finished = finishBattle(recordBattle(fight.run!, home, lookup, all), home, lookup);
    if (finished.event.type === 'defeat' && finished.event.wiped) expect(r.game).toEqual({ profile: settle(fight.profile, finished.state, 'wiped', home), run: null });
    else expect(r.game).toEqual({ profile: fight.profile, run: finished.state });
    expect(r.events[0]).toEqual(finished.event);
  });
  it('a first departure meets the prologue battle in the same command', () => {
    const fresh: Game = { profile: { ...newProfile(home, 3, home.firstCompany), commander }, run: null };
    const r = applyCommand(fresh, { kind: 'depart', hard: false }, ctx(11)); if (isRejected(r)) throw new Error(r.rejected);
    const out = depart(fresh.profile, maps[0]!, lookup, 11); const pro = startPrologue(out.run, maps[0]!);
    expect(r.game).toEqual({ profile: { ...out.profile, last: null }, run: pro.state });
    expect(r.events.map(e => e.type)).toEqual(['departed', 'encounter']);
  });
  it('takes seeds only from the injected source', () => {
    expect(() => applyCommand(campGame(), { kind: 'depart', hard: false }, ctx())).toThrow('Seed sequence exhausted.');
    const a = applyCommand(campGame(), { kind: 'depart', hard: false }, ctx(5)), b = applyCommand(campGame(), { kind: 'depart', hard: false }, ctx(6));
    expect((a as { game: Game }).game.run!.seed).toBe(5); expect((b as { game: Game }).game.run!.seed).toBe(6);
  });
  it('replays a whole session of commands to the same game, and the save still loads', () => {
    const session: GameCommand[] = [
      { kind: 'createCommander', commander, replace: false }, { kind: 'depart', hard: false },
    ];
    const play = () => {
      let game: Game | null = null; const c = ctx(21, 22, 23, 24); const log: string[] = [];
      const run = (cmd: GameCommand) => { const r = applyCommand(game, cmd, c); if (isRejected(r)) { log.push(`${cmd.kind}:${r.rejected}`); return; } game = r.game; log.push(cmd.kind); };
      session.forEach(run);
      // The prologue: fight it out with the same legal-turn picker, then walk and withdraw.
      run({ kind: 'battle', commands: turns(game!) });
      for (const dir of ['up', 'up', 'left', 'right', 'down'] as const) run({ kind: 'move', dir });
      run({ kind: 'withdraw' }); run({ kind: 'hire', index: 0 }); run({ kind: 'depart', hard: false });
      return { game: game!, log };
    };
    const first = play(), second = play();
    expect(second).toEqual(first);
    expect(first.log).toContain('battle');
    let raw = ''; expect(saveGame({ getItem: () => raw, setItem: (_k: string, v: string) => { raw = v; }, removeItem: () => {} }, first.game)).toBe(true);
    expect(parseGame(raw, home, lookup, maps)).toMatchObject({ profile: first.game.profile });
  });
  it('a won run that reaches the goal settles home as complete', () => {
    const g = runGame();
    const goal = findTiles(home, 'goal')[0]!;
    for (const [dir, dx, dy] of [['up', 0, 1], ['down', 0, -1], ['left', 1, 0], ['right', -1, 0]] as const) {
      const from = { x: goal.x + dx, y: goal.y + dy }; const t = tileAt(home, from); if (!t || t.kind === 'wall') continue;
      const run = { ...g.run!, position: from, bossDefeated: true }; const direct = move(run, home, dir, lookup);
      if (direct.event.type !== 'goal') continue;
      const r = applyCommand({ ...g, run }, { kind: 'move', dir }, ctx()); if (isRejected(r)) throw new Error(r.rejected);
      expect(r.game).toEqual({ profile: settle(g.profile, direct.state, 'complete', home), run: null });
      expect(r.events.map(e => e.type)).toEqual(['goal', 'settled']);
      return;
    }
    expect.fail('no step onto the goal');
  });
  it('withdraw follows canWithdraw', () => { expect(canWithdraw(runGame().run!, home)).toBe(!isRejected(applyCommand(runGame(), { kind: 'withdraw' }, ctx()))); });
});
