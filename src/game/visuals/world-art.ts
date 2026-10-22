import type { ExpeditionState, MapDefinition, Point } from '../../core/world/types';
import { isRevealed, tileAt } from '../../core/world/world';
import tilesetFrames from '../../content/world/tileset.json';
import decorFrames from '../../content/world/decor.json';
import chestFrames from '../../content/world/chests.json';
import itemFrames from '../../content/world/items.json';

// Pure art selection for the DOM map (ART-UI-WORLD-001). Choices depend only on
// tile coordinates and committed state, so a frame never changes between renders.
export interface Frame { x: number; y: number; w: number; h: number }
export const SOURCE_TILE = 128;
export const tileset: Readonly<Record<string, Frame>> = tilesetFrames;
const decor: Readonly<Record<string, Frame & { zone: string }>> = decorFrames;
// ART-WORLD-LOOT-001 atlases: 128 px chest frames (sole baseline footY) and item frames.
export const chestFrame = (tier: 'common' | 'rare', open: boolean): Frame & { footY: number } => chestFrames[`chest_${tier}${open ? '_open' : ''}`];
export const itemFrame = (id: 'ore' | 'ember' | 'seal'): Frame => itemFrames[`item_${id}`];
export const worldArtUrl = (name: string): string => `${import.meta.env.BASE_URL}assets/world/${name}.webp`;

// Stable integer hash of a coordinate (and a salt) for variants and decor.
export function cellHash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x + 1, 0x27d4eb2d) ^ Math.imul(y + 1, 0x165667b1) ^ Math.imul(salt + 1, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13;
  return h >>> 0;
}
const walkable = (map: MapDefinition, p: Point) => { const t = tileAt(map, p); return !!t && t.kind !== 'wall'; };
const floorZone: Record<string, string> = { meadow: 'meadow', thicket: 'thicket', scar: 'scar', sanctum: 'sanctum' };

// Map 2's trail uses its own painted materials (ART-WORLD-TILES-002): trail floor with deeper grove pockets
// (coarse 4×4-cell blocks so the two never checker) and its own cliff walls; camp and exit keep the shared art.
const forestTrail = (map: MapDefinition, zoneId: string): boolean => map.id === 'deep-forest' && zoneId === 'thicket';
const grovePocket = (p: Point): boolean => cellHash(p.x >> 2, p.y >> 2, 3) % 3 === 0;
export function floorFrame(map: MapDefinition, p: Point): string {
  const tile = tileAt(map, p)!;
  if (tile.kind === 'wall') {
    return map.id === 'deep-forest' ? `forest_${wallFace(map, p)}` : wallFace(map, p);
  }
  if (tile.kind === 'camp') return `camp_ground_${cellHash(p.x, p.y) % 2}`;
  if (forestTrail(map, tile.zoneId)) return `${grovePocket(p) ? 'grove' : 'forest'}_${cellHash(p.x, p.y) % 4}`;
  return `${floorZone[tile.zoneId] ?? 'sanctum'}_${cellHash(p.x, p.y) % 4}`;
}
// Painted ledge faces south when the party can stand below it.
function wallFace(map: MapDefinition, p: Point): string {
  if (walkable(map, { x: p.x, y: p.y + 1 })) return 'wall_face';
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && walkable(map, { x: p.x + dx, y: p.y + dy })) return 'wall_top';
  return 'wall_inner';
}

export type Landmark = 'landmark_camp' | 'landmark_start' | 'landmark_gate' | 'landmark_gate_open' | 'boss_pedestal' | 'landmark_boss_cleared';
export function landmarkAt(map: MapDefinition, state: ExpeditionState, p: Point): Landmark | undefined {
  switch (tileAt(map, p)?.kind) {
    case 'camp': return 'landmark_camp';
    case 'start': return 'landmark_start';
    case 'goal': return state.completed ? 'landmark_gate_open' : 'landmark_gate';
    case 'boss': return state.bossDefeated ? 'landmark_boss_cleared' : 'boss_pedestal';
    default: return undefined;
  }
}

// Puzzle pieces (3C) keep their tiles free of decor so stones, levers, boulders and pits read clearly.
const puzzleTile = (map: MapDefinition, p: Point): boolean => {
  const at = (q: Point) => q.x === p.x && q.y === p.y; const P = map.puzzles;
  return P.runes.some(r => r.stones.some(at)) || P.levers.some(l => l.levers.some(at)) || P.boulders.some(b => at(b.at) || at(b.pit)) || map.herbs.some(at);
};
// The floor frame a doorway or found secret passage shows once open: that of a walkable neighbour.
export function openingFrame(map: MapDefinition, p: Point): string {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]] as const) {
    const t = tileAt(map, { x: p.x + dx, y: p.y + dy }); if (t && t.kind === 'floor') return floorFrame(map, { x: p.x + dx, y: p.y + dy });
  }
  return 'sanctum_0';
}
// Sparse props on plain floor only, away from landmarks so silhouettes stay readable.
export function decorAt(map: MapDefinition, p: Point): (Frame & { name: string }) | undefined {
  const tile = tileAt(map, p);
  if (tile?.kind !== 'floor' || cellHash(p.x, p.y, 7) % 100 >= 18 || puzzleTile(map, p)) return undefined;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const near = tileAt(map, { x: p.x + dx, y: p.y + dy })?.kind;
    if (near && near !== 'floor' && near !== 'wall') return undefined;
  }
  const zone = forestTrail(map, tile.zoneId) ? 'forest' : tile.zoneId;
  const options = Object.entries(decor).filter(([, f]) => f.zone === zone);
  if (!options.length) return undefined;
  const [name, frame] = options[cellHash(p.x, p.y, 11) % options.length]!;
  return { name, ...frame };
}

// Fill variants (ART-WORLD-FOG-002) share their borders, so any mix tiles without seams.
export const fogFills = ['fog_tile', 'fog_tile_b', 'fog_tile_c'] as const;

// Fog layers for one cell: an opaque veil when unexplored, otherwise dissolving
// edges toward unexplored cardinal neighbours, and corners only for diagonals.
export function fogLayers(map: MapDefinition, state: ExpeditionState, p: Point): string[] {
  const hidden = (dx: number, dy: number) => {
    const q = { x: p.x + dx, y: p.y + dy };
    return q.x >= 0 && q.y >= 0 && q.y < map.rows.length && q.x < map.rows[0]!.length && !isRevealed(state, map, q);
  };
  if (hidden(0, 0)) return [fogFills[cellHash(p.x, p.y, 7) % fogFills.length]!];
  const n = hidden(0, -1), s = hidden(0, 1), e = hidden(1, 0), w = hidden(-1, 0);
  // Exactly two adjacent hidden sides: one rounded inner corner instead of two stacked edges.
  const inner = [n, s, e, w].filter(Boolean).length === 2 && n !== s ? `fog_inner_${n ? 'n' : 's'}${e ? 'e' : 'w'}` : undefined;
  const layers = inner ? [inner] : [n && 'fog_edge_n', s && 'fog_edge_s', e && 'fog_edge_e', w && 'fog_edge_w'].filter(Boolean) as string[];
  if (!n && !e && hidden(1, -1)) layers.push('fog_corner_ne');
  if (!s && !e && hidden(1, 1)) layers.push('fog_corner_se');
  if (!s && !w && hidden(-1, 1)) layers.push('fog_corner_sw');
  if (!n && !w && hidden(-1, -1)) layers.push('fog_corner_nw');
  return layers;
}

// Display tile size (P4): the camera sits close, about 6.5 tiles across a portrait screen and
// 8.5 tiles down a landscape one, clamped to 40–96 px so taps stay ≥44 px wide on every phone.
export function tileSizeFor(width: number, height: number): number {
  const t = width > height ? height / 8.5 : width / 6.5;
  return Math.round(Math.min(96, Math.max(44, t)));
}
