// P04-04 (OD-01): a low-star member at the team's camp level must still do its role. For every class and every map
// (1–3 normal, map 3 hard) the subject joins the same capability-chosen team of five at ★1, ★3 and ★5 while the four
// companions stay ★3. Everyone is at the camp level the map is played at, with the tree points of that camp (camp
// Lv2–10 + maps cleared before, OD-27) and epic main-stat gear. Two measures:
// - traversal: the real map (rush route, advisor, carried HP, camps, boss) from that camp level, `seeds` seeds;
// - role probe: the map's elites and boss played by the advisor, counting what the subject itself deals, heals,
//   shields and absorbs, and whether it falls.
import { MAPS } from '../../src/content/world/maps';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { beginBattle, resolveCommand, withLevel, withParty } from '../../src/core/battle/engine';
import type { HeroDefinition } from '../../src/core/battle/types';
import type { MapDefinition, MemberProgress, Talents } from '../../src/core/world/types';
import { memberTalentReason } from '../../src/core/world/talents';
import { heroCatalog, levelXp, skillChoices, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';
import { gearFor } from './class-sim';
import { rosterMap } from './balance-sim';

export const STARS = [1, 3, 5] as const;
export interface Stage { map: MapDefinition; hard: boolean; level: number; clears: number; label: string }
export interface LowStarRow { id: string; role: string; stage: string; stars: number; tried: number; won: number; hp: number;
  probes: number; probeWon: number; dealt: number; healed: number; shielded: number; taken: number; downs: number; teamDealt: number; teamHealed: number }

// Camp level a map is played at: the boss level (capped); hard is played at the cap after all three clears.
export function stages(): Stage[] {
  const out: Stage[] = MAPS.map((m, i) => ({ map: m, hard: false, level: Math.min(m.progression.levelCap, m.bossLevel ?? 1), clears: i, label: m.id }));
  const last = MAPS[MAPS.length - 1]!;
  out.push({ map: last, hard: true, level: last.progression.levelCap, clears: MAPS.length, label: `${last.id} (hard)` });
  return out;
}
// First legal build per branch at this camp level and clear count (same walk as character-sim, with the clear points).
function firstBuild(m: MapDefinition, hero: HeroDefinition, level: number, clears: number, branch?: string): MemberProgress {
  const tree = m.talents[hero.id] ?? []; const talents: Talents = {}; const member: MemberProgress = { stars: 1, shards: 0 };
  const ordered = [...tree].sort((a, b) => Number(b.branch === branch) - Number(a.branch === branch) || (a.tier ?? 0) - (b.tier ?? 0) || a.id.localeCompare(b.id));
  for (let i = 0; i < 60; i++) {
    const next = ordered.find(n => !memberTalentReason(m, hero.id, { ...member, talents }, n.id, level, clears));
    if (!next) break; talents[next.id] = (talents[next.id] ?? 0) + 1;
  }
  if (Object.keys(talents).length) member.talents = talents;
  const loadout = skillChoices(hero, m, talents).filter(a => a !== 'attack').slice(0, m.progression.loadoutSize);
  return { ...member, ...(loadout.length ? { loadout } : {}) };
}
function team(catalog: readonly HeroDefinition[], subject: HeroDefinition): HeroDefinition[] {
  const chosen = [subject];
  for (const p of [(h: HeroDefinition) => h.actions.includes('heal'), (h: HeroDefinition) => h.actions.includes('guard'), (h: HeroDefinition) => !!h.empoweredByStatuses])
    { const next = catalog.find(h => !chosen.includes(h) && p(h)); if (next && chosen.length < 5) chosen.push(next); }
  for (const h of catalog) if (chosen.length < 5 && !chosen.includes(h)) chosen.push(h);
  return chosen.sort((a, b) => Number(a.lane === 'back') - Number(b.lane === 'back'));
}
function probeFights(st: Stage): { id: string; level: number }[] {
  const hard = st.hard ? st.map.progression.hardLevels : 0;
  const elites = st.map.elites.filter(e => !e.mini).map(e => ({ id: e.encounterId, level: (e.level ?? st.level) + hard }));
  return [...elites, { id: st.map.bossEncounterId, level: (st.map.bossLevel ?? 1) + hard + (st.hard ? st.map.progression.hardTraits.bossLevels : 0) }];
}
// `stress`: no gear and the camp two levels under the map level (the tree points of that lower level), so fights are close.
export function lowStarSim(seeds: readonly number[], only?: readonly string[], stress = false): LowStarRow[] {
  const rows: LowStarRow[] = [];
  for (const base of stages()) {
    const st = stress ? { ...base, level: Math.max(1, base.level - 2) } : base;
    const m = st.map, catalog = heroCatalog(lookup, m);
    for (const subject of catalog) {
      if (only && !only.includes(subject.id)) continue;
      const ids = team(catalog, subject);
      const branches = [...new Set((m.talents[subject.id] ?? []).map(n => n.branch).filter(Boolean))] as string[];
      const member = (h: HeroDefinition, stars: number, b?: string): MemberProgress => ({ ...firstBuild(m, h, st.level, st.clears, b), stars, ...(stress ? {} : { gear: gearFor(h.id, 'main', st.level) }) });
      // The subject's branch: the one that wins the boss probe at ★3 with most party HP (the same build for every star).
      let pick = branches[0], best = -Infinity;
      for (const b of branches.length > 1 ? branches : []) { const r = probe(st, ids, subject.id, 3, b, member); const s = r.won * 1000 + r.hp; if (s > best) { best = s; pick = b; } }
      for (const stars of STARS) {
        const members = Object.fromEntries(ids.map(h => [h.id, h.id === subject.id ? member(h, stars, pick) : member(h, 3)]));
        const row: LowStarRow = { id: subject.id, role: subject.role, stage: st.label, stars, tried: seeds.length, won: 0, hp: 0, probes: 0, probeWon: 0, dealt: 0, healed: 0, shielded: 0, taken: 0, downs: 0, teamDealt: 0, teamHealed: 0 };
        for (const seed of seeds) { const run = rosterMap(m, seed, ids.map(h => h.id), members, { campXp: levelXp(m, st.level), clears: st.clears, hard: st.hard }); if (run.complete) row.won++; row.hp += run.hp; }
        const p = probe(st, ids, subject.id, stars, pick, member);
        Object.assign(row, { probes: p.fights, probeWon: p.won, dealt: p.dealt, healed: p.healed, shielded: p.shielded, taken: p.taken, downs: p.downs, teamDealt: p.teamDealt, teamHealed: p.teamHealed });
        rows.push(row);
      }
    }
  }
  return rows;
}
function probe(st: Stage, ids: readonly HeroDefinition[], subjectId: string, stars: number, branch: string | undefined, member: (h: HeroDefinition, s: number, b?: string) => MemberProgress) {
  const m = st.map; const party = ids.map(h => { const mp = h.id === subjectId ? member(h, stars, branch) : member(h, 3); return starred(h, mp.stars, m, st.level, mp.talents, mp.gear, mp); });
  const out = { fights: 0, won: 0, hp: 0, dealt: 0, healed: 0, shielded: 0, taken: 0, downs: 0, teamDealt: 0, teamHealed: 0 };
  for (const f of probeFights(st)) {
    const base = lookup(f.id); if (!base) continue;
    const data = withParty(withLevel(base, f.level, m.progression.monsterLevelPercent), party);
    let r = beginBattle(data); let s = r.state; const heroes = new Set(party.map(h => h.id));
    const take = () => { for (const t of r.turns) for (const e of t.events) {
      const mine = e.sourceId === subjectId, ours = !!e.sourceId && heroes.has(e.sourceId);
      if ((e.type === 'damage' || e.type === 'counter') && t.side !== 'enemy') { if (mine) out.dealt += e.amount ?? 0; if (ours) out.teamDealt += e.amount ?? 0; }
      if (e.type === 'heal') { if (mine) out.healed += e.amount ?? 0; if (ours) out.teamHealed += e.amount ?? 0; }
      if (e.type === 'barrier' && mine) out.shielded += e.amount ?? 0;
      if (e.type === 'damage' && t.side === 'enemy' && e.targetId === subjectId) out.taken += e.amount ?? 0;
      if (e.type === 'down' && e.targetId === subjectId) out.downs++;
    } };
    take();
    for (let i = 0; i < 300 && s.outcome === 'active'; i++) { const l = battleLesson(s, data)!; r = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...(l.recipientId ? { recipientId: l.recipientId } : {}), ...('cooldownAction' in l ? { cooldownAction: l.cooldownAction } : {}), ...('cooldownTargetId' in l ? { cooldownTargetId: l.cooldownTargetId } : {}) }); s = r.state; take(); }
    out.fights++; if (s.outcome === 'victory') out.won++;
    out.hp += s.heroes.reduce((n, h) => n + h.hp, 0) / data.heroes.reduce((n, h) => n + h.maxHp, 0) * 100;
  }
  out.hp /= Math.max(1, out.fights);
  return out;
}
export function lowStarReport(rows: readonly LowStarRow[]): string {
  const pct = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '–';
  const lines = ['| Character | Class | Map | ★ | Map clear | HP after | Probe won | Dealt (share) | Healed (share) | Shield | Taken | Falls |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.id} | ${r.role} | ${r.stage} | ${r.stars} | ${r.won}/${r.tried} | ${(r.hp / r.tried).toFixed(0)}% | ${r.probeWon}/${r.probes} | ${r.dealt} (${pct(r.dealt, r.teamDealt)}) | ${r.healed} (${pct(r.healed, r.teamHealed)}) | ${r.shielded} | ${r.taken} | ${r.downs} |`);
  return lines.join('\n');
}
