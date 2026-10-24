// Formation comparison in single battles (owner 2026-10-22): the teaching party (★3 Lv6) fights the mid-game sets of
// the class gear check at fight level `level` in each formation, played by the teaching advisor or by blind basic
// attacks. `taken` splits the damage the party takes by each hero's class lane, so a formation that hides the
// fragile classes from physical moves shows up as less damage on the back-lane classes.
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { beginBattle, currentHeroId, resolveCommand, targetOptions, withLevel, withParty } from '../../src/core/battle/engine';
import { placed } from '../../src/core/world/formation';
import type { Lane } from '../../src/core/world/types';
import { heroCatalog, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';

const fights = ['thicket-ambush', 'shadow-stalker', 'crystal-stampede', 'rear-ambush', 'elite-tusk-chief', 'elite-briar-lord', 'beetle-wall', 'forest-swarm', 'channeler-wisps', 'crawler-pack'];
export interface FormationRow { name: string; style: 'advisor' | 'attack'; won: number; fought: number; partyHp: number; takenFront: number; takenBack: number; downs: number; rounds: number }
export function formationSim(formations: readonly [string, Record<string, Lane> | undefined][], level = 11): FormationRow[] {
  const teaching = heroCatalog(lookup, map).slice(0, 4).map(h => starred(h, 3, map, 6));
  const rows: FormationRow[] = [];
  for (const [name, lanes] of formations) for (const style of ['advisor', 'attack'] as const) {
    const row: FormationRow = { name, style, won: 0, fought: 0, partyHp: 0, takenFront: 0, takenBack: 0, downs: 0, rounds: 0 };
    const party = placed(teaching, lanes);
    for (const id of fights) {
      const data = withParty(withLevel(lookup(id)!, level, map.progression.monsterLevelPercent), party);
      let r = beginBattle(data); let s = r.state;
      const take = () => { for (const t of r.turns) if (t.side === 'enemy') for (const e of t.events) if (e.type === 'damage' && e.targetId) {
        const cls = teaching.find(h => h.id === e.targetId)?.lane; if (cls === 'front') row.takenFront += e.amount ?? 0; else if (cls === 'back') row.takenBack += e.amount ?? 0;
      } };
      take();
      for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
        const heroId = currentHeroId(s, data)!;
        const l = style === 'advisor' ? battleLesson(s, data)! : { heroId, action: 'attack' as const, targetId: targetOptions(s, data, heroId, 'attack').find(t => t.valid)!.id };
        r = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }); s = r.state; take();
      }
      row.fought++; if (s.outcome === 'victory') row.won++; row.rounds += s.round; row.downs += s.heroes.filter(h => h.hp <= 0).length;
      row.partyHp += s.heroes.reduce((n, h) => n + h.hp, 0) / data.heroes.reduce((n, h) => n + h.maxHp, 0);
    }
    rows.push(row);
  }
  return rows;
}
export function formationReport(rows: FormationRow[]): string {
  const lines = ['| Formation | Play | Won | Party HP left | Downed / fight | Taken by knight+duelist | Taken by mage+priest | Rounds |', '|---|---|---|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.name} | ${r.style} | ${r.won}/${r.fought} | ${Math.round(r.partyHp / r.fought * 100)}% | ${(r.downs / r.fought).toFixed(2)} | ${r.takenFront} | ${r.takenBack} | ${(r.rounds / r.fought).toFixed(1)} |`);
  return lines.join('\n');
}
