import { describe, expect, it } from 'vitest';
import { encounterById as lookup, waterSpirit } from '../src/content/encounters/catalog';
import { lakeMap as map } from '../src/content/world/chapter-lake';
import { MAPS } from '../src/content/world/maps';
import { createBattle, currentHeroId, lockedMove, previewCommand, resolveCommand, targetOptions } from '../src/core/battle/engine';
import { currentSave } from './fixtures/current-save';
import { parseGame, SAVE_VERSION } from '../src/core/save/expedition-save';
import { depart, newProfile, settle } from '../src/core/world/profile';
import { lowTide, stepsToTurn, tideBlock, waterAt } from '../src/core/world/tide';
import type { Direction, ExpeditionState, Point, Profile } from '../src/core/world/types';
import { canWaitTide, capLevel, chooseEvent, findTiles, fatigueOf, memoryNote, move, newExpedition, openChest, questDone, startOf, storyDone, tileAt, waitTide } from '../src/core/world/world';

// Map 4 ทะเลสาบเงาจันทร์ (OD-60): the tide, its puzzles, the seal, the side story, the journal and the camp recruits.
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const company = ['guardian', 'tracer', 'weaver', 'healer'];
// A run past the prologue standing on `at`, `steps` into the tide, with repel so no random battle interrupts the test.
function run(at: Point, steps = 0, extra: Partial<ExpeditionState> = {}): ExpeditionState {
  const p = newProfile(map, 7, company); const s = newExpedition(map, lookup, 7, { roster: p.party, members: p.members, campXp: 0 }, true);
  return { ...s, position: at, steps, repel: 99, ...extra };
}
const go = (s: ExpeditionState, ...ds: Direction[]) => { let r = { state: s, event: { type: 'moved' } as ReturnType<typeof move>['event'] }; for (const d of ds) r = move(r.state, map, d, lookup); return r; };
const key = (p: Point) => `${p.x},${p.y}`;
// Tiles reachable from `from` without water (dry land) and optionally through `extra` walls (doors, the secret).
function dryReach(from: Point, open: readonly Point[] = []): Set<string> {
  const seen = new Set([key(from)]); const queue = [from];
  while (queue.length) { const p = queue.shift()!; for (const o of Object.values(dirs)) {
    const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n);
    if (!t || seen.has(key(n)) || waterAt(map, n) || (t.kind === 'wall' && !open.some(q => key(q) === key(n))) || t.kind === 'boss') continue;
    seen.add(key(n)); queue.push(n); } }
  return seen;
}

describe('map 4: the tide', () => {
  it('turns every 8 steps from low, counted from the run steps plus camp waits; never a roll', () => {
    expect(map.tide).toEqual({ period: 8, shallow: '~', deep: '=' });
    const at = (steps: number, tideWait?: number) => lowTide({ steps, ...(tideWait ? { tideWait } : {}) }, map);
    expect([0, 7, 8, 15, 16, 23, 24].map(n => at(n))).toEqual([true, true, false, false, true, true, false]);
    expect(stepsToTurn({ steps: 5 }, map)).toBe(3); expect(stepsToTurn({ steps: 8 }, map)).toBe(8); expect(at(3, 5)).toBe(false);
    expect(waterAt(map, { x: 6, y: 12 })).toBe('shallow'); expect(waterAt(map, { x: 10, y: 11 })).toBe('deep'); expect(waterAt(map, { x: 5, y: 12 })).toBeUndefined();
  });
  it('shallow water is walked at low tide only; deep water only by boat; the boat crosses at any tide', () => {
    expect(go(run({ x: 5, y: 12 }, 8), 'right').event).toEqual({ type: 'blocked', reason: 'tide' });
    expect(go(run({ x: 5, y: 12 }, 0), 'right').state.position).toEqual({ x: 6, y: 12 });
    expect(go(run({ x: 8, y: 12 }, 0), 'right').event).toEqual({ type: 'blocked', reason: 'deep' });
    expect(tideBlock({ steps: 8, boat: true, solved: [] }, map, { x: 6, y: 12 })).toBe('');
    expect(go(run({ x: 8, y: 12 }, 9, { boat: true }), 'right').state.position).toEqual({ x: 9, y: 12 });
  });
  it('the incoming tide sweeps a party on foot back to the dry tile it left; the boat is never swept', () => {
    const r = go(run({ x: 5, y: 13 }, 6), 'right', 'right');
    expect(r.event).toEqual({ type: 'washed', to: { x: 5, y: 13 } }); expect(r.state.position).toEqual({ x: 5, y: 13 });
    expect(r.state.steps).toBe(8); expect(r.state.shore).toBeUndefined();
    const boat = go(run({ x: 5, y: 13 }, 6, { boat: true }), 'right', 'right'); expect(boat.state.position).toEqual({ x: 7, y: 13 });
  });
  it('a camp can wait for the water to turn (no step is taken); nowhere else', () => {
    const camp = findTiles(map, 'camp')[0]!; const s = run(camp, 3);
    expect(canWaitTide(s, map)).toBe(true); const w = waitTide(s, map);
    expect(w.event).toEqual({ type: 'waited', low: false }); expect(w.state.steps).toBe(3); expect(w.state.tideWait).toBe(5);
    expect(waitTide(w.state, map).state.tideWait).toBe(13); expect(lowTide(waitTide(w.state, map).state, map)).toBe(true);
    expect(canWaitTide(run(startOf(map)), map)).toBe(false);
  });
});

describe('map 4: geometry and puzzles', () => {
  it('on dry land the pavilion is reached only over the serpent bridge; the water gate is the way round', () => {
    const start = startOf(map); const pavilion = { x: 10, y: 6 }; const serpent = map.elites.find(e => e.forced)!; const door = map.puzzles.levers[0]!.door;
    // Every tile reachable from the entrance; water counts when `wet`, the door when `open`, the bridge unless `bridge` is false.
    const reach = (wet: boolean, open: boolean, bridge: boolean) => { const seen = new Set([key(start)]); const q = [start];
      while (q.length) { const p = q.shift()!; for (const o of Object.values(dirs)) { const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n);
        if (!t || seen.has(key(n)) || t.kind === 'boss' || (!wet && waterAt(map, n)) || (!bridge && key(n) === key(serpent)) || (t.kind === 'wall' && !(open && key(n) === key(door)))) continue; seen.add(key(n)); q.push(n); } }
      return seen.has(key(pavilion)); };
    expect(reach(false, false, true)).toBe(true); expect(reach(true, false, false)).toBe(false); expect(reach(true, true, false)).toBe(true); expect(reach(false, true, false)).toBe(false);
    expect(dryReach(start).has(key(serpent))).toBe(true);
    expect(tileAt(map, door)?.kind).toBe('wall');
    expect(map.puzzles.levers[0]!.levers.every(l => waterAt(map, l) === 'shallow')).toBe(true);
    expect(waterAt(map, map.puzzles.boulders[0]!.pit)).toBe('shallow');
    expect(map.lanterns!.every(l => tileAt(map, l)?.kind === 'floor' && !waterAt(map, l))).toBe(true);
    expect(dryReach(start).has(key(map.lanterns![0]!))).toBe(false); // every lantern is out on the water
  });
  it('the water-gate levers stand in shallow water (pulled at low tide) and open the shortcut door', () => {
    const [a, b] = map.puzzles.levers[0]!.levers;
    let s = go(run({ x: a!.x - 1, y: a!.y }, 0), 'right').state; expect(s.levers).toEqual(['water-gate:0']);
    s = { ...s, position: { x: b!.x + 1, y: b!.y }, steps: 0 }; const r = go(s, 'left');
    expect(r.event).toMatchObject({ type: 'lever', solved: true }); expect(r.state.solved).toContain('water-gate');
    const up = go({ ...r.state, steps: 0 }, 'left', 'up'); expect(up.state.position).toEqual({ x: 14, y: 8 });
  });
  it('the boulder sunk into the channel is a causeway, dry whatever the tide', () => {
    const b = map.puzzles.boulders[0]!; const r = go(run({ x: b.at.x - 1, y: b.at.y }, 8), 'right');
    expect(r.event).toEqual({ type: 'pushed', puzzleId: b.id, filled: true });
    expect(waterAt(map, b.pit, r.state.solved)).toBeUndefined();
    expect(go({ ...r.state, steps: 8 }, 'right', 'right').state.position).toEqual(b.pit);
  });
});

describe('map 4: seal, side story, journal and recruits', () => {
  it('the seal opens with two of: the serpent, three moon lanterns, the memorial rite', () => {
    let s = run(startOf(map));
    // Each lantern is lit by stepping onto it from the tile below (shallow water at low tide, or its isle).
    for (const [i, l] of map.lanterns!.entries()) { const r = move({ ...s, position: { x: l.x, y: l.y + 1 }, steps: 0 }, map, 'up', lookup); expect(r.event).toEqual({ type: 'lantern', lanternId: l.id, lit: i + 1 }); s = r.state; }
    expect(s.lanterns).toHaveLength(3); expect(questDone(s, map)).toEqual(['lanterns']);
    const shrine = map.events.find(e => e.id === 'lake-shrine')!; s = { ...s, position: shrine, steps: 0 };
    s = chooseEvent(s, map, lookup, 'pray').state; expect(questDone(s, map)).toEqual(['lanterns', 'rite']);
  });
  it('the ferryman story pays once on a run that comes home, and his boat sails on later lake runs', () => {
    const p0: Profile = { ...newProfile(map, 3, company), tutorialDone: true, cleared: ['ruined-border', 'deep-forest', 'veil-frontier'] };
    let s = run(map.events.find(e => e.id === 'lake-ferryman')!);
    s = chooseEvent({ ...s, potions: { ...s.potions, salve: 1 } }, map, lookup, 'help').state;
    const oar = map.chests.find(c => c.id === 'lake-oar')!; s = openChest({ ...s, position: oar }, map).state;
    expect(storyDone(s, map)).toBe(true);
    const wiped = settle(p0, s, 'wiped', map); expect(wiped.storyQuests ?? []).toEqual([]);
    const plain = settle({ ...p0, storyQuests: [map.id] }, s, 'withdrawn', map).bank.dust - p0.bank.dust; // the run's own dust, no story
    const home = settle(p0, s, 'withdrawn', map); expect(home.storyQuests).toEqual([map.id]); expect(home.bank.dust - p0.bank.dust).toBe(plain + map.story!.reward.dust!);
    const again = settle(home, s, 'withdrawn', map); expect(again.bank.dust - home.bank.dust).toBe(plain); expect(again.storyQuests).toEqual([map.id]);
    expect(depart(home, map, lookup, 5).run.boat).toBe(true); expect(depart(p0, map, lookup, 5).run.boat).toBeUndefined();
  });
  it('lost notes and gazed memories come home to the camp journal, whatever the outcome; gazing tires everyone', () => {
    const note = map.notes![1]!; let s = go(run({ x: 11, y: 9 }), 'up').state;
    expect(s.position).toEqual({ x: 11, y: 8 }); expect(s.secrets).toEqual(['bridge-secret']); s = go(s, 'right').state; expect(s.notes).toEqual([note.id]);
    const mirror = map.events.find(e => e.kind === 'reflection')!; const at = { ...s, position: mirror };
    const away = chooseEvent(at, map, lookup, 'away').state; expect(away.notes).toEqual([note.id]); expect(fatigueOf(away, 'guardian')).toBe(0);
    const gaze = chooseEvent(at, map, lookup, 'gaze').state; expect(gaze.notes).toEqual([note.id, memoryNote(mirror.id)]);
    for (const id of company) expect(fatigueOf(gaze, id)).toBe(map.eventRules.reflection.fatigue);
    const p = settle(newProfile(map, 3, company), gaze, 'wiped', map); expect(p.notes).toEqual([note.id, memoryNote(mirror.id)]);
  });
  it('Lio joins at the first camp and Cerise at the second; a company that has them is paid a duplicate (OD-22)', () => {
    expect(map.recruits).toEqual([{ hero: 'lio', at: 'camp', camp: { x: 10, y: 19 } }, { hero: 'lalin', at: 'camp', camp: { x: 4, y: 10 } }]);
    const p: Profile = { ...newProfile(map, 3, company), tutorialDone: true };
    let s = depart(p, map, lookup, 9).run; expect(s.arrivals).toEqual(['lio', 'lalin']);
    s = go({ ...s, position: { x: 10, y: 20 }, repel: 99 }, 'up').state; expect(s.recruited).toEqual(['lio']); expect(s.arrivals).toEqual(['lalin']);
    s = go({ ...s, position: { x: 4, y: 11 } }, 'up').state; expect(s.recruited).toEqual(['lio', 'lalin']);
    const home = settle(p, s, 'complete', map); expect(home.company).toEqual(expect.arrayContaining(['lio', 'lalin']));
  });
});

describe('map 4: camp level cap (OD-60) and the Water Veil', () => {
  it('the cap rises 3 for each first clear past the second, up to 30', () => {
    expect([0, 1, 2, 3, 4, 8, 9, 12].map(n => capLevel(map, n))).toEqual([10, 10, 10, 13, 16, 28, 30, 30]);
    expect(MAPS.find(m => m.id === map.id)).toBe(map);
  });
  it('Water Veil mends the spirit, less each time it lands; preview equals the result', () => {
    const d = waterSpirit; let s = createBattle(d); const max = d.enemies.find(e => e.id === 'f1')!.maxHp;
    s.enemies.find(e => e.id === 'f1')!.hp = max - 120; const heals: number[] = [];
    for (let guard = 0; guard < 400 && s.outcome === 'active' && heals.length < 2; guard++) {
      const heroId = currentHeroId(s, d)!; const t = targetOptions(s, d, heroId, 'attack').find(o => o.valid)!;
      const cmd = { beat: s.beat, heroId, action: 'attack' as const, targetId: t.id };
      const r = resolveCommand(s, d, cmd); expect(previewCommand(s, d, cmd).state).toEqual(r.state);
      for (const e of r.events) if (e.type === 'heal' && e.sourceId === 'f1') heals.push(e.amount!);
      s = r.state;
    }
    expect(heals[0]).toBe(Math.ceil(max * 10 / 100)); expect(heals[1]).toBeLessThan(heals[0]!);
  });
  it('Water Veil is a locked, telegraphed move: it cannot be bent onto another foe', () => {
    expect(lockedMove(waterSpirit.intents.find(i => i.mend)!)).toBe(true);
  });
});

describe('map 4: save v68', () => {
  it('keeps the tide, lanterns, notes and journal; refuses them where they do not belong; a v67 save loads unchanged', () => {
    expect(SAVE_VERSION).toBe(68);
    const profile: Profile = { ...newProfile(map, 3, company), tutorialDone: true, notes: ['note-keeper-letter'], storyQuests: [map.id] };
    const s: ExpeditionState = { ...depart(profile, map, lookup, 4).run, position: { x: 6, y: 12 }, shore: { x: 5, y: 12 }, steps: 1, tideWait: 8, lanterns: ['lantern-islet'], notes: ['note-weaver-book'] };
    const game = { profile, run: s }; const raw = currentSave(game);
    const back = parseGame(raw, map, lookup, MAPS); expect(back.run).toEqual(s); expect(back.profile.notes).toEqual(['note-keeper-letter']); expect(back.run!.boat).toBe(true);
    const bad = (patch: Record<string, unknown>) => () => parseGame(JSON.stringify({ ...JSON.parse(raw), run: { ...JSON.parse(raw).run, ...patch } }), map, lookup, MAPS);
    expect(bad({ shore: { x: 6, y: 12 } })).toThrow(); expect(bad({ lanterns: ['nope'] })).toThrow(); expect(bad({ tideWait: 0 })).toThrow(); expect(bad({ notes: [] })).toThrow();
    const v67 = JSON.parse(currentSave({ profile: newProfile(map, 3, company), run: null })); v67.version = 67;
    expect(parseGame(JSON.stringify(v67), map, lookup, MAPS).profile.notes).toBeUndefined();
  });
});

