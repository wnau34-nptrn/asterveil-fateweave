# เฟส 2 ภาพแผนที่ 4: ศัตรูธรรมดา 4 ตัว (ART-UNIT-ANIMATION-LAKE-001, R1)

สไลม์น้ำ (Water Spit) · ภูตหมอกน้ำ (Mist Needle, ลอยวน 22–24) · ปูเกราะหิน (Pincer) · เงาสะท้อน (Mirror Strike) — เล่นจาก intent จริงใน encounter ทะเลสาบ ใช้ layout ร่วม 22 เฟรม (ภูตหมอก 25) · ไฟล์ Codex ผ่านการตรวจรับแล้ว (SHA-256, decode, anatomy audit)
- คลิป: `<foe>.webp` (ท่าโจมตีใส่อีกิส/เกมจริง) และ `<foe>-enemy-down-normal.webp` (ล้ม), ภาพรวม `lake-foes-attack-390.png` · Chromium emulation 390×844 ไม่ใช่มือถือจริง/iOS Safari
- สร้างใหม่: `python3 -I scripts/build-lake-foes.py <incoming/ART-UNIT-ANIMATION-LAKE-001>` (ตรวจ SHA-256 ของ input, lossless, ตรวจพิกเซลหลังประกอบ) · คลิป: `UNIT_A4_CLIPS=1 npx playwright test tests/browser/unit-a4-clips.spec.ts -g "foe_tide_slime|foe_mist_wisp|foe_stone_crab|foe_mirror_shade"`
- ภาพนิ่ง `units_foes3.webp` ตัดจาก seed ตรงๆ; **พอร์เทรต `portraits_foes3` เป็นการครอปสี่เหลี่ยมจากตัว seed** (Codex ไม่ได้ส่งภาพพอร์เทรต) ถ้าเจ้าของต้องการภาพวาดใบหน้าให้ขอ Codex เป็นงานแยก
- งบ: ปูและเงาสะท้อน 7.0 / 7.6 MiB decoded (เกินแนวทาง 6 MiB ต่อ atlas เหมือน lyra/morvane; รวมต่อ encounter ผ่านเกณฑ์ ≤ 64 MiB ใน `docs/validation/w8-field-audit`)
- รออนุมัติ motion ของเจ้าของด้วยคำพูด (ยังไม่มี)
