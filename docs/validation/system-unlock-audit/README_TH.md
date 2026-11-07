# SYSTEM-UNLOCK-AUDIT-001 · 2026-11-07

ฐาน `3d99908` จาก `feature/fateweave-initial-prototype` (fetch ก่อนแก้) ไม่ใช้ main

## หลักฐานและการตัดสินใจ

- คำสั่งเจ้าของในแชตนี้และ [handoff](../../handoffs/SYSTEM-UNLOCK-AUDIT-TH.md): ทีมค่ายใช้ได้หลังจบ MAP 1 และไม่ล็อกกลับเมื่อเล่นแมพเก่าซ้ำ แทนตารางทีม MAP 3 เดิม
- [MASTER_PLAN A3/A4/A9](../../MASTER_PLAN_TH.md): ตารางระบบอื่นและ fallback ไปแมพที่สร้างแล้ว; ไม่ใช่คำสั่งเปิดทุกระบบหลัง MAP 1
- [OWNER_DECISIONS OD-05/OD-11/OD-14](../../design/OWNER_DECISIONS_TH.md), [P02](../p02/README_TH.md), [presets](../team-presets-2026-11-06/README_TH.md): สนาม 5 สำรองตามบท ตัวละครที่พักอยู่ยังพัก ไม่เปลี่ยนจำนวนช่องหรือการได้สมาชิก

## ตาราง audit ระบบที่มีจริง

“หลัง M” หมายถึง `Profile.cleared` มีแมพนั้น ไม่ใช่เข้าแมพหรือชนะศึกย่อย; โปรไฟล์ทดสอบไม่ใช้ veteran
ตารางต่อไปนี้แยก threshold ตามแผนกับ gate ที่ runtime ใช้จริง: ปัจจุบันสร้าง MAP 1–3 เท่านั้น

| ระบบ / ทางเข้า | ปัจจุบันก่อนแก้ | เงื่อนไขที่ควรใช้ในงานนี้ / หลักฐาน | core guard และข้อจำกัดจริง |
|---|---|---|---|
| ทีมค่าย / formation / field / reserve / preset / ตัวละครจากทีม | หลัง M3 | **หลัง M1** ตามเจ้าของ 2026-11-07 | `placeMember`, `setPartyLane`, `presets`: สมาชิกที่ถือครอง, อย่างน้อยสนาม 1, ความจุสำรอง, lane; เรียกได้จริงหลังเปิด |
| ทีมกระเป๋าแมพ / HUD / keyboard B | ไม่ใช้ gate ทีมค่าย | คงเดิม ตาม P02/preset: จัดคนที่พามาเท่านั้น | `swapMembers`, `setLane`, `moveMember`, `applyRunPreset` ปฏิเสธระหว่างศึก; ไม่เปิดรับคนจากค่ายกลางแมพ |
| สวมอุปกรณ์บนแมพ / character sheet | หลังศึกแรกตาม flow เดิม | คงเดิม A3: ศึกแรก ไม่รอทีมค่าย | `wear`, `takeOff`, auto-equipment ตรวจเจ้าของ/slot/weapon และ battle; ไม่เพิ่ม campaign gate |
| อุปกรณ์/คลังค่าย / character gear | หลัง M1 | คง M1 ตาม A3 | equip/unequip/auto-equipment/storage ตรวจ item, UID, ความจุ, ล็อกไอเทม; คลังสมาชิก archive เป็นตัวกรอง ไม่ใช่การเสียสมาชิก |
| ต้นไม้ / loadout / reset ค่าย; character skill บนแมพ | ค่ายหลัง M1; แมพตามสมาชิก/แต้ม | คงเดิม A3/A6, OD-02 และ P01 | talents ตรวจแต้ม camp level/โหนดก่อนหน้า/ตัวเลือก; reset ฟรีเฉพาะค่าย; run loadout/talent มี battle guard |
| เลเวลสกิล / แลกตำรา | หลัง M2 | คง M2 ตาม A3 และ SKILL_TOMES_TH | `raiseSkill`/`tradeTomes` เรียก featureOpen และตรวจตำรา/ทอง/เพดาน/สกิลที่ปลด |
| forge ตีบวก/ล็อก/reroll | หลัง M1 | คง M1 ตาม A3 | forge ตรวจทรัพยากร/ไอเทม/เพดาน/ค่าที่ล็อก; UI ForgeWorkbench รับ feature predicate |
| forge เพิ่ม Lv | หลัง M2 | คง M2 ตาม A3 | raiseItemLevel ตรวจเพดาน forgeLevel ที่ได้จาก elite/clear และต้นทุน |
| fuse / craft | threshold 5 → หลัง M3 (fallback) | คง fallback ตาม A3 implementation note; ห้ามเปิดระบบบทอนาคตเพิ่ม | donor/lock/ทรัพยากร/ระดับ/เจ้าของอาวุธ |
| transfer | threshold 7 → หลัง M3 | คง fallback ตาม A3 | transferAffix ตรวจ donor/slot/lock/ต้นทุน |
| brew | หลัง M1 | คง M1 ตาม A3 | brewReason ตรวจต้นทุนและเพดานยา; ไม่เปลี่ยนจำนวนพก |
| quests / NPC board | หลัง M2 | คง M2 ตาม A3 | claimReason ตรวจ progress และรับได้ครั้งเดียว; settle เพิ่ม progress ตาม outcome |
| guides | ตาม feature แต่ละงาน; reserve หลัง M3 | reserve ย้ายเป็น M1 โดยอ่านตารางเดียวกัน ตามคำสั่งทีม + A4 | activeGuides/claimGuide ตรวจเปิด/ทำเสร็จ/claimed/skipped/caps; ไม่ reset flags หรือให้ซ้ำ |
| hiring / refresh / star development | หลัง M3 ผ่านเมนูจ้าง; character develop มีเส้นทางของตัวเอง | คง gate จ้าง M3; OD-14 ไม่เปิด parked characters | hireReason ตรวจ offer/ทอง/owned; upgrade ตรวจ duplicate/ore/max; ไม่เปลี่ยน acquisition |
| market | threshold M3; อยู่ใน hire sheet M3 | คง M3 ตาม A3 | buyReason ตรวจราคา/limit/เพดาน; refresh จำกัดต่อ return |
| hunt | threshold 5 → หลัง M3 | คง fallback A3 | chooseHuntTarget ตรวจรูป target; startHunt เริ่มเมื่อออกเดินทาง |
| boss charm | threshold 9 → หลัง M3 | คง fallback A3; ต้องมี map.bossCharm จริงด้วย | chooseBossTarget ตรวจ boss/set; ไม่สร้างบอสหรือบทใหม่ |
| hard mode | หลัง M3 + เคลียร์ normal ของแมพนั้น | คงเดิม A9 | hardReason และ depart ตรวจทั้ง system และ cleared ของแมพเป้าหมาย |

## ขอบเขตและข้อเสนอที่ยังไม่ใช่กฎใหม่

`featureMap` อ่านตารางกลางจาก maps[0] แล้วเลือกบทที่สร้างล่าสุดไม่เกิน threshold; `featureOpen` ใช้ประวัติเคลียร์และสิทธิ์ veteran เดิม ไม่ใช้ selected map จึงไม่แก้สองฟังก์ชันนี้ ไม่เปลี่ยน fallback 5/7/9 เป็นระบบอนาคตหรือเปิดระบบใหม่

Campaign gates ส่วนใหญ่เป็น availability ของเมนู ไม่ได้ซ้ำอยู่ใน pure mutation ทุกฟังก์ชัน (เช่น placeMember, hire, brew, forge, storage); tomes/hard/guides มี campaign guard โดยตรง ส่วน core ทีมตรวจความถูกต้องของ roster/lane/preset และ core แมพตรวจระหว่างศึกอยู่แล้ว การเพิ่ม campaign guard ให้ทุก mutation จะกระทบ API/เส้นทาง character และการจัดทีมระหว่างแมพก่อนจบ M1 จึงแยกเป็น **ข้อเสนอให้กำหนด policy ของแต่ละ service ก่อน** ไม่ใส่ข้อห้ามใหม่จากการคาดเดา งานนี้ตรวจว่าหลัง M1 core ไม่ปฏิเสธการจัดทีมจริงและไม่ถอดข้อจำกัดเดิม

ข้อความล็อกค่ายอ่าน `featureMap` โดยตรง จึงเปลี่ยนเป็น “ผ่านแผนที่ 1 · ซากชายแดน” อัตโนมัติ; guide reserve อ่าน `featureOpen` เดียวกัน ไม่มีข้อความ MAP 3 ของทีมฝังแยก
ตาราง A3 ดั้งเดิมมีทีม 4+4 และรายการอนาคต เป็นประวัติแผน ไม่ใช่จำนวนช่องปัจจุบัน; ใช้คำสั่งใหม่และ OD/P02 แทน

## การตรวจ

- Regression `system-unlock-audit.test.ts`: ก่อนเคลียร์, settle complete เทียบ withdrawn/wiped, เข้า M2 ยังไม่จบ, replay M1, serialize/parse เซฟเดิมไม่มี veteran, field/reserve/lane/preset จริง, guide รับครั้งเดียวและรักษา skipped flags
- `unlocks.test.ts`, `guides.test.ts`, `team-presets.test.ts`: 15 tests ผ่านในการรัน focused
- Browser Chromium 390×844: non-veteran ก่อน/หลัง M1, ข้อความล็อก, กด preset/ย้ายสำรอง/คืนทีมและ reload; รูป `team-locked-390.png`, `team-open-390.png`
- ไม่แก้ battle/save format/รางวัล/จำนวนช่อง/ภาพ/animation; ไม่เริ่ม P09

## ผลตรวจสุดท้ายและส่งมอบ

- PR [#201](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/201) merge `2d7f35d1dd5cddcde89f63e227c7a9fce9fb6257` เข้าสาขาเกม หลัง quality และ browser (4 shards + aggregate) ผ่านครบ
- `npm run typecheck`, `npm run lint`, `npm run build`: ผ่าน
- Focused unit 15 tests ผ่าน; เพิ่มตาราง regression ทุก feature ภายหลังและรัน `unlocks.test.ts` ผ่าน 3 tests
- Full unit ในเครื่อง: 119 files/1,653 tests ผ่าน, 6 skipped; boss-balance เพียงตัวเดียว timeout 180s ขณะรันพร้อม browser รันซ้ำแยก **ผ่านใน 149s** โดยไม่เปลี่ยนโค้ดหรือ timeout; CI quality ผ่านทั้งชุด
- Browser ที่เกี่ยวข้องในเครื่อง: **19/19 ผ่าน** (`system-unlock-audit`, `team-presets`, `team-five`, `team-character-navigation`); ตรวจภาพจริง 390px ทั้งสองภาพแล้ว ไม่มีการทดสอบอุปกรณ์จริงหรือ Safari
- การทดสอบ milestone เรียก core `settle` โดยตรงเพื่อแยก complete/withdrawn/wiped; browser โหลด fixture เซฟ non-veteran ก่อน/หลัง M1 และกด UI จริง ไม่ได้อ้างว่าเล่นแคมเปญใหม่ทั้งหมดด้วยมือ
- ต้นไม้ยังใช้แต้มตาม implementation ปัจจุบัน (camp Lv + โบนัสดาวของ big tree จน P04 ตาม `talents.ts` และ validation P01); ไม่ย้าย OD-02 milestone points เข้ามาก่อน P04 จากงาน audit นี้
- ไม่มีการแก้ save format, battle rules, ตัวเลขรางวัล/ต่อสู้, จำนวนช่อง หรือเงื่อนไขระหว่างศึก; ไม่เริ่ม P09 ไม่เพิ่มภาพ/animation
