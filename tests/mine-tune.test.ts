// Tuning harness for the Crystal Mine (skipped unless MINE_TUNE is set). Maps 1–4 do not depend on mine numbers, so
// `MINE_TUNE=pre` stores each campaign at the mine's door once, and any other MINE_TUNE name replays only the mine from
// that store with the TUNE overrides. Split the job list with SHARD/SHARDS to run one process per core, e.g.
//   for s in 0 1 2 3; do MINE_TUNE=pre SEEDS=48 SHARD=$s SHARDS=4 npx vitest run tests/mine-tune.test.ts & done; wait
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { it } from 'vitest';
import { MAPS } from '../src/content/world/maps';
import { mineMap } from '../src/content/world/chapter-mine';
import { encounterById } from '../src/content/encounters/catalog';
import { simulateCampaign, type CampaignReport, type Policy, type Style } from './sim/balance-sim';

const mode = process.env.MINE_TUNE; const dir = process.env.MINE_TUNE_DIR ?? `${tmpdir()}/mine-tune`;
const shard = Number(process.env.SHARD ?? 0), shards = Number(process.env.SHARDS ?? 1), seeds = Number(process.env.SEEDS ?? 48);
const pairs = [['lio', 'brann'], ['lio', 'sefa'], ['toma', 'brann'], ['toma', 'sefa']];
const before = MAPS.filter(m => m.id !== mineMap.id);
const jobs: { style: Style; policy: Policy; pair: string[]; seed: number }[] = [];
for (const style of ['advisor', 'casual'] as Style[]) for (const policy of ['rush', 'explorer'] as Policy[]) for (const pair of pairs)
  for (let i = 0; i < seeds; i++) jobs.push({ style, policy, pair, seed: 1001 + 37 * i });
const mine = jobs.filter((_, i) => i % shards === shard);

// TUNE='{"hp":600,"Crystal Fist":100,...,"fragHp":40,"Shard Prick":13}' overrides the giant in place for this run.
function override(): void {
  const t = JSON.parse(process.env.TUNE ?? '{}') as Record<string, number>; const e = encounterById('crystal-giant') as unknown as
    { enemies: { id: string; maxHp: number; crystalArmor?: Record<string, number> }[]; intents: { name: string; damage: number }[] };
  for (const [k, v] of Object.entries(t)) {
    if (k === 'dark') (mineMap.mine as { darkPressurePercent?: number }).darkPressurePercent = v;
    else if (k === 'hp') e.enemies[0]!.maxHp = v;
    else if (['reflect', 'cap', 'hits', 'turns'].includes(k)) e.enemies[0]!.crystalArmor = { ...e.enemies[0]!.crystalArmor, [k]: v };
    else if (k === 'fragHp') e.enemies.slice(1).forEach(f => { f.maxHp = v; });
    else { const hit = e.intents.filter(i => i.name === k); if (!hit.length) throw new Error(k); hit.forEach(i => { i.damage = v; }); }
  }
}
it.runIf(!!mode)('mine tuning', () => {
  override(); mkdirSync(dir, { recursive: true });
  const file = `${dir}/pre-${shard}-${shards}-${seeds}.json`;
  if (mode === 'pre') {
    const out = mine.map(j => simulateCampaign(j.seed, j.policy, j.style, 0, 0, 16, j.pair, before));
    writeFileSync(file, JSON.stringify(out)); return;
  }
  if (!existsSync(file)) throw new Error(`missing ${file}`);
  const pre: CampaignReport[] = JSON.parse(readFileSync(file, 'utf8'));
  const rows = mine.map((j, i) => {
    const start = pre[i]!; const entered = start.profile.cleared.length >= before.length;
    if (!entered) return { ...j, entered: false };
    const r = simulateCampaign(j.seed, j.policy, j.style, 0, 0, 16, j.pair, MAPS, start);
    const run = r.expeditions.find(e => e.mapId === mineMap.id);
    return { ...j, entered: !!run, first: run?.outcome === 'complete', outcome: run?.outcome, battles: run?.battles, lowest: run?.lowestHp, level: run?.level, steps: run?.steps, defeats: run?.defeats };
  });
  writeFileSync(`${dir}/${mode}-${shard}-${shards}-${seeds}.json`, JSON.stringify(rows));
}, 3_600_000);
