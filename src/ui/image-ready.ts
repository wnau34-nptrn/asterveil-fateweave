// Image-blank fix 2026-11-21 (owner: “อยากให้เข้าไปแล้วเห็นภาพแสดงเลย”, B1/B2): screens wait for their main artwork
// before they switch, and the next screen's artwork is fetched while the player is still on the current one.
// Presentation only: nothing here touches rules, saves or state; a broken or slow file never blocks a screen for longer
// than the cap and never throws.

/** Longest a screen switch waits for its main images (draft, owner to confirm). Past it the screen switches anyway. */
export const SCREEN_IMAGE_CAP_MS = 1800;

export type ImageLoad = (url: string, priority: 'high' | 'low') => Promise<unknown>;

// Fetch + decode through an Image element; settles (never rejects to the caller) on load, decode, error or abort.
const browserLoad: ImageLoad = (url, priority) => new Promise<void>(resolve => {
  if (typeof Image === 'undefined') { resolve(); return; }
  const img = new Image();
  img.decoding = 'async';
  (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
  img.src = url;
  kept.push(img); // keep the decoded image referenced so the browser does not drop it before the screen paints it
  const done = () => resolve();
  if (typeof img.decode === 'function') img.decode().then(done, () => { if (img.complete) done(); else { img.onload = done; img.onerror = done; } });
  else { img.onload = done; img.onerror = done; }
});
const kept: HTMLImageElement[] = [];

export interface ImageCache {
  /** Starts (or joins) loading each url; resolves when all have loaded or failed. */
  load(urls: readonly string[], priority?: 'high' | 'low'): Promise<void>;
  /** Every url has finished (loaded or failed). */
  ready(urls: readonly string[]): boolean;
}

export function imageCache(load: ImageLoad = browserLoad): ImageCache {
  const pending = new Map<string, Promise<void>>(); const settled = new Set<string>();
  const one = (url: string, priority: 'high' | 'low'): Promise<void> => {
    let p = pending.get(url);
    if (!p) {
      let started: Promise<unknown>;
      try { started = load(url, priority); } catch { started = Promise.resolve(); }
      p = Promise.resolve(started).then(() => undefined, () => undefined).then(() => { settled.add(url); });
      pending.set(url, p);
    }
    return p;
  };
  return {
    load: (urls, priority = 'high') => Promise.all(urls.map(u => one(u, priority))).then(() => undefined),
    ready: urls => urls.every(u => settled.has(u)),
  };
}

/** Waits until every url is loaded and decoded (or failed), or `capMs` has passed; never rejects. */
export function whenImagesReady(urls: readonly string[], capMs: number = SCREEN_IMAGE_CAP_MS, cache: ImageCache = shared): Promise<'ready' | 'timeout'> {
  if (!urls.length || cache.ready(urls)) return Promise.resolve('ready');
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve('timeout'), Math.max(0, capMs));
    void cache.load(urls, 'high').then(() => { clearTimeout(timer); resolve('ready'); });
  });
}

/** Fetches the next screen's images when the page is idle, at low priority (after what is on screen now). */
export function prefetchImagesIdle(urls: readonly string[], cache: ImageCache = shared): void {
  const todo = urls.filter(u => !cache.ready([u])); if (!todo.length) return;
  const run = () => { void cache.load(todo, 'low'); };
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(run, { timeout: 1500 }); else setTimeout(run, 200);
}

export const imagesReady = (urls: readonly string[]): boolean => shared.ready(urls);
const shared = imageCache();
