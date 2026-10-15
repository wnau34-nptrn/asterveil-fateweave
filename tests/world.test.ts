import { describe, expect, it } from 'vitest';
import { encounterById, encounters } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { createBattle, currentHeroId, resolveCommand } from '../src/core/battle/engine';
import { clearLegacySaves, expeditionKey, legacyKeys, loadExpedition, parseExpedition, saveExpedition, type StoragePort } from '../src/core/save/expedition-save';
import type { Direction, ExpeditionState, Point } from '../src/core/world/types';
import { battleState, canOpenChest, canRest, canRevive, chestAt, encounterChance, findTiles, finishBattle, isRevealed, move, newExpedition, openChest, recordBattle, rest, revive, rollPercent, startOf, tileAt } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

const lookup = encounterById;
const fresh = (seed = 7) => newExpedition(map, lookup, seed);
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
function memory(): StoragePort & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: k => { values.delete(k); } };
}
// Breadth-first route over walkable tiles, optionally treating the boss as passable.
function route(from: Point, to: Point, throughBoss = false): Direction[] {
  const key = (p: Point) => `${p.x},${p.y}`; const prev = new Map<string, [string, Direction]>(); const queue = [from]; const seen = new Set([key(from)]);
  while (queue.length) {
    const p = queue.shift()!;
    if (p.x === to.x && p.y === to.y) break;
    for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
      const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n);
      if (!t || t.kind === 'wall' || (t.kind === 'boss' && !throughBoss) || seen.has(key(n))) continue;
      seen.add(key(n)); prev.set(key(n), [key(p), d]); queue.push(n);
    }
  }
  const path: Direction[] = []; let cur = key(to);
  while (cur !== key(from)) { const step = prev.get(cur); if (!step) return []; path.unshift(step[1]); cur = step[0]; }
  return path;
}
// Plays the active battle with the teaching advisor until it ends, then applies it.
function fight(state: ExpeditionState): ExpeditionState {
  const data = lookup(state.battle!.encounterId)!; let s = battleState(state, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, lookup, s.commands), map, lookup).state;
}

describe('chapter map', () => {
  it('has one start, two camps, a boss guarding the only way to the goal, and rectangular rows', () => {
    expect(new Set(map.rows.map(r => r.length)).size).toBe(1);
    expect(findTiles(map, 'start')).toHaveLength(1); expect(findTiles(map, 'camp')).toHaveLength(2);
    const [boss] = findTiles(map, 'boss'); const [goal] = findTiles(map, 'goal');
    for (const camp of findTiles(map, 'camp')) expect(route(startOf(map), camp).length).toBeGreaterThan(0);
    expect(route(startOf(map), goal!)).toEqual([]);
    expect(route(startOf(map), goal!, true).length).toBeGreaterThan(0);
    expect(boss).toBeDefined();
    for (const zone of map.zones) for (const e of zone.pool) expect(lookup(e.encounterId)).toBeDefined();
    expect(lookup(map.tutorialEncounterId)).toBeDefined(); expect(lookup(map.bossEncounterId)).toBeDefined();
  });
});

describe('expedition rules', () => {
  it('moves one tile at a time, blocks walls and edges, and reveals fog around the party', () => {
    const s = fresh(); const start = startOf(map);
    expect(isRevealed(s, map, start)).toBe(true); expect(isRevealed(s, map, { x: 0, y: 0 })).toBe(false);
    expect(move({ ...s, position: { x: 5, y: 25 } }, map, 'left').event).toEqual({ type: 'blocked', reason: 'wall' });
    const r = move(s, map, 'left');
    expect(r.state.position).toEqual({ x: start.x - 1, y: start.y }); expect(r.state.steps).toBe(1);
    expect(s.position).toEqual(start);
  });
  it('rolls are deterministic per seed and step; pressure raises the shown chance until an encounter', () => {
    expect(rollPercent(1, 0)).toBe(rollPercent(1, 0));
    let s = fresh(11); const seen: number[] = [];
    for (let i = 0; i < 40 && !s.battle; i++) {
      const before = encounterChance(s, map, { x: s.position.x + (i % 2 ? 1 : -1), y: s.position.y });
      const r = move(s, map, i % 2 ? 'right' : 'left'); s = r.state;
      if (r.event.type === 'moved' && r.event.chance) { seen.push(r.event.chance); expect(r.event.chance).toBe(before); }
    }
    expect(s.battle?.kind).toBe('tutorial');
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    const again = (() => { let t = fresh(11); for (let i = 0; i < 40 && !t.battle; i++) t = move(t, map, i % 2 ? 'right' : 'left').state; return t; })();
    expect(again).toEqual(s);
  });
  it('blocks movement during a battle and resumes at the same tile with surviving HP after victory', () => {
    let s = fresh(3);
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    const where = s.position;
    expect(move(s, map, 'up').event).toEqual({ type: 'blocked', reason: 'busy' });
    const data = lookup(s.battle.encounterId)!;
    let b = battleState(s, lookup)!;
    b = resolveCommand(b, data, { beat: b.beat, heroId: currentHeroId(b, data)!, action: 'attack', targetId: 'raider' }).state;
    s = recordBattle(s, lookup, b.commands);
    expect(() => finishBattle(s, map, lookup)).toThrow();
    s = fight(s);
    expect(s.battle).toBeNull(); expect(s.position).toEqual(where); expect(s.tutorialDone).toBe(true); expect(s.wins).toBe(1);
    expect(Object.values(s.hp).some(hp => hp < 76)).toBe(true);
  });
  it('carries fallen heroes into the next battle; a rest heals the standing by half and embers revive one at a time', () => {
    let s = fresh(5); s.tutorialDone = true; s.hp = { guardian: 30, tracer: 0, weaver: 20, healer: 10 };
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    expect(s.battle.kind).toBe('random');
    expect(s.battle.entry).toEqual({ guardian: 30, tracer: 0, weaver: 20, healer: 10 });
    expect(createBattle(lookup(s.battle.encounterId)!, { hp: s.battle.entry }).order).not.toContain('tracer');
    const camp = findTiles(map, 'camp')[1]!;
    let t: ExpeditionState = { ...fresh(5), position: camp, hp: { guardian: 1, tracer: 0, weaver: 0, healer: 40 }, pressure: 20 };
    expect(canRest(t, map)).toBe(true);
    t = rest(t, map, lookup).state;
    expect(t.hp).toEqual({ guardian: 39, tracer: 0, weaver: 0, healer: 46 }); expect(t.pressure).toBe(0); expect(t.camp).toEqual(camp);
    expect(t.restReady).toBe(false); expect(canRest(t, map)).toBe(false);
    expect(rest(t, map, lookup).event).toEqual({ type: 'blocked', reason: 'busy' });
    expect(canRevive(t, map, 'tracer')).toBe(false);
    t = { ...t, resources: { ore: 0, ember: 1, seal: 0 } };
    expect(canRevive(t, map, 'guardian')).toBe(false);
    const r = revive(t, map, lookup, 'tracer');
    expect(r.event).toEqual({ type: 'revived', heroId: 'tracer' });
    expect(r.state.hp).toMatchObject({ tracer: 17, weaver: 0 }); expect(r.state.resources.ember).toBe(0);
    expect(revive(r.state, map, lookup, 'weaver').event.type).toBe('blocked');
    expect(canRest(fresh(), map)).toBe(false);
  });
  it('a camp becomes the return point on arrival, and a victory relights the campfire', () => {
    const camp = findTiles(map, 'camp')[1]!;
    let s: ExpeditionState = { ...fresh(5), position: { x: camp.x - 1, y: camp.y } };
    s = move(s, map, 'right').state;
    expect(s.camp).toEqual(camp); expect(s.battle).toBeNull();
    s = rest(s, map, lookup).state; expect(s.restReady).toBe(false);
    s = { ...s, position: { x: 10, y: 22 } };
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    s = fight(s); expect(s.restReady).toBe(true);
  });
  it('defeat returns to the last rested camp with a recovered party; a lost tutorial restarts in place', () => {
    const loseWith = (state: ExpeditionState) => {
      const data = lookup(state.battle!.encounterId)!; let b = battleState(state, lookup)!;
      while (b.outcome === 'active') b = resolveCommand(b, data, { beat: b.beat, heroId: currentHeroId(b, data)!, action: 'attack', targetId: b.enemies.find(e => e.hp > 0)!.id }).state;
      return { state: recordBattle(state, lookup, b.commands), outcome: b.outcome };
    };
    const camp = findTiles(map, 'camp')[0]!;
    const s: ExpeditionState = { ...fresh(9), tutorialDone: true, camp, hp: { guardian: 5, tracer: 3, weaver: 2, healer: 1 } };
    s.battle = { kind: 'random', encounterId: 'veil-siege', entry: { ...s.hp }, commands: [] };
    const lost = loseWith(s); expect(lost.outcome).toBe('defeat');
    const after = finishBattle(lost.state, map, lookup);
    expect(after.event.type).toBe('defeat'); expect(after.state.position).toEqual(camp); expect(after.state.battle).toBeNull();
    expect(after.state.hp).toEqual({ guardian: 76, tracer: 56, weaver: 48, healer: 46 }); expect(after.state.defeats).toBe(1);
    const t: ExpeditionState = { ...fresh(9), hp: { guardian: 1, tracer: 1, weaver: 1, healer: 1 } };
    t.battle = { kind: 'tutorial', encounterId: 'first-clash', entry: { ...t.hp }, commands: [] };
    const retry = finishBattle(loseWith(t).state, map, lookup).state;
    expect(retry.battle).toEqual({ kind: 'tutorial', encounterId: 'first-clash', entry: { guardian: 76, tracer: 56, weaver: 48, healer: 46 }, commands: [] });
    expect(retry.tutorialDone).toBe(false);
  });
  it('the boss blocks its tile, and only its defeat opens the goal', () => {
    const [boss] = findTiles(map, 'boss'); const below = { x: boss!.x, y: boss!.y + 1 };
    let s = { ...fresh(2), tutorialDone: true, position: below };
    const r = move(s, map, 'up'); expect(r.event).toMatchObject({ type: 'encounter', kind: 'boss' }); expect(r.state.position).toEqual(below);
    s = fight(r.state); expect(s.bossDefeated).toBe(true);
    s = move(s, map, 'up').state; expect(s.position).toEqual(boss);
    s = move(s, map, 'up').state; const g = move(s, map, 'up');
    expect(g.event).toEqual({ type: 'goal' }); expect(g.state.completed).toBe(true);
    expect(move(g.state, map, 'down').event).toEqual({ type: 'blocked', reason: 'busy' });
  });
  it('a full expedition from start to goal is winnable with the advisor and camp rests', () => {
    let s = fresh(2026); const [campA, campB] = [findTiles(map, 'camp')[1]!, findTiles(map, 'camp')[0]!]; const [goal] = findTiles(map, 'goal');
    const walk = (to: Point, throughBoss = false) => {
      for (let guard = 0; guard < 400 && (s.position.x !== to.x || s.position.y !== to.y) && !s.completed; guard++) {
        const dir = route(s.position, to, throughBoss || s.bossDefeated)[0]!; s = move(s, map, dir).state;
        if (s.battle) s = fight(s);
      }
    };
    const camp = () => { for (const id of Object.keys(s.hp)) if (canRevive(s, map, id)) s = revive(s, map, lookup, id).state; if (canRest(s, map)) s = rest(s, map, lookup).state; };
    walk(campA); camp(); walk(campB); camp(); walk(goal!, true);
    expect(s.completed).toBe(true); expect(s.tutorialDone).toBe(true); expect(s.bossDefeated).toBe(true); expect(s.wins).toBeGreaterThan(2);
  });
});

describe('resources and chests', () => {
  it('places every chest on a reachable floor tile with a unique id', () => {
    expect(new Set(map.chests.map(c => c.id)).size).toBe(map.chests.length);
    for (const c of map.chests) {
      expect(tileAt(map, c)?.kind).toBe('floor');
      expect(route(startOf(map), c).length).toBeGreaterThan(0);
    }
  });
  it('opens a chest once, with loot fixed by the seed and roll counter', () => {
    const chest = map.chests.find(c => c.tier === 'rare')!;
    const s: ExpeditionState = { ...fresh(12), position: { x: chest.x, y: chest.y } };
    expect(chestAt(map, s.position)).toEqual(chest); expect(canOpenChest(s, map)).toBe(true);
    const a = openChest(s, map); const b = openChest(s, map);
    expect(a).toEqual(b);
    if (a.event.type !== 'chest') throw new Error('expected a chest');
    expect(a.event.loot.seal).toBe(1); expect(a.event.loot.ember).toBe(1);
    expect(a.event.loot.ore).toBeGreaterThanOrEqual(30); expect(a.event.loot.ore).toBeLessThanOrEqual(40);
    expect(a.state.resources).toEqual(a.event.loot); expect(a.state.openedChests).toEqual([chest.id]);
    expect(canOpenChest(a.state, map)).toBe(false); expect(openChest(a.state, map).event.type).toBe('blocked');
    expect(canOpenChest(fresh(), map)).toBe(false);
  });
  it('a victory adds loot from its zone, the tutorial grants an ember and the boss grants seals', () => {
    let s = fresh(3);
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    s = fight(s);
    expect(s.resources).toEqual({ ore: 10, ember: 1, seal: 0 });
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    const before = s.resources.ore; s = fight(s);
    expect(s.resources.ore - before).toBeGreaterThanOrEqual(6); expect(s.resources.ore - before).toBeLessThanOrEqual(10);
    const [boss] = findTiles(map, 'boss');
    let t: ExpeditionState = { ...fresh(2), tutorialDone: true, position: { x: boss!.x, y: boss!.y + 1 } };
    t = fight(move(t, map, 'up').state);
    expect(t.resources).toEqual({ ore: 60, ember: 1, seal: 2 });
  });
});

describe('expedition save', () => {
  it('round-trips the world and an in-progress battle by replay', () => {
    const storage = memory(); let s = fresh(3);
    while (!s.battle) s = move(s, map, s.steps % 2 ? 'right' : 'left').state;
    const data = lookup(s.battle.encounterId)!; let b = battleState(s, lookup)!;
    b = resolveCommand(b, data, { beat: b.beat, heroId: 'tracer', action: 'mark', targetId: 'brute' }).state;
    s = recordBattle(s, lookup, b.commands);
    expect(saveExpedition(storage, s)).toBe(true);
    expect(loadExpedition(storage, map, lookup)).toEqual(s);
    expect(battleState(loadExpedition(storage, map, lookup)!, lookup)).toEqual(b);
  });
  it.each([
    ['malformed', () => '{bad'],
    ['wrong version', (s: ExpeditionState) => JSON.stringify({ version: 3, state: s })],
    ['old map version', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, mapVersion: 0 } })],
    ['wall position', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, position: { x: 0, y: 0 } } })],
    ['hp above max', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, hp: { ...s.hp, tracer: 99 } } })],
    ['all down outside battle', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, hp: { guardian: 0, tracer: 0, weaver: 0, healer: 0 } } })],
    ['foreign owner command', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, battle: { kind: 'random', encounterId: 'veil-siege', entry: s.hp, commands: [{ beat: 1, heroId: 'guardian', action: 'attack', targetId: 'brute' }] } } })],
    ['unknown encounter', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, battle: { kind: 'random', encounterId: 'crystal-rift', entry: s.hp, commands: [] } } })],
    ['negative ore', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, resources: { ore: -1, ember: 0, seal: 0 } } })],
    ['extra resource', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, resources: { ore: 1, ember: 0, seal: 0, gold: 5 } } })],
    ['unknown chest', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, openedChests: ['vault'] } })],
    ['repeated chest', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, openedChests: ['meadow-west', 'meadow-west'] } })],
    ['missing campfire flag', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, restReady: 'yes' } })],
    ['bad fog', (s: ExpeditionState) => JSON.stringify({ version: 2, state: { ...s, revealed: 'x' } })],
  ])('rejects %s', (_, make) => {
    expect(() => parseExpedition(make(fresh()), map, lookup)).toThrow();
    expect(loadExpedition({ getItem: () => make(fresh()), setItem: () => {} }, map, lookup)).toBeUndefined();
  });
  it('migrates a phase 1 (v1) save with empty resources and a lit campfire', () => {
    const v1: Partial<ExpeditionState> = { ...fresh(8), steps: 4 };
    delete v1.resources; delete v1.openedChests; delete v1.restReady;
    const loaded = parseExpedition(JSON.stringify({ version: 1, state: v1 }), map, lookup);
    expect(loaded).toEqual({ ...fresh(8), steps: 4 });
  });
  it('tolerates absent or denied storage and clears practice-mode slots', () => {
    const denied: StoragePort = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Denied'); } };
    expect(saveExpedition(undefined, fresh())).toBe(false); expect(saveExpedition(denied, fresh())).toBe(false);
    expect(loadExpedition(denied, map, lookup)).toBeUndefined();
    const storage = memory(); for (const k of legacyKeys) storage.setItem(k, 'x'); storage.setItem(expeditionKey, 'keep');
    clearLegacySaves(storage); expect([...storage.values.keys()]).toEqual([expeditionKey]);
  });
  it('applies a battle that already ended on enemy opening turns instead of discarding the save', () => {
    const s = { ...fresh(4), tutorialDone: true, hp: { guardian: 0, tracer: 0, weaver: 0, healer: 1 } };
    s.battle = { kind: 'random', encounterId: 'scout-patrol', entry: { ...s.hp }, commands: [] };
    expect(battleState(s, lookup)!.outcome).toBe('defeat');
    const loaded = parseExpedition(JSON.stringify({ version: 2, state: s }), map, lookup);
    expect(loaded.battle).toBeNull(); expect(loaded.defeats).toBe(1); expect(loaded.position).toEqual(startOf(map));
    for (const data of encounters) expect(() => createBattle(data, { hp: { guardian: 0, tracer: 0, weaver: 0, healer: 1 } })).not.toThrow();
  });
});
