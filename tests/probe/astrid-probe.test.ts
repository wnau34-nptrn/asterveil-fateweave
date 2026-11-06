import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { beginBattle, nextIntentOf, resolveCommand, targetOptions, withLevel, withParty } from '../../src/core/battle/engine';
import type { IntentDefinition } from '../../src/core/battle/types';
import { heroCatalog, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';
import { TREE_BUILDS } from '../sim/tree-sim';
const fights = ['thicket-ambush', 'shadow-stalker', 'crystal-stampede', 'rear-ambush', 'elite-tusk-chief', 'elite-briar-lord', 'beetle-wall', 'forest-swarm', 'channeler-wisps', 'crawler-pack'];
// Owner's "big move" (2026-11-06): charge/all/unstoppable, or the top damage of its cycle when the cycle has ≥2 different damages.
const bigIn = (cycle: readonly IntentDefinition[], m: IntentDefinition) => !!(m.charge || m.all || m.unstoppable) || (new Set(cycle.map(c => c.damage)).size >= 2 && m.damage === Math.max(...cycle.map(c => c.damage)));
// Astrid skill-rework probe (2026-11-06): uses, damage per use, why deflect/turn cannot be used, big moves in the tree-sim fights.
test.skipIf(!process.env.PROBE_OUT)('astrid probe', () => {
  const out: string[] = []; const catalog = heroCatalog(lookup, map); const teaching = catalog.slice(0, 4); const base = catalog.find(h => h.id === 'astrid')!;
  let moves = 0, big = 0; const bigNames: Record<string, number> = {};
  for (const id of fights) {
    const data = lookup(id)!;
    for (const foe of data.enemies) for (const phase of [...new Set(data.intents.filter(i => i.sourceId === foe.id).map(i => i.phase ?? 0))]) {
      const cycle = data.intents.filter(i => i.sourceId === foe.id && (i.phase ?? 0) === phase);
      for (const m of cycle) { moves++; if (bigIn(cycle, m)) { big++; bigNames[`${id}:${m.name}`] = (bigNames[`${id}:${m.name}`] ?? 0) + 1; } }
    }
  }
  out.push(`schedule moves ${moves}, big ${big}`); out.push(JSON.stringify(bigNames));
  for (const b of [{ name: 'none', talents: {}, loadout: [] as never[] }, ...TREE_BUILDS.filter(x => x.id === 'astrid')]) {
    const mates = teaching.filter(h => h.id !== 'astrid').slice(0, 3).map(h => starred(h, 3, map, 10));
    const me = starred(base, 3, map, 10, b.talents, undefined, b.loadout.length ? { loadout: b.loadout } : undefined);
    const party = [mates[0]!, mates[1]!, me, mates[2]!];
    const per: Record<string, { uses: number; dmg: number }> = {}; let delays = 0, star = 0, starHits = 0; const why: Record<string, number> = {}; let turns = 0, bigNext = 0;
    for (const id of fights) {
      const data = withParty(withLevel(lookup(id)!, 15, map.progression.monsterLevelPercent), party);
      let s = beginBattle(data).state;
      for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
        const l = battleLesson(s, data)!;
        if (l.heroId === 'astrid') {
          turns++;
          for (const e of s.enemies.filter(x => x.hp > 0)) {
            const n = nextIntentOf(s, data, e.id); const cyc = data.intents.filter(x => x.sourceId === e.id && (x.phase ?? 0) === (n?.phase ?? 0));
            if (n && !n.special && bigIn(cyc, n)) bigNext++;
          }
          for (const a of ['deflectfate', 'turncycle', 'doubledial'] as const) if (data.heroes.find(h => h.id === 'astrid')!.actions.includes(a)) {
            const opts = targetOptions(s, data, 'astrid', a); const cd = (s.heroes.find(h => h.id === 'astrid')!.cooldowns[a] ?? 0) > s.round;
            if (cd) why[`${a}:cooldown`] = (why[`${a}:cooldown`] ?? 0) + 1;
            else if (!opts.some(o => o.valid)) for (const o of opts) why[`${a}:${o.reason}`] = (why[`${a}:${o.reason}`] ?? 0) + 1;
            else why[`${a}:usable`] = (why[`${a}:usable`] ?? 0) + 1;
          }
        }
        const r = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...(l.recipientId ? { recipientId: l.recipientId } : {}) });
        if (l.heroId === 'astrid') { const p = per[l.action] ??= { uses: 0, dmg: 0 }; p.uses++; p.dmg += r.events.filter(e => e.type === 'damage' && e.sourceId === 'astrid').reduce((n, e) => n + (e.amount ?? 0), 0); }
        for (const e of r.events) { if (e.type === 'dial') delays++; if (e.type === 'counter' && e.text === 'Falling star.') { star += e.amount ?? 0; starHits++; } }
        s = r.state;
      }
    }
    out.push(`${b.name} turns ${turns} bigNextSeen ${bigNext} ${JSON.stringify(Object.fromEntries(Object.entries(per).map(([k, v]) => [k, { ...v, perUse: +(v.dmg / v.uses).toFixed(1) }])))}`);
    out.push(`${b.name} delays ${delays} starDamage ${star} starHits ${starHits}`);
    out.push(`${b.name} why ${JSON.stringify(why)}`);
  }
  writeFileSync(process.env.PROBE_OUT!, out.join('\n'));
}, 600000);
