# Odran / Isolde — ภาพนิ่งใหม่ในเกม (PR #120 + #118)

- ที่มา: เจ้าของอนุมัติภาพ “อนุมัติ” 2026-10-30; `incoming/ART-CHAR-REDESIGN-002` (unit) + `incoming/ART-CHAR-REDESIGN-001` (portrait/อาวุธ)
- ตรวจ SHA-256: #118 33 ไฟล์, #120 20 ไฟล์ ตรง `validation.json` ทั้งหมด; `odran.png` ca7a30b3…, `isolde.png` e6d80253…
- atlas: `units_mercs.webp` (จาก #120) เปลี่ยนเฉพาะ frame 7/9 (2,481,852 B เดิม 2,510,564); `portraits_mercs.webp` เปลี่ยนเฉพาะ portrait 7/9 (3,689,860 B เดิม 3,823,682); `gear_items.webp` เปลี่ยนเฉพาะ (6,0)/(6,1) (980,378 B เดิม 987,992) ช่องอื่นตรงทุกพิกเซลกับไฟล์เดิม
- ถอด entry `thiran`/`wila` ใน `unit-frames.ts` พร้อม atlas `thiran_a7`/`wila_a7` (manifest + ไฟล์) → สองตัวนี้ใช้ seed นิ่ง + procedural motion จนกว่า ART-UNIT-ANIMATION-A7-003; Corin (`metta`)/Cerise (`lalin`) คงเดิม rules/save/content/balance/timing ไม่เปลี่ยน
- ภาพ/คลิปจริง 390px (Chromium emulation + SwiftShader ไม่ใช่มือถือจริง/iOS): `field-four-390.png` (สนามทั้งสี่ตัว), `character-odran-390.png`, `character-isolde-390.png`, `team-390.png`, คลิป `thiran-saintstrike`/`thiran-communion`/`wila-attack` + เทียบ `metta-attack`/`lalin-attack`
- capture: `OI_CAPTURE=1 npx playwright test tests/browser/odran-isolde-capture.spec.ts` (fixture `tests/browser/fixtures/odran-isolde.*`)
- เทสต์: typecheck/lint/vitest 1340/build ผ่าน; Playwright unit-a7/saint-dance-fx/roster-batch1/unit-loading 52/52
