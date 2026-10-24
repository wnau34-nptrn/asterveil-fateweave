import type { HeroDefinition } from '../battle/types';
import { LANE_SLOTS, type Lane, type Roster } from './types';

// Formation (owner 2026-10-22): the column a deployed member stands in is its front/back lane in battle rules
// (who physical moves reach, front-row screening, braces). Members stand where they were set (`roster.lanes`), else
// in their class's recommended lane; a column holds at most LANE_SLOTS, later slots stepping over to the other one.
export const otherLane = (lane: Lane): Lane => lane === 'front' ? 'back' : 'front';
export function formation(roster: Roster, recommended: (id: string) => Lane): Record<string, Lane> {
  const out: Record<string, Lane> = {}; const count = { front: 0, back: 0 };
  for (const id of roster.deployed) {
    const want = roster.lanes?.[id] ?? recommended(id); const lane = count[want] < LANE_SLOTS ? want : otherLane(want);
    out[id] = lane; count[lane]++;
  }
  return out;
}
// '' when `id` may move to `lane`: it is deployed, and the column has room (or `other`, standing there, trades places).
export function laneReason(roster: Roster, recommended: (id: string) => Lane, id: string, lane: Lane, other?: string): string {
  const now = formation(roster, recommended);
  if (!(id in now) || (other !== undefined && (!(other in now) || now[other] !== lane || other === id))) return 'unknown';
  if (now[id] === lane) return 'same';
  return other === undefined && Object.values(now).filter(l => l === lane).length >= LANE_SLOTS ? 'full' : '';
}
// The roster after the move. Every deployed member's current lane is written down so nobody else shifts.
export function withLane(roster: Roster, recommended: (id: string) => Lane, id: string, lane: Lane, other?: string): Roster {
  const lanes = { ...roster.lanes, ...formation(roster, recommended), [id]: lane };
  if (other !== undefined) lanes[other] = otherLane(lane);
  return { ...roster, lanes };
}
// The party as fought: each hero takes the lane it stands in.
export const placed = (party: readonly HeroDefinition[], lanes: Readonly<Record<string, Lane>> | undefined): HeroDefinition[] =>
  party.map(h => lanes?.[h.id] && lanes[h.id] !== h.lane ? { ...h, lane: lanes[h.id]! } : h);
