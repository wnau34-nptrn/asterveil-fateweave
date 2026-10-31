// Big trees (docs/design/SKILL_TREES_ALL_TH.md: release A and the recruits): each class fights the mid-game sets with no tree points and
// with the three example builds of its section (★3 Lv10, 11 points; capstones open at Lv15), in a party with three
// teaching members, played by the teaching advisor. A tree works when every build keeps a winning route and none is
// strictly worse than spending nothing.
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { beginBattle, resolveCommand, withLevel, withParty } from '../../src/core/battle/engine';
import type { ActionId } from '../../src/core/battle/types';
import type { Talents } from '../../src/core/world/types';
import { memberTalentReason } from '../../src/core/world/talents';
import { heroCatalog, skillChoices, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';

export interface TreeBuild { id: string; name: string; talents: Talents; loadout: ActionId[]; campaign?: boolean }
// C12 examples use the same paid level/star budget and validator as the player. All four branch
// priorities are sampled; the personal-branch comparison below removes only p ranks, keeping the same gear/team.
const rosterIds = ['metta', 'thiran', 'lalin', 'wila'] as const;
function rosterBuilds(): TreeBuild[] {
  return rosterIds.flatMap(id => (['a', 'b', 'c', 'p'] as const).map(branch => {
    const tree = map.talents[id] ?? [], talents: Talents = {}, member = { stars: 3, dupes: 0 };
    const ordered = [...tree].sort((a,b) => Number(b.branch === branch) - Number(a.branch === branch) || (a.tier ?? 0) - (b.tier ?? 0) || a.id.localeCompare(b.id));
    for (let i = 0; i < 50; i++) {
      const next = ordered.find(n => !memberTalentReason(map, id, {...member, talents}, n.id, 10));
      if (!next) break; talents[next.id] = (talents[next.id] ?? 0) + 1;
    }
    const base = heroCatalog(lookup,map).find(h => h.id === id)!;
    const available: ActionId[] = skillChoices(base,map,talents).filter(a => a !== 'attack');
    const wanted: ActionId[] = base.role === 'Saint'
      ? branch === 'a' ? ['saintarc','communion','saintstrike'] : branch === 'b' ? ['vowstrike','saintstrike','communion'] : branch === 'c' ? ['sharewound','lastlight','saintstrike'] : ['communion','saintarc','sharewound']
      : branch === 'a' ? ['rounddance','duet','cadence'] : branch === 'b' ? ['deepbeat','duet','cadence'] : branch === 'c' ? ['echofoot','closingstep','duet'] : ['duet','echofoot','cadence'];
    const loadout = [...new Set([...wanted.filter(a => available.includes(a)),...available])].slice(0,3);
    return {id, name: `C12 ${branch === 'p' ? 'ประจำตัว' : `กิ่ง ${branch}`}`, talents, loadout};
  }));
}
export const TREE_BUILDS: readonly TreeBuild[] = [
  { id: 'guardian', campaign: false, name: 'แนวค่าย', talents: { c1s: 1, a1: 2, a2i: 1, c2v: 1, c1: 2, a3: 1, a3s: 1 }, loadout: ['guard', 'bash', 'rally'] },
  { id: 'guardian', campaign: false, name: 'กำแพงโล่', talents: { a1: 2, a2i: 1, a3: 1, a3s: 1, b1: 2, c1s: 1, c1: 2, c2v: 1 }, loadout: ['guard', 'bulwark', 'rally'] },
  { id: 'guardian', campaign: false, name: 'ท้าดวล', talents: { b1: 2, b2: 1, b3r: 1, a1: 2, c1s: 1, c1: 2 }, loadout: ['guard', 'bash', 'challenge'] },
  { id: 'guardian', campaign: false, name: 'ยืนเคียงข้าง', talents: { c1s: 1, c1: 2, c2v: 1, c3: 1, a1: 2, a2t: 1 }, loadout: ['rally', 'rouse', 'guard'] },
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
  // Recruit trees (owner 2026-10-23). The campaign follows each class's first build: the support classes keep their
  // sustain skill there (haste, mending), as a party without a priest needs it.
  { id: 'toma', name: 'นักปรุงยา', talents: { b1: 2, b2q: 1, b3: 1, a1: 2, c1: 2 }, loadout: ['haste', 'fury', 'acid'] },
  { id: 'toma', name: 'นักกรด', talents: { a1: 2, a2s: 1, a3: 1, c1: 1, c1s: 1, c2p: 1, c3: 1 }, loadout: ['acid', 'bomb', 'catalyst'] },
  { id: 'toma', name: 'ผู้ก่อกวน', talents: { c1: 2, c1s: 1, c2p: 1, a1: 2, b1: 2 }, loadout: ['smoke', 'acid', 'haste'] },
  { id: 'sefa', name: 'นักฆ่า', talents: { a1: 2, a2b: 1, a3: 1, c1: 2, c1s: 1 }, loadout: ['ambush', 'backstab', 'knives'] },
  { id: 'sefa', name: 'เงาล่อ', talents: { b1: 2, b2d: 1, b3: 1, a1: 2, a2l: 1 }, loadout: ['evade', 'decoy', 'ambush'] },
  { id: 'sefa', name: 'ผู้ก่อกวน', talents: { c1: 2, c1s: 1, c2t: 1, c3: 1, b1: 2 }, loadout: ['disarm', 'knives', 'evade'] },
  { id: 'brann', name: 'ภูผา', talents: { a1: 2, a2h: 1, a3: 1, b1: 2, b2: 1 }, loadout: ['taunt', 'stonearmor', 'quake'] },
  { id: 'brann', name: 'ค้อนรูน', talents: { b1: 2, b2: 1, b3q: 1, a1: 2 }, loadout: ['slam', 'quake', 'taunt'] },
  { id: 'brann', name: 'ผู้พิทักษ์', talents: { c1: 2, c1s: 1, c2t: 1, c3: 1, a1: 2 }, loadout: ['guardstone', 'tremor', 'taunt'] },
  { id: 'lio', name: 'ผู้ปลอบ', talents: { b1: 2, b2o: 1, b3: 1, a1: 2, a2c: 1, a3: 1 }, loadout: ['mend', 'finale', 'dread'] },
  { id: 'lio', name: 'กลองศึก', talents: { a1: 2, a2r: 1, c1: 1, c1s: 1, c2d: 1, c3: 1 }, loadout: ['valor', 'solo', 'note'] },
  { id: 'lio', name: 'นักร้องนำ', talents: { a1: 2, a2c: 1, a3: 1, c1: 1, c1s: 1, c2s: 1, b1: 1, b2w: 1, b3: 1 }, loadout: ['dread', 'note', 'finale'] },
  ...rosterBuilds(),
];
const fights = ['thicket-ambush', 'shadow-stalker', 'crystal-stampede', 'rear-ambush', 'elite-tusk-chief', 'elite-briar-lord', 'beetle-wall', 'forest-swarm', 'channeler-wisps', 'crawler-pack'];
export interface TreeRow { id: string; build: string; won: number; fought: number; partyHp: number; rounds: number; used: number; actions: Partial<Record<ActionId, number>>; disabled: Partial<Record<ActionId, { won: number; hp: number }>>; personal?: { points: number; won: number; hp: number } }
export const TREE_LEVEL = 10, TREE_STARS = 3;
export function treeSim(fightLevel = 15): TreeRow[] {
  const catalog = heroCatalog(lookup, map); const teaching = catalog.slice(0, 4);
  const rows: TreeRow[] = [];
  const builds: TreeBuild[] = [...new Set(TREE_BUILDS.map(b => b.id))].flatMap(id => [{ id, name: 'ไม่ลงแต้ม', talents: {}, loadout: [] }, ...TREE_BUILDS.filter(b => b.id === id)]);
  for (const b of builds) {
    const base = catalog.find(h => h.id === b.id)!; const mates = teaching.filter(h => h.id !== b.id).slice(0, 3).map(h => starred(h, TREE_STARS, map, TREE_LEVEL));
    const me = starred(base, TREE_STARS, map, TREE_LEVEL, b.talents, undefined, b.loadout.length ? { loadout: b.loadout } : undefined);
    const party = base.lane === 'front' ? [mates[0]!, me, ...mates.slice(1)] : [...mates.slice(0, 2), me, mates[2]!];
    const row: TreeRow = { id: b.id, build: b.name, won: 0, fought: 0, partyHp: 0, rounds: 0, used: 0, actions: {}, disabled: {} };
    for (const id of fights) {
      const data = withParty(withLevel(lookup(id)!, fightLevel, map.progression.monsterLevelPercent), party);
      let s = beginBattle(data).state;
      for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
        const l = battleLesson(s, data)!; if (l.heroId === b.id) row.actions[l.action] = (row.actions[l.action] ?? 0) + 1; if (l.heroId === b.id && b.loadout.includes(l.action) && !base.actions.includes(l.action)) row.used++;
        s = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...("cooldownAction" in l ? { cooldownAction: l.cooldownAction } : {}), ...("cooldownTargetId" in l ? { cooldownTargetId: l.cooldownTargetId } : {}) }).state;
      }
      for (const action of b.loadout) {
        const without = withParty(data, data.heroes.map(h => h.id === b.id ? { ...h, actions: h.actions.filter(a => a !== action) } : h));
        let off = beginBattle(without).state;
        for (let i = 0; i < 200 && off.outcome === 'active'; i++) {
          const l = battleLesson(off, without)!; off = resolveCommand(off, without, { beat: off.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...("cooldownAction" in l ? { cooldownAction: l.cooldownAction } : {}), ...("cooldownTargetId" in l ? { cooldownTargetId: l.cooldownTargetId } : {}) }).state;
        }
        const impact = row.disabled[action] ??= { won: 0, hp: 0 };
        if (off.outcome === 'victory') impact.won++;
        impact.hp += off.heroes.reduce((n, h) => n + h.hp, 0) / without.heroes.reduce((n, h) => n + h.maxHp, 0);
      }
      const personal = Object.entries(b.talents).filter(([node]) => node.startsWith('p'));
      if (personal.length) {
        const shared = Object.fromEntries(Object.entries(b.talents).filter(([node]) => !node.startsWith('p')));
        const without = withParty(data, party.map(h => h.id === b.id ? starred(base, TREE_STARS, map, TREE_LEVEL, shared, undefined, b.loadout.length ? {loadout:b.loadout} : undefined) : h));
        let off = beginBattle(without).state;
        for (let i = 0; i < 200 && off.outcome === 'active'; i++) {
          const l = battleLesson(off, without)!; off = resolveCommand(off, without, {beat:off.beat,heroId:l.heroId,action:l.action,targetId:l.targetId,cooldownAction:l.cooldownAction,cooldownTargetId:l.cooldownTargetId}).state;
        }
        const impact = row.personal ??= {points:personal.reduce((n,[,rank]) => n+(rank??0),0),won:0,hp:0};
        if (off.outcome === 'victory') impact.won++;
        impact.hp += off.heroes.reduce((n,h) => n+h.hp,0) / without.heroes.reduce((n,h) => n+h.maxHp,0);
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
  lines.push('', '| Character | Build | Action usage | Won | HP |', '|---|---|---|---|---|', ...rows.map(r => `| ${r.id} | ${r.build} | ${Object.entries(r.actions).map(([id,n])=>`${id}: ${n}`).join(', ')} | ${r.won}/${r.fought} | ${Math.round(r.partyHp/r.fought*100)}% |`));
  lines.push('', 'Ablation: the same team/fights/advisor with just this action unavailable; positive deltas mean the equipped action helped.', '', '| Character | Build | Disabled action | Uses | Win delta | Team HP delta (points) |', '|---|---|---|---|---|---|', ...rows.flatMap(r => Object.entries(r.disabled).map(([action,off]) => `| ${r.id} | ${r.build} | ${action} | ${r.actions[action as ActionId] ?? 0} | ${r.won-off.won} | ${((r.partyHp-off.hp)/r.fought*100).toFixed(1)} |`)));
  lines.push('', 'Personal-branch ablation: remove only paid p ranks, keep shared nodes/loadout/team/encounters unchanged. Points are not reallocated; this measures the marginal paid branch, not best alternative spending. Tier-4 personal nodes require Lv15 and are outside this Lv10 sample.', '', '| Character | Build | Removed p points | Win delta | Team HP delta (points) |', '|---|---|---|---|---|', ...rows.filter(r => r.personal).map(r => `| ${r.id} | ${r.build} | ${r.personal!.points} | ${r.won-r.personal!.won} | ${((r.partyHp-r.personal!.hp)/r.fought*100).toFixed(1)} |`));
  return lines.join('\n');
}
