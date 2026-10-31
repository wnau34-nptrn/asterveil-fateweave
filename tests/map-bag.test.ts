import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { loadGame, parseGame, saveGame } from '../src/core/save/expedition-save';
import { depart, equip, newProfile, settle } from '../src/core/world/profile';
import type { ExpeditionState, Item, Profile } from '../src/core/world/types';
import { memberDef, moveMember, swapMembers, takeOff, wear, wearReason } from '../src/core/world/world';
import { runSummary } from '../src/ui/summary-ui';

// Map bag (owner 2026-10-17): wear finds and the company's own gear anywhere outside battle; party changes too.
const item = (patch: Partial<Item>): Item => ({ uid: 0, slot: 'body', rarity: 0, level: 1, affixes: [], ...patch });
const own = item({ uid: 7, slot: 'body', rarity: 1, affixes: ['hp'] });
function start(): { profile: Profile; run: ExpeditionState } {
  let profile: Profile = { ...newProfile(map, 4), tutorialDone: true, items: [own], nextItem: 8 };
  profile = equip(profile, 'guardian', 7).profile;
  const out = depart(profile, map, lookup, 9);
  out.run.found = [item({ rarity: 3, level: 4, affixes: ['hp', 'armour', 'resist'] }), item({ slot: 'weapon', hero: 'tracer', rarity: 0, level: 2 })];
  return out;
}
const busy = (run: ExpeditionState): ExpeditionState => ({ ...run, battle: { kind: 'random', encounterId: map.tutorialEncounterId, entry: {}, commands: [] } });

describe('map bag', () => {
  it('a member wears a find anywhere; the own item it replaces waits in spare; weapons keep their class', () => {
    const { run } = start(); const before = memberDef(lookup, map, run, 'guardian')!.maxHp;
    expect(wearReason(run, 'guardian', 'found', 1)).toBe('class');
    expect(wearReason(busy(run), 'guardian', 'found', 0)).toBe('busy');
    expect(wear(busy(run), map, lookup, 'guardian', 'found', 0).event.type).toBe('blocked');
    const r = wear(run, map, lookup, 'guardian', 'found', 0);
    expect(r.event).toEqual({ type: 'equipped', heroId: 'guardian' });
    expect(r.state.members.guardian!.gear!.body).toMatchObject({ uid: 0, rarity: 3 });
    expect(r.state.spare).toEqual([own]); expect(r.state.found).toHaveLength(1);
    // Gear never heals: the stronger body piece raises the maximum but not the current HP.
    expect(memberDef(lookup, map, r.state, 'guardian')!.maxHp).toBeGreaterThan(before); expect(r.state.hp.guardian).toBe(run.hp.guardian);
    // The tracer's weapon fits the tracer.
    expect(wear(r.state, map, lookup, 'tracer', 'found', 0).state.members.tracer!.gear!.weapon!.hero).toBe('tracer');
  });
  it('taking off sends a find back to found and an own item to spare; HP is capped at the new maximum', () => {
    const { run } = start();
    const off = takeOff(run, map, lookup, 'guardian', 'body');
    expect(off.state.members.guardian!.gear).toBeUndefined(); expect(off.state.spare).toEqual([own]);
    expect(off.state.hp.guardian).toBe(memberDef(lookup, map, off.state, 'guardian')!.maxHp);
    expect(off.state.hp.guardian).toBeLessThan(run.hp.guardian!);
    const back = wear(off.state, map, lookup, 'healer', 'spare', 0).state; expect(back.members.healer!.gear!.body!.uid).toBe(7); expect(back.spare).toEqual([]);
    const find = takeOff(wear(run, map, lookup, 'guardian', 'found', 0).state, map, lookup, 'guardian', 'body').state;
    expect(find.found.map(i => i.rarity)).toEqual([0, 3]); expect(find.spare).toEqual([own]);
    expect(takeOff(busy(run), map, lookup, 'guardian', 'body').event.type).toBe('blocked');
    expect(takeOff(run, map, lookup, 'healer', 'body').event.type).toBe('blocked');
  });
  it('the party can be rearranged away from camps but not in battle', () => {
    const { run } = start(); const away = { ...run, position: { x: 10, y: 22 } };
    const moved = moveMember(away, run.roster.deployed[3]!);
    expect(moved.event.type).toBe('roster');
    expect(swapMembers(moved.state, moved.state.roster.deployed[0]!, moved.state.roster.reserve[0]!).event.type).toBe('roster');
    expect(moveMember(busy(away), run.roster.deployed[3]!).event.type).toBe('blocked');
  });
  it('a finished run brings worn finds home worn, and spare own items to the bag', () => {
    const { profile, run } = start();
    let s = wear(run, map, lookup, 'guardian', 'found', 0).state; s = wear(s, map, lookup, 'tracer', 'found', 0).state;
    const home = settle(profile, s, 'withdrawn', map);
    expect(home.members.guardian!.gear!.body).toMatchObject({ rarity: 3, uid: 8 }); expect(home.members.tracer!.gear!.weapon).toMatchObject({ uid: 9 });
    expect(home.items).toEqual([own]); expect(home.nextItem).toBe(10); expect(home.last).toMatchObject({ items: 2, salvaged: 0 });
    expect(runSummary(profile, s, home, 'withdrawn', map).items.map(i => i.uid)).toEqual([8, 9]);
  });
  it('a wipe keeps only the best find, worn or not; a lost worn find gives the slot back to the own item', () => {
    const { profile, run } = start();
    // Wear the weak weapon, keep the epic body in the bag: the epic comes home in the bag, the weapon is lost.
    let s = wear(run, map, lookup, 'tracer', 'found', 1).state;
    let home = settle(profile, s, 'wiped', map);
    expect(home.members.tracer!.gear).toBeUndefined(); expect(home.items.map(i => i.rarity)).toEqual([3]); expect(home.members.guardian!.gear!.body!.uid).toBe(7);
    // Wear the epic and a weaker find over the own item: the epic stays worn, the other is lost, the own item comes back worn.
    s = wear(run, map, lookup, 'guardian', 'found', 0).state;
    s = { ...s, found: [item({ slot: 'body', level: 9 })] }; s = wear(s, map, lookup, 'healer', 'found', 0).state;
    home = settle(profile, s, 'wiped', map);
    expect(home.members.guardian!.gear!.body).toMatchObject({ rarity: 3 }); expect(home.members.healer!.gear).toBeUndefined();
    expect(home.items).toEqual([own]);
    // Own items always come home, even when the slot is taken by a kept find.
    s = takeOff(run, map, lookup, 'guardian', 'body').state;
    home = settle(profile, s, 'wiped', map);
    expect(home.members.guardian!.gear!.body!.uid).toBe(7); expect(home.items.map(i => i.rarity)).toEqual([3]);
  });
});

describe('save v20', () => {
  const memory = () => { const v = new Map<string, string>(); return { getItem: (k: string) => v.get(k) ?? null, setItem: (k: string, x: string) => { v.set(k, x); } }; };
  it('round-trips worn finds and spare own items', () => {
    const { profile, run } = start();
    let s = wear(run, map, lookup, 'guardian', 'found', 0).state; s = takeOff(s, map, lookup, 'guardian', 'body').state;
    s = wear(s, map, lookup, 'tracer', 'found', 0).state;
    const store = memory(); expect(saveGame(store, { profile, run: s })).toBe(true);
    const back = loadGame(store, map, lookup)!;
    expect(back.run!.members.tracer!.gear).toEqual(s.members.tracer!.gear); expect(back.run!.spare).toEqual([own]); expect(back.run!.found).toEqual(s.found);
  });
  it('rejects a run whose own items do not match the company, and migrates v19 runs with nothing spare', () => {
    const { profile, run } = start();
    const copied = { ...run, spare: [own] };
    expect(() => parseGame(JSON.stringify({ version: 20, profile, run: copied }), map, lookup)).toThrow();
    const lost = takeOff(run, map, lookup, 'guardian', 'body').state; lost.spare = [];
    expect(() => parseGame(JSON.stringify({ version: 20, profile, run: lost }), map, lookup)).toThrow();
    const v19 = JSON.parse(JSON.stringify({ version: 19, profile, run })); delete v19.run.spare;
    expect(parseGame(JSON.stringify(v19), map, lookup).run!.spare).toEqual([]);
  });
});
