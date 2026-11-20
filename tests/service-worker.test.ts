import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { registerAssetCache } from '../src/platform/service-worker-register';

// Perf audit R8: the asset-cache service worker registers only in production, never under automation unless asked,
// and `?sw=off` removes it with its cache.
function fakeNav(webdriver = false) {
  const unregister = vi.fn(async () => true);
  const nav = { webdriver, serviceWorker: { register: vi.fn(async () => ({})), getRegistrations: vi.fn(async () => [{ unregister }]) } };
  return { nav: nav as unknown as Navigator, register: nav.serviceWorker.register, unregister };
}
const doc = { readyState: 'complete' } as Document;
const run = (search: string, prod = true, webdriver = false) => {
  const f = fakeNav(webdriver), cacheStore = { delete: vi.fn(async () => true) } as unknown as CacheStorage;
  registerAssetCache({ base: '/asterveil-fateweave/', prod, search, nav: f.nav, cacheStore, doc, win: { addEventListener: vi.fn() } });
  return { ...f, cacheStore };
};
describe('asset-cache service worker (R8)', () => {
  it('registers sw.js at the base scope in production', () => {
    const { register } = run('');
    expect(register).toHaveBeenCalledWith('/asterveil-fateweave/sw.js', { scope: '/asterveil-fateweave/' });
  });
  it('stays off in dev and under automation unless ?sw=1', () => {
    expect(run('', false).register).not.toHaveBeenCalled();
    expect(run('', true, true).register).not.toHaveBeenCalled();
    expect(run('?sw=1', true, true).register).toHaveBeenCalled();
  });
  it('?sw=off unregisters and empties the cache', async () => {
    const r = run('?sw=off'); await Promise.resolve(); await Promise.resolve();
    expect(r.register).not.toHaveBeenCalled(); expect(r.unregister).toHaveBeenCalled();
    expect((r.cacheStore.delete as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('fateweave-assets-v1');
  });
  it('the worker never handles pages, version.json, the API or ranged (music) requests', () => {
    const src = readFileSync('src/platform/service-worker.js', 'utf8');
    expect(src).toContain("request.method !== 'GET' || request.headers.has('range')");
    expect(src).toContain('if (!hash) return;');
    expect(readFileSync('vite.config.ts', 'utf8')).toContain("if (name !== 'music') walk(path)");
  });
});
