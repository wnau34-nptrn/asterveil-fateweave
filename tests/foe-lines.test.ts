import { describe, expect, it } from 'vitest';
import { eliteBriarLord, encounters, thornHost, wbMorvane } from '../src/content/encounters/catalog';
import { chapterOne } from '../src/content/world/chapter1';
import { bossRole } from '../src/core/world/world';
import { createBattle, encounterProblems, foeNeighbours } from '../src/core/battle/engine';
import { foeLineRows } from '../src/core/battle/foe-lines';

const near = (d: typeof thornHost, id: string) => foeNeighbours(createBattle(d), d, id).map(e => e.id);

describe('foe lines (owner 2026-11-20)', () => {
  it('puts a boss line in the middle with line 3 above and line 2 below; without a boss 1 top, 3 middle, 2 bottom', () => {
    expect([...foeLineRows([{ id: 'f1', boss: true }, { id: 'f2' }, { id: 'b3' }])].sort()).toEqual([[1, 1], [2, 2], [3, 0]]);
    expect([...foeLineRows([{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }, { id: 'b2' }])].sort()).toEqual([[1, 0], [2, 2], [3, 1]]);
    expect([...foeLineRows([{ id: 'f1' }, { id: 'b2' }])].sort()).toEqual([[1, 0], [2, 2]]);
    expect([...foeLineRows([{ id: 'f2' }, { id: 'b2' }])]).toEqual([[2, 1]]);
    // Two lines with one large foe: its line stands at the bottom, under the empty middle row.
    expect([...foeLineRows([{ id: 'f1', large: true }, { id: 'f2' }, { id: 'b1' }])].sort()).toEqual([[1, 2], [2, 0]]);
  });
  it('row neighbours are the foes drawn next to each other', () => {
    // Thorn host: f1 top, f3 middle, f2 bottom (before: f1 and f2 were neighbours around the middle f3).
    expect(near(thornHost, 'f1')).toEqual(['f3']);
    expect(near(thornHost, 'f3')).toEqual(['f1', 'f2']);
    expect(near(thornHost, 'f2')).toEqual(['f3']);
    // Morvane: the court's f3 above the boss and f2 below it.
    expect(near(wbMorvane, 'f1')).toEqual(['f3', 'f2']);
    expect(near(wbMorvane, 'f3')).toEqual(['f1']);
  });
  it('a boss reused as an elite gate fights without boss mechanics but keeps the boss row', () => {
    const gate = bossRole(eliteBriarLord, 'elite', chapterOne, 'gate-thicket');
    expect(gate.enemies.find(e => e.id === 'f1')).toMatchObject({ boss: false, leader: true });
    expect(foeLineRows(gate.enemies)).toEqual(foeLineRows(eliteBriarLord.enemies));
  });
  it('every boss keeps at most four escorts (reserves included) and nobody behind it', () => {
    for (const d of encounters.filter(e => e.enemies.some(x => x.boss))) {
      expect(d.enemies.length, d.id).toBeLessThanOrEqual(5);
      expect(d.enemies.some(e => e.id === 'b1'), d.id).toBe(false);
      expect(encounterProblems(d), d.id).toEqual([]);
    }
    const behind = { ...wbMorvane, enemies: [...wbMorvane.enemies, { ...wbMorvane.enemies.find(e => e.id === 'b2')!, id: 'b1' as const }],
      intents: [...wbMorvane.intents, { ...wbMorvane.intents.find(i => i.sourceId === 'b2')!, sourceId: 'b1' as const }] };
    expect(encounterProblems(behind)).toEqual([`${wbMorvane.id}: a foe in the boss's line`]);
  });
});
