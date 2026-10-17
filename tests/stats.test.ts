import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { beginBattle, createBattle, defenseOf, previewCommand, resolveCommand, skillPower, SUPPORT_SKILLS, withParty } from '../src/core/battle/engine';
import type { ActionId, EncounterDefinition, HeroDefinition, Resolution } from '../src/core/battle/types';
import type { Item } from '../src/core/world/types';
import { gearTotals, itemStats, itemValid, rollItem, statLines } from '../src/core/world/equipment';
import { fuse, reroll } from '../src/core/world/forge';
import { newProfile } from '../src/core/world/profile';
import { parseGame } from '../src/core/save/expedition-save';
import { heroCatalog, move, newExpedition, partyLuck, rollPercent, starred } from '../src/core/world/world';
import { battleLesson } from '../src/ui/tutorial';

// Stats design step 1 (docs/STATS_DESIGN.md, owner-approved 2026-10-17): damaging skills grow with Attack,
// support skills with Support, and nothing changes for an unequipped ★1 Lv1 member.
const data = lookup(map.tutorialEncounterId)!;
const all = (h: HeroDefinition): ActionId[] => [...new Set([...h.actions, ...(h.unlocks ? [h.unlocks.skill] : [])])];
const powerOf = (h: HeroDefinition, action: ActionId) => skillPower(withParty(data, [h]), h.id, action);

describe('skill scaling', () => {
  it('every skill of every class hits for its listed power at ★1 Lv1 with no gear or talents', () => {
    for (const base of heroCatalog(lookup, map)) {
      const h = starred(base, 1, map, 1);
      for (const action of all(h)) expect(powerOf(h, action), `${h.id} ${action}`).toBe(data.skills[action].power);
    }
  });
  it('stars and levels raise damage and support skills by the same percent as before', () => {
    const base = heroCatalog(lookup, map).find(h => h.id === 'weaver')!; const h = starred(base, 3, map, 4);
    expect(h.damageBonus).toBe(h.skillBonus); expect(h.skillBonus).toBe(2 * 8 + 3 * 3);
    expect(powerOf(h, 'bolt')).toBe(Math.round(26 * 1.25)); expect(powerOf(h, 'ward')).toBe(Math.round(14 * 1.25));
  });
  it('gear Attack raises damaging skills only; gear Support (skill %) raises support skills only', () => {
    const base = heroCatalog(lookup, map).find(h => h.id === 'weaver')!;
    const gloves: Item = { uid: 1, slot: 'gloves', rarity: 0, level: 10, affixes: [] };
    const charm: Item = { uid: 2, slot: 'charm', rarity: 0, level: 1, affixes: [] };
    const plain = starred(base, 1, map, 1); const armed = starred(base, 1, map, 1, {}, { gloves }); const charmed = starred(base, 1, map, 1, {}, { charm });
    expect(armed.attack).toBeGreaterThan(plain.attack);
    // Gear Attack is a percent: the basic attack and Arcane Bolt both grow by it (gloves Lv10: +13%).
    expect(armed.damageBonus).toBe(13); expect(powerOf(armed, 'bolt')).toBe(Math.round(26 * 1.13));
    expect(powerOf(armed, 'ward')).toBe(Math.round(14 * (100 + (armed.skillBonus ?? 0)) / 100));
    expect(charmed.damageBonus).toBe(0); expect(charmed.skillBonus).toBeGreaterThan(0);
    expect(powerOf(charmed, 'bolt')).toBe(26); expect(powerOf(charmed, 'ward')).toBeGreaterThan(14);
    for (const a of SUPPORT_SKILLS) expect(all(heroCatalog(lookup, map).find(h => h.actions.includes(a) || h.unlocks?.skill === a)!)).toContain(a);
  });
  it('a geared party still previews exactly what it resolves', () => {
    const party = heroCatalog(lookup, map).slice(0, 4).map(h => starred(h, 2, map, 3, {}, { gloves: { uid: 1, slot: 'gloves', rarity: 2, level: 5, affixes: ['attack', 'support'] } }));
    const d = withParty(data, party); let s = createBattle(d);
    for (let i = 0; i < 12 && s.outcome === 'active'; i++) {
      const l = battleLesson(s, d)!; const command = { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId };
      const r = resolveCommand(s, d, command); expect(previewCommand(s, d, command)).toEqual(r); s = r.state;
    }
  });
});

// Stats step 2: Armour and Resistance cut hits taken by kind (capped), Leech heals from damage dealt (capped).
describe('armour, resistance and leech', () => {
  const party = heroCatalog(lookup, map).slice(0, 4);
  const firstHit = (d: EncounterDefinition) => {
    let r: Resolution = beginBattle(d); let s = r.state;
    for (let i = 0; i < 20; i++) {
      for (const t of r.turns) for (const e of t.events) if (e.type === 'damage' && t.side === 'enemy') return { ...e, kind: t.intent!.kind, raw: (e.amount ?? 0) + (e.absorbed ?? 0) };
      const l = battleLesson(s, d)!; r = resolveCommand(s, d, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }); s = r.state;
    }
    throw new Error('no enemy hit');
  };
  it('the hit taken shrinks by the defence matching its kind, rounded up, and never past the cap', () => {
    const plain = firstHit(withParty(data, party));
    const armoured = firstHit(withParty(data, party.map(h => ({ ...h, armour: 20 }))));
    const resistant = firstHit(withParty(data, party.map(h => ({ ...h, resist: 20 }))));
    const [matching, other] = plain.kind === 'physical' ? [armoured, resistant] : [resistant, armoured];
    expect(matching.raw).toBe(Math.ceil(plain.raw * 0.8)); expect(other.raw).toBe(plain.raw);
    const capped = withParty(data, party.map(h => ({ ...h, armour: 80, resist: 80 })));
    expect(defenseOf(capped, party[0]!.id, 'physical')).toBe(data.rules.defenseCap); expect(defenseOf(capped, party[0]!.id, 'energy')).toBe(30);
    expect(firstHit(capped).raw).toBe(Math.ceil(plain.raw * 0.7));
  });
  it('leech heals the hitter by a share of the damage dealt, up to its max HP; preview matches', () => {
    const d = withParty(data, party.map(h => ({ ...h, leech: 50 }))); // above the 20% cap
    let s = beginBattle(d, { hp: Object.fromEntries(party.map(h => [h.id, 10])) }).state;
    for (let i = 0; i < 10; i++) {
      const l = battleLesson(s, d)!; const command = { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId };
      const r = resolveCommand(s, d, command); expect(previewCommand(s, d, command)).toEqual(r);
      const events = r.turns[0]!.events; const dealt = events.filter(e => e.type === 'damage' && e.sourceId === l.heroId).reduce((n, e) => n + (e.amount ?? 0), 0);
      const healed = events.filter(e => e.type === 'heal' && e.text === 'Leech.').reduce((n, e) => n + (e.amount ?? 0), 0);
      if (dealt) { expect(healed).toBe(Math.floor(dealt * data.rules.leechCap / 100)); return; }
      s = r.state;
    }
    throw new Error('no hero hit');
  });
});

// Stats step 3: main stats by slot, class weapon pools, 80–120% rolls, map stats and the v21 migration.
describe('gear rolls and map stats', () => {
  const rules = map.equipment;
  it('every rolled item has qualities in range for its main stats and each affix; values follow them', () => {
    let n = 0; const roll = () => rollPercent(5, n++);
    for (let i = 0; i < 500; i++) {
      const it = rollItem(rules, roll, 6, rules.rarityWeights, ['healer', 'tracer']);
      expect(itemValid(map, it, heroCatalog(lookup, map).map(h => h.id), true)).toBe(true);
      expect(it.q!.affixes).toHaveLength(it.affixes.length);
      if (it.slot === 'weapon') expect(Object.keys(itemStats(rules, { ...it, affixes: [], q: undefined }))).toEqual([it.hero === 'healer' ? 'support' : 'attack']);
    }
    const plain: Item = { uid: 1, slot: 'body', rarity: 1, level: 10, affixes: ['armour'] };
    expect(itemStats(rules, { ...plain, q: { main: 120, affixes: [80] } })).toEqual({ hp: Math.round(25 * 1.2), armour: Math.round(6.6 * 1.2) + Math.round(5.6 * 0.8) });
    expect(statLines(rules, { ...plain, q: { main: 80, affixes: [100] } })).toEqual([
      { stat: 'hp', value: 20, max: 30, affix: false }, { stat: 'armour', value: 5, max: 8, affix: false }, { stat: 'armour', value: 6, max: 7, affix: true }]);
  });
  it('the forge rerolls an affix with a fresh quality and fused affixes get one too', () => {
    const own: Item = { uid: 1, slot: 'body', rarity: 1, level: 5, affixes: ['hp'], q: { main: 90, affixes: [81] } };
    const p = { ...newProfile(map, 3), items: [own, { ...own, uid: 2 }, { ...own, uid: 3 }], nextItem: 4, bank: { ore: 999, gold: 0, seal: 9, dust: 999 } };
    const r = reroll(p, map, 1, 0).profile.items[0]!;
    expect(r.affixes[0]).not.toBe('hp'); expect(r.q!.main).toBe(90); expect(itemValid(map, r, ['guardian'])).toBe(true);
    const f = fuse(p, map, 1).profile.items[0]!;
    expect(f.affixes).toHaveLength(2); expect(f.q!.affixes).toHaveLength(2); expect(f.q!.affixes[0]).toBe(81); expect(itemValid(map, f, ['guardian'])).toBe(true);
  });
  it('trail regen heals standing members every few steps (with the lookup); luck adds to the drop chance, capped', () => {
    const boots: Item = { uid: 1, slot: 'boots', rarity: 1, level: 10, affixes: ['regen'] };
    let s = newExpedition(map, lookup, 4, undefined, true); s.members.guardian = { ...s.members.guardian!, gear: { boots } }; s.hp.guardian = 20;
    const regen = gearTotals(map, { boots }).regen; expect(regen).toBe(Math.round(2 + 0.3 * 9));
    let healed = 0;
    for (let i = 0; i < 12 && !s.battle; i++) { const before = s.hp.guardian!; const r = move(s, map, i % 2 ? 'left' : 'right', lookup); if (r.event.type !== 'moved') break; s = r.state; healed += s.hp.guardian! - before; }
    expect(s.steps).toBeGreaterThanOrEqual(5); expect(healed).toBe(Math.floor(s.steps / rules.regenSteps) * regen);
    const lucky = (luck: number): Item => ({ uid: 2, slot: 'charm', rarity: 3, level: 99, affixes: ['luck', 'support', 'speed'], q: { main: 100, affixes: [luck, 100, 100] } });
    const t = newExpedition(map, lookup, 4); for (const id of t.roster.deployed) t.members[id] = { ...t.members[id]!, gear: { charm: lucky(120) } };
    expect(partyLuck(t, map)).toBe(rules.luckCap);
  });
  it('a v20 save moves skill/heal affixes to Support and refits affixes the slot can no longer roll', () => {
    const profile = { ...newProfile(map, 3), items: [
      { uid: 1, slot: 'head', rarity: 2, level: 3, affixes: ['skill', 'attack'] },
      { uid: 2, slot: 'charm', rarity: 3, level: 3, affixes: ['heal', 'skill', 'speed'] },
      { uid: 3, slot: 'weapon', hero: 'healer', rarity: 1, level: 3, affixes: ['attack'] },
    ], nextItem: 4 };
    const g = parseGame(JSON.stringify({ version: 20, profile, run: null }), map, lookup);
    expect(g.profile.items.map(i => i.affixes)).toEqual([['support', 'attack'], ['support', 'attack', 'speed'], ['support']]);
    for (const it of g.profile.items) expect(itemValid(map, it, ['healer'])).toBe(true);
  });
});
