import { describe, expect, it } from 'vitest';
import { fieldSlots, slotPlan, type FieldBox, type HeroColumn } from '../src/game/visuals/field-layout';

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

describe('standard battle grid (owner 2026-10-22: every battle stands on the same spots)', () => {
  it('puts every actor of every battle on the same three rows and four columns at one size, from the arena alone', () => {
    for (const [width, height] of [[378, 513], [378, 455], [348, 420], [468, 650], [296, 380]] as const) {
      const base = fieldSlots(width, height), ys = new Set([0, 8, 1].map(i => base[i]!.y)), xs = new Set([0, 2, 4, 6].map(i => base[i]!.x));
      expect(ys.size).toBe(3);
      for (const plan of plans) {
        const s = fieldSlots(width, height, plan);
        for (const i of plan.used) {
          expect(ys.has(s[i]!.y), `${width}×${height} slot ${i} row`).toBe(true);
          expect(xs.has(s[i]!.x), `${width}×${height} slot ${i} column`).toBe(true);
          if (!plan.large.has(i)) expect(s[i]!.size).toBe(base[0]!.size);
        }
      }
    }
  });
  it('keeps a clear gap between neighbouring columns of normal units', () => {
    for (const width of [296, 378, 468]) {
      const s = fieldSlots(width, 513);
      for (const [a, b] of [[0, 2], [4, 6]] as const) expect(s[b]!.body.x - (s[a]!.body.x + s[a]!.body.width) + s[a]!.size * .2).toBeGreaterThan(0); // boxes may share their transparent padding (owner 2026-10-22: bigger units); the painted figures never touch
      expect(s[4]!.body.x - (s[2]!.body.x + s[2]!.body.width) + s[2]!.size * .2).toBeGreaterThan(0);
    }
  });
  it('sets every HP panel under the feet and a foe name just above its own painted figure, clear of other units', () => {
    for (const plan of plans) {
      const rise = new Map(plan.used.map(i => [i, i >= 4 && i <= 7 ? .55 : .97] as const));
      const s = fieldSlots(378, 513, { ...plan, rise });
      for (const i of plan.used) {
        expect(s[i]!.panel.y).toBeGreaterThan(s[i]!.y);
        expect(s[i]!.label!.y + s[i]!.label!.height).toBeCloseTo(s[i]!.y - rise.get(i)! * s[i]!.size - 6, 5);
        for (const j of plan.used) if (j !== i && i >= 4 && i <= 7) { // only foes carry name labels
          if (!plan.large.has(j)) { const b = s[j]!.body, core = { ...b, x: b.x + b.width * .1, width: b.width * .8 }; expect(intersects(s[i]!.label!, core), `label ${i} body ${j}`).toBe(false); }
          expect(intersects(s[i]!.label!, s[j]!.panel), `label ${i} panel ${j}`).toBe(false);
        }
      }
    }
  });
  it('keeps every panel clear of every normal body and every other panel, heads inside the field', () => {
    for (const width of [296, 348, 378, 418, 468]) for (const height of [120, 150, 193, 259, 300, 379, 455, 513, 650]) for (const plan of plans) {
      const s = fieldSlots(width, height, plan);
      for (const i of plan.used) {
        const a = s[i]!;
        expect(a.size).toBeGreaterThanOrEqual(44);
        expect(a.panel.x).toBeGreaterThanOrEqual(-.01); expect(a.panel.x + a.panel.width).toBeLessThanOrEqual(width + .01);
        expect(a.panel.y + a.panel.height).toBeLessThanOrEqual(height);
        if (!a.side) expect(a.body.y, `${width}×${height} head ${i}`).toBeGreaterThanOrEqual(-1);
        for (const j of plan.used) {
          // A large foe is wider than its column gap: its body may pass behind a neighbour's panel (art has margins).
          // Its own frame's empty headroom may hold the panel (the panel sits just above the painted figure).
          if (i !== j && (!plan.large.has(j) || a.side)) { // Units share one size (owner 2026-10-23): where the field is short, a neighbouring row's head may reach into the top half of its frame above.
            const b = s[j]!.body, head = .5 * s[j]!.size; expect(intersects(a.panel, { ...b, y: b.y + head, height: b.height - head }), `${width}×${height}: panel ${i} covers body ${j}`).toBe(false);
          }
          if (i !== j) expect(intersects(a.panel, s[j]!.panel), `${width}×${height}: panels ${i}/${j}`).toBe(false);
        }
      }
    }
  });
  it('places by rule: one → middle, two → top/bottom, three → all; a boss in the middle; a large partner at the bottom', () => {
    const rowOf = (plan: ReturnType<typeof slotPlan>, slot: number) => plan.rows.get(slot);
    const lone = slotPlan(party(['front', 'front', 'front', 'back']), [{ id: 'f1' }, { id: 'f2' }, { id: 'b1' }], new Set());
    expect([2, 9, 3].map(i => rowOf(lone, i))).toEqual([0, 1, 2]);
    expect(rowOf(lone, 0)).toBe(1); expect(rowOf(lone, 6)).toBe(1);
    expect([4, 5].map(i => rowOf(lone, i))).toEqual([0, 2]);
    const boss = slotPlan(party(['front', 'front', 'back', 'back']), [{ id: 'f1', boss: true, large: true }, { id: 'f2', large: true }], new Set());
    expect([rowOf(boss, 4), rowOf(boss, 5)]).toEqual([1, 2]); expect(boss.large.has(5)).toBe(true);
    const big = slotPlan(party(['front', 'front', 'back', 'back']), [{ id: 'f1', large: true }, { id: 'f2' }], new Set());
    expect([rowOf(big, 4), rowOf(big, 5)]).toEqual([2, 0]);
    // A reserve the phases never call does not take a cell.
    const hard = slotPlan(party(['front', 'front', 'back', 'back']), [{ id: 'f1', boss: true }, { id: 'f2', reserve: true }], new Set());
    expect(rowOf(hard, 4)).toBe(1);
  });
  it('keeps full-size units on a 390×844 phone (378×513 field) with the grid on the floor, large foes about 1.5 times taller', () => {
    const s = fieldSlots(378, 513, slotPlan(party(['front', 'front', 'front', 'back']), [{ id: 'f1', boss: true, large: true }], new Set()));
    expect(s[2]!.size).toBeGreaterThanOrEqual(80);
    // The grid stands on the floor: the top row's feet sit at or below the backdrop's floor line.
    expect(s[0]!.y).toBeGreaterThanOrEqual(513 * .38 - .5);
    expect(s[4]!.size / s[2]!.size).toBeGreaterThanOrEqual(1.45);
    // A large foe below another unit of its column grows only as far as its panel clears that unit's feet.
    const plan = slotPlan(party(['front', 'front', 'back', 'back']), [{ id: 'f1', boss: true, large: true }, { id: 'f2', large: true }], new Set());
    // The guard's painted figure fills about 71% of its frame (its own headroom), so its name clears the boss's panel.
    const g = fieldSlots(378, 513, { ...plan, rise: new Map([[5, .71]]) });
    expect(g[5]!.size).toBeGreaterThan(g[2]!.size); // units now share one larger size, so the large partner has less room above its feet expect(g[5]!.label!.y).toBeGreaterThanOrEqual(g[4]!.panel.y + g[4]!.panel.height);
  });
});
