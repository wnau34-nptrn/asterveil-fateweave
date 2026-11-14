import { chapterOne as map } from '../../src/content/world/chapter1';
import { isBigTree } from '../../src/core/world/talents';
import type { TalentNodeDef, Talents } from '../../src/core/world/types';

// P04-03 (OD-02/19/20): every legal big-tree build at a camp level and a point total, counted by exhaustive search.
// The gates are restated here on purpose: `tests/tree-points.test.ts` checks sampled builds against `talentsValid`.
// `spare` = points left with nothing to buy; `countBuilds(id, 99).spare` gives the most ranks one build can hold.
export interface TreeCount { id: string; nodes: number; ranks: number; full: number; builds: number; skills: number; allSkills: number; deepBranches: number; spare: number }
const cap = map.progression.levelCap;
export function countBuilds(id: string, points: number, level = cap, sample?: (t: Talents) => void): TreeCount {
  const tree = map.talents[id] ?? [], lv = Math.min(level, cap);
  const usable = tree.filter(n => !n.tier || lv >= (map.progression.treeTiers[n.tier - 1] ?? Infinity));
  const t: Record<string, number> = {};
  const ok = (): boolean => usable.every(n => !t[n.id] || (
    (!n.tier || n.tier === 1 || usable.some(o => o.branch === n.branch && o.tier === n.tier! - 1 && t[o.id])) &&
    (!n.needs || !!t[n.needs]) && (!n.choice || !usable.some(o => o.id !== n.id && o.choice === n.choice && t[o.id]))));
  const unlocks = (n: TalentNodeDef) => 'unlock' in n.effect;
  let bestSpent = -1;
  const all: { spent: number; skills: number; deep: number; t: Talents }[] = [];
  const walk = (i: number, spent: number): void => {
    if (i === usable.length) {
      if (!ok()) return;
      const skills = usable.filter(n => t[n.id] && unlocks(n)).length;
      const deep = new Set(usable.filter(n => t[n.id] && n.tier === Math.max(...usable.filter(o => o.branch === n.branch).map(o => o.tier ?? 0))).map(n => n.branch)).size;
      all.push({ spent, skills, deep, t: { ...t } }); return;
    }
    const n = usable[i]!;
    for (let r = 0; r <= n.max && spent + r <= points; r++) { if (r) t[n.id] = r; else delete t[n.id]; walk(i + 1, spent + r); }
    delete t[n.id];
  };
  walk(0, 0);
  for (const b of all) if (b.spent > bestSpent) bestSpent = b.spent;
  const top = all.filter(b => b.spent === bestSpent), full = top.length;
  if (sample) for (let k = 0; k < top.length; k += Math.max(1, Math.floor(top.length / 40))) sample(top[k]!.t);
  return { id, nodes: usable.length, ranks: usable.reduce((a, n) => a + n.max, 0), full, builds: all.length,
    skills: Math.max(...top.map(b => b.skills)), allSkills: usable.filter(unlocks).length, deepBranches: Math.max(...top.map(b => b.deep)), spare: points - bestSpent };
}
export const bigTreeIds = (): string[] => Object.keys(map.talents).filter(id => isBigTree(map.talents[id]));
