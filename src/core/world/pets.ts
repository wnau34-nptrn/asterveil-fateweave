import { featureOpen } from './profile';
import type { ExpeditionState, MapDefinition, PetBook, PetKind, Profile, ProfileResult, RunOutcome, RunPet } from './types';

// PET-1 (OD-63, docs/design/PET_SYSTEM_ANALYSIS_TH.md §5.2): choice eggs come from first map clears (the map-4 boss
// first, then map 5…) and hatch at the camp into the kind the player picks (one of each kind, no draw). One hatched pet
// is chosen for the next expedition; the run keeps it until it settles. Map blessings, battle assists and food are
// PET-2…PET-6: here a pet has no effect yet. Pure: no clocks, randomness or platform APIs.

const emptyBook = (): PetBook => ({ eggs: 0, shards: 0, owned: [], from: [] });
const blocked = (profile: Profile, reason: string): ProfileResult => ({ profile, event: { type: 'blocked', reason } });

export function hatchReason(profile: Profile, maps: readonly MapDefinition[], map: MapDefinition, kind: PetKind): string {
  if (!featureOpen(profile, maps, 'pets')) return 'locked';
  if (!map.pets.kinds.some(k => k.id === kind)) return 'unknown';
  const book = profile.pets;
  if (book?.owned.some(p => p.kind === kind)) return 'owned';
  return (book?.eggs ?? 0) > 0 || (book?.shards ?? 0) >= map.pets.eggShards ? '' : 'egg';
}
// A whole egg is spent before egg shards. The first pet hatched is also chosen for the next expedition.
export function hatchEgg(initial: Profile, maps: readonly MapDefinition[], map: MapDefinition, kind: PetKind): ProfileResult {
  const reason = hatchReason(initial, maps, map, kind); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); const book = (profile.pets ??= emptyBook());
  const shards = book.eggs === 0;
  if (shards) book.shards -= map.pets.eggShards; else book.eggs--;
  book.owned.push({ kind, level: 1, exp: 0 });
  book.chosen ??= kind;
  return { profile, event: { type: 'hatched', kind, ...(shards ? { shards: true as const } : {}) } };
}
// `kind` undefined: go without a pet.
export function choosePet(initial: Profile, maps: readonly MapDefinition[], kind: PetKind | undefined): ProfileResult {
  if (!featureOpen(initial, maps, 'pets')) return blocked(initial, 'locked');
  if (kind !== undefined && !initial.pets?.owned.some(p => p.kind === kind)) return blocked(initial, 'unowned');
  const profile = structuredClone(initial);
  if (profile.pets) { if (kind === undefined) delete profile.pets.chosen; else profile.pets.chosen = kind; }
  return { profile, event: { type: 'petChosen', ...(kind ? { kind } : {}) } };
}
// The pet a departing run brings: the chosen one at its current level (missing = none).
export function runPet(profile: Profile): RunPet | undefined {
  const book = profile.pets; const p = book?.chosen ? book.owned.find(x => x.kind === book.chosen) : undefined;
  return p ? { kind: p.kind, level: p.level } : undefined;
}
// Settling: a completed normal run on an egg map pays its choice egg once per company (`from`). Mutates `profile`
// (settle works on its own copy); settling cannot be refused, so a full egg store keeps its cap.
export function settlePetEgg(profile: Profile, run: ExpeditionState, outcome: RunOutcome, map: MapDefinition): void {
  if (outcome !== 'complete' || run.hard || !map.pets.firstClearEggs.includes(run.mapId) || profile.pets?.from.includes(run.mapId)) return;
  grantEgg(profile, map, run.mapId);
}
function grantEgg(profile: Profile, map: MapDefinition, mapId: string): void {
  const book = (profile.pets ??= emptyBook());
  book.from.push(mapId); book.eggs = Math.min(map.pets.eggCap, book.eggs + 1);
}
// v70 → v71: a company that already beat an egg map's boss gets that map's egg from its clear history (map order).
export function migratePetEggs(profile: Profile, map: MapDefinition): void {
  for (const id of map.pets.firstClearEggs) if (profile.cleared.includes(id) && !profile.pets?.from.includes(id)) grantEgg(profile, map, id);
}
