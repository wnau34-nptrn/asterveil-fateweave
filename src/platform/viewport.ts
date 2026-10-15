// Fit the app to the area the browser actually shows.
//
// iOS 26 Safari (floating Liquid Glass toolbar) can draw the page edge to edge while
// 100dvh resolves shorter than that area, leaving an empty band at the bottom, and can
// report a zero top safe-area inset while the page sits under the status bar, which
// hides the top HUD. The live layout viewport (innerHeight) is sized instead, the document
// is kept unscrolled, and a status-bar fallback is applied only when the page is clearly
// taller than a phone's area below the status bar while reporting no inset.
// `?vp` in the URL shows the measured values for checking on a real device.

const ios = (): boolean => /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function fitViewport(root: HTMLElement = document.documentElement): void {
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
  document.body.append(probe);
  const debug = new URLSearchParams(location.search).has('vp') ? document.body.appendChild(document.createElement('pre')) : undefined;
  if (debug) debug.style.cssText = 'position:fixed;z-index:9999;left:50%;top:40%;transform:translateX(-50%);margin:0;padding:8px 10px;font:12px/1.35 monospace;color:#fff;background:#000c;border-radius:8px;pointer-events:none';

  const apply = (): void => {
    const height = window.innerHeight;
    root.style.setProperty('--app-h', `${height}px`);
    const envTop = probe.offsetHeight;
    const portrait = window.innerHeight > window.innerWidth;
    const underStatusBar = ios() && portrait && envTop === 0 && screen.height >= 812 && height > screen.height - 120;
    root.style.setProperty('--safe-top-fallback', underStatusBar ? '50px' : '0px');
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    if (debug) {
      const vv = window.visualViewport;
      debug.textContent = [
        `inner ${window.innerWidth}×${window.innerHeight}`, `screen ${screen.width}×${screen.height}`,
        `client ${root.clientWidth}×${root.clientHeight}`, `visual ${vv ? `${Math.round(vv.width)}×${Math.round(vv.height)} @${Math.round(vv.offsetTop)}` : '-'}`,
        `env top ${envTop}`, `fallback ${underStatusBar ? 50 : 0}`, `dpr ${window.devicePixelRatio}`,
        `standalone ${matchMedia('(display-mode: standalone)').matches}`,
      ].join('\n');
    }
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => { apply(); setTimeout(apply, 350); });
  window.addEventListener('pageshow', apply);
  window.visualViewport?.addEventListener('resize', apply);
  // Safari settles its toolbar after load; re-measure once it has.
  setTimeout(apply, 500);
}
