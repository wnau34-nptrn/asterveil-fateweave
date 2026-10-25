import { describe, expect, it } from 'vitest';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { encounterById } from '../src/content/encounters/catalog';
import { rosterBatch1 } from '../src/content/heroes/roster-batch1';
import { chapterOne } from '../src/content/world/chapter1';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { heroDef, skillChoices, starred } from '../src/core/world/world';
import { talentsValid } from '../src/core/world/talents';
import { tomeLine } from '../src/core/world/tomes';
import type { MapDefinition, Talents } from '../src/core/world/types';

// These are real content/world integration contracts: new hires remain absent from the story draft,
// personal nodes cost the existing budget and obey the same prerequisites as shared class branches.
describe('C12 batch 1 catalog and progression', () => {
  it('keeps the four new hires out of the original draft and resolves their starting kit through the game catalog', () => {
    for (const member of rosterBatch1) {
      expect(ruinsMap.draft?.pool).not.toContain(member.id);
      expect(ruinsMap.prologueGuests).not.toContain(member.id);
      expect(heroDef(encounterById, chapterOne, member.id)).toEqual(member);
      expect(member.actions).toHaveLength(3);
      for (const action of member.actions) expect(veilSiege.skills[action]).toBeDefined();
      expect(starred(member, 5, chapterOne).actions).toEqual(member.actions);
      expect(starred(member, 5, chapterOne).passive).toBeUndefined();
    }
  });

  it('unlocks each full class kit using the shared tree and uses the correct tome line', () => {
    for (const member of rosterBatch1) {
      const tree = chapterOne.talents[member.id]!;
      const all = Object.fromEntries(tree.map(n => [n.id, n.max]));
      const choices = skillChoices(member, chapterOne, all);
      expect(new Set(choices).size).toBe(6);
      for (const action of choices) expect(veilSiege.skills[action]).toBeDefined();
      expect(tomeLine(chapterOne, member.id)).toBe(member.role === 'Saint' ? 'bulwark' : 'accord');
      const common = tree.filter(n => n.branch !== 'p');
      expect(common).toHaveLength(16);
      expect(new Set(common.map(n => n.id)).size).toBe(16);
    }
  });

  it('requires paid sequential personal tiers and rejects mutually exclusive class modifiers', () => {
    const later: MapDefinition = { ...chapterOne, progression: { ...chapterOne.progression, levelCap: 20 } };
    for (const member of rosterBatch1) {
      const valid = (talents: Talents, level = 15) => talentsValid(later, member.id, level, talents);
      expect(valid({ p1: 1 }, 1)).toBe(false); // A level-one hire has no free point.
      expect(valid({ p1: 1 }, 2)).toBe(true);
      expect(valid({ p2: 1 })).toBe(false);
      expect(valid({ p1: 1, p2: 1 }, 4)).toBe(false);
      expect(valid({ p1: 1, p2: 1, p3: 1, p4: 1 })).toBe(true);
      expect(valid({ p1: 1, p2: 1, p4: 1 })).toBe(false);
      expect(valid({ a1: 1, a2x: 1, a2y: 1 })).toBe(false);
      expect(valid({ c1: 1, c2x: 1 })).toBe(false); // c2 explicitly needs the unlocked c1s skill.
    }
  });

  it('shares only the class nodes between partners; each personal branch has its own effects', () => {
    for (const [first, second] of [['metta', 'thiran'], ['lalin', 'wila']]) {
      const a = chapterOne.talents[first!]!, b = chapterOne.talents[second!]!;
      expect(a.filter(n => n.branch !== 'p')).toEqual(b.filter(n => n.branch !== 'p'));
      expect(a.filter(n => n.branch === 'p').map(n => n.effect)).not.toEqual(b.filter(n => n.branch === 'p').map(n => n.effect));
    }
  });
});
