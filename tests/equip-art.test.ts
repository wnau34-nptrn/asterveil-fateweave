import { describe, expect, it } from 'vitest';
import { gearCell, equipAtlasSize, potionCell, emblemCell } from '../src/game/visuals/equip-art';
import frames from '../src/game/visuals/equip/gear_items.json';
import { SET_IDS, POTION_IDS, type Item } from '../src/core/world/types';
import { encounterById } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { heroCatalog } from '../src/core/world/world';
import { RARITIES } from '../src/core/world/equipment';
import { gearArt } from '../src/ui/equip-art';

const slots = ['head', 'body', 'gloves', 'boots', 'charm'] as const;
const heroes = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann', 'lio'];
// C12 Batch 1 classes keep their single ART-UI-EQUIP-001-style weapon until tiered art is delivered.
const singleWeapon = ['metta', 'thiran', 'lalin', 'wila'];
const atlas: Record<string, { x: number; y: number; w: number; h: number }> = frames;
const position = (name: string) => {
  expect(atlas[name], `missing frame ${name}`).toBeDefined();
  return { col: atlas[name]!.x / 128, row: atlas[name]!.y / 128 };
};
const tiers = ['worn', 'worn', 'fine', 'master', 'master'];

describe('painted equipment mapping', () => {
  it('covers every class the game can create', () => {
    expect([...heroes, ...singleWeapon].sort()).toEqual(heroCatalog(encounterById, map).map(h => h.id).sort());
  });
  it('keeps each set emblem and each potion/material frame distinct', () => {
    expect(new Set(SET_IDS.map(s => emblemCell(s).col)).size).toBe(SET_IDS.length);
    const painted = POTION_IDS.filter(id => id !== 'calm');
    expect(new Set([...painted, 'dust', 'gold'].map(id => potionCell(id as 'dust').col)).size).toBe(painted.length + 2);
  });
  it('matches the actual five zero-based rarities', () => expect(RARITIES).toBe(tiers.length));
  for (const slot of slots) for (let rarity = 0; rarity < RARITIES; rarity++) {
    it(`${slot} rarity ${rarity} uses ${tiers[rarity]}`, () => {
      expect(gearCell({ slot, rarity })).toEqual(position(`gear_${slot}_${tiers[rarity]}`));
    });
  }
  for (const set of SET_IDS) for (const slot of slots) {
    it(`${set} ${slot} keeps its motif at every rarity`, () => {
      for (let rarity = 0; rarity < RARITIES; rarity++) {
        expect(gearCell({ slot, rarity, set })).toEqual(position(`gear_${slot}_set_${set}`));
      }
    });
  }
  for (const hero of heroes) for (let rarity = 0; rarity < RARITIES; rarity++) {
    it(`${hero} weapon rarity ${rarity} takes precedence over set`, () => {
      const tier = [1, 1, 2, 3, 3][rarity];
      expect(gearCell({ slot: 'weapon', hero, rarity, set: 'dawn' })).toEqual(position(`weapon_${hero}_${tier}`));
    });
  }
  for (const hero of singleWeapon) {
    it(`${hero} weapon uses its single painted frame at every rarity`, () => {
      for (let rarity = 0; rarity < RARITIES; rarity++) {
        expect(gearCell({ slot: 'weapon', hero, rarity, set: 'dawn' })).toEqual(position(`weapon_${hero}`));
      }
    });
  }
  for (const boss of ['aegis', 'focus', 'lantern'] as const) {
    it(`${boss} relic takes precedence over set`, () => {
      expect(gearCell({ slot: 'charm', rarity: 4, set: 'dawn', boss })).toEqual(position(`boss_${boss}`));
    });
  }
  it('keeps all 82 designs in distinct cells', () => {
    const names = [
      ...singleWeapon.map(hero => `weapon_${hero}`),
      ...slots.flatMap(slot => ['worn', 'fine', 'master', ...SET_IDS.map(set => `set_${set}`)].map(suffix => `gear_${slot}_${suffix}`)),
      ...heroes.flatMap(hero => [1, 2, 3].map(tier => `weapon_${hero}_${tier}`)),
      ...['aegis', 'focus', 'lantern'].map(boss => `boss_${boss}`),
    ];
    expect(new Set(names.map(name => JSON.stringify(position(name)))).size).toBe(82);
  });
  it('falls back to the legacy frame when new art is absent', () => {
    const cases = [
      { item: { slot: 'head', rarity: 0 }, name: 'gear_head_worn', legacy: 'gear_head' },
      { item: { slot: 'body', rarity: 2, set: 'dawn' }, name: 'gear_body_set_dawn', legacy: 'gear_body' },
      { item: { slot: 'weapon', rarity: 4, hero: 'tracer' }, name: 'weapon_tracer_3', legacy: 'weapon_tracer' },
      { item: { slot: 'charm', rarity: 4, boss: 'focus' }, name: 'boss_focus', legacy: 'gear_charm' },
    ] as const;
    for (const { item, name, legacy } of cases) {
      const original = atlas[name]!;
      try { delete atlas[name]; expect(gearCell(item)).toEqual(position(legacy)); }
      finally { atlas[name] = original; }
    }
    expect(gearCell({ slot: 'weapon', rarity: 2 })).toBeUndefined();
    expect(gearCell({ slot: 'weapon', rarity: 2, hero: 'unknown' })).toBeUndefined();
  });
  it('sizes the CSS atlas from the complete JSON bounds', () => {
    const cols = Math.max(...Object.values(frames).map(f => f.x + f.w)) / 128;
    const rows = Math.max(...Object.values(frames).map(f => f.y + f.h)) / 128;
    expect(equipAtlasSize.gear_items).toEqual({ cols, rows });
    const item: Item = { uid: 1, slot: 'charm', rarity: 4, level: 1, affixes: [], boss: 'lantern' };
    expect(gearArt(item)).toContain(`--cols:${cols};--rows:${rows};`);
  });
});
