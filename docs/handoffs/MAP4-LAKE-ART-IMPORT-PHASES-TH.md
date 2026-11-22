# แผนนำเข้าภาพแผนที่ 4 เป็นเฟส (2026-11-22)

ผลตรวจรับ: Codex PR #338 (world), #340 (foes), #339 (boss+VFX) ผ่านแล้ว ดู handoff บนสุด · ไม่ merge PR ของ Codex ให้ดึงไฟล์ด้วย `git archive origin/art/<branch> incoming/<ID>`
แต่ละเฟส = 1 แชท 1 branch (แตกจาก `claude/map4-lake-ui` หรือ `feature/fateweave-initial-prototype` ถ้า #336/#337 merge แล้ว) · จบเฟสต้อง: typecheck, lint, test, build, `npm run coverage:presentation` ผ่าน · เกมใช้ได้เสมอ (เฟสที่ยังไม่ทำ = ภาพชั่วคราวเดิม) · งานภาพ merge ได้เมื่อเจ้าของอนุมัติด้วยคำพูดเท่านั้น

## เฟส 1 — ภาพแผนที่ (ART-WORLD-LAKE-001) · Sonnet · ✅ นำเข้าแล้ว รออนุมัติภาพ · เล็กสุด เห็นผลชัดสุด
- pack `tiles_lake`/`decor_lake` เข้า `public/assets/world` (lossless) · `world-art.ts`: แทน `floorZone` ของ shore/isle/pavilion/sanctum + น้ำลง/ขึ้น/ลึก/causeway (สลับตามสถานะน้ำจริง) · ลบ CSS น้ำชั่วคราวใน `world.css` ที่ซ้ำ
- decor_lake ผูกกับ prop จริงของ `chapter-lake.ts` (โคมดับ/ติด ตามสถานะ) · ไม่วางบนช่องเส้นทาง/ปริศนา
- ฉากรบ `bg_lake.webp` ใช้กับ encounter ของแผนที่ 4
- ส่งเจ้าของ: ภาพ 390px น้ำลง + น้ำขึ้น + ฉากรบ (เจ้าของอนุมัติภาพ)
- เปิดแชทด้วย: "ทำเฟส 1 ตาม docs/handoffs/MAP4-LAKE-ART-IMPORT-PHASES-TH.md"

## เฟส 2 — ศัตรูธรรมดา 3 ตัว + เงาสะท้อน (ART-UNIT-ANIMATION-LAKE-001 ส่วน 1) · Sonnet
- tide-slime, mist-wisp, stone-crab, mirror-shade: build_assets.py (สเกลต่อ strip, sole 497), pack atlas, `unit-atlases.json`, `unit-frames.ts`, `unit-animation-map.ts`, เปลี่ยน `art` ใน `species.ts` และถอดออกจาก `LAKE_STANDINS` เฉพาะที่เสร็จ
- เทสต์แบบ `tests/unit-a4.test.ts` · คลิป 390px (Pillow → animated WebP)

## เฟส 3 — อีลิท 2 ตัว (อสรพิษเงา, นางเงือกร้องไห้) · Sonnet
- เจ้าของเลือก R1 ทั้งคู่แล้ว (2026-11-22: "เฟส 3 เลือก R1 ตามที่แนะนำ") · ขั้นตอนเหมือนเฟส 2 · ตรวจงบ encounter ที่มีอีลิทใหญ่ · คลิป 390px

## เฟส 4 — บอสภูตธารา + VFX · Opus หรือ Sonnet (เลือกสำคัญที่สุด)
- strip 6 ท่า + hit/down (cell 1024, sole 0.875), `boss-signature-fx` แทน `paintedAs`, VFX 4 ชุด (Water Veil/Surging Wave/Great Wave/Reflection) ผูกกับ event จริง ไม่บังตัวเลขดาเมจ, ม่านน้ำต้องต่างจากโล่ฮีโร่
- เมื่อเสร็จ: ว่าง `LAKE_STANDINS` แล้วรัน `coverage:presentation`, `tests/encounter-budget.test.ts` · คลิป 390px ให้เจ้าของอนุมัติ motion

## ทุกเฟส
บันทึก handoff ≤12 บรรทัด + อัปเดต CURRENT_STATE · ตัวเลขเกม/กฎ/เซฟห้ามเปลี่ยน · ถ้า usage ใกล้หมดกลางเฟส ให้ commit ที่ทำเสร็จและเขียนจุดที่ค้างไว้ใน handoff ก่อนหยุด
