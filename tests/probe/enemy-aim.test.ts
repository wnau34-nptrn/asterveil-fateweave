import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { WORLD_BOSS_TRIO } from '../../src/content/encounters/world-boss-trio';
import { encounters } from '../../src/content/encounters/catalog';
import { MAPS } from '../../src/content/world/maps';
import { createBattle, enemyIntent } from '../../src/core/battle/engine';
import type { EncounterDefinition, IntentAim, IntentDefinition } from '../../src/core/battle/types';
import { simulateCampaign, type CampaignReport } from '../sim/balance-sim';

// Enemy aim proposal (docs/design/ENEMY_AIM_PROPOSAL_TH.md). No shipped content sets `aim`; this probe gives aims to the
// catalog's foes in memory, one variant at a time, and replays the A10 campaign (advisor 12 + casual 48 companies × rush/
// explorer) on the real resolver. `AIM_OUT=<dir> npx vitest run tests/probe/enemy-aim.test.ts` writes the tables.
type Rule = (foe: EncounterDefinition['enemies'][number], intent: IntentDefinition, index: number) => IntentAim | undefined;
const variants: [string, string, Rule][] = [
  ['base', 'ปัจจุบัน: เล็งช่องตามที่เขียนไว้', () => undefined],
  ['A', 'นักล่า: ศัตรูแถวหลัง (ไม่ใช่บอส) เล็งคน HP% ต่ำสุด', foe => foe.row === 'back' && !foe.boss ? 'weakest' : undefined],
  ['B', 'ไล่ฮีล: ท่าพลังงานของศัตรูแถวหลัง (ไม่ใช่บอส) เล็งสายสนับสนุนก่อน', (foe, m) => foe.row === 'back' && !foe.boss && m.kind === 'energy' ? 'support' : undefined],
  ['C', 'ฝูง: ศัตรูแถวหน้า (ไม่ใช่บอส) ตีตามเป้าของตัวแรกในกลุ่ม', foe => foe.row === 'front' && !foe.boss ? 'pack' : undefined],
  ['D', 'บอสฉลาด: บอส/อีลีทเล็งคน HP% ต่ำสุดในท่าที่สองของทุกสองท่า', (foe, _m, i) => foe.boss && i % 2 === 1 ? 'weakest' : undefined],
  ['E', 'ผสม A + C', (foe, m, i) => variants[1]![2](foe, m, i) ?? variants[3]![2](foe, m, i)],
  ['F', 'สุดทาง: ทุกตัวเล็งคน HP% ต่ำสุดทุกท่า', () => 'weakest'],
];
const all = [...encounters, ...WORLD_BOSS_TRIO];
function apply(rule: Rule): () => void {
  const undo: (() => void)[] = [];
  for (const data of all) {
    const counts = new Map<string, number>();
    for (const m of data.intents as IntentDefinition[]) {
      const foe = data.enemies.find(e => e.id === m.sourceId); const i = counts.get(m.sourceId) ?? 0; counts.set(m.sourceId, i + 1);
      const aim = foe ? rule(foe, m, i) : undefined; if (!aim) continue;
      undo.push(() => { delete m.aim; }); m.aim = aim;
    }
  }
  return () => undo.forEach(f => f());
}

test('aim rules pick as described and never break the frozen-target contract', () => {
  const data = encounters.find(e => e.enemies.some(f => f.row === 'back'))!;
  const restore = apply(() => 'weakest');
  try {
    const s = createBattle(data); const hero = s.heroes.at(-1)!; hero.hp = 1;
    const back = data.enemies.find(f => f.row === 'back')!;
    const it = enemyIntent(s, data, back.id, 1)!;
    if (data.intents.find(m => m.sourceId === back.id)!.kind === 'energy') expect(it.targetId).toBe(hero.id);
  } finally { restore(); }
});

const pct = (n: number, d: number) => (d ? `${Math.round(n * 100 / d)}%` : '–');
test.skipIf(!process.env.AIM_OUT)('enemy aim proposal: campaign per variant', () => {
  const rows: string[] = []; const detail: string[] = [];
  const seeds = (n: number) => Array.from({ length: n }, (_, i) => 1001 + i * 37);
  for (const [id, label, rule] of variants) {
    const restore = apply(rule); let cs: CampaignReport[];
    try {
      cs = (['advisor', 'casual'] as const).flatMap(style => seeds(style === 'casual' ? 48 : 12).flatMap(seed =>
        (['rush', 'explorer'] as const).map(policy => simulateCampaign(seed, policy, style))));
    } finally { restore(); }
    for (const style of ['advisor', 'casual'] as const) {
      const group = cs.filter(c => c.style === style); const n = group.length;
      const first = MAPS.map(m => group.filter(c => c.expeditions.find(e => e.mapId === m.id && !e.hard)?.outcome === 'complete').length);
      const hard = group.filter(c => c.expeditions.find(e => e.hard)?.bossBeaten).length;
      const tries = group.map(c => c.expeditions.filter(e => !e.hard).length);
      const stat = (key: string) => { const st = group.flatMap(c => c.expeditions.filter(e => !e.hard).map(e => e.battles[key]).filter(Boolean)); const f = st.reduce((a, b) => a + b!.fought, 0); return pct(st.reduce((a, b) => a + b!.won, 0), f); };
      const wipes = group.reduce((a, c) => a + c.expeditions.filter(e => !e.hard && e.outcome !== 'complete').length, 0);
      rows.push(`| ${id} | ${style} · ${n} | ${first.map(x => pct(x, n)).join(' / ')} | ${pct(hard, n)} | ${(tries.reduce((a, b) => a + b, 0) / n).toFixed(1)} | ${(wipes / n).toFixed(2)} | ${stat('random')} | ${stat('elite-forced')} | ${stat('boss')} |`);
    }
    detail.push(`- **${id}** ${label}`);
  }
  const out = process.env.AIM_OUT!; mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/campaign.md`, [...detail, '', '| แบบ | กลุ่ม | ผ่านครั้งแรก แมพ 1 / 2 / 3 | ยากครั้งแรก | เที่ยวปกติทั้งหมด | เที่ยวที่ไม่ผ่าน/บริษัท | ชนะสุ่ม | ชนะอีลีทบังคับ | ชนะบอส |', '|---|---|---|---|---|---|---|---|---|', ...rows, ''].join('\n'));
}, 3_600_000);
