import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { forestMap as map } from '../src/content/world/chapter-forest';
import { resolveCommand } from '../src/core/battle/engine';
import { depart, newProfile, settle } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Point } from '../src/core/world/types';
import { battleData, battleState, canRest, findTiles, finishBattle, move, recordBattle, rest, startOf, tileAt } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

// Map 2 "เส้นทางป่าทึบ" (master plan A5): events, a forced elite gate, an optional elite, a secret, two camps, Garran.
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const at = (list: readonly Point[], p: Point) => list.some(q => q.x === p.x && q.y === p.y);
function route(from: Point, to: Point, o: { boss?: boolean; secret?: boolean; elites?: boolean } = {}): Direction[] {
  const key = (p: Point) => `${p.x},${p.y}`; const prev = new Map<string, [string, Direction]>(); const queue = [from]; const seen = new Set([key(from)]);
  while (queue.length) { const p = queue.shift()!; for (const [d, v] of Object.entries(dirs) as [Direction, Point][]) {
    const n = { x: p.x + v.x, y: p.y + v.y }; const t = tileAt(map, n);
    const secret = o.secret && at(map.puzzles.secrets, n);
    if (!t || (t.kind === 'wall' && !secret) || (t.kind === 'boss' && !o.boss) || (o.elites === false && at(map.elites, n)) || seen.has(key(n))) continue;
    seen.add(key(n)); prev.set(key(n), [key(p), d]); queue.push(n); } }
  const path: Direction[] = []; let cur = key(to);
  while (cur !== key(from)) { const step = prev.get(cur); if (!step) return []; path.unshift(step[1]); cur = step[0]; }
  return path;
}
function fight(state: ExpeditionState): ExpeditionState {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup).state;
}

describe('map 2: เส้นทางป่าทึบ', () => {
  it('geometry: the forced gate and the boss are on the only way; the optional elite can be bypassed; the secret pocket opens only through the cracked wall', () => {
    const goal = findTiles(map, 'goal')[0]!; const s = startOf(map);
    expect(map.rows.every(r => r.length === map.rows[0]!.length)).toBe(true); expect(findTiles(map, 'camp')).toHaveLength(2);
    expect(route(s, goal, { boss: true }).length).toBeGreaterThan(0); expect(route(s, goal)).toEqual([]);
    const forced = map.elites.find(e => e.forced)!; const optional = map.elites.find(e => !e.forced)!;
    expect(route(s, findTiles(map, 'camp').find(c => c.y < forced.y)!, { elites: false })).toEqual([]);
    for (const c of map.chests.filter(c => c.id !== 'forest-secret')) expect(route(s, c, { boss: true, elites: false }).length > 0 || c.y < forced.y).toBe(true);
    expect(route(s, optional).length).toBeGreaterThan(0);
    const pocket = map.chests.find(c => c.id === 'forest-secret')!; expect(route(s, pocket)).toEqual([]); expect(route(s, pocket, { secret: true }).length).toBeGreaterThan(0);
    for (const e of map.events) expect(route(s, e).length).toBeGreaterThan(0);
  });
  it('a company back from map 1 wins it with the advisor; Garran joins at the first camp', () => {
    const p = { ...newProfile(map, 6), tutorialDone: true }; for (const m of Object.values(p.members)) { m.level = 4; m.exp = 0; }
    for (const seed of [1, 2, 3]) {
      let s = depart(p, map, lookup, seed).run; expect(s.guests).toEqual(['garran']);
      const walk = (to: Point) => { for (let g = 0; g < 300 && (s.position.x !== to.x || s.position.y !== to.y) && !s.completed; g++) { s = move(s, map, route(s.position, to, { boss: true })[0]!).state; if (s.battle) s = fight(s); } };
      walk(findTiles(map, 'camp').find(c => c.y > 7)!); expect(s.recruited).toEqual(['garran']); if (canRest(s, map)) s = rest(s, map, lookup).state;
      walk(findTiles(map, 'camp').find(c => c.y < 7)!); if (canRest(s, map)) s = rest(s, map, lookup).state;
      walk(findTiles(map, 'goal')[0]!);
      expect(s.completed).toBe(true); expect(s.elitesDefeated).toContain('forest-gate');
      const home = settle(p, s, 'complete', map); expect(home.cleared).toEqual([map.id]); expect(home.company).toContain('garran');
    }
  });
});
