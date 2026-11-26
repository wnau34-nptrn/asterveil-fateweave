import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { mineMap as map, mineSites } from '../src/content/world/chapter-mine';
import { MAPS } from '../src/content/world/maps';
import { parseCommand } from '../src/core/command/game-command';
import { parseGame, SAVE_VERSION } from '../src/core/save/expedition-save';
import { craftWeapon, crystalRecipe, weaponBlueprint, weaponCraftCost, weaponCraftReason } from '../src/core/world/forge';
import { claimQuest, depart, newProfile, settle } from '../src/core/world/profile';
import type { EventChoice, ExpeditionState, MapEventKind, Point, Profile } from '../src/core/world/types';
import { EVENT_CHOICES, shopEvent, chooseEvent, eventChoiceReason, fatigueOf, pendingEvent, storyDone, zoneOf, tileAt } from '../src/core/world/world';
import { currentSave } from './fixtures/current-save';

// Map 5 side events (OD-60 §5): the trapped worker, the ore cart, the fresh vein, the ore merchant, the ledger's crystal
// weapon recipe and Uncle Bork's camp job. Numbers are drafts read from the rules, never repeated here.
const home = MAPS[0]!;
const company = ['guardian', 'tracer', 'weaver', 'healer'];
const r = map.eventRules;
const ev = (kind: MapEventKind) => map.events.find(e => e.kind === kind)!;
const at = (kind: MapEventKind): Point => ({ x: ev(kind).x, y: ev(kind).y });
function run(at: Point, extra: Partial<ExpeditionState> = {}): ExpeditionState {
  const p = { ...newProfile(home, 7, company), tutorialDone: true, cleared: MAPS.slice(0, 4).map(m => m.id) };
  return { ...depart(p, map, lookup, 7).run, position: at, repel: 99, ...extra };
}
const choose = (s: ExpeditionState, c: EventChoice) => chooseEvent(s, map, lookup, c);

describe('map 5: side events', () => {
  it('places one of each new event on open floor in its zone, and the merchant trades ore', () => {
    expect(map.events.map(e => e.kind).sort()).toEqual(['cart', 'ore-merchant', 'trapped', 'vein']);
    expect(map.version).toBe(2);
    for (const e of map.events) expect(tileAt(map, e)?.kind).toBe('floor');
    expect(tileAt(map, ev('cart'))!.zoneId).toBe('mine-yard');
    expect(tileAt(map, ev('trapped'))!.zoneId).toBe('mine-tunnels');
    expect(tileAt(map, ev('vein'))!.zoneId).toBe('mine-tunnels');
    expect(EVENT_CHOICES.trapped).toEqual(['free', 'pass']); expect(EVENT_CHOICES['ore-merchant'][0]).toBe('sell-ore');
  });
  it('the trapped worker: digging pays ore and shards and tires everyone; passing costs nothing', () => {
    const s = run(ev('trapped'));
    const free = choose(s, 'free').state;
    expect(free.resources.ore - s.resources.ore).toBe(r.trapped.ore); expect(free.resources.shard - s.resources.shard).toBe(r.trapped.shard);
    for (const id of s.roster.deployed) expect(fatigueOf(free, id)).toBe(fatigueOf(s, id) + r.trapped.fatigue);
    expect(free.eventsDone).toContain(ev('trapped').id); expect(pendingEvent(free, map)).toBeUndefined();
    const pass = choose(s, 'pass').state;
    expect(pass.resources).toEqual(s.resources); expect(pass.eventsDone).toContain(ev('trapped').id);
    expect(eventChoiceReason(s, map, 'dig')).toBe('choice');
  });
  it('the ore cart: one random potion that still fits (replayable from the seed), else ore', () => {
    const s = run(ev('cart'));
    const a = choose(s, 'rummage'), b = choose(s, 'rummage');
    expect(a).toEqual(b);
    const e = a.event; expect(e.type).toBe('eventDone');
    const potion = e.type === 'eventDone' ? e.potion! : 'salve';
    expect(a.state.potions[potion]).toBe(s.potions[potion] + 1); expect(a.state.rolls).toBe(s.rolls + 1);
    const carry = map.potions.carry;
    const full = { ...s, potions: { ...s.potions, salve: carry, tonic: carry, repel: carry } };
    const ore = choose(full, 'rummage');
    expect(ore.state.resources.ore - full.resources.ore).toBe(r.cart.ore); expect(ore.state.potions).toEqual(full.potions);
    expect(ore.event.type === 'eventDone' && ore.event.potion).toBeFalsy();
    const two = { ...s, potions: { ...s.potions, salve: carry, tonic: carry } };
    expect(choose(two, 'rummage').state.potions.repel).toBe(s.potions.repel + 1);
  });
  it('the fresh vein: ore for threat, capped at the zone cap', () => {
    const s = run(ev('vein'), { pressure: 10 }); const cap = zoneOf(map, tileAt(map, ev('vein'))!.zoneId)!.cap;
    const dig = choose(s, 'dig').state;
    expect(dig.resources.ore - s.resources.ore).toBe(r.vein.ore); expect(dig.pressure).toBe(10 + r.vein.pressure);
    expect(choose({ ...s, pressure: cap - 1 }, 'dig').state.pressure).toBe(cap);
    expect(choose(s, 'pass').state.pressure).toBe(10);
  });
  it('the ore merchant sells ore for gold up to the limit a run, stays open and still sells potions', () => {
    let s = run(ev('ore-merchant')); s = { ...s, resources: { ...s.resources, ore: r.oreTrade.ore * (r.oreTrade.limit + 1) } };
    const start = s.resources;
    for (let i = 1; i <= r.oreTrade.limit; i++) { s = choose(s, 'sell-ore').state; expect(s.sold).toBe(i); }
    expect(s.resources.gold - start.gold).toBe(r.oreTrade.gold * r.oreTrade.limit);
    expect(start.ore - s.resources.ore).toBe(r.oreTrade.ore * r.oreTrade.limit);
    expect(eventChoiceReason(s, map, 'sell-ore')).toBe('sold'); expect(pendingEvent(s, map)?.id).toBe(ev('ore-merchant').id);
    expect(eventChoiceReason(s, map, 'buy-salve')).toBe('');
    expect(eventChoiceReason({ ...run(ev('ore-merchant')), resources: { ...start, ore: r.oreTrade.ore - 1 } }, map, 'sell-ore')).toBe('ore');
  });
  it('only merchants stay open; a bloodless contract needs the cart, worker and vein but never the ore merchant', () => {
    expect(map.events.filter(e => shopEvent(e.kind)).map(e => e.id)).toEqual([ev('ore-merchant').id]);
    expect(shopEvent('merchant')).toBe(true); expect(shopEvent('vein')).toBe(false);
  });
});

describe('map 5: save v70', () => {
  it('round-trips the ore merchant counter and new choices and rejects a counter past the limit', () => {
    const p = { ...newProfile(home, 7, company), tutorialDone: true, cleared: MAPS.slice(0, 4).map(m => m.id) };
    const start = depart(p, map, lookup, 7);
    let s: ExpeditionState = { ...start.run, position: at('ore-merchant'), resources: { ...start.run.resources, ore: 99 } };
    s = choose(s, 'sell-ore').state; s = choose({ ...s, position: at('cart') }, 'rummage').state; s = choose({ ...s, position: at('trapped') }, 'free').state;
    const game = { profile: start.profile, run: s };
    expect(SAVE_VERSION).toBe(70);
    expect(parseGame(currentSave(game), home, lookup, MAPS)).toEqual(game);
    // A stale or forged counter is refused (the run is settled home safely rather than loaded).
    expect(() => parseGame(currentSave({ ...game, run: { ...s, sold: r.oreTrade.limit + 1 } }), home, lookup, MAPS)).toThrow();
    // A v69 save still loads: its runs carry no counter.
    const v69 = JSON.stringify({ ...JSON.parse(currentSave({ profile: start.profile, run: null })), version: 69 });
    expect(parseGame(v69, home, lookup, MAPS).profile).toEqual(start.profile);
  });
  it('the server-side command check accepts every event choice (including the lake reflection) and the crystal craft flag', () => {
    for (const choice of Object.values(EVENT_CHOICES).flat()) expect(parseCommand({ kind: 'chooseEvent', choice })).toEqual({ kind: 'chooseEvent', choice });
    expect(parseCommand({ kind: 'craftWeapon', heroId: 'guardian', level: 3, crystal: true })).toEqual({ kind: 'craftWeapon', heroId: 'guardian', level: 3, crystal: true });
  });
});

describe('map 5: the mine ledger and Uncle Bork', () => {
  const rich = (p: Profile): Profile => ({ ...p, bank: { ...p.bank, ore: 500, dust: 200 } });
  it('three ledger pages brought home pay the ore once and unlock the crystal weapon recipe', () => {
    const p0 = { ...newProfile(home, 7, company), tutorialDone: true, cleared: MAPS.slice(0, 4).map(m => m.id) };
    const pages = mineSites.ledgerPages.map(x => x.id);
    const s = { ...depart(p0, map, lookup, 7).run, openedChests: pages };
    expect(storyDone(s, map)).toBe(true);
    expect(crystalRecipe(p0, map)).toBe(false); expect(weaponCraftReason(rich(p0), map, 'guardian', 1, true)).toBe('recipe');
    const done = settle(p0, s, 'withdrawn', map); expect(done.storyQuests).toEqual([map.id]); expect(crystalRecipe(done, map)).toBe(true);
    const c = map.equipment.forge.crystal!;
    const plain = weaponCraftCost(map, 2)!, crystal = weaponCraftCost(map, 2, true)!;
    expect(crystal).toEqual({ ore: plain.ore + c.ore, dust: plain.dust + c.dust });
    const made = craftWeapon(rich(done), map, 'guardian', 2, true);
    const item = made.profile.items.at(-1)!;
    expect(item).toEqual(weaponBlueprint(map, 'guardian', 2, item.uid, true));
    expect(item.rarity).toBe(c.rarity); expect(item.affixes).toEqual(['attack', c.affix]);
    expect(rich(done).bank.ore - made.profile.bank.ore).toBe(crystal.ore);
    expect(weaponBlueprint(map, 'healer', 1, 0, true).affixes).toEqual(['support', c.affix]);
    // A plain craft is unchanged.
    expect(weaponBlueprint(map, 'guardian', 2)).toMatchObject({ rarity: 1, affixes: ['attack'] });
  });
  it("Bork's camp job counts beaten elites on mine runs only, up to three, then pays once", () => {
    const q = map.sideQuests.find(x => x.id === 'smith-mine-crystals')!;
    expect(q).toMatchObject({ npc: 'smith', kind: 'elites', target: 3, map: map.id });
    const p0 = { ...newProfile(home, 7, company), tutorialDone: true, cleared: MAPS.slice(0, 4).map(m => m.id) };
    const s = { ...depart(p0, map, lookup, 7).run, elitesDefeated: ['mine-overseer', 'mine-crystal-eater'] };
    const one = settle(p0, s, 'withdrawn', map); expect(one.quests[q.id]).toEqual({ progress: 2, claimed: false });
    const lake = MAPS.find(m => m.id === 'moon-lake')!;
    const elsewhere = settle(one, { ...depart(one, lake, lookup, 8).run, elitesDefeated: ['lake-serpent'] }, 'withdrawn', lake);
    expect(elsewhere.quests[q.id]).toEqual({ progress: 2, claimed: false });
    const two = settle(elsewhere, s, 'withdrawn', map); expect(two.quests[q.id]).toEqual({ progress: 3, claimed: false });
    const paid = claimQuest(two, map, q.id).profile;
    expect(paid.quests[q.id]!.claimed).toBe(true); expect(paid.bank.ore - two.bank.ore).toBe(q.reward.ore);
  });
});
