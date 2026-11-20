import { foeLine, foeLineRows } from '../../core/battle/foe-lines';
export interface FieldBox { x: number; y: number; width: number; height: number }
export interface FieldSlot {
  x: number; y: number; size: number; body: FieldBox; panel: FieldBox; label?: FieldBox;
  compact: boolean; tiny: boolean; side: boolean; iconSize: number; maxIcons: number;
  // Height of the icon band under the track (0 on fields too short for it: the icons then sit beside the track).
  statusBand: number;
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
// `centre`: slots drawn at the exact centre of the foes' half (a boss with nobody behind it, owner 2026-11-20).
export interface SlotLayout { large: ReadonlySet<number>; rows: ReadonlyMap<number, Row>; trio: ReadonlySet<HeroColumn | FoeColumn>; rise?: ReadonlyMap<number, number>; used?: readonly number[]; centre?: ReadonlySet<number> }
const none: SlotLayout = { large: new Set(), rows: new Map(), trio: new Set() };

/** Straight HP tracks and counters need their own clear band. Fit the largest base size first while
 * retaining a 1.5× boss; on very short fields cap its scale before reducing normal units
 * below 44px. Row heights follow the tallest painted figure, never overlapping a track.
 * This is presentation geometry only: tactical slot ids and targeting remain unchanged. */
export function fieldSlots(width: number, height: number, layout: SlotLayout = none): FieldSlot[] {
  const used = layout.used ?? SLOT_IDS;
  const rowOf = (id: number): Row => layout.rows.get(id) ?? (id >= 8 ? 1 : id % 2 ? 2 : 0);
  // `status`: the band under each HP track that holds the buff/debuff icons (owner 2026-11-18: icons below the track).
  // A field too short to keep 44px figures with the band drops it (the icons then overlap the gap below the track).
  const panel = 14, gap = 8, edge = height < 240 ? 4 : 8;
  let status = 13;
  const cap = Math.floor(Math.min(140, width * UNIT_WIDTH) * UNIT_SCALE);
  const geometry = (base: number, scale: number) => {
    const rises = [0, 1, 2].map(row => Math.max(base * 1.022, ...used.filter(id => rowOf(id) === row).map(id =>
      base * (layout.large.has(id) ? scale : 1) * (layout.rise?.get(id) ?? 1) * 1.022 + (layout.large.has(id) ? 12 : 0))));
    return { rises, required: edge * 2 + rises.reduce((a, b) => a + b, 0) + 3 * (panel + status) + 2 * gap };
  };
  if (geometry(Math.min(44, cap), 1).required > height) status = 0;
  let scale = LARGE_SCALE;
  // The minimum is a visual size, not a control size (hit targets stay >=44px).
  while (scale > 1 && geometry(Math.min(44, cap), scale).required > height) scale = Math.max(1, Math.round((scale - .05) * 100) / 100);
  let base = cap;
  while (base > 1 && geometry(base, scale).required > height) base--;
  const { rises, required } = geometry(base, scale);
  const extra = Math.max(0, height - required), stepExtra = extra / 3;
  const rows: number[] = [];
  let cursor = edge + stepExtra;
  for (let row = 0; row < 3; row++) { cursor += rises[row]!; rows.push(cursor); cursor += panel + status + gap + stepExtra; }
  const slots = SLOT_IDS.map(id => {
    const large = layout.large.has(id), size = base * (large ? scale : 1), row = rowOf(id), y = rows[row]!;
    let x = width * COLUMNS[columnOf(id)]!;
    // A boss with nobody behind it stands at the exact centre of the foes' half (owner 2026-11-20). Another large
    // front-middle foe may borrow the empty back-middle cell, keeping clear of the opposing front hero. Never borrow a
    // cell occupied by a reserve or shove.
    const backMiddle = used.some(other => columnOf(other) === 3 && rowOf(other) === 1);
    if (layout.centre?.has(id)) x = width * (COLUMNS[2] + COLUMNS[3]) / 2;
    else if (large && columnOf(id) === 2 && row === 1 && !backMiddle) x += Math.min(base * .33, width * .09);
    const cellWidth = Math.min(width * .24, Math.max(72, base * .78));
    const rise = layout.rise?.get(id) ?? 1;
    return {
      x, y, size, compact: base < 70, tiny: base < 44, side: false, iconSize: 12, statusBand: status, maxIcons: status ? Math.max(1, Math.min(4, Math.floor((Math.min(cellWidth, 72) + 2) / 14))) : 1,
      body: { x: x - size * .5, y: y - size * rise * 1.022, width: size, height: size * rise * 1.022 },
      panel: { x: Math.max(0, Math.min(width - cellWidth, x - cellWidth / 2)), y: y + 2, width: cellWidth, height: panel - 2 },
    };
  });
  // Owner 2026-11-20: both sides share the three rows (a hero and a foe of the same row stand on one line) and the rows
  // stand evenly apart. The top and bottom rows keep their places; the middle row moves to halfway between them unless a
  // figure would then reach under a top-row HP track and status band (or a middle-row band over a bottom-row figure):
  // the middle row's own side always counts, a figure of the other side only where its painted body (about three quarters
  // of its box, centred) is under the band. (Replaces the 2026-11-18 per-side top-row drop, which left the two sides'
  // top rows at different heights.)
  const band = panel + status + gap;
  const reach = (upper: Row, lower: Row): number => {
    const tops = used.filter(id => rowOf(id) === upper);
    const spans = tops.map(id => { const p = slots[id]!.panel, bar = Math.min(p.width, 72); return [p.x + (p.width - bar) / 2, p.x + (p.width + bar) / 2, columnOf(id) < 2] as const; });
    return Math.max(0, ...used.filter(id => rowOf(id) === lower).filter(id => {
      const b = slots[id]!.body, l = b.x + b.width * .125, r = b.x + b.width * .875, hero = columnOf(id) < 2;
      return spans.some(([bl, br, side]) => side === hero || (l < br && r > bl));
    }).map(id => slots[id]!.y - slots[id]!.body.y + (layout.large.has(id) ? 12 : 0)));
  };
  const usedRows = new Set(used.map(rowOf));
  if (usedRows.has(0) && usedRows.has(1) && usedRows.has(2)) {
    const low = rows[0]! + reach(0, 1) + band, high = rows[2]! - reach(1, 2) - band;
    const middle = Math.max(low, Math.min(high, (rows[0]! + rows[2]!) / 2)), shift = middle - rows[1]!;
    if (shift) for (const id of SLOT_IDS) if (rowOf(id) === 1) { const s = slots[id]!; s.y += shift; s.body.y += shift; s.panel.y += shift; }
  }
  return slots;
}

export interface SlotPlan extends SlotLayout { heroSlots: Map<string, number>; used: number[]; centre: Set<number> }
/** Which cell each actor stands in. Heroes fill their own lane's column first (at most three per column). Foe
 * columns count every foe that can stand there in this encounter, including reserves its phases can call, so nobody
 * moves when a foe falls or is summoned. */
export function slotPlan(heroes: readonly { id: string; lane: HeroColumn }[], foes: readonly { id: string; reserve?: boolean; large?: boolean; boss?: boolean; leader?: boolean }[], called: ReadonlySet<string>): SlotPlan {
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
  // Foes stand by line (owner 2026-11-20, `foeLineRows`): the front and back foe of a line share a row, so a spear's
  // pierce and shove read straight across, and every line keeps its row through summons, falls and shoves.
  const lineRows = foeLineRows(foes);
  for (const foe of foes) {
    const slot = FOE_SLOT_INDEX[foe.id]!, row = lineRows.get(foeLine(foe.id));
    if (row !== undefined) rows.set(slot, row);
    if (foe.large || foe.boss) large.add(slot);
  }
  for (const [name, column] of [['foeFront', TRIO_SLOTS.foeFront], ['foeBack', TRIO_SLOTS.foeBack]] as const)
    if (column.filter(i => used.includes(i)).length === 3) trio.add(name);
  // A boss with nobody behind it in its line stands at the centre of the foes' half.
  const centre = new Set(foes.filter(e => (e.boss || e.leader) && !foes.some(o => o !== e && foeLine(o.id) === foeLine(e.id))).map(e => FOE_SLOT_INDEX[e.id]!));
  return { heroSlots, used, rows, large, trio, centre };
}

/** The slot a foe stands in now: its own, or while a spear's shove (save v50) holds it, its column partner's (the back slot
 * of its column without one); the pulled partner stands in the shoved foe's slot. Read from the committed state only. */
export function standSlotId(state: { enemies: readonly { id: string; hp: number; shoved?: { partnerId?: string } }[] }, id: string): string {
  const foe = state.enemies.find(e => e.id === id);
  if (foe?.shoved && foe.hp > 0) return foe.shoved.partnerId ?? `b${id.slice(1)}`;
  return state.enemies.find(e => e.hp > 0 && e.shoved?.partnerId === id)?.id ?? id;
}
