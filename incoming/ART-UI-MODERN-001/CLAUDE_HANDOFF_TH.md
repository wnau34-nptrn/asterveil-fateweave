# ส่งต่อให้ Claude — ART-UI-MODERN-001

วันที่ 22 ตุลาคม 2026 (Asia/Bangkok) เจ้าของขอให้ส่งงานชุดนี้ให้ Claude ตรวจรับและใช้ต่อ

## จุดเริ่มต้น

- Repository: `wnau34-nptrn/asterveil-fateweave`
- Branch งานภาพ: `art/art-ui-modern-001`
- Branch ปลายทาง PR: `feature/fateweave-initial-prototype`
- Commit ชุดภาพ: `4f747c7` — art: add Luminous Veil modern UI reference boards
- โฟลเดอร์: `incoming/ART-UI-MODERN-001/`
- เปิด `README.md` เพื่อดูรายการภาพ และอ่าน `NOTES.md` ก่อนนำเข้า

## สิ่งที่ส่งมอบ

ภาพโทรศัพท์ 10 หน้าจอ ขนาด 780×1688: อุปกรณ์, รายละเอียด/เทียบไอเท็ม, ภาพรวมตัวละคร, ต้นไม้สกิล, ตีเหล็ก, ค่าย, HUD แผนที่, HUD ต่อสู้, สรุปรางวัล และว่าจ้าง

ภาพอุปกรณ์ PC 2732×1536 และ components_sheet 2732×2000 รวม 12 PNG พร้อม HTML/CSS ต้นฉบับ ตัว export และรายงานตรวจสอบ

ใช้ตัวละคร ภาพไอเท็ม ฉากและฟอนต์เดิมของโปรเจกต์โดยตรง ไม่มีการแก้ runtime, public assets, tests หรือ workflow ภาพทั้งหมดเป็น design reference สำหรับสร้าง DOM/CSS ไม่ใช่พื้นหลัง UI ที่จะเอาไปใส่เกมทั้งภาพ

## ผลตรวจและข้อจำกัด

- ตรวจภาพทุกหน้าแล้ว แก้ปุ่มท้ายจอถูกตัดและลำดับซ้อนของ bottom sheet แล้ว
- ตรวจขนาด PNG ตรง 2×, โหลดฟอนต์ไทย/ภาพสำเร็จ, targets อย่างน้อย 44 px, controls อยู่ใน safe bounds และไม่มี overflow ด้วย `verify.cjs`; หลักฐานอยู่ใน `validation.json` และ `verification.json`
- ไม่ได้อ้างผลทดสอบ gameplay หรือเครื่อง iPhone จริงจากงาน mockup นี้
- `docs/MASTER_PLAN_TH.md` ไม่มีใน checkout ตอนสร้างงาน จึงอ้างอิง style guide, tokens, current UI docs และ browser specs ที่ระบุแทน

## ข้อควรรักษาเมื่อนำไปทำจริง

1. คง Luminous Veil, Kanit/Noto Sans Thai และภาพต้นฉบับ รarity ใช้ frame/glow ของโค้ด แยกจากภาพไอเท็ม
2. ค่า stats, ราคา, forge cost, loot, EXP และ power ในภาพเป็นตัวอย่าง ให้ผูกกับ state/helper จริง ห้ามนำตัวอย่างไปเปลี่ยนบาลานซ์
3. หน้าต้นไม้ 3 กิ่ง × 4 ชั้นเป็นตัวอย่างรูปแบบที่โจทย์ขอ ไม่ใช่การอนุมัติกฎ progression ใหม่
4. แถบต่อสู้มี 4 ช่องตาม brief แต่ช่องที่ 4 แสดงว่ายังไม่ติดตั้ง อัศวินยังมีเฉพาะคำสั่งที่ระบบปัจจุบันอนุญาต ภาพ cue ใช้ gear art เดิมชั่วคราว ให้ใช้ semantic SVG ปัจจุบันหรือรับ painted icons จากงาน ART-SKILL-ICON-001 เมื่อตรวจรับแล้ว
5. PC แบบกว้างเป็น reference ตาม brief ปัจจุบัน runtime ยังใช้กรอบ portrait กลางจอ อย่าเปลี่ยน contract นี้โดยถือว่าภาพเป็นการอนุมัติ
6. MAP แสดงสถานะปุ่มพักเพื่อสาธิต component เท่านั้น ให้เปิดใช้จริงเมื่ออยู่บนช่อง camp ที่ใช้งานได้ แผนที่ในภาพเป็น patch ประกอบภาพ ไม่ใช่ level ใหม่
7. รักษา save/resolver, modal/input/rotation guards, reduced motion และข้อมูลการต่อสู้จริง ปุ่มเลือกสกิลไม่ควร commit คำสั่งเอง
8. Wear/Remove ใน mockup เป็น affordances ตัวอย่าง ให้ enable/disable ตามของในกระเป๋าหรือของที่สวมอยู่จริง
9. คงบริการเดิมที่ไม่ปรากฏในภาพ compact เช่น reroll/smelt และ NPC อื่นผ่าน sheet/navigation

## ขั้นตอนสำหรับ Claude

ตรวจภาพและ NOTES เทียบกับงานล่าสุดใน branch พัฒนา ตรวจรับ PR ภาพก่อนนำไปเป็น reference หากเริ่ม rebuild ให้ทำ implementation branch แยก รักษาการเปลี่ยนแปลงล่าสุดของเกม และตรวจภาพเกมจริงบน mobile/PC พร้อม required tests ก่อนสรุปว่าทำเสร็จ งานศิลป์นี้ไม่มีการ merge หรือ deploy โดย Codex

ห้าม reset/stash/discard งานค้างของผู้อื่น ในเครื่องที่ทำภาพมีการแก้ `docs/handoffs/CODEX-TO-CLAUDE.md` และเอกสาร MMO/gacha ที่ไม่เกี่ยวข้องค้างอยู่ จึงไม่ได้รวมไฟล์เหล่านั้นใน commit งานนี้

หากอ่านจากเครื่องเดิม เปิดโฟลเดอร์ `D:\My Drive\AI\Project Game\Asterveil-Fateweave\Asterveil-Fateweave\incoming\ART-UI-MODERN-001\` ได้โดยตรง หากอ่านจาก GitHub ให้ใช้ branch/PR ของงานนี้ อย่าอ้างว่าไฟล์ขึ้น GitHub แล้วจนกว่าการ push สำเร็จ
