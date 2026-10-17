import type { ExpeditionState, MapDefinition, Point } from './types';

// Pure 3C puzzle rules (no DOM, no randomness). The world's `move` asks these helpers what a target tile does.
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export const runePuzzleAt = (map: MapDefinition, p: Point) => map.puzzles.runes.find(r => r.stones.some(s => same(s, p)));
export const leverPuzzleAt = (map: MapDefinition, p: Point) => map.puzzles.levers.find(l => l.levers.some(s => same(s, p)));
export const secretAt = (map: MapDefinition, p: Point) => map.puzzles.secrets.find(s => same(s, p));
// A puzzle door is a wall until its puzzle is solved.
export function doorAt(map: MapDefinition, p: Point): { id: string } | undefined {
  return map.puzzles.runes.find(r => same(r.door, p)) ?? map.puzzles.levers.find(l => same(l.door, p));
}
export const doorOpen = (state: ExpeditionState, map: MapDefinition, p: Point): boolean => { const d = doorAt(map, p); return !!d && state.solved.includes(d.id); };
export const boulderPosition = (state: ExpeditionState, map: MapDefinition, id: string): Point | undefined => {
  const b = map.puzzles.boulders.find(x => x.id === id)!;
  return state.solved.includes(id) ? undefined : state.boulders[id] ?? b.at;
};
export const boulderAt = (state: ExpeditionState, map: MapDefinition, p: Point) => map.puzzles.boulders.find(b => { const at = boulderPosition(state, map, b.id); return at && same(at, p); });
// An unfilled pit cannot be walked over.
export const openPit = (state: ExpeditionState, map: MapDefinition, p: Point) => map.puzzles.boulders.find(b => same(b.pit, p) && !state.solved.includes(b.id));
// A wall tile the party can pass: an opened door, or a secret wall (found or not; secrets show no hint until found).
export const passableWall = (state: ExpeditionState, map: MapDefinition, p: Point): boolean => doorOpen(state, map, p) || !!secretAt(map, p);
