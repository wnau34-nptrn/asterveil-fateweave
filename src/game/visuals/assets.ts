import type { EncounterDefinition } from '../../core/battle/types';

// Each actor's full-body frame and portrait live in a 2-column atlas of 512 px cells:
// the original cast in `units`/`portraits` (3 rows), mercenaries in `units_mercs`/`portraits_mercs`
// (5 rows, C12 appends four new characters) and the Veil Frontier foes in `units_foes`/`portraits_foes` (6 rows), all from
// ART-CHAR-MERC-ENEMY-001 except the original cast; foes frames 9–10 are the map-1 boss pair (ART-CHAR-BOSS-RUINS-001); the four-foe battle set (ART-CHAR-FOES-002) is `units_foes2`/`portraits_foes2`
// (5 rows, last cell empty). Unit and portrait atlases share frame order.
export type ArtSheet = 'units' | 'mercs' | 'foes' | 'foes2';
export const sheetRows: Readonly<Record<ArtSheet, number>> = { units: 3, mercs: 5, foes: 6, foes2: 5 };
export const actorArt: Readonly<Record<string, { sheet: ArtSheet; frame: number }>> = {
  guardian: { sheet: 'units', frame: 0 }, tracer: { sheet: 'units', frame: 1 }, weaver: { sheet: 'units', frame: 2 },
  healer: { sheet: 'units', frame: 3 }, raider: { sheet: 'units', frame: 4 }, brute: { sheet: 'units', frame: 5 },
  garran: { sheet: 'mercs', frame: 0 }, mira: { sheet: 'mercs', frame: 1 }, toma: { sheet: 'mercs', frame: 2 },
  sefa: { sheet: 'mercs', frame: 3 }, brann: { sheet: 'mercs', frame: 4 }, lio: { sheet: 'mercs', frame: 5 },
  metta: { sheet: 'mercs', frame: 6 }, thiran: { sheet: 'mercs', frame: 7 },
  lalin: { sheet: 'mercs', frame: 8 }, wila: { sheet: 'mercs', frame: 9 },
  foe_tusker: { sheet: 'foes', frame: 0 }, foe_sprite: { sheet: 'foes', frame: 1 }, foe_stalker: { sheet: 'foes', frame: 2 },
  foe_mycon: { sheet: 'foes', frame: 3 }, foe_golem: { sheet: 'foes', frame: 4 }, foe_riftweaver: { sheet: 'foes', frame: 5 },
  foe_matriarch: { sheet: 'foes', frame: 6 }, foe_juggernaut: { sheet: 'foes', frame: 7 }, foe_sentinel: { sheet: 'foes', frame: 8 },
  foe_hunter: { sheet: 'foes', frame: 9 }, foe_captain: { sheet: 'foes', frame: 10 },
  foe_dew_slime: { sheet: 'foes2', frame: 0 }, foe_ember_slime: { sheet: 'foes2', frame: 1 }, foe_ruin_bat: { sheet: 'foes2', frame: 2 },
  foe_vargoth_guard: { sheet: 'foes2', frame: 3 }, foe_thorn_beetle: { sheet: 'foes2', frame: 4 }, foe_spore_puff: { sheet: 'foes2', frame: 5 },
  foe_rift_channeler: { sheet: 'foes2', frame: 6 }, foe_rift_wisp: { sheet: 'foes2', frame: 7 }, foe_shard_crawler: { sheet: 'foes2', frame: 8 },
};
// Enemy ids are field slots (`f1`/`f2` front, `b1`/`b2` back); `art` picks the illustration (`raider`/`brute` are the
// original cast's frames).
// Frames drawn facing the wrong way for their side (party faces right, enemies face left, ART-PLACEMENT-RULES):
// The original units-atlas raider and the runtime foes-atlas matriarch face right.
// The incoming matriarch already faces left; intake flipped it when building the runtime atlas.
export const mirroredArt: ReadonlySet<string> = new Set(['raider', 'foe_matriarch']);
export const artOf = (data: EncounterDefinition, id: string): string => data.enemies.find(e => e.id === id)?.art ?? id;
// The illustration that stands for a whole encounter (map elite markers): its boss, else its large foe, else its first.
export const leaderArt = (data: EncounterDefinition | undefined): string => {
  const e = data?.enemies.find(f => f.boss) ?? data?.enemies.find(f => f.large) ?? data?.enemies[0];
  return e?.art ?? 'brute';
};
// Anchor the illustrated soles, excluding transparent padding below the feet (delivered frames: footY 496).
const deliveredSoles = 497 / 512;
export const actorFootOrigins: Readonly<Record<string, number>> = {
  raider: 493 / 512, brute: 496 / 512,
  ...Object.fromEntries(Object.entries(actorArt).filter(([, a]) => a.sheet !== 'units').map(([id]) => [id, deliveredSoles])),
};
// Top row of each frame's painted figure (alpha > 40) in its 512 px cell, measured from the atlases: a field HP panel
// sits just above it (owner 2026-10-22). Re-measure when an atlas changes.
const figureTops: Readonly<Record<string, number>> = {
  guardian: 19, tracer: 17, weaver: 0, healer: 0, raider: 0, brute: 0, garran: 37, mira: 37, toma: 37, sefa: 37, brann: 37, lio: 37, metta: 37, thiran: 37, lalin: 37, wila: 37, foe_tusker: 57, foe_sprite: 197, foe_stalker: 57, foe_mycon: 37, foe_golem: 17, foe_riftweaver: 37, foe_matriarch: 17, foe_juggernaut: 40, foe_sentinel: 5, foe_hunter: 35, foe_captain: 37, foe_dew_slime: 182, foe_ember_slime: 227, foe_ruin_bat: 218, foe_vargoth_guard: 133, foe_thorn_beetle: 191, foe_spore_puff: 107, foe_rift_channeler: 68, foe_rift_wisp: 127, foe_shard_crawler: 191,
};
// How far the painted figure rises above its feet, as a fraction of the drawn size.
export const figureRise = (art: string): number => (actorFootOrigins[art] ?? 1) - (figureTops[art] ?? 0) / 512;
type ArtName = 'units' | 'portraits' | 'ruins' | 'units_mercs' | 'portraits_mercs' | 'units_foes' | 'portraits_foes' | 'units_foes2' | 'portraits_foes2';
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
