import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { hooks, simulateCampaign, type Policy, type Style } from '../sim/balance-sim';
import { fatigueOf, levelOf } from '../../src/core/world/world';
import { mapById } from '../../src/content/world/maps';
// P04-05/06: one line per battle of each company's first normal try at PACE_MAP (default veil-frontier), plus the outcome.
test.skipIf(!process.env.PACE_OUT)('pacing trace', () => {
  const target = process.env.PACE_MAP ?? 'veil-frontier'; const style = (process.env.PACE_STYLE ?? 'casual') as Style; const n = Number(process.env.PACE_N ?? 48);
  const out: string[] = []; const done = new Set<string>(); const m = mapById(target)!;
  const hp = (s: Parameters<NonNullable<typeof hooks.battle>>[0], ids: string[]) => ids.map(id => s.hp[id] ?? 0).join('/');
  const first = new Map<string, string>();
  hooks.battle = (s, label, won, before, mapId, co) => {
    if (mapId !== target || done.has(co) || s.hard) return;
    out.push(`${co} ${label} ${won ? 'W' : 'L'} lv${levelOf(m, s)} in${before} dep[${hp(s, s.roster.deployed)}] fat[${s.roster.deployed.map(id => fatigueOf(s, id)).join('/')}] res[${hp(s, s.roster.reserve)}] rest${s.restReady ? 1 : 0}:${s.restWins ?? 0} pot${s.potions.salve}/${s.potions.tonic}/${s.potions.calm} @${s.position.x},${s.position.y}`);
  };
  hooks.run = (s, outcome, mapId, co) => { if (!s.hard && !first.has(`${co} ${mapId}`)) first.set(`${co} ${mapId}`, `${outcome}:${levelOf(m, s)}`); if (mapId !== target || done.has(co) || s.hard) return; out.push(`${co} END ${outcome} lv${levelOf(m, s)} wins${s.wins} steps${s.steps}`); done.add(co); };
  for (const policy of (process.env.PACE_POLICY ?? 'rush').split(',') as Policy[]) for (let i = 0; i < n; i++) simulateCampaign(Number(process.env.PACE_SEED0 ?? 1001) + i * 37, policy, style, 0, 0, Number(process.env.PACE_LIMIT ?? 6));
  hooks.battle = hooks.run = undefined;
  const sum: string[] = [];
  for (const map of ['ruined-border', 'deep-forest', 'veil-frontier']) for (const pol of ['rush', 'explorer']) {
    const xs = [...first].filter(([k]) => k.endsWith(` ${map}`) && k.includes(`:${pol}:`)).map(([, v]) => v);
    if (xs.length) sum.push(`SUM ${map} ${pol} complete ${xs.filter(x => x.startsWith('complete')).length}/${xs.length} lv ${(xs.reduce((a, x) => a + Number(x.split(':')[1]), 0) / xs.length).toFixed(1)}`);
  }
  console.log(sum.join('\n')); writeFileSync(process.env.PACE_OUT!, [...sum, ...out].join('\n'));
}, 3600000);
