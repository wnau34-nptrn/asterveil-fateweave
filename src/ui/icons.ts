import type { ActionId } from '../core/battle/types';
const paths: Record<ActionId | 'restart', string> = {
  attack: '<path d="m5 19 3-3m-2-2 4 4M8 14l9-10 3 0 0 3-10 9M4 7l4 4m8 5 4 4m-4-1 3-3"/>',
  guard: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="M12 7v9m-4-5h8"/>',
  bash: '<path d="M11 4 4 7v5c0 4 7 8 7 8s6-3 6-7V7Z"/><path d="m18 3 2 2m0 4h3m-4 4 2 2"/>',
  mark: '<path d="m12 3 6 9-6 9-6-9Z"/><path d="M3 9v6m18-6v6M9 12h6"/>',
  execute: '<path d="m5 19 13-14 2 1-1 2-12 13M3 13l8 8M4 4h5m-2 3 4 0"/>',
  bolt: '<path d="m13 3-7 10h6l-1 8 8-12h-6Z"/><path d="M3 4v3m-1-1h3M20 17v4m-2-2h4"/>',
  ward: '<path d="m12 3 8 5v8l-8 5-8-5V8Z"/><path d="m12 7 4 5-4 5-4-5Z"/>',
  heal: '<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5Z"/>',
  prayer: '<path d="M12 3v8m-4-4h8M5 13v7m-3-4h6m11-3v7m-3-4h6"/><path d="M9 18h6"/>',
  restart: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
};
export function icon(name: ActionId | 'restart'): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
