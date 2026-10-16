import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { parseGame } from '../src/core/save/expedition-save';
import { boardOffers, buy, buyReason, hire, newProfile, refreshBoard, refreshReason, settle, shopLeft } from '../src/core/world/profile';
import type { Profile } from '../src/core/world/types';
import { newExpedition } from '../src/core/world/world';

// Phase 4A (docs/EXPEDITION_DESIGN.md "Camp market and board refresh").
const rich = (gold = 1000, patch: Partial<Profile> = {}): Profile => ({ ...newProfile(map, 9), ...patch, bank: { ore: 0, gold, seal: 0, dust: 0 } });

describe('paid hiring-board refresh', () => {
  it('redraws the board twice per return at rising prices, clears hired marks, and resets on return', () => {
    let p = rich(); const first = boardOffers(p, map, lookup);
    p = hire(p, map, lookup, 0).profile; expect(p.taken).toEqual([0]);
    const [c1, c2] = map.shop.refreshCosts; const gold = p.bank.gold;
    let r = refreshBoard(p, map); expect(r.event).toEqual({ type: 'refreshed' }); p = r.profile;
    expect(p.bank.gold).toBe(gold - c1!); expect(p.taken).toEqual([]); expect(p.refreshes).toBe(1);
    const second = boardOffers(p, map, lookup); expect(second).not.toEqual(first);
    p = refreshBoard(p, map).profile; expect(p.bank.gold).toBe(gold - c1! - c2!);
    expect(refreshReason(p, map)).toBe('limit'); expect(refreshBoard(p, map).event).toEqual({ type: 'blocked', reason: 'limit' });
    const home = settle(p, newExpedition(map, lookup, 3), 'withdrawn', map);
    expect(home.refreshes).toBe(0); expect(refreshReason(home, map)).toBe('');
    expect(refreshReason(rich(c1! - 1), map)).toBe('gold');
  });
  it('without a refresh the board is unchanged from before 4A (same offers for the same returns)', () => {
    const p = rich(); expect(boardOffers(p, map, lookup)).toEqual(boardOffers({ ...p, refreshes: 0 }, map, lookup));
  });
});

describe('camp market', () => {
  it('sells seals and repel within the per-return limit', () => {
    let p = rich(); const seal = map.shop.items.seal;
    for (let i = 0; i < seal.limit; i++) p = buy(p, map, 'seal').profile;
    expect(p.bank.seal).toBe(seal.limit); expect(p.bank.gold).toBe(1000 - seal.price * seal.limit);
    expect(shopLeft(p, map, 'seal')).toBe(0); expect(buyReason(p, map, 'seal')).toBe('limit');
    p = buy(p, map, 'repel').profile; expect(p.potions.repel).toBe(1);
    expect(buyReason(rich(10), map, 'seal')).toBe('gold');
    expect(settle(p, newExpedition(map, lookup, 3), 'complete', map).shop).toEqual({});
  });
  it('the contract adds a duplicate to a chosen member, never past max stars', () => {
    const p = rich(); const id = p.company[0]!;
    const r = buy(p, map, 'contract', id); expect(r.event).toEqual({ type: 'bought', item: 'contract', heroId: id });
    expect(r.profile.members[id]!.dupes).toBe(p.members[id]!.dupes + 1);
    expect(buyReason(p, map, 'contract')).toBe('hero'); expect(buyReason(p, map, 'contract', 'nobody')).toBe('hero');
    const maxed = { ...p, members: { ...p.members, [id]: { ...p.members[id]!, stars: map.company.maxStars } } };
    expect(buyReason(maxed, map, 'contract', id)).toBe('maxed');
  });
  it('the gear box gives a rare-or-better piece at the company\'s highest level, fixed by the profile\'s roll counter', () => {
    const id = newProfile(map, 9).company[1]!;
    const p = rich(1000); p.members[id] = { ...p.members[id]!, level: 6 };
    const a = buy(p, map, 'gearbox'); const b = buy(p, map, 'gearbox');
    expect(a).toEqual(b);
    const e = a.event; if (e.type !== 'bought') throw new Error('expected a purchase');
    const item = a.profile.items.find(i => i.uid === e.uid)!;
    expect(item.rarity).toBeGreaterThanOrEqual(2); expect(item.level).toBe(6); expect(a.profile.forge).toBeGreaterThan(p.forge);
    const full = { ...p, items: Array.from({ length: map.equipment.bagCap }, (_, i) => ({ ...item, uid: 100 + i })), nextItem: 200 };
    expect(buyReason(full, map, 'gearbox')).toBe('bag');
  });
});

describe('save v17', () => {
  it('round-trips purchases and refreshes, rejects impossible values, and migrates v16 with none', () => {
    const p = { ...rich(), shop: { seal: 2, contract: 1 }, refreshes: 1 };
    const raw = (profile: unknown, version = 17) => JSON.stringify({ version, profile, run: null });
    const g = parseGame(raw(p), map, lookup); expect(g.profile.shop).toEqual({ seal: 2, contract: 1 }); expect(g.profile.refreshes).toBe(1);
    expect(() => parseGame(raw({ ...p, shop: { seal: map.shop.items.seal.limit + 1 } }), map, lookup)).toThrow();
    expect(() => parseGame(raw({ ...p, shop: { gems: 1 } }), map, lookup)).toThrow();
    expect(() => parseGame(raw({ ...p, refreshes: map.shop.refreshCosts.length + 1 }), map, lookup)).toThrow();
    const old = rich() as Partial<Profile>; delete old.shop; delete old.refreshes;
    const m = parseGame(raw(old, 16), map, lookup); expect(m.profile.shop).toEqual({}); expect(m.profile.refreshes).toBe(0);
  });
});
