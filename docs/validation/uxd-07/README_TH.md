# UXD-07 — หลักฐานและการตรวจ

สถานะ: implementation และ local focused QA กำลังตรวจ ยังไม่ merge/เผยแพร่

ฐาน `ab06dfd6cdd70b41bd6be721a85bf59e65289a7f` บน feature/fateweave-initial-prototype; สาขา codex/uxd-07-unified-skills จากฐานนี้หลังยืนยัน remote/ancestry ไม่รวมสาขา audit หรือ Artwork

รายละเอียด: [implementation](../../handoffs/UXD-07-IMPLEMENTATION-TH.md) · [แผน Artwork ที่อ่านแยก](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/art/art-ui-ux-002/incoming/ART-UI-UX-002/IMPLEMENTATION_PLAN_TH.md) · [audit ก่อนเริ่ม](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/codex/ux-ui-audit-2026-11-04/docs/validation/ux-ui-audit-2026-11-04/REPORT_TH.md)

## พฤติกรรมที่ต้องยืนยัน

- ตัวละครเหลือ 4 แท็บหลัก ผังอยู่ใต้สกิล NPC/ทีม/กระเป๋า/พัฒนายังเปิดตรงบริบทเดิม
- เลือกสกิล/ส่วน/โหนดไม่จ่ายหรือเปลี่ยน loadout เอง ลงแต้มและติดตั้งเป็นคำสั่งชัดเจนตามกฎเดิม อย่างน้อย1และเพดานconfig
- เพิ่ม Lv/แลกตำรา preview/cancel readonly; reviewก่อนจ่าย; Profile identity/fingerprint/eligibility ซ้ำ; consumeก่อนdispatch; double click/held Enterไม่จ่ายซ้ำ
- Receipt จาก matching event/Profile หลัง persist แสดงยอดจริง ไม่อ้างบันทึกสำเร็จเมื่อ storage ล้ม และกลับไปดูไม่ส่งคำสั่ง
- เซฟเดิม/grants/skill levels/บาดแผล/ของ/ทีม/HP/steps/RNG คงตามกฎเดิม รีเซ็ตฟรีเตือนคืนชุดก่อนทำ
- ตรวจภาพจริง390×650/844 พร้อม320×568/desktop/ตัวอักษร200%/safe areaจำลอง; focus/Escape/orientation/inert

## ผลที่มีแล้ว

- Typecheck และ Pages build ผ่าน; lint ผ่านหลังแก้ตัวแปรใน test
- Focused unit 95 กรณี / 6 files ผ่านก่อนเพิ่มกรณี Lv5/core อีก1กรณี จะอัปเดตตัวเลขหลัง final run
- Browserรอบแรก transactions 4ขนาดและแลกตำรา ผ่าน5กรณี อีก2กรณีเป็น fixture/test expectation ที่แก้ให้ตรง schema/default loadout เดิม ไม่แก้กฎเกม
- Browser regression และ final screenshots กำลังตรวจ จะอัปเดตผลจริงก่อน merge

## ข้อจำกัด

Chromium emulation เท่านั้น ยังไม่มี Safari/iPhone/Android เครื่องจริงหรือผู้เล่นจริง ไม่อ้างผล usability จากตัวเลขผ่าน automation ไม่มีการเปลี่ยน core/content/save schema/ราคา/RNG/battle rules ไม่เริ่ม UXD-08/P04/P09
