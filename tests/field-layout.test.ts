import { describe, expect, it } from 'vitest';
import { encounters as catalog } from '../src/content/encounters/catalog';
import { foeLineRows } from '../src/core/battle/foe-lines';
import { FOE_SLOT_INDEX, fieldSlots, slotPlan, standSlotId, type FieldBox, type HeroColumn } from '../src/game/visuals/field-layout';

const intersects = (a: FieldBox, b: FieldBox) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
type Foe = { id: string; reserve?: boolean; large?: boolean; boss?: boolean };
const party = (lanes: readonly HeroColumn[]) => lanes.map((lane, i) => ({ id: `h${i}`, lane }));
// Formations and encounter shapes the game uses: 2/2, 3/1, 1/3; one to four foes, large foes, bosses with partners.
const formations: readonly (readonly HeroColumn[])[] = [['front', 'front', 'back', 'back'], ['front', 'front', 'front', 'back'], ['front', 'back', 'back', 'back']];
const encounters: readonly Foe[][] = [
  [{ id: 'f1' }],
  [{ id: 'f1', large: true }],
  [{ id: 'f1' }, { id: 'b1' }],
  [{ id: 'f1', large: true }, { id: 'b1' }],
  [{ id: 'f1' }, { id: 'f2' }, { id: 'b1' }, { id: 'b2' }],
  [{ id: 'f1', large: true }, { id: 'f2' }, { id: 'b1' }],
  [{ id: 'f2' }, { id: 'f1', large: true }, { id: 'b1' }, { id: 'b2' }],
  [{ id: 'f1', boss: true, large: true }, { id: 'b1', reserve: true }, { id: 'b2', reserve: true }],
  [{ id: 'f1', boss: true, large: true }, { id: 'f2', large: true }, { id: 'b1' }, { id: 'b2', reserve: true }],
  [{ id: 'f1', boss: true, large: true }, { id: 'f2' }, { id: 'b1' }],
];
const plans = formations.flatMap(lanes => encounters.map(foes => slotPlan(party(lanes), foes, new Set(['b1', 'b2']))));
// Every encounter of the game with five heroes (3 front/2 back and 2 front/3 back), every reserve called.
const fives: readonly (readonly HeroColumn[])[] = [['front', 'front', 'front', 'back', 'back'], ['front', 'front', 'back', 'back', 'back']];
const called = (d: typeof catalog[number]) => new Set(d.enemies.filter(e => e.reserve).map(e => e.id));
const real = fives.flatMap(lanes => catalog.map(d => ({ d, plan: slotPlan(party(lanes), d.enemies, called(d)) })));

describe('adaptive front-arc battlefield geometry', () => {
  it('keeps the original tactical rows, including a boss between front minions and reserve cells', () => {
    const plan = slotPlan(party(['front', 'front', 'front', 'back', 'back']), [
      { id: 'f1', boss: true, large: true }, { id: 'f2' }, { id: 'f3' }, { id: 'b1' }, { id: 'b2', reserve: true },
    ], new Set(['b2']));
    expect([4, 5, 10].map(i => plan.rows.get(i))).toEqual([1, 2, 0]);
    expect(plan.large.has(4)).toBe(true); expect(plan.used).toHaveLength(10);
    expect([2, 9, 3].map(i => plan.rows.get(i))).toEqual([0, 1, 2]);
  });
  it('reserves a clear front HP/status band across every row, including the enlarged boss', () => {
    const five: Foe[] = [{ id: 'f1', boss: true, large: true }, { id: 'f2' }, { id: 'f3' }, { id: 'b1' }, { id: 'b2' }];
    const allPlans = [...plans, ...real.map(r => r.plan), slotPlan(party(['front', 'front', 'front', 'back', 'back']), five, new Set())];
    for (const width of [308, 378, 468]) for (const height of [128, 215, 287, 481, 597]) for (const plan of allPlans) {
      const slots = fieldSlots(width, height, plan);
      for (const i of plan.used) {
        const a = slots[i]!;
        expect(a.body.y).toBeGreaterThanOrEqual(0);
        expect(a.panel.y).toBeGreaterThan(a.y);
        expect(a.panel.x).toBeGreaterThanOrEqual(0); expect(a.panel.x + a.panel.width).toBeLessThanOrEqual(width);
        expect(a.panel.y + a.panel.height).toBeLessThanOrEqual(height);
        expect(a.label).toBeUndefined();
        for (const j of plan.used) if (i !== j) {
          expect(intersects(a.panel, slots[j]!.panel), `${width}x${height} panels ${i}/${j}`).toBe(false);
          // Owner 2026-11-18: a top row may come down beside the other side's large figure; there only its painted
          // middle three quarters must stay clear of the drawn track and the status band under it.
          const b = slots[j]!.body, other = (i >= 4 && i <= 7 || i >= 10) !== (j >= 4 && j <= 7 || j >= 10);
          const bar = Math.min(a.panel.width, 72), track = { x: a.panel.x + (a.panel.width - bar) / 2, y: a.panel.y, width: bar, height: a.panel.height + a.statusBand };
          expect(other && plan.large.has(j) ? intersects(track, { x: b.x + b.width * .125, y: b.y, width: b.width * .75, height: b.height }) : intersects({ ...a.panel, height: a.panel.height + a.statusBand }, b),
            `${width}x${height} panel ${i}/body ${j}`).toBe(false);
        }
      }
    }
  });
  it('brings a side\'s top row down to its own middle row, under a status band (owner 2026-11-18)', () => {
    const plan = slotPlan(party(['front', 'front', 'front', 'back', 'back']), [{ id: 'f1', large: true }, { id: 'b1' }], new Set());
    const slots = fieldSlots(378, 481, plan);
    expect(slots[2]!.statusBand).toBe(13); expect(slots[2]!.maxIcons).toBeGreaterThan(1);
    const gap = (top: number, below: number) => slots[below]!.body.y - (slots[top]!.panel.y + slots[top]!.panel.height + slots[top]!.statusBand);
    // The heroes' top-to-middle gap matches their middle-to-bottom gap although the middle row holds a large foe.
    expect(gap(2, 9)).toBeCloseTo(gap(9, 3), 0);
  });
  it('keeps a 1.5× boss on a tall phone and caps scale on a short phone before shrinking normal figures below 44px', () => {
    const plan = slotPlan(party(['front', 'front', 'front', 'back', 'back']), [
      { id: 'f1', boss: true, large: true }, { id: 'f2' }, { id: 'f3' }, { id: 'b1' }, { id: 'b2' },
    ], new Set());
    const tall = fieldSlots(378, 481, plan), short = fieldSlots(308, 215, plan);
    expect(tall[4]!.size / tall[2]!.size).toBe(1.5);
    // A boss with b1 behind it (no longer in content, owner 2026-11-20) keeps its front cell; without one it stands at
    // the exact centre of the foes' half.
    expect(tall[4]!.x).toBe(378 * .63);
    const centred = slotPlan(party(['front', 'front', 'front', 'back', 'back']), [
      { id: 'f1', boss: true, large: true }, { id: 'f2' }, { id: 'f3' }, { id: 'b2' }, { id: 'b3' },
    ], new Set());
    expect(fieldSlots(378, 481, centred)[4]!.x).toBeCloseTo(378 * (.63 + .885) / 2, 6);
    expect(short[4]!.size / short[2]!.size).toBeLessThan(1.5);
    expect(short[2]!.size).toBeGreaterThanOrEqual(44);
    // Inspection/death never changes a slot; reserves also prevent borrowing an occupied middle cell.
    const occupied = slotPlan(party(['front', 'back']), [{ id: 'f1', boss: true }, { id: 'b1', reserve: true }], new Set(['b1']));
    expect(fieldSlots(378, 481, occupied)[4]!.x).toBe(378 * .63);
  });
});

describe('foe lines and shared rows (owner 2026-11-20)', () => {
  it('stands both foes of a line in one row, every line where foeLineRows puts it, a boss centred with nobody behind', () => {
    for (const { d, plan } of real) {
      const rows = foeLineRows(d.enemies);
      for (const e of d.enemies) expect(plan.rows.get(FOE_SLOT_INDEX[e.id]!), `${d.id} ${e.id}`).toBe(rows.get(Number(e.id[1])));
      const boss = d.enemies.find(e => e.boss);
      expect([...plan.centre]).toEqual(boss ? [FOE_SLOT_INDEX[boss.id]] : []);
      if (boss) expect(rows.get(1)).toBe(1);
      for (const [width, height] of [[390, 380], [308, 215], [468, 597]] as const) {
        const slots = fieldSlots(width, height, plan);
        // Heroes and foes of one row stand on one line, so the two sides' rows match.
        for (const row of [0, 1, 2]) expect(new Set(plan.used.filter(i => plan.rows.get(i) === row).map(i => slots[i]!.y)).size, `${d.id} ${width}x${height} row ${row}`).toBeLessThanOrEqual(1);
        if (boss) expect(slots[FOE_SLOT_INDEX[boss.id]!]!.x).toBeCloseTo(width * (.63 + .885) / 2, 6);
      }
    }
  });
  it('spaces the three rows evenly when the field has room (the vanguard captain at the 390px phone)', () => {
    const d = catalog.find(e => e.id === 'vanguard-captain')!;
    const plan = slotPlan(party(['front', 'front', 'front', 'back', 'back']), d.enemies, called(d));
    const slots = fieldSlots(390, 380, plan);
    expect(slots[9]!.y - slots[2]!.y).toBeCloseTo(slots[3]!.y - slots[9]!.y, 6);
    // The captain's hunter stands at the top of the back column, the guard and the reserve hunter share the bottom row.
    expect([FOE_SLOT_INDEX.b3, FOE_SLOT_INDEX.f2, FOE_SLOT_INDEX.b2].map(i => plan.rows.get(i!))).toEqual([0, 2, 2]);
  });
});

describe('spear shove stand slots (save v50)', () => {
  it('swaps a shoved foe with its partner while both stand, uses the back slot without one, and returns after', () => {
    const swapped = { enemies: [{ id: 'f1', hp: 9, shoved: { partnerId: 'b1' } }, { id: 'b1', hp: 9 }, { id: 'f2', hp: 9 }] };
    expect(['f1', 'b1', 'f2'].map(id => standSlotId(swapped, id))).toEqual(['b1', 'f1', 'f2']);
    expect(standSlotId({ enemies: [{ id: 'f2', hp: 9, shoved: {} }] }, 'f2')).toBe('b2');
    // A fallen shoved foe no longer holds its partner forward.
    expect(standSlotId({ enemies: [{ id: 'f1', hp: 0, shoved: { partnerId: 'b1' } }, { id: 'b1', hp: 9 }] }, 'b1')).toBe('b1');
    expect(standSlotId({ enemies: [{ id: 'f1', hp: 9 }, { id: 'b1', hp: 9 }] }, 'f1')).toBe('f1');
  });
});
