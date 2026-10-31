import type { Item, PotionId, SetId } from '../core/world/types';
import { emblemCell, equipArtUrl, equipAtlasSize, gearCell, potionCell } from '../game/visuals/equip-art';
import { icon } from './icons';
import { slotIcon } from './th';

// Painted item art (ART-UI-EQUIP-001) as decorative spans; names and numbers stay in the DOM text beside them.
// The atlas cell is chosen by percent so the same markup works at any CSS size.
const at = (col: number, row: number, cols: number, rows: number) => `--ax:${cols > 1 ? col / (cols - 1) * 100 : 0}%;--ay:${rows > 1 ? row / (rows - 1) * 100 : 0}%`;
export function setEmblem(set: SetId): string {
  const c = emblemCell(set);
  const { cols, rows } = equipAtlasSize.set_emblems;
  return `<i class="set-emblem" style="--atlas:url(${equipArtUrl('set_emblems')});${at(c.col, c.row, cols, rows)}"></i>`;
}
// The piece with a rarity frame (data-rarity) and its set emblem in the corner.
export function gearArt(item: Item): string {
  const c = gearCell(item);
  const { cols, rows } = equipAtlasSize.gear_items;
  const art = c ? `<i class="equip-sprite" style="--atlas:url(${equipArtUrl('gear_items')});--cols:${cols};--rows:${rows};${at(c.col, c.row, cols, rows)}"></i>` : icon(slotIcon[item.slot]);
  return `<span class="gear-art" data-rarity="${item.rarity}" aria-hidden="true">${art}${item.set ? setEmblem(item.set) : ''}${item.boss?'<i class="boss-gear-marker">◆</i>':''}</span>`;
}
// The calming draught (P02) has no painted frame yet: its line icon stands in until Codex paints one.
export const PAINTED_POTIONS = ['salve', 'tonic', 'repel'] as const;
export function potionArt(id: PotionId | 'dust' | 'gold'): string {
  if (id === 'calm') return `<span class="potion-art potion-art-icon" aria-hidden="true">${icon('potionCalm')}</span>`;
  const c = potionCell(id);
  const { cols, rows } = equipAtlasSize.potion_items;
  return `<span class="potion-art" aria-hidden="true"><i class="equip-sprite" style="--atlas:url(${equipArtUrl('potion_items')});--cols:${cols};--rows:${rows};${at(c.col, c.row, cols, rows)}"></i></span>`;
}
