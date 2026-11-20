import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { presentedEncounters as encounters } from '../src/content/encounters/catalog';
import { encounterUnitSheets } from '../src/game/visuals/optional-unit-assets';
import { heroes } from '../src/content/heroes/team';
import { mercenaries } from '../src/content/heroes/mercenaries';
import atlasManifest from '../src/game/visuals/unit-atlases.json';
import type { EncounterDefinition } from '../src/core/battle/types';
import { usesBossSignature } from '../src/game/visuals/boss-signature-fx';
import { allBattleAtlases, atlasesForActions } from '../src/game/visuals/battle-assets';

// W8 / A11: animation + VFX texture budget per encounter (UNIT_ANIMATION_ROLLOUT_TH.md §7: unit animation ≤ 64 MiB decoded for a full
// field, ~12 MB download). Worst case = the heaviest 4 or 5 (OD-05) hero atlases with every foe of the encounter, reserves included.
// Regenerate with `npm run coverage:presentation`; the test fails while the committed report is stale or a field exceeds the budget.
const DIR = 'docs/validation/w8-field-audit', MD = `${DIR}/BUDGET_TH.md`, JSON_OUT = `${DIR}/budget.json`;
const MiB = 1048576, LIMIT = 64 * MiB;
type Sheet = keyof typeof atlasManifest;
const manifest = atlasManifest as Record<Sheet, { decodedBytes: number; downloadBytes: number }>;
const fxFile = (name: string) => {
  const meta = JSON.parse(readFileSync(`public/assets/fx/${name}.json`, 'utf8')).meta;
  return { decodedBytes: meta.size.w * meta.size.h * 4, downloadBytes: statSync(`public/assets/fx/${name}.webp`).size + statSync(`public/assets/fx/${name}.json`).size };
};
// Perf audit R1 (src/game/visuals/battle-assets.ts): every battle loads the core VFX atlases; a skill-family atlas only when
// a hero of the encounter has one of its skills; the three below only for encounters that use them.
const fxName = (url: string) => url.split('/').pop()!.replace(/\.webp.*$/, '');
const ALWAYS = atlasesForActions([]).map(r => fxName(r.urls[0]));
const FAMILY = allBattleAtlases().map(r => fxName(r.urls[0])).filter(n => !ALWAYS.includes(n));
const OPTIONAL = { boss: 'boss_signature_fx', foe: 'foe_signature_fx', saintDance: 'saint_dance_fx' } as const;
const roster = [...heroes, ...mercenaries.filter(m => !heroes.some(h => h.id === m.id))];
const heroSheets = roster.flatMap(h => encounterUnitSheets({ heroes: [h], enemies: [] } as unknown as EncounterDefinition)).sort((a, b) => manifest[b].decodedBytes - manifest[a].decodedBytes);
const sum = (sheets: readonly Sheet[], key: 'decodedBytes' | 'downloadBytes') => sheets.reduce((n, s) => n + manifest[s][key], 0);

function report() {
  const always = ALWAYS.map(fxFile), alwaysDecoded = always.reduce((n, f) => n + f.decodedBytes, 0), alwaysDownload = always.reduce((n, f) => n + f.downloadBytes, 0);
  const optional = Object.fromEntries(Object.entries(OPTIONAL).map(([k, v]) => [k, fxFile(v)])) as Record<keyof typeof OPTIONAL, ReturnType<typeof fxFile>>;
  const rows = encounters.map(data => {
    const foes = [...new Set(encounterUnitSheets({ heroes: [], enemies: data.enemies } as unknown as EncounterDefinition))] as Sheet[];
    const field = (n: number) => { const party = heroSheets.slice(0, n) as Sheet[]; return { decoded: sum([...party, ...foes], 'decodedBytes'), download: sum([...party, ...foes], 'downloadBytes') }; };
    const usesBoss = usesBossSignature(data);
    return { id: data.id, foes: data.enemies.length, reserves: data.enemies.filter(e => e.reserve).length, foeSheets: foes,
      four: field(4), five: field(5), bossFx: usesBoss };
  });
  const family = FAMILY.map(fxFile);
  return { heaviestHeroes: heroSheets.slice(0, 5), always: { decoded: alwaysDecoded, download: alwaysDownload, atlases: ALWAYS.length },
    family: { decoded: family.reduce((n, f) => n + f.decodedBytes, 0), download: family.reduce((n, f) => n + f.downloadBytes, 0), atlases: FAMILY.length },
    optional: Object.fromEntries(Object.entries(optional).map(([k, v]) => [k, { decoded: v.decodedBytes, download: v.downloadBytes }])), rows };
}
const m = (n: number) => (n / MiB).toFixed(1), mb = (n: number) => (n / 1e6).toFixed(2);
function markdown(r: ReturnType<typeof report>): string {
  const worst = r.rows.reduce((a, b) => b.five.decoded > a.five.decoded ? b : a);
  const lines = ['# งบ texture ต่อ encounter (W8 / A11) — สร้างจากโค้ด', '',
    '> สร้างโดย `tests/encounter-budget.test.ts` (`npm run coverage:presentation`) จาก `unit-atlases.json`, content และไฟล์ใน `public/assets/fx`; เทสต์ล้มเมื่อรายงานไม่ตรงหรือสนามใดเกิน 64 MiB',
    '', `- ฮีโร่ที่ atlas หนักสุด 5 คน (กรณีแย่สุด): ${r.heaviestHeroes.map(s => `\`${s}\``).join(', ')}`,
    `- สนามแย่สุด (ทีม 5 ตาม OD-05): \`${worst.id}\` ${m(worst.five.decoded)} MiB decoded / ${mb(worst.five.download)} MB download (งบ ≤64 MiB / ~12 MB)`,
    `- VFX หลักที่โหลดทุก battle (${r.always.atlases} atlas): ${m(r.always.decoded)} MiB decoded / ${mb(r.always.download)} MB — นอกงบ animation แต่วัดแยกตาม §7`,
    `- VFX ตามสกิล (${r.family.atlases} atlas รวม ${m(r.family.decoded)} MiB decoded / ${mb(r.family.download)} MB): โหลดเฉพาะเมื่อทีมมีสกิลของตระกูลนั้น (perf audit R1) ไม่โหลดตอนเปิดเกมอีกแล้ว`,
    `- VFX โหลดเฉพาะ encounter ที่ใช้: boss ${m(r.optional.boss!.decoded)} MiB · foe signature ${m(r.optional.foe!.decoded)} MiB · saint/dance ${m(r.optional.saintDance!.decoded)} MiB (ปล่อยเมื่อ encounter ถัดไปไม่ใช้)`,
    '', '| encounter | ศัตรู (สำรอง) | atlas ศัตรู | ทีม 4: decoded / download | ทีม 5: decoded / download | boss VFX |', '| --- | --- | --- | --- | --- | --- |'];
  for (const row of r.rows) lines.push(`| \`${row.id}\` | ${row.foes} (${row.reserves}) | ${row.foeSheets.join(', ')} | ${m(row.four.decoded)} MiB / ${mb(row.four.download)} MB | ${m(row.five.decoded)} MiB / ${mb(row.five.download)} MB | ${row.bossFx ? 'โหลด' : '—'} |`);
  lines.push('', 'ชนิดซ้ำในสนามใช้ texture เดียวกัน (นับครั้งเดียว) · decoded = กว้าง×สูง×4 ของ atlas (RGBA) ไม่ใช่ RAM/GPU รวมของเครื่อง', '');
  return lines.join('\n');
}

describe('A11 encounter texture budget', () => {
  const r = report();
  it('every field with five heroes stays inside the 64 MiB animation budget', () => {
    for (const row of r.rows) expect(row.five.decoded, row.id).toBeLessThanOrEqual(LIMIT);
  });
  it('the committed report matches the assets', () => {
    const json = JSON.stringify(r, null, 1) + '\n', md = markdown(r);
    if (process.env.PRESENTATION_COVERAGE_WRITE) { mkdirSync(DIR, { recursive: true }); writeFileSync(JSON_OUT, json); writeFileSync(MD, md); }
    expect(readFileSync(JSON_OUT, 'utf8'), 'run npm run coverage:presentation').toBe(json);
    expect(readFileSync(MD, 'utf8'), 'run npm run coverage:presentation').toBe(md);
  });
});
