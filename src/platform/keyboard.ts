// Shared guard for game shortcuts. Native editing, browser shortcuts and modal orientation
// guidance must never trigger a move or a command in the game behind them.
export function shortcutBlocked(event: KeyboardEvent, allowRepeat = false): boolean {
  return event.defaultPrevented || event.isComposing || (!allowRepeat && event.repeat) || event.altKey || event.ctrlKey || event.metaKey || document.hidden ||
    document.documentElement.dataset.orientationBlocked === 'true' ||
    event.target instanceof Element && !!event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}

export function gameBounds(): DOMRect {
  return document.querySelector<HTMLElement>('#app')!.getBoundingClientRect();
}
