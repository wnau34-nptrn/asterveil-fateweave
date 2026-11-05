import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { rosterP03 } from '../src/content/heroes/roster-p03';
import { chapterOne as map } from '../src/content/world/chapter1';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { actionReason, beginBattle, previewCommand, releasePower, replay, resolveCommand, skillCooldown, targetOptions } from '../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, TalentCap, TurnStage } from '../src/core/battle/types';
import { parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { boardOffers, featuredLineup, hire, learnTalent, newProfile, refreshBoard } from '../src/core/world/profile';
import { heroCatalog, skillChoices } from '../src/core/world/world';
import { talentsValid } from '../src/core/world/talents';
import type { Profile } from '../src/core/world/types';
import { xpAt } from './fixtures/camp-level';
import { unitStatuses } from '../src/ui/battle-status';
import { battleLesson } from '../src/ui/tutorial';

type Caps = Partial<Record<TalentCap, number>>;
const kael = rosterP03.find(h => h.id === 'kael')!;
// Kael alone against standing practice foes whose moves deal nothing, so every round returns to his turn.
function fixture(actions: ActionId[], caps: Caps = {}, foes: ('f1' | 'f2' | 'b1')[] = ['f1'], power: Partial<Record<ActionId, number>> = {}): EncounterDefinition {
  return {
    ...veilSiege,
    heroes: [{ ...kael, actions: ['attack', ...actions], talents: { caps, power } }],
    enemies: foes.map((id, i) => ({ id, row: id.startsWith('f') ? 'front' as const : 'back' as const, name: `Dummy ${id}`, maxHp: 1000, speed: 1 + i, color: 0 })),
    intents: foes.map(id => ({ sourceId: id, targetSlot: 0, name: 'Wait', damage: 0, kind: 'physical' as const })),
  };
}
const chi = (s: BattleState) => s.heroes[0]!.chi ?? 0;
function cast(d: EncounterDefinition, s: BattleState, action: ActionId, targetId = 'f1'): { state: BattleState; turn: TurnStage } {
  const command: Command = { beat: s.beat, heroId: 'kael', action, targetId };
  const result = resolveCommand(s, d, command);
  expect(previewCommand(s, d, command)).toEqual(result);
  return { state: result.state, turn: result.turns[0]! };
}
const dealt = (t: TurnStage) => t.events.filter(e => e.type === 'damage' && e.sourceId === 'kael').reduce((n, e) => n + (e.amount ?? 0), 0);
// Gather `n` chi with basic attacks (one per round).
function gathered(d: EncounterDefinition, n: number): BattleState {
  let s = beginBattle(d).state;
  for (let i = 0; i < n; i++) s = cast(d, s, 'attack').state;
  expect(chi(s)).toBe(Math.min(3, n));
  return s;
}

describe('P03 Martial chi', () => {
  it('starts at 0; a command that removes HP adds one (never past three), however many foes it hits', () => {
    const d = fixture(['gatherfist']);
    let s = beginBattle(d).state; expect(chi(s)).toBe(0);
    const first = cast(d, s, 'gatherfist'); s = first.state;
    expect(dealt(first.turn)).toBe(16); expect(chi(s)).toBe(1);
    expect(first.turn.events.find(e => e.type === 'chi')).toMatchObject({ sourceId: 'kael', amount: 1 });
    for (let i = 0; i < 4; i++) s = cast(d, s, 'attack').state;
    expect(chi(s)).toBe(3);
    const capped = cast(d, s, 'attack');
    expect(capped.turn.events.some(e => e.type === 'chi')).toBe(false);
  });
  it('never touches SPD, the queue or turn count', () => {
    const d = fixture(['gatherfist'], {}, ['f1', 'f2']);
    let s = beginBattle(d).state; const order = [...s.order];
    s = cast(d, s, 'gatherfist').state;
    expect(s.order).toEqual(order); expect(s.round).toBe(2); expect(s.turnIndex).toBe(0);
  });
  it('a blow that downs its foe counts the HP it really removed and builds one', () => {
    const d = fixture(['gatherfist']); d.enemies = [{ ...d.enemies[0]!, maxHp: 10 }, { id: 'f2', row: 'front', name: 'B', maxHp: 1000, speed: 1, color: 0 }];
    d.intents = [...d.intents, { sourceId: 'f2', targetSlot: 0, name: 'Wait', damage: 0, kind: 'physical' }];
    const s = beginBattle(d).state;
    const kill = cast(d, s, 'gatherfist');
    expect(dealt(kill.turn)).toBe(10); expect(chi(kill.state)).toBe(1);
    expect(kill.turn.events.some(e => e.type === 'down' && e.targetId === 'f1')).toBe(true);
  });
  it('a circle fist hitting two foes still builds no chi and pays two', () => {
    const d = fixture(['circlefist'], {}, ['f1', 'f2', 'b1']);
    const reason = actionReason(beginBattle(d).state, d, 'kael', 'circlefist');
    expect(reason).toBe('Not enough chi.');
    const s = gathered(d, 3);
    const r = cast(d, s, 'circlefist', 'enemies');
    expect(r.turn.events.filter(e => e.type === 'damage').map(e => e.targetId)).toEqual(['f1', 'f2']);
    expect(chi(r.state)).toBe(1);
  });
  it('release pays every point (at least one) for 10 + 8 per point, grown by Attack', () => {
    const d = fixture(['releasefist']);
    const empty = beginBattle(d).state;
    expect(actionReason(empty, d, 'kael', 'releasefist')).toBe('Not enough chi.');
    expect(targetOptions(empty, d, 'kael', 'releasefist').every(t => !t.valid)).toBe(true);
    expect([1, 2, 3].map(n => releasePower(d, 'kael', n))).toEqual([18, 26, 34]);
    const grown = { ...d, heroes: [{ ...d.heroes[0]!, damageBonus: 50 }] };
    expect(releasePower(grown, 'kael', 3)).toBe(51);
    const r = cast(d, gathered(d, 2), 'releasefist');
    expect(dealt(r.turn)).toBe(26); expect(chi(r.state)).toBe(0);
    expect(r.turn.events.find(e => e.type === 'chi')).toMatchObject({ amount: -2 });
  });
  it('perfect fist needs and pays three; stored fist neither builds nor pays', () => {
    const d = fixture(['perfectfist', 'storedfist']);
    expect(actionReason(gathered(d, 2), d, 'kael', 'perfectfist')).toBe('Not enough chi.');
    const full = gathered(d, 3);
    const stored = cast(d, full, 'storedfist');
    expect(dealt(stored.turn)).toBe(20); expect(chi(stored.state)).toBe(3);
    const perfect = cast(d, stored.state, 'perfectfist');
    expect(dealt(perfect.turn)).toBe(38); expect(chi(perfect.state)).toBe(0);
  });
  it('flow fist builds two', () => {
    const d = fixture(['flowfist']);
    const r = cast(d, beginBattle(d).state, 'flowfist');
    expect(dealt(r.turn)).toBe(12); expect(chi(r.state)).toBe(2);
  });
});

describe('P03 Martial tree and Kael branch', () => {
  it('a2y gathers one more from zero; kael1 hits harder from zero', () => {
    const d = fixture(['gatherfist'], { martialGatherChi: 1, kael1: 3 });
    const first = cast(d, beginBattle(d).state, 'gatherfist');
    expect(dealt(first.turn)).toBe(19); expect(chi(first.state)).toBe(2);
    const second = cast(d, first.state, 'gatherfist');
    expect(dealt(second.turn)).toBe(16); expect(chi(second.state)).toBe(3);
  });
  it('a4 and kael2: flow fist from zero hits harder and readies a round sooner', () => {
    const d = fixture(['flowfist'], { martialFlowZero: 6, kael2: 1 });
    const s = beginBattle(d).state;
    const r = cast(d, s, 'flowfist');
    expect(dealt(r.turn)).toBe(18); expect(r.state.heroes[0]!.cooldowns.flowfist).toBe(s.round + 2);
    const plain = cast(fixture(['flowfist']), s, 'flowfist');
    expect(plain.state.heroes[0]!.cooldowns.flowfist).toBe(s.round + 3);
  });
  it('b2x adds per point; b2y and kael3 reward paying all three', () => {
    const d = fixture(['releasefist'], { martialReleasePer: 2, martialReleaseQuick: 1, kael3: 4 });
    expect([1, 2, 3].map(n => releasePower(d, 'kael', n))).toEqual([20, 30, 44]);
    const s = gathered(d, 3);
    const r = cast(d, s, 'releasefist');
    expect(dealt(r.turn)).toBe(44); expect(r.state.heroes[0]!.cooldowns.releasefist).toBe(s.round + 1);
    const two = cast(d, gathered(d, 2), 'releasefist');
    expect(two.state.heroes[0]!.cooldowns.releasefist).toBe(gathered(d, 2).round + 2);
  });
  it('b4 strengthens the circle only against a crowded front row', () => {
    const crowded = fixture(['circlefist'], { martialCircleCrowd: 4 }, ['f1', 'f2']);
    expect(dealt(cast(crowded, gathered(crowded, 2), 'circlefist', 'enemies').turn)).toBe(36);
    const lone = fixture(['circlefist'], { martialCircleCrowd: 4 }, ['f1', 'b1']);
    const r = cast(lone, gathered(lone, 2), 'circlefist', 'enemies');
    expect(r.turn.events.filter(e => e.type === 'damage').map(e => [e.targetId, e.amount])).toEqual([['f1', 14]]);
  });
  it('c2x hits harder at full chi; c2y builds one at a cost', () => {
    const full = fixture(['storedfist'], { martialStoredFull: 5 });
    expect(dealt(cast(full, gathered(full, 3), 'storedfist').turn)).toBe(25);
    expect(dealt(cast(full, gathered(full, 2), 'storedfist').turn)).toBe(20);
    const build = fixture(['storedfist'], { martialStoredBuild: 4 });
    const r = cast(build, beginBattle(build).state, 'storedfist');
    expect(dealt(r.turn)).toBe(16); expect(chi(r.state)).toBe(1);
  });
  it('c4 adds power and a round of cooldown; kael4 adds power and locks the next gain only', () => {
    const d = fixture(['perfectfist'], { martialPerfectHeavy: 8, kael4: 6 });
    expect(skillCooldown(d, 'kael', 'perfectfist')).toBe(5);
    const r = cast(d, gathered(d, 3), 'perfectfist');
    expect(dealt(r.turn)).toBe(52); expect(r.state.heroes[0]!.chiLocked).toBe(true);
    expect(unitStatuses(r.state, d, 'kael').map(x => x.id)).toContain('chi');
    const locked = cast(d, r.state, 'attack');
    expect(dealt(locked.turn)).toBe(13); expect(chi(locked.state)).toBe(0); expect(locked.state.heroes[0]!.chiLocked).toBeUndefined();
    expect(chi(cast(d, locked.state, 'attack').state)).toBe(1);
  });
  it('replays every command to the same state', () => {
    const d = fixture(['gatherfist', 'releasefist', 'flowfist'], { kael1: 3, kael3: 4 });
    let s = beginBattle(d).state;
    for (const a of ['gatherfist', 'flowfist', 'releasefist', 'gatherfist', 'attack'] as ActionId[]) s = cast(d, s, a).state;
    expect(replay(d, s.commands)).toEqual(s);
  });
  it('the advisor builds chi, then spends it on a finisher', () => {
    const d = fixture(['gatherfist', 'releasefist']);
    let s = beginBattle(d).state; const used: ActionId[] = [];
    for (let i = 0; i < 6; i++) {
      const l = battleLesson(s, d)!; used.push(l.action);
      s = resolveCommand(s, d, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state;
    }
    expect(used).toContain('releasefist');
    expect(used.indexOf('releasefist')).toBeGreaterThan(used.indexOf('gatherfist'));
  });
});

describe('P03 Kael in the world', () => {
  const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); return raw; };
  it('joins the catalog and the featured slot, never the starter draft or a story arrival', () => {
    const catalog = heroCatalog(lookup, map).map(h => h.id);
    expect(catalog).toContain('kael');
    expect(ruinsMap.draft!.pool).not.toContain('kael');
    expect(ruinsMap.recruits?.some(r => r.hero === 'kael')).toBeFalsy();
    expect(map.company.featured).toContain('kael');
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) seen.add(boardOffers(newProfile(map, seed), map, lookup)[3]!);
    expect(seen.has('kael')).toBe(true);
  });
  it('has twenty nodes on the shared budget; unlocks add skills', () => {
    const tree = map.talents.kael!;
    expect(tree).toHaveLength(20);
    expect(talentsValid(map, 'kael', 5, { p1: 1, p2: 1 })).toBe(true);
    expect(talentsValid(map, 'kael', 5, { p2: 1 })).toBe(false);
    expect(talentsValid(map, 'kael', 5, { a2x: 1, a2y: 1 })).toBe(false);
    expect(skillChoices(kael, map, { a1: 1, a2x: 1 , a3: 1 })).toContain('flowfist');
    expect(skillChoices(kael, map, { c1s: 1 })).toEqual(['gatherfist', 'releasefist', 'storedfist']);
    const p = newProfile(map, 2, ['kael']); p.campXp = xpAt(5);
    const learnt = learnTalent(p, map, 'kael', 'p1').profile;
    expect(learnt.members.kael!.talents).toEqual({ p1: 1 });
    expect(parseGame(write({ profile: learnt, run: null }), map, lookup).profile).toEqual(learnt);
  });
  it('v46 → v47 keeps the open board, its featured offer and paid indexes; a refresh brings Kael in', () => {
    // A v46 profile: no stored lineup, the featured slot already bought.
    const p: Profile = { ...newProfile(map, 12), taken: [3], bank: { gold: 90, ore: 0, seal: 0, dust: 0 } };
    delete p.boardFeatured;
    const v46Offers = boardOffers({ ...p, boardFeatured: ['metta', 'lalin'] }, map, lookup);
    const old = JSON.parse(write({ profile: p, run: null })); old.version = 46; delete old.profile.boardFeatured;
    const loaded = parseGame(JSON.stringify(old), map, lookup).profile;
    expect(loaded.boardFeatured).toEqual(['metta', 'lalin']);
    expect(boardOffers(loaded, map, lookup)).toEqual(v46Offers);
    expect(loaded.taken).toEqual([3]);
    expect(JSON.parse(write({ profile: loaded, run: null })).version).toBe(48);
    const refreshed = refreshBoard({ ...loaded, bank: { ...loaded.bank, gold: 90 } }, map).profile;
    expect(refreshed.boardFeatured).toEqual(featuredLineup(map));
    expect(refreshed.boardFeatured).toContain('kael');
  });
  it('rejects a forged board lineup', () => {
    const p = newProfile(map, 3);
    for (const bad of [['nobody'], ['kael', 'kael'], 'kael']) {
      const raw = JSON.parse(write({ profile: p, run: null })); raw.profile.boardFeatured = bad;
      expect(() => parseGame(JSON.stringify(raw), map, lookup)).toThrow();
    }
  });
  it('hiring Kael from the featured slot adds one member and keeps the original three offers', () => {
    let p = { ...newProfile(map, 0), bank: { gold: 200, ore: 0, seal: 0, dust: 0 } };
    for (let seed = 0; seed < 500 && boardOffers(p, map, lookup)[3] !== 'kael'; seed++) p = { ...p, seed };
    expect(boardOffers(p, map, lookup)[3]).toBe('kael');
    const next = hire(p, map, lookup, 3);
    expect(next.event).toEqual({ type: 'hired', heroId: 'kael', duplicate: false });
    expect(next.profile.members.kael).toEqual({ stars: 1, dupes: 0 });
    expect(boardOffers(next.profile, map, lookup).slice(0, 3)).toEqual(boardOffers(p, map, lookup).slice(0, 3));
  });
});
