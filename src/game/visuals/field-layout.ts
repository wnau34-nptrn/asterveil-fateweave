export interface FieldBox { x: number; y: number; width: number; height: number }
export interface FieldSlot {
  // `label`: where a foe's name stands, just above its painted figure (standard grid only; the HP panel is below the feet).
  x: number; y: number; size: number; body: FieldBox; panel: FieldBox; label?: FieldBox;
  compact: boolean; tiny: boolean; side: boolean; iconSize: number; maxIcons: number;
}

/** The standard battle grid (owner 2026-10-22: every battle stands on the same spots, nothing shifts between fights).
 * Each side has two columns (heroes: back 0, front 1; foes: front 2, back 3) and three rows (top 0, middle 1,
 * bottom 2). Row heights, column centres and the unit size come from the arena size alone, never from who is in the
 * fight; the rows stand one step apart from the bottom up, so the top row stays on the floor. `slotPlan` decides only
 * which cell each actor takes:
 *   - a column holding one unit stands it in the middle; two take top and bottom; three take all three rows;
 *   - a boss always stands in the middle, a column partner below it;
 *   - a large foe sharing its column stands on the bottom row and is drawn LARGE_SCALE taller from the same feet.
 * Coordinates are arena CSS pixels; each slot reserves its body, its HP/status panel (under the feet) and a foe's
 * name label (above its painted head).
 * Slot ids: heroes 0/1 (back), 2/3 (front), 8 (back middle), 9 (front middle); foes f1 4, f2 5, b1 6, b2 7.
 * Fields shorter than three rows of 44px units keep the older two-row short grid (`shortSlots`).
 */
export const FOE_SLOT_INDEX: Readonly<Record<string, number>> = { f1: 4, f2: 5, b1: 6, b2: 7 };
export const LARGE_SCALE = 1.5;
export type HeroColumn = 'back' | 'front';
export type Row = 0 | 1 | 2;
export const TRIO_SLOTS: Readonly<Record<HeroColumn, readonly [number, number, number]>> = { back: [0, 8, 1], front: [2, 9, 3] };
// Columns of a side stand .25 of the width apart and the two sides .28 apart; a unit is at most UNIT_WIDTH of the width,
// so neighbouring bodies never overlap and the painted figures (about four fifths of the box) keep a clear gap
// (owner 2026-10-22).
const COLUMNS = [.11, .36, .64, .89] as const;
const UNIT_WIDTH = .245;
const FULL_COLUMNS = [.12, .37, .62, .865] as const;
const columnOf = (slot: number): number => slot === 8 ? 0 : slot === 9 ? 1 : slot >> 1;
export const partner = (slot: number): number => slot % 2 ? slot - 1 : slot + 1;

// `rise`: how far each slot's painted figure rises above its feet, as a fraction of its size (`figureRise`); a foe's
// name label sits just above that. Missing = 1 (a figure filling its frame), the case the row spacing is built for.
export interface SlotLayout { large: ReadonlySet<number>; rows: ReadonlyMap<number, Row>; trio: ReadonlySet<HeroColumn>; rise?: ReadonlyMap<number, number> }
const none: SlotLayout = { large: new Set(), rows: new Map(), trio: new Set() };

// A body box overshoots its feet by 4% of its size (contact shadow); rows keep that clear of the next panel.
const below = (size: number) => Math.ceil(size * .04) + 2;
// The largest unit size whose three rows (body + panel) fit the field height.
// Every HP/status panel sits under the feet (owner 2026-10-22: the same height for every unit); only a foe's name
// stands above its head. Rows are spaced for a figure that fills its frame (rise 1): its name label then still clears
// the panel of the unit above.
const FLOOR = .38, LABEL = 13;
const reach = (size: number) => size + 4 + LABEL + 2;
const stepOf = (size: number, panel: number) => reach(size) + panel + below(size);
// The largest unit size whose three rows (name + body + panel) fit between the backdrop's floor line (the top row's
// feet at FLOOR of the height) and the field's bottom edge.
// `floor` false drops the floor-line rule (rows may start above the backdrop's floor) for shorter fields, which
// would otherwise fall back to the tiny two-row grid on phones with a tall status bar.
const fitSize = (width: number, height: number, panel: number, floor = true) => {
  let size = Math.floor(Math.min(140, width * UNIT_WIDTH));
  while (size > 0 && (3 * stepOf(size, panel) > height - 2 || floor && 2 * stepOf(size, panel) > height - 2 - panel - below(size) - Math.max(height * FLOOR, reach(size)))) size--;
  return size;
};

export function fieldSlots(width: number, height: number, layout: SlotLayout = none): FieldSlot[] {
  // A 30px panel: the HP number over a centred bar, small status icons under it.
  const panel = 30, size = Math.max(fitSize(width, height, panel), fitSize(width, height, panel, false));
  if (size < 44) return shortSlots(width, height, layout);
  // The grid is anchored to the bottom: rows are one step apart, the bottom row's feet just above the field's edge.
  // Rows spread up to where the backdrop's floor begins (the top row's feet at FLOOR of the height) so a large foe
  // under another unit has room; never closer than one unit + panel.
  const bottom = height - 2 - panel - below(size), step = Math.max(stepOf(size, panel), (bottom - Math.max(height * FLOOR, reach(size))) / 2);
  const rows = [bottom - 2 * step, bottom - step, bottom];
  const cellWidth = width * .22, iconSize = 12, compact = false;
  const maxIcons = Math.min(3, Math.floor((cellWidth - 18) / (iconSize + 2)));
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(slot => {
    const row = layout.rows.get(slot) ?? (slot >= 8 ? 1 : slot % 2 ? 2 : 0), y = rows[row]!;
    const x = width * COLUMNS[columnOf(slot)]!;
    // A large foe grows up from the same feet as far as LARGE_SCALE allows while its name stays inside the field and
    // below the panel of a unit standing higher in its column.
    const above = [...layout.rows].filter(([other, r]) => other !== slot && columnOf(other) === columnOf(slot) && r < row).map(([, r]) => rows[r]!);
    const ceiling = above.length ? Math.max(...above) + below(size) + panel : 0;
    const rise = Math.min(1, layout.rise?.get(slot) ?? 1);
    const drawn = layout.large.has(slot) ? Math.floor(Math.max(size, Math.min(size * LARGE_SCALE, (y - ceiling - 4 - LABEL - 2) / rise))) : size;
    const top = y - drawn * 1.03 - 4;
    return {
      x, y, size: drawn, compact, tiny: false, side: false, iconSize, maxIcons,
      body: { x: x - drawn * .51, y: top, width: drawn * 1.02, height: drawn * 1.07 + 4 },
      panel: { x: x - cellWidth / 2, y: y + below(size), width: cellWidth, height: panel },
      label: { x: x - cellWidth / 2, y: y - rise * drawn - 4 - LABEL - 2, width: cellWidth, height: LABEL },
    };
  });
}

// Short fields (keyboard-raised or landscape PC windows): two rows of small units with a side badge; a column of
// three spreads over the height. Large foes draw at the normal size.
function shortSlots(width: number, height: number, layout: SlotLayout): FieldSlot[] {
  const tiny = height < 180, side = height < 150, compact = true;
  const iconSize = side ? 12 : tiny ? 14 : 18, panelHeight = side ? 26 : tiny ? 18 : 32;
  const top = 4, gap = 4, rowHeight = (height - top - gap - 4) / 2;
  const slots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(id => {
    const slot = id >= 8 ? (id === 8 ? 0 : 2) : id;
    const enemy = slot >= 4, front = slot >= 2 && slot <= 5, row = slot % 2;
    const cellWidth = width * .24;
    const x = width * FULL_COLUMNS[enemy ? (front ? 2 : 3) : front ? 1 : 0] - (side ? 14 : 0);
    const panelY = top + row * (rowHeight + gap) + rowHeight - panelHeight + (front ? 3 : 0);
    const size = side ? 44 : Math.max(44, Math.min(100, cellWidth - 8, rowHeight - panelHeight - 8));
    const y = side ? top + row * (rowHeight + gap) + rowHeight - 3 + (front ? 3 : 0) : panelY - 5;
    return {
      x, y, size, compact, tiny, side, iconSize, maxIcons: 1,
      body: { x: x - size * .51, y: y - size * 1.03 - 4, width: size * 1.02, height: size * 1.07 + 4 },
      panel: side ? { x: x + 24, y: y - 26, width: 26, height: 26 } : { x: x - cellWidth / 2, y: panelY, width: cellWidth, height: panelHeight },
    };
  });
  for (const column of layout.trio) {
    const ids = TRIO_SLOTS[column], base = slots[ids[0]]!, size = 44, step = (height - 8) / 3;
    // The side badge must end before the next column's panels (the shortest fields already badge all).
    const x = base.side ? base.x : column === 'back' ? Math.max(23, Math.min(base.x, width * .25 - 51)) : Math.max(width * .24 + 23, Math.min(base.x, width * .5 - 51));
    const first = Math.max(4 + step - 3, 1.03 * size + 3);
    ids.forEach((slot, k) => {
      const y = first + k * (height - 3 - first) / 2;
      slots[slot] = { x, y, size, compact, tiny: base.tiny, side: true, iconSize: 12, maxIcons: 1,
        body: { x: x - size * .51, y: y - size * 1.03 - 4, width: size * 1.02, height: size * 1.07 + 4 }, panel: { x: x + 24, y: y - 26, width: 26, height: 26 } };
    });
  }
  return slots;
}

export interface SlotPlan extends SlotLayout { heroSlots: Map<string, number>; used: number[] }
/** Which cell each actor stands in. Heroes fill their own lane's column first (at most three per column). Foe
 * columns count every foe that can stand there in this encounter, including reserves its phases can call, so nobody
 * moves when a foe falls or is summoned. */
export function slotPlan(heroes: readonly { id: string; lane: HeroColumn }[], foes: readonly { id: string; reserve?: boolean; large?: boolean; boss?: boolean }[], called: ReadonlySet<string>): SlotPlan {
  const count = { back: 0, front: 0 }; const lane = new Map<string, HeroColumn>();
  for (const hero of heroes) { const l = count[hero.lane] < 3 ? hero.lane : hero.lane === 'front' ? 'back' : 'front'; lane.set(hero.id, l); count[l]++; }
  const trio = new Set((['back', 'front'] as const).filter(c => count[c] === 3));
  const free = { back: trio.has('back') ? [...TRIO_SLOTS.back] : [0, 1], front: trio.has('front') ? [...TRIO_SLOTS.front] : [2, 3] };
  const heroSlots = new Map(heroes.map(h => [h.id, free[lane.get(h.id)!].shift()!] as const));
  const standing = foes.filter(e => !e.reserve || called.has(e.id));
  const used = [...heroSlots.values(), ...standing.map(e => FOE_SLOT_INDEX[e.id]!)];
  const rows = new Map<number, Row>(), large = new Set<number>();
  // Heroes: one → middle, two → top/bottom, three → all rows.
  for (const column of ['back', 'front'] as const) {
    const ids = TRIO_SLOTS[column].filter(i => used.includes(i));
    ids.forEach((slot, k) => rows.set(slot, ids.length === 1 ? 1 : ids.length === 2 ? (k ? 2 : 0) : k as Row));
  }
  for (const column of [[4, 5], [6, 7]]) {
    const here = column.flatMap(i => standing.filter(e => FOE_SLOT_INDEX[e.id] === i));
    const boss = here.find(e => e.boss), big = here.filter(e => e.large);
    if (here.length === 1) { rows.set(FOE_SLOT_INDEX[here[0]!.id]!, 1); if (here[0]!.large) large.add(FOE_SLOT_INDEX[here[0]!.id]!); continue; }
    if (here.length !== 2) continue;
    // A boss takes the middle, its partner the bottom; otherwise a lone large foe takes the bottom.
    const lower = boss ? here.find(e => e !== boss)! : big.length === 1 ? big[0]! : here[1]!;
    const upper = here.find(e => e !== lower)!;
    rows.set(FOE_SLOT_INDEX[upper.id]!, boss ? 1 : 0); rows.set(FOE_SLOT_INDEX[lower.id]!, 2);
    if (upper.large) large.add(FOE_SLOT_INDEX[upper.id]!);
    if (lower.large) large.add(FOE_SLOT_INDEX[lower.id]!);
  }
  return { heroSlots, used, rows, large, trio };
}
