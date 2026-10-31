import { MAPS } from '../../src/content/world/maps';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { beginBattle, resolveCommand, withLevel, withParty } from '../../src/core/battle/engine';
import type { HeroDefinition } from '../../src/core/battle/types';
import type { MapDefinition, MemberProgress, Talents } from '../../src/core/world/types';
import { memberTalentReason } from '../../src/core/world/talents';
import { heroCatalog, skillChoices, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';
import { gearFor } from './class-sim';
import { rosterMap } from './balance-sim';

// Explicit gate, shared by every current and future catalog entry. Best means best of the enumerated legal builds,
// selected on a full-HP boss probe before the traversal seeds; it does not claim an exhaustive solution of the tree.
export const CHARACTER_MIN_CLEAR = .8, CHARACTER_MAX_RATE_SPREAD = .2, CHARACTER_MAX_HP_SPREAD = 30;
export interface CharacterRow { id: string; role: string; map: string; level: number; build: MemberProgress; tried: number; won: number; hp: number; wins: number }
export function candidates(m: MapDefinition, hero: HeroDefinition, level: number): MemberProgress[] {
  const tree = m.talents[hero.id] ?? [], branches = [...new Set(tree.map(n => n.branch).filter(Boolean))];
  const out: MemberProgress[] = [];
  for (const branch of branches.length ? branches : [undefined]) for (const reverse of [false, true]) {
    const member: MemberProgress = { stars: 1, dupes: 0 };
    const talents: Talents = {};
    const ordered = [...tree].sort((a,b) => Number(b.branch === branch) - Number(a.branch === branch) || (a.tier ?? 0) - (b.tier ?? 0) || (reverse ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)));
    for (let i = 0; i < 50; i++) {
      const next = ordered.find(n => !memberTalentReason(m, hero.id, { ...member, talents }, n.id, level));
      if (!next) break; talents[next.id] = (talents[next.id] ?? 0) + 1;
    }
    if (Object.keys(talents).length) member.talents = talents;
    const choices = skillChoices(hero, m, talents).filter(a => a !== 'attack');
    const loadouts = choices.length <= 3 ? [choices] : choices.flatMap((a,i) => choices.slice(i+1).flatMap((b,j) => choices.slice(i+j+2).map(c => [a,b,c])));
    for (const loadout of loadouts) out.push({ ...member, ...(loadout.length ? { loadout } : {}) });
  }
  return out.filter((v,i) => out.findIndex(x => JSON.stringify(v) === JSON.stringify(x)) === i);
}
function squad(catalog: readonly HeroDefinition[], subject: HeroDefinition): HeroDefinition[] {
  const chosen = [subject];
  // Standard support/front/damage companions chosen from capabilities, never character IDs.
  for (const predicate of [(h: HeroDefinition) => h.actions.includes('heal'), (h: HeroDefinition) => h.actions.includes('guard'), (h: HeroDefinition) => h.empoweredByStatuses]) {
    const next = catalog.find(h => !chosen.includes(h) && predicate(h)); if (next && chosen.length < 4) chosen.push(next);
  }
  for (const h of catalog) if (chosen.length < 4 && !chosen.includes(h)) chosen.push(h);
  return chosen.sort((a,b) => Number(a.lane === 'back') - Number(b.lane === 'back'));
}
export function characterSim(seeds: readonly number[]): CharacterRow[] {
  const rows: CharacterRow[] = [];
  for (const m of MAPS) {
    const catalog = heroCatalog(lookup, m), level = Math.min(m.progression.levelCap, m.bossLevel ?? 1);
    for (const subject of catalog) {
      const team = squad(catalog, subject), builds = candidates(m, subject, level);
      const members: Record<string, MemberProgress> = Object.fromEntries(team.map(h => [h.id, { stars: 1, dupes: 0, level, exp: 0, gear: gearFor(h.id, 'main', level) }]));
      let best = builds[0]!, score = -Infinity;
      for (const build of builds) {
        const data = withParty(withLevel(lookup(m.bossEncounterId)!, m.bossLevel ?? 1, m.progression.monsterLevelPercent), team.map(h => starred(h, 1, m, level, h.id === subject.id ? build.talents : undefined, members[h.id]!.gear, h.id === subject.id ? build : undefined)));
        let s = beginBattle(data).state;
        for (let i = 0; i < 200 && s.outcome === 'active'; i++) { const l = battleLesson(s,data)!; s = resolveCommand(s,data,{beat:s.beat,heroId:l.heroId,action:l.action,targetId:l.targetId,...("cooldownAction" in l ? {cooldownAction:l.cooldownAction}:{}),...("cooldownTargetId" in l ? {cooldownTargetId:l.cooldownTargetId}:{})}).state; }
        const current = (s.outcome === 'victory' ? 10000 : 0) + s.heroes.reduce((n,h) => n+h.hp,0) / data.heroes.reduce((n,h) => n+h.maxHp,0)*100 - s.round*.01;
        if (current > score) { score = current; best = build; }
      }
      members[subject.id] = {...best, gear: members[subject.id]!.gear};
      const row: CharacterRow = { id:subject.id,role:subject.role,map:m.id,level,build:best,tried:seeds.length,won:0,hp:0,wins:0 };
      for (const seed of seeds) { const run = rosterMap(m,seed,team.map(h => h.id),members); if(run.complete) row.won++; row.hp += run.hp; row.wins += run.wins; }
      rows.push(row);
    }
  }
  return rows;
}
export function characterReport(rows: readonly CharacterRow[]): string {
  return ['# Per-character map traversal (C12 Batch 1)', '', 'Every catalog character at ★1 and the map boss level; epic map-level main-stat gear, no sets/tomes. Standard capability-selected squad of four, same rush routes/seeds, carried HP and real camp/boss/goal rules. Best tested legal build chosen on a separate boss probe. C12 batch release gate: every character/map cell 12/12 on full run; general C11 regression floor ≥80%; across-character clear spread ≤20 points, final HP spread ≤30 points. New heroes/classes enter through the catalog and tree data.', '', '| Character | Class | Map | Level | Clear | HP after route | Wins | Best tested tree / loadout |', '|---|---|---|---|---|---|---|---|', ...rows.map(r => `| ${r.id} | ${r.role} | ${r.map} | ${r.level} | ${r.won}/${r.tried} | ${(r.hp/r.tried).toFixed(1)}% | ${(r.wins/r.tried).toFixed(1)} | ${JSON.stringify(r.build.talents ?? {})} / ${r.build.loadout?.join(', ') ?? 'base'} |`)].join('\n');
}
