import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap as map } from '../src/content/world/chapter-ruins';
import { chapterOne } from '../src/content/world/chapter1';
import { resolveCommand } from '../src/core/battle/engine';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { depart, joinLevel, newProfile, settle } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Point, Profile } from '../src/core/world/types';
import { battleData, battleState, canRest, memberDef, rest, findTiles, finishBattle, move, recordBattle, startPrologue, tileAt } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

// Master plan A2 (owner 2026-10-21, 2026-10-23): a new ค่ายทหารรับจ้าง starts with the Knight. Catch-up: join level,
// reserve EXP, catch-up EXP.
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
// The tile one step short of `to` along `path` from `from`.
function stepBack(from: Point, path: Direction[]): Point {
  let p = from; for (const d of path.slice(0, -1)) p = { x: p.x + dirs[d].x, y: p.y + dirs[d].y }; return p;
}
const walker = (get: () => ExpeditionState, set: (s: ExpeditionState) => void) => (to: Point, boss = false) => {
  for (let g = 0; g < 200 && (get().position.x !== to.x || get().position.y !== to.y) && !get().completed; g++) {
    let s = move(get(), map, route(get().position, to, boss || get().bossDefeated)[0]!, lookup).state; if (s.battle) s = fight(s); set(s);
  }
};

// Owner 2026-10-23: the prologue is fought by four (the Knight + three guests); after it the guests part ways and
// join one at a time at their story points (Lyra after the first battle, Aira at the camp, Seren as the boss fight starts).
describe('story recruits', () => {
  it('a new company is the Knight alone; map 1 brings the other three as guests for the prologue', () => {
    const p = fresh(); expect(p.company).toEqual(['guardian']); expect(p.party.deployed).toEqual(['guardian']);
    const { run } = depart(p, map, lookup, 4);
    expect(run.roster.deployed).toEqual(['guardian', 'tracer', 'weaver', 'healer']); expect(run.guests).toEqual(['tracer', 'weaver', 'healer']);
    expect(run.arrivals).toBeUndefined();
    expect(depart(newProfile(map, 9), map, lookup, 4).run.guests).toBeUndefined();
    expect(depart(fresh(), chapterOne, lookup, 4).run.guests).toBeUndefined();
  });
  it('after the prologue the guests part ways; Lyra joins at the win, Aira at the camp, Seren as the boss fight starts', () => {
    let s = startPrologue(depart(fresh(), map, lookup, 4).run, map).state; expect(battleState(s, map, lookup)!.heroes).toHaveLength(4);
    s = fight(s);
    expect(s.recruited).toEqual(['tracer']); expect(s.guests).toBeUndefined(); expect(s.arrivals).toEqual({ weaver: 1, healer: 1 });
    expect(s.roster.deployed).toEqual(['guardian', 'tracer']); expect(s.members.weaver).toBeUndefined(); expect(s.hp.healer).toBeUndefined();
    // The pair left behind patches up before setting out.
    expect(s.hp).toEqual({ guardian: memberDef(lookup, map, s.members, 'guardian')!.maxHp, tracer: memberDef(lookup, map, s.members, 'tracer')!.maxHp });
    const walk = walker(() => s, n => { s = n; });
    walk(findTiles(map, 'camp')[0]!); expect(s.recruited).toEqual(['tracer', 'weaver']); expect(s.arrivals).toEqual({ healer: 1 });
    expect(s.roster.deployed).toEqual(['guardian', 'tracer', 'weaver']); expect(s.hp.weaver).toBeGreaterThan(0);
    if (canRest(s, map)) s = rest(s, map, lookup).state;
    // Seren comes back as the boss fight starts and fights it with the party.
    const boss = findTiles(map, 'boss')[0]!; walk(stepBack(s.position, route(s.position, boss, true)), true);
    s = move(s, map, route(s.position, boss, true)[0]!, lookup).state; expect(s.battle?.kind).toBe('boss');
    expect(s.recruited).toEqual(['tracer', 'weaver', 'healer']); expect(s.arrivals).toBeUndefined(); expect(s.roster.deployed).toEqual(['guardian', 'tracer', 'weaver', 'healer']);
    expect(Object.keys(s.battle!.entry)).toEqual(['guardian', 'tracer', 'weaver', 'healer']);
    s = fight(s); expect(s.bossDefeated).toBe(true);
    walk(findTiles(map, 'goal')[0]!, true); expect(s.completed).toBe(true);
    const home = settle({ ...fresh(), tutorialDone: true }, s, 'complete', map);
    expect(home.company).toEqual(['guardian', 'tracer', 'weaver', 'healer']); expect(home.party.deployed).toEqual(['guardian', 'tracer', 'weaver', 'healer']);
    expect(home.members.healer!.level).toBe(s.members.healer!.level);
  });
  it('recruits who never arrived stay away on withdrawal; past the prologue they wait for their own point', () => {
    let s = startPrologue(depart(fresh(), map, lookup, 4).run, map).state; s = fight(s);
    const home = settle({ ...fresh(), tutorialDone: true }, s, 'withdrawn', map);
    expect(home.company).toEqual(['guardian', 'tracer']); expect(home.members.weaver).toBeUndefined();
    const again = depart(home, map, lookup, 5).run;
    expect(again.guests).toBeUndefined(); expect(again.roster.deployed).toEqual(['guardian', 'tracer']); expect(again.arrivals).toEqual({ weaver: 1, healer: 1 });
  });
  it('saves v38 runs with arrivals; a v37 run whose guests still travel keeps playing; rejects a forged arrival', () => {
    let s = startPrologue(depart(fresh(), map, lookup, 4).run, map).state; s = fight(s); const profile = fresh(); let raw = '';
    saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, { profile, run: s });
    expect(JSON.parse(raw).version).toBe(38); expect(parseGame(raw, chapterOne, lookup, [map, chapterOne]).run!.arrivals).toEqual({ weaver: 1, healer: 1 });
    for (const forged of [{ tracer: 1 }, { weaver: 0 }, { mira: 1 }, {}]) {
      const bad = JSON.parse(raw); bad.run.arrivals = forged; expect(() => parseGame(JSON.stringify(bad), chapterOne, lookup, [map, chapterOne])).toThrow();
    }
    const member = JSON.parse(raw); member.profile.company.push('weaver'); member.profile.members.weaver = { stars: 1, dupes: 0 };
    expect(() => parseGame(JSON.stringify(member), chapterOne, lookup, [map, chapterOne])).toThrow();
    // v37: Lyra joined at the prologue, Aira and Seren still travel as guests; they join at the camp and the boss as before.
    const old = depart(fresh(), map, lookup, 4).run; old.tutorialDone = true; old.guests = ['weaver', 'healer']; old.recruited = ['tracer'];
    const v37 = JSON.stringify({ version: 37, profile, run: old });
    s = parseGame(v37, chapterOne, lookup, [map, chapterOne]).run!; expect(s.guests).toEqual(['weaver', 'healer']); expect(s.roster.deployed).toHaveLength(4);
    const walk = walker(() => s, n => { s = n; });
    walk(findTiles(map, 'camp')[0]!); expect(s.recruited).toEqual(['tracer', 'weaver']); expect(s.guests).toEqual(['healer']);
    walk(findTiles(map, 'goal')[0]!, true); expect(s.recruited).toEqual(['tracer', 'weaver', 'healer']); expect(s.guests).toBeUndefined();
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
