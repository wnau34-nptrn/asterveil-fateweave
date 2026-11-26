import type { Point } from './types';

export interface WorkerSite extends Point {
  readonly id: string;
}

export interface MineRescue {
  readonly following: readonly string[];
  readonly rescued: readonly string[];
}

const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;

export function inviteMineWorker(rescue: MineRescue, worker: WorkerSite, position: Point): MineRescue {
  if (!same(position, worker) || rescue.following.includes(worker.id) || rescue.rescued.includes(worker.id)) return rescue;
  return { ...rescue, following: [...rescue.following, worker.id] };
}

export function escortMineWorkers(rescue: MineRescue, position: Point, safeCamp: Point): MineRescue {
  if (!same(position, safeCamp) || !rescue.following.length) return rescue;
  return { following: [], rescued: [...rescue.rescued, ...rescue.following] };
}
