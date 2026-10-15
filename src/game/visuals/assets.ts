import type { EncounterDefinition } from '../../core/battle/types';

// Each actor's full-body frame and portrait live in a 2-column atlas of 512 px cells:
// the original cast in `units`/`portraits` (3 rows), mercenaries in `units_mercs`/`portraits_mercs`
// (3 rows) and the Veil Frontier foes in `units_foes`/`portraits_foes` (5 rows), all from
// ART-CHAR-MERC-ENEMY-001 except the original cast. Unit and portrait atlases share frame order.
export type ArtSheet = 'units' | 'mercs' | 'foes';
export const sheetRows: Readonly<Record<ArtSheet, number>> = { units: 3, mercs: 3, foes: 5 };
export const actorArt: Readonly<Record<string, { sheet: ArtSheet; frame: number }>> = {
  guardian: { sheet: 'units', frame: 0 }, tracer: { sheet: 'units', frame: 1 }, weaver: { sheet: 'units', frame: 2 },
  healer: { sheet: 'units', frame: 3 }, raider: { sheet: 'units', frame: 4 }, brute: { sheet: 'units', frame: 5 },
  garran: { sheet: 'mercs', frame: 0 }, mira: { sheet: 'mercs', frame: 1 }, toma: { sheet: 'mercs', frame: 2 },
  sefa: { sheet: 'mercs', frame: 3 }, brann: { sheet: 'mercs', frame: 4 },
  // Frame 5 is delivered for Lio (bard); map it when the class ships.
  foe_tusker: { sheet: 'foes', frame: 0 }, foe_sprite: { sheet: 'foes', frame: 1 }, foe_stalker: { sheet: 'foes', frame: 2 },
  foe_mycon: { sheet: 'foes', frame: 3 }, foe_golem: { sheet: 'foes', frame: 4 }, foe_riftweaver: { sheet: 'foes', frame: 5 },
  foe_matriarch: { sheet: 'foes', frame: 6 }, foe_juggernaut: { sheet: 'foes', frame: 7 }, foe_sentinel: { sheet: 'foes', frame: 8 },
};
// Enemy ids are field positions (`raider` back, `brute` front/large); `art` picks the illustration.
export const artOf = (data: EncounterDefinition, id: string): string => data.enemies.find(e => e.id === id)?.art ?? id;
// Anchor the illustrated soles, excluding transparent padding below the feet (delivered frames: footY 496).
const deliveredSoles = 497 / 512;
export const actorFootOrigins: Readonly<Record<string, number>> = {
  raider: 493 / 512, brute: 496 / 512,
  ...Object.fromEntries(Object.entries(actorArt).filter(([, a]) => a.sheet !== 'units').map(([id]) => [id, deliveredSoles])),
};
type ArtName = 'units' | 'portraits' | 'ruins' | 'units_mercs' | 'portraits_mercs' | 'units_foes' | 'portraits_foes';
export const artUrl = (name: ArtName): string => `${import.meta.env.BASE_URL}assets/art/${name}.webp`;
export const unitsUrl = (sheet: ArtSheet): string => artUrl(sheet === 'units' ? 'units' : `units_${sheet}`);
export const portraitsUrl = (sheet: ArtSheet): string => artUrl(sheet === 'units' ? 'portraits' : `portraits_${sheet}`);
