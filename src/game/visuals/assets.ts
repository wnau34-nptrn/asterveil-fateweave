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
  sefa: { sheet: 'mercs', frame: 3 }, brann: { sheet: 'mercs', frame: 4 }, lio: { sheet: 'mercs', frame: 5 },
  foe_tusker: { sheet: 'foes', frame: 0 }, foe_sprite: { sheet: 'foes', frame: 1 }, foe_stalker: { sheet: 'foes', frame: 2 },
  foe_mycon: { sheet: 'foes', frame: 3 }, foe_golem: { sheet: 'foes', frame: 4 }, foe_riftweaver: { sheet: 'foes', frame: 5 },
  foe_matriarch: { sheet: 'foes', frame: 6 }, foe_juggernaut: { sheet: 'foes', frame: 7 }, foe_sentinel: { sheet: 'foes', frame: 8 },
};
// Enemy ids are field positions (`raider` back, `brute` front/large); `art` picks the illustration.
// Frames drawn facing the wrong way for their side (party faces right, enemies face left, ART-PLACEMENT-RULES):
// The original units-atlas raider and the runtime foes-atlas matriarch face right.
// The incoming matriarch already faces left; intake flipped it when building the runtime atlas.
export const mirroredArt: ReadonlySet<string> = new Set(['raider', 'foe_matriarch']);
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

// Lobby camp poses (ART-UI-LOBBY-001): 3 columns (sit, cheer, idle_alt) of 512 px frames, one row per
// character. Every frame faces right with soles at y=496 (sitting frames include their log).
export type LobbyPose = 'sit' | 'cheer' | 'idle_alt';
const poseColumns: Readonly<Record<LobbyPose, number>> = { sit: 0, cheer: 1, idle_alt: 2 };
const poseSheets = {
  heroes: ['guardian', 'tracer', 'weaver', 'healer'],
  mercs: ['garran', 'mira', 'toma', 'sefa', 'brann', 'lio'],
} as const;
export function lobbyPose(id: string, pose: LobbyPose): { url: string; column: number; row: number; rows: number } | undefined {
  for (const [sheet, ids] of Object.entries(poseSheets) as [keyof typeof poseSheets, readonly string[]][]) {
    const row = ids.indexOf(id);
    if (row >= 0) return { url: `${import.meta.env.BASE_URL}assets/lobby/lobby_poses_${sheet}.webp`, column: poseColumns[pose], row, rows: ids.length };
  }
  return undefined;
}
// Prologue scenes and Vargoth (ART-STORY-PROLOGUE-001).
export type StoryArt = 'story_awaken' | 'story_rift' | 'story_retreat' | 'vargoth_full' | 'vargoth_bust';
export const storyArt = (name: StoryArt): string => `${import.meta.env.BASE_URL}assets/story/${name}.webp`;
export const lobbyArt = (name: 'lobby_bg' | 'lobby_fg' | 'lobby_firepit'): string => `${import.meta.env.BASE_URL}assets/lobby/${name}.webp`;
// Camp NPCs (ART-CHAR-NPC-001): one 4 × 3 atlas of 512 px frames per NPC (row 0 idle ×4, row 1 work ×4,
// row 2 greet ×2 + cheer + empty), soles at y=496, facing right. Stations and busts share one 3 × 2 atlas each,
// in NPC_IDS order. Each NPC runs one lobby service.
export const NPC_IDS = ['smith', 'broker', 'trainer', 'keeper', 'herbalist', 'scout'] as const;
export type NpcId = typeof NPC_IDS[number];
const npcBase = () => `${import.meta.env.BASE_URL}assets/lobby/npc/`;
export const npcAtlasUrl = (id: NpcId): string => `${npcBase()}npc_${id}.webp`;
export const npcStationsUrl = (): string => `${npcBase()}npc_stations.webp`;
export const npcBustsUrl = (): string => `${npcBase()}npc_busts.webp`;
