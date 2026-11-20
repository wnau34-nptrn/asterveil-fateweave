// Perf audit R8: register the asset-cache service worker (src/platform/service-worker.js, built as `sw.js`). Production
// builds only, and not under browser automation unless the page asks with `?sw=1`, so tests keep routing their own
// requests. `?sw=off` unregisters it and empties its cache (a way out if a device ever holds a broken copy).
export function registerAssetCache(opts: { base: string; prod: boolean; search: string; nav?: Navigator; cacheStore?: CacheStorage; doc?: Document; win?: Pick<Window, 'addEventListener'> }): void {
  const nav = opts.nav ?? navigator, params = new URLSearchParams(opts.search);
  if (!('serviceWorker' in nav)) return;
  if (params.get('sw') === 'off') {
    void nav.serviceWorker.getRegistrations().then(list => Promise.all(list.map(r => r.unregister())));
    void (opts.cacheStore ?? caches).delete('fateweave-assets-v1');
    return;
  }
  if (!opts.prod || (nav.webdriver && !params.has('sw'))) return;
  const go = () => { void nav.serviceWorker.register(`${opts.base}sw.js`, { scope: opts.base }).catch(() => undefined); };
  if ((opts.doc ?? document).readyState === 'complete') go(); else (opts.win ?? window).addEventListener('load', go, { once: true });
}
