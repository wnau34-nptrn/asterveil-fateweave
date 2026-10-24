// Stats design step 5: per-class gear check. Each class fights the same mid-game encounters in a party with three
// teaching members, once with no gear, once with epic gear whose affixes are its MAIN stats (docs/STATS_DESIGN.md
// section 5) and once with the same pieces rolled on stats it barely uses. Battles are played by the teaching
// advisor. A stat design works when every class gains more from its own stats than from the others.
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { beginBattle, resolveCommand, withLevel, withParty } from '../../src/core/battle/engine';
import type { EncounterDefinition } from '../../src/core/battle/types';
import { affixPool } from '../../src/core/world/equipment';
import type { Gear, GearStat, Item } from '../../src/core/world/types';
import { GEAR_SLOTS } from '../../src/core/world/types';
import { heroCatalog, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';

// Section 5 of the design: the stats each class wants most (★★) and a little (★).
export const wants: Record<string, { main: GearStat[]; some: GearStat[] }> = {
  guardian: { main: ['hp', 'armour', 'speed'], some: ['attack', 'resist'] },
  tracer: { main: ['attack', 'speed', 'leech'], some: ['hp'] },
  weaver: { main: ['attack', 'support'], some: ['hp', 'speed', 'resist'] },
  healer: { main: ['hp', 'support', 'resist'], some: ['speed'] },
  garran: { main: ['hp', 'attack', 'armour'], some: ['leech'] },
  mira: { main: ['attack', 'speed'], some: ['hp', 'leech'] },
  toma: { main: ['support', 'speed'], some: ['hp', 'attack'] },
  sefa: { main: ['attack', 'speed', 'leech'], some: ['hp'] },
  brann: { main: ['hp', 'armour', 'resist'], some: ['attack'] },
  lio: { main: ['support', 'speed'], some: ['hp', 'attack', 'resist'] },
};
const battleStats: GearStat[] = ['hp', 'attack', 'support', 'speed', 'armour', 'resist', 'leech'];
export type Build = 'none' | 'main' | 'off';
// Epic pieces at `level`; affixes from the slot's pool, wanted stats first (main) or unwanted ones first (off).
export function gearFor(id: string, build: Exclude<Build, 'none'>, level: number): Gear {
  const w = wants[id]!; const unwanted = battleStats.filter(s => !w.main.includes(s) && !w.some.includes(s));
  const order = build === 'main' ? [...w.main, ...w.some] : [...unwanted, ...w.some];
  const gear: Gear = {};
  GEAR_SLOTS.forEach((slot, uid) => {
    const pool = affixPool(map.equipment, slot, id);
    const affixes = [...order.filter(s => pool.includes(s)), ...pool.filter(s => !order.includes(s))].slice(0, map.equipment.affixCount[3]!);
    gear[slot] = { uid: uid + 1, slot, rarity: 3, level, affixes, ...(slot === 'weapon' ? { hero: id } : {}) } as Item;
  });
  return gear;
}
export interface ClassRow { id: string; build: Build; won: number; fought: number; partyHp: number; dealt: number; healed: number; taken: number; rounds: number }
// Includes the four-slot sets (A7 step 2) so swarms and screened back rows count.
const fights = ['thicket-ambush', 'shadow-stalker', 'crystal-stampede', 'rear-ambush', 'elite-tusk-chief', 'elite-briar-lord', 'beetle-wall', 'forest-swarm', 'channeler-wisps', 'crawler-pack'];
export function classSim(level = 7): ClassRow[] {
  const catalog = heroCatalog(lookup, map); const teaching = catalog.slice(0, 4);
  const rows: ClassRow[] = [];
  for (const hero of catalog) {
    const mates = teaching.filter(h => h.id !== hero.id).slice(0, 3);
    for (const build of ['none', 'main', 'off'] as Build[]) {
      const row: ClassRow = { id: hero.id, build, won: 0, fought: 0, partyHp: 0, dealt: 0, healed: 0, taken: 0, rounds: 0 };
      const me = starred(hero, 3, map, 6, {}, build === 'none' ? undefined : gearFor(hero.id, build, level));
      const party = [me, ...mates.map(m => starred(m, 3, map, 6))];
      for (const id of fights) {
        const base = lookup(id)!; const data: EncounterDefinition = withParty(withLevel(base, level, map.progression.monsterLevelPercent), party);
        let r = beginBattle(data); let s = r.state; const take = () => {
          for (const t of r.turns) for (const e of t.events) {
            if (e.sourceId === hero.id && (e.type === 'damage' || e.type === 'counter')) row.dealt += e.amount ?? 0;
            if (e.sourceId === hero.id && e.type === 'heal') row.healed += e.amount ?? 0;
            if (e.targetId === hero.id && e.type === 'damage' && t.side === 'enemy') row.taken += e.amount ?? 0;
          }
        };
        take();
        for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
          const l = battleLesson(s, data)!; r = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }); s = r.state; take();
        }
        row.fought++; if (s.outcome === 'victory') row.won++; row.rounds += s.round;
        row.partyHp += s.heroes.reduce((n, h) => n + h.hp, 0) / data.heroes.reduce((n, h) => n + h.maxHp, 0);
      }
      rows.push(row);
    }
  }
  return rows;
}
export function classReport(rows: ClassRow[]): string {
  const lines = ['| Class | Build | Won | Party HP left | Dealt | Healed | Taken | Rounds |', '|---|---|---|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.id} | ${r.build} | ${r.won}/${r.fought} | ${Math.round(r.partyHp / r.fought * 100)}% | ${r.dealt} | ${r.healed} | ${r.taken} | ${(r.rounds / r.fought).toFixed(1)} |`);
  return lines.join('\n');
}
