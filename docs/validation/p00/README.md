# P00 baseline — เกมก่อนเลเวลร่วมและทีมสูงสุดห้า

Source commit `e62292a7fe476cfadc5f2310073432a88b79c292` · Node24.19.0/npm11.9.0 · runtime4v4/Lvรายตัว/savev43

## ผลรันใหม่

- `npm run sim`: **28/28 ผ่าน, 7/7 files**, 367.72วินาที ตาม [log](sim-output.txt)
- focused baseline `npx vitest run tests/roster-batch1-world.test.ts tests/formation.test.ts tests/talents.test.ts`: **55/55 ผ่าน** ตาม [summary](focused-summary.json)
- รันจาก git archive ของcommitข้างต้นใน `/tmp/fateweave-p00-baseline` และใช้node_modulesที่ติดตั้งแล้ว ไม่แก้runtimeหรือเขียนทับรายงานvalidationเดิมในworking tree
- [manifest](manifest.json) เก็บcommit/command/SHA256 ของartifact; ไม่ใช่การรับประกันว่าsimครอบคลุมทุกบิลด์หรือความสนุก

## สิ่งที่เก็บไว้เทียบหลังเปลี่ยน

| รายงาน | ขอบเขต |
|---|---|
| [Campaign](CAMPAIGN.md) | 12seeds `1001+i×37` × rush/explorer × advisor/casual; maps1→3แล้วreplay/hard; policies/ทุนตามreportและsource |
| [20 campaign cells](campaign-cells.json) | แยกfirst-normalและhard cellsจากรายงานรอบนี้ ใช้compareP01ที่ทุน/seed/policyเดียวกัน; ไม่แทนfixtureC12เก่าในเทสต์ |
| [Characters](CHARACTERS.md) | 14ตัว×3แมพ×12traversalseeds; เลือกบิลด์จากcandidateที่enumerate ไม่ใช่ค้นทุกบิลด์ |
| [Economy](ECONOMY.md) | 24seedsเดิม×นโยบายที่suiteกำหนด บัญชี/ทรัพยากรต่อเที่ยว; ยังไม่ใช่เศรษฐกิจดาวใหม่ |
| [Formation](FORMATION.md) | สี่formationเดิม×12seeds×rush/explorer×4เที่ยว พร้อมsingle-battle comparisons |
| [Classes](CLASSES.md) | seed11 เทียบของnone/main/offตามsuiteเดิม |
| [Trees](TREES.md) | ตัวอย่างต้นไม้/ท่าที่advisorใช้ตามsuiteเดิม |
| [Starters](STARTERS.md) | คู่starterทั้งหก×rush/explorer×seeds11/23/37/41/59/61 |

บรรทัดหัวบางรายงานยังอ้างC12/5a613a5เพราะเป็นข้อความที่generatorเดิมสร้าง เก็บไว้ตรงตามผลรันโดยไม่แก้ตัวเลข ให้ใช้sourcecommitในหน้านี้และmanifestเป็นที่มาของbaseline P00 ตรวจใหม่ก่อนเทียบหากแก้generator/policyในP01

## ข้อจำกัดและเกณฑ์รอบต่อไป

ผลนี้ยืนยันเฉพาะกฎเดิม ไม่มีภาพทีม5 การทดสอบมนุษย์ อุปกรณ์จริง หรือผลmigrationใหม่ P00มีแผนตรวจสิ่งเหล่านั้นใน [สเปก](../../design/p00/SHARED_PROGRESSION_TEAM_SPEC_TH.md) และ [matrix](../../design/p00/MIGRATION_ACCEPTANCE_TH.md)

P01ให้รันbaselinepolicyเดิมบนทีม4เพื่อแยกผลsharedLv; ตรวจ20cellsพร้อมauditHP/ทุน ไม่แก้fixtureเพื่อซ่อนregression P02เก็บผลทีม4และ5ของรุ่นเดียวกันก่อนเทียบข้ามรุ่น (จำนวนศัตรู/ทุน/seedต้องอธิบาย) ผลtimingของsimไม่ใช่เวลาตัดสินใจผู้เล่น
