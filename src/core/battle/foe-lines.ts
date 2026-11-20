// Foe lines (owner 2026-11-20): `f1`/`b1`, `f2`/`b2` and `f3`/`b3` are lines. A spear's pierce runs from a front foe to the
// back foe of its line and a shove swaps the two, so both foes of a line always stand in one field row. The row of each
// line is fixed for the whole encounter (reserves included), so a summon or a fall never moves anyone.
// - With a boss (or a `leader`, a boss fought without its mechanics): the boss's line stands in the middle row, line 3 at the top and line 2 at the bottom.
// - Without one: one line in the middle; two lines at the top (lower number) and bottom; three lines 1 top, 3 middle, 2 bottom.
// Row neighbours (acid, smoke, venom splashes) follow these rows, so the foes drawn next to each other are the neighbours.
export type FoeLineRow = 0 | 1 | 2;
export const foeLine = (id: string): number => Number(id[1]);

export function foeLineRows(enemies: readonly { id: string; boss?: boolean; leader?: boolean }[]): Map<number, FoeLineRow> {
  const lines = [...new Set(enemies.map(e => foeLine(e.id)).filter(Number.isFinite))].sort((a, b) => a - b);
  const rows = new Map<number, FoeLineRow>();
  const boss = enemies.find(e => e.boss || e.leader);
  if (boss) {
    const own = foeLine(boss.id); rows.set(own, 1);
    const rest = lines.filter(l => l !== own);
    // Line 3 above the boss, line 2 below it (any other order: higher number above).
    const top = rest.includes(3) ? 3 : rest[rest.length - 1], bottom = rest.find(l => l !== top);
    if (top !== undefined) rows.set(top, 0);
    if (bottom !== undefined) rows.set(bottom, 2);
    return rows;
  }
  if (lines.length === 1) rows.set(lines[0]!, 1);
  else if (lines.length === 2) { rows.set(lines[0]!, 0); rows.set(lines[1]!, 2); }
  else if (lines.length === 3) { rows.set(lines[0]!, 0); rows.set(lines[2]!, 1); rows.set(lines[1]!, 2); }
  return rows;
}
