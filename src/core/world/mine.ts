import { mineCrystalDuration, mineCrystalStepsLeft, mineLanternCells, mineVisibleCells } from './mine-light';
import { traceMineBeam, traceMinecart, type BeamPuzzle, type CartPuzzle, type CartSwitch } from './mine-puzzles';
import { escortMineWorkers, inviteMineWorker, type MineRescue, type WorkerSite } from './mine-rescue';
import type { Direction, ExpeditionState, MapDefinition, Point } from './types';

export interface MineDefinition {
  readonly darkZones: readonly string[];
  readonly darkPressurePercent?: number;
  readonly crystals: readonly Point[];
  readonly workers: readonly WorkerSite[];
  readonly rescueCamp: Point;
  readonly cart: CartPuzzle<CartSwitch & { readonly lever: Point }> & { readonly id: string };
  readonly beam: BeamPuzzle & { readonly id: string };
}

export interface MineProgress {
  crystalExpiresAt?: number;
  rescue: MineRescue;
  cart: ['main' | 'siding', 'main' | 'siding', 'main' | 'siding'];
  beam: [Direction, Direction, Direction];
  stories: string[];
}

export const MINE_ACTIONS = ['light-lantern', 'charge-crystal', 'invite-worker', 'switch-track', 'push-cart', 'turn-crystal'] as const;
export type MineAction = (typeof MINE_ACTIONS)[number];

const directionOrder: readonly Direction[] = ['up', 'right', 'down', 'left'];
const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;

function progress(state: ExpeditionState): MineProgress {
  return (state.mine ??= { rescue: { following: [], rescued: [] }, cart: ['siding', 'siding', 'siding'], beam: ['up', 'up', 'up'], stories: [] });
}

export function recordMineStory(state: ExpeditionState, id: string): void {
  const stories = progress(state).stories;
  if (!stories.includes(id)) stories.push(id);
}

export function deliverMineWorkers(state: ExpeditionState, mine: MineDefinition): void {
  if (state.mine) state.mine.rescue = escortMineWorkers(state.mine.rescue, state.position, mine.rescueCamp);
}

function litLanterns(state: ExpeditionState, map: MapDefinition): readonly Point[] {
  return map.lanterns?.filter(lantern => state.lanterns?.includes(lantern.id)) ?? [];
}

function openedWalls(state: ExpeditionState, map: MapDefinition, mine: MineDefinition): readonly Point[] {
  return [
    ...map.puzzles.secrets.filter(secret => state.secrets.includes(secret.id)),
    ...map.puzzles.runes.filter(puzzle => state.solved.includes(puzzle.id)).map(puzzle => puzzle.door),
    ...map.puzzles.levers.filter(puzzle => state.solved.includes(puzzle.id)).map(puzzle => puzzle.door),
    ...(state.solved.includes(mine.cart.id) ? [mine.cart.wall] : []),
    ...(state.solved.includes(mine.beam.id) ? [mine.beam.door] : []),
  ];
}

export function mineVisibility(state: ExpeditionState, map: MapDefinition, mine: MineDefinition, dark: boolean): ReadonlySet<number> {
  const expires = state.mine?.crystalExpiresAt;
  return mineVisibleCells(map.rows, {
    position: state.position, steps: state.steps, litLanterns: litLanterns(state, map),
    ...(expires === undefined ? {} : { crystalExpiresAt: expires }),
  }, openedWalls(state, map, mine), dark ? undefined : map.revealRadius);
}

export function minePressureStep(initial: ExpeditionState, map: MapDefinition, target: Point, zone: string, step: number): number {
  const mine = map.mine;
  if (!mine?.darkPressurePercent || !mine.darkZones.includes(zone)) return step;
  const expires = initial.mine?.crystalExpiresAt;
  if (expires !== undefined && mineCrystalStepsLeft({ steps: initial.steps, crystalExpiresAt: expires }) > 0) return step;
  const lanterns = litLanterns(initial, map);
  if (lanterns.length && mineLanternCells(map.rows, lanterns, openedWalls(initial, map, mine)).has(target.y * map.rows[0]!.length + target.x)) return step;
  return Math.round(step * mine.darkPressurePercent / 100);
}

export function mineActionAt(state: ExpeditionState, map: MapDefinition, position = state.position): MineAction | undefined {
  const mine = map.mine;
  if (!mine) return;
  if (map.lanterns?.some(site => same(site, position) && !state.lanterns?.includes(site.id))) return 'light-lantern';
  if (mine.crystals.some(site => same(site, position))) return 'charge-crystal';
  if (mine.workers.some(site => same(site, position) && !state.mine?.rescue.following.includes(site.id) && !state.mine?.rescue.rescued.includes(site.id))) return 'invite-worker';
  if (!state.solved.includes(mine.cart.id)) {
    if (mine.cart.switches.some(site => same(site.lever, position))) return 'switch-track';
    if (same(mine.cart.start, position)) return 'push-cart';
  }
  if (!state.solved.includes(mine.beam.id) && mine.beam.crystals.some(site => same(site, position))) return 'turn-crystal';
}

// Validate an explicit map interaction before changing the run. Movement and UI share the same puzzle traces.
export function applyMineAction(state: ExpeditionState, map: MapDefinition, mine: MineDefinition, action: MineAction): boolean {
  const { position } = state;
  switch (action) {
    case 'light-lantern': {
      const lantern = map.lanterns?.find(site => same(site, position));
      if (!lantern || state.lanterns?.includes(lantern.id)) return false;
      (state.lanterns ??= []).push(lantern.id);
      return true;
    }
    case 'charge-crystal':
      if (!mine.crystals.some(site => same(site, position))) return false;
      progress(state).crystalExpiresAt = state.steps + mineCrystalDuration;
      return true;
    case 'invite-worker': {
      const worker = mine.workers.find(site => same(site, position));
      if (!worker) return false;
      const current = progress(state);
      const rescue = inviteMineWorker(current.rescue, worker, position);
      if (rescue === current.rescue) return false;
      current.rescue = rescue;
      return true;
    }
    case 'switch-track': {
      const index = mine.cart.switches.findIndex(site => same(site.lever, position));
      if (index < 0 || state.solved.includes(mine.cart.id)) return false;
      const cart = progress(state).cart;
      cart[index] = cart[index] === 'main' ? 'siding' : 'main';
      return true;
    }
    case 'push-cart':
      if (!same(mine.cart.start, position) || state.solved.includes(mine.cart.id)) return false;
      if (traceMinecart(mine.cart, progress(state).cart).opensWall) state.solved.push(mine.cart.id);
      return true;
    case 'turn-crystal': {
      const index = mine.beam.crystals.findIndex(site => same(site, position));
      if (index < 0 || state.solved.includes(mine.beam.id)) return false;
      const beam = progress(state).beam;
      beam[index] = directionOrder[(directionOrder.indexOf(beam[index]!) + 1) % directionOrder.length]!;
      if (traceMineBeam(mine.beam, map.rows, beam).opensDoor) state.solved.push(mine.beam.id);
      return true;
    }
  }
}
