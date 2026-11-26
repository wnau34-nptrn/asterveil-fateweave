# P1-5 หน้าเลือกงานช่าง (2026-11-26)

แผน: [docs/UX_GAMEFEEL_AUDIT.md](../../UX_GAMEFEEL_AUDIT.md) P1-5 · เจ้าของสั่ง “merge แล้วทำ P1-5 หน้าเลือกงานช่างต่อได้เลย”
ขอบเขต: presentation เท่านั้น ไม่แตะ rules, save, ราคา หรือ balance

## ทำอะไร

- `src/ui/forge-task-status.ts` `forgeTaskStatus()`: ป้ายสถานะต่อการ์ด อ่านจากฟังก์ชันตรวจของช่างเดิม (`enhanceReason`, `itemLevelCost`/`itemLevelCap`, `fuseReason`, `rerollReason`, `smeltReason`/`smeltLeft`) ไม่คำนวณราคาซ้ำ ไม่แก้ profile
  - ทำได้ N ชิ้น (เขียว) · ขาดอะไร เช่น แร่หรือฝุ่นไม่พอ / ขั้น + เต็มทุกชิ้น / ครบโควตารอบนี้ (ส้ม) · ยังไม่มีอุปกรณ์ · จำนวนชิ้น (ถ่ายโอน, รีไซเคิล)
  - สร้างอาวุธไม่มีป้าย เพราะราคาขึ้นกับอาชีพและ Lv ที่เลือกในหน้าถัดไป
- `forge-workbench.ts` ใส่ป้ายบนการ์ด; การ์ดที่ยังไม่ปลดล็อกใช้ป้ายเดียวกัน
- `forge-enhancement.css`: ตีบวกและเพิ่มเลเวลเป็นการ์ดเต็มความกว้างสองใบแรก ไอคอนใหญ่ขึ้น
- แก้ข้อมูลใน audit: การ์ดมีไอคอนอยู่แล้วตั้งแต่ก่อนหน้านี้

## ตรวจแล้ว

- typecheck, lint ผ่าน · `tests/forge-task-status.test.ts` 4 เคสผ่าน (เทียบกับ rule เดิม, ไม่แก้ profile)
- Playwright ใหม่ `tests/browser/ux-forge-launcher.spec.ts` (360×640 มีวัสดุ, 390×844 ไม่มีวัสดุ): ป้ายถูกต้อง, การ์ดหลักสองใบเต็มความกว้างและอยู่ในจอแรก, กดการ์ดแล้วเปิดงานได้
- ชุดเดิม forge-* ทั้งหมด, weapon-crafting, affix-transfer: 49 ผ่าน 2 ข้าม
- ภาพ `forge-launcher-before-after-390.jpg`: ก่อน · หลัง (ไม่มีวัสดุ) · หลัง (มีวัสดุ)
- ยังไม่ได้ทดสอบ iOS Safari / Android จริง
