import type { Item, PotionId, SetId } from '../core/world/types';
import { emblemCell, equipArtUrl, gearCell, potionCell } from '../game/visuals/equip-art';
import { icon } from './icons';
import { slotIcon } from './th';

// Painted item art (ART-UI-EQUIP-001) as decorative spans; names and numbers stay in the DOM text beside them.
// The atlas cell is chosen by percent so the same markup works at any CSS size.
const at = (col: number, row: number, cols: number, rows: number) => `--ax:${cols > 1 ? col / (cols - 1) * 100 : 0}%;--ay:${rows > 1 ? row / (rows - 1) * 100 : 0}%`;
export function setEmblem(set: SetId): string {
  const c = emblemCell(set);
  return `<i class="set-emblem" style="--atlas:url(${equipArtUrl('set_emblems')});${at(c.col, 0, 6, 1)}"></i>`;
}
// The piece with a rarity frame (data-rarity) and its set emblem in the corner.
export function gearArt(item: Item): string {
  const c = gearCell(item);
  const art = c ? `<i class="equip-sprite" style="--atlas:url(${equipArtUrl('gear_items')});--cols:5;--rows:3;${at(c.col, c.row, 5, 3)}"></i>` : icon(slotIcon[item.slot]);
  return `<span class="gear-art" data-rarity="${item.rarity}" aria-hidden="true">${art}${item.set ? setEmblem(item.set) : ''}</span>`;
}
export function potionArt(id: PotionId | 'dust' | 'gold'): string {
  const c = potionCell(id);
  return `<span class="potion-art" aria-hidden="true"><i class="equip-sprite" style="--atlas:url(${equipArtUrl('potion_items')});--cols:5;--rows:1;${at(c.col, 0, 5, 1)}"></i></span>`;
}
