import type { ExpeditionState, MapDefinition, Point } from './types';

// Map 4 tide (save v68, docs/design/CHAPTER1_MAPS_TH.md §3). Pure and deterministic: the water level follows the run's
// step count plus the steps the camps' waits added (`tideWait`), never a clock or a roll. Low tide comes first.
type TideState = Pick<ExpeditionState, 'steps' | 'tideWait' | 'boat' | 'solved'>;
export const tideClock = (state: Pick<ExpeditionState, 'steps' | 'tideWait'>): number => state.steps + (state.tideWait ?? 0);
export const lowTideAt = (map: MapDefinition, clock: number): boolean => !map.tide || Math.floor(clock / map.tide.period) % 2 === 0;
export const lowTide = (state: Pick<ExpeditionState, 'steps' | 'tideWait'>, map: MapDefinition): boolean => lowTideAt(map, tideClock(state));
// Steps until the water turns (shown on the board); 0 on a map without a tide.
export const stepsToTurn = (state: Pick<ExpeditionState, 'steps' | 'tideWait'>, map: MapDefinition): number =>
  map.tide ? map.tide.period - (tideClock(state) % map.tide.period) : 0;
export type Water = 'shallow' | 'deep';
// A boulder sunk into a channel (its pit) is a lasting causeway: dry whatever the tide.
export function waterAt(map: MapDefinition, p: Point, solved: readonly string[] = []): Water | undefined {
  const t = map.tide; const ch = map.rows[p.y]?.[p.x]; if (!t || ch === undefined) return undefined;
  if (map.puzzles.boulders.some(b => b.pit.x === p.x && b.pit.y === p.y && solved.includes(b.id))) return undefined;
  return t.shallow.includes(ch) ? 'shallow' : t.deep.includes(ch) ? 'deep' : undefined;
}
// Why the party cannot step onto `p` at this clock (empty when it can): deep water needs the boat; shallow water is
// walked at low tide, or crossed by boat at any tide.
export function tideBlock(state: TideState, map: MapDefinition, p: Point, clock = tideClock(state)): '' | 'tide' | 'deep' {
  const w = waterAt(map, p, state.solved); if (!w || state.boat) return '';
  if (w === 'deep') return 'deep';
  return lowTideAt(map, clock) ? '' : 'tide';
}
// After a step: a party on foot still in shallow water when the tide has just come in is swept back to its dry tile.
export const sweptBack = (state: TideState & Pick<ExpeditionState, 'position'>, map: MapDefinition): boolean =>
  !state.boat && waterAt(map, state.position, state.solved) === 'shallow' && !lowTide(state, map);
