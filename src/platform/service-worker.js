// Perf audit R8 (2026-11-20): keep the game's artwork on the device between visits. GitHub Pages serves every file with a
// 10-minute cache and no content hash in most asset names, so a returning player revalidated or re-downloaded ~70
// images and atlases. The build (vite.config.ts, `fateweave-service-worker`) prepends `BUILD` and `MANIFEST` — every file
// under `assets/` (music excluded) with its SHA-256 prefix — and writes this file as `sw.js` next to index.html.
// Cache-first by path + hash: a file whose hash is unchanged since the visit that stored it comes from the cache; a
// changed or new file comes from the network and replaces the old copy. index.html, version.json, sw.js, the API, music
// and anything not in the manifest are never touched (straight to the network), so updates and server play work as before.
/* global self, caches, fetch, URL, BUILD, MANIFEST */
const CACHE = 'fateweave-assets-v1';
const scope = new URL(self.registration.scope);
const keyFor = (rel, hash) => `${scope.href}${rel}?fw=${hash}`;

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Drop copies of files that changed or left the build.
    const cache = await caches.open(CACHE);
    for (const request of await cache.keys()) {
      const url = new URL(request.url); const rel = url.pathname.slice(scope.pathname.length);
      if (MANIFEST[rel] !== url.searchParams.get('fw')) await cache.delete(request);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const rel = url.pathname.slice(scope.pathname.length), hash = MANIFEST[rel];
  if (!hash) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), key = keyFor(rel, hash);
    const hit = await cache.match(key);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.status === 200 && response.type === 'basic') await cache.put(key, response.clone()).catch(() => undefined);
    return response;
  })());
});
self.addEventListener('message', event => { if (event.data === 'fateweave-build') event.source?.postMessage({ build: BUILD }); });
