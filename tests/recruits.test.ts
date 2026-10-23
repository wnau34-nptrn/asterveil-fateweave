import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap as map } from '../src/content/world/chapter-ruins';
import { chapterOne } from '../src/content/world/chapter1';
import { forestMap } from '../src/content/world/chapter-forest';
import { MAPS } from '../src/content/world/maps';
import { resolveCommand } from '../src/core/battle/engine';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { depart, joinLevel, newProfile, settle } from '../src/core/world/profile';
import type { Direction, ExpeditionState, Point, Profile } from '../src/core/world/types';
import { battleData, battleState, canRest, draftOffers, draftPick, memberDef, rest, findTiles, finishBattle, move, recordBattle, startPrologue, tileAt } from '../src/core/world/world';
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

// Owner 2026-10-23: the prologue is fought by four (the Knight + three guests); after it the guests part ways. Lyra
// joins at once, the new company recruits two mercenaries (a support among them), Aira comes back as the boss fight
// starts and Seren on map 2.
const won = (): ExpeditionState => fight(startPrologue(depart(fresh(), map, lookup, 4).run, map).state);
const supports = map.draft!.support;
describe('story recruits and the starter recruitment', () => {
  it('a new company is the Knight alone; map 1 brings Lyra, Aira and Seren as guests for the prologue', () => {
    const p = fresh(); expect(p.company).toEqual(['guardian']); expect(p.party.deployed).toEqual(['guardian']);
    const { run } = depart(p, map, lookup, 4);
    expect(run.roster.deployed).toEqual(['guardian', 'tracer', 'weaver', 'healer']); expect(run.guests).toEqual(['tracer', 'weaver', 'healer']);
    expect(battleState(startPrologue(run, map).state, map, lookup)!.heroes).toHaveLength(4);
    expect(depart(newProfile(map, 9), map, lookup, 4).run.guests).toBeUndefined();
    expect(depart(fresh(), chapterOne, lookup, 4).run.guests).toBeUndefined();
  });
  it('after the prologue the guests part ways, Lyra joins and two mercenaries are recruited before setting out', () => {
    let s = won();
    expect(s.recruited).toEqual(['tracer']); expect(s.guests).toBeUndefined(); expect(s.arrivals).toEqual({ weaver: 1 });
    expect(s.roster.deployed).toEqual(['guardian', 'tracer']); expect(s.members.healer).toBeUndefined(); expect(s.hp.weaver).toBeUndefined();
    expect(s.hp).toEqual({ guardian: memberDef(lookup, map, s.members, 'guardian')!.maxHp, tracer: memberDef(lookup, map, s.members, 'tracer')!.maxHp });
    expect(s.draft).toMatchObject({ left: 2, level: 1 }); expect(s.draft!.offers).toHaveLength(3);
    expect(s.draft!.offers.some(id => supports.includes(id))).toBe(true); expect(s.draft!.offers).toEqual(draftOffers(s, map));
    expect(move(s, map, 'up', lookup).event).toEqual({ type: 'blocked', reason: 'busy' });
    const first = s.draft!.offers[0]!; const r = draftPick(s, map, 0, lookup); expect(r.event).toEqual({ type: 'drafted', heroId: first }); s = r.state;
    expect(s.draft!.left).toBe(1); expect(s.draft!.offers).not.toContain(first);
    s = draftPick(s, map, 2, lookup).state; expect(s.draft).toBeUndefined();
    expect(s.roster.deployed).toHaveLength(4); expect(s.roster.deployed.slice(0, 2)).toEqual(['guardian', 'tracer']);
    const picked = s.roster.deployed.slice(2); expect(picked.some(id => supports.includes(id))).toBe(true);
    expect(s.recruited).toEqual(['tracer', ...picked]); for (const id of picked) expect(s.hp[id]).toBe(memberDef(lookup, map, s.members, id)!.maxHp);
    expect(draftPick(s, map, 0, lookup).event.type).toBe('blocked');
  });
  it('every company that has not picked a support yet is offered one; offers differ between companies', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      let s = fight(startPrologue(depart(fresh(), map, lookup, seed).run, map).state); seen.add(s.draft!.offers.join());
      expect(s.draft!.offers.some(id => supports.includes(id))).toBe(true);
      const plain = s.draft!.offers.findIndex(id => !supports.includes(id)); if (plain < 0) continue;
      s = draftPick(s, map, plain, lookup).state; expect(s.draft!.offers.some(id => supports.includes(id))).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(4);
  });
  it('Aira comes back as the boss fight starts; settling adds everyone to the company; Seren joins on map 2', () => {
    let s = won(); s = draftPick(draftPick(s, map, 0, lookup).state, map, 0, lookup).state; const picked = s.roster.deployed.slice(2);
    const walk = walker(() => s, n => { s = n; });
    walk(findTiles(map, 'camp')[0]!); expect(s.arrivals).toEqual({ weaver: 1 }); if (canRest(s, map)) s = rest(s, map, lookup).state;
    const boss = findTiles(map, 'boss')[0]!; walk(stepBack(s.position, route(s.position, boss, true)), true);
    if (canRest(s, map)) s = rest(s, map, lookup).state;
    s = move(s, map, route(s.position, boss, true)[0]!, lookup).state; expect(s.battle?.kind).toBe('boss');
    expect(s.recruited).toEqual(['tracer', ...picked, 'weaver']); expect(s.arrivals).toBeUndefined(); expect(s.roster.reserve).toEqual(['weaver']);
    s = fight(s); walk(findTiles(map, 'goal')[0]!, true); expect(s.completed).toBe(true);
    const home = settle({ ...fresh(), tutorialDone: true }, s, 'complete', map);
    expect(home.company).toEqual(['guardian', 'tracer', ...picked, 'weaver']); expect(home.members.healer).toBeUndefined();
    const forest = depart(home, forestMap, lookup, 3).run; expect(Object.keys(forest.arrivals!).sort()).toEqual(['garran', 'healer']);
  });
  it('withdrawing before the picks takes the first offers; past the prologue Aira waits for her own point', () => {
    const s = won(); const offer = s.draft!.offers[0]!;
    const home = settle({ ...fresh(), tutorialDone: true }, s, 'withdrawn', map);
    expect(home.company.slice(0, 3)).toEqual(['guardian', 'tracer', offer]); expect(home.company).toHaveLength(4); expect(home.members.weaver).toBeUndefined();
    const again = depart(home, map, lookup, 5).run;
    expect(again.guests).toBeUndefined(); expect(again.draft).toBeUndefined(); expect(again.arrivals).toEqual({ weaver: 1 });
  });
  it('saves v38 runs with arrivals and a pending recruitment; rejects forged offers; an older map 1 run settles home', () => {
    const s = won(); const profile = fresh(); let raw = '';
    saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, { profile, run: s });
    expect(JSON.parse(raw).version).toBe(39); expect(parseGame(raw, chapterOne, lookup, MAPS).run).toEqual(s);
    for (const forge of [(r: Record<string, unknown>) => { r.arrivals = { tracer: 1 }; }, (r: Record<string, unknown>) => { r.arrivals = { healer: 1 }; },
      (r: Record<string, unknown>) => { (r.draft as { offers: string[] }).offers = ['brann', 'sefa', 'garran']; }, (r: Record<string, unknown>) => { (r.draft as { left: number }).left = 3; }]) {
      const bad = JSON.parse(raw); forge(bad.run); expect(() => parseGame(JSON.stringify(bad), chapterOne, lookup, MAPS)).toThrow();
    }
    const member = JSON.parse(raw); member.profile.company.push('weaver'); member.profile.members.weaver = { stars: 1, dupes: 0 };
    expect(() => parseGame(JSON.stringify(member), chapterOne, lookup, MAPS)).toThrow();
    // v37 (map 1 version 2): Lyra joined at the prologue, Aira and Seren still travel as guests. The map changed, so the
    // run settles home: Lyra stays, the guests leave.
    const old = depart(fresh(), map, lookup, 4).run; Object.assign(old, { tutorialDone: true, guests: ['weaver', 'healer'], recruited: ['tracer'], mapVersion: 2 });
    const back = parseGame(JSON.stringify({ version: 37, profile, run: old }), chapterOne, lookup, MAPS);
    expect(back.run).toBeNull(); expect(back.profile.company).toEqual(['guardian', 'tracer']); expect(back.profile.last?.outcome).toBe('withdrawn');
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
