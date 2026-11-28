import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne } from '../src/content/world/chapter1';
import { forestMap } from '../src/content/world/chapter-forest';
import { mineMap } from '../src/content/world/chapter-mine';
import { MAPS } from '../src/content/world/maps';
import { petBlessing, petSightings, sightRadius } from '../src/core/world/pet-blessings';
import type { Direction, ExpeditionState, MapDefinition, PetKind, Point } from '../src/core/world/types';
import { chooseEvent, encounterChance, findTiles, memberDef, move, newExpedition, openChest, reveal, rosterIds, tileAt } from '../src/core/world/world';

// PET-2 (OD-63, docs/design/PET_SYSTEM_ANALYSIS_TH.md §5.1/§5.2b): the six map blessings of `run.pet`, Lv1 and Lv6 steps.
const map = chapterOne;
const KIND: Record<string, PetKind> = { luck: 'meadow_fox', forage: 'thicket_piglet', farsight: 'rift_crystal_moth', ward: 'fort_gargoyle_pup', lantern: 'forest_lantern_owl', renewal: 'gate_starveil_slime' };
const withPet = (s: ExpeditionState, kind?: PetKind, level = 1): ExpeditionState => { const t = structuredClone(s); if (kind) t.pet = { kind, level }; else delete t.pet; return t; };
const fresh = (m: MapDefinition, seed: number, kind?: PetKind, level = 1): ExpeditionState => {
  const s = newExpedition(m, lookup, seed, undefined, true); if (!kind) return s;
  const t = withPet(s, kind, level); reveal(t, m); return t;
};
const at = (s: ExpeditionState, p: Point): ExpeditionState => ({ ...structuredClone(s), position: { x: p.x, y: p.y } });
const chestEvent = (r: ReturnType<typeof openChest>) => { if (r.event.type !== 'chest') throw new Error(r.event.type); return r.event; };
const revealedCount = (s: ExpeditionState) => [...s.revealed].filter(c => c === '1').length;

describe('PET-2 blessing values', () => {
  it('uses the Lv1 step below Lv6 and the Lv6 step from it, only for the brought kind', () => {
    for (const def of map.pets.kinds) {
      const s = { pet: { kind: def.id, level: 1 } };
      expect(petBlessing(s, map, def.blessing.kind)).toBe(def.blessing.at1);
      expect(petBlessing({ pet: { kind: def.id, level: 5 } }, map, def.blessing.kind)).toBe(def.blessing.at1);
      expect(petBlessing({ pet: { kind: def.id, level: 6 } }, map, def.blessing.kind)).toBe(def.blessing.at6);
      expect(petBlessing({ pet: { kind: def.id, level: 10 } }, map, def.blessing.kind)).toBe(def.blessing.at6);
      for (const other of map.pets.kinds) if (other.blessing.kind !== def.blessing.kind) expect(petBlessing(s, map, other.blessing.kind)).toBe(0);
    }
    expect(petBlessing({}, map, 'luck')).toBe(0);
    expect(map.pets.blessingLevel).toBe(6); expect(map.pets.renewalSteps).toBe(10);
  });
});

describe('PET-2 luck and forage (chests and search)', () => {
  const common = map.chests.find(c => c.tier === 'common')!; const rare = map.chests.find(c => c.tier === 'rare')!;
  it('a pet without a chest blessing opens a chest exactly as no pet does (no extra roll)', () => {
    for (const seed of [3, 11, 40]) for (const chest of [common, rare]) {
      const base = at(fresh(map, seed), chest);
      const none = openChest(base, map);
      for (const kind of [KIND.farsight!, KIND.ward!, KIND.lantern!, KIND.renewal!]) {
        const r = openChest(withPet(base, kind), map);
        expect(r.event).toEqual(none.event); expect(r.state.rolls).toBe(none.state.rolls); expect(r.state.resources).toEqual(none.state.resources);
      }
    }
  });
  it('luck opens a common chest as rare at about its percent, with one roll from the run stream, deterministically', () => {
    let lucky = 0; const seeds = 400;
    for (let seed = 1; seed <= seeds; seed++) {
      const base = at(fresh(map, seed, KIND.luck, 6), common);
      const a = openChest(base, map); const b = openChest(base, map); expect(a).toEqual(b);
      const e = chestEvent(a); const none = openChest(withPet(base), map);
      expect(a.state.rolls).toBeGreaterThanOrEqual(none.state.rolls);
      if (e.lucky) {
        lucky++;
        const [lo, hi] = map.loot.chest.rare.ore; expect(e.loot.ore).toBeGreaterThanOrEqual(lo); expect(e.loot.ore).toBeLessThanOrEqual(hi);
        expect(e.loot.shard).toBeGreaterThanOrEqual(map.loot.chest.rare.shard[0]);
      }
    }
    expect(lucky / seeds).toBeGreaterThan(0.05); expect(lucky / seeds).toBeLessThan(0.16);
    // A rare chest has no better tier: no roll, never lucky.
    const r = at(fresh(map, 7, KIND.luck, 6), rare);
    expect(chestEvent(openChest(r, map)).lucky).toBeUndefined();
    expect(openChest(r, map).state.rolls).toBe(openChest(withPet(r), map).state.rolls);
  });
  it('forage adds its ore to every chest and to searching an abandoned camp', () => {
    for (const [level, extra] of [[1, 1], [6, 2]] as const) for (const chest of [common, rare]) {
      const base = at(fresh(map, 21, KIND.forage, level), chest);
      const r = openChest(base, map); const none = openChest(withPet(base), map);
      expect(chestEvent(r).loot.ore).toBe(chestEvent(none).loot.ore + extra); expect(chestEvent(r).forage).toBe(extra);
      expect(r.state.resources.ore).toBe(none.state.resources.ore + extra); expect(r.state.rolls).toBe(none.state.rolls);
    }
    const camp = forestMap.events.find(e => e.kind === 'abandoned')!;
    let checked = 0;
    for (let seed = 1; seed < 30 && checked < 3; seed++) {
      const base = at(fresh(forestMap, seed, KIND.forage, 6), camp);
      const r = chooseEvent(base, forestMap, lookup, 'search'); if (r.event.type !== 'eventDone') continue;
      const none = chooseEvent(withPet(base), forestMap, lookup, 'search');
      expect(r.state.resources.ore).toBe(none.state.resources.ore + 2); expect(r.state.dust).toBe(none.state.dust); checked++;
    }
    expect(checked).toBe(3);
  });
});

describe('PET-2 farsight and lantern (fog)', () => {
  it('farsight opens the fog one tile further, on open maps and in the mine’s lit yard', () => {
    for (const m of [map, mineMap]) {
      const none = fresh(m, 5); const moth = fresh(m, 5, KIND.farsight);
      expect(sightRadius(moth, m)).toBe(m.revealRadius + 1);
      expect(revealedCount(moth)).toBeGreaterThan(revealedCount(none));
      for (let i = 0; i < none.revealed.length; i++) if (none.revealed[i] === '1') expect(moth.revealed[i]).toBe('1');
    }
    const s = fresh(map, 5, KIND.farsight); const w = map.rows[0]!.length; const r = map.revealRadius + 1;
    const { x, y } = s.position; const inside = (px: number, py: number) => px >= 0 && py >= 0 && px < w && py < map.rows.length;
    if (inside(x + r, y)) expect(s.revealed[y * w + x + r]).toBe('1');
    if (inside(x + r + 1, y)) expect(s.revealed[y * w + x + r + 1]).toBe('0');
  });
  it('lantern sights fogged chests/events within the fog edge + 2 (Lv6: + 3), never revealing the floor', () => {
    const m = MAPS.find(x => x.id === 'veil-frontier')!;
    const sights = (level: number) => {
      const out = { chests: new Set<string>(), events: new Set<string>() };
      for (const p of findTiles(m, 'floor')) {
        const s = { ...fresh(m, 2, KIND.lantern, level), position: p, revealed: '0'.repeat(fresh(m, 2).revealed.length) };
        const seen = petSightings(s, m); seen.chests.forEach(c => out.chests.add(c)); seen.events.forEach(e => out.events.add(e));
        for (const id of seen.chests) { const c = m.chests.find(x => x.id === id)!; expect(Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y))).toBeLessThanOrEqual(m.revealRadius + (level >= 6 ? 3 : 2)); }
      }
      return out;
    };
    expect(sights(1).chests.size).toBeGreaterThan(0);
    const start = fresh(m, 2, KIND.lantern);
    expect(petSightings(start, m).chests.every(id => { const c = m.chests.find(x => x.id === id)!; return start.revealed[c.y * m.rows[0]!.length + c.x] !== '1'; })).toBe(true);
    expect(fresh(m, 2, KIND.lantern).revealed).toBe(fresh(m, 2).revealed);
    expect(petSightings(fresh(m, 2), m)).toEqual({ chests: [], events: [] });
    expect(petSightings(fresh(m, 2, KIND.ward), m)).toEqual({ chests: [], events: [] });
    // Opened chests are no longer sighted.
    const chest = m.chests[0]!; const near = { ...fresh(m, 2, KIND.lantern, 6), position: { x: chest.x + m.revealRadius + 1, y: chest.y }, revealed: '0'.repeat(start.revealed.length) };
    if (tileAt(m, near.position)) {
      expect(petSightings(near, m).chests).toContain(chest.id);
      expect(petSightings({ ...near, openedChests: [chest.id] }, m).chests).not.toContain(chest.id);
    }
  });
});

describe('PET-2 ward (random encounters only)', () => {
  const zoneTile = (m: MapDefinition) => findTiles(m, 'floor').find(p => { const z = m.zones.find(z => z.id === tileAt(m, p)!.zoneId); return z && !z.safe; })!;
  it('lowers the random-encounter chance by 10% (Lv6: 15%) of itself, rounded down', () => {
    const p = zoneTile(map);
    for (const pressure of [0, 7, 20, 99]) {
      const none = encounterChance({ ...fresh(map, 1), pressure }, map, p);
      expect(encounterChance({ ...fresh(map, 1, KIND.ward), pressure }, map, p)).toBe(Math.floor(none * 90 / 100));
      expect(encounterChance({ ...fresh(map, 1, KIND.ward, 6), pressure }, map, p)).toBe(Math.floor(none * 85 / 100));
      expect(encounterChance({ ...fresh(map, 1, KIND.luck), pressure }, map, p)).toBe(none);
    }
  });
  it('never stops an elite gate or the boss', () => {
    const m = MAPS.find(x => x.id === 'veil-frontier')!; const elite = m.elites[0]!;
    const dirs: [Direction, Point][] = [['right', { x: -1, y: 0 }], ['left', { x: 1, y: 0 }], ['down', { x: 0, y: -1 }], ['up', { x: 0, y: 1 }]];
    const [dir, off] = dirs.find(([, o]) => tileAt(m, { x: elite.x + o.x, y: elite.y + o.y })?.kind === 'floor')!;
    const s = at(fresh(m, 3, KIND.ward, 10), { x: elite.x + off.x, y: elite.y + off.y });
    const r = move(s, m, dir, lookup);
    expect(r.event).toMatchObject({ type: 'encounter', kind: 'elite', chance: 100 });
  });
});

describe('PET-2 renewal', () => {
  it('heals standing brought members 2% (Lv6: 3%) of max HP every 10 steps, never the fallen', () => {
    const start = fresh(map, 8, KIND.renewal);
    const ids = rosterIds(start); const max = (s: ExpeditionState, id: string) => memberDef(lookup, map, s, id)!.maxHp;
    // A tile with a free neighbour on both sides: walk back and forth (repel keeps encounters away).
    const dirs: Direction[] = ['right', 'left', 'down', 'up'];
    for (const [level, pct] of [[1, 2], [6, 3]] as const) {
      let s: ExpeditionState = { ...withPet(start, KIND.renewal, level), repel: 99, steps: 0 };
      for (const id of ids) s.hp[id] = Math.floor(max(s, id) / 2);
      const fallen = ids.length > 1 ? ids[1]! : undefined; if (fallen) s.hp[fallen] = 0;
      const before = { ...s.hp };
      let walked = 0;
      for (let i = 0; walked < 10 && i < 40; i++) {
        const d = dirs.find(dir => { const r = move(s, map, dir, lookup); return r.event.type === 'moved' || r.event.type === 'herb'; });
        if (!d) break; s = move(s, map, d, lookup).state; walked++;
        if (walked < 10) for (const id of ids) expect(s.hp[id]).toBe(before[id]);
      }
      expect(s.steps).toBe(10);
      for (const id of ids) {
        const want = before[id] === 0 ? 0 : Math.min(max(s, id), before[id]! + Math.max(1, Math.ceil(max(s, id) * pct / 100)));
        expect(s.hp[id], `${level} ${id}`).toBe(want);
      }
      // Without the pet the same walk heals nobody.
      let n: ExpeditionState = { ...withPet(start), repel: 99, steps: 0, hp: { ...before } };
      for (let i = 0; n.steps < 10 && i < 40; i++) { const d = dirs.find(dir => ['moved', 'herb'].includes(move(n, map, dir, lookup).event.type)); if (!d) break; n = move(n, map, d, lookup).state; }
      expect(n.hp).toEqual(before);
    }
  });
});

describe('PET-2 departure', () => {
  it('a departing run with a farsight pet starts with the wider fog; no pet keeps the old start', async () => {
    const { depart, newProfile } = await import('../src/core/world/profile');
    const p = { ...newProfile(map, 5), tutorialDone: true, commander: { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่าย' } };
    const none = depart(p, map, lookup, 9).run;
    const moth = depart({ ...p, pets: { eggs: 0, shards: 0, owned: [{ kind: KIND.farsight!, level: 1, exp: 0 }], chosen: KIND.farsight!, from: [] } }, map, lookup, 9).run;
    expect(moth.pet).toEqual({ kind: KIND.farsight, level: 1 }); expect(revealedCount(moth)).toBeGreaterThan(revealedCount(none));
    expect({ ...moth, pet: undefined, revealed: '' }).toEqual({ ...none, pet: undefined, revealed: '' });
  });
});
