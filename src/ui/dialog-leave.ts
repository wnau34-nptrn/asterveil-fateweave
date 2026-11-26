// UX audit S4 (docs/UX_GAMEFEEL_AUDIT.md P1-3): a closing world dialog leaves a short fade instead of vanishing.
// The real dialog closes, fires `close` and returns focus at once; an inert copy without ids (taps pass
// through it) fades out where the dialog stood and removes itself. Its layout rules hang on `[open]`, so the
// copy keeps that attribute as a non-modal dialog. Reduced motion, or a browser without `beforetoggle` on
// dialogs, simply closes as before.
const LEAVE_MS = 400;
export function leaveCopy(el: HTMLElement, className: string, host: HTMLElement | null = el.parentElement): void {
  if (!host || el.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
  const copy = el.cloneNode(true) as HTMLElement;
  for (const e of [copy, ...copy.querySelectorAll<HTMLElement>('[id]')]) e.removeAttribute('id');
  for (const a of ['role', 'aria-labelledby', 'aria-describedby', 'aria-modal']) copy.removeAttribute(a);
  copy.inert = true; copy.setAttribute('aria-hidden', 'true'); copy.classList.add(className);
  Object.assign(copy.style, { position: 'fixed', left: '0px', top: '0px', right: 'auto', bottom: 'auto', margin: '0', width: `${r.width}px`, height: `${r.height}px`, maxHeight: 'none', zIndex: '60' });
  host.append(copy);
  const o = copy.getBoundingClientRect();   // the copy's containing block may be the game frame, not the viewport
  copy.style.left = `${r.left - o.left}px`; copy.style.top = `${r.top - o.top}px`;
  const scrolls = [...el.querySelectorAll<HTMLElement>('*')].filter(e => e.scrollTop).map(e => [e, e.scrollTop] as const);
  for (const [e, top] of scrolls) { const path: number[] = []; let n: Element = e; while (n !== el && n.parentElement) { path.unshift([...n.parentElement.children].indexOf(n)); n = n.parentElement; } let c: Element | undefined = copy; for (const i of path) c = c?.children[i]; if (c) c.scrollTop = top; }
  const done = () => copy.remove(); copy.addEventListener('animationend', done, { once: true }); setTimeout(done, LEAVE_MS);
}
export function installDialogLeave(doc: Document): void {
  doc.addEventListener('beforetoggle', e => {
    const d = e.target; if (!(d instanceof HTMLDialogElement) || !d.classList.contains('world-dialog') || (e as ToggleEvent).newState !== 'closed') return;
    leaveCopy(d, 'dialog-leaving');
  }, true);
}
