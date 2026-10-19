import { describe, expect, it } from 'vitest';
import { fieldSlots, type FieldBox } from '../src/game/visuals/field-layout';

const intersects = (a: FieldBox, b: FieldBox) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('reserved battlefield unit panels', () => {
  it('keeps every HP/status panel clear of all six bodies and other panels across phone and PC arena sizes', () => {
    for (const width of [296, 308, 348, 378, 418, 468]) for (const height of [120, 128, 144, 149, 150, 156, 179, 180, 193, 259, 260, 379, 455, 650]) {
      const slots = fieldSlots(width, height);
      for (const [i, a] of slots.entries()) {
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
  it('retains front/rear lane order and reserves a bounded overflow row on short fields', () => {
    for (const height of [144, 193, 455]) {
      const slots = fieldSlots(308, height);
      expect(slots[2]!.x).toBeGreaterThan(slots[0]!.x);
      expect(slots[2]!.y).toBeGreaterThan(slots[0]!.y);
      expect(slots[3]!.y).toBeGreaterThan(slots[1]!.y);
      for (const s of slots) expect((s.maxIcons + 1) * s.iconSize + s.maxIcons * 2).toBeLessThanOrEqual(s.panel.width);
    }
  });
});
