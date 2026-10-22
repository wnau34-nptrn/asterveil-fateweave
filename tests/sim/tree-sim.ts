// Release A big trees (docs/design/SKILL_TREES_ALL_TH.md): each class fights the mid-game sets with no tree points and
// with the three example builds of its section (★3 Lv10, 11 points; capstones open at Lv15), in a party with three
// teaching members, played by the teaching advisor. A tree works when every build keeps a winning route and none is
// strictly worse than spending nothing.
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { beginBattle, resolveCommand, withLevel, withParty } from '../../src/core/battle/engine';
import type { ActionId } from '../../src/core/battle/types';
import type { Talents } from '../../src/core/world/types';
import { heroCatalog, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';

export interface TreeBuild { id: string; name: string; talents: Talents; loadout: ActionId[] }
export const TREE_BUILDS: readonly TreeBuild[] = [
  { id: 'tracer', name: 'นักล่าตรา', talents: { a1: 2, a2d: 1, a3: 1, a3s: 1, b1: 1, b2: 1, b3r: 1, c1: 2 }, loadout: ['mark', 'execute', 'lunge'] },
  { id: 'tracer', name: 'เพชฌฆาต', talents: { a1: 2, a2s: 1, b1: 2, b2: 1, b3d: 1, c1: 2 }, loadout: ['mark', 'execute', 'finisher'] },
  { id: 'tracer', name: 'นักดาบหน้า', talents: { c1: 2, c1s: 1, c2m: 1, c3: 1, b1: 2, a1: 2 }, loadout: ['parry', 'sweep', 'execute'] },
  { id: 'weaver', name: 'ปืนใหญ่', talents: { a1: 2, a2s: 1, a3: 1, a3s: 1, c1: 2 }, loadout: ['bolt', 'storm', 'ward'] },
  { id: 'weaver', name: 'ผู้คุ้มกัน', talents: { b1: 2, b2t: 1, b3: 1, a1: 2 }, loadout: ['ward', 'aegis', 'bolt'] },
  { id: 'weaver', name: 'ผู้ผนึก', talents: { c1: 2, c1s: 1, c2d: 1, c3: 1, a1: 1, a2p: 1 }, loadout: ['sigil', 'dispel', 'bolt'] },
  { id: 'healer', name: 'ผู้เยียวยา', talents: { a1: 2, a2t: 1, a3: 1, c1: 1, c2l: 1 }, loadout: ['heal', 'prayer', 'revive'] },
  { id: 'healer', name: 'ผู้คุ้มครอง', talents: { b1: 2, b1s: 1, b2s: 1, b3: 1, a1: 2 }, loadout: ['sanctuary', 'halo', 'heal'] },
  { id: 'healer', name: 'ผู้หนุน', talents: { c1: 2, c2q: 1, c3: 1, a1: 2 }, loadout: ['bless', 'prayer', 'heal'] },
  { id: 'garran', name: 'กำแพงหนาม', talents: { a1: 2, a2k: 1, a3: 1, b1: 2 }, loadout: ['brace', 'spearwall', 'pierce'] },
  { id: 'garran', name: 'หอกล่า', talents: { b1: 2, b2d: 1, b3: 1, a1: 2 }, loadout: ['pierce', 'halt', 'brace'] },
  { id: 'garran', name: 'ผู้คุมแนว', talents: { c1: 2, c1s: 1, c2r: 1, c3: 1, a1: 2 }, loadout: ['hold', 'brace', 'warcry'] },
  { id: 'mira', name: 'นักแม่นธนู', talents: { a1: 2, a2h: 1, a3: 1, c1: 2, c1s: 1, c2q: 1, c3: 1 }, loadout: ['hinder', 'weakshot', 'track'] },
  { id: 'mira', name: 'ฝนธนู', talents: { b1: 2, b2h: 1, b3: 1, a1: 2 }, loadout: ['volley', 'pin', 'hinder'] },
  { id: 'mira', name: 'พราน', talents: { c1: 2, c1s: 1, c2c: 1, a1: 2, a2s: 1, a3: 1 }, loadout: ['disengage', 'hinder', 'weakshot'] },
];
const fights = ['thicket-ambush', 'shadow-stalker', 'crystal-stampede', 'rear-ambush', 'elite-tusk-chief', 'elite-briar-lord', 'beetle-wall', 'forest-swarm', 'channeler-wisps', 'crawler-pack'];
export interface TreeRow { id: string; build: string; won: number; fought: number; partyHp: number; rounds: number; used: number }
export const TREE_LEVEL = 10, TREE_STARS = 3;
export function treeSim(fightLevel = 15): TreeRow[] {
  const catalog = heroCatalog(lookup, map); const teaching = catalog.slice(0, 4);
  const rows: TreeRow[] = [];
  const builds: TreeBuild[] = [...new Set(TREE_BUILDS.map(b => b.id))].flatMap(id => [{ id, name: 'ไม่ลงแต้ม', talents: {}, loadout: [] }, ...TREE_BUILDS.filter(b => b.id === id)]);
  for (const b of builds) {
    const base = catalog.find(h => h.id === b.id)!; const mates = teaching.filter(h => h.id !== b.id).slice(0, 3).map(h => starred(h, TREE_STARS, map, TREE_LEVEL));
    const me = starred(base, TREE_STARS, map, TREE_LEVEL, b.talents, undefined, b.loadout.length ? { loadout: b.loadout } : undefined);
    const party = base.lane === 'front' ? [mates[0]!, me, ...mates.slice(1)] : [...mates.slice(0, 2), me, mates[2]!];
    const row: TreeRow = { id: b.id, build: b.name, won: 0, fought: 0, partyHp: 0, rounds: 0, used: 0 };
    for (const id of fights) {
      const data = withParty(withLevel(lookup(id)!, fightLevel, map.progression.monsterLevelPercent), party);
      let s = beginBattle(data).state;
      for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
        const l = battleLesson(s, data)!; if (l.heroId === b.id && b.loadout.includes(l.action) && !base.actions.includes(l.action)) row.used++;
        s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state;
      }
      row.fought++; if (s.outcome === 'victory') row.won++; row.rounds += s.round;
      row.partyHp += s.heroes.reduce((n, h) => n + h.hp, 0) / data.heroes.reduce((n, h) => n + h.maxHp, 0);
    }
    rows.push(row);
  }
  return rows;
}
export function treeReport(rows: TreeRow[]): string {
  const lines = ['| Class | Build | Won | Party HP left | Rounds | Tree skills used |', '|---|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.id} | ${r.build} | ${r.won}/${r.fought} | ${Math.round(r.partyHp / r.fought * 100)}% | ${(r.rounds / r.fought).toFixed(1)} | ${r.used} |`);
  return lines.join('\n');
}
