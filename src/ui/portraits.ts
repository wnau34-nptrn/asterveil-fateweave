import { actorArt, portraitsUrl, sheetRows, unitsUrl } from '../game/visuals/assets';
import { icon } from './icons';
import { starSocketUrl } from '../game/visuals/tome-art';

// Star rank as individual badges; the count stays readable text for assistive tech.
export function starRow(n: number, max: number, sockets = false): string {
  // Fate sockets (ART-UI-PROGRESS-001) for the star-upgrade page; the compact badges stay everywhere else.
  if (sockets) return `<span class="star-row star-sockets" role="img" aria-label="${n} ดาว">${Array.from({ length: max }, (_, i) => `<i class="fate-socket" data-lit="${i < n}" style="background-image:url(${starSocketUrl(i < n)})"></i>`).join('')}</span>`;
  return `<span class="star-row" role="img" aria-label="${n} ดาว">${icon('starBadge').repeat(n)}${icon('starBadgeEmpty').replace('class="icon"', 'class="icon empty"').repeat(max - n)}</span>`;
}
// The full-body illustration from the unit atlas (ART-UI-MODERN-001 character sheet), decorative.
export function heroArt(id: string): string {
  const { sheet, frame } = actorArt[id]!; const rows = sheetRows[sheet];
  return `<span class="hero-art" data-actor="${id}" style="--art-x:${frame % 2};--art-y:${Math.floor(frame / 2)};--art-rows:${rows}" aria-hidden="true"><img src="${unitsUrl(sheet)}" alt="" width="1024" height="${rows * 512}" draggable="false"></span>`;
}
export function portrait(id: string): string {
  const { sheet, frame } = actorArt[id]!; const rows = sheetRows[sheet];
  return `<span class="portrait" data-actor="${id}" style="--portrait-x:${frame % 2};--portrait-y:${Math.floor(frame / 2)};--portrait-rows:${rows}" aria-hidden="true"><img src="${portraitsUrl(sheet)}" alt="" width="1024" height="${rows * 512}" draggable="false"></span>`;
}
