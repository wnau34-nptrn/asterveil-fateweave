import { test } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { captured, playOut, setCapture, simulateCampaign, useMap, type Policy } from '../sim/balance-sim';
import { MAPS, mapById } from '../../src/content/world/maps';
import type { ExpeditionState } from '../../src/core/world/types';
// P05 boss bench. BENCH_CAPTURE=<file>: keeps the boss/elite battles of casual companies' first tries at each map.
// BENCH_IN=<file>: replays them blind (attack), advisor and casual (BENCH_SALTS rolls each) and prints win rates per fight.
type Row = { company: string; mapId: string; label: string; hard: boolean; state: ExpeditionState };
test.skipIf(!process.env.BENCH_CAPTURE)('capture', () => {
  const [k, n] = (process.env.PROBE_PART ?? '0/1').split('/').map(Number) as [number, number];
  const out: Row[] = [];
  for (const policy of ['rush', 'explorer'] as Policy[]) for (const seed of Array.from({ length: 48 }, (_, i) => 1001 + i * 37).filter((_, i) => i % n === k)) {
    // BENCH_HARD=1 (P05-04): the first two hard runs after the normal clears (BENCH_REPLAYS normal replays first), keeping only their hard fights.
    const hard = process.env.BENCH_HARD === '1';
    setCapture(true); simulateCampaign(seed, policy, 'casual', Number(process.env.BENCH_REPLAYS ?? 0), hard ? 2 : 0); out.push(...captured.filter(c => c.hard === hard).map(c => ({ ...c, company: c.company })));
  }
  setCapture(false); writeFileSync(process.env.BENCH_CAPTURE!, JSON.stringify(out));
}, 3600000);
test.skipIf(!process.env.BENCH_IN)('bench', () => {
  const rows: Row[] = process.env.BENCH_IN!.split(',').flatMap(f => JSON.parse(readFileSync(f, 'utf8')) as Row[]);
  const salts = Number(process.env.BENCH_SALTS ?? 4); const res: Record<string, number[]> = {};
  for (const r of rows) {
    useMap(mapById(r.mapId)!); const id = `${MAPS.findIndex(m => m.id === r.mapId) + 1}${r.hard ? 'H' : ''} ${r.company.split(":")[1]![0]} ${r.label} ${r.state.battle!.encounterId}`;
    const a = (res[id] ??= [0, 0, 0, 0, 0]); a[0]!++;
    if (playOut(r.state, 'attack').bs.outcome === 'victory') a[1]!++;
    if (playOut(r.state, 'advisor').bs.outcome === 'victory') a[2]!++;
    for (let i = 0; i < salts; i++) { const bs = playOut(r.state, 'casual', i * 7919 + 13).bs; if (bs.outcome === 'victory') a[3]!++; a[4]! += bs.heroes.reduce((n, h) => n + h.hp, 0) / bs.heroes.reduce((n, h) => n + (r.state.battle!.entry[h.id] ?? 0), 0); }
  }
  const lines = Object.entries(res).sort().map(([k, [n, at, ad, ca, hp]]) => `${k.padEnd(40)} n=${String(n).padStart(3)} attack ${pc(at!, n!)} casual ${pc(ca!, n! * salts)} advisor ${pc(ad!, n!)} keep ${pc(hp!, n! * salts)}`);
  console.log(lines.join('\n')); if (process.env.BENCH_OUT) writeFileSync(process.env.BENCH_OUT, lines.join('\n'));
}, 3600000);
const pc = (a: number, b: number) => `${String(Math.round(a / b * 100)).padStart(3)}%`;
