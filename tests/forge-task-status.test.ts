import { describe, expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { newProfile } from '../src/core/world/profile';
import { enhanceReason, smeltReason } from '../src/core/world/forge';
import { forgeTaskStatus } from '../src/ui/forge-task-status';
import type { Item } from '../src/core/world/types';

// UX audit P1-5: the forge task chips read the forge's own rule checks.
const piece = (uid: number, extra: Partial<Item> = {}): Item => ({ uid, slot: 'body', rarity: 0, level: 3, affixes: [], ...extra });
describe('forgeTaskStatus', () => {
  it('says there is nothing to work on without gear', () => {
    const p = newProfile(map, 1); p.items = []; for (const m of Object.values(p.members)) m.gear = {};
    for (const t of ['enhance', 'level', 'fuse', 'reroll', 'transfer'] as const) expect(forgeTaskStatus(p, map, t)!.state).toBe('empty');
    expect(forgeTaskStatus(p, map, 'recycle')!.state).toBe('empty');
    expect(forgeTaskStatus(p, map, 'craft')).toBeUndefined();
  });
  it('counts the pieces the enhance rule accepts and names the shortage otherwise', () => {
    const p = newProfile(map, 1); p.items = [piece(1), piece(2)]; p.bank.ore = 0; p.bank.dust = 0;
    expect(forgeTaskStatus(p, map, 'enhance')).toEqual({ state: 'blocked', text: 'แร่หรือฝุ่นไม่พอ' });
    p.bank.ore = 500; p.bank.dust = 100;
    const ok = p.items.filter(i => enhanceReason(p, map, i.uid) === '').length;
    expect(ok).toBeGreaterThan(0);
    expect(forgeTaskStatus(p, map, 'enhance')).toEqual({ state: 'ready', text: `ทำได้ ${ok} ชิ้น` });
    p.items = [piece(3, { plus: map.equipment.forge.plusCap[0]! })];
    expect(forgeTaskStatus(p, map, 'enhance')).toEqual({ state: 'blocked', text: 'ขั้น + เต็มทุกชิ้น' });
  });
  it('follows the smelt rule (ore, quota)', () => {
    const p = newProfile(map, 1); p.bank.ore = 0;
    expect(smeltReason(p, map, 1)).toBe('ore'); expect(forgeTaskStatus(p, map, 'smelt')).toEqual({ state: 'blocked', text: 'แร่ไม่พอ' });
    p.bank.ore = 1000; p.bank.dust = 0; p.smelted = 0;
    expect(forgeTaskStatus(p, map, 'smelt')!.state).toBe('ready');
    p.smelted = map.equipment.forge.smeltCap; expect(forgeTaskStatus(p, map, 'smelt')).toEqual({ state: 'blocked', text: 'ครบโควตารอบนี้' });
  });
  it('never changes the profile', () => {
    const p = newProfile(map, 1); p.items = [piece(1), piece(2)]; p.bank.ore = 500; p.bank.dust = 100; const before = JSON.stringify(p);
    for (const t of ['enhance', 'level', 'fuse', 'reroll', 'transfer', 'craft', 'recycle', 'smelt'] as const) forgeTaskStatus(p, map, t);
    expect(JSON.stringify(p)).toBe(before);
  });
});
