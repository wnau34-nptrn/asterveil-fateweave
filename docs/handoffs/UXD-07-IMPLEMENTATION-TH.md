# UXD-07 — รวมหน้าสกิล

เจ้าของอนุมัติเริ่มด้วย “ดำเนินการได้” หลังอธิบายรวมติดตั้ง / เพิ่ม Lv / ผังสกิลและแลกตำรา ฐาน remote `ab06dfd6cdd70b41bd6be721a85bf59e65289a7f` สืบจาก release UXD-06 `b3ad98e` สาขา `codex/uxd-07-unified-skills` ส่งกลับ `feature/fateweave-initial-prototype` ไม่ใช่ main ไม่รวมสาขา audit/Artwork หรือ checkpoints เก่า

## ขอบเขต

- เหลือ 4 แท็บหลัก ภาพรวม/อุปกรณ์/สกิล/พัฒนา ทางเข้าผังเดิมจาก NPC ทีม กระเป๋า และพัฒนาชี้เข้าส่วนผังใต้สกิล รองรับ alias talents ภายในสำหรับทางเข้าเดิม
- ชุดติดตั้งอ่านจำนวนช่องและ actions จริง ตัวเลือกสกิลรวมท่าเริ่มต้น โหนดปลด และ grants เดิม ปุ่มติดตั้ง/ถอดอยู่ข้างตัวเลือกท่า เลือกท่าเพื่อดูรายละเอียดและเทียบคำอธิบายผลปัจจุบัน/Lv ถัดไปจาก skillDescription/withParty เดิม สลับรายละเอียด/ผัง/ตำราโดยไม่เปลี่ยนสกิลเอง
- ไปโหนดของสกิลล็อกตรงตัว และโหนด choice ที่อ้าง ActionId เดียวกันของท่าพื้นฐาน เลือก node ที่ปลด active แล้วกลับรายละเอียดท่านั้นได้ passive/choice nodes คง selected active เดิม ไม่ลงแต้มจากการดู
- ลงแต้มและจัดชุดใช้ host commands เดิม รวม default loadout ที่เลือกจากสกิลปลดแล้วเมื่อยังไม่มีชุดเฉพาะ คงอย่างน้อย 1/เพดานเดิม รีเซ็ตฟรีในค่ายเตือนคืนแต้มและชุดเริ่มต้นก่อนยืนยัน
- เพิ่ม Lv/แลกตำราผ่าน review แสดง มี/ใช้/ได้รับเมื่อเกี่ยวข้อง/หลังทำ จาก read-only projection ด้วย raiseSkill/tradeTomes เดิม ไม่ใช้ RNG ไม่ dispatch จาก preview/cancel/back
- Review เก็บ Profile identity/fingerprint และ command เปรียบเทียบ projection อีกครั้งก่อนส่ง consume ก่อน host ป้องกัน reentry, held Enter และ double click รับ receipt จาก matching event กับ canonical Profile หลัง persist ตรวจผลทั้ง profile ยกเว้น last ที่ GameShell canonicalize และแยก storage failure ไม่อ้างว่าบันทึกถาวร
- รักษา selection, fold ตำรา, scroll/focus หลัง review, Escape และต้นทาง dialog/ทีม/กระเป๋า กฎ orientation/inert เดิมยังป้องกันคำสั่งหลัง overlay ส่วนรายละเอียดท่าและ passive ยาวพับได้
- ไม่มี core/content/save schema/ราคา/สมดุล/กฎต่อสู้เปลี่ยน ไม่เริ่ม UXD-08/P04/P09 งานอื่นใน UX/UI audit ยังเป็นข้อเสนอ

หลักฐานและผลตรวจล่าสุด: [validation](../validation/uxd-07/README_TH.md)

## ขอบเขตเพดานตำรา

พบ tradeTomes เพิ่มปลายทางเป็น100000ได้ แต่ tomesOf ในเซฟv45รับสูงสุด99999 UIตรวจ read-only projection ก่อน review/confirm และแสดงปลายทางเต็มโดยไม่ dispatch ทั้ง upsize/cross-line ฝากแก้คำสั่งกลางใน CLAUDE-TO-CODEX-DEV-TH.md ไม่เปลี่ยนcore/save/ราคาในงานนี้

## สถานะงาน

PR #145 ผ่าน quality/browser และ merge เป็น `26c5ab638ef3eac1929635e3a2c078372cb58fca` แล้ว จบงานตามกฎ pre-release ที่อัปเดตใน `aabc5dc` ส่วน Pages deploy อัตโนมัติ ไม่อ้างผล deploy หรือเริ่มงานถัดไป รายละเอียดการตรวจอยู่ใน validation ที่ลิงก์ข้างต้น
