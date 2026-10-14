import { describe, expect, it } from 'vitest';
import { encounterById } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { findTiles, newExpedition, tileAt } from '../src/core/world/world';
import { cellHash, decorAt, floorFrame, fogLayers, landmarkAt, tileSizeFor, tileset } from '../src/game/visuals/world-art';

describe('world art selection', () => {
  it('maps every cell to an existing atlas frame, with stable variants', () => {
    for (let y = 0; y < map.rows.length; y++) for (let x = 0; x < map.rows[0]!.length; x++) {
      const frame = floorFrame(map, { x, y });
      expect(tileset[frame]).toBeDefined();
      expect(floorFrame(map, { x, y })).toBe(frame);
      const kind = tileAt(map, { x, y })!.kind;
      expect(frame.startsWith('wall_')).toBe(kind === 'wall');
    }
    expect(cellHash(3, 4)).toBe(cellHash(3, 4));
  });
  it('uses a painted face only above walkable ground and inner rock when fully enclosed', () => {
    const start = findTiles(map, 'start')[0]!;
    expect(floorFrame(map, { x: start.x, y: start.y - 1 })).toBe('wall_face');
    expect(floorFrame(map, { x: 0, y: 0 })).toBe('wall_inner');
  });
  it('places props only on plain floor away from landmarks, from the matching zone', () => {
    let count = 0;
    for (let y = 0; y < map.rows.length; y++) for (let x = 0; x < map.rows[0]!.length; x++) {
      const prop = decorAt(map, { x, y }); if (!prop) continue; count++;
      expect(tileAt(map, { x, y })!.kind).toBe('floor');
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(['floor', 'wall', undefined]).toContain(tileAt(map, { x: x + dx, y: y + dy })?.kind);
    }
    expect(count).toBeGreaterThan(10);
  });
  it('fog is opaque on unexplored cells and dissolves only inside explored edges', () => {
    const s = newExpedition(map, encounterById, 1); const start = findTiles(map, 'start')[0]!;
    expect(fogLayers(map, s, start)).toEqual([]);
    expect(fogLayers(map, s, { x: 0, y: 0 })).toEqual(['fog_tile']);
    const edge = { x: start.x, y: start.y - 3 };
    expect(fogLayers(map, s, edge)).toContain('fog_edge_n');
    expect(fogLayers(map, s, { x: start.x - 3, y: start.y - 3 })).toEqual(expect.arrayContaining(['fog_edge_n', 'fog_edge_w']));
  });
  it('landmarks follow committed flags: boss pedestal → cleared, gate → open', () => {
    const s = newExpedition(map, encounterById, 1); const [boss] = findTiles(map, 'boss'); const [gate] = findTiles(map, 'goal');
    expect(landmarkAt(map, s, boss!)).toBe('boss_pedestal'); expect(landmarkAt(map, s, gate!)).toBe('landmark_gate');
    expect(landmarkAt(map, { ...s, bossDefeated: true, completed: true }, boss!)).toBe('landmark_boss_cleared');
    expect(landmarkAt(map, { ...s, completed: true }, gate!)).toBe('landmark_gate_open');
    expect(landmarkAt(map, s, findTiles(map, 'camp')[0]!)).toBe('landmark_camp');
  });
  it('tile size follows the responsive contract', () => {
    expect([tileSizeFor(320, 568), tileSizeFor(390, 844), tileSizeFor(844, 390), tileSizeFor(768, 1024), tileSizeFor(1366, 768)]).toEqual([36, 48, 44, 56, 64]);
  });
});
