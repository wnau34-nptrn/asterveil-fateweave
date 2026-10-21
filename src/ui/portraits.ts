import { actorArt, portraitsUrl, sheetRows } from '../game/visuals/assets';
import { icon } from './icons';

// Star rank as individual badges; the count stays readable text for assistive tech.
export function starRow(n: number, max: number): string {
  return `<span class="star-row" role="img" aria-label="${n} ดาว">${icon('starBadge').repeat(n)}${icon('starBadgeEmpty').replace('class="icon"', 'class="icon empty"').repeat(max - n)}</span>`;
}
export function portrait(id: string): string {
  const { sheet, frame } = actorArt[id]!; const rows = sheetRows[sheet];
  return `<span class="portrait" data-actor="${id}" style="--portrait-x:${frame % 2};--portrait-y:${Math.floor(frame / 2)};--portrait-rows:${rows}" aria-hidden="true"><img src="${portraitsUrl(sheet)}" alt="" width="1024" height="${rows * 512}" draggable="false"></span>`;
}
