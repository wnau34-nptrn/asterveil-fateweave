import { describe, expect, it } from 'vitest';
import { fieldSlots, slotPlan, standSlotId, type FieldBox, type HeroColumn } from '../src/game/visuals/field-layout';

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
    const allPlans = [...plans, slotPlan(party(['front', 'front', 'front', 'back', 'back']), five, new Set())];
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
          expect(intersects(a.panel, slots[j]!.body), `${width}x${height} panel ${i}/body ${j}`).toBe(false);
        }
      }
    }
  });
  it('keeps a 1.5× boss on a tall phone and caps scale on a short phone before shrinking normal figures below 44px', () => {
    const plan = slotPlan(party(['front', 'front', 'front', 'back', 'back']), [
      { id: 'f1', boss: true, large: true }, { id: 'f2' }, { id: 'f3' }, { id: 'b1' }, { id: 'b2' },
    ], new Set());
    const tall = fieldSlots(378, 481, plan), short = fieldSlots(308, 215, plan);
    expect(tall[4]!.size / tall[2]!.size).toBe(1.5);
    expect(tall[4]!.x).toBeGreaterThan(378 * .63);
    expect(short[4]!.size / short[2]!.size).toBeLessThan(1.5);
    expect(short[2]!.size).toBeGreaterThanOrEqual(44);
    // Inspection/death never changes a slot; reserves also prevent borrowing an occupied middle cell.
    const occupied = slotPlan(party(['front', 'back']), [{ id: 'f1', boss: true }, { id: 'b1', reserve: true }], new Set(['b1']));
    expect(fieldSlots(378, 481, occupied)[4]!.x).toBe(378 * .63);
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
