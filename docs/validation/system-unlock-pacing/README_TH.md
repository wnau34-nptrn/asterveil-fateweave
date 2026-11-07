# SYSTEM-UNLOCK-PACING-002 · 2026-11-07

ต่อจาก audit PR #201; fetch ฐานสาขาเกม `4bc4578` ก่อนเริ่ม ไม่ใช้ main
เจ้าของอนุมัติข้อเสนอในแชตด้วยคำว่า **“ดำเนินการตามที่คุณแนะนำได้”** หลังระบุว่าอยากเห็น quests / NPC board ตั้งแต่หลังด่าน 1

## เงื่อนไขปัจจุบันที่อนุมัติ

| หลังเคลียร์ | ระบบที่เปิด |
|---|---|
| MAP 1 | ทีม/formation/preset, อุปกรณ์/คลัง, ต้นไม้/จัดสกิล, forge พื้นฐาน, brew และ **quests / NPC board** |
| MAP 2 | เพิ่มเลเวลไอเทม, เลเวลสกิล/ตำรา และ **hiring / market / hunt** |
| MAP 3 | fuse/craft/transfer/boss charm และ hard mode (hard ต้องเคลียร์ normal ของแมพนั้นด้วย) |

ก่อนเคลียร์ MAP 1 ยังไม่เปิดบริการค่ายกลุ่มนี้; อุปกรณ์/ทีม/สกิลบนแมพคงเงื่อนไขสถานที่และระหว่างศึกเดิม ไม่เพิ่ม campaign gate ขวางทางลัดที่ตั้งใจไว้

- เปลี่ยน `rules.ts` ตารางเดียว: quests 2→1, hire/market 3→2, hunt 5 (fallback 3)→2
- fuse/craft 5→3, transfer 7→3, bossCharm 9→3 **คงจุดเปิดจริงเดิม** แต่เลิกผูกสิทธิ์บริการที่มีอยู่กับ fallback ของบทอนาคต; `featureMap` ยังเป็น helper เดิมสำหรับ threshold อื่น แผน A3 ของบทอนาคตต้องทบทวนก่อนสร้างแมพเพิ่ม ไม่เลื่อนสิทธิ์ผู้เล่นเงียบ ๆ
- UI ข้อความล็อก, badge, NPC quest hint และ guide อ่าน feature predicate เดิม จึงตามตารางใหม่โดยไม่ hard-code เลขบทซ้ำ
- กระดานเควสต์ทั้ง 6 งานเป็นเป้าหมายจากการเดินทาง (wins/elites/secrets/puzzles/rareChests/herbs) ไม่มีงานที่บังคับใช้บริการที่ยังล็อก จึงไม่สร้างเควสต์อนาคตหรือเพิ่มรางวัล; งานไม่ครบยังแสดง progress/เป้าหมาย/รางวัลและรับไม่ได้ งานครบรับได้ครั้งเดียว
- กระดานบอกให้จัดทีม สวมอุปกรณ์ เตรียมยาก่อนเดินทางรอบถัดไป โดยใช้ทางเข้าค่ายเดิม
- guide ยังคงแสดง **ทีละงาน** ผ่าน `activeGuides(...)[0]`; guide-hire เปิดหลัง MAP 2; flags claimed/skipped และรางวัลเดิมไม่ reset
- Pure mutation guards เดิมยังตรวจทรัพยากร/ข้อเสนอ/limit/target; ไม่เพิ่ม campaign guard ใหม่ให้ทุก pure service จากการคาดเดา policy (ข้อเสนอใน audit ก่อนหน้ายังแยกอยู่)
- ไม่เปลี่ยน save format, battle rules, ตัวเลขต่อสู้/รางวัล/ต้นทุน, ช่องทีม/สำรอง, โอกาสดรอป/กติกา hunt หรือรับตัวละครพักอยู่; ไม่เพิ่มระบบอนาคตและไม่เริ่ม P09

## Regression และหลักฐาน

- `unlocks.test.ts`: milestone ทุก feature, โปรไฟล์ non-veteran, veteran เดิม และแมพจำลองบท 4/5/7/9 เพื่อยืนยันว่าระบบเดิมไม่เลื่อน gate เมื่อเพิ่มแมพ
- `system-unlock-pacing.test.ts`: settle MAP 1 complete เทียบแพ้/ถอนตัว; ความคืบหน้าเควสต์ก่อนเปิดยังอยู่ รับรางวัลจริงได้ครั้งเดียวหลัง reload; MAP 2 จ้างสมาชิกใหม่ ซื้อของและตั้ง hunt จริง; guide-hire ครั้งเดียว; replay/withdraw แมพเก่าไม่ล็อกกลับ; ระบบขั้นสูงยังปิด
- `system-unlock-audit.test.ts` จาก PR #201 ยังครอบคลุม field/reserve/formation/preset หลัง MAP 1
- Browser `system-unlock-pacing.spec.ts`: 390×844, ก่อนเคลียร์ / หลัง MAP 1 / หลัง MAP 2 ไม่มี veteran; กระดานเควสต์รับ/โหลดกลับ, ข้อความล็อก MAP 2, จ้าง/ซื้อ/ตั้ง hunt จริง, boss target ยังไม่เปิดก่อน MAP 3, guide ทีละงาน
- ภาพจริง 390px: `quests-map1-390.png`, `hiring-map2-390.png`, `hunt-map2-390.png`; Chromium emulation ไม่ใช่ Safari หรืออุปกรณ์จริง
- Focused unit: 22 tests ผ่าน (20 existing/regression + 2 integration); browser ใหม่ 3/3 ผ่านและตรวจภาพ 390px ทั้ง 3 ภาพแล้ว; typecheck/lint/build และ coverage:presentation (6 tests) ผ่าน full unit ในเครื่องผ่าน 1,657 tests / 6 skipped (121 files ผ่าน) ผล CI สุดท้ายบันทึกหลังตรวจครบ

- CI browser รอบแรกพบ assertion เดิมใน `world.spec.ts` ยังรอ hiring MAP 3; ปรับให้ตรวจข้อความ MAP 2 ตาม owner decision และรันกรณีเดิมบน production Pages build ผ่าน 1/1 ไม่มีการแก้ runtime เพื่อหลบ test; รวม local browser ที่ตรวจ 4 tests ผ่าน
