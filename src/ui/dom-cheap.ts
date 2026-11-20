// Perf audit R3/R4 (docs/validation/perf-audit-2026-11-20 on branch claude/perf-audit-2026-11-20): DOM writes that do
// not force a synchronous style/layout pass on every map step.

/**
 * Play a one-shot CSS animation class again without `void el.offsetWidth` (a forced reflow of the whole document).
 * Not on the element: add it. Still on with its animation running or holding its end state (`fill: both`): rewind
 * that animation in place. Classes whose animation leaves no end state are taken off at `animationend` unless `keep`,
 * so the next play is a plain add. Infinite animations on the same element (idle loops) are never touched.
 */
export function replayClass(el: HTMLElement, cls: string, keep = false): void {
  if (el.classList.contains(cls)) {
    const finite = typeof el.getAnimations === 'function'
      ? el.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity) : undefined;
    if (finite === undefined) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); return; }
    if (finite.length) { for (const a of finite) { a.currentTime = 0; a.play(); } return; }
    el.classList.remove(cls);
  }
  el.classList.add(cls);
  if (keep) return;
  const end = (e: AnimationEvent) => { if (e.target !== el) return; el.removeEventListener('animationend', end); el.classList.remove(cls); };
  el.addEventListener('animationend', end);
}

const written = new WeakMap<Element, string>();
/** `innerHTML` only when the markup differs from what this helper last wrote (skips re-parsing and style invalidation). */
export function setHtml(el: Element, html: string): void {
  if (written.get(el) === html) return;
  el.innerHTML = html; written.set(el, html);
}
