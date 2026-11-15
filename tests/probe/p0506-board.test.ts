import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { hooks, simulateCampaign, type Policy, type Style } from '../sim/balance-sim';
import { MAPS } from '../../src/content/world/maps';
import { contractsMet, runCounts } from '../../src/core/world/board';
// P05-06: per settled run, the steps taken, what it adds to the quest board and the contracts it meets (with the swift
// limit lifted), the yardstick for `MapDefinition.contract.swiftSteps` and the board targets.
// `BOARD_OUT=<file> npx vitest run tests/probe/p0506-board.test.ts` writes one row per run; BOARD_N companies per policy.
test.skipIf(!process.env.BOARD_OUT)('board yardstick', () => {
  const n = Number(process.env.BOARD_N ?? 8); const rows: string[] = [];
  hooks.run = (s, outcome, mapId, co) => {
    const m = MAPS.find(x => x.id === mapId)!; const open = { ...m, contract: { ...m.contract!, swiftSteps: 99_999 } };
    const jobs = contractsMet(s, outcome, open).filter(j => j !== 'job-swift');
    const c = runCounts(s, outcome, jobs);
    rows.push(`${co.split(':').slice(1).join('/')} ${mapId} ${s.hard ? 'H' : 'N'} ${outcome} steps ${s.steps} ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(' ')} jobs ${jobs.join(',') || '-'}`);
  };
  for (const style of (process.env.BOARD_STYLE ?? 'casual').split(',') as Style[]) for (const policy of ['rush', 'explorer'] as Policy[])
    for (let i = 0; i < n; i++) simulateCampaign(Number(process.env.BOARD_SEED0 ?? 1001) + i * 37, policy, style, 2, 1);
  hooks.run = undefined; writeFileSync(process.env.BOARD_OUT!, rows.join('\n'));
}, 7200000);
