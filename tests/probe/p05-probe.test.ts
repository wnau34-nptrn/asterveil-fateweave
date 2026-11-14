import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { simulateCampaign, type Policy } from '../sim/balance-sim';
import { MAPS } from '../../src/content/world/maps';
// P05: why casual companies fail their first normal try at a map — which battle was lost, per seed.
// PROBE_OUT=<file> PROBE_POLICY=rush|explorer PROBE_MAP=<index> PROBE_PART=<k>/<n> (seeds split for parallel runs).
test.skipIf(!process.env.PROBE_OUT)('p05 probe', () => {
  const [k, n] = (process.env.PROBE_PART ?? '0/1').split('/').map(Number) as [number, number];
  const policy = (process.env.PROBE_POLICY ?? 'rush') as Policy; const m = MAPS[Number(process.env.PROBE_MAP ?? 2)]!;
  const style = (process.env.PROBE_STYLE ?? 'casual') as 'casual' | 'advisor';
  const rows: unknown[] = [];
  for (const seed of Array.from({ length: 48 }, (_, i) => 1001 + i * 37).filter((_, i) => i % n === k)) {
    const c = simulateCampaign(seed, policy, style, 0, 0);
    const e = c.expeditions.find(x => x.mapId === m.id && !x.hard);
    if (e) rows.push({ seed, outcome: e.outcome, level: e.level, lowestHp: e.lowestHp, battles: e.battles });
  }
  writeFileSync(process.env.PROBE_OUT!, JSON.stringify(rows));
}, 3600000);
