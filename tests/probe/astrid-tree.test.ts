import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { treeSim } from '../sim/tree-sim';
// Astrid advisor tuning probe (2026-11-06): the tree-sim rows for Astrid only. Run with PROBE_OUT=<file>.
test.skipIf(!process.env.PROBE_OUT)('astrid tree rows', () => {
  const rows = treeSim().filter(r => r.id === 'astrid');
  writeFileSync(process.env.PROBE_OUT!, rows.map(r => `${r.build} won ${r.won}/${r.fought} hp ${Math.round(r.partyHp / r.fought * 100)}% ${JSON.stringify(r.actions)} ablation ${JSON.stringify(Object.fromEntries(Object.entries(r.disabled).map(([a, o]) => [a, +((r.partyHp - o.hp) / r.fought * 100).toFixed(1)])))}`).join('\n'));
}, 900000);
