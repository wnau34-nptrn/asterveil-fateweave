import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { beginBattle, resolveCommand, withLevel, withParty } from '../../src/core/battle/engine';
import { heroCatalog, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';
import { TREE_BUILDS } from '../sim/tree-sim';
const fights = ['thicket-ambush', 'shadow-stalker', 'crystal-stampede', 'rear-ambush', 'elite-tusk-chief', 'elite-briar-lord', 'beetle-wall', 'forest-swarm', 'channeler-wisps', 'crawler-pack'];
// Skill rework step 6 probe (2026-11-06): for PROBE_HERO, per tree-sim build: wins, team HP left, and per action its uses,
// the damage/heal it dealt and the event types it raised, in the tree-sim fights (same party as the tree sim).
test.skipIf(!process.env.PROBE_OUT || !process.env.PROBE_HERO)('skill probe', () => {
  const heroId = process.env.PROBE_HERO!; const out: string[] = []; const catalog = heroCatalog(lookup, map); const teaching = catalog.slice(0, 4); const base = catalog.find(h => h.id === heroId)!;
  for (const b of [{ name: 'none', talents: {}, loadout: [] as never[] }, ...TREE_BUILDS.filter(x => x.id === heroId)]) {
    const mates = teaching.filter(h => h.id !== heroId).slice(0, 3).map(h => starred(h, 3, map, 10));
    const me = starred(base, 3, map, 10, b.talents, undefined, b.loadout.length ? { loadout: b.loadout } : undefined);
    const party = base.lane === 'front' ? [me, ...mates] : [mates[0]!, mates[1]!, me, mates[2]!];
    const per: Record<string, { uses: number; dmg: number; heal: number; ev: Record<string, number> }> = {};
    let wins = 0, hpLeft = 0, hpMax = 0;
    for (const id of fights) {
      const data = withParty(withLevel(lookup(id)!, 15, map.progression.monsterLevelPercent), party);
      let s = beginBattle(data).state;
      for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
        const l = battleLesson(s, data)!;
        const r = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...(l.recipientId ? { recipientId: l.recipientId } : {}) });
        for (const e of r.events) if (e.sourceId === heroId && e.type !== 'damage' && e.type !== 'heal' && e.type !== 'buff' && e.text) { const k = `~${e.text}`; const p = per[k] ??= { uses: 0, dmg: 0, heal: 0, ev: {} }; p.uses++; p.heal += 0; }
        for (const e of r.events) if (e.sourceId === heroId && e.type === 'heal' && e.text === 'Sanctuary.') { const p = per['~saved'] ??= { uses: 0, dmg: 0, heal: 0, ev: {} }; p.uses++; p.heal += e.amount ?? 0; }
        if (l.heroId === heroId) {
          const p = per[l.action] ??= { uses: 0, dmg: 0, heal: 0, ev: {} }; p.uses++;
          for (const e of r.events) {
            if (e.sourceId !== heroId) continue;
            if (e.type === 'damage') p.dmg += e.amount ?? 0; else if (e.type === 'heal') p.heal += e.amount ?? 0; else p.ev[e.type] = (p.ev[e.type] ?? 0) + 1;
          }
        }
        s = r.state;
      }
      if (s.outcome === 'victory') wins++;
      hpLeft += s.heroes.reduce((n, h) => n + h.hp, 0); hpMax += data.heroes.reduce((n, h) => n + h.maxHp, 0);
    }
    out.push(`${b.name} wins ${wins}/10 hp ${(100 * hpLeft / hpMax).toFixed(1)}% ${JSON.stringify(per)}`);
  }
  writeFileSync(process.env.PROBE_OUT!, out.join('\n'));
}, 600000);
