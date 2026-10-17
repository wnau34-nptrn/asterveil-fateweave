import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { chapterOne as map } from '../src/content/world/chapter1';
import { createBattle, currentHeroId, resolveCommand, roundOrder, skillPower, withParty } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../src/core/battle/types';
import { parseGame } from '../src/core/save/expedition-save';
import { gearTotals, itemValid, rollItem } from '../src/core/world/equipment';
import { newProfile } from '../src/core/world/profile';
import type { Gear, GearSlot, Item, SetId } from '../src/core/world/types';
import { SET_IDS } from '../src/core/world/types';
import { heroDef, rollPercent, starred } from '../src/core/world/world';
import { skillDescription } from '../src/ui/th';

// Equipment sets (2D-3, docs/EXPEDITION_DESIGN.md "Equipment sets").
const slots: GearSlot[] = ['head', 'body', 'gloves', 'boots'];
const piece = (set: SetId, slot: GearSlot, uid = 1): Item => ({ uid, slot, rarity: 0, level: 1, affixes: [], set });
const wear = (set: SetId, n: number): Gear => Object.fromEntries(slots.slice(0, n).map((s, i) => [s, piece(set, s, i + 1)]));
const member = (id: string, gear?: Gear) => starred(heroDef(lookup, map, id)!, 1, map, 1, {}, gear);
const party = (id: string, gear: Gear) => withParty(veilSiege, ['guardian', 'tracer', 'weaver', 'healer'].map(h => member(h, h === id ? gear : undefined)));
const act = (s: BattleState, d: EncounterDefinition, action: ActionId, targetId: string) => resolveCommand(s, d, { beat: s.beat, heroId: currentHeroId(s, d)!, action, targetId });
function until(s: BattleState, d: EncounterDefinition, id: string): BattleState {
  for (let i = 0; i < 40 && currentHeroId(s, d) !== id; i++) s = act(s, d, 'attack', s.enemies.find(e => e.hp > 0)!.id).state;
  return s;
}
const ids = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann', 'lio'];

describe('set bonuses', () => {
  it('one piece does nothing; two give the stat; four add the rule', () => {
    const base = heroDef(lookup, map, 'guardian')!;
    const flat = gearTotals(map, wear('dawn', 1));
    expect(flat.hpPercent).toBe(0);
    expect(member('guardian', wear('dawn', 2)).maxHp).toBe(Math.round(base.maxHp * 1.1) + 4 + 7);
    expect(gearTotals(map, wear('dawn', 4)).gear).toMatchObject({ barrier: 12 });
    expect(member('guardian', wear('wind', 2)).speed).toBe(base.speed + 3);
    expect(gearTotals(map, wear('shadow', 2)).attackPercent).toBe(8);
    expect(gearTotals(map, wear('starveil', 2)).skill).toBe(1 + 10);
    expect(gearTotals(map, wear('mender', 2)).gear?.healBonus).toBe(15);
    expect(gearTotals(map, wear('wind', 4)).gear?.firstStrike).toBe(true);
    expect(gearTotals(map, wear('thorn', 4)).gear?.thorns).toBe(6);
    expect(gearTotals(map, wear('starveil', 4)).gear?.freeCast).toBe(true);
    expect(gearTotals(map, wear('mender', 4)).gear?.overflowCap).toBe(8);
    expect(gearTotals(map, wear('shadow', 4)).gear?.freshHit).toBe(6);
    // 2 + 2: two small bonuses at once.
    const mix = { ...wear('dawn', 2), gloves: piece('shadow', 'gloves', 3), boots: piece('shadow', 'boots', 4) };
    expect(gearTotals(map, mix)).toMatchObject({ hpPercent: 10, attackPercent: 8 });
  });
  it('wind ×4: the wearer acts first in round 1 only', () => {
    const d = party('healer', wear('wind', 4)); const s = createBattle(d);
    expect(s.order[0]).toBe('healer'); expect(roundOrder(s, d, 2)[0]).not.toBe('healer');
  });
  it('dawn ×4 starts with a barrier; thorn ×4 answers physical hits', () => {
    expect(createBattle(party('tracer', wear('dawn', 4))).heroes.find(h => h.id === 'tracer')!.barrier).toBe(12);
    const d = party('tracer', wear('thorn', 4)); let s = createBattle(d); const counters = [];
    for (let i = 0; i < 12 && !counters.length; i++) { const r = act(s, d, 'attack', 'brute'); counters.push(...r.events.filter(e => e.type === 'counter' && e.sourceId === 'tracer')); s = r.state; }
    expect(counters[0]).toMatchObject({ amount: 6, text: 'Thorns strike back.' });
  });
  it('shadow ×4: +6 on an enemy that has not acted yet this round', () => {
    // Same pieces without the set, so only the 4-piece rule differs.
    const bare = Object.fromEntries(Object.entries(wear('shadow', 4)).map(([k, v]) => [k, { ...v!, set: undefined }])) as Gear;
    const plain = party('weaver', JSON.parse(JSON.stringify(bare))); const d = party('weaver', wear('shadow', 4));
    const s = until(createBattle(d), d, 'weaver'); const p = until(createBattle(plain), plain, 'weaver');
    const pending = s.order.indexOf('brute') > s.turnIndex;
    const hit = (data: EncounterDefinition, st: BattleState) => act(st, data, 'bolt', 'brute').turns[0]!.events.find(e => e.type === 'damage')!.amount!;
    // The 2-piece Attack % also raises Arcane Bolt (damaging skills scale with Attack); the 4-piece adds 6 on top.
    expect(hit(d, s) - hit(plain, p)).toBe((pending ? 6 : 0) + skillPower(d, 'weaver', 'bolt') - skillPower(plain, 'weaver', 'bolt'));
    expect(pending).toBe(true);
  });
  it('star-veil ×4: the first skill of the battle has no cooldown, the second does', () => {
    const d = party('weaver', wear('starveil', 4));
    let s = until(createBattle(d), d, 'weaver'); const r = act(s, d, 'bolt', 'brute').turns[0]!.state;
    expect(r.heroes.find(h => h.id === 'weaver')!.cooldowns.bolt).toBeUndefined(); expect(r.freeCast).toEqual(['weaver']);
    s = until(act(s, d, 'bolt', 'brute').state, d, 'weaver');
    expect(act(s, d, 'bolt', 'brute').turns[0]!.state.heroes.find(h => h.id === 'weaver')!.cooldowns.bolt).toBe(s.round + 2);
  });
  it('mender ×4: overhealing becomes a barrier up to 8', () => {
    const d = party('healer', wear('mender', 4)); let s = until(createBattle(d), d, 'healer');
    s = { ...s, heroes: s.heroes.map(h => h.id === 'guardian' ? { ...h, hp: h.hp - 2 } : h) };
    expect(act(s, d, 'heal', 'guardian').turns[0]!.state.heroes.find(h => h.id === 'guardian')!.barrier).toBe(8);
  });
});

describe('set drops and saves', () => {
  it('a dropped item takes one of the given sets at the set chance', () => {
    let n = 0; const roll = () => rollPercent(5, n++); let withSet = 0;
    for (let i = 0; i < 1000; i++) {
      const it = rollItem(map.equipment, roll, 3, map.equipment.rarityWeights, ['guardian'], ['dawn', 'wind']);
      if (it.set) { withSet++; expect(['dawn', 'wind']).toContain(it.set); }
      expect(itemValid(map, it, ids, true)).toBe(true);
    }
    expect(withSet).toBeGreaterThan(500); expect(withSet).toBeLessThan(700);
    expect(rollItem(map.equipment, roll, 3, map.equipment.rarityWeights, ['guardian']).set).toBeUndefined();
  });
  it('zones name their sets; the boss can drop any', () => {
    expect(map.zones.find(z => z.id === 'meadow')!.sets).toEqual(['dawn', 'wind']);
    expect(map.zones.find(z => z.id === 'thicket')!.sets).toEqual(['shadow', 'thorn']);
    expect(map.zones.find(z => z.id === 'scar')!.sets).toEqual(['starveil', 'mender']);
    expect(SET_IDS).toHaveLength(6);
  });
  it('the save keeps sets and rejects unknown ones', () => {
    const p = { ...newProfile(map, 4), items: [piece('dawn', 'head')], nextItem: 2 };
    expect(parseGame(JSON.stringify({ version: 10, profile: p, run: null }), map, lookup).profile.items[0]!.set).toBe('dawn');
    const bad = { ...p, items: [{ ...piece('dawn', 'head'), set: 'moon' }] };
    expect(() => parseGame(JSON.stringify({ version: 10, profile: bad, run: null }), map, lookup)).toThrow();
  });
  it('skill text is unaffected', () => expect(skillDescription('bolt', 'weaver', party('weaver', wear('starveil', 4)))).toContain('ศรเวท'));
});
