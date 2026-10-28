import type { Item, PotionId, SetId } from '../../core/world/types';
import gearFrames from './equip/gear_items.json';
import potionFrames from './equip/potion_items.json';
import emblemFrames from './equip/set_emblems.json';

// Painted equipment (ART-UI-EQUIP-002), potions and emblems: 128 px cells, centred items, no rarity in the art.
// Rarity borders and the set emblem's placement are drawn by the UI.
interface Frame { x: number; y: number; w: number; h: number }
const CELL = 128;
const dimensions = (frames: Record<string, Frame>) => ({
  cols: Math.max(...Object.values(frames).map(f => f.x + f.w)) / CELL,
  rows: Math.max(...Object.values(frames).map(f => f.y + f.h)) / CELL,
});
export const equipAtlasSize = {
  gear_items: dimensions(gearFrames), potion_items: dimensions(potionFrames), set_emblems: dimensions(emblemFrames),
};
export const equipArtUrl = (name: 'gear_items' | 'potion_items' | 'set_emblems'): string => `${import.meta.env.BASE_URL}assets/ui/equip/${name}.webp`;
const cell = (f: Frame | undefined) => f && { col: f.x / CELL, row: f.y / CELL };
// Saved rarity is zero-based (0 common … 4 legendary): 0–1 worn, 2 fine, 3–4 masterwork.
export function gearCell(item: Pick<Item, 'slot' | 'hero' | 'rarity' | 'set' | 'boss'>): { col: number; row: number } | undefined {
  const frames = gearFrames as Record<string, Frame>;
  const tier = item.rarity < 2 ? 1 : item.rarity === 2 ? 2 : 3;
  const legacy = item.slot === 'weapon' ? (item.hero ? `weapon_${item.hero}` : 'gear_weapon') : `gear_${item.slot}`;
  const name = item.boss ? `boss_${item.boss}`
    : item.slot === 'weapon' ? (item.hero ? `weapon_${item.hero}_${tier}` : legacy)
    : item.set ? `gear_${item.slot}_set_${item.set}`
    : `gear_${item.slot}_${(['worn', 'fine', 'master'] as const)[tier - 1]}`;
  return cell(frames[name] ?? frames[legacy]);
}
export const potionCell = (id: PotionId | 'dust' | 'gold') => cell((potionFrames as Record<string, Frame>)[id === 'dust' || id === 'gold' ? `item_${id}` : `potion_${id}`])!;
export const emblemCell = (set: SetId) => cell((emblemFrames as Record<string, Frame>)[`set_${set}`])!;
