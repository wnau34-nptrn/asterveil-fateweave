import { describe, expect, it } from 'vitest';
import { encounterById, mineEncounters } from '../src/content/encounters/catalog';
import { mineMap, mineSites } from '../src/content/world/chapter-mine';
import { MAPS } from '../src/content/world/maps';
import { createBattle, currentActorId, encounterProblems, nextIntentOf, previewCommand, replay, resolveCommand, targetOptions, withParty } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../src/core/battle/types';
import { parseGame, SAVE_VERSION } from '../src/core/save/expedition-save';
import { depart, newProfile } from '../src/core/world/profile';
import { battleData, battleState, interactMine, move, recordBattle } from '../src/core/world/world';
import { currentSave } from './fixtures/current-save';

const home = MAPS[0]!;
const guardian = encounterById('first-clash')!.heroes.find(h => h.id === 'guardian')!;
const mage = encounterById('veil-siege')!.heroes.find(h => h.id === 'weaver')!;
const giant = encounterById('crystal-giant')!;

function sample(actions: readonly ActionId[] = ['attack', 'bolt', 'bash'], attack = 10): EncounterDefinition {
  return withParty(giant, [{ ...mage, actions, attack, speed: 70, maxHp: 1_000 }]);
}
const cast = (data: EncounterDefinition, state: BattleState, action: ActionId = 'attack', targetId = 'f1') =>
  resolveCommand(state, data, { beat: state.beat, heroId: currentActorId(state)!, action, targetId }, true);

describe('Crystal Giant', () => {
  it('reflects direct magic once into barriers, times out, and reproduces the preview on replay', () => {
    const data = sample();
    const opening = createBattle(data);
    const state = structuredClone(opening);
    state.heroes[0]!.barrier = 5;
    expect(state.enemies[0]!.crystalArmor).toEqual({ until: 3, hits: 3 });
    const command = { beat: state.beat, heroId: 'weaver', action: 'bolt' as const, targetId: 'f1' };
    const preview = previewCommand(state, data, command);
    const result = cast(data, state, 'bolt');
    expect(result.state).toEqual(preview.state);
    expect(result.turns[0]!.events.filter(e => e.text === 'Crystal armor reflects magic.')).toEqual([
      expect.objectContaining({ sourceId: 'f1', targetId: 'weaver', absorbed: 5 }),
    ]);
    expect(cast(data, opening, 'bolt').state).toEqual(replay(data, [command]));
    let end = cast(data, opening, 'bolt').state;
    end = cast(data, end, 'attack').state;
    expect(end.enemies[0]!.crystalArmor).toBeUndefined();
    expect(nextIntentOf(end, data, 'f1')?.round).toBe(4);
  });

  it('breaks in three normal actions or a single heavy action', () => {
    const data = withParty(sample(), [
      { ...guardian, id: 'guardian', speed: 80, maxHp: 1_000, attack: 10, actions: ['attack', 'bash'] },
      { ...mage, speed: 79, maxHp: 1_000, attack: 10, actions: ['attack'] },
      { ...guardian, id: 'brann', speed: 78, maxHp: 1_000, attack: 10, actions: ['attack'] },
    ]);
    const opening = createBattle(data);
    const one = cast(data, opening).state;
    expect(one.enemies[0]!.crystalArmor?.hits).toBe(2);
    const two = cast(data, one).state;
    expect(two.enemies[0]!.crystalArmor?.hits).toBe(1);
    expect(cast(data, two).state.enemies[0]!.crystalArmor).toBeUndefined();
    expect(cast(data, opening, 'bash').state.enemies[0]!.crystalArmor).toBeUndefined();
  });

  it('reduces collapse damage for the guarded hero', () => {
    const data = withParty(giant, [{ ...guardian, speed: 200, maxHp: 1_000, actions: ['attack', 'guard'] }]);
    let state = createBattle(data);
    state = cast(data, state).state;
    state = cast(data, state).state;
    expect(nextIntentOf(state, data, 'f1')).toMatchObject({ round: 3, crystalCollapse: true, all: true });
    const exposed = cast(data, state).state;
    const guarded = cast(data, state, 'guard', guardian.id).state;
    expect(guarded.heroes[0]!.hp).toBeGreaterThan(exposed.heroes[0]!.hp);
  });

  it('splits strictly below half, keeps the third-round collapse, and wins on killing the giant', () => {
    const data = sample(['attack'], 1);
    const state = createBattle(data);
    state.enemies[0]!.hp = giant.enemies[0]!.maxHp / 2 + 1;
    const half = cast(data, state).state;
    expect(half.enemies.filter(e => e.absent)).toHaveLength(2);
    const split = cast(data, half);
    expect(split.events.filter(e => e.type === 'summon')).toHaveLength(2);
    for (const shard of split.state.enemies.slice(1)) expect(shard.absent).toBeUndefined();
    const planned = nextIntentOf(split.state, data, 'f1');
    expect(planned).toMatchObject({ round: 4 });
    const phaseTurn = split.turns.find(t => t.side === 'hero')!;
    expect(phaseTurn.state.enemies[1]!.summonedRound).toBe(half.round);
    const lethal = { ...split.state, enemies: split.state.enemies.map(e => e.id === 'f1' ? { ...e, hp: 1 } : e) };
    expect(cast(data, lethal).state.outcome).toBe('victory');
  });
});

describe('Mine save v69', () => {
  it('round-trips portable light and interactions and rejects invalid values', () => {
    const profile = { ...newProfile(home, 12), tutorialDone: true, cleared: MAPS.slice(0, 4).map(m => m.id) };
    const start = depart(profile, mineMap, encounterById, 7);
    const charge = interactMine({ ...start.run, position: mineSites.glowCrystals[0], steps: 3 }, mineMap, 'charge-crystal', encounterById).state;
    const following = interactMine({ ...charge, position: { x: mineSites.workers[1].x, y: mineSites.workers[1].y }, steps: 5 }, mineMap, 'invite-worker', encounterById).state;
    const game = { profile: start.profile, run: following };
    expect(SAVE_VERSION).toBe(69);
    expect(parseGame(currentSave(game), home, encounterById, MAPS)).toEqual(game);
    expect(() => parseGame(currentSave({ ...game, run: { ...following, mine: { ...following.mine!, crystalExpiresAt: 9_999 } } }), home, encounterById, MAPS)).toThrow(/mine light/);
    const corrupt = { ...following.mine!, rescue: { following: [mineSites.workers[0].id], rescued: [mineSites.workers[0].id] } };
    expect(() => parseGame(currentSave({ ...game, run: { ...following, mine: corrupt } }), home, encounterById, MAPS)).toThrow(/mine rescue/);
  });

  it('resumes the real boss from its committed command log', () => {
    const profile = { ...newProfile(home, 14), tutorialDone: true, cleared: MAPS.slice(0, 4).map(m => m.id) };
    const game = depart(profile, mineMap, encounterById, 7);
    const entrance = { ...game.run, position: { x: mineSites.boss.x, y: mineSites.boss.y + 1 },
      elitesDefeated: ['mine-overseer'], lanterns: mineSites.lanterns.map(site => site.id) };
    const started = move(entrance, mineMap, 'up', encounterById).state;
    const data = battleData(started, mineMap, encounterById)!;
    const opening = battleState(started, mineMap, encounterById)!;
    const heroId = currentActorId(opening)!;
    const target = targetOptions(opening, data, heroId, 'attack').find(option => option.valid)!;
    const played = resolveCommand(opening, data, { beat: opening.beat, heroId, action: 'attack', targetId: target.id }).state;
    const active = recordBattle(started, mineMap, encounterById, played.commands);
    const resumed = parseGame(currentSave({ profile: game.profile, run: active }), home, encounterById, MAPS).run!;
    expect(resumed.battle?.encounterId).toBe('crystal-giant');
    expect(battleState(resumed, mineMap, encounterById)).toEqual(played);
  });

  it('loads an actual v68 lake run with the same state', () => {
    const lake = MAPS[3]!;
    const profile = { ...newProfile(home, 13), tutorialDone: true, cleared: MAPS.slice(0, 3).map(m => m.id) };
    const game = depart(profile, lake, encounterById, 7);
    const raw = JSON.stringify({ version: 68, ...game });
    expect(parseGame(raw, home, encounterById, MAPS)).toEqual(game);
  });
});

it('lets a possessed worker surrender when the mine patrol is beaten', () => {
  const patrol = encounterById('mine-yard-patrol')!;
  const data = withParty(patrol, [{ ...mage, maxHp: 1_000, speed: 200, attack: 500, lane: 'back', actions: ['attack'] }]);
  let state = createBattle(data);
  state = cast(data, state, 'attack', 'f1').state;
  expect(state.outcome).toBe('active');
  state = cast(data, state, 'attack', 'b1').state;
  expect(state.outcome).toBe('victory');
  expect(state.enemies.find(e => e.id === 'f2')).toMatchObject({ surrendered: true });
});

it.each(mineEncounters)('validates the content definition for $id', data => {
  expect(encounterProblems(data)).toEqual([]);
});
