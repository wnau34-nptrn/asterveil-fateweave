import { describe, expect, it } from 'vitest';
import { fieldSlots, slotPlan, type FieldBox } from '../src/game/visuals/field-layout';

const intersects = (a: FieldBox, b: FieldBox) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('reserved battlefield unit panels', () => {
  it('keeps every HP/status panel clear of all eight bodies and other panels across phone and PC arena sizes', () => {
    for (const width of [296, 308, 348, 378, 418, 468]) for (const height of [120, 128, 144, 149, 150, 156, 179, 180, 193, 259, 260, 379, 455, 650]) {
      for (const slots of [fieldSlots(width, height), fieldSlots(width, height, new Set([4, 5, 6, 7]))].map(all => all.slice(0, 8))) for (const [i, a] of slots.entries()) {
        expect(a.size).toBeGreaterThanOrEqual(44);
        expect(a.panel.x).toBeGreaterThanOrEqual(0);
        expect(a.panel.x + a.panel.width).toBeLessThanOrEqual(width);
        expect(a.panel.y + a.panel.height).toBeLessThanOrEqual(height);
        for (const [j, b] of slots.entries()) {
          expect(intersects(a.panel, b.body), `${width}×${height}: panel ${i} covers body ${j}`).toBe(false);
          if (i !== j) expect(intersects(a.panel, b.panel), `${width}×${height}: panels ${i}/${j}`).toBe(false);
        }
      }
    }
  });
  it('draws large foes about 1.5 times taller with heads inside the field on phone arenas', () => {
    for (const height of [379, 455, 650]) {
      const slots = fieldSlots(378, height, new Set([4, 7]));
      expect(slots[4]!.size / slots[5]!.size).toBeGreaterThanOrEqual(1.45);
      expect(slots[2]!.size).toBeGreaterThanOrEqual(76);
      for (const s of slots) expect(s.body.y).toBeGreaterThanOrEqual(-1);
    }
  });
  it('retains front/rear lane order and reserves a bounded overflow row on short fields', () => {
    for (const height of [144, 193, 455]) {
      const slots = fieldSlots(308, height);
      expect(slots[2]!.x).toBeGreaterThan(slots[0]!.x);
      expect(slots[2]!.y).toBeGreaterThan(slots[0]!.y);
      expect(slots[3]!.y).toBeGreaterThan(slots[1]!.y);
      for (const s of slots) expect((s.maxIcons + 1) * s.iconSize + s.maxIcons * 2).toBeLessThanOrEqual(s.panel.width);
    }
  });
  it('stands a lone unit of a column in the middle row with its panel clear of every body', () => {
    for (const height of [379, 455, 650]) {
      const slots = fieldSlots(378, height, new Set([4]), new Set([4]));
      expect(slots[4]!.y).toBeGreaterThan(slots[6]!.y); expect(slots[4]!.y).toBeLessThan(slots[7]!.y);
      expect(slots[4]!.panel.width).toBeGreaterThanOrEqual(70);
      for (const [j, b] of slots.entries()) if (j !== 5) expect(intersects(slots[4]!.panel, b.body), `${height}: body ${j}`).toBe(false);
    }
  });
  it('stacks a column of three heroes at full size, panels clear of every standing body, for 3/1 and 1/3', () => {
    const foes = [{ id: 'f1' }, { id: 'f2' }, { id: 'b1', large: true }, { id: 'b2' }];
    for (const lanes of [['front', 'front', 'front', 'back'], ['front', 'back', 'back', 'back']] as const) {
      const plan = slotPlan(['a', 'b', 'c', 'd'].map((id, i) => ({ id, lane: lanes[i]! })), foes, new Set());
      expect(plan.trio.size).toBe(1); expect(new Set(plan.heroSlots.values()).size).toBe(4);
      for (const width of [296, 348, 378, 468]) for (const height of [120, 150, 193, 259, 260, 379, 455, 650]) {
        const all = fieldSlots(width, height, plan.large, plan.centered, plan.trio); const used = plan.used.map(i => [i, all[i]!] as const);
        const trio = [...plan.heroSlots.values()].filter(i => lanes.filter(l => l === lanes[[...plan.heroSlots.values()].indexOf(i)]).length === 3);
        for (const i of trio) {
          expect(all[i]!.size).toBeGreaterThanOrEqual(44); expect(all[i]!.body.y, `${width}×${height} top`).toBeGreaterThanOrEqual(-1);
          if (height >= 260) { expect(all[i]!.size).toBe(all[5]!.size); expect(all[i]!.panel.width, `${width}×${height} panel ${i}`).toBeGreaterThanOrEqual(40); }
        }
        for (const [i, a] of used) {
          expect(a.panel.x).toBeGreaterThanOrEqual(0); expect(a.panel.y + a.panel.height).toBeLessThanOrEqual(height);
          for (const [j, b] of used) {
            // A large foe in the back row may pass behind a neighbour's panel only when centred (existing rule).
            if (!(plan.centered.has(j) && plan.large.has(j))) expect(intersects(a.panel, b.body), `${lanes} ${width}×${height}: panel ${i} covers body ${j}`).toBe(false);
            if (i !== j) expect(intersects(a.panel, b.panel), `${lanes} ${width}×${height}: panels ${i}/${j}`).toBe(false);
          }
        }
      }
    }
  });
  it('stacks a column of three in line at full size when the field is tall enough (390×844 compact HUD: 513px)', () => {
    for (const column of ['front', 'back'] as const) {
      const lone = column === 'front' ? 0 : 2, ids = column === 'front' ? [2, 9, 3] : [0, 8, 1];
      const s = fieldSlots(378, 513, new Set(), new Set([lone]), new Set([column])), full = fieldSlots(378, 513);
      expect(new Set(ids.map(i => s[i]!.x)).size).toBe(1);
      for (const i of ids) expect(s[i]!.size).toBe(full[2]!.size);
      expect(s[lone]!.y).toBe(s[ids[1]!]!.y);
      expect(s[ids[0]!]!.body.y).toBeGreaterThanOrEqual(0);
    }
  });
  it('stands a boss in the middle row even with a column partner, which stands below it at the normal size', () => {
    const foes = [{ id: 'f1', boss: true, large: true }, { id: 'f2', large: true }, { id: 'b1' }, { id: 'b2', reserve: true }];
    for (const lanes of [['front', 'front', 'back', 'back'], ['front', 'front', 'front', 'back']] as const) for (const height of [379, 455, 513, 650]) {
      const plan = slotPlan(['a', 'b', 'c', 'd'].map((id, i) => ({ id, lane: lanes[i]! })), foes, new Set(['b2']));
      const s = fieldSlots(378, height, plan.large, plan.centered, plan.trio, plan.escorted);
      expect(plan.large.has(5)).toBe(false);
      expect(s[4]!.y).toBeGreaterThan(s[6]!.y); expect(s[4]!.y).toBeLessThan(s[5]!.y);
      expect(s[4]!.body.y).toBeGreaterThanOrEqual(0);
      expect(intersects(s[4]!.panel, s[5]!.body)).toBe(false);
      if (height === 513 && lanes[2] === 'front') expect([s[2]!.y, s[3]!.y, s[0]!.y]).toEqual([s[6]!.y, s[5]!.y, s[4]!.y]);
    }
  });
});
