// Each actor's full-body frame and portrait live in one 2×3 atlas of 512 px cells:
// the original cast in `units`/`portraits`, mercenaries in `units_mercs`/`portraits_mercs`
// (ART-CHAR-MERC-ENEMY-001). Both atlas pairs share the same frame order.
export type ArtSheet = 'units' | 'mercs';
export const actorArt: Readonly<Record<string, { sheet: ArtSheet; frame: number }>> = {
  guardian: { sheet: 'units', frame: 0 }, tracer: { sheet: 'units', frame: 1 }, weaver: { sheet: 'units', frame: 2 },
  healer: { sheet: 'units', frame: 3 }, raider: { sheet: 'units', frame: 4 }, brute: { sheet: 'units', frame: 5 },
  garran: { sheet: 'mercs', frame: 0 }, mira: { sheet: 'mercs', frame: 1 }, toma: { sheet: 'mercs', frame: 2 },
  // Frames 3–5 are delivered for Sefa (scout), Brann (warden) and Lio (bard); map them when each class ships.
};
// Anchor the illustrated soles, excluding transparent padding below the feet.
const mercSoles = 497 / 512;
export const actorFootOrigins: Readonly<Record<string, number>> = { raider: 493 / 512, brute: 496 / 512, garran: mercSoles, mira: mercSoles, toma: mercSoles };
type ArtName = 'units' | 'portraits' | 'ruins' | 'units_mercs' | 'portraits_mercs';
export const artUrl = (name: ArtName): string => `${import.meta.env.BASE_URL}assets/art/${name}.webp`;
export const unitsUrl = (sheet: ArtSheet): string => artUrl(sheet === 'units' ? 'units' : 'units_mercs');
export const portraitsUrl = (sheet: ArtSheet): string => artUrl(sheet === 'units' ? 'portraits' : 'portraits_mercs');
