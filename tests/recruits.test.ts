import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap as map } from '../src/content/world/chapter-ruins';
import { chapterOne } from '../src/content/world/chapter1';
import { resolveCommand } from '../src/core/battle/engine';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { depart, joinLevel, newProfile, settle } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Item, Point, Profile } from '../src/core/world/types';
import { battleData, battleState, findTiles, finishBattle, move, recordBattle, startPrologue, tileAt, wear } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

// Master plan A2 (owner 2026-10-21): a new ค่ายทหารรับจ้าง starts with the Knight; the other three travel map 1 as
// guests and join at the prologue win, the camp and the boss. Catch-up: join level, reserve EXP, catch-up EXP.
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
function route(from: Point, to: Point, boss: boolean): Direction[] {
  const key = (p: Point) => `${p.x},${p.y}`; const prev = new Map<string, [string, Direction]>(); const queue = [from]; const seen = new Set([key(from)]);
  while (queue.length) { const p = queue.shift()!; for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
    const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n);
    if (!t || t.kind === 'wall' || (t.kind === 'boss' && !boss) || seen.has(key(n))) continue; seen.add(key(n)); prev.set(key(n), [key(p), d]); queue.push(n); } }
  const path: Direction[] = []; let cur = key(to);
  while (cur !== key(from)) { const step = prev.get(cur); if (!step) return []; path.unshift(step[1]); cur = step[0]; }
  return path;
}
function fight(state: ExpeditionState): ExpeditionState {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup).state;
}
const fresh = (): Profile => newProfile(map, 9, map.firstCompany);

describe('story recruits', () => {
  it('a new company is the Knight alone; map 1 brings the other three as guests in the party', () => {
    const p = fresh(); expect(p.company).toEqual(['guardian']); expect(p.party.deployed).toEqual(['guardian']);
    const { run } = depart(p, map, lookup, 4);
    expect(run.roster.deployed).toEqual(['guardian', 'tracer', 'weaver', 'healer']); expect(run.guests).toEqual(['tracer', 'weaver', 'healer']);
    expect(depart(newProfile(map, 9), map, lookup, 4).run.guests).toBeUndefined();
    expect(depart(fresh(), chapterOne, lookup, 4).run.guests).toBeUndefined();
  });
  it('the prologue win, the camp and the boss each recruit one guest; settling adds them to the company', () => {
    let s = startPrologue(depart(fresh(), map, lookup, 4).run, map).state; s = fight(s);
    expect(s.recruited).toEqual(['tracer']); expect(s.guests).toEqual(['weaver', 'healer']);
    const walk = (to: Point, boss = false) => { for (let g = 0; g < 200 && (s.position.x !== to.x || s.position.y !== to.y) && !s.completed; g++) { s = move(s, map, route(s.position, to, boss || s.bossDefeated)[0]!).state; if (s.battle) s = fight(s); } };
    walk(findTiles(map, 'camp')[0]!); expect(s.recruited).toEqual(['tracer', 'weaver']);
    walk(findTiles(map, 'goal')[0]!, true); expect(s.recruited).toEqual(['tracer', 'weaver', 'healer']); expect(s.guests).toEqual([]);
    const home = settle({ ...fresh(), tutorialDone: true }, s, 'complete', map);
    expect(home.company).toEqual(['guardian', 'tracer', 'weaver', 'healer']); expect(home.party.deployed).toEqual(['guardian', 'tracer', 'weaver', 'healer']);
    expect(home.members.healer!.level).toBe(s.members.healer!.level);
  });
  it('guests who never joined leave on withdrawal; finds they wore go to the bag', () => {
    let s = startPrologue(depart(fresh(), map, lookup, 4).run, map).state; s = fight(s);
    s = wear(s, map, lookup, 'weaver', 'found', 0).state; expect(s.members.weaver!.gear!.body).toBeDefined();
    const home = settle({ ...fresh(), tutorialDone: true }, s, 'withdrawn', map);
    expect(home.company).toEqual(['guardian', 'tracer']); expect(home.members.weaver).toBeUndefined();
    expect(home.items.map((i: Item) => i.slot)).toEqual(['body']);
  });
  it('saves v30 runs with guests; rejects a guest who is already a member', () => {
    const { profile, run } = depart(fresh(), map, lookup, 4); let raw = '';
    saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, { profile, run });
    expect(JSON.parse(raw).version).toBe(33); expect(parseGame(raw, chapterOne, lookup, [map, chapterOne]).run!.guests).toEqual(['tracer', 'weaver', 'healer']);
    const bad = JSON.parse(raw); bad.profile.company.push('tracer'); bad.profile.members.tracer = { stars: 1, dupes: 0 };
    expect(() => parseGame(JSON.stringify(bad), chapterOne, lookup, [map, chapterOne])).toThrow();
  });
});
describe('catch-up', () => {
  it('new members join two levels below the best; reserve members learn at half; far-behind members learn faster', () => {
    const p = newProfile(chapterOne, 3); p.members.guardian = { stars: 1, dupes: 0, level: 7, exp: 0 };
    expect(joinLevel(p, chapterOne)).toBe(5); expect(joinLevel(newProfile(chapterOne, 3), chapterOne)).toBe(1);
    p.party = { deployed: ['guardian', 'tracer', 'weaver'], reserve: ['healer'] };
    let s = depart({ ...p, tutorialDone: true }, chapterOne, lookup, 5).run; s.members.tracer = { stars: 1, dupes: 0, level: 6, exp: 0 };
    s = { ...s, battle: { kind: 'random', encounterId: 'scout-patrol', entry: Object.fromEntries(s.roster.deployed.map(id => [id, s.hp[id]!])), commands: [], level: 5 } };
    const data = battleData(s, chapterOne, lookup)!; let b = battleState(s, chapterOne, lookup)!;
    while (b.outcome === 'active') { const l = battleLesson(b, data)!; b = resolveCommand(b, data, { beat: b.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
    const ev = finishBattle(recordBattle(s, chapterOne, lookup, b.commands), chapterOne, lookup).event;
    if (ev.type !== 'victory') throw new Error('expected a win');
    // weaver (Lv1, 6 behind) gets +50%; healer is in reserve (half) but also far behind (+50%).
    expect(ev.exp!.weaver!.gained).toBeGreaterThan(ev.exp!.tracer!.gained); expect(ev.exp!.healer!.gained).toBeLessThan(ev.exp!.weaver!.gained);
  });
});
