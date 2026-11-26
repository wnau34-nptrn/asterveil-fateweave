import type { Point } from './types';

interface MineLight {
  readonly position: Point;
  readonly litLanterns: readonly Point[];
  readonly steps: number;
  readonly crystalExpiresAt?: number;
}

const darkRadius = 1;
const lanternRadius = 3;
const crystalRadius = 2;
export const mineCrystalDuration = 12;

const neighbours: readonly Point[] = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

// Flood along the four walking directions. A reachable wall is visible but never transmits light.
function visibleFrom(rows: readonly string[], origin: Point, radius: number, openWalls: readonly Point[], visible: Set<number>): void {
  const width = rows[0]?.length ?? 0;
  const queue = [{ ...origin, distance: 0 }];
  const visited = new Set<number>();
  for (const cell of queue) {
    const tile = rows[cell.y]?.[cell.x];
    if (tile === undefined) continue;
    const key = cell.y * width + cell.x;
    if (visited.has(key)) continue;
    visited.add(key);
    visible.add(key);
    if (cell.distance === radius || (tile === '#' && !openWalls.some(wall => wall.x === cell.x && wall.y === cell.y))) continue;
    for (const offset of neighbours) {
      queue.push({ x: cell.x + offset.x, y: cell.y + offset.y, distance: cell.distance + 1 });
    }
  }
}

// Read before moving to decide whether that move has portable light, then read with the committed step count to draw.
export function mineCrystalStepsLeft(light: Pick<MineLight, 'steps' | 'crystalExpiresAt'>): number {
  return Math.max(0, (light.crystalExpiresAt ?? light.steps) - light.steps);
}

export function mineLanternCells(rows: readonly string[], lanterns: readonly Point[], openWalls: readonly Point[]): Set<number> {
  const visible = new Set<number>();
  for (const lantern of lanterns) visibleFrom(rows, lantern, lanternRadius, openWalls, visible);
  return visible;
}

export function mineVisibleCells(rows: readonly string[], light: MineLight, openWalls: readonly Point[] = [], ambientRadius?: number): ReadonlySet<number> {
  const visible = mineLanternCells(rows, light.litLanterns, openWalls);
  const radius = ambientRadius ?? (mineCrystalStepsLeft(light) > 0 ? crystalRadius : darkRadius);
  visibleFrom(rows, light.position, radius, openWalls, visible);
  return visible;
}
