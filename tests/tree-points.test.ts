import { describe, expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { talentsValid } from '../src/core/world/talents';
import type { Talents } from '../src/core/world/types';
import { countBuilds } from './sim/tree-points';

// P04-03 groundwork: the build counts quoted in docs/design/p04/TREE_BIGPICTURE_P04_03_TH.md (camp Lv10, tiers 1–3).
describe('legal big-tree builds by point total', () => {
  // Until tree points leave stars, a big tree has (Lv − 1) + (★ − 1) points: 12 at Lv10 is ★4.
  const stars = (points: number) => points - (map.progression.levelCap - 1) + 1;
  it('the enumerator agrees with the game rule on sampled full builds', () => {
    for (const id of ['guardian', 'healer', 'metta']) {
      const seen: Talents[] = []; countBuilds(id, 12, 10, t => seen.push(t));
      expect(seen.length).toBeGreaterThan(20);
      for (const t of seen) expect(talentsValid(map, id, 10, t, stars(12)), `${id} ${JSON.stringify(t)}`).toBe(true);
    }
  });
  it('12 points leave a choice; 15 points buy everything a class tree holds at Lv10', () => {
    expect(countBuilds('guardian', 12)).toMatchObject({ full: 160, spare: 0, skills: 4 });
    expect(countBuilds('healer', 12)).toMatchObject({ full: 48, spare: 0, skills: 4 });
    expect(countBuilds('guardian', 15)).toMatchObject({ full: 8, spare: 1 });
    expect(countBuilds('healer', 15)).toMatchObject({ full: 8, spare: 2 });
    expect(countBuilds('metta', 15)).toMatchObject({ full: 56, spare: 0 });
  });
});
