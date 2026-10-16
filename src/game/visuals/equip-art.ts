import type { Item, PotionId, SetId } from '../../core/world/types';
import gearFrames from './equip/gear_items.json';
import potionFrames from './equip/potion_items.json';
import emblemFrames from './equip/set_emblems.json';

// Painted equipment, potion and set-emblem atlases (ART-UI-EQUIP-001): 128 px cells, centred items, no rarity in the art.
// Rarity borders and the set emblem's placement are drawn by the UI.
interface Frame { x: number; y: number; w: number; h: number }
const CELL = 128;
export const equipArtUrl = (name: 'gear_items' | 'potion_items' | 'set_emblems'): string => `${import.meta.env.BASE_URL}assets/ui/equip/${name}.webp`;
const cell = (f: Frame | undefined) => f && { col: f.x / CELL, row: f.y / CELL };
// A class weapon shows its class's weapon; other slots (and a weapon without a class) show the slot piece.
export function gearCell(item: Pick<Item, 'slot' | 'hero'>): { col: number; row: number } | undefined {
  const frames = gearFrames as Record<string, Frame>;
  return cell(item.slot === 'weapon' ? (item.hero ? frames[`weapon_${item.hero}`] : undefined) : frames[`gear_${item.slot}`]);
}
export const potionCell = (id: PotionId | 'dust' | 'gold') => cell((potionFrames as Record<string, Frame>)[id === 'dust' || id === 'gold' ? `item_${id}` : `potion_${id}`])!;
export const emblemCell = (set: SetId) => cell((emblemFrames as Record<string, Frame>)[`set_${set}`])!;
