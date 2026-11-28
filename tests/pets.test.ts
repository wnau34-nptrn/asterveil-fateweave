import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as home } from '../src/content/world/chapter1';
import { lakeMap } from '../src/content/world/chapter-lake';
import { mineMap } from '../src/content/world/chapter-mine';
import { MAPS as maps } from '../src/content/world/maps';
import { canonicalJson, emptyBook, type CommandReply } from '../src/core/command/command-envelope';
import { applyCommand, isRejected, parseCommand, type CommandContext, type GameCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import { parseGame, SAVE_VERSION, type Game } from '../src/core/save/expedition-save';
import { choosePet, hatchEgg, migratePetEggs, runPet } from '../src/core/world/pets';
import { depart, featureMap, featureOpen, newProfile, settle } from '../src/core/world/profile';
import { PET_IDS, type MapDefinition, type PetKind, type Profile } from '../src/core/world/types';
import { findTiles, move, tileAt } from '../src/core/world/world';
import { ledgerRows } from '../src/server/ledger';
import { GameHost, memoryStore } from '../src/server/game-host';
import { GAME_CONTEXT } from '../src/server/worker';
import { VERSION } from './fixtures/server-fakes';

// PET-1 (OD-63, docs/design/PET_SYSTEM_ANALYSIS_TH.md §5–§7): six pets, choice eggs from first clears of map 4 and 5,
// hatch/choose at the camp, the chosen pet fixed on the run, save v71 with eggs from the clear history.
const commander = { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' };
const upTo = (id: string) => maps.slice(0, maps.findIndex(m => m.id === id)).map(m => m.id);
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander, cleared: upTo('moon-lake'), ...patch });
const withEggs = (eggs = 1, patch: Partial<Profile> = {}) => base({ cleared: upTo('crystal-mine'), pets: { eggs, shards: 0, owned: [], from: ['moon-lake'] }, ...patch });
const ok = <T extends { event: { type: string } }>(r: T): T => { if (r.event.type === 'blocked') throw new Error((r.event as unknown as { reason: string }).reason); return r; };
const ctx = (...seeds: number[]): CommandContext => ({ home, maps, lookup, seeds: sequenceSeeds(seeds.length ? seeds : [1]) });
const ran = (p: Profile, map: MapDefinition, patch: Partial<NonNullable<Game['run']>> = {}) => ({ ...depart(p, map, lookup, 9).run, ...patch });
const raw = (game: Game, version = SAVE_VERSION) => JSON.stringify({ version, profile: game.profile, run: game.run });

describe('PET-1 content', () => {
  it('has the six ART-PET-002 kinds, one blessing and one assist each, shared by every map', () => {
    expect(home.pets.kinds.map(k => k.id)).toEqual([...PET_IDS]);
    expect(new Set(home.pets.kinds.map(k => k.blessing.kind)).size).toBe(6);
    for (const m of maps) expect(m.pets).toBe(home.pets);
    expect(home.pets.firstClearEggs).toEqual(['moon-lake', 'crystal-mine']);
  });
  it('opens after map 4 (`unlocks.pets: 4`)', () => {
    expect(home.unlocks.pets).toBe(4); expect(featureMap(maps, 'pets')?.id).toBe('moon-lake');
    expect(featureOpen(base(), maps, 'pets')).toBe(false);
    expect(featureOpen(base({ cleared: upTo('crystal-mine') }), maps, 'pets')).toBe(true);
  });
});

describe('hatchEgg and choosePet', () => {
  it('a choice egg hatches into the picked kind at Lv1 and that first pet is chosen', () => {
    const r = ok(hatchEgg(withEggs(2), maps, home, 'fort_gargoyle_pup'));
    expect(r.event).toEqual({ type: 'hatched', kind: 'fort_gargoyle_pup' });
    expect(r.profile.pets).toEqual({ eggs: 1, shards: 0, owned: [{ kind: 'fort_gargoyle_pup', level: 1, exp: 0 }], chosen: 'fort_gargoyle_pup', from: ['moon-lake'] });
    // A second hatch keeps the choice.
    const next = ok(hatchEgg(r.profile, maps, home, 'meadow_fox'));
    expect(next.profile.pets!.chosen).toBe('fort_gargoyle_pup'); expect(next.profile.pets!.owned.map(p => p.kind)).toEqual(['fort_gargoyle_pup', 'meadow_fox']);
  });
  it('refuses a locked nest, no egg, a kind already hatched and an unknown kind', () => {
    const reason = (p: Profile, kind: PetKind) => { const e = hatchEgg(p, maps, home, kind).event; return e.type === 'blocked' ? e.reason : ''; };
    expect(reason({ ...withEggs(), cleared: upTo('moon-lake') }, 'meadow_fox')).toBe('locked');
    expect(reason(withEggs(0), 'meadow_fox')).toBe('egg');
    const one = ok(hatchEgg(withEggs(2), maps, home, 'meadow_fox')).profile;
    expect(reason(one, 'meadow_fox')).toBe('owned');
    expect(reason(withEggs(), 'dragon' as PetKind)).toBe('unknown');
    // A refusal never changes the profile.
    const p = withEggs(0); expect(hatchEgg(p, maps, home, 'meadow_fox').profile).toBe(p);
  });
  it('egg shards hatch like one egg once a whole egg is gone', () => {
    const p = withEggs(0); p.pets!.shards = home.pets.eggShards + 3;
    const r = ok(hatchEgg(p, maps, home, 'gate_starveil_slime'));
    expect(r.event).toEqual({ type: 'hatched', kind: 'gate_starveil_slime', shards: true });
    expect(r.profile.pets).toMatchObject({ eggs: 0, shards: 3 });
    const q = withEggs(1); q.pets!.shards = home.pets.eggShards;
    expect(ok(hatchEgg(q, maps, home, 'meadow_fox')).profile.pets).toMatchObject({ eggs: 0, shards: home.pets.eggShards });
  });
  it('chooses a hatched pet or none, and refuses one not hatched', () => {
    let p = ok(hatchEgg(withEggs(2), maps, home, 'meadow_fox')).profile; p = ok(hatchEgg(p, maps, home, 'forest_lantern_owl')).profile;
    expect(ok(choosePet(p, maps, 'forest_lantern_owl')).profile.pets!.chosen).toBe('forest_lantern_owl');
    const none = ok(choosePet(p, maps, undefined));
    expect(none.event).toEqual({ type: 'petChosen' }); expect(none.profile.pets!.chosen).toBeUndefined();
    expect(choosePet(p, maps, 'thicket_piglet').event).toEqual({ type: 'blocked', reason: 'unowned' });
    expect(choosePet({ ...p, cleared: upTo('moon-lake') }, maps, 'meadow_fox').event).toEqual({ type: 'blocked', reason: 'locked' });
  });
});

describe('the run and settling', () => {
  it('departure brings the chosen pet at its level; no pet chosen brings none', () => {
    const p = ok(hatchEgg(withEggs(), maps, home, 'rift_crystal_moth')).profile; p.pets!.owned[0]!.level = 4;
    expect(depart(p, mineMap, lookup, 3).run.pet).toEqual({ kind: 'rift_crystal_moth', level: 4 });
    expect(depart(ok(choosePet(p, maps, undefined)).profile, mineMap, lookup, 3).run.pet).toBeUndefined();
    expect(runPet(withEggs())).toBeUndefined();
  });
  it('the pet is fixed for the expedition: camp pet commands are refused on the map', () => {
    const p = ok(hatchEgg(withEggs(2), maps, home, 'meadow_fox')).profile;
    const g: Game = { profile: p, run: depart(p, mineMap, lookup, 3).run };
    for (const cmd of [{ kind: 'choosePet' }, { kind: 'hatchEgg', pet: 'thicket_piglet' }] as GameCommand[]) expect(applyCommand(g, cmd, ctx())).toEqual({ rejected: 'inRun' });
  });
  it('the first normal clear of map 4 pays one choice egg, once; map 5 pays the next', () => {
    const first = settle(base(), ran(base(), lakeMap), 'complete', lakeMap);
    expect(first.pets).toEqual({ eggs: 1, shards: 0, owned: [], from: ['moon-lake'] });
    expect(settle(first, ran(first, lakeMap), 'complete', lakeMap).pets!.eggs).toBe(1);
    const mine = settle(first, ran(first, mineMap), 'complete', mineMap);
    expect(mine.pets).toMatchObject({ eggs: 2, from: ['moon-lake', 'crystal-mine'] });
  });
  it('a withdrawn, wiped or hard run, or a map without an egg, pays none', () => {
    for (const outcome of ['withdrawn', 'wiped'] as const) expect(settle(base(), ran(base(), lakeMap), outcome, lakeMap).pets).toBeUndefined();
    expect(settle(base(), ran(base(), lakeMap, { hard: true }), 'complete', lakeMap).pets).toBeUndefined();
    const early = base({ cleared: upTo(home.id) });
    expect(settle(early, ran(early, home), 'complete', home).pets).toBeUndefined();
  });
});

describe('save v71', () => {
  it('round-trips the pet book and the run pet', () => {
    const p = ok(hatchEgg(withEggs(2), maps, home, 'thicket_piglet')).profile; p.pets!.owned[0] = { kind: 'thicket_piglet', level: 3, exp: 2 };
    const game: Game = { profile: p, run: depart(p, mineMap, lookup, 3).run };
    const back = parseGame(raw(game), home, lookup, maps);
    expect(back.profile.pets).toEqual(p.pets); expect(back.run!.pet).toEqual({ kind: 'thicket_piglet', level: 3 });
  });
  it('a v70 save gets the eggs of the egg maps it has already cleared', () => {
    const game = (cleared: string[]): Game => ({ profile: base({ cleared }), run: null });
    expect(parseGame(raw(game(upTo('moon-lake')), 70), home, lookup, maps).profile.pets).toBeUndefined();
    expect(parseGame(raw(game(upTo('crystal-mine')), 70), home, lookup, maps).profile.pets).toEqual({ eggs: 1, shards: 0, owned: [], from: ['moon-lake'] });
    const both = parseGame(raw(game(maps.map(m => m.id)), 70), home, lookup, maps).profile;
    expect(both.pets).toEqual({ eggs: 2, shards: 0, owned: [], from: ['moon-lake', 'crystal-mine'] });
    // The migrated history counts as paid: completing map 4 again pays nothing more.
    expect(settle(both, ran(both, lakeMap), 'complete', lakeMap).pets!.eggs).toBe(2);
    // A v71 save without a book is not migrated again.
    expect(parseGame(raw(game(maps.map(m => m.id))), home, lookup, maps).profile.pets).toBeUndefined();
    const p = base({ cleared: maps.map(m => m.id) }); migratePetEggs(p, home); migratePetEggs(p, home); expect(p.pets).toMatchObject({ eggs: 2 });
  });
  it('refuses a malformed pet book or run pet', () => {
    const good = ok(hatchEgg(withEggs(2), maps, home, 'meadow_fox')).profile;
    const bad = (edit: (p: Profile & { pets: Record<string, unknown> }) => void, run?: Record<string, unknown>) => {
      const p = structuredClone(good) as Profile & { pets: Record<string, unknown> }; edit(p);
      const r = run ? { ...depart(good, mineMap, lookup, 3).run, pet: run } : null;
      return () => parseGame(JSON.stringify({ version: SAVE_VERSION, profile: p, run: r }), home, lookup, maps);
    };
    expect(bad(() => {})).not.toThrow();
    expect(bad(p => { p.pets.chosen = 'thicket_piglet'; })).toThrow();
    expect(bad(p => { (p.pets.owned as unknown[]).push({ kind: 'meadow_fox', level: 1, exp: 0 }); })).toThrow();
    expect(bad(p => { (p.pets.owned as { exp: number }[])[0]!.exp = 1; })).toThrow();
    expect(bad(p => { (p.pets.owned as { level: number }[])[0]!.level = 11; })).toThrow();
    expect(bad(p => { p.pets.from = ['moon-lake', 'moon-lake']; })).toThrow();
    expect(bad(p => { p.cleared = upTo('moon-lake'); p.pets.from = ['moon-lake']; })).toThrow();
    expect(bad(p => { p.pets.eggs = home.pets.eggCap + 1; })).toThrow();
    expect(bad(p => { p.pets.hunger = 1; })).toThrow();
    expect(bad(() => {}, { kind: 'meadow_fox', level: 2 })).not.toThrow();
    expect(bad(() => {}, { kind: 'dragon', level: 1 })).toThrow();
    expect(bad(() => {}, { kind: 'meadow_fox', level: 0 })).toThrow();
  });
});

describe('commands, ledger and replay', () => {
  it('accepts only known pet ids in the command shape', () => {
    expect(parseCommand({ kind: 'hatchEgg', pet: 'meadow_fox' })).toBeDefined();
    expect(parseCommand({ kind: 'hatchEgg', pet: 'dragon' })).toBeUndefined();
    expect(parseCommand({ kind: 'hatchEgg' })).toBeUndefined();
    expect(parseCommand({ kind: 'choosePet' })).toBeDefined();
    expect(parseCommand({ kind: 'choosePet', pet: 'meadow_fox', extra: 1 })).toBeUndefined();
  });
  // A map-4 run standing next to the shrine with its boss beaten: one step home completes it.
  function lakeAtGoal(profile: Profile): { game: Game; step: GameCommand } {
    const run = depart(profile, lakeMap, lookup, 9).run; const goal = findTiles(lakeMap, 'goal')[0]!;
    for (const [dir, dx, dy] of [['up', 0, 1], ['down', 0, -1], ['left', 1, 0], ['right', -1, 0]] as const) {
      const from = { x: goal.x + dx, y: goal.y + dy }; const t = tileAt(lakeMap, from); if (!t || t.kind === 'wall') continue;
      const ready = { ...run, position: from, bossDefeated: true };
      if (move(ready, lakeMap, dir, lookup).event.type === 'goal') return { game: { profile, run: ready }, step: { kind: 'move', dir } };
    }
    throw new Error('no step onto the goal');
  }
  it('the clear that pays an egg reports it, and the ledger writes one receipt per egg and per hatch', () => {
    const { game, step } = lakeAtGoal(base());
    const r = applyCommand(game, step, ctx()); if (isRejected(r)) throw new Error(r.rejected);
    expect(r.events.map(e => e.type)).toEqual(['goal', 'petEgg', 'settled']);
    expect(ledgerRows(r.events, 0, 100, 1, 0)).toEqual([{ receipt: 'pet:egg:moon-lake', seq: 1, kind: 'pet', period: 'd100', ref: 'moon-lake', reward: { ore: 0, gold: 0 }, day: 100, at: 0 }]);
    const h = applyCommand(r.game, { kind: 'hatchEgg', pet: 'meadow_fox' }, ctx()); if (isRejected(h)) throw new Error(h.rejected);
    expect(ledgerRows(h.events, 0, 100, 2, 0).map(x => x.receipt)).toEqual(['pet:hatch:meadow_fox']);
    // A second clear reports no egg.
    const again = lakeAtGoal(r.game.profile); const s = applyCommand(again.game, again.step, ctx());
    if (isRejected(s)) throw new Error(s.rejected); expect(s.events.map(e => e.type)).toEqual(['goal', 'settled']);
  });
  it('on the server: the clear, the hatch and the choice commit with their receipts and the log replays to the same book', () => {
    const { game, step } = lakeAtGoal(base());
    const store = memoryStore(); store.state = { game, book: emptyBook() }; store.snapshots.push({ seq: 0, game, origin: 'import', at: 0 });
    let n = 0, rid = 0;
    const host = new GameHost(store, GAME_CONTEXT, () => 7001 + 13 * n++, VERSION, () => 1_800_000_000_000);
    const sha = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');
    const send = (command: unknown) => host.command({ requestId: `req-${String(++rid).padStart(16, '0')}`, seq: host.view().lastSeq + 1, command }, sha(command)).body as CommandReply;
    const a = send(step); expect(a.status).toBe('applied'); if (a.status !== 'applied') return;
    expect(a.receipts).toEqual(['pet:egg:moon-lake']);
    const b = send({ kind: 'hatchEgg', pet: 'fort_gargoyle_pup' }); if (b.status !== 'applied') throw new Error(b.status);
    expect(b.receipts).toEqual(['pet:hatch:fort_gargoyle_pup']);
    expect(send({ kind: 'hatchEgg', pet: 'meadow_fox' }).status).toBe('rejected');
    const c = send({ kind: 'choosePet' }); if (c.status !== 'applied') throw new Error(c.status);
    expect(c.view.profile.pets).toEqual({ eggs: 0, shards: 0, owned: [{ kind: 'fort_gargoyle_pup', level: 1, exp: 0 }], from: ['moon-lake'] });
    expect(store.ledger().filter(r => r.kind === 'pet').map(r => r.receipt)).toEqual(['pet:egg:moon-lake', 'pet:hatch:fort_gargoyle_pup']);
    expect(host.verify()).toMatchObject({ ok: true });
  });
});
