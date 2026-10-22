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
 * `centered` lists slots whose column holds only that unit in this encounter: they stand in the middle row.
 * Formation (owner 2026-10-22): a hero column may hold three. `trio` names such columns; their third unit takes slot
 * 8 (rear) or 9 (front) in the middle, and the column's three are drawn about TRIO_SCALE of the normal size with
 * compact panels. Slots 8/9 of other columns hold nobody.
 */
export const FOE_SLOT_INDEX: Readonly<Record<string, number>> = { f1: 4, f2: 5, b1: 6, b2: 7 };
export const LARGE_SCALE = 1.5;
export const TRIO_SCALE = .8;
export type HeroColumn = 'back' | 'front';
export const TRIO_SLOTS: Readonly<Record<HeroColumn, readonly [number, number, number]>> = { back: [0, 8, 1], front: [2, 9, 3] };
const COLUMNS = [.12, .355, .645, .88] as const;
const FULL_COLUMNS = [.12, .37, .62, .865] as const;
// Panels start below the feet: a body box overshoots its feet by 4% of its size (contact shadow).
const BELOW_FEET = 12, FRONT_DROP = 2;
export function fieldSlots(width: number, height: number, large: ReadonlySet<number> = new Set(), centered: ReadonlySet<number> = new Set(), trio: ReadonlySet<HeroColumn> = new Set()): FieldSlot[] {
  const compact = height < 260, tiny = height < 180, side = height < 150;
  const slots = compact ? shortSlots(width, height, compact, tiny, side) : tallSlots(width, height, large, centered);
  for (const column of trio) trioSlots(slots, column, width, height, compact);
  if (!compact) narrowCentered(slots, centered, trio);
  return slots;
}
function narrowCentered(slots: FieldSlot[], centered: ReadonlySet<number>, trio: ReadonlySet<HeroColumn>): void {
  const iconSize = 18;
  // A middle-row panel sits level with the neighbouring columns' bodies: narrow it to the gap between them.
  // Bodies of the same column (a trio) stand above or below and never count.
  // The partner slot of a centred unit is unused, so its reserved body does not count.
  const unused = new Set([...centered].map(partner).concat((['back', 'front'] as const).filter(c => !trio.has(c)).map(c => TRIO_SLOTS[c][1])));
  // A trio's panels sit level with the other column's middle unit, so they narrow the same way.
  for (const i of [...centered, ...[...trio].flatMap(c => TRIO_SLOTS[c])]) {
    const own = slots[i]!, p = own.panel; let left = p.x, right = p.x + p.width;
    for (const [j, other] of slots.entries()) {
      const b = other.body;
      if (j === i || unused.has(j) || other.x === own.x || b.y >= p.y + p.height || b.y + b.height <= p.y) continue;
      if (other.x < own.x) left = Math.max(left, b.x + b.width); else right = Math.min(right, b.x);
    }
    p.x = left; p.width = Math.max(0, right - left - .01);
    own.maxIcons = Math.max(1, Math.min(own.maxIcons, Math.floor((p.width - iconSize) / (iconSize + 2))));
  }
}
function tallSlots(width: number, height: number, large: ReadonlySet<number>, centered: ReadonlySet<number>): FieldSlot[] {
  const compact = false, tiny = false, side = false;
  const iconSize = 18, panelHeight = 50, cellWidth = width * .225;
  // Lower feet sit above the bottom panel; the upper row leaves room for a large head and the lower row
  // for a large body between the upper panels and its own feet.
  const lowerFeet = height - panelHeight - BELOW_FEET - FRONT_DROP - 2;
  const room = (lowerFeet - BELOW_FEET - panelHeight - FRONT_DROP - 12) / 2.06;
  const size = Math.max(44, Math.floor(Math.min(140, width * .31, room / LARGE_SCALE)));
  const big = Math.max(size, Math.min(size * LARGE_SCALE, room));
  const slack = Math.max(0, lowerFeet - (2.06 * big + BELOW_FEET + panelHeight + FRONT_DROP + 12));
  const upperFeet = 1.03 * big + 4 + slack * .55;
  const slots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(slot => {
    // Slots 8/9 (a trio's middle) are placed by `trioSlots`; until then they mirror slot 0/2.
    const third = slot >= 8; if (third) slot = slot === 8 ? 0 : 2;
    const enemy = slot >= 4, front = slot >= 2 && slot <= 5, row = slot % 2;
    const x = width * COLUMNS[enemy ? (front ? 2 : 3) : front ? 1 : 0];
    // A column holding a single unit stands it in the middle row (owner 2026-10-22: a lone boss reads better centred).
    const y = (centered.has(slot) && !third ? (upperFeet + lowerFeet) / 2 + big * .2 : row ? lowerFeet : upperFeet) + (front ? FRONT_DROP : 0);
    const drawn = large.has(slot) ? Math.floor(big) : size;
    return {
      x, y, size: drawn, compact, tiny, side, iconSize, maxIcons: Math.min(3, Math.floor((cellWidth - iconSize) / (iconSize + 2))),
      body: { x: x - drawn * .51, y: y - drawn * 1.03 - 4, width: drawn * 1.02, height: drawn * 1.07 + 4 },
      panel: { x: x - cellWidth / 2, y: y + BELOW_FEET, width: cellWidth, height: panelHeight },
    };
  });
  return slots;
}
export const partner = (slot: number): number => slot % 2 ? slot - 1 : slot + 1;

// Short fields (keyboard-raised or landscape PC windows) keep the pre-A7 grid: there is no room for large art,
// so large foes draw at the normal size.
function shortSlots(width: number, height: number, compact: boolean, tiny: boolean, side: boolean): FieldSlot[] {
  const iconSize = side ? 12 : tiny ? 14 : 18;
  const panelHeight = side ? 26 : tiny ? 18 : 32;
  const top = 4, gap = 4;
  const rowHeight = (height - top - gap - 4) / 2;
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(slot => {
    if (slot >= 8) slot = slot === 8 ? 0 : 2;
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

// A column of three heroes stacks top/middle/bottom from the field's top edge to its bottom edge. Tall fields draw them
// at TRIO_SCALE (smaller if the height needs it) with compact panels under the feet; short fields keep 44px bodies
// with the small side badge, as the shortest fields already do.
function trioSlots(slots: FieldSlot[], column: HeroColumn, width: number, height: number, short: boolean): void {
  const ids = TRIO_SLOTS[column], base = slots[ids[0]]!, iconSize = short ? 12 : 18, gap = 2;
  // Tall: panels start just under the body box (its 4% shadow overshoot); 32px panels unless only 26px fit.
  const fit = (panel: number) => Math.floor(Math.min(base.size * TRIO_SCALE, ((height - 2) / 3 - 6 - gap - panel) / 1.07));
  const panelHeight = short || fit(32) < 44 ? 26 : 32;
  const size = short ? 44 : Math.max(44, fit(panelHeight));
  // On short fields the side badge must end before the next column's panels (the shortest fields already badge all).
  const x = !short || base.side ? base.x : column === 'back' ? Math.max(23, Math.min(base.x, width * .25 - 51)) : Math.max(width * .24 + 23, Math.min(base.x, width * .5 - 51));
  const cellWidth = width * .225, below = Math.ceil(size * .04) + 2;
  const step = 1.07 * size + 4 + below + panelHeight + gap;
  // Tall fields share any spare height between the three; the top unit's head stays inside the field.
  const spare = Math.max(0, (height - 2 - 3 * step) / 3);
  const top = Math.max(4 + (height - 8) / 3 - 3, 1.03 * size + 3);
  ids.forEach((slot, k) => {
    const y = short ? top + k * (height - 3 - top) / 2 : 1.03 * size + 4 + spare / 2 + k * (step + spare);
    slots[slot] = {
      x, y, size, compact: true, tiny: base.tiny, side: short, iconSize, maxIcons: 1,
      body: { x: x - size * .51, y: y - size * 1.03 - 4, width: size * 1.02, height: size * 1.07 + 4 },
      panel: short ? { x: x + 24, y: y - 26, width: 26, height: 26 } : { x: x - cellWidth / 2, y: y + below, width: cellWidth, height: panelHeight },
    };
  });
}

export interface SlotPlan { heroSlots: Map<string, number>; large: Set<number>; centered: Set<number>; trio: Set<HeroColumn>; used: number[] }
/** Which slot each actor stands in. Heroes fill their own lane's column first. A column with a single unit in this
 * encounter (counting reserves its phases can call, so nobody moves when a foe falls or is summoned) stands it in
 * the middle row. */
export function slotPlan(heroes: readonly { id: string; lane: HeroColumn }[], foes: readonly { id: string; reserve?: boolean; large?: boolean }[], called: ReadonlySet<string>): SlotPlan {
  // Each column holds at most three heroes (the formation rules cap it); a fourth would step over to the other one.
  const count = { back: 0, front: 0 }; const lane = new Map<string, HeroColumn>();
  for (const hero of heroes) { const l = count[hero.lane] < 3 ? hero.lane : hero.lane === 'front' ? 'back' : 'front'; lane.set(hero.id, l); count[l]++; }
  const trio = new Set((['back', 'front'] as const).filter(c => count[c] === 3));
  const free = { back: trio.has('back') ? [...TRIO_SLOTS.back] : [0, 1], front: trio.has('front') ? [...TRIO_SLOTS.front] : [2, 3] };
  const heroSlots = new Map(heroes.map(h => [h.id, free[lane.get(h.id)!].shift()!] as const));
  const used = [...heroSlots.values(), ...foes.filter(e => !e.reserve || called.has(e.id)).map(e => FOE_SLOT_INDEX[e.id]!)];
  return { heroSlots, large: new Set(foes.filter(e => e.large).map(e => FOE_SLOT_INDEX[e.id]!)), trio, used,
    centered: new Set(used.filter(i => i < 8 && !used.includes(partner(i)))) };
}
