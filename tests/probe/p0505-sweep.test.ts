import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { hooks, simulateCampaign, type Policy, type Style } from '../sim/balance-sim';
import { tomeCount } from '../../src/core/world/tomes';
// P05-05: what one completed expedition carries home per map (ore/gold/dust/tomes), the yardstick for the sweep table.
// `SWEEP_OUT=<file> npx vitest run tests/probe/p0505-sweep.test.ts` writes one row per run; SWEEP_N companies per policy.
test.skipIf(!process.env.SWEEP_OUT)('sweep yardstick', () => {
  const n = Number(process.env.SWEEP_N ?? 8); const rows: string[] = []; const seen = new Map<string, number>();
  hooks.run = (s, outcome, mapId, co) => {
    const k = `${co}:${mapId}:${s.hard ? 'H' : 'N'}`; const i = (seen.get(k) ?? 0) + 1; seen.set(k, i);
    rows.push(`${co.split(':').slice(1).join('/')} ${mapId} ${s.hard ? 'H' : 'N'} ${i} ${outcome} steps ${s.steps} wins ${s.wins} ore ${s.resources.ore} gold ${s.resources.gold} shard ${s.resources.shard} dust ${s.dust} tomes ${tomeCount(s.tomes)} core ${s.riftCore ?? 0}`);
  };
  for (const style of (process.env.SWEEP_STYLE ?? 'casual').split(',') as Style[]) for (const policy of ['rush', 'explorer'] as Policy[])
    for (let i = 0; i < n; i++) simulateCampaign(Number(process.env.SWEEP_SEED0 ?? 1001) + i * 37, policy, style, 2, 1);
  hooks.run = undefined; writeFileSync(process.env.SWEEP_OUT!, rows.join('\n'));
}, 7200000);
