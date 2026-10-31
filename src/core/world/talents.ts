import type { MapDefinition, MemberProgress, TalentNode, TalentNodeDef, TalentTree, Talents } from './types';

// Big skill trees (master plan A6) have branches and tiers; the older small trees keep the root/a/b shape.
export const isBigTree = (tree: TalentTree | undefined): boolean => !!tree?.some(n => n.tier !== undefined);
const treeOf = (map: MapDefinition, id: string): TalentTree => map.talents[id] ?? [];
// One point per camp level above 1 (P01: `level` is the camp's); a big tree adds one per star above ★1 until P04.
export const talentPoints = (map: MapDefinition, m: Pick<MemberProgress, 'stars'> | undefined, id: string | undefined, level: number): number =>
  Math.min(level, map.progression.levelCap) - 1 + (id && isBigTree(treeOf(map, id)) ? (m?.stars ?? 1) - 1 : 0);
export const talentsSpent = (t: Talents | undefined): number => Object.values(t ?? {}).reduce<number>((a, b) => a + (b ?? 0), 0);
// Spent ranks plus free granted nodes at full rank (grants never cost points).
export function effectiveTalents(tree: TalentTree, t: Talents | undefined, grants: readonly TalentNode[] = []): Talents {
  const out: Talents = { ...t }; for (const id of grants) { const def = tree.find(n => n.id === id); if (def) out[id] = def.max; } return out;
}
// Gates: the root first; tier 2 needs a rank in its tier 1; a capstone needs 4 ranks in its branch.
export function talentOpen(t: Talents, node: TalentNode): boolean {
  const r = (n: TalentNode) => t[n] ?? 0;
  if (node === 'root') return true;
  if (!r('root')) return false;
  const branch = node[0] as 'a' | 'b'; const tier = node[1];
  if (tier === '1') return true;
  if (tier === '2') return r(`${branch}1`) >= 1;
  return r(`${branch}1`) + r(`${branch}2`) >= 4;
}
// Big-tree gates: the tier's level, a rank in the branch's previous tier, a needed node, and one node per choice.
function bigReason(map: MapDefinition, tree: TalentTree, level: number, t: Talents, def: TalentNodeDef): string {
  const r = (id: TalentNode) => t[id] ?? 0;
  if (def.tier && level < (map.progression.treeTiers[def.tier - 1] ?? Infinity)) return 'level';
  if (def.tier && def.tier > 1 && !tree.some(n => n.branch === def.branch && n.tier === def.tier! - 1 && r(n.id) > 0)) return 'locked';
  if (def.needs && !r(def.needs)) return 'locked';
  if (def.choice && tree.some(n => n.id !== def.id && n.choice === def.choice && r(n.id) > 0)) return 'choice';
  return '';
}
export function talentsValid(map: MapDefinition, heroId: string, level: number, t: Talents, stars = 1, grants: readonly TalentNode[] = []): boolean {
  const tree = treeOf(map, heroId);
  if (Object.entries(t).some(([node, rank]) => { const def = tree.find(n => n.id === node); return !def || !Number.isInteger(rank) || rank! < 1 || rank! > def.max || grants.includes(node); })) return false;
  if (talentsSpent(t) > talentPoints(map, { stars }, heroId, level)) return false;
  if (!isBigTree(tree)) return !grants.length && tree.every(n => !t[n.id] || talentOpen(t, n.id));
  const all = effectiveTalents(tree, t, grants);
  return tree.every(n => !t[n.id] || !bigReason(map, tree, Math.min(level, map.progression.levelCap), all, n));
}
export function grantsValid(map: MapDefinition, heroId: string, grants: unknown): boolean {
  const tree = treeOf(map, heroId);
  return Array.isArray(grants) && grants.length > 0 && isBigTree(tree) && new Set(grants).size === grants.length && grants.every(g => tree.some(n => n.id === g));
}
export function memberTalentReason(map: MapDefinition, id: string, m: MemberProgress | undefined, node: TalentNode, level: number): string {
  const tree = treeOf(map, id); const def = tree.find(n => n.id === node);
  if (!m || !def) return 'unknown';
  const t = m.talents ?? {};
  if (m.grants?.includes(node) || (t[node] ?? 0) >= def.max) return 'max';
  if (isBigTree(tree)) { const why = bigReason(map, tree, Math.min(level, map.progression.levelCap), effectiveTalents(tree, t, m.grants), def); if (why) return why; }
  else if (!talentOpen(t, node)) return 'locked';
  return talentsSpent(t) >= talentPoints(map, m, id, level) ? 'points' : '';
}
