import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mineMap } from '../src/content/world/chapter-mine';
import { MINE_REV, decorAt, floorFrame, mapArt, mineArtUrl, mineDecor, mineDecorUrl, mineRails, mineTiles, railAt, tileFrame } from '../src/game/visuals/world-art';
import { battleBackdropUrl, battleSceneOf } from '../src/ui/screen-images';

// ART-WORLD-MINE-PROPS-001: the prop atlas ships lossless, its URL revision follows the bytes, and CSS names the same file.
describe('mine prop art', () => {
  const shipped = readFileSync('public/assets/world/mine_decor.webp');
  it('ships a lossless 6×5 atlas of 128 px cells whose revision matches the file and the CSS', () => {
    expect(shipped.toString('ascii', 12, 16)).toBe('VP8L');
    expect(createHash('sha256').update(shipped).digest('hex').slice(0, 8)).toBe(MINE_REV.decor);
    expect(mineDecorUrl()).toContain(`?v=${MINE_REV.decor}`);
    const css = readFileSync('src/ui/world.css', 'utf8');
    const urls = [...css.matchAll(/\/assets\/world\/mine_decor\.webp\?v=(\w+)/g)];
    expect(urls.length).toBeGreaterThan(0);
    for (const m of urls) expect(m[1]).toBe(MINE_REV.decor);
    for (const f of Object.values(mineDecor)) { expect(f.w).toBe(128); expect(f.x % 128 + f.y % 128).toBe(0); expect(f.x).toBeLessThan(768); expect(f.y).toBeLessThan(640); }
  });
  it('skins the mine grid and keeps clutter off every interaction, rail and lantern cell', () => {
    expect(mapArt(mineMap)).toBe('mine');
    const m = mineMap.mine!;
    const busy = [...m.workers, ...m.crystals, ...m.beam.crystals, m.cart.start, m.cart.wall, m.beam.door, ...(mineMap.lanterns ?? []),
      ...m.cart.switches.flatMap(sw => [sw.at, sw.lever, sw.sidingEnd])];
    let props = 0;
    for (let y = 0; y < mineMap.rows.length; y++) for (let x = 0; x < mineMap.rows[0]!.length; x++) {
      const prop = decorAt(mineMap, { x, y }); if (!prop) continue; props++;
      expect(mineDecor[prop.name]).toBeDefined();
      expect(busy.some(q => q.x === x && q.y === y)).toBe(false);
      expect(x === m.cart.start.x && y >= m.cart.wall.y && y <= m.cart.start.y).toBe(false);
    }
    expect(props).toBeGreaterThan(0);
  });
  it('ships the mine floor and rail atlases losslessly with revisions that match the files and the CSS', () => {
    const css = ['src/ui/world.css', 'src/ui/game-feel.css'].map(f => readFileSync(f, 'utf8')).join('\n');
    for (const kind of ['tiles', 'rails'] as const) {
      const file = readFileSync(`public/assets/world/mine_${kind}.webp`);
      expect(file.toString('ascii', 12, 16)).toBe('VP8L');
      expect(createHash('sha256').update(file).digest('hex').slice(0, 8)).toBe(MINE_REV[kind]);
      expect(mineArtUrl(kind)).toContain(`?v=${MINE_REV[kind]}`);
      const urls = [...css.matchAll(new RegExp(`/assets/world/mine_${kind}\\.webp\\?v=(\\w+)`, 'g'))];
      expect(urls.length).toBeGreaterThan(0);
      for (const m of urls) expect(m[1]).toBe(MINE_REV[kind]);
    }
    expect(Object.keys(mineTiles)).toHaveLength(15); expect(Object.keys(mineRails)).toHaveLength(6);
  });
  it('draws every mine cell from the mine atlas: zone floors, the three wall faces and yard ground under the camps', () => {
    const seen = new Set<string>();
    for (let y = 0; y < mineMap.rows.length; y++) for (let x = 0; x < mineMap.rows[0]!.length; x++) {
      const name = floorFrame(mineMap, { x, y }); seen.add(name.replace(/_\d$/, ''));
      expect(tileFrame(mineMap, name)).toBeDefined();
    }
    expect([...seen].sort()).toEqual(['cavern', 'mine_wall_face', 'mine_wall_inner', 'mine_wall_top', 'tunnel', 'yard']);
  });
  it('lays the rail from the cart to the cracked wall with a junction, siding and buffer stop at each switch', () => {
    const m = mineMap.mine!.cart;
    for (let y = m.wall.y; y <= m.start.y; y++) expect(railAt(mineMap, { x: m.start.x, y })).toMatch(/^rail_(ns|junction_[ew])$/);
    for (const sw of m.switches) {
      const east = sw.sidingEnd.x > sw.at.x;
      expect(railAt(mineMap, sw.at)).toBe(east ? 'rail_junction_e' : 'rail_junction_w');
      expect(railAt(mineMap, sw.sidingEnd)).toBe(east ? 'rail_end_stop' : 'rail_end_stop_w');
      expect(railAt(mineMap, { x: (sw.at.x + sw.sidingEnd.x) / 2, y: sw.at.y })).toBe('rail_ew');
      expect(railAt(mineMap, sw.lever)).toBeUndefined();
    }
    expect(railAt(mineMap, mineMap.mine!.workers[0]!)).toBeUndefined();
  });
  it('fights in the mine in front of the crystal cavern painting', () => {
    expect(battleSceneOf('crystal-mine')).toBe('mine'); expect(battleBackdropUrl('mine')).toMatch(/battle_mine\.webp$/);
  });
});
