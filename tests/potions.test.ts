import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { loadGame, parseGame, saveGame } from '../src/core/save/expedition-save';
import { brew, brewReason, depart, newProfile, settle } from '../src/core/world/profile';
import type { ExpeditionState, Profile } from '../src/core/world/types';
import { encounterChance, memberDef, move, newExpedition, openChest, potionReason, usePotion } from '../src/core/world/world';

// Map potions (2D-5, docs/EXPEDITION_DESIGN.md "Map potions").
const P = map.potions;
const run = (patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const max = (s: ExpeditionState, id: string) => memberDef(lookup, map, s.members, id)!.maxHp;

describe('brewing and packing', () => {
  it('brewing costs ore and dust; a departure packs up to 3 of each and the rest stays home', () => {
    let p: Profile = { ...newProfile(map, 2), bank: { ore: 100, gold: 0, seal: 0, dust: 40 } };
    for (let i = 0; i < 5; i++) p = brew(p, map, 'salve').profile;
    p = brew(p, map, 'repel').profile;
    expect(p.potions).toEqual({ salve: 5, tonic: 0, repel: 1 });
    expect(p.bank).toEqual({ ore: 100 - 5 * 6 - 8, gold: 0, seal: 0, dust: 40 - 5 * 2 - 3 });
    expect(brewReason({ ...p, bank: { ore: 5, gold: 0, seal: 0, dust: 9 } }, map, 'salve')).toBe('ore');
    expect(brewReason({ ...p, bank: { ore: 50, gold: 0, seal: 0, dust: 1 } }, map, 'salve')).toBe('dust');
    const out = depart(p, map, lookup, 9);
    expect(out.run.potions).toEqual({ salve: 3, tonic: 0, repel: 1 }); expect(out.profile.potions).toEqual({ salve: 2, tonic: 0, repel: 0 });
  });
  it('unused potions come home on complete or withdraw and are lost on a wipe', () => {
    const r = run({ potions: { salve: 2, tonic: 1, repel: 0 } }); const p = newProfile(map, 1);
    expect(settle(p, r, 'withdrawn', map).potions).toEqual({ salve: 2, tonic: 1, repel: 0 });
    expect(settle(p, r, 'wiped', map).potions).toEqual({ salve: 0, tonic: 0, repel: 0 });
  });
});

describe('using potions on the map', () => {
  it('salve heals one standing member 40% (not past max); not on the fallen or the full', () => {
    const s = run({ potions: { salve: 1, tonic: 0, repel: 0 } }); s.hp.guardian = 10; s.hp.tracer = 0;
    expect(potionReason(s, map, lookup, 'salve', 'tracer')).toBe('down');
    expect(potionReason(s, map, lookup, 'salve', 'weaver')).toBe('full');
    const r = usePotion(s, map, lookup, 'salve', 'guardian');
    expect(r.state.hp.guardian).toBe(10 + Math.ceil(max(s, 'guardian') * 0.4)); expect(r.state.potions.salve).toBe(0);
    expect(r.event).toMatchObject({ type: 'potion', potion: 'salve' });
    expect(potionReason(r.state, map, lookup, 'salve', 'guardian')).toBe('none');
  });
  it('tonic heals every standing member 20%; needs someone hurt', () => {
    const s = run({ potions: { salve: 0, tonic: 1, repel: 0 } });
    expect(potionReason(s, map, lookup, 'tonic')).toBe('full');
    s.hp.guardian = 1; s.hp.weaver = max(s, 'weaver') - 2; s.hp.healer = 0;
    const r = usePotion(s, map, lookup, 'tonic');
    expect(r.state.hp.guardian).toBe(1 + Math.ceil(max(s, 'guardian') * 0.2)); expect(r.state.hp.weaver).toBe(max(s, 'weaver')); expect(r.state.hp.healer).toBe(0);
  });
  it('repel stops random encounters for 10 steps without rolling or raising pressure', () => {
    let s = run({ potions: { salve: 0, tonic: 0, repel: 1 } }); s = usePotion(s, map, lookup, 'repel').state;
    expect(s.repel).toBe(P.repelSteps); expect(potionReason(s, map, lookup, 'repel')).toBe('none');
    const rolls = s.rolls; const pressure = s.pressure; let steps = 0;
    for (let i = 0; i < 40 && s.repel > 0; i++) { const r = move(s, map, i % 2 ? 'up' : 'down'); if (r.state !== s && r.state.steps > s.steps) steps++; s = r.state; expect(s.battle).toBeNull(); if (s.repel > 0) expect(encounterChance(s, map)).toBe(0); }
    expect(s.repel).toBe(0); expect(s.rolls).toBe(rolls); expect(s.pressure).toBe(pressure); expect(steps).toBeGreaterThanOrEqual(P.repelSteps);
  });
  it('potions cannot be used in battle', () => {
    const s = run({ potions: { salve: 1, tonic: 1, repel: 1 }, battle: { kind: 'random', encounterId: 'scout-patrol', entry: {}, commands: [] } });
    expect(potionReason(s, map, lookup, 'repel')).toBe('busy');
  });
  it('chests may add a potion, never beyond the carry limit', () => {
    let found = 0;
    for (const chest of map.chests) for (let seed = 1; seed < 30; seed++) {
      const s = run({ seed, position: { x: chest.x, y: chest.y } }); const r = openChest(s, map);
      if (r.event.type === 'chest' && r.event.potion) { found++; expect(r.state.potions[r.event.potion]).toBe(1); }
      const full = openChest(run({ seed, position: { x: chest.x, y: chest.y }, potions: { salve: 3, tonic: 3, repel: 3 } }), map);
      expect(full.state.potions).toEqual({ salve: 3, tonic: 3, repel: 3 });
    }
    expect(found).toBeGreaterThan(30);
  });
});

describe('save v12', () => {
  const memory = () => { const v = new Map<string, string>(); return { getItem: (k: string) => v.get(k) ?? null, setItem: (k: string, x: string) => { v.set(k, x); } }; };
  it('round-trips home stock, carried potions and repel; v11 data migrates with none', () => {
    const profile = { ...newProfile(map, 3), potions: { salve: 7, tonic: 0, repel: 2 } };
    const r = run({ potions: { salve: 1, tonic: 2, repel: 0 }, repel: 4 });
    const store = memory(); saveGame(store, { profile, run: r });
    const back = loadGame(store, map, lookup)!;
    expect(back.profile.potions).toEqual(profile.potions); expect(back.run!.potions).toEqual(r.potions); expect(back.run!.repel).toBe(4);
    const v11 = JSON.parse(JSON.stringify({ version: 11, profile: newProfile(map, 3), run: run() })); delete v11.profile.potions; delete v11.run.potions; delete v11.run.repel;
    const old = parseGame(JSON.stringify(v11), map, lookup);
    expect(old.profile.potions).toEqual({ salve: 0, tonic: 0, repel: 0 }); expect(old.run!.repel).toBe(0);
    expect(() => parseGame(JSON.stringify({ version: 12, profile, run: { ...r, potions: { salve: 4, tonic: 0, repel: 0 } } }), map, lookup)).toThrow();
  });
});
