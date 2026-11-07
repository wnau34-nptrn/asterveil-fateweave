# SYSTEM-UNLOCK-AUDIT-001 — ตรวจเงื่อนไขเปิดระบบให้ตรงกับเกมปัจจุบัน

วันที่ 2026-11-07 (Asia/Bangkok) · เจ้าของขอเตรียมงานสำหรับแชตใหม่

## คำสั่งเจ้าของและเงื่อนไขที่ยืนยันแล้ว

> ช่วย handoff เปิด chat ใหม่เพื่อตรวจสอบที่เกมเปิดฟังก์ชั่นการใช้งานระบบต่างๆ ให้เข้ากับเกมในปัจจุบัน เช่นทีมใน camp โดนล็อคตั้งแต่ MAP 1 ทั้งๆ ที่จริงแล้วควรจะเปิดให้ใช้งานได้ตั้งแต่จบ MAP แรกแล้ว

- ลำดับแรก: **หน้าทีมใน camp ต้องใช้งานได้ทันทีหลังจบ MAP 1** ไม่รอจบ MAP 3 ไม่ผูกกับแผนที่ที่กำลังเลือก และเมื่อกลับไปเล่น MAP 1 ซ้ำต้องไม่ล็อกกลับ
- คำสั่งนี้เป็นข้อกำหนดล่าสุดสำหรับ gate ทีม แทนตารางเก่าที่ตั้งทีมไว้หลัง MAP 3
- ระบบอื่นให้ตรวจทีละรายการจากเกมที่มีจริงและ owner decisions ล่าสุด ไม่อนุมานว่าต้องเปิดทุกระบบหลัง MAP 1
- แชตที่จัด handoff นี้ยังไม่ได้แก้ runtime หรือเงื่อนไขปลดล็อก

## ฐานงานและข้อเท็จจริงที่ตรวจแล้ว

- Repository `wnau34-nptrn/asterveil-fateweave`; base `feature/fateweave-initial-prototype` ไม่ใช่ main ต้อง fetch ล่าสุดก่อนเริ่มและรักษางานผู้อื่น
- ฐานที่ตรวจ: `c2013ba`; PR #200 merge แล้วที่ `ff9274e` หลัง quality + browser ผ่าน เจ้าของสั่งให้หยุดงานแอนิเมชันเพิ่มเติมไว้ ไม่เริ่มงานภาพ/ท่าใหม่จากงานนี้
- `src/content/world/rules.ts:39` ยังตั้ง `unlocks.team = 3` ร่วมกับ hire/market ที่ 3; tree/forge/brew/gear = 1, level/quests/tomes = 2, fuse/craft/hunt = 5, transfer = 7, bossCharm = 9, hard = 3
- `src/core/world/profile.ts:412` (`featureMap`) อ่าน threshold แล้วเลือก map ที่สร้างแล้วล่าสุดซึ่ง chapter ไม่เกิน threshold; ฟังก์ชันนี้มี fallback ของบทอนาคตตามแบบเดิม ต้องตรวจเจตนาก่อนเปลี่ยน
- `profile.ts:416` (`featureOpen`) เปิดเมื่อ `profile.cleared` มี map ที่กำหนด หรือ `profile.veteran` เป็นจริง จึงต้องตรวจด้วย **โปรไฟล์ใหม่ที่ veteran ไม่เป็น true** มิฉะนั้นอาจมองไม่เห็นปัญหา
- `src/ui/lobby-ui.ts:601–610` เชื่อม sheet `team` → feature `team` และแสดงข้อความจาก `featureMap`; จึงมีหลักฐานว่าตาราง gate ยังเป็น 3 ต้อง reproduce เส้นทาง UI จริงอีกครั้งก่อนแก้
- บางเอกสารเก่ายังอ้าง progression ก่อน P01/P02/P03/ทีม preset อย่าถือว่าตารางเก่าถูกต้องเพียงเพราะมีเทสต์รองรับ

## งานในแชตใหม่

1. อ่าน `AGENTS.md`, `CLAUDE.md`, `CURRENT_STATE.md`, เอกสารนี้ และ skill ที่ตรงกับการแก้ world/progression หรือ UI/browser ใน `.claude/skills/` ตามงานที่แตะ
2. Reproduce ทีมใน camp ด้วยโปรไฟล์ใหม่: ก่อนจบ MAP 1 → ชนะ/รับผลและกลับค่าย → เปิดทีม ตรวจว่าจุดใดบันทึก `cleared` จริง แยกการเคลียร์สำเร็จออกจากการเข้าแมพ/ถอนตัว/แพ้
3. ทำตาราง audit: ระบบ → เงื่อนไขปัจจุบัน → เงื่อนไขที่ควรเป็นพร้อมหลักฐาน/คำสั่งเจ้าของ → ทางเข้า UI/keyboard/map bag → core guard → ข้อความล็อก/guide → ผลก่อนและหลัง milestone
4. ครอบคลุมระบบที่เปิดใช้จริง: ทีม/formation/presets/ตัวสำรอง, อุปกรณ์/คลัง, ต้นไม้และเลเวลสกิล/ตำรา, forge/เพิ่ม Lv/fuse/craft/transfer, brew, quests/guides, hiring/market, hunt/boss charm, hard mode รวมทางลัดที่ข้ามเมนูได้ ตรวจระบบนอก `LobbyFeature` ด้วยถ้ามี gating แยก
5. แก้ข้อผิดพลาดที่ยืนยันได้ให้ UI, core world guard, ข้อความ และ guide เปิดตรงกัน เริ่มจากทีมหลัง MAP 1 ซึ่งเจ้าของตัดสินแล้ว ไม่แก้แค่ข้อความให้เหมือนเปิดแต่การใช้งานจริงยังถูกปฏิเสธ
6. ทดสอบแล้วเปิด PR ให้ quality + browser ผ่าน อ้างอิง standing authorization สำหรับการทำงานที่จำเป็น บันทึกผลและหลักฐาน 390px 1–2 ภาพต่อหน้าจอ

## กรณีตรวจที่ต้องมี

- โปรไฟล์ใหม่ก่อนเคลียร์ MAP 1; จบ MAP 1 แล้วกลับค่าย; เข้า MAP 2 โดยยังไม่จบ; เลือก MAP 1 เล่นซ้ำ; reload แล้วทีมยังเปิด
- เปิดหน้าทีมและใช้งาน field/reserve/formation/preset ได้จริงตามทรัพยากรที่มี ไม่ใช่เพียงเอารูปกุญแจออก
- แพ้/ถอนตัวก่อนเคลียร์ไม่ถูกนับเป็นการจบ MAP 1 โดยผิดพลาด
- เซฟเดิมที่เคลียร์ MAP 1 แล้วแต่ไม่เคลียร์ MAP 3 เปิดทีมได้หลังโหลด โดยไม่ล้างเซฟหรือปลอม `veteran`
- เซฟ legacy ที่มี veteran และผู้เล่นที่ไปไกลแล้วไม่สูญเสียสิทธิ์เดิม; guides ไม่ถูกข้าม/รับรางวัลซ้ำเพราะเปลี่ยน gate
- ทางเข้า camp, map bag, character/team shortcut และข้อความแจ้งล็อกใช้เงื่อนไขสอดคล้องกัน โดยคงข้อห้ามการจัดทีมระหว่างศึก/เงื่อนไขสถานที่ที่ยังตั้งใจไว้

## จุดเริ่มอ่านและเทสต์

- `src/core/world/{profile,types,formation,team-presets}.ts` (ตรวจชื่อไฟล์จริงก่อนอ่าน), `src/content/world/rules.ts`, map catalog และ flow ที่บันทึกผลจบ expedition
- `src/ui/{lobby-ui,world-ui}.ts` และจุดเปิด character/team จาก HUD
- `tests/unlocks.test.ts` ปัจจุบันมี assertion ให้ team รอ MAP 3 ต้องปรับตามคำสั่งใหม่และเพิ่ม regression ที่ทดสอบผลจริง
- `tests/{guides,team-presets,team-five}.test.ts` และ `tests/browser/{team-presets,team-five,team-character-navigation}.spec.ts`
- `docs/MASTER_PLAN_TH.md` A3 เป็นหลักฐานตารางเดิม; เทียบ `docs/design/OWNER_DECISIONS_TH.md`, P01/P02/P03 และ `docs/validation/team-presets-2026-11-06/README_TH.md` กับโค้ดปัจจุบัน

## ขอบเขตที่ต้องรักษา

- แก้ availability/progression gate ที่อยู่ในขอบเขตนี้ได้ตามคำสั่งเจ้าของ ไม่เอาข้อจำกัด “VFX-only” ของงานก่อนมาใช้ขวางงานใหม่
- ไม่เปลี่ยนกติกาศึก ตัวเลขต่อสู้/รางวัล จำนวนช่องทีม/สำรอง เงื่อนไขพัก/เหนื่อย ระบบรับตัวละคร หรือเปิดตัวละครที่พักอยู่ เพียงเพราะกำลังแก้ gate เมนู
- ไม่เปิดระบบอนาคตที่ยังไม่มี implementation และไม่เริ่ม P09/งานภาพใหม่
- ไม่ reset เซฟผู้ใช้หรือเปิดทุกอย่างด้วย veteran; ถ้าจำเป็นต้องแตะ battle/save-format ให้ปฏิบัติตาม AGENTS.md และทำงานส่วนตรวจ/แก้อื่นที่ไม่ติดขัดต่อ
- เงื่อนไขระบบอื่นที่ไม่มีหลักฐานชัด: แยกเป็นข้อเสนอพร้อมผลกระทบและถามเฉพาะประเด็นที่ต้องตัดสิน ไม่เดาเป็นกฎใหม่เงียบๆ

## ข้อความเปิดแชตใหม่

ทำงาน SYSTEM-UNLOCK-AUDIT-001 ใน wnau34-nptrn/asterveil-fateweave จาก feature/fateweave-initial-prototype ตาม docs/handoffs/SYSTEM-UNLOCK-AUDIT-TH.md อ่าน AGENTS.md, CLAUDE.md และ CURRENT_STATE.md ก่อน ตรวจและแก้เงื่อนไขเปิดระบบให้ตรงกับเกมปัจจุบัน เริ่มจากทีมใน camp ที่เจ้าของยืนยันว่าต้องใช้ได้หลังจบ MAP 1 ตรวจโปรไฟล์ใหม่/เซฟเดิม/reload/เล่นแมพเก่าซ้ำ รวม UI, core guard, ข้อความล็อกและ guides แล้ว audit ระบบอื่นทีละตัวโดยอิงหลักฐาน ไม่เปิดทุกอย่างหลัง MAP 1 ไม่เพิ่มงานภาพหรือระบบอนาคต เปิด PR ให้ผ่าน quality + browser และส่งหลักฐาน 390px
