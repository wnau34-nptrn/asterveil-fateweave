import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { beginBattle, resolveCommand, withLevel, withParty } from '../../src/core/battle/engine';
import { heroCatalog, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';
import { TREE_BUILDS } from '../sim/tree-sim';
const fights = ['thicket-ambush', 'shadow-stalker', 'crystal-stampede', 'rear-ambush', 'elite-tusk-chief', 'elite-briar-lord', 'beetle-wall', 'forest-swarm', 'channeler-wisps', 'crawler-pack'];
// Toma skill-rework probe (2026-11-06): uses, damage per use, what a hasted ally does next, whether smoke/catalyst
// targets are corroded and have neighbours, and team HP left, in the tree-sim fights.
test.skipIf(!process.env.PROBE_OUT)('toma probe', () => {
  const out: string[] = []; const catalog = heroCatalog(lookup, map); const teaching = catalog.slice(0, 4); const base = catalog.find(h => h.id === 'toma')!;
  for (const b of [{ name: 'none', talents: {}, loadout: [] as never[] }, ...TREE_BUILDS.filter(x => x.id === 'toma')]) {
    const mates = teaching.filter(h => h.id !== 'toma').slice(0, 3).map(h => starred(h, 3, map, 10));
    const me = starred(base, 3, map, 10, b.talents, undefined, b.loadout.length ? { loadout: b.loadout } : undefined);
    const party = [mates[0]!, mates[1]!, me, mates[2]!];
    const per: Record<string, { uses: number; dmg: number }> = {}; const note: Record<string, number> = {};
    const bump = (k: string, n = 1) => { note[k] = (note[k] ?? 0) + n; };
    let wins = 0, hpLeft = 0, hpMax = 0;
    for (const id of fights) {
      const data = withParty(withLevel(lookup(id)!, 15, map.progression.monsterLevelPercent), party);
      let s = beginBattle(data).state; let hasted: string | undefined;
      for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
        const l = battleLesson(s, data)!;
        const target = s.enemies.find(e => e.id === l.targetId);
        if (l.heroId === 'toma' && (l.action === 'smoke' || l.action === 'catalyst') && target) {
          if ((target.corrodedUntil ?? 0) > s.round) bump(`${l.action}:corroded`);
          const row = data.enemies.find(e => e.id === target.id)!.row;
          if (s.enemies.some(e => e.hp > 0 && e.id !== target.id && data.enemies.find(d => d.id === e.id)!.row === row)) bump(`${l.action}:hasRowMate`);
          if (l.action === 'catalyst') bump(`catalyst:left${Math.max(0, (target.corrodedUntil ?? 0) - s.round)}`);
        }
        const r = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...(l.recipientId ? { recipientId: l.recipientId } : {}) });
        const dealt = r.events.filter(e => e.type === 'damage' && e.sourceId === l.heroId).reduce((n, e) => n + (e.amount ?? 0), 0);
        if (l.heroId === 'toma') { const p = per[l.action] ??= { uses: 0, dmg: 0 }; p.uses++; p.dmg += dealt; }
        if (hasted === l.heroId) { bump(`hasted:${l.action}`); bump('hastedDamage', dealt); hasted = undefined; }
        for (const e of r.events) if (e.type === 'haste') { hasted = e.targetId; bump(e.text === 'Ally acts next.' ? 'haste:now' : 'haste:nextRound'); }
        s = r.state;
      }
      if (s.outcome === 'victory') wins++;
      hpLeft += s.heroes.reduce((n, h) => n + h.hp, 0); hpMax += data.heroes.reduce((n, h) => n + h.maxHp, 0);
    }
    out.push(`${b.name} wins ${wins}/10 hp ${(100 * hpLeft / hpMax).toFixed(1)}% ${JSON.stringify(Object.fromEntries(Object.entries(per).map(([k, v]) => [k, { ...v, perUse: +(v.dmg / v.uses).toFixed(1) }])))}`);
    out.push(`${b.name} notes ${JSON.stringify(note)}`);
  }
  writeFileSync(process.env.PROBE_OUT!, out.join('\n'));
}, 600000);
