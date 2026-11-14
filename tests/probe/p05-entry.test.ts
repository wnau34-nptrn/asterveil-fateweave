import { test } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { playOut, useMap } from '../sim/balance-sim';
import { mapById } from '../../src/content/world/maps';
import type { ExpeditionState } from '../../src/core/world/types';
import { battleData } from '../../src/core/world/world';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
// P05: casual wins (of 8 rolls) against entry HP, one line per captured fight of TRACE_ENC.
test.skipIf(!process.env.TRACE_IN)('entry', () => {
  const out: string[] = [];
  for (const f of process.env.TRACE_IN!.split(',')) for (const r of (JSON.parse(readFileSync(f, 'utf8')) as { mapId: string; company: string; state: ExpeditionState }[]).filter(r => r.state.battle!.encounterId === process.env.TRACE_ENC && r.company.includes(process.env.TRACE_POLICY ?? 'rush'))) {
    useMap(mapById(r.mapId)!); const data = battleData(r.state, mapById(r.mapId)!, lookup)!;
    const entry = Object.values(r.state.battle!.entry).reduce((a, b) => a + b, 0) / data.heroes.reduce((a, h) => a + h.maxHp, 0);
    let w = 0; for (let i = 0; i < 8; i++) if (playOut(r.state, 'casual', i * 7919 + 13).bs.outcome === 'victory') w++;
    out.push(`${Math.round(entry * 100)} ${w} ${playOut(r.state, 'advisor').bs.outcome === 'victory' ? 1 : 0} ${data.heroes.map(h => h.id).join(',')}`);
  }
  writeFileSync(process.env.TRACE_OUT!, out.sort((a, b) => parseInt(a) - parseInt(b)).join('\n'));
}, 600000);
