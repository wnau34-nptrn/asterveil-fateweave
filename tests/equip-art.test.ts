import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { GEAR_SLOTS, POTION_IDS, SET_IDS } from '../src/core/world/types';
import { heroCatalog } from '../src/core/world/world';
import { emblemCell, gearCell, potionCell } from '../src/game/visuals/equip-art';

// ART-UI-EQUIP-001: every piece the rules can create has painted art.
describe('equipment art map', () => {
  it('every class has its weapon frame and every other slot a piece frame, all inside the 5 × 3 atlas', () => {
    for (const h of heroCatalog(lookup, map)) {
      const c = gearCell({ slot: 'weapon', hero: h.id }); expect(c, h.id).toBeDefined();
      expect(c!.row).toBeLessThan(2);
    }
    for (const slot of GEAR_SLOTS.filter(s => s !== 'weapon')) { const c = gearCell({ slot }); expect(c).toEqual(expect.objectContaining({ row: 2 })); }
    expect(new Set(heroCatalog(lookup, map).map(h => JSON.stringify(gearCell({ slot: 'weapon', hero: h.id })))).size).toBe(heroCatalog(lookup, map).length);
  });
  it('each set has an emblem and each potion, veil dust and gold a frame, all distinct', () => {
    expect(new Set(SET_IDS.map(s => emblemCell(s).col)).size).toBe(SET_IDS.length);
    expect(new Set([...POTION_IDS, 'dust', 'gold'].map(id => potionCell(id as 'dust').col)).size).toBe(POTION_IDS.length + 2);
  });
});
