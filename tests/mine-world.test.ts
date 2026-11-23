import { describe, expect, it } from 'vitest';
import { encounterById } from '../src/content/encounters/catalog';
import { lakeMap } from '../src/content/world/chapter-lake';
import { mineExploration, mineSites } from '../src/content/world/chapter-mine';
import { MAPS } from '../src/content/world/maps';
import { currentActorId, resolveCommand } from '../src/core/battle/engine';
import { applyCommand, parseCommand, type CommandContext, type GameCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import type { Game } from '../src/core/save/expedition-save';
import { mineCrystalStepsLeft } from '../src/core/world/mine-light';
import { depart, newProfile, settle } from '../src/core/world/profile';
import { passableWall } from '../src/core/world/puzzles';
import { battleData, battleState, bossSealed, isRevealed, move, questDone, rollPercent, tileAt } from '../src/core/world/world';
import type { Direction, MapDefinition, Point, Profile } from '../src/core/world/types';

const { yardCamp, cavernCamp, workers, lanterns, overseer } = mineSites;
const { cart, beam } = mineExploration.mine;
const quiet = (id: string) => ({ id, name: id, safe: true, base: 0, step: 0, cap: 0, pool: [] });
const testEncounter = 'mine-route-fixture';
const training = encounterById('first-clash')!;
const lookup = (id: string) => id === testEncounter
  ? { ...training, id, enemies: [{ ...training.enemies[0]!, maxHp: 1 }] }
  : encounterById(id);
// The real quest and board are exercised through game commands with a minimal stand-in encounter.
const map: MapDefinition = {
  ...lakeMap, ...mineExploration, tide: undefined, story: undefined, events: [], herbs: [], chests: [],
  zones: ['mine-yard', 'mine-tunnels', 'mine-cavern', 'camp'].map(quiet),
  elites: [{ ...overseer, id: 'mine-overseer', forced: true, encounterId: testEncounter }],
  bossEncounterId: testEncounter,
};
const ctx: CommandContext = { home: MAPS[0]!, maps: [...MAPS, map], lookup, seeds: sequenceSeeds([7]) };
const directions: readonly [Direction, number, number][] = [['up', 0, -1], ['right', 1, 0], ['down', 0, 1], ['left', -1, 0]];
const key = ({ x, y }: Point) => `${x},${y}`;
const baseProfile = (ids = ['guardian', 'tracer', 'weaver', 'healer']): Profile => ({
  ...newProfile(map, 7, ids), tutorialDone: true, cleared: MAPS.map(entry => entry.id),
});

function run(profile = baseProfile()): Game {
  return depart(profile, map, lookup, 7);
}

function commit(game: Game, cmd: GameCommand) {
  const result = applyCommand(game, cmd, ctx);
  if ('rejected' in result) throw new Error(`${cmd.kind}: ${result.rejected}`);
  return result;
}

function walk(game: Game, to: Point): Game {
  const state = game.run!;
  const queue: { at: Point; path: Direction[] }[] = [{ at: state.position, path: [] }];
  const visited = new Set([key(state.position)]);
  for (const { at, path } of queue) {
    if (key(at) === key(to)) return path.reduce((g, dir) => commit(g, { kind: 'move', dir }).game, game);
    for (const [dir, dx, dy] of directions) {
      const next = { x: at.x + dx, y: at.y + dy };
      const tile = tileAt(map, next);
      const id = key(next);
      if (visited.has(id) || !tile || tile.kind === 'boss' || tile.kind === 'goal') continue;
      if (tile.kind === 'wall' && !passableWall(state, map, next)) continue;
      if (id === key(overseer) && id !== key(to) && !state.elitesDefeated.includes('mine-overseer')) continue;
      visited.add(id);
      queue.push({ at: next, path: [...path, dir] });
    }
  }
  throw new Error(`No path to ${key(to)}`);
}

function light(game: Game): Game {
  return lanterns.reduce((g, at) => commit(walk(g, at), { kind: 'mine', action: 'light-lantern' }).game, game);
}
function rescue(game: Game): Game {
  const escort = workers.reduce((g, at) => commit(walk(g, at), { kind: 'mine', action: 'invite-worker' }).game, game);
  expect(questDone(escort.run!, map)).not.toContain('workers');
  return walk(escort, yardCamp);
}
function winFixture(game: Game): Game {
  const data = battleData(game.run!, map, lookup)!;
  const state = battleState(game.run!, map, lookup)!;
  const end = resolveCommand(state, data, { beat: state.beat, heroId: currentActorId(state)!, action: 'attack', targetId: state.enemies[0]!.id }).state;
  expect(end.outcome).toBe('victory');
  return commit(game, { kind: 'battle', commands: end.commands }).game;
}
function defeatOverseer(game: Game): Game {
  const atGate = walk(game, overseer);
  expect(atGate.run!.battle?.source).toBe('mine-overseer');
  return winFixture(atGate);
}

describe('Map 5 world commands', () => {
  it.each([
    { first: 'lanterns', second: 'workers', one: light, two: rescue },
    { first: 'workers', second: 'overseer', one: rescue, two: defeatOverseer },
    { first: 'overseer', second: 'lanterns', one: defeatOverseer, two: light },
  ])('opens the seal with $first and $second', ({ first, second, one, two }) => {
    const camp = walk(run(), yardCamp);
    expect(camp.run?.recruited).toEqual(['brann']);
    expect(camp.run?.mine?.stories).toEqual(['brann']);

    const only = one(camp);
    expect(questDone(only.run!, map)).toEqual([first]);
    expect(only.run?.recruited).toEqual(['brann', 'kael']);
    const beforeBoss = walk(only, { x: cavernCamp.x, y: cavernCamp.y - 2 });
    expect(applyCommand(beforeBoss, { kind: 'move', dir: 'up' }, ctx)).toEqual({ rejected: 'sealed' });

    const ready = two(only);
    expect(new Set(questDone(ready.run!, map))).toEqual(new Set([first, second]));
    expect(ready.run?.recruited).toEqual(['brann', 'kael']);
    expect(bossSealed(ready.run!, map)).toBe(false);
    const next = walk(ready, { x: cavernCamp.x, y: cavernCamp.y - 2 });
    const inBattle = commit(next, { kind: 'move', dir: 'up' }).game;
    expect(inBattle.run?.battle?.kind).toBe('boss');
    const won = winFixture(inBattle);
    const bossTile = commit(won, { kind: 'move', dir: 'up' }).game;
    const complete = commit(bossTile, { kind: 'move', dir: 'up' }).game;
    expect(complete.run).toBeNull();
    expect(complete.profile.cleared).toContain(map.id);
    expect(complete.profile.company).toEqual(expect.arrayContaining(['brann', 'kael']));
  });

  it('validates mine interactions, preserves the step count and pays an owned recruit once', () => {
    const owned = baseProfile(['guardian', 'brann', 'kael']);
    const start = run(owned);
    expect(parseCommand({ kind: 'mine', action: 'other' })).toBeUndefined();
    expect(applyCommand(start, { kind: 'mine', action: 'invite-worker' }, ctx)).toEqual({ rejected: 'busy' });
    const camp = walk(start, yardCamp);
    expect(camp.run?.mine?.stories).toEqual(['brann']);
    expect(camp.run?.recruited).toBeUndefined();
    const atLamp = walk(camp, lanterns[0]);
    const lit = commit(atLamp, { kind: 'mine', action: 'light-lantern' }).game;
    expect(lit.run?.steps).toBe(atLamp.run?.steps);
    expect(atLamp.run?.lanterns).toBeUndefined();
    expect(applyCommand(lit, { kind: 'mine', action: 'light-lantern' }, ctx)).toEqual({ rejected: 'busy' });
    const home = settle(owned, camp.run!, 'withdrawn', map);
    expect(home.members.brann?.shards).toBe(map.company.shardsPerDuplicate);
    expect(home.members.kael?.shards).toBe(0);
    const revisit = walk(run(home), yardCamp);
    expect(settle(home, revisit.run!, 'withdrawn', map).members.brann?.shards).toBe(map.company.shardsPerDuplicate);
  });

  it('delivers workers when travelling to the yard without taking movement steps', () => {
    const camp = walk(run(), yardCamp);
    const escort = workers.reduce((g, at) => commit(walk(g, at), { kind: 'mine', action: 'invite-worker' }).game, camp);
    const from = walk(escort, cavernCamp);
    expect(questDone(from.run!, map)).toEqual([]);
    const returned = commit(from, { kind: 'travel', to: yardCamp }).game;
    expect(returned.run?.steps).toBe(from.run?.steps);
    expect(questDone(returned.run!, map)).toEqual(['workers']);
    expect(returned.run?.recruited).toEqual(['brann', 'kael']);
  });

  it('opens the rail wall and ledger door only from the matching puzzle commands', () => {
    const start = walk(run(), cart.start);
    const wrong = commit(start, { kind: 'mine', action: 'push-cart' }).game;
    expect(passableWall(wrong.run!, map, cart.wall)).toBe(false);
    const lined = cart.switches.reduce((g, control) => commit(walk(g, control.lever), { kind: 'mine', action: 'switch-track' }).game, wrong);
    const opened = commit(walk(lined, cart.start), { kind: 'mine', action: 'push-cart' }).game;
    expect(passableWall(opened.run!, map, cart.wall)).toBe(true);
    const [a, b, c] = beam.crystals;
    let aligned = commit(walk(opened, a), { kind: 'mine', action: 'turn-crystal' }).game;
    aligned = commit(walk(aligned, b), { kind: 'mine', action: 'turn-crystal' }).game;
    aligned = commit(aligned, { kind: 'mine', action: 'turn-crystal' }).game;
    expect(passableWall(aligned.run!, map, beam.door)).toBe(false);
    aligned = commit(walk(aligned, c), { kind: 'mine', action: 'turn-crystal' }).game;
    expect(passableWall(aligned.run!, map, beam.door)).toBe(true);
    expect(walk(aligned, mineSites.ledgerPages[2]).run?.position).toEqual({ x: 23, y: 5 });
  });

  it('keeps the dark radius when stepping into the workers’ opened wall', () => {
    const approach = walk(run(), { x: 16, y: 12 });
    const gap = commit(approach, { kind: 'move', dir: 'up' }).game.run!;
    expect(gap.secrets).toContain('mine-workers-passage');
    expect(isRevealed(gap, map, { x: 16, y: 10 })).toBe(true);
    expect(isRevealed(gap, map, { x: 16, y: 9 })).toBe(false);
  });

  it('uses portable light on the twelfth successful step, then applies dark pressure on the thirteenth', () => {
    const atCrystal = walk(run(), mineSites.glowCrystals[0]);
    const charged = commit(atCrystal, { kind: 'mine', action: 'charge-crystal' }).game.run!;
    const expires = charged.mine!.crystalExpiresAt!;
    expect(mineCrystalStepsLeft({ steps: charged.steps, crystalExpiresAt: expires })).toBe(12);
    expect(isRevealed(charged, map, { x: charged.position.x + 2, y: charged.position.y })).toBe(true);

    const pressured: MapDefinition = {
      ...map, mine: { ...map.mine!, darkPressurePercent: 150 },
      zones: map.zones.map(zone => zone.id === 'mine-tunnels' ? { ...zone, safe: false, step: 4, cap: 40, pool: [{ encounterId: testEncounter, weight: 1 }] } : zone),
    };
    const seed = Array.from({ length: 20 }, (_, value) => value).find(value => rollPercent(value, charged.rolls + 1) >= 4)!;
    const twelve = move({ ...charged, seed, steps: expires - 1 }, pressured, 'up', lookup).state;
    expect(twelve.steps).toBe(expires);
    expect(twelve.pressure).toBe(4);
    const thirteen = move(twelve, pressured, 'down', lookup).state;
    expect(thirteen.pressure).toBe(10);
  });
});
