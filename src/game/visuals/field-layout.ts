export interface FieldBox { x: number; y: number; width: number; height: number }
export interface FieldSlot {
  x: number; y: number; size: number; body: FieldBox; panel: FieldBox;
  compact: boolean; tiny: boolean; side: boolean; iconSize: number; maxIcons: number;
}

/** Reserve the whole body + HP/status panel, even when a unit has no effects.
 * Rows cannot move as effects are gained/consumed. Coordinates are arena CSS pixels.
 * Slot order is hero rear 0/1, hero front 0/1, foe front f1/f2, foe back b1/b2 (A7 step 2: four foe slots; the
 * final 8-actor field is A7 step 3). Four equal columns mirror each side, independent of actor identity.
 */
export const FOE_SLOT_INDEX: Readonly<Record<string, number>> = { f1: 4, f2: 5, b1: 6, b2: 7 };
const COLUMNS = [.12, .37, .62, .865] as const;
export function fieldSlots(width: number, height: number): FieldSlot[] {
  const compact = height < 260, tiny = height < 180, side = height < 150;
  const iconSize = side ? 12 : tiny ? 14 : 18;
  const panelHeight = side ? 26 : tiny ? 18 : compact ? 32 : 50;
  const top = compact ? 4 : Math.min(70, height * .13), gap = compact ? 4 : 16;
  const rowHeight = (height - top - gap - 4) / 2;
  return [0, 1, 2, 3, 4, 5, 6, 7].map(slot => {
    const enemy = slot >= 4, front = slot === 2 || slot === 3 || slot === 4 || slot === 5, row = slot % 2;
    const cellWidth = width * .24;
    const x = width * COLUMNS[enemy ? (front ? 2 : 3) : front ? 1 : 0] - (side ? 14 : 0);
    const panelY = top + row * (rowHeight + gap) + rowHeight - panelHeight + (front ? 3 : 0);
    // Include the largest foot-origin overshoot, breathing and a small visual gap.
    const size = side ? 44 : Math.max(44, Math.min(100, cellWidth - 8, rowHeight - panelHeight - 8));
    const y = side ? top + row * (rowHeight + gap) + rowHeight - 3 + (front ? 3 : 0) : panelY - 5;
    return {
      x, y, size, compact, tiny, side, iconSize, maxIcons: compact ? 1 : Math.min(3, Math.floor((cellWidth - iconSize) / (iconSize + 2))),
      body: { x: x - size * .51, y: y - size * 1.03 - 4, width: size * 1.02, height: size * 1.07 + 4 },
      panel: side ? { x: x + 24, y: y - 26, width: 26, height: 26 } : { x: x - cellWidth / 2, y: panelY, width: cellWidth, height: panelHeight },
    };
  });
}
