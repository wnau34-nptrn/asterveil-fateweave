export interface FieldBox { x: number; y: number; width: number; height: number }
export interface FieldSlot {
  x: number; y: number; size: number; body: FieldBox; panel: FieldBox; label?: FieldBox;
  compact: boolean; tiny: boolean; side: boolean; iconSize: number; maxIcons: number;
}

/** Stable tactical cells: heroes back/front, foes front/back; top/middle/bottom.
 * Adaptive presentation may spread rows and offset a large boss into an empty cell.
 * Slot ids are unchanged, including spear shove and encounter phase reservations. */
export const FOE_SLOT_INDEX: Readonly<Record<string, number>> = { f1: 4, f2: 5, b1: 6, b2: 7, f3: 10, b3: 11 };
export const LARGE_SCALE = 1.5;
export type HeroColumn = 'back' | 'front';
export type FoeColumn = 'foeFront' | 'foeBack';
export type Row = 0 | 1 | 2;
// Top, middle and bottom cells of each column.
export const TRIO_SLOTS: Readonly<Record<HeroColumn | FoeColumn, readonly [number, number, number]>> = { back: [0, 8, 1], front: [2, 9, 3], foeFront: [4, 10, 5], foeBack: [6, 11, 7] };
const SLOT_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
// Columns of a side stand .25 of the width apart and the two sides .28 apart; a unit is at most UNIT_WIDTH of the width,
// so neighbouring bodies never overlap and the painted figures (about four fifths of the box) keep a clear gap
// (owner 2026-10-22).
const COLUMNS = [.115, .37, .63, .885] as const;
const UNIT_WIDTH = .295;
export const UNIT_SCALE = .95;
const columnOf = (slot: number): number => slot === 8 ? 0 : slot === 9 ? 1 : slot === 10 ? 2 : slot === 11 ? 3 : slot >> 1;
export const partner = (slot: number): number => slot % 2 ? slot - 1 : slot + 1;

// Rise is measured from each illustration's painted top to its sole. Reserve all encounter
// cells (including phase summons), so deaths/summons never move surviving units.
export interface SlotLayout { large: ReadonlySet<number>; rows: ReadonlyMap<number, Row>; trio: ReadonlySet<HeroColumn | FoeColumn>; rise?: ReadonlyMap<number, number>; used?: readonly number[] }
const none: SlotLayout = { large: new Set(), rows: new Map(), trio: new Set() };

/** Front-only HP arcs need their own clear band. Fit the largest base size first while
 * retaining a 1.5× boss; on very short fields cap its scale before reducing normal units
 * below 44px. Row heights follow the tallest painted figure, never overlapping an arc.
 * This is presentation geometry only: tactical slot ids and targeting remain unchanged. */
export function fieldSlots(width: number, height: number, layout: SlotLayout = none): FieldSlot[] {
  const used = layout.used ?? SLOT_IDS;
  const rowOf = (id: number): Row => layout.rows.get(id) ?? (id >= 8 ? 1 : id % 2 ? 2 : 0);
  const panel = 14, gap = 8, edge = height < 240 ? 4 : 8;
  const cap = Math.floor(Math.min(140, width * UNIT_WIDTH) * UNIT_SCALE);
  const geometry = (base: number, scale: number) => {
    const rises = [0, 1, 2].map(row => Math.max(base * 1.022, ...used.filter(id => rowOf(id) === row).map(id =>
      base * (layout.large.has(id) ? scale : 1) * (layout.rise?.get(id) ?? 1) * 1.022 + (layout.large.has(id) ? 12 : 0))));
    return { rises, required: edge * 2 + rises.reduce((a, b) => a + b, 0) + 3 * panel + 2 * gap };
  };
  let scale = LARGE_SCALE;
  // The minimum is a visual size, not a control size (hit targets stay >=44px).
  while (scale > 1 && geometry(Math.min(44, cap), scale).required > height) scale = Math.max(1, Math.round((scale - .05) * 100) / 100);
  let base = cap;
  while (base > 1 && geometry(base, scale).required > height) base--;
  const { rises, required } = geometry(base, scale);
  const extra = Math.max(0, height - required), stepExtra = extra / 3;
  const rows: number[] = [];
  let cursor = edge + stepExtra;
  for (let row = 0; row < 3; row++) { cursor += rises[row]!; rows.push(cursor); cursor += panel + gap + stepExtra; }
  return SLOT_IDS.map(id => {
    const large = layout.large.has(id), size = base * (large ? scale : 1), row = rowOf(id), y = rows[row]!;
    let x = width * COLUMNS[columnOf(id)]!;
    // A large front-middle foe may borrow the empty back-middle cell, keeping clear
    // of the opposing front hero. Never borrow a cell occupied by a reserve or shove.
    const backMiddle = used.some(other => columnOf(other) === 3 && rowOf(other) === 1);
    if (large && columnOf(id) === 2 && row === 1 && !backMiddle) x += Math.min(base * .33, width * .09);
    const cellWidth = Math.min(width * .22, Math.max(64, base * .78));
    const rise = layout.rise?.get(id) ?? 1;
    return {
      x, y, size, compact: base < 70, tiny: base < 44, side: false, iconSize: 12, maxIcons: 1,
      body: { x: x - size * .5, y: y - size * rise * 1.022, width: size, height: size * rise * 1.022 },
      panel: { x: x - cellWidth / 2, y: y + 2, width: cellWidth, height: panel - 2 },
    };
  });
}

export interface SlotPlan extends SlotLayout { heroSlots: Map<string, number>; used: number[] }
/** Which cell each actor stands in. Heroes fill their own lane's column first (at most three per column). Foe
 * columns count every foe that can stand there in this encounter, including reserves its phases can call, so nobody
 * moves when a foe falls or is summoned. */
export function slotPlan(heroes: readonly { id: string; lane: HeroColumn }[], foes: readonly { id: string; reserve?: boolean; large?: boolean; boss?: boolean }[], called: ReadonlySet<string>): SlotPlan {
  const count = { back: 0, front: 0 }; const lane = new Map<string, HeroColumn>();
  for (const hero of heroes) { const l = count[hero.lane] < 3 ? hero.lane : hero.lane === 'front' ? 'back' : 'front'; lane.set(hero.id, l); count[l]++; }
  const trio = new Set<HeroColumn | FoeColumn>((['back', 'front'] as const).filter(c => count[c] === 3));
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
  for (const [name, column] of [['foeFront', TRIO_SLOTS.foeFront], ['foeBack', TRIO_SLOTS.foeBack]] as const) {
    const here = column.flatMap(i => standing.filter(e => FOE_SLOT_INDEX[e.id] === i));
    const boss = here.find(e => e.boss), big = here.filter(e => e.large);
    // A boss stays in the middle; adaptive geometry reserves its larger painted rise.
    if (here.length === 3) {
      trio.add(name);
      const middle = boss ?? here.find(e => FOE_SLOT_INDEX[e.id] === column[1]) ?? here[1]!;
      const rest = here.filter(e => e !== middle);
      rows.set(FOE_SLOT_INDEX[rest[0]!.id]!, 0); rows.set(FOE_SLOT_INDEX[middle.id]!, 1); rows.set(FOE_SLOT_INDEX[rest[1]!.id]!, 2);
      for (const foe of here) if (foe.large || foe.boss) large.add(FOE_SLOT_INDEX[foe.id]!);
      continue;
    }
    if (here.length === 1) { rows.set(FOE_SLOT_INDEX[here[0]!.id]!, 1); if (here[0]!.large || here[0]!.boss) large.add(FOE_SLOT_INDEX[here[0]!.id]!); continue; }
    if (here.length !== 2) continue;
    // A boss takes the middle, its partner the bottom; otherwise a lone large foe takes the bottom.
    const lower = boss ? here.find(e => e !== boss)! : big.length === 1 ? big[0]! : here[1]!;
    const upper = here.find(e => e !== lower)!;
    rows.set(FOE_SLOT_INDEX[upper.id]!, boss ? 1 : 0); rows.set(FOE_SLOT_INDEX[lower.id]!, 2);
    if (upper.large || upper.boss) large.add(FOE_SLOT_INDEX[upper.id]!);
    if (lower.large || lower.boss) large.add(FOE_SLOT_INDEX[lower.id]!);
  }
  return { heroSlots, used, rows, large, trio };
}

/** The slot a foe stands in now: its own, or while a spear's shove (save v50) holds it, its column partner's (the back slot
 * of its column without one); the pulled partner stands in the shoved foe's slot. Read from the committed state only. */
export function standSlotId(state: { enemies: readonly { id: string; hp: number; shoved?: { partnerId?: string } }[] }, id: string): string {
  const foe = state.enemies.find(e => e.id === id);
  if (foe?.shoved && foe.hp > 0) return foe.shoved.partnerId ?? `b${id.slice(1)}`;
  return state.enemies.find(e => e.hp > 0 && e.shoved?.partnerId === id)?.id ?? id;
}
