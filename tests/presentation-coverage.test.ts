import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));
import { readFileSync, writeFileSync } from 'node:fs';
import { PARKED, presentationCoverage, unusedRegistry, type CoverageRow, type PresentationCoverage } from '../src/game/visuals/presentation-coverage';
import { unitDefinition } from '../src/game/visuals/unit-frames';
import { veilSiege } from '../src/content/encounters/veil-siege';

// W8: docs/combat-presentation/coverage.json and COVERAGE_TH.md are generated from the registry and the content.
// Regenerate with `npm run coverage:presentation`; this test fails while the committed table is stale.
const JSON_PATH = 'docs/combat-presentation/coverage.json', MD_PATH = 'docs/combat-presentation/COVERAGE_TH.md';
const MiB = (n: number) => (n / 1048576).toFixed(2), MB = (n: number) => (n / 1e6).toFixed(2);
const vfxLabel = (r: CoverageRow) => `${r.vfx.kind === 'painted' ? 'วาด' : r.vfx.kind === 'shared' ? 'ชุดร่วม' : 'โค้ด'} \`${r.vfx.module}\`${r.vfx.note ? ` — ${r.vfx.note}` : ''}`;
const bodyLabel = (r: CoverageRow) => r.body.kind === 'sprite'
  ? `sprite \`${r.body.clip}\` ${r.body.frames!.prepare.join(',')} → ${r.body.frames!.recover.join(',')}`
  : `procedural (${r.body.pose}) — ${r.body.reason}`;
const cell = (s: string) => s.replace(/\|/g, '\\|');
function markdown(c: PresentationCoverage): string {
  const n = c.counts, out: string[] = [];
  out.push('# ตารางครอบคลุมท่าร่างกายและ VFX (W8) — สร้างจากโค้ด', '',
    '> ไฟล์นี้และ `coverage.json` สร้างจาก `src/game/visuals/presentation-coverage.ts` (registry `unit-frames.ts`, content, ลำดับ routing ของ `BattleScene`) ด้วย `npm run coverage:presentation` ห้ามแก้ด้วยมือ; `tests/presentation-coverage.test.ts` ล้มเมื่อตารางไม่ตรงโค้ด',
    '', '## สรุป', '',
    `- identities ${n.identities} (ฝ่ายเรา ${n.heroes} · ศัตรู ${n.enemies}) · มี atlas ${n.atlases} · พักตาม OD-14 ${n.parked} (โอดราน \`thiran\` / อิโซลด์ \`wila\`: ภาพนิ่งใหม่ + procedural ไม่มี atlas)`,
    `- ActionId ฝ่ายเรา ${n.actionIds} รายการ (${n.heroRows} แถว ตัวละคร×ท่า รวมท่าจากต้นไม้) · ชื่อท่าศัตรู/phase ${n.intents} ชื่อ (${n.foeRows} แถว identity×ท่า)`,
    `- ท่าร่างกาย: sprite ${n.spriteRows} · procedural ${n.proceduralRows} (ทั้งหมดคือตัวที่พักตาม OD-14)`,
    `- VFX: วาดเฉพาะ ${n.paintedRows} · ชุดร่วมโดยตั้งใจ ${n.sharedRows} · วาดด้วยโค้ดโดยตั้งใจ ${n.codeRows}`,
    '', 'ความหมาย: **sprite** = เฟรม atlas (prepare → recover; contact = เฟรม recover แรก, เวลา contact/end มาจาก UI ไม่ใช่ FPS ภาพ) · **procedural** = ภาพนิ่ง + การเคลื่อนไหวด้วยโค้ด · **วาด** = painted atlas ของท่านั้น · **ชุดร่วม** = painted atlas ร่วมตระกูลโดยตั้งใจ · **โค้ด** = วาดด้วย Graphics ตั้งใจ (ไม่มีภาพเฉพาะ) · จุดเกิดผลทุกแถวอ่านจาก event จริงของ resolver',
    '', '## Identities', '', '| identity | ชื่อ | ฝั่ง | atlas (เฟรม · decoded · download) | hit | block | down | counter |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const i of c.identities) out.push(`| \`${i.identity}\` | ${i.name} | ${i.side === 'hero' ? 'เรา' : 'ศัตรู'} | ${i.atlas ? `${i.atlas.frames} · ${MiB(i.atlas.decodedBytes)} MiB · ${MB(i.atlas.downloadBytes)} MB` : cell(i.parked ?? 'ไม่มี')} | ${i.reactions.hit} | ${i.reactions.block} | ${i.reactions.down} | ${i.reactions.counter ?? '—'} |`);
  out.push('', 'dodge ทุกตัว = procedural (เลื่อนหลบ) ไม่มีเฟรมเฉพาะ', '', '## ฝ่ายเรา: ตัวละคร × ActionId', '', '| identity | ActionId / ชื่อ | ท่าร่างกาย | VFX | เป้า | จุดเกิดผล |', '| --- | --- | --- | --- | --- | --- |');
  for (const r of c.rows.filter(r => r.side === 'hero')) out.push(`| \`${r.identity}\` | \`${r.move}\` ${r.name} | ${cell(bodyLabel(r))} | ${cell(vfxLabel(r))} | ${r.target} | ${r.point} |`);
  out.push('', '## ศัตรู: identity × intent / phase', '', '| identity | ท่า (kind) | ท่าร่างกาย | VFX | เป้า | จุดเกิดผล | encounter |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of c.rows.filter(r => r.side === 'enemy')) out.push(`| \`${r.identity}\` | ${r.name} (${r.kind}) | ${cell(bodyLabel(r))} | ${cell(vfxLabel(r))} | ${r.target} | ${r.point} | ${r.encounters!.join(', ')} |`);
  const procedural = c.rows.filter(r => r.body.kind === 'procedural'), code = c.rows.filter(r => r.vfx.kind === 'code');
  out.push('', '## งานค้างที่รู้อยู่แล้ว (สร้างจากตาราง)', '',
    `- ท่าร่างกาย procedural ${procedural.length} แถว: ${[...new Set(procedural.map(r => `\`${r.identity}\``))].join(', ')} — ${[...new Set(procedural.map(r => r.body.reason))].join('; ')}`,
    `- VFX วาดด้วยโค้ดโดยตั้งใจ ${code.length} แถว: ${code.map(r => `\`${r.identity}\` ${r.name}`).join(', ')}`, '');
  return out.join('\n');
}

describe('W8 presentation coverage', () => {
  const c = presentationCoverage();
  it('counts every identity in the game and every ActionId', () => {
    expect(c.counts.identities).toBe(36);
    expect(c.counts.heroes).toBe(14);
    expect(c.counts.actionIds).toBe(Object.keys(veilSiege.skills).length);
    expect(unusedRegistry(c)).toEqual([]);
    // Only the OD-14 parked identities lack an atlas.
    expect(c.identities.filter(i => !i.atlas).map(i => i.identity).sort()).toEqual(Object.keys(PARKED).sort());
  });
  it('every non-parked move has sprite frames that exist in its atlas', () => {
    for (const r of c.rows) {
      if (PARKED[r.identity]) { expect(r.body.kind).toBe('procedural'); continue; }
      expect(r.body.kind, `${r.identity} ${r.move}`).toBe('sprite');
      const frames = c.identities.find(i => i.identity === r.identity)!.atlas!.frames;
      for (const f of [...r.body.frames!.prepare, ...r.body.frames!.recover]) expect(f, `${r.identity} ${r.move}`).toBeLessThan(frames);
    }
    for (const i of c.identities) {
      const d = unitDefinition(i.identity); if (!d || !i.atlas) continue;
      for (const list of Object.values(d.reactions ?? {})) for (const f of list as readonly number[]) expect(f, i.identity).toBeLessThan(i.atlas.frames);
    }
  });
  it('no move falls back to an unexplained route', () => {
    // Code-drawn on purpose: the basic arrow/flask (AV03) and Shadow Knife's thrown energy blade.
    for (const r of c.rows.filter(r => r.vfx.kind === 'code')) expect(r.move === 'attack' || r.move === 'Shadow Knife', `${r.identity} ${r.move}`).toBe(true);
    // Shared on purpose: hero basic cuts by class palette and physical foe moves on the blade family.
    for (const r of c.rows.filter(r => r.vfx.kind === 'shared')) expect(r.vfx.module, `${r.identity} ${r.move}`).toBe('blade-fx');
  });
  it('the committed table matches the code', () => {
    const json = JSON.stringify(c, null, 1) + '\n', md = markdown(c);
    if (process.env.PRESENTATION_COVERAGE_WRITE) { writeFileSync(JSON_PATH, json); writeFileSync(MD_PATH, md); }
    expect(readFileSync(JSON_PATH, 'utf8'), 'run npm run coverage:presentation').toBe(json);
    expect(readFileSync(MD_PATH, 'utf8'), 'run npm run coverage:presentation').toBe(md);
  });
});
