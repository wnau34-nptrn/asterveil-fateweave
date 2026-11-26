import { describe, expect, it } from 'vitest';
import { mineBeam, minecart, mineLayout, mineSites } from '../src/content/world/chapter-mine';
import { mineCrystalDuration, mineCrystalStepsLeft, mineVisibleCells } from '../src/core/world/mine-light';
import { traceMineBeam, traceMinecart } from '../src/core/world/mine-puzzles';
import { escortMineWorkers, inviteMineWorker } from '../src/core/world/mine-rescue';
import type { Direction, Point } from '../src/core/world/types';

const { rows } = mineLayout;
const { start, yardCamp, cavernCamp, boss, overseer, crystalEater, secrets, lanterns, workers, ledgerPages } = mineSites;
const key = ({ x, y }: Point) => `${x},${y}`;
const tileAt = ({ x, y }: Point) => rows[y]?.[x];
const adjacent = ({ x, y }: Point): Point[] => [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];

function reachable(from: Point, blocked: readonly Point[], opened: readonly Point[]): ReadonlyMap<string, number> {
  const denied = new Set(blocked.map(key));
  const doors = new Set(opened.map(key));
  const visited = new Map([[key(from), 0]]);
  const queue = [from];
  for (const point of queue) {
    const distance = visited.get(key(point))!;
    for (const next of adjacent(point)) {
      const id = key(next);
      const tile = tileAt(next);
      if (visited.has(id) || denied.has(id) || !tile || (tile === '#' && !doors.has(id))) continue;
      visited.set(id, distance + 1);
      queue.push(next);
    }
  }
  return visited;
}

function expectRail(waypoints: readonly Point[], wall?: Point): void {
  for (let i = 1; i < waypoints.length; i++) {
    const from = waypoints[i - 1]!;
    const to = waypoints[i]!;
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    expect(Math.abs(dx) + Math.abs(dy)).toBe(1);
    let point = from;
    while (key(point) !== key(to)) {
      point = { x: point.x + dx, y: point.y + dy };
      expect(tileAt(point), key(point)).toBe(key(point) === (wall && key(wall)) ? '#' : ',');
    }
  }
}

describe('Crystal Mine layout', () => {
  it('has a bordered grid with all three zones and reachable placements', () => {
    expect(rows).toHaveLength(25);
    for (const row of rows) expect(row).toMatch(/^#[#.,:SCBG]{23}#$/);
    expect(rows.at(0)).toBe('#'.repeat(25));
    expect(rows.at(-1)).toBe('#'.repeat(25));
    expect(rows.join('').match(/S/g)).toHaveLength(1);
    expect(rows.join('').match(/C/g)).toHaveLength(2);
    expect(rows.join('').match(/B/g)).toHaveLength(1);
    expect(rows.join('').match(/G/g)).toHaveLength(1);
    expect([start, yardCamp, cavernCamp, boss].map(tileAt)).toEqual(['S', 'C', 'C', 'B']);
    expect(tileAt(mineSites.junction)).toBe(',');
    expect(tileAt(overseer)).toBe(',');
    expect(lanterns).toHaveLength(5);
    expect(workers).toHaveLength(3);

    const sites = [start, yardCamp, cavernCamp, boss, overseer, crystalEater, mineSites.junction, ...lanterns, ...workers,
      ...ledgerPages, ...mineSites.notes, ...mineSites.glowCrystals, ...minecart.switches.map(s => s.lever)];
    expect(new Set(sites.map(key)).size).toBe(sites.length);
    const visibleRoutes = reachable(start, [], [...secrets, mineBeam.door]);
    for (const site of sites) expect(visibleRoutes.has(key(site)), key(site)).toBe(true);
  });

  it.each([
    { omitted: 'overseer', blocked: [overseer], opened: [secrets[0]], required: [...lanterns, ...workers] },
    { omitted: 'lanterns', blocked: [lanterns[4]], opened: [], required: [overseer, ...workers] },
    { omitted: 'workers', blocked: [workers[2]], opened: [], required: [overseer, ...lanterns] },
  ])('can reach the seal with the other two objectives while skipping $omitted', ({ blocked, opened, required }) => {
    const fromStart = reachable(start, blocked, opened);
    const fromYardCamp = reachable(yardCamp, blocked, opened);
    for (const site of [...required, cavernCamp, boss]) {
      expect(fromStart.has(key(site)), key(site)).toBe(true);
      expect(fromYardCamp.has(key(site)), key(site)).toBe(true);
    }
  });

  it('keeps the overseer on a choke point and the optional elite off the bypass', () => {
    const blocked = reachable(start, [overseer], []);
    expect(blocked.has(key(boss))).toBe(false);
    expect(blocked.has(key(crystalEater))).toBe(false);
    const workersPassage = reachable(start, [overseer, crystalEater], [secrets[0]]);
    expect(workersPassage.has(key(boss))).toBe(true);
    expect(reachable(start, [], [secrets[1]]).has(key(crystalEater))).toBe(true);
  });

  it('checks all eight rail settings and verifies that opening the wall makes a shortcut', () => {
    const options = ['main', 'siding'] as const;
    const successful: string[][] = [];
    for (const a of options) for (const b of options) for (const c of options) {
      const route = traceMinecart(minecart, [a, b, c]);
      expectRail(route.stops, route.opensWall ? minecart.wall : undefined);
      if (route.opensWall) successful.push([a, b, c]);
    }
    expect(successful).toEqual([['main', 'main', 'main']]);
    expect(reachable(start, [overseer], [minecart.wall]).has(key(boss))).toBe(true);
    const upperTrack = key(mineSites.notes[1]);
    const before = reachable(minecart.start, [], [secrets[0]]).get(upperTrack);
    const after = reachable(minecart.start, [], [secrets[0], minecart.wall]).get(upperTrack);
    expect(before).toBeGreaterThan(after!);
  });

  it('checks all 64 light settings and opens the isolated ledger room in exactly one of them', () => {
    const options: Direction[] = ['up', 'right', 'down', 'left'];
    const successful: Direction[][] = [];
    for (const a of options) for (const b of options) for (const c of options) {
      const route = traceMineBeam(mineBeam, rows, [a, b, c]);
      if (route.opensDoor) successful.push([a, b, c]);
    }
    expect(successful).toEqual([['right', 'down', 'right']]);
    expect(reachable(cavernCamp, [], []).has(key(ledgerPages[2]))).toBe(false);
    expect(reachable(cavernCamp, [], [mineBeam.door]).has(key(ledgerPages[2]))).toBe(true);
  });
});

describe('Crystal Mine lighting', () => {
  const tunnel = ['#########', '#..#....#', '#..#....#', '#..#....#', '#########'];
  const cell = (x: number, y: number) => y * tunnel[0]!.length + x;
  const position = { x: 2, y: 2 };

  it('shows one tile in darkness and stops lantern light at closed walls', () => {
    const dark = { position, litLanterns: [], steps: 0 };
    expect(mineVisibleCells(tunnel, dark)).toEqual(new Set([cell(2, 2), cell(2, 1), cell(3, 2), cell(2, 3), cell(1, 2)]));
    const lit = { ...dark, litLanterns: [position] };
    expect(mineVisibleCells(tunnel, lit).has(cell(4, 2))).toBe(false);
    const open = mineVisibleCells(tunnel, lit, [{ x: 3, y: 2 }]);
    expect(open.has(cell(5, 2))).toBe(true);
    expect(open.has(cell(6, 2))).toBe(false);
  });

  it('keeps portable light for the first twelve moves, then returns to the dark radius', () => {
    const crystalExpiresAt = 40 + mineCrystalDuration;
    const light = { position: { x: 5, y: 2 }, litLanterns: [], crystalExpiresAt };
    expect([51, 52, 53].map(steps => mineCrystalStepsLeft({ ...light, steps }))).toEqual([1, 0, 0]);
    expect(mineVisibleCells(tunnel, { ...light, steps: 51 }).has(cell(7, 2))).toBe(true);
    expect(mineVisibleCells(tunnel, { ...light, steps: 52 }).has(cell(7, 2))).toBe(false);
  });
});

describe('Crystal Mine worker rescue', () => {
  it('counts workers only after escorting them back to the yard camp, exactly once each', () => {
    const empty = { following: [], rescued: [] };
    expect(inviteMineWorker(empty, workers[0], start)).toBe(empty);
    const escort = workers.reduce<ReturnType<typeof inviteMineWorker>>(
      (rescue, worker) => inviteMineWorker(rescue, worker, worker),
      empty,
    );
    expect(escort.following).toEqual(workers.map(worker => worker.id));
    expect(escort.rescued).toEqual([]);
    expect(inviteMineWorker(escort, workers[0], workers[0])).toBe(escort);
    expect(escortMineWorkers(escort, cavernCamp, yardCamp)).toBe(escort);

    const returned = escortMineWorkers(escort, yardCamp, yardCamp);
    expect(returned).toEqual({ following: [], rescued: workers.map(worker => worker.id) });
    expect(inviteMineWorker(returned, workers[0], workers[0])).toBe(returned);
    expect(escortMineWorkers(returned, yardCamp, yardCamp)).toBe(returned);
  });
});
