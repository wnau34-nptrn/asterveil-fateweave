## 2026-11-05 — Skill rework step 1: Dancer kit + Astrid turn cycle (Claude, PR #181 feature/skill-direct-effects)
- เจ้าของ: นักเต้นมีแต่ลดคูลดาวน์และ "OP" → วิเคราะห์ทุกตัว (artifact "ตรวจสกิล Fateweave" + "คลังกลไกสกิล") แล้วสั่งทำขั้นแรก
- กฎ: cadence โล่ 8 + เร่งคูลดาวน์ใต้เพดาน; duet ตีตาม 40%; จังหวะจากสกิลเพื่อน → closingstep ตีทุกตัว 6+6/จังหวะ; rounddance โล่ 5; deepbeat ลดท่าถัดไป 40%; echofoot +จังหวะ; turncycle ตี 8; ไม่มีการเลือกสกิล/ผู้รับคูลดาวน์อีก; เซฟ v48
- Tests: typecheck/lint/unit 1604, Playwright saint-dance-fx 20/20 + roster-batch1 + world/unit-a7 ที่เกี่ยว, sim 28/28 (Cerise ทุกกิ่งชนะครบ HP ขึ้น) — [README](../validation/skill-rework-2026-11-05/README_TH.md)
- ต่อมา (เจ้าของสั่ง): rounddance โล่ 8 + จังหวะต่อเพื่อน, deepbeat ทั้งทีมลด 40% รอบนี้ + ก้าวสวน (ไม่เสียเปล่า) — ใช้แบบเฉพาะสถานการณ์ใน sim
- เปิด: ขั้นถัดไปตามลำดับในหน้า artifact (Wynne → Garran → Astrid → Toma → ปรับเล็ก) รอเจ้าของสั่ง

## 2026-11-05 — Damage-kind badge on enemy intents (Claude, branch feat/damage-type-badge)
- เจ้าของขอสัญลักษณ์/ป้ายเตือนกายภาพ vs เวท: การ์ดเจตนา (ไอคอนสี+ขอบ+ป้ายคำ) และมุมรูปศัตรูในคิวเทิร์น; ป้ายที่การ์ดฮีโร่ที่ถูกเล็งเจ้าของสั่งตัด; "เวท" แทน "พลังงาน" ในคำแสดงผลของเจตนา; ไม่เปลี่ยนกฎ/เซฟ/ตัวเลข
- Tests: typecheck/lint/unit ผ่าน; Playwright combat/team-five/battle-shots 54 ผ่าน; หลักฐาน [`damage-kind`](../validation/damage-kind/README_TH.md)


## 2026-11-05 — Painted skill tomes in game (Claude, branch art/tome-icons)
- ภาพตำรา 9 แบบจาก ART-UI-PROGRESS-001 (เจ้าของสั่งนำเข้า) → atlas 3×3 lossless 152 KB; ใช้ที่ชิปค่าใช้จ่ายเพิ่ม Lv สกิลและรายการตำราของค่าย; ไม่เปลี่ยนกฎ/เซฟ/ตัวเลข; ของอื่นในแพ็กเกจยังไม่ผูก
- รอบ 2: แก่นรอยแยก (ชิปค่าใช้จ่าย + สรุปเดินทาง) และช่องดาวในหน้าอัปดาว; เศษดาว/เหรียญเกียรติยศ/ไข่-อาหารสัตว์/แถบช่องดาวยังไม่ผูก (ไม่มีฟีเจอร์รองรับ — เหตุผลใน README)
- Tests: typecheck/lint/unit 1604 ผ่าน; Playwright unified-skills/character/skill-audit 22/22; หลักฐาน [`tome-art`](../validation/tome-art/README_TH.md)

## 2026-11-05 — UI frame group 2: team sheet + character window (Claude, branch feat/ui-frame-group2)
- แผ่นทีมและหน้าต่างตัวละคร (5 แท็บ + review) เต็มจอบนจอแนวตั้ง แถบนำทางซ่อน (Q1 = R1 การตัดสินใจของ Claude ตามที่เจ้าของมอบ); หัวเดียวกับแผ่นบริการ (ปิด 333,11), ปุ่มหลัก/รอง token เดียวกัน, ข้อความ ≥12px ในหน้าต่าง (ยกเว้นแถบสลับตัวละคร/ตารางทีมที่ห้ามแตะ)
- padding ใช้ `--star-safe-top/bottom` เดิม + box-shadow เติม navy; เทสต์ที่ยืนยัน "แถบนำทางเห็นได้" ปรับเป็น "แผ่นเต็มกรอบ แถบซ่อน" (portrait-keyboard, world, team-character-navigation)
- Tests: typecheck/lint/unit 1602 ผ่าน; Playwright เฉพาะที่เกี่ยว 149 ผ่าน + 2 ที่พังแก้แล้วผ่าน; audit 390/320 — [`ui-frame-group2`](../validation/ui-frame-group2-2026-11-05/README_TH.md); ยังไม่ทดสอบเครื่องจริง
- เปิด: กลุ่มถัดไป = ไดอะล็อกแผนที่ (หน้าต่างตัวละครบนแผนที่ใช้หัวใหม่แล้ว แต่ layout ยังเป็นของกลุ่มแผนที่) + กรอบสรุป/รางวัล

## 2026-11-05 — UI frame group 1: service-sheet header + buttons (Claude, PR #173 claude/ui-frame-group1)
- ทุกแผ่นบริการค่ายใช้หัวเดียวกัน (ปิด 333,11 ทุกแผ่น/ทุกขนาด, ย้อนกลับซ้าย, หัวเรื่องชิดซ้าย 19px) ปุ่มหลักทอง 1 แบบ ปุ่มรอง 1 แบบ ค่าเป็น token (`tokens.css`, `src/ui/sheet-frame.css` โหลดท้ายสุด)
- Q1–Q3: เจ้าของมอบให้ Claude เลือก → R1 (บันทึกเป็นการตัดสินใจของ Claude); Q2+Q3 ทำในกลุ่มนี้, Q1 (เต็มจอซ่อนแถบนำทาง) ไปกลุ่มหน้าต่างตัวละคร+แผ่นทีม
- กรอบช่างคงเยื้อง 8px (ART-UI-UX-002, เทสต์ safe-area); ลองชิดขอบแล้วเทสต์พัง 16 → ถอย ใช้ padding หัวชดเชย; หัวเรื่อง/ฟอนต์ปุ่มเป็น rem เพราะ `forge-text-large` อาศัยหัวขยายตามตัวอักษร
- Tests: typecheck/lint/unit 1602/build ผ่าน; Playwright หน้าที่เกี่ยว 97/97 + รอบหลัง Q3 54/54; audit ก่อน/หลัง 3 ขนาด — หลักฐาน `docs/validation/ui-frame-group1-2026-11-05/README_TH.md`
- เปิด: กลุ่มถัดไป = หน้าต่างตัวละคร (หัว + Q1 + ตัวอักษร ≥12px) แล้ว ไดอะล็อกแผนที่/สรุป; ปุ่ม "กลับไปป้ายจ้าง" ในเนื้อหายังเป็นปุ่มข้อความ

## 2026-11-05 — ART-UI-LANGUAGE-001 closed; new UI frame scope (Claude)
- Codex PR #171 (2 รอบ): SHA/ขอบเขต/verify ผ่าน แต่ภาพก่อน/หลังพบว่าต้นแบบรื้อเนื้อหาหน้า (ไอคอนสกิลวาด→ไอคอนเส้น, ตารางจัดทีมหาย, การ์ดรางวัล/ชิปสรุปหาย, ชื่อศัตรูถูกตัด) → ปิดไม่ merge (เจ้าของ "ดำเนินการได้")
- ขอบเขตใหม่ที่เจ้าของอนุมัติ: Claude ทำในเกมเองทีละกลุ่ม เฉพาะหัวหน้าต่าง/ปุ่ม/12px ในแผ่นบริการ+ตัวละคร/token ไม่แตะ HUD ต่อสู้-แผนที่; รายละเอียดหัว `docs/handoffs/ART-UI-LANGUAGE-001.md`
- บทเรียน: verify ผ่านไม่ใช่ภาพผ่าน; งาน UI DOM/CSS ให้ Claude ทำ, Codex ทำภาพวาด
- Tests: เอกสารเท่านั้น (`git diff --check`, agent-context)

## 2026-11-05 — UI language audit + Codex brief ART-UI-LANGUAGE-001 (Claude, branch claude/ui-language-audit)
- เจ้าของสั่งให้ภาษาภาพ UI ทั้งเกมเป็นแนวเดียว: Claude ตรวจ 55 ผิวหน้า × 3 ขนาด (390×844/650, 320×568) บนฐาน c5e57ce + PR #166/#167/#168 (merge ในเครื่องเท่านั้น) ไม่แก้ src/
- พบ: หัวหน้าต่าง 9 แบบ ปุ่มปิด 5 ตำแหน่ง/2 รูปทรง ย้อนกลับ 3 แบบ ปุ่มหลัก 13 แบบ ปุ่มรอง 16 แบบ; CSS font-size 638 จุดใช้ token 1, radius 310/21; ข้อความ < 12px ในตัวละคร/HUD แผนที่/ต่อสู้ (7–11px); แผ่นบริการทับแถบนำทางไม่เท่ากัน; กรอบทองเฉพาะช่าง
- หลักฐาน `docs/validation/ui-language-audit-2026-11-05/README_TH.md` (43 ภาพ + sheets + surfaces.json); สคริปต์ `tests/browser/ui-language-audit.spec.ts` (ข้ามใน CI, ตั้ง UI_AUDIT) + `scripts/ui-language-audit.py`
- Brief `docs/handoffs/ART-UI-LANGUAGE-001.md`: สเปก component 8 ชิ้น + ต้นแบบกลุ่ม C–H, เกณฑ์วัดได้ 10 ข้อ, คำถามเจ้าของ Q1–Q4 (Claude แนะนำ R1; เจ้าของยังไม่เลือก) ไม่ต้องมีภาพ/ไอคอนใหม่
- Tests: typecheck, eslint ไฟล์ spec, รัน audit spec 3/3 (Chromium headless เท่านั้น ไม่ใช่เครื่องจริง); git diff --check
- เปิด: Codex เริ่มหลัง #166–#168 merge; หน้า event/draft/แพ้ ยังไม่มีภาพก่อน

## 2026-11-05 — A12 intake: Kael/Wynne/Astrid battle bodies (Claude, branch claude/a12-intake)
- นำเข้า 22 strips จาก PR #157 (21 ที่รับ + astrid-deflect R2) เป็น atlas `kael_a12`/`wynne_a12`/`astrid_a12` (lossless ×.42, ในงบ); registry clips ใน `unit-frames.ts`; `STILL_ONLY` ว่าง; coverage regenerate. ไม่แตะ rules/save/balance.
- Claude ตัดสินรับภาพตาม delegation 2026-11-04 (ไม่ใช่ owner approval); R2 deflect ผ่านตาภาพ review.
- Tests: tsc, `tests/unit-a12.test.ts` (13), presentation-coverage/encounter-budget ผ่าน; 19 คลิป 390px (Chromium emulation) ดู `docs/combat-presentation/unit-a12-slice/README_TH.md`.
- เปิด: circle/toll/dial ยังไม่มีคลิปในเกม; เจ้าของยังไม่ดู motion; PR #157 ไม่ merge (ปิดได้เมื่อแน่ใจ).
