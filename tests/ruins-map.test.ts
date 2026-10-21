import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne } from '../src/content/world/chapter1';
import { ruinsMap as map } from '../src/content/world/chapter-ruins';
import { MAPS } from '../src/content/world/maps';
import { resolveCommand } from '../src/core/battle/engine';
import { depart, mapUnlocked, newProfile, settle } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Point } from '../src/core/world/types';
import { battleData, battleState, canRest, findTiles, finishBattle, move, newExpedition, recordBattle, rest, startOf, startPrologue, tileAt, wear } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

// Map 1 "ซากชายแดน" (chapters plan, owner-approved 2026-10-17): the short teaching expedition the prologue opens.
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
function route(from: Point, to: Point, throughBoss: boolean): Direction[] {
  const key = (p: Point) => `${p.x},${p.y}`; const prev = new Map<string, [string, Direction]>(); const queue = [from]; const seen = new Set([key(from)]);
  while (queue.length) {
    const p = queue.shift()!;
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
function fight(state: ExpeditionState): ExpeditionState {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup).state;
}

describe('map 1: ซากชายแดน', () => {
  it('comes first in the campaign, then the frontier; it is small, with one camp and a boss on the only way to the goal', () => {
    expect(MAPS.map(m => m.id)).toEqual([map.id, chapterOne.id]); expect(map.chapter).toBe(1);
    expect(map.rows.length * map.rows[0]!.length).toBeLessThanOrEqual(14 * 12);
    expect(map.rows.every(r => r.length === map.rows[0]!.length)).toBe(true);
    const [goal] = findTiles(map, 'goal'); expect(findTiles(map, 'camp')).toHaveLength(1);
    expect(route(startOf(map), findTiles(map, 'camp')[0]!, false).length).toBeGreaterThan(0);
    expect(route(startOf(map), goal!, false)).toEqual([]); expect(route(startOf(map), goal!, true).length).toBeGreaterThan(0);
    for (const c of map.chests) expect(route(startOf(map), c, false).length).toBeGreaterThan(0);
    expect(map.elites).toEqual([]); expect(map.events).toEqual([]); expect(map.quest.need).toBe(0); expect(map.bossCharm).toBeUndefined();
    for (const z of map.zones.filter(z => !z.safe)) expect(z.levels![1]).toBeLessThanOrEqual(3);
  });
  it('the map opens for everyone; the frontier opens once it is cleared', () => {
    const p = newProfile(map, 4);
    expect(mapUnlocked(p, MAPS, map.id)).toBe(true); expect(mapUnlocked(p, MAPS, chapterOne.id)).toBe(false);
    expect(mapUnlocked({ ...p, cleared: [map.id] }, MAPS, chapterOne.id)).toBe(true);
  });
  it('the prologue win leaves one plain body piece in the bag, and a member can wear it at once', () => {
    let s = startPrologue(newExpedition(map, lookup, 11), map).state; s = fight(s);
    expect(s.tutorialDone).toBe(true); expect(s.found).toHaveLength(1);
    expect(s.found[0]).toMatchObject({ uid: 0, slot: 'body', rarity: 1, level: 1, affixes: ['hp'] });
    const worn = wear(s, map, lookup, 'guardian', 'found', 0);
    expect(worn.event).toEqual({ type: 'equipped', heroId: 'guardian' }); expect(worn.state.found).toEqual([]);
  });
  it('a new company wins the whole map with the advisor, resting at the camp, and settles it as cleared', () => {
    const profile = newProfile(map, 5);
    for (const seed of [1, 2, 3, 2026]) {
      let s = startPrologue(depart(profile, map, lookup, seed).run, map).state; s = fight(s);
      const walk = (to: Point, boss = false) => {
        for (let guard = 0; guard < 200 && (s.position.x !== to.x || s.position.y !== to.y) && !s.completed; guard++) {
          s = move(s, map, route(s.position, to, boss || s.bossDefeated)[0]!).state; if (s.battle) s = fight(s);
        }
      };
      for (const c of map.chests) walk(c);
      walk(findTiles(map, 'camp')[0]!); if (canRest(s, map)) s = rest(s, map, lookup).state;
      walk(findTiles(map, 'goal')[0]!, true);
      expect(s.completed).toBe(true); expect(s.bossDefeated).toBe(true); expect(s.bossLoot).toBeUndefined();
      // The captain drops the boss's ordinary items, but no targeted boss charm on the teaching map.
      expect(s.found.length).toBeGreaterThanOrEqual(map.equipment.bossDrops); expect(s.found.some(i => i.boss)).toBe(false);
      const home = settle({ ...profile, tutorialDone: true }, s, 'complete', map);
      expect(home.cleared).toEqual([map.id]); expect(mapUnlocked(home, MAPS, chapterOne.id)).toBe(true);
    }
  });
});

describe('Codex systems on several maps (A1)', () => {
  it('clearing map 1 leaves the item-level cap; clearing the frontier raises it', () => {
    const levels = map.equipment.forge.itemLevel; const profile = { ...newProfile(map, 5), tutorialDone: true };
    const run = depart(profile, map, lookup, 3).run;
    expect(settle(profile, { ...run, completed: true }, 'complete', map).forgeLevel).toBe(levels.baseCap);
    const frontierRun = depart(profile, chapterOne, lookup, 3).run;
    expect(settle(profile, { ...frontierRun, completed: true }, 'complete', chapterOne).forgeLevel).toBe(levels.clears.find(c => c.map === chapterOne.id)!.cap);
  });
  it('the map-1 captain drops rare to epic pieces of this map\'s sets, never legendary', () => {
    const sets = new Set(map.zones.flatMap(z => z.sets ?? [])); let seen = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      let s = depart({ ...newProfile(map, 5), tutorialDone: true }, map, lookup, seed).run; const before = s.found.length;
      s = { ...s, position: { ...findTiles(map, 'boss')[0]!, y: findTiles(map, 'boss')[0]!.y + 1 } };
      s = fight(move(s, map, 'up').state);
      for (const item of s.found.slice(before)) {
        seen++; expect(item.rarity).toBeGreaterThanOrEqual(1); expect(item.rarity).toBeLessThanOrEqual(3);
        if (item.set) expect(sets.has(item.set)).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
