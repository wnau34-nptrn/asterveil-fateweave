import { test } from 'vitest';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { beginBattle, resolveCommand, withLevel, withParty } from '../../src/core/battle/engine';
import { heroCatalog, starred } from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';
import { TREE_BUILDS } from '../sim/tree-sim';
const fights = ['thicket-ambush', 'shadow-stalker', 'crystal-stampede', 'rear-ambush', 'elite-tusk-chief', 'elite-briar-lord', 'beetle-wall', 'forest-swarm', 'channeler-wisps', 'crawler-pack'];
import { writeFileSync } from 'node:fs';
const out: string[] = [];
// Garran skill-rework probe (2026-11-06): per-use direct + counter damage and why braces miss. Run with PROBE_OUT=<file>.
test.skipIf(!process.env.PROBE_OUT)('garran probe', () => {
  const catalog = heroCatalog(lookup, map); const teaching = catalog.slice(0, 4); const base = catalog.find(h => h.id === 'garran')!;
  const builds = [{ name: 'none', talents: {}, loadout: [] as never[] }, ...TREE_BUILDS.filter(b => b.id === 'garran')];
  const intents = { phys: 0, energy: 0, physFront: 0, physBack: 0, all: 0, rounds: 0 };
  for (const b of builds) {
    const mates = teaching.filter(h => h.id !== 'garran').slice(0, 3).map(h => starred(h, 3, map, 10));
    const me = starred(base, 3, map, 10, b.talents, undefined, b.loadout.length ? { loadout: b.loadout } : undefined);
    const party = [mates[0]!, me, ...mates.slice(1)];
    const per: Record<string, { uses: number; direct: number; counter: number; triggers: number }> = {};
    let cur: string; const why: Record<string, number> = {}; let pend: { src: string; trig: boolean; ev: Set<string> } | null = null;
    for (const id of fights) {
      const data = withParty(withLevel(lookup(id)!, 15, map.progression.monsterLevelPercent), party);
      let s = beginBattle(data).state;
      for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
        const l = battleLesson(s, data)!;
        const r = resolveCommand(s, data, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...(l.recipientId ? { recipientId: l.recipientId } : {}), ...('cooldownAction' in l ? { cooldownAction: l.cooldownAction } : {}), ...('cooldownTargetId' in l ? { cooldownTargetId: l.cooldownTargetId } : {}) });
        if (l.heroId === 'garran' && pend) { const k = pend.trig ? 'trig' : pend.ev.has('down') ? 'srcDown' : pend.ev.has('interrupt') || pend.ev.has('cancel') ? 'interrupted' : 'other'; why[k] = (why[k] ?? 0) + 1; pend = null; }
        if (l.heroId === 'garran' && l.action === 'brace') pend = { src: s.intent?.sourceId ?? '', trig: false, ev: new Set() };
        if (l.heroId === 'garran') { cur = l.action; const p = per[cur] ??= { uses: 0, direct: 0, counter: 0, triggers: 0 }; p.uses++; }
        for (const e of r.events) {
          if (pend) { if (e.type === 'counter' && /Braced/.test(e.text)) pend.trig = true; if ((e.type === 'down' && e.targetId === pend.src) || ((e.type === 'interrupt' || e.type === 'cancel') && e.targetId === pend.src)) pend.ev.add(e.type === 'down' ? 'down' : 'interrupt'); }
          if (b.name === 'none' && e.type === 'damage' && e.sourceId?.match(/^[fb]\d/)) { /* enemy hit */ }
          if (e.sourceId === 'garran' && e.type === 'damage' && l.heroId === 'garran') per[l.action]!.direct += e.amount ?? 0;
          if (e.type === 'counter' && /Braced|wall|Held|War cry/.test(e.text)) {
            const k = /Braced/.test(e.text) ? 'brace' : /wall/.test(e.text) ? 'spearwall' : /Held/.test(e.text) ? 'hold' : 'warcry';
            const p = per[k] ??= { uses: 0, direct: 0, counter: 0, triggers: 0 }; p.counter += e.amount ?? 0; p.triggers++;
          }
        }
        if (b.name === 'none' && l.heroId === 'garran') {
          // tally upcoming enemy intents this round once per garran turn
        }
        s = r.state;
      }
      if (b.name === 'none') {
        // enemy intent mix from the encounter schedule
        for (const it of data.intents) { intents.all++; { const hh = data.heroes[it.targetSlot]; if (it.kind !== 'physical' && hh?.lane === 'back') (intents as Record<string, number>).energyBack = ((intents as Record<string, number>).energyBack ?? 0) + 1; } if (it.kind === 'physical') { intents.phys++; const h = data.heroes[it.targetSlot]; if (h?.lane === 'front') intents.physFront++; else intents.physBack++; } else intents.energy++; }
      }
    }
    out.push(b.name+' why '+JSON.stringify(why)); out.push(b.name+' '+JSON.stringify(Object.fromEntries(Object.entries(per).map(([k, v]) => [k, { ...v, perUse: +((v.direct + v.counter) / Math.max(1, v.uses)).toFixed(1) }]))));
  }
  out.push('intents '+JSON.stringify(intents));
  writeFileSync(process.env.PROBE_OUT!, out.join("\n"));
});
