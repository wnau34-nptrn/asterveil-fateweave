# ART-UI-UX-002 — Task-focused development screens

ข้อเสนอ UX/UI สำหรับ Asterveil: Fateweave จากการตรวจสาขาเกมและ artwork เดิม ไม่ใช่ runtime implementation

แผนพัฒนาเดิมอยู่ [IMPLEMENTATION_PLAN_TH.md](IMPLEMENTATION_PLAN_TH.md): ลำดับ UXD-00–08, งานที่ยังขาด, จุดแก้โค้ด, dependency P04/P09, เกณฑ์ทดสอบและการส่งมอบ โค้ดนำร่อง UXD-00/01 อยู่แยกใน [PR #135](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/135); นำเข้าและเผยแพร่แล้ว ส่วนขั้นถัดไปยังเป็นแผน

ขั้นแรกของแผนปรับภาพให้ใกล้ Artwork เสร็จแล้ว: [VISUAL_AUDIT_01_TH.md](VISUAL_AUDIT_01_TH.md) — หลักฐานหน้าตีบวกจริง 390×844/390×650, ความต่าง 12 ข้อเรียงลำดับ และ brief สำหรับทำ layout ต่อ ไม่มีการแก้เกมในรอบตรวจภาพนี้

ขั้นที่ 2 เสร็จแล้ว: [LAYOUT_02_TH.md](LAYOUT_02_TH.md) และ [บอร์ด Layout](layout-02/index.html) — 390×844/390×650, ห้าสถานะหลัก พร้อม variant ชื่อยาว/ไม่มีผู้สวม/ค่าเปลี่ยน/safe-area รวม14กรอบ เป็นแบบแยกจากเกม ยังไม่ทำวัสดุขั้นสุดท้ายหรือ transaction prototype

- `01_development_concepts.png`: หน้าตีบวก, รวมงานสกิล, ทางเข้าพัฒนาตัวละคร
- `02_forge_task_and_review.png`: หน้าเลือกงานโรงตีเหล็ก และการตรวจรายการหลอมสี
- `03_character_star_upgrade.png`: หน้าอัปดาว ผล/ต้นทุน ตรวจรายการ และตัวซ้ำไม่พอ
- `04_equipment_level_fusion_reroll.png`: เพิ่ม Lv เลือกวัตถุดิบเลื่อนสี และสุ่มคุณสมบัติ
- `05_equipment_affix_transfer.png`: เลือกช่อง/ต้นทางถ่ายโอน และตรวจรายการก่อนใช้ต้นทางหมด
- `06_crafting_recycle_smelt.png`: สร้างอาวุธ รีไซเคิล และหลอมแร่เป็นฝุ่น
- [EQUIPMENT_DEVELOPMENT_TH.md](EQUIPMENT_DEVELOPMENT_TH.md): สเปกหน้าพัฒนาอุปกรณ์ครบคำสั่ง พร้อมหลักฐานข้อจำกัดและเกณฑ์ QA
- [STAR_UPGRADE_TH.md](STAR_UPGRADE_TH.md): หลักฐานและข้อเสนอหน้าอัปดาว แยกระบบปัจจุบันจากทิศทาง P04
- [REVIEW_TH.md](REVIEW_TH.md): หลักฐานสาขา/โค้ด, ปัญหา UX, โครงสร้างใหม่, interaction, states และเกณฑ์ตรวจรับ
- [HANDOFF_TH.md](HANDOFF_TH.md): ข้อกำหนดส่งต่อก่อนนำเข้าเกม
- `validation.json`: ขนาดและ SHA-256 ของไฟล์ส่งมอบ

ภาพเป็น concept สำหรับเลือกโครงสร้าง/ลำดับข้อมูล ข้อความและตัวเลขในภาพไม่ใช่ game data และยังไม่ได้ทดสอบ usability ในเกม ใช้สเปกภาษาไทยประกอบเสมอ

อ้างอิงภาพจริง `incoming/ART-UI-MODERN-001/05_forge.png` จากสาขาเกม c8665fa; งานสร้างภาพใช้ image_gen โดยส่งภาพอ้างอิงเข้าเครื่องมือจริง ไม่มีการเปลี่ยนไฟล์ภาพต้นแบบ
