import { expect, it } from 'vitest';
import { MAPS } from '../src/content/world/maps';
import { chapterOne as map } from '../src/content/world/chapter1';
import { newProfile, salvage } from '../src/core/world/profile';
import { craftWeapon, enhanceTo, fuse, raiseItemLevel, smelt, transferAffix, weaponBlueprint } from '../src/core/world/forge';
import { salvageValue } from '../src/core/world/equipment';
import type { Item, Profile } from '../src/core/world/types';

// P04-06 farm budget (docs/validation/p04-06-2026-11-15/README_TH.md): no loop between the forge, salvage and the market
// turns resources into more of themselves, gold only ever comes from play, and the sweep and board pay only the
// resources play already gives (no items, EXP or universal shards before the P09 ledger, OD-17).
const rich = (): Profile => ({ ...newProfile(map, 23), tutorialDone: true, forgeLevel: 10, bank: { ore: 5000, dust: 5000, gold: 500, shard: 50 } });
const value = (p: Profile) => p.bank.ore + 8 * p.bank.dust; // smelting sets the floor: 8 ore buys one dust

it('every forge service ending in salvage returns at most what was paid', () => {
  for (let level = 1; level <= 10; level++) {
    const p = rich(); let made = craftWeapon(p, map, 'guardian', level).profile;
    made = enhanceTo(made, map, 1, 5).profile; if (level < 10) made = raiseItemLevel(made, map, 1, 10).profile;
    const back = salvage(made, map, [1]).profile;
    expect(back.bank.ore).toBeLessThan(p.bank.ore); expect(back.bank.dust).toBeLessThan(p.bank.dust); expect(back.bank.gold).toBe(p.bank.gold);
  }
  // Fusing three crafted pieces up a rarity and salvaging the result loses the crafts.
  let p = rich(); const start = value(p);
  for (let n = 0; n < 3; n++) p = craftWeapon(p, map, 'guardian', 1).profile;
  p = fuse(p, map, 1, [2, 3]).profile; p = salvage(p, map, [1]).profile;
  expect(value(p)).toBeLessThan(start);
  // An affix transfer pays its fee and refunds only the donor's paid development, never its base salvage.
  const donor: Item = { ...weaponBlueprint(map, 'guardian', 1, 2), rarity: 3, affixes: ['attack', 'leech', 'hp'], q: { main: 100, affixes: [100, 100, 100] } };
  let t: Profile = { ...rich(), items: [{ ...weaponBlueprint(map, 'guardian', 1, 1), rarity: 3, affixes: ['attack', 'armour', 'resist'], q: { main: 100, affixes: [100, 100, 100] } }, donor], nextItem: 3 };
  t = enhanceTo(t, map, 2, 5).profile; const before = value(t) + salvageValue(map, t.items[1]!).ore + 8 * salvageValue(map, t.items[1]!).dust;
  const moved = transferAffix(t, map, 1, 1, 2, 1).profile;
  expect(moved.items).toHaveLength(1); expect(value(moved)).toBeLessThan(before);
});

it('smelting is one-way and capped per return; nothing in the camp pays gold back', () => {
  const p = rich(); const out = smelt(p, map, map.equipment.forge.smeltCap).profile;
  expect(out.bank.ore).toBe(p.bank.ore - map.equipment.forge.smeltCap * map.equipment.forge.smeltOre);
  expect(smelt(out, map, 1).event).toEqual({ type: 'blocked', reason: 'limit' });
  for (const r of map.equipment.salvage) expect(Object.keys(r).sort()).toEqual(['dust', 'ore']);
  expect(map.company.dismissRefund).toBeLessThan(map.company.hireCost);
});

it('the market gear box salvages for less than its gold buys in ore and dust at the smelting rate', () => {
  // 120 gold → at best a legendary piece: 12 ore + 15 dust. Gold has no route back, and one box per return.
  const best = map.equipment.salvage[map.equipment.salvage.length - 1]!;
  expect(map.shop.items.gearbox.limit).toBe(1);
  expect(best.ore + 8 * best.dust).toBeLessThan(map.shop.items.gearbox.price + 30);
});

it('sweep, board and contract rewards stay within resources play already gives', () => {
  const allowed = ['dust', 'gold', 'ore', 'tomes'];
  for (const m of MAPS) {
    for (const r of [m.sweepReward?.normal, m.sweepReward?.hard, m.contract?.reward]) if (r) for (const k of Object.keys(r)) expect(allowed).toContain(k);
  }
  for (const o of [...map.board.daily, ...map.board.weekly]) for (const k of Object.keys(o.reward)) expect(allowed).toContain(k);
});
