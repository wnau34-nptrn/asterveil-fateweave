import { afterEach, describe, expect, it, vi } from 'vitest';
import { SCREEN_IMAGE_CAP_MS, imageCache, prefetchImagesIdle, whenImagesReady } from '../src/ui/image-ready';
import { battleBackdropUrl, battleSceneOf, campImages, worldImages } from '../src/ui/screen-images';
import { worldArtUrl } from '../src/game/visuals/world-art';

// Image-blank fix 2026-11-21 (B1/B2): the screen-switch wait is presentation only — capped, never throws, a broken
// file never holds a screen.
afterEach(() => { vi.useRealTimers(); });

describe('whenImagesReady', () => {
  it('resolves ready once every image has loaded', async () => {
    const loads: string[] = [];
    const cache = imageCache(url => { loads.push(url); return Promise.resolve(); });
    await expect(whenImagesReady(['a.webp', 'b.webp'], 1000, cache)).resolves.toBe('ready');
    expect(loads).toEqual(['a.webp', 'b.webp']);
    expect(cache.ready(['a.webp', 'b.webp'])).toBe(true);
  });
  it('stops waiting at the cap when a file never arrives', async () => {
    vi.useFakeTimers();
    const cache = imageCache(() => new Promise(() => {}));
    const result = whenImagesReady(['slow.webp'], 1500, cache);
    let settled: string | undefined; void result.then(r => { settled = r; });
    await vi.advanceTimersByTimeAsync(1499); expect(settled).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1); expect(settled).toBe('timeout');
  });
  it('treats a broken file or a throwing loader as finished, without throwing', async () => {
    const cache = imageCache(url => { if (url === 'throws.webp') throw new Error('boom'); return Promise.reject(new Error('404')); });
    await expect(whenImagesReady(['broken.webp', 'throws.webp'], 1000, cache)).resolves.toBe('ready');
    expect(cache.ready(['broken.webp', 'throws.webp'])).toBe(true);
  });
  it('loads each url once and answers at once when everything is already there', async () => {
    let n = 0; const cache = imageCache(() => { n++; return Promise.resolve(); });
    await whenImagesReady(['a.webp'], 1000, cache); await whenImagesReady(['a.webp', 'a.webp'], 1000, cache);
    expect(n).toBe(1);
    await expect(whenImagesReady([], 0, cache)).resolves.toBe('ready');
  });
  it('keeps the draft cap within the agreed 1.5–2 s', () => { expect(SCREEN_IMAGE_CAP_MS).toBeGreaterThanOrEqual(1500); expect(SCREEN_IMAGE_CAP_MS).toBeLessThanOrEqual(2000); });
});

describe('prefetchImagesIdle', () => {
  it('fetches at low priority after the current work and skips what is loaded', async () => {
    vi.useFakeTimers();
    const calls: [string, string][] = []; const cache = imageCache((url, priority) => { calls.push([url, priority]); return Promise.resolve(); });
    prefetchImagesIdle(['x.webp', 'y.webp'], cache);
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(250);
    expect(calls).toEqual([['x.webp', 'low'], ['y.webp', 'low']]);
    prefetchImagesIdle(['x.webp'], cache); await vi.advanceTimersByTimeAsync(250);
    expect(calls.length).toBe(2);
  });
});

describe('screen image lists', () => {
  it('names the camp backdrop, NPCs and the main team pose sheets', () => {
    const { main } = campImages({ party: { deployed: ['guardian', 'garran'], reserve: [] } as never, company: ['guardian', 'garran'] });
    expect(main).toContain('/assets/lobby/lobby_bg.webp');
    expect(main).toContain('/assets/lobby/npc/npc_smith.webp');
    expect(main).toContain('/assets/lobby/lobby_poses_heroes.webp');
    expect(main).toContain('/assets/lobby/lobby_poses_mercs.webp');
    expect(new Set(main).size).toBe(main.length);
  });
  it('names the map tiles and the battle painting of each map', () => {
    expect(worldImages().main).toEqual(expect.arrayContaining([worldArtUrl('tileset'), worldArtUrl('decor'), '/assets/world/fog_tile.webp']));
    expect(battleBackdropUrl(battleSceneOf('deep-forest'))).toBe('/assets/art/battle_forest.webp');
    expect(battleBackdropUrl(battleSceneOf('veil-frontier'))).toBe('/assets/art/battle_riftline.webp');
    expect(battleBackdropUrl('ruins')).toBe('/assets/art/ruins.webp');
  });
});
