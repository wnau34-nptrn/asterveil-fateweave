import type { Item, PotionId, SetId, TomeLine, TomeSize } from '../core/world/types';
import { TOME_ATLAS, riftCoreUrl, tomeArtUrl, tomeCell } from '../game/visuals/tome-art';
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
// The calming draught (P02) is painted since ART-UI-POTION-CALM-001 R1 (2026-11-04); the line icon stays for compact lists.
export const PAINTED_POTIONS = ['salve', 'tonic', 'repel', 'calm'] as const;
export function potionArt(id: PotionId | 'dust' | 'gold'): string {
  const c = potionCell(id);
  const { cols, rows } = equipAtlasSize.potion_items;
  return `<span class="potion-art" aria-hidden="true"><i class="equip-sprite" style="--atlas:url(${equipArtUrl('potion_items')});--cols:${cols};--rows:${rows};${at(c.col, c.row, cols, rows)}"></i></span>`;
}
// Painted skill tome of a line and size (ART-UI-PROGRESS-001); the Thai name and count stay beside it.
export function tomeArt(line: TomeLine, size: TomeSize): string {
  const c = tomeCell(line, size);
  return `<span class="tome-art" data-line="${line}" data-size="${size}" aria-hidden="true"><i class="equip-sprite" style="--atlas:url(${tomeArtUrl()});--cols:${TOME_ATLAS.cols};--rows:${TOME_ATLAS.rows};${at(c.col, c.row, TOME_ATLAS.cols, TOME_ATLAS.rows)}"></i></span>`;
}
// The rift core (แก่นรอยแยก), painted; the name and count stay DOM text beside it.
export const riftCoreArt = (): string => `<span class="tome-art rift-core-art" aria-hidden="true"><i class="equip-sprite" style="--atlas:url(${riftCoreUrl()});--cols:1;--rows:1;--ax:0%;--ay:0%"></i></span>`;
