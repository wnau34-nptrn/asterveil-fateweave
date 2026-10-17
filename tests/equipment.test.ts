import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { chapterOne as map } from '../src/content/world/chapter1';
import { createBattle, currentHeroId, resolveCommand, withParty } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../src/core/battle/types';
import { loadGame, parseGame, saveGame } from '../src/core/save/expedition-save';
import { affixPool, gearTotals, itemStats, itemValid, rollItem } from '../src/core/world/equipment';
import { dismiss, equip, newProfile, salvage, settle, unequip } from '../src/core/world/profile';
import type { ExpeditionState, Gear, Item } from '../src/core/world/types';
import { battleData, battleState, finishBattle, heroDef, move, newExpedition, recordBattle, rollPercent, starred } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

// Equipment (2D-2, docs/EXPEDITION_DESIGN.md "Equipment").
const rules = map.equipment;
const item = (patch: Partial<Item>): Item => ({ uid: 1, slot: 'body', rarity: 0, level: 1, affixes: [], ...patch });
const member = (id: string, gear?: Gear) => starred(heroDef(lookup, map, id)!, 1, map, 1, {}, gear);
const act = (s: BattleState, d: EncounterDefinition, action: ActionId, targetId: string) =>
  resolveCommand(s, d, { beat: s.beat, heroId: currentHeroId(s, d)!, action, targetId });
function until(s: BattleState, d: EncounterDefinition, id: string): BattleState {
  for (let i = 0; i < 40 && currentHeroId(s, d) !== id; i++) s = act(s, d, 'attack', s.enemies.find(e => e.hp > 0)!.id).state;
  return s;
}
const heroIds = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann', 'lio'];

describe('items and stats', () => {
  it('slot base stats and affixes grow with the item level; SPD only on boots and charms', () => {
    expect(itemStats(rules, item({ slot: 'body', level: 1 }))).toEqual({ hp: 7, armour: 3 });
    expect(itemStats(rules, item({ slot: 'body', level: 10 }))).toEqual({ hp: 25, armour: 7 });
    expect(itemStats(rules, item({ slot: 'weapon', hero: 'guardian', level: 5, rarity: 1, affixes: ['hp'] }))).toEqual({ attack: 14, hp: 8 });
    // A support class's weapon gives Support instead of Attack (stats design 2026-10-17).
    expect(itemStats(rules, item({ slot: 'weapon', hero: 'healer', level: 5 }))).toEqual({ support: 14 });
    expect(itemStats(rules, item({ slot: 'boots', level: 9 })).speed).toBe(3);
    for (const slot of ['weapon', 'head', 'body', 'gloves'] as const) expect(affixPool(rules, slot, 'healer')).not.toContain('speed');
    expect(affixPool(rules, 'boots')).toContain('speed'); expect(affixPool(rules, 'charm')).toContain('speed');
    expect(affixPool(rules, 'weapon', 'tracer')).toContain('leech'); expect(affixPool(rules, 'weapon', 'healer')).toContain('support');
  });
  it('gear adds flat HP/SPD, Attack/Support percents and defence; nothing worn leaves the hero unchanged', () => {
    expect(member('guardian')).toEqual(heroDef(lookup, map, 'guardian'));
    const gear: Gear = { body: item({ slot: 'body', level: 10 }), boots: item({ uid: 2, slot: 'boots', level: 9 }), weapon: item({ uid: 3, slot: 'weapon', hero: 'guardian', level: 1 }) };
    const h = member('guardian', gear); const base = heroDef(lookup, map, 'guardian')!;
    expect(h.maxHp).toBe(base.maxHp + 25 + 12); expect(h.speed).toBe(base.speed + 3); expect(h.attack).toBe(Math.round(base.attack * 1.08));
    expect(h).toMatchObject({ damageBonus: 8, skillBonus: 0, armour: 7 });
    const t = gearTotals(map, { charm: item({ slot: 'charm', rarity: 4, affixes: ['support', 'luck', 'speed'], special: 'renewal' }) });
    expect(t.gear).toEqual({ specials: ['renewal'] }); expect(t).toMatchObject({ speed: 1, support: 6 + 3, luck: 2 });
  });
  it('rolled items are always valid and deterministic; rarity follows the weights', () => {
    let n = 0; const roll = () => rollPercent(77, n++); const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) {
      const it = rollItem(rules, roll, 4, rules.rarityWeights, ['guardian', 'mira']);
      expect(itemValid(map, { ...it, uid: 0 }, heroIds, true)).toBe(true); counts[it.rarity]!++;
      if (it.slot === 'weapon') expect(['guardian', 'mira']).toContain(it.hero);
    }
    expect(counts[0]).toBeGreaterThan(counts[1]!); expect(counts[1]).toBeGreaterThan(counts[2]!); expect(counts[4]).toBeGreaterThan(0);
    let m = 0; const again = () => rollPercent(77, m++);
    n = 0; expect(rollItem(rules, again, 4, rules.rarityWeights, ['guardian'])).toEqual(rollItem(rules, () => rollPercent(77, n++), 4, rules.rarityWeights, ['guardian']));
    for (let i = 0; i < 200; i++) expect(rollItem(rules, roll, 10, rules.bossRarityWeights, ['guardian']).rarity).toBeGreaterThanOrEqual(2);
  });
  it.each([
    ['SPD on a helmet', item({ slot: 'head', rarity: 1, affixes: ['speed'] })],
    ['the wrong affix count', item({ rarity: 2, affixes: ['hp'] })],
    ['a repeated affix', item({ rarity: 2, affixes: ['hp', 'hp'] })],
    ['a legendary without a special', item({ rarity: 4, affixes: ['hp', 'armour', 'resist'] })],
    ['an affix the slot cannot roll', item({ rarity: 1, affixes: ['leech'] })],
    ['a roll quality outside 80–120', item({ q: { main: 121, affixes: [] } })],
    ['roll qualities that miss an affix', item({ rarity: 1, affixes: ['hp'], q: { main: 100, affixes: [] } })],
    ['a weapon without a class', item({ slot: 'weapon' })],
    ['a class on armour', item({ hero: 'guardian' })],
    ['an extra field', { ...item({}), shine: 3 } as Item],
    ['an enhance level above the rarity cap', item({ plus: 6 })],
  ])('rejects %s', (_, bad) => expect(itemValid(map, bad, heroIds)).toBe(false));
});

describe('equipment in battle', () => {
  const party = (gear: Gear) => withParty(veilSiege, [member('guardian'), member('tracer', gear), member('weaver'), member('healer', gear.charm ? { charm: gear.charm } : undefined)]);
  it('starting barrier and Support apply', () => {
    const d = party({ body: item({ slot: 'body', rarity: 2, affixes: ['barrier', 'hp'] }), charm: item({ uid: 2, slot: 'charm' }) });
    const s = createBattle(d);
    expect(s.heroes.find(h => h.id === 'tracer')!.barrier).toBe(3); expect(s.heroes.find(h => h.id === 'weaver')!.barrier).toBe(0);
    let t = until(createBattle(d), d, 'healer'); t = { ...t, heroes: t.heroes.map(h => h.id === 'guardian' ? { ...h, hp: 10 } : h) };
    const heal = act(t, d, 'heal', 'guardian').turns[0]!.events.find(e => e.type === 'heal')!;
    // The charm's main Support (+6%) raises the priest's heal.
    expect(heal.amount).toBe(Math.round(20 * (100 + 6) / 100));
  });
  it('last stand saves the wearer once per battle', () => {
    const d = party({ body: item({ slot: 'body', rarity: 4, affixes: ['hp', 'armour', 'resist'], special: 'laststand' }) });
    let s = createBattle(d); s = { ...s, heroes: s.heroes.map(h => h.id === 'tracer' ? { ...h, hp: 2 } : h) };
    let saved = 0; let down = false;
    for (let i = 0; i < 30 && s.outcome === 'active' && !down; i++) {
      const r = act(s, d, 'attack', 'brute'); saved += r.events.filter(e => e.type === 'stand' && e.targetId === 'tracer').length;
      down = r.events.some(e => e.type === 'down' && e.targetId === 'tracer'); s = r.state;
      if (saved) expect(s.lastStand).toEqual(['tracer']);
    }
    expect(saved).toBe(1);
  });
  it('mark hunter adds 8 on a marked enemy; renewal heals 4 at the wearer’s turn', () => {
    const d = party({ weapon: item({ slot: 'weapon', hero: 'tracer', rarity: 4, affixes: ['hp', 'attack', 'leech'], special: 'markhunter' }) });
    const plain = party({});
    const marked = (data: EncounterDefinition) => { const s = until(createBattle(data), data, 'tracer'); return { ...s, enemies: s.enemies.map(e => e.id === 'brute' ? { ...e, markedUntil: s.round + 2 } : e) }; };
    const hit = (data: EncounterDefinition) => act(marked(data), data, 'attack', 'brute').turns[0]!.events.find(e => e.type === 'damage')!.amount!;
    expect(hit(d) - hit(plain)).toBe(member('tracer', { weapon: item({ slot: 'weapon', hero: 'tracer', rarity: 4, affixes: ['hp', 'attack', 'leech'], special: 'markhunter' }) }).attack - member('tracer').attack + 8);
    const r = party({ head: item({ slot: 'head', rarity: 4, affixes: ['hp', 'resist', 'support'], special: 'renewal' }) });
    let s = createBattle(r); s = { ...s, heroes: s.heroes.map(h => h.id === 'tracer' ? { ...h, hp: 20 } : h) };
    const events: { text: string }[] = []; for (let i = 0; i < 8 && !events.some(e => e.text === 'Renewal.'); i++) { const x = act(s, r, 'attack', 'brute'); events.push(...x.events); s = x.state; }
    expect(events.find(e => e.text === 'Renewal.')).toMatchObject({ targetId: 'tracer', amount: 4 });
  });
});

// Win the active battle with the teaching advisor and apply it.
function win(state: ExpeditionState) {
  const data = battleData(state, map, lookup)!; let s = battleState(state, map, lookup)!;
  while (s.outcome === 'active') { const l = battleLesson(s, data)!; s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(state, map, lookup, s.commands), map, lookup);
}
function nextBattle(s: ExpeditionState): ExpeditionState {
  for (let i = 0; i < 300 && !s.battle; i++) s = move(s, map, i % 2 ? 'up' : 'down').state;
  return s;
}

describe('drops', () => {
  it('random victories drop at the drop chance, guaranteed after the pity; items ride with the run', () => {
    let s = newExpedition(map, lookup, 8, undefined, true); let drops = 0, longest = 0, dry = 0;
    for (let i = 0; i < 12; i++) {
      s = nextBattle(s); expect(s.battle?.kind).toBe('random');
      const level = s.battle!.level; const r = win(s); s = r.state;
      // Keep the party fresh so every battle is a win.
      for (const id of Object.keys(s.hp)) s.hp[id] = memberHp(s, id);
      if (r.event.type === 'victory' && r.event.item) { drops++; dry = 0; expect(r.event.item.level).toBe(level); } else dry++;
      longest = Math.max(longest, dry);
    }
    expect(drops).toBe(s.found.length); expect(drops).toBeGreaterThan(0); expect(longest).toBeLessThan(rules.pity);
    for (const f of s.found) expect(itemValid(map, f, heroIds, true)).toBe(true);
  });
  it('the boss always drops bossDrops items of rare or better; the tutorial never drops', () => {
    let s = newExpedition(map, lookup, 8);
    s = nextBattle(s); expect(s.battle!.kind).toBe('tutorial');
    const t = win(s); expect(t.event.type === 'victory' && t.event.item).toBeFalsy();
    const boss = { ...t.state, battle: { kind: 'boss' as const, encounterId: map.bossEncounterId, entry: Object.fromEntries(t.state.roster.deployed.map(id => [id, memberHp(t.state, id)])), commands: [] } };
    const b = win(boss);
    if (b.event.type === 'victory') {
      expect(rules.bossDrops).toBe(3); expect(b.state.found).toHaveLength(rules.bossDrops); expect(b.event.items).toEqual(b.state.found);
      expect(b.event.item).toEqual(b.state.found[0]); for (const i of b.state.found) expect(i.rarity).toBeGreaterThanOrEqual(2);
    }
    else expect(b.event.type).toBe('victory');
  });
});
const memberHp = (s: ExpeditionState, id: string) => starred(heroDef(lookup, map, id)!, s.members[id]?.stars ?? 1, map, s.members[id]?.level ?? 1).maxHp;

describe('lobby: bag, equip, salvage, settle', () => {
  const withBag = (...items: Item[]) => ({ ...newProfile(map, 3), items, nextItem: 100 });
  it('found items come home on complete/withdraw, a wipe keeps only the best one, and a full bag salvages the rest', () => {
    const run = newExpedition(map, lookup, 1); run.found = [item({ uid: 0, rarity: 1, affixes: ['hp'] }), item({ uid: 0 })];
    const done = settle(newProfile(map, 1), run, 'withdrawn', map);
    expect(done.items.map(i => i.uid)).toEqual([1, 2]); expect(done.nextItem).toBe(3); expect(done.last).toMatchObject({ items: 2, salvaged: 0 });
    const wiped = settle(newProfile(map, 1), run, 'wiped', map);
    expect(wiped.items).toHaveLength(rules.wipeKeep); expect(wiped.items[0]).toMatchObject({ uid: 1, rarity: 1 }); expect(wiped.last).toMatchObject({ items: 1 });
    // Ties on rarity go to the higher level, then the earliest found.
    const tie = { ...run, found: [item({ uid: 0, level: 3 }), item({ uid: 0, level: 5, slot: 'head' }), item({ uid: 0, level: 5 })] };
    expect(settle(newProfile(map, 1), tie, 'wiped', map).items.map(i => i.slot)).toEqual(['head']);
    expect(settle(newProfile(map, 1), { ...run, found: [] }, 'wiped', map).items).toEqual([]);
    const full = { ...newProfile(map, 1), items: Array.from({ length: rules.bagCap - 1 }, (_, i) => item({ uid: i + 1 })), nextItem: rules.bagCap };
    const over = settle(full, run, 'complete', map);
    expect(over.items).toHaveLength(rules.bagCap); expect(over.last).toMatchObject({ items: 1, salvaged: 1 }); expect(over.bank.dust).toBe(rules.salvage[0]!.dust);
  });
  it('equip swaps with the slot, weapons only fit their class, unequip needs bag space, salvage pays ore and dust', () => {
    let p = withBag(item({ uid: 5, slot: 'weapon', hero: 'tracer' }), item({ uid: 6 }), item({ uid: 7, rarity: 2, affixes: ['hp', 'armour'] }));
    expect(equip(p, 'guardian', 5).event).toEqual({ type: 'blocked', reason: 'class' });
    p = equip(p, 'tracer', 5).profile; p = equip(p, 'guardian', 6).profile;
    expect(p.items.map(i => i.uid)).toEqual([7]); expect(p.members.guardian!.gear!.body!.uid).toBe(6);
    p = equip(p, 'guardian', 7).profile;
    expect(p.items.map(i => i.uid)).toEqual([6]); expect(p.members.guardian!.gear!.body!.uid).toBe(7);
    p = unequip(p, map, 'guardian', 'body').profile; expect(p.members.guardian!.gear).toBeUndefined(); expect(p.items).toHaveLength(2);
    const s = salvage(p, map, [7, 6]);
    expect(s.event).toEqual({ type: 'salvaged', count: 2, ore: 7, dust: 5 }); expect(s.profile.items).toEqual([]);
    expect(salvage(p, map, [5]).event.type).toBe('blocked');
    const fullBag = { ...p, items: Array.from({ length: rules.bagCap }, (_, i) => item({ uid: 200 + i })), nextItem: 300 };
    expect(unequip(fullBag, map, 'tracer', 'weapon').event).toEqual({ type: 'blocked', reason: 'full' });
  });
  it('a dismissed member’s gear returns to the bag; a departure carries gear into the run', async () => {
    let p = withBag(item({ uid: 9, slot: 'boots', level: 9 })); p = equip(p, 'tracer', 9).profile;
    const { departure } = await import('../src/core/world/profile');
    const run = departure(p, map, lookup, 4);
    expect(run.hp.tracer).toBe(member('tracer', { boots: item({ uid: 9, slot: 'boots', level: 9 }) }).maxHp);
    expect(dismiss(p, map, 'tracer').profile.items.map(i => i.uid)).toEqual([9]);
  });
});

describe('save v9', () => {
  const memory = () => { const v = new Map<string, string>(); return { getItem: (k: string) => v.get(k) ?? null, setItem: (k: string, x: string) => { v.set(k, x); } }; };
  it('round-trips the bag, gear and found items; v8 data migrates empty', () => {
    let profile = { ...newProfile(map, 4), items: [item({ uid: 1 }), item({ uid: 2, slot: 'charm', rarity: 4, affixes: ['speed', 'support', 'luck'], special: 'laststand' })], nextItem: 3 };
    profile = equip(profile, 'healer', 2).profile;
    const run = newExpedition(map, lookup, 2, { roster: profile.party, members: structuredClone(profile.members) }); run.found = [item({ uid: 0, level: 3 })]; run.dry = 2;
    const store = memory(); saveGame(store, { profile, run });
    const back = loadGame(store, map, lookup)!;
    expect(back.profile.items).toEqual(profile.items); expect(back.profile.members.healer!.gear).toEqual(profile.members.healer!.gear);
    expect(back.run!.found).toEqual(run.found); expect(back.run!.dry).toBe(2); expect(back.run!.members.healer!.gear!.charm!.uid).toBe(2);
    const v8 = JSON.parse(JSON.stringify({ version: 8, profile: newProfile(map, 4), run: newExpedition(map, lookup, 2) }));
    delete v8.profile.items; delete v8.profile.nextItem; delete v8.profile.bank.dust; delete v8.run.found; delete v8.run.dry;
    const old = parseGame(JSON.stringify(v8), map, lookup);
    expect(old.profile.items).toEqual([]); expect(old.profile.bank.dust).toBe(0); expect(old.run!.found).toEqual([]);
  });
  it.each([
    ['a duplicated uid', (p: ReturnType<typeof newProfile>) => ({ ...p, items: [item({ uid: 1 }), item({ uid: 1 })], nextItem: 2 })],
    ['a uid at or above nextItem', (p: ReturnType<typeof newProfile>) => ({ ...p, items: [item({ uid: 4 })], nextItem: 4 })],
    ['another class’s weapon equipped', (p: ReturnType<typeof newProfile>) => ({ ...p, nextItem: 5, members: { ...p.members, guardian: { stars: 1, dupes: 0, gear: { weapon: item({ uid: 4, slot: 'weapon', hero: 'tracer' }) } } } })],
    ['an item in the wrong slot', (p: ReturnType<typeof newProfile>) => ({ ...p, nextItem: 5, members: { ...p.members, guardian: { stars: 1, dupes: 0, gear: { head: item({ uid: 4 }) } } } })],
  ])('rejects %s', (_, make) => {
    expect(() => parseGame(JSON.stringify({ version: 9, profile: make(newProfile(map, 4)), run: null }), map, lookup)).toThrow();
  });
});
