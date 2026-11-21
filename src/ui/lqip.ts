// B4 (2026-11-21): a blurred ~32 px copy of a big scene painting shows at once while the real file is still loading,
// then cross-fades away once the real image is decoded (reduced motion: removed without a fade). Presentation only.
// The CSS side (`.lqip-on::after/::before`, game-feel.css) paints `var(--lqip)` over the host's own background.
import { imagesReady } from './image-ready';
import { LQIP } from './lqip.generated';

const FADE_MS = 400;
// Watches the file with its own Image so the screens' shared load cache (and their wait/cap timing) is left alone;
// the browser shares the one network request with the CSS background that really paints it.
const watch = (url: string): Promise<void> => new Promise(resolve => {
  const img = new Image(); img.src = url;
  if (typeof img.decode === 'function') img.decode().then(() => resolve(), () => { if (img.complete) resolve(); else { img.onload = () => resolve(); img.onerror = () => resolve(); } });
  else { img.onload = () => resolve(); img.onerror = () => resolve(); }
});

/** Data URI for a painting's placeholder (`url` = the served URL, with or without BASE_URL / `?v=`), if there is one. */
export function lqipFor(url: string): string | undefined {
  const path = url.split('?')[0]!; const i = path.indexOf('assets/');
  return i < 0 ? undefined : LQIP[path.slice(i)]?.uri;
}

/** Shows the placeholder on `host` until `url` has loaded. Does nothing when it is loaded already or has no placeholder. */
export function trackLqip(host: HTMLElement, url: string): void {
  const uri = lqipFor(url);
  if (!uri || imagesReady([url])) return;
  const token = String(++seq);
  host.style.setProperty('--lqip', `url("${uri}")`);
  host.dataset.lqip = token; host.classList.remove('lqip-done'); host.classList.add('lqip-on');
  void watch(url).then(() => {
    if (host.dataset.lqip !== token) return; // the host moved on to another painting
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    host.classList.add('lqip-done');
    const clear = () => { if (host.dataset.lqip !== token) return; host.classList.remove('lqip-on', 'lqip-done'); host.style.removeProperty('--lqip'); delete host.dataset.lqip; };
    if (reduced) clear(); else setTimeout(clear, FADE_MS + 50);
  });
}
let seq = 0;
