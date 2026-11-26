# ภาพตัวเต็มทุกแท็บ + สีประจำคลาส (2026-11-26)

เจ้าของตอบคำถาม §9 ของ [docs/UX_GAMEFEEL_AUDIT.md](../../UX_GAMEFEEL_AUDIT.md): “ภาพตัวละครใช้แบบตัวเต็มทุกแท็บ ใช้สีประจำคลาส”

## ทำอะไร

- `src/ui/portraits.ts`: `heroStage(id)` ภาพตัวเต็มบนแท่นแสง; `classTone()` สีประจำคลาส = สีต่อสู้ (`HeroDefinition.color`) ของตัวละครหลักของคลาสนั้น ตัวที่พักไว้ (OD-14: thiran/wila) ใช้สีของตัวหลักในคลาสเดียวกัน
- `character-view.ts`: แท็บภาพรวมเปลี่ยนจากภาพวงกลมเป็นภาพตัวเต็ม (ป้าย Lv/ดาวอยู่ใต้ภาพ)
- `character-panel.ts`: แท็บสกิล ผังสกิล พัฒนา แสดงภาพตัวเต็มขนาดเดียวกับภาพรวม (สูง 140–190px ตามจอ); แท็บอุปกรณ์ใช้ภาพตัวเต็มกลาง paper doll เดิม; ตั้ง `--class-tone` บน dialog
- `components.css`: แสงหลังตัวละคร เงาพื้น ขอบป้าย Lv ขอบล่างหัว dialog และแสงกลาง paper doll ใช้ `--class-tone`; ลบสไตล์ `.hero-ring` ที่ไม่ใช้แล้ว
- อนิเมชันเปลี่ยนตัว (S2) ขยายเข้าเฉพาะภาพตัวละคร

## ตรวจแล้ว

- typecheck, lint ผ่าน · `tests/class-tone.test.ts` 2 เคสผ่าน
- Playwright ใหม่ `tests/browser/ux-hero-stage.spec.ts` (390×844, 320×640): ทุกแท็บมีภาพตัวเต็ม ≥120px อยู่ในจอ, สี Knight/Archer ถูก, ไม่มี scroll แนวนอน
- ชุดเดิมผ่าน: character, star-upgrade, team-character-navigation, map-team-tabs, unified-skills, ux-audit-s2-s4 (รวม 51 เคส)
- ภาพ: `before-390.jpg` / `after-390.jpg` (ภาพรวม · สกิล · พัฒนา), `class-tones-390.jpg` (นักเล่นแร่ · นักธนู · จอมเวท)
- ยังไม่ได้ทดสอบ iOS Safari / Android จริง
