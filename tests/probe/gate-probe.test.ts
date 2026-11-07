import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { simulateCampaign } from '../sim/balance-sim';
import { MAPS } from '../../src/content/world/maps';
// Which company flips a campaign-gate cell: rush casual, the first normal attempt at map 2, per seed.
test.skipIf(!process.env.PROBE_OUT)('gate probe', () => {
  const out: string[] = [];
  for (const seed of Array.from({ length: 12 }, (_, i) => 1001 + i * 37)) {
    const c = simulateCampaign(seed, 'rush', 'casual');
    const e = c.expeditions.find(x => x.mapId === MAPS[1]!.id && !x.hard)!;
    out.push(`${seed} ${e.outcome} ${JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !['battles'].includes(k)).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : v])))}`);
  }
  writeFileSync(process.env.PROBE_OUT!, out.join('\n'));
}, 900000);
