import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { MAPS } from '../../src/content/world/maps';
import { campLevel } from '../../src/core/world/world';
import { newProfile } from '../../src/core/world/profile';
import { wbEncounter, wbPlay } from '../../src/core/world/world-boss';
import type { Profile } from '../../src/core/world/types';
import { simulateCampaign, type Policy } from '../sim/balance-sim';
import { wbTurns } from '../fixtures/world-boss';

// P11-04 World Boss draft numbers: damage one attempt lands (eight rounds, advisor and blind basic attacks) for a
// starter camp and for companies after maps 1→3 (balance-sim campaign). `WB_OUT=<file> npx vitest run
// tests/probe/p1104-world-boss.test.ts` writes a Markdown table.
const home = MAPS[0]!;
function row(name: string, p: Profile): string {
  const data = wbEncounter(p, home, lookup)!; const max = home.worldBoss.maxRounds;
  const out = (['advisor', 'attack'] as const).map(style => { const r = wbPlay(data, wbTurns(data, max, style), max); return `${r.damage} (${r.state.outcome === 'defeat' ? 'ล้ม' : `${r.rounds} รอบ`})`; });
  return `| ${name} | Lv${campLevel(home, p.campXp)} | ${p.party.deployed.length} | ${out.join(' | ')} |`;
}
test.skipIf(!process.env.WB_OUT)('world boss damage per attempt', () => {
  const lines = ['| ค่าย | เลเวลค่าย | ทีม | ดาเมจ advisor | ดาเมจ ตีธรรมดา |', '|---|---|---|---|---|'];
  lines.push(row('เริ่มใหม่ (ผ่านแมพ 1 ไม่มีของ)', { ...newProfile(home, 7), tutorialDone: true, cleared: [MAPS[0]!.id] }));
  for (const policy of ['rush', 'explorer'] as Policy[]) for (const seed of [1001, 1038]) {
    const c = simulateCampaign(seed, policy, 'casual', 0, 0);
    lines.push(row(`จบแมพ 3 ${policy} #${seed}`, c.profile));
    const end = simulateCampaign(seed, policy, 'casual', 2, 1);
    lines.push(row(`หลังแคมเปญ+เล่นซ้ำ ${policy} #${seed}`, end.profile));
  }
  writeFileSync(process.env.WB_OUT!, lines.join('\n') + '\n');
}, 3_600_000);
