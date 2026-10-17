import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { createBattle, previewCommand, resolveCommand, skillPower, SUPPORT_SKILLS, withParty } from '../src/core/battle/engine';
import type { ActionId, HeroDefinition } from '../src/core/battle/types';
import type { Item } from '../src/core/world/types';
import { heroCatalog, starred } from '../src/core/world/world';
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
    const gloves: Item = { uid: 1, slot: 'gloves', rarity: 0, level: 1, affixes: [] };
    const charm: Item = { uid: 2, slot: 'charm', rarity: 0, level: 1, affixes: [] };
    const plain = starred(base, 1, map, 1); const armed = starred(base, 1, map, 1, {}, { gloves }); const charmed = starred(base, 1, map, 1, {}, { charm });
    expect(armed.attack).toBeGreaterThan(plain.attack);
    expect(powerOf(armed, 'bolt')).toBe(Math.round(26 * (100 + (armed.attack - plain.attack) * 100 / plain.attack) / 100));
    expect(powerOf(armed, 'ward')).toBe(Math.round(14 * (100 + (armed.skillBonus ?? 0)) / 100));
    expect(charmed.damageBonus).toBe(0); expect(charmed.skillBonus).toBeGreaterThan(0);
    expect(powerOf(charmed, 'bolt')).toBe(26); expect(powerOf(charmed, 'ward')).toBeGreaterThan(14);
    for (const a of SUPPORT_SKILLS) expect(all(heroCatalog(lookup, map).find(h => h.actions.includes(a) || h.unlocks?.skill === a)!)).toContain(a);
  });
  it('a geared party still previews exactly what it resolves', () => {
    const party = heroCatalog(lookup, map).slice(0, 4).map(h => starred(h, 2, map, 3, {}, { gloves: { uid: 1, slot: 'gloves', rarity: 2, level: 5, affixes: ['attack', 'skill'] } }));
    const d = withParty(data, party); let s = createBattle(d);
    for (let i = 0; i < 12 && s.outcome === 'active'; i++) {
      const l = battleLesson(s, d)!; const command = { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId };
      const r = resolveCommand(s, d, command); expect(previewCommand(s, d, command)).toEqual(r); s = r.state;
    }
  });
});
