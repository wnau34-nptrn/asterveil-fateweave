import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { parseGame } from '../src/core/save/expedition-save';
import { newProfile, settle } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Point } from '../src/core/world/types';
import { findTiles, move, newExpedition, rest, startOf, travel, travelTargets } from '../src/core/world/world';

// 4B camp travel and 4C optional elite returns (owner-approved 2026-10-16).
const run = (patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const [campA, campB] = findTiles(map, 'camp'); const key = (p: Point) => `${p.x},${p.y}`;
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

describe('camp travel', () => {
  it('reaching a camp records it; from a muster point the party travels free to reached camps and the entrance', () => {
    let s = run();
    expect(travelTargets(s, map)).toEqual([]);
    for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
      const from = { x: campA!.x - o.x, y: campA!.y - o.y }; const r = move({ ...s, position: from, repel: 5 }, map, d);
      if (r.state.position.x === campA!.x && r.state.position.y === campA!.y) { s = r.state; break; }
    }
    expect(s.visited).toEqual([key(campA!)]);
    expect(travelTargets(s, map)).toEqual([startOf(map)]);
    const r = travel(s, map, startOf(map)); expect(r.event).toEqual({ type: 'travelled', to: startOf(map) });
    expect(r.state.position).toEqual(startOf(map)); expect(r.state.rolls).toBe(s.rolls);
    const back = travel(r.state, map, campA!); expect(back.state.position).toEqual(campA); expect(back.state.camp).toEqual(campA);
    // Unvisited camps and non-muster positions are refused.
    expect(travel(r.state, map, campB!).event).toEqual({ type: 'blocked', reason: 'busy' });
    expect(travelTargets({ ...r.state, position: { x: startOf(map).x, y: startOf(map).y - 1 } }, map)).toEqual([]);
  });
});

describe('optional elite returns', () => {
  const optional = map.elites.find(e => !e.forced && !e.mini)!; const forced = map.elites.find(e => e.forced)!; const mini = map.elites.find(e => e.mini)!;
  it('a rest brings back beaten optional elites one level higher; gate guards and the mini-boss stay beaten', () => {
    const s = run({ position: campA!, elitesDefeated: [optional.id, forced.id, mini.id], restReady: true });
    const r = rest(s, map, lookup);
    expect(r.event).toEqual({ type: 'rested', respawned: [optional.id] });
    expect(r.state.elitesDefeated).toEqual([forced.id, mini.id]); expect(r.state.respawns).toEqual({ [optional.id]: 1 });
    // Fighting it again: one level higher than its map fight level.
    for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
      const m = move({ ...r.state, position: { x: optional.x - o.x, y: optional.y - o.y } }, map, d);
      if (m.state.battle) { expect(m.state.battle).toMatchObject({ kind: 'elite', level: optional.level! + 1, source: optional.id }); break; }
    }
  });
  it('returns count toward the trainer quest; save v19 keeps visits and returns and v18 migrates', () => {
    const s = run({ elitesDefeated: [optional.id], respawns: { [optional.id]: 2 }, visited: [key(campA!)] });
    expect(settle(newProfile(map, 3), s, 'withdrawn', map).quests['trainer-elites']?.progress).toBe(3);
    const raw = (r: unknown, version = 19) => JSON.stringify({ version, profile: newProfile(map, 3), run: r });
    expect(parseGame(raw(s), map, lookup).run).toEqual(s);
    expect(() => parseGame(raw({ ...s, respawns: { [forced.id]: 1 } }), map, lookup)).toThrow();
    expect(() => parseGame(raw({ ...s, visited: ['0,0'] }), map, lookup)).toThrow();
    const old = { ...s, camp: campA } as Partial<ExpeditionState>; delete old.visited; delete old.respawns;
    expect(parseGame(raw(old, 18), map, lookup).run).toMatchObject({ visited: [key(campA!)], respawns: {} });
  });
});
