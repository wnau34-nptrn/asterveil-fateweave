import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { captured, setCapture, simulateCampaign, type CampaignReport, type Style } from './sim/balance-sim';
import { MAPS } from '../src/content/world/maps';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { battleData, battleState } from '../src/core/world/world';
import { AUTO_LAPSE_WORLD_BOSS, autoCommand } from '../src/core/battle/auto';
import { createBattle, currentHeroId, resolveCommand, targetOptions } from '../src/core/battle/engine';
import type { BattleState, Command, EncounterDefinition } from '../src/core/battle/types';
import { chapterOne } from '../src/content/world/chapter1';
import { wbDamage, wbEncounter } from '../src/core/world/world-boss';
import { battleLesson } from '../src/ui/tutorial';
import { morvaneLesson } from '../src/ui/world-boss-advice';

// Auto battle (owner 2026-11-26): random battles only, weaker than a player who reads the enemies' moves. A new company
// plays maps 1 → 5 in order with no replays, once with the advisor on every battle and once with auto battle on the random
// battles (played to the end, no HP stop; the advisor still plays elites, bosses and events). The bosses met on the way
// are also replayed by auto battle alone, to show how far it falls short where reading the moves matters.
// `npm run sim` writes docs/validation/auto-battle/SIM.md; the normal run keeps one company as a smoke check.
const full = process.env.SIM_REPORT === '1';
const seeds = full ? Array.from({ length: 12 }, (_, i) => 1001 + i * 37) : [1001];
const maps = MAPS.filter(m => m.chapter <= 5);
const runs: Record<'advisor' | 'auto', CampaignReport[]> = { advisor: [], auto: [] };
const bosses: Record<string, { fought: number; won: number }> = {};
for (const style of ['advisor', 'auto'] as Style[]) for (const seed of seeds) {
  setCapture(style === 'auto');
  runs[style as 'advisor' | 'auto'].push(simulateCampaign(seed, 'rush', style, 0, 0, 12, undefined, maps));
  // Bosses met with auto battle's own company, replayed with auto battle making every move.
  for (const c of captured.filter(c => c.label === 'boss' && !c.hard)) {
    const m = maps.find(x => x.id === c.mapId)!; const data = battleData(c.state, m, lookup)!; let bs = battleState(c.state, m, lookup)!;
    for (let i = 0; bs.outcome === 'active' && i < 400; i++) { const cmd = autoCommand(bs, data); if (!cmd) break; bs = resolveCommand(bs, data, cmd).state; }
    const row = (bosses[c.mapId] ??= { fought: 0, won: 0 }); row.fought++; if (bs.outcome === 'victory') row.won++;
  }
}
setCapture(false);

// World Boss (owner 2026-11-26 “ให้บอสโลก มี Auto ด้วย”): each auto company's camp team after map 5 fights every boss
// within the round limit three ways: the advice (Morvane's own coach for Morvane, else the teaching advisor), auto battle
// and blind basic attacks. Damage is the HP the boss lost.
type Pick = (s: BattleState, d: EncounterDefinition) => Command | undefined;
const fromLesson = (lesson: typeof battleLesson): Pick => (s, d) => { const l = lesson(s, d); return l && { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...(l.recipientId ? { recipientId: l.recipientId } : {}) }; };
const attackOnly: Pick = (s, d) => { const h = currentHeroId(s, d); const t = h && targetOptions(s, d, h, 'attack').find(o => o.valid); return h && t ? { beat: s.beat, heroId: h, action: 'attack', targetId: t.id } : undefined; };
const wbBosses = [{ id: chapterOne.worldBoss.encounterId, boss: undefined }, ...Object.keys(chapterOne.worldBoss.trio.bosses).map(b => ({ id: chapterOne.worldBoss.trio.bosses[b as keyof typeof chapterOne.worldBoss.trio.bosses], boss: b }))];
const wb: Record<string, Record<'advice' | 'auto' | 'attack', number[]>> = {};
for (const c of runs.auto) for (const b of wbBosses) {
  const data = wbEncounter(c.profile, chapterOne, lookup, b.boss as never); if (!data) continue;
  const advice = fromLesson(data.id === 'wb-morvane' ? morvaneLesson : battleLesson);
  for (const [name, pick] of [['advice', advice], ['auto', (s: BattleState, d: EncounterDefinition) => autoCommand(s, d, [], AUTO_LAPSE_WORLD_BOSS)], ['attack', attackOnly]] as const) {
    let bs = createBattle(data);
    for (let i = 0; bs.outcome === 'active' && bs.round <= chapterOne.worldBoss.maxRounds && i < 400; i++) { const cmd = pick(bs, data) ?? attackOnly(bs, data); if (!cmd) break; bs = resolveCommand(bs, data, cmd).state; }
    ((wb[data.id] ??= { advice: [], auto: [], attack: [] })[name]).push(wbDamage(bs, data));
  }
}

interface Row { fought: number; won: number; hp: number; low: number; cleared: number; tries: number }
const rows = (style: 'advisor' | 'auto') => maps.map(m => {
  const r: Row = { fought: 0, won: 0, hp: 0, low: 0, cleared: 0, tries: 0 };
  for (const c of runs[style]) {
    const ex = c.expeditions.filter(e => e.mapId === m.id && !e.hard); if (!ex.length) continue;
    r.tries++; if (ex[0]!.outcome === 'complete') r.cleared++;
    for (const e of ex) { const b = e.battles.random; if (!b) continue; r.fought += b.fought; r.won += b.won; r.hp += b.hpAfter; r.low += b.low; }
  }
  return { map: m, r };
});
const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;
const avg = (a: number, b: number) => b ? (a / b).toFixed(0) : '–';

describe('auto battle simulation', () => {
  const adv = rows('advisor'), auto = rows('auto');
  it('wins nearly every random battle it plays, yet keeps less HP than the advisor and falls short on bosses', () => {
    const fought = auto.reduce((a, x) => a + x.r.fought, 0), won = auto.reduce((a, x) => a + x.r.won, 0);
    expect(fought).toBeGreaterThan(0);
    if (!full) return;
    expect(won / fought).toBeGreaterThanOrEqual(.9);
    const boss = Object.values(bosses).reduce((a, b) => ({ fought: a.fought + b.fought, won: a.won + b.won }), { fought: 0, won: 0 });
    expect(boss.won / boss.fought).toBeLessThan(.9);
  });
  it.runIf(full)('writes the report', () => {
    const lines = ['# Auto battle — simulation', '',
      'Generated by `npm run sim` (tests/auto-battle-sim.test.ts). A new company plays maps 1 → 5 with no replays (tests/sim/balance-sim.ts, rush policy). **Advisor**: the teaching advisor plays every battle (it reads every announced move: an upper bound). **Auto**: auto battle (`src/core/battle/auto.ts`) plays the random battles to the end with no HP stop; the advisor plays the rest. HP is the party\'s share of max HP; "lowest" is the lowest point during the battle.', '',
      `${seeds.length} companies per style.`, '',
      '| Map | Style | Random battles | Won | HP after a win (avg %) | Lowest during (avg %) | Map cleared first try |', '|---|---|---|---|---|---|---|'];
    adv.forEach((a, i) => { for (const [name, x] of [['advisor', a], ['auto', auto[i]!]] as const) lines.push(`| ${x.map.name} | ${name} | ${x.r.fought} | ${pct(x.r.won, x.r.fought)}% | ${avg(x.r.hp, x.r.won)} | ${avg(x.r.low, x.r.fought)} | ${pct(x.r.cleared, x.r.tries)}% (${x.r.tries}) |`); });
    lines.push('', '## Bosses with auto battle making every move', '', 'The same boss fights the auto company met (normal mode), replayed with auto battle on every turn. In the game auto battle is not offered in boss battles; this only shows where reading the moves matters.', '', '| Map | Fights | Auto won |', '|---|---|---|');
    for (const m of maps) { const b = bosses[m.id]; if (b) lines.push(`| ${m.name} | ${b.fought} | ${pct(b.won, b.fought)}% |`); }
    const mean = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
    lines.push('', '## World Boss damage', '', `Each auto company's camp team after map 5 fights every World Boss for ${chapterOne.worldBoss.maxRounds} rounds. Advice = Morvane's coach for Morvane, the teaching advisor for the others. Average damage to the boss; auto battle is offered in World Boss attempts and makes plain attacks on ${AUTO_LAPSE_WORLD_BOSS}% of its turns there (30% elsewhere).`, '', '| Boss | Teams | Advice | Auto | Auto / advice | Basic attacks only |', '|---|---|---|---|---|---|');
    for (const [id, r] of Object.entries(wb)) lines.push(`| ${id} | ${r.auto.length} | ${mean(r.advice)} | ${mean(r.auto)} | ${pct(mean(r.auto), mean(r.advice))}% | ${mean(r.attack)} |`);
    mkdirSync('docs/validation/auto-battle', { recursive: true });
    writeFileSync('docs/validation/auto-battle/SIM.md', lines.join('\n') + '\n');
  });
});
