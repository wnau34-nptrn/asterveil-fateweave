import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { hooks, simulateCampaign, type Policy, type Style } from '../sim/balance-sim';
import { homeItems, keptPercent } from '../../src/core/world/profile';
import { tomeCount } from '../../src/core/world/tomes';
import { mapById } from '../../src/content/world/maps';
// P05-04: what a replay pays (normal vs hard) and what a wipe throws away, per run of each company's veil-frontier replays.
test.skipIf(!process.env.HARD_OUT)('hard rewards', () => {
  const n = Number(process.env.HARD_N ?? 24); const rows: string[] = []; const m = mapById('veil-frontier')!;
  let run = 0; const seen = new Map<string, number>();
  hooks.battle = (s, label, won, _b, mapId, co) => { if (mapId === 'veil-frontier' && label === 'boss') rows.push(`B ${co} ${s.hard ? 'H' : 'N'} ${won ? 'W' : 'L'}`); };
  hooks.run = (s, outcome, mapId, co) => {
    if (mapId !== 'veil-frontier') return; const k = `${co}:${s.hard ? 'H' : 'N'}`; const i = (seen.get(k) ?? 0) + 1; seen.set(k, i); run++;
    const all = homeItems(s, 'complete', m); const kept = homeItems(s, outcome, m); const pct = keptPercent[outcome];
    const r = (xs: { rarity: number }[]) => [0, 1, 2, 3, 4].map(q => xs.filter(x => x.rarity === q).length).join(',');
    rows.push(`R ${co} ${s.hard ? 'H' : 'N'} ${i} ${outcome} steps${s.steps} wins${s.wins} ore${s.resources.ore} gold${s.resources.gold} shard${s.resources.shard} dust${s.dust} tomes${tomeCount(s.tomes)} core${s.riftCore ?? 0} pct${pct} items[${r(all)}] kept[${r(kept)}]`);
  };
  for (const style of (process.env.HARD_STYLE ?? 'casual,advisor').split(',') as Style[]) for (const policy of ['rush', 'explorer'] as Policy[])
    for (let i = 0; i < n; i++) simulateCampaign(Number(process.env.HARD_SEED0 ?? 1001) + i * 37, policy, style, Number(process.env.HARD_REPLAYS ?? 3), Number(process.env.HARD_RUNS ?? 3));
  hooks.battle = hooks.run = undefined; writeFileSync(process.env.HARD_OUT!, rows.join('\n')); console.log(run);
}, 7200000);
