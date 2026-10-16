import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { parseGame, saveGame, loadGame } from '../src/core/save/expedition-save';
import { itemStats, itemValid, salvageValue } from '../src/core/world/equipment';
import { enhance, enhanceCost, enhanceReason, findItem, fuse, fuseMaterials, fuseReason, reroll, rerollReason } from '../src/core/world/forge';
import { equip, newProfile } from '../src/core/world/profile';
import type { Item, Profile } from '../src/core/world/types';

// Forge (2D-4, docs/EXPEDITION_DESIGN.md "Forge").
const f = map.equipment.forge;
const item = (patch: Partial<Item>): Item => ({ uid: 1, slot: 'body', rarity: 0, level: 5, affixes: [], ...patch });
const rich = (items: Item[], patch: Partial<Profile> = {}): Profile => ({ ...newProfile(map, 9), items, nextItem: 100, bank: { ore: 9999, seal: 9, dust: 9999 }, ...patch });
const ids = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann', 'lio'];

describe('enhance', () => {
  it('always succeeds, costs ore and dust, raises base stats 6% per level and stops at the rarity cap', () => {
    let p = rich([item({})]);
    expect(enhanceCost(map, item({}))).toEqual({ ore: 4, dust: 1 });
    expect(enhanceCost(map, item({ plus: 3 }))).toEqual({ ore: 7, dust: 2 });
    for (let i = 0; i < f.plusCap[0]!; i++) p = enhance(p, map, 1).profile;
    const done = p.items[0]!;
    expect(done.plus).toBe(5); expect(enhanceReason(p, map, 1)).toBe('maxed');
    expect(itemStats(map.equipment, done).hp).toBe(Math.round(15 * 1.3));
    expect(p.bank.ore).toBe(9999 - (4 + 5 + 6 + 7 + 8)); expect(p.bank.dust).toBe(9999 - (1 + 1 + 2 + 2 + 3));
    expect(itemValid(map, done, ids)).toBe(true);
    expect(enhanceReason(rich([item({})], { bank: { ore: 3, seal: 0, dust: 9 } }), map, 1)).toBe('ore');
    expect(enhanceReason(rich([item({})], { bank: { ore: 9, seal: 0, dust: 0 } }), map, 1)).toBe('dust');
  });
  it('works on a worn piece; affixes are not raised; salvage returns extra dust per level', () => {
    let p = equip(rich([item({ rarity: 1, affixes: ['hp'] })]), 'guardian', 1).profile;
    p = enhance(p, map, 1).profile;
    expect(findItem(p, 1)).toMatchObject({ owner: 'guardian', item: { plus: 1 } });
    expect(itemStats(map.equipment, findItem(p, 1)!.item)).toEqual({ hp: Math.round(15 * 1.06) + 8 });
    expect(salvageValue(map, item({ rarity: 1, plus: 4 }))).toEqual({ ore: 3, dust: 2 + 4 });
  });
});

describe('fuse', () => {
  it('three of one slot and rarity become the main piece one rarity up; it keeps its set, class and level and gains an affix', () => {
    const main = item({ uid: 1, rarity: 1, affixes: ['hp'], set: 'thorn', plus: 5, level: 8 });
    let p = rich([main, item({ uid: 2, rarity: 1, affixes: ['attack'], plus: 2 }), item({ uid: 3, rarity: 1, affixes: ['skill'] }), item({ uid: 4, rarity: 1, affixes: ['heal'] }), item({ uid: 5, slot: 'head', rarity: 1, affixes: ['hp'] })]);
    // The cheapest matching pieces are used: no enhance first.
    expect(fuseMaterials(p, map, 1).map(i => i.uid)).toEqual([3, 4]);
    p = fuse(p, map, 1).profile;
    const up = findItem(p, 1)!.item;
    expect(up).toMatchObject({ rarity: 2, set: 'thorn', level: 8, plus: 2 }); expect(up.affixes[0]).toBe('hp'); expect(up.affixes).toHaveLength(2);
    expect(p.items.map(i => i.uid)).toEqual([1, 2, 5]); expect(p.forge).toBeGreaterThan(0);
    expect(itemValid(map, up, ids)).toBe(true);
  });
  it('an epic piece fuses into a legendary with a special; legendary cannot fuse; too few pieces are refused', () => {
    const epic = (uid: number) => item({ uid, rarity: 3, affixes: ['hp', 'attack', 'skill'] });
    const p = fuse(rich([epic(1), epic(2), epic(3)]), map, 1).profile;
    expect(p.items[0]).toMatchObject({ rarity: 4 }); expect(p.items[0]!.special).toBeDefined(); expect(itemValid(map, p.items[0]!, ids)).toBe(true);
    expect(fuseReason(p, map, 1)).toBe('maxed');
    expect(fuseReason(rich([epic(1), epic(2)]), map, 1)).toBe('materials');
  });
  it('a worn main piece can fuse with bag pieces; another class’s weapon can be material', () => {
    const w = (uid: number, hero: string) => item({ uid, slot: 'weapon', hero });
    let p = equip(rich([w(1, 'tracer'), w(2, 'mira'), w(3, 'toma')]), 'tracer', 1).profile;
    p = fuse(p, map, 1).profile;
    expect(p.members.tracer!.gear!.weapon).toMatchObject({ uid: 1, rarity: 1, hero: 'tracer' }); expect(p.items).toEqual([]);
  });
  it('is deterministic from the profile seed and forge counter', () => {
    const make = () => rich([item({ uid: 1 }), item({ uid: 2 }), item({ uid: 3 })]);
    expect(fuse(make(), map, 1).profile).toEqual(fuse(make(), map, 1).profile);
  });
});

describe('reroll', () => {
  it('a seal turns one chosen affix into one the piece does not have; others stay', () => {
    let p = rich([item({ rarity: 2, affixes: ['hp', 'attack'] })]);
    p = reroll(p, map, 1, 1).profile;
    const it = p.items[0]!;
    expect(it.affixes[0]).toBe('hp'); expect(['hp', 'attack']).not.toContain(it.affixes[1]); expect(it.affixes[1]).not.toBe('speed');
    expect(p.bank.seal).toBe(8); expect(itemValid(map, it, ids)).toBe(true);
    expect(rerollReason(rich([item({ rarity: 1, affixes: ['hp'] })], { bank: { ore: 0, seal: 0, dust: 0 } }), map, 1, 0)).toBe('seal');
    expect(rerollReason(p, map, 1, 5)).toBe('unknown');
  });
});

describe('save v11', () => {
  const memory = () => { const v = new Map<string, string>(); return { getItem: (k: string) => v.get(k) ?? null, setItem: (k: string, x: string) => { v.set(k, x); } }; };
  it('keeps enhance levels and the forge counter; v10 data migrates with forge 0', () => {
    let p = rich([item({ uid: 1 }), item({ uid: 2 }), item({ uid: 3 })]); p = enhance(fuse(p, map, 1).profile, map, 1).profile;
    const store = memory(); saveGame(store, { profile: p, run: null });
    const back = loadGame(store, map, lookup)!.profile;
    expect(back.items).toEqual(p.items); expect(back.forge).toBe(p.forge);
    const v10 = JSON.parse(JSON.stringify({ version: 10, profile: newProfile(map, 4), run: null })); delete v10.profile.forge;
    expect(parseGame(JSON.stringify(v10), map, lookup).profile.forge).toBe(0);
    expect(() => parseGame(JSON.stringify({ version: 11, profile: { ...newProfile(map, 4), items: [item({ plus: 9 })], nextItem: 2 }, run: null }), map, lookup)).toThrow();
  });
});
