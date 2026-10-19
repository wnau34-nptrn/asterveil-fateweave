import type { MapDefinition, MemberProgress, TalentNode, Talents } from './types';

export const talentPoints = (map: MapDefinition, m: MemberProgress | undefined): number => Math.min(m?.level ?? 1, map.progression.levelCap) - 1;
export const talentsSpent = (t: Talents | undefined): number => Object.values(t ?? {}).reduce((a, b) => a + (b ?? 0), 0);
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
export function talentsValid(map: MapDefinition, heroId: string, level: number, t: Talents): boolean {
  const tree = map.talents[heroId] ?? [];
  if (Object.entries(t).some(([node, rank]) => { const def = tree.find(n => n.id === node); return !def || !Number.isInteger(rank) || rank! < 1 || rank! > def.max; })) return false;
  return talentsSpent(t) <= Math.min(level, map.progression.levelCap) - 1 && tree.every(n => !t[n.id] || talentOpen(t, n.id));
}
export function memberTalentReason(map: MapDefinition, id: string, m: MemberProgress | undefined, node: TalentNode): string {
  const def = map.talents[id]?.find(n => n.id === node);
  if (!m || !def) return 'unknown';
  const t = m.talents ?? {};
  if ((t[node] ?? 0) >= def.max) return 'max';
  if (!talentOpen(t, node)) return 'locked';
  return talentsSpent(t) >= talentPoints(map, m) ? 'points' : '';
}