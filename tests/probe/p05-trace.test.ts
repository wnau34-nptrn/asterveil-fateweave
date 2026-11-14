import { test } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { playOut, useMap } from '../sim/balance-sim';
import { mapById } from '../../src/content/world/maps';
import type { ExpeditionState } from '../../src/core/world/types';
import { battleData, battleState } from '../../src/core/world/world';
import { resolveCommand } from '../../src/core/battle/engine';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
// P05: per-fight traces for one encounter (TRACE_ENC) from bench captures: rounds, boss moves that landed, outcome.
test.skipIf(!process.env.TRACE_IN)('trace', () => {
  const rows = JSON.parse(readFileSync(process.env.TRACE_IN!, 'utf8')) as { mapId: string; label: string; company: string; state: ExpeditionState }[];
  const out: Record<string, { n: number; win: number; rounds: number; moves: Record<string, number>; hp: number }> = {};
  for (const r of rows.filter(r => r.state.battle!.encounterId === process.env.TRACE_ENC)) {
    useMap(mapById(r.mapId)!); const data = battleData(r.state, mapById(r.mapId)!, lookup)!;
    for (const style of ['attack', 'casual', 'advisor'] as const) {
      const { bs } = playOut(r.state, style, style === 'casual' ? 13 : 0); const k = `${r.mapId} ${r.company.split(':')[1]} ${style}`;
      const o = (out[k] ??= { n: 0, win: 0, rounds: 0, moves: {}, hp: 0 }); o.n++;
      let st = battleState(r.state, mapById(r.mapId)!, lookup)!; for (const c of bs.commands) { const res = resolveCommand(st, data, c); st = res.state; for (const e of res.events) { if (e.type === 'damage' && e.sourceId && /^[fb]\d/.test(e.sourceId)) o.moves[e.sourceId] = (o.moves[e.sourceId] ?? 0) + (e.amount ?? 0); if (e.type === 'cancel' || e.type === 'interrupt' || e.type === 'sigil') o.moves[e.type] = (o.moves[e.type] ?? 0) + 1; } } if (bs.outcome === 'victory') o.win++; o.rounds += bs.round;
      o.hp += bs.heroes.reduce((a, h) => a + h.hp, 0) / data.heroes.reduce((a, h) => a + h.maxHp, 0);
    }
  }
  writeFileSync(process.env.TRACE_OUT!, Object.entries(out).sort().map(([k, o]) => `${k} n=${o.n} win=${Math.round(o.win / o.n * 100)}% rounds=${(o.rounds / o.n).toFixed(1)} hpEnd=${Math.round(o.hp / o.n * 100)}% ${Object.entries(o.moves).map(([m, v]) => `${m}:${Math.round(v / o.n)}`).join(' ')}`).join("\n"));
}, 600000);
