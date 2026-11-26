// UX audit P2-1 (docs/UX_GAMEFEEL_AUDIT.md): arriving in the camp shows the scene first, then the HUD settles in
// (top row down, bottom panel and menu up) 100 ms later over 220 ms, so the HUD is fully shown by ~320 ms.
// Presentation only: the controls are live from the first frame (opacity/transform never block input), a redraw
// simply replaces the animated nodes, and reduced motion skips it.
const PARTS: readonly [string, number][] = [['.lobby-top', -8], ['.lobby-boards', -8], ['.lobby-trip', 10], ['.lobby-menu', 10]];
export function revealHud(view: HTMLElement): void {
  if (view.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  PARTS.forEach(([sel, dy], i) => {
    for (const el of view.querySelectorAll<HTMLElement>(sel)) el.animate?.(
      [{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 220, delay: 100 + (i % 2) * 20, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  });
}
