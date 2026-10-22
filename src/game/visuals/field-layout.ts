export interface FieldBox { x: number; y: number; width: number; height: number }
export interface FieldSlot {
  x: number; y: number; size: number; body: FieldBox; panel: FieldBox;
  compact: boolean; tiny: boolean; side: boolean; iconSize: number; maxIcons: number;
}

/** Reserve the whole body + HP/status panel, even when a unit has no effects.
 * Rows cannot move as effects are gained/consumed. Coordinates are arena CSS pixels.
 * Slot order is hero rear 0/1, hero front 0/1, foe front f1/f2, foe back b1/b2 (A7 step 3: the 8-actor field).
 * Four columns mirror each side; each column holds an upper and a lower unit. `large` lists slot indexes drawn
 * LARGE_SCALE times taller from the same feet; the rows always reserve room for a large unit in any slot.
 */
export const FOE_SLOT_INDEX: Readonly<Record<string, number>> = { f1: 4, f2: 5, b1: 6, b2: 7 };
export const LARGE_SCALE = 1.5;
const COLUMNS = [.12, .355, .645, .88] as const;
const FULL_COLUMNS = [.12, .37, .62, .865] as const;
// Panels start below the feet: a body box overshoots its feet by 4% of its size (contact shadow).
const BELOW_FEET = 12, FRONT_DROP = 2;
export function fieldSlots(width: number, height: number, large: ReadonlySet<number> = new Set()): FieldSlot[] {
  const compact = height < 260, tiny = height < 180, side = height < 150;
  if (compact) return shortSlots(width, height, compact, tiny, side);
  const iconSize = 18, panelHeight = 50, cellWidth = width * .225;
  // Lower feet sit above the bottom panel; the upper row leaves room for a large head and the lower row
  // for a large body between the upper panels and its own feet.
  const lowerFeet = height - panelHeight - BELOW_FEET - FRONT_DROP - 2;
  const room = (lowerFeet - BELOW_FEET - panelHeight - FRONT_DROP - 12) / 2.06;
  const size = Math.max(44, Math.floor(Math.min(140, width * .31, room / LARGE_SCALE)));
  const big = Math.max(size, Math.min(size * LARGE_SCALE, room));
  const slack = Math.max(0, lowerFeet - (2.06 * big + BELOW_FEET + panelHeight + FRONT_DROP + 12));
  const upperFeet = 1.03 * big + 4 + slack * .55;
  return [0, 1, 2, 3, 4, 5, 6, 7].map(slot => {
    const enemy = slot >= 4, front = slot >= 2 && slot <= 5, row = slot % 2;
    const x = width * COLUMNS[enemy ? (front ? 2 : 3) : front ? 1 : 0];
    const y = (row ? lowerFeet : upperFeet) + (front ? FRONT_DROP : 0);
    const drawn = large.has(slot) ? Math.floor(big) : size;
    return {
      x, y, size: drawn, compact, tiny, side, iconSize, maxIcons: Math.min(3, Math.floor((cellWidth - iconSize) / (iconSize + 2))),
      body: { x: x - drawn * .51, y: y - drawn * 1.03 - 4, width: drawn * 1.02, height: drawn * 1.07 + 4 },
      panel: { x: x - cellWidth / 2, y: y + BELOW_FEET, width: cellWidth, height: panelHeight },
    };
  });
}

// Short fields (keyboard-raised or landscape PC windows) keep the pre-A7 grid: there is no room for large art,
// so large foes draw at the normal size.
function shortSlots(width: number, height: number, compact: boolean, tiny: boolean, side: boolean): FieldSlot[] {
  const iconSize = side ? 12 : tiny ? 14 : 18;
  const panelHeight = side ? 26 : tiny ? 18 : 32;
  const top = 4, gap = 4;
  const rowHeight = (height - top - gap - 4) / 2;
  return [0, 1, 2, 3, 4, 5, 6, 7].map(slot => {
    const enemy = slot >= 4, front = slot >= 2 && slot <= 5, row = slot % 2;
    const cellWidth = width * .24;
    const x = width * FULL_COLUMNS[enemy ? (front ? 2 : 3) : front ? 1 : 0] - (side ? 14 : 0);
    const panelY = top + row * (rowHeight + gap) + rowHeight - panelHeight + (front ? 3 : 0);
    const size = side ? 44 : Math.max(44, Math.min(100, cellWidth - 8, rowHeight - panelHeight - 8));
    const y = side ? top + row * (rowHeight + gap) + rowHeight - 3 + (front ? 3 : 0) : panelY - 5;
    return {
      x, y, size, compact, tiny, side, iconSize, maxIcons: compact ? 1 : Math.min(3, Math.floor((cellWidth - iconSize) / (iconSize + 2))),
      body: { x: x - size * .51, y: y - size * 1.03 - 4, width: size * 1.02, height: size * 1.07 + 4 },
      panel: side ? { x: x + 24, y: y - 26, width: 26, height: 26 } : { x: x - cellWidth / 2, y: panelY, width: cellWidth, height: panelHeight },
    };
  });
}
