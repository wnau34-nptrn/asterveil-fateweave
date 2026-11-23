import type { Direction, Point } from './types';

type Three<T> = readonly [T, T, T];

const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;

interface CartPuzzle {
  readonly start: Point;
  readonly wall: Point;
  readonly switches: Three<{ readonly at: Point; readonly sidingEnd: Point }>;
}

// The preview lists turns and the destination. Selecting a siding ends the trip there; a new push starts over.
export function traceMinecart(puzzle: CartPuzzle, settings: Three<'main' | 'siding'>): { stops: Point[]; opensWall: boolean } {
  const stops: Point[] = [puzzle.start];
  for (const [index, railSwitch] of puzzle.switches.entries()) {
    stops.push(railSwitch.at);
    if (settings[index] === 'siding') return { stops: [...stops, railSwitch.sidingEnd], opensWall: false };
  }
  return { stops: [...stops, puzzle.wall], opensWall: true };
}

const offsets: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 },
};

interface BeamPuzzle {
  readonly source: Point;
  readonly door: Point;
  readonly crystals: Three<Point>;
}

// A crystal turns the light to its selected direction. A loop stops when a tile and direction repeat.
export function traceMineBeam(puzzle: BeamPuzzle, rows: readonly string[], settings: Three<Direction>): { tiles: Point[]; opensDoor: boolean } {
  let point = puzzle.source;
  let direction: Direction = 'right';
  const tiles: Point[] = [point];
  const visited = new Set<string>();
  for (;;) {
    const offset = offsets[direction];
    point = { x: point.x + offset.x, y: point.y + offset.y };
    if (same(point, puzzle.door)) return { tiles: [...tiles, point], opensDoor: true };
    const tile = rows[point.y]?.[point.x];
    if (tile === undefined || tile === '#') return { tiles, opensDoor: false };
    const state = `${point.x},${point.y}:${direction}`;
    if (visited.has(state)) return { tiles, opensDoor: false };
    visited.add(state);
    tiles.push(point);
    const crystal = puzzle.crystals.findIndex(at => same(at, point));
    direction = settings[crystal] ?? direction;
  }
}
