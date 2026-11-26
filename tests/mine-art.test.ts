import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mineMap } from '../src/content/world/chapter-mine';
import { MINE_REV, decorAt, mapArt, mineDecor, mineDecorUrl } from '../src/game/visuals/world-art';

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
});
