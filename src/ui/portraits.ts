import { actorArt, artCellSize, portraitsHalfUrl, portraitsUrl, sheetRows, unitsUrl } from '../game/visuals/assets';
import { icon } from './icons';
import { starSocketUrl } from '../game/visuals/tome-art';
import type { HeroDefinition } from '../core/battle/types';

// Star rank as individual badges; the count stays readable text for assistive tech.
export function starRow(n: number, max: number, sockets = false): string {
  // Fate sockets (ART-UI-PROGRESS-001) for the star-upgrade page; the compact badges stay everywhere else.
  if (sockets) return `<span class="star-row star-sockets" role="img" aria-label="${n} ดาว">${Array.from({ length: max }, (_, i) => `<i class="fate-socket" data-lit="${i < n}" style="background-image:url(${starSocketUrl(i < n)})"></i>`).join('')}</span>`;
  return `<span class="star-row" role="img" aria-label="${n} ดาว">${icon('starBadge').repeat(n)}${icon('starBadgeEmpty').replace('class="icon"', 'class="icon empty"').repeat(max - n)}</span>`;
}
// The full-body illustration from the unit atlas (ART-UI-MODERN-001 character sheet), decorative.
export function heroArt(id: string): string {
  const { sheet, frame } = actorArt[id]!; const rows = sheetRows[sheet], cell = artCellSize(sheet);
  return `<span class="hero-art" data-actor="${id}" style="--art-x:${frame % 2};--art-y:${Math.floor(frame / 2)};--art-rows:${rows}" aria-hidden="true"><img src="${unitsUrl(sheet)}" alt="" width="${cell * 2}" height="${rows * cell}" draggable="false"></span>`;
}
// `large`: the 512 px master (the story scene's big figure); otherwise the half-size atlas (perf audit R10), same grid.
export function portrait(id: string, large = false): string {
  const { sheet, frame } = actorArt[id]!; const rows = sheetRows[sheet], half = large ? undefined : portraitsHalfUrl(sheet);
  const cell = artCellSize(sheet) / (half ? 2 : 1);
  return `<span class="portrait" data-actor="${id}" style="--portrait-x:${frame % 2};--portrait-y:${Math.floor(frame / 2)};--portrait-rows:${rows}" aria-hidden="true"><img src="${half ?? portraitsUrl(sheet)}" alt="" width="${cell * 2}" height="${rows * cell}" draggable="false"></span>`;
}

// Owner 2026-11-26 (UX audit §9: “ภาพตัวละครใช้แบบตัวเต็มทุกแท็บ ใช้สีประจำคลาส”): the character page shows the
// full-body figure on every tab, lit in its class colour. The class colour is the battle colour of the class's
// active character, so a parked second character of a class (OD-14) shares it.
export function classTone(h: Pick<HeroDefinition, 'role' | 'color'>, heroes: readonly Pick<HeroDefinition, 'id' | 'role' | 'color'>[], parked: readonly string[] = []): string {
  const lead = heroes.find(v => v.role === h.role && !parked.includes(v.id)) ?? h;
  return `#${lead.color.toString(16).padStart(6, '0')}`;
}
export function heroStage(id: string, extra = ''): string {
  return `<div class="hero-stage" aria-hidden="true">${heroArt(id)}</div>${extra}`;
}
