import type { ChestTier, ExpeditionState, MapDefinition, PetBlessing, Point } from './types';

// PET-2 (OD-63, docs/design/PET_SYSTEM_ANALYSIS_TH.md §5.1/§5.2b): the map blessing of the pet the run brought
// (`run.pet`, fixed at departure). The value is the blessing's Lv1 step below `blessingLevel`, its Lv6 step from it.
// Pure and deterministic: a blessing that rolls (luck) draws from the run's own (seed, rolls) stream, and only when it
// applies, so a run without that pet keeps every roll it had before PET-2.

export function petBlessing(state: Pick<ExpeditionState, 'pet'>, map: MapDefinition, kind: PetBlessing): number {
  const pet = state.pet; if (!pet) return 0;
  const def = map.pets.kinds.find(k => k.id === pet.kind);
  if (def?.blessing.kind !== kind) return 0;
  return pet.level >= map.pets.blessingLevel ? def.blessing.at6 : def.blessing.at1;
}
// Farsight: the fog opens this far around the party (the mine's darkness keeps its own smaller light).
export const sightRadius = (state: Pick<ExpeditionState, 'pet'>, map: MapDefinition): number => map.revealRadius + petBlessing(state, map, 'farsight');
// Ward: a random-encounter chance lowered by the blessing's percent of itself (rounded down). Elites, bosses, events and
// other forced fights never roll this chance, so the ward cannot touch them.
export const wardedChance = (state: Pick<ExpeditionState, 'pet'>, map: MapDefinition, chance: number): number => {
  const ward = petBlessing(state, map, 'ward');
  return ward ? Math.floor(chance * (100 - ward) / 100) : chance;
};
// Luck: a common chest has the blessing's percent chance to open as a rare one (one extra roll, only with this pet).
export function luckyTier(state: ExpeditionState, map: MapDefinition, tier: ChestTier, roll: (s: ExpeditionState) => number): ChestTier {
  const luck = petBlessing(state, map, 'luck');
  return tier === 'common' && luck > 0 && roll(state) < luck ? 'rare' : tier;
}
// Lantern: unopened chests and unfinished events still hidden in fog, within the fog's edge plus the blessing's range
// (square distance, like the fog). Only their markers are seen; the floor stays dark. Missing pet = none.
export function petSightings(state: ExpeditionState, map: MapDefinition): { chests: string[]; events: string[] } {
  const range = petBlessing(state, map, 'lantern'); if (!range) return { chests: [], events: [] };
  const width = map.rows[0]!.length; const reach = sightRadius(state, map) + range;
  const seen = (p: Point) => state.revealed[p.y * width + p.x] !== '1'
    && Math.max(Math.abs(p.x - state.position.x), Math.abs(p.y - state.position.y)) <= reach;
  return {
    chests: map.chests.filter(c => !state.openedChests.includes(c.id) && seen(c)).map(c => c.id),
    events: map.events.filter(e => !state.eventsDone.includes(e.id) && seen(e)).map(e => e.id),
  };
}
