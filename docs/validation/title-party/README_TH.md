# หน้ารอเข้าเกม — กลุ่มนักผจญภัย

เจ้าของอนุมัติภาพกลุ่มและสั่งนำเข้าเกม (“เอาเข้าเกม”). ต้นฉบับและภาพสะอาดอยู่ใน `incoming/ART-UI-TITLE-PARTY-001/`; WebP 439,002 bytes. ภาพพื้นหลังไม่มีตัวอักษร/ปุ่มฝัง: ใช้โลโก้ SVG และปุ่มเริ่ม/เล่นต่อ/เซฟจริงเดิม. ภาพนิ่งไม่ซูมตัดตัวละคร; แสงและฝุ่นเดิมยังรองรับ reduced motion.

- `new-game-390.png`: หน้าใหม่ 390×844.
- `continue-390.png`: มีเซฟเดิม 390×844; ปุ่มและข้อความไม่บังใบหน้า.
- Chromium touch emulation เท่านั้น ไม่ใช่ iOS Safari จริง.
- ตรวจด้วย `portrait-keyboard.spec.ts --grep 'one portrait frame fits title'` (5 ขนาด), typecheck/lint/unit/Pages build; ผลสรุปใน handoff.
- Rules/save/balance ไม่เปลี่ยน.
