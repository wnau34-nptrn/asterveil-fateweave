# ART-UI-APPICON-001 — ไอคอนแอป Asterveil · Fateweave (brief สำหรับ Codex)

เขียนโดย Claude 2026-11-05 · สถานะ: **เขียน prompt แล้ว** (ยังไม่ได้ส่ง/ยังไม่มีภาพ) · ไอคอนปัจจุบันเป็นดาวสี่แฉกชั่วคราว (PR #162) ใช้แทนได้ด้วยการเปลี่ยนไฟล์ PNG โดยไม่แก้โค้ด

```text
CODEX HANDOFF — ART-UI-APPICON-001 (art only)
Asterveil · Fateweave · repository wnau34-nptrn/asterveil-fateweave

เป้าหมาย:
ออกแบบไอคอนแอปของเกมสำหรับปุ่มทางลัดบนหน้าจอโฮมของมือถือ (iOS "เพิ่มไปยังหน้าจอโฮม" และ Android) ให้เป็นตัวแทนเกม อ่านออกที่ขนาดเล็กมาก (ราว 60 px) และดูเป็นเกมแฟนตาซีที่ลงตัวกับ UI กระจกสีน้ำเงินกรมท่า-ทอง "Luminous Veil" ของเกม

บริบทเกมและไฟล์ที่ตรวจแล้ว (อ่านก่อนเริ่ม):
- AGENTS.md, CLAUDE.md, docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md, docs/handoffs/ART-PLACEMENT-RULES.md
- เกม: Asterveil · Fateweave — เกมทหารรับจ้างแฟนตาซี มุมมองแนวตั้ง เล่นเซสชันสั้นบนมือถือ; ธีมคือด้ายแห่งชะตา (fateweave), ดวงดาว, ม่านที่ฉีกขาด/รอยแยก (rift), ค่ายทหารรับจ้าง
- ไอคอนชั่วคราวปัจจุบัน: public/assets/asterveil.svg (ดาวสี่แฉกทองบนพื้น #101c36) — ใช้เป็นเพียงเงื่อนไขสี/ความรู้สึก ไม่ต้องคงรูปนี้
- โลโก้ชื่อเกม: public/assets/title/logo.svg และพื้นหลังหน้าแรก public/assets/title/title_bg.webp (ดูโทนสีและภาษารูปทรง)
- พาเลตของเกม: src/ui/tokens.css (navy-950, ทอง gold-edge/gold-light, ฟ้า #7cdaed)
- ตัวละครหลักที่อนุมัติแล้วดูได้ใน incoming/ART-CHAR-REDESIGN-001/ และ public/assets/art/portraits*.webp (ใช้เป็นอ้างอิงสไตล์เท่านั้น)

ภาพอ้างอิงที่แนบ/เข้าถึงได้: ไฟล์ข้างต้นใน repository

ข้อกำหนดที่ยืนยันแล้ว:
- ภาพต้นฉบับเท่านั้น ห้ามนำภาพ/โลโก้/ตัวละครจาก Asterveil: Rise Beyond หรือเกมอื่น ห้ามใช้ชื่อ/ตราของบริษัทอื่น
- ห้ามมีตัวอักษร ตัวเลข หรือชื่อเกมในภาพ (ไอคอนต้องอ่านได้ด้วยรูปทรงอย่างเดียว; ชื่อแอปอยู่ใต้ไอคอนในระบบอยู่แล้ว)
- ห้ามใช้เนื้อหาจริงของบุคคล/โลโก้จริง ห้ามพื้นโปร่งใส: iOS จะเติมพื้นดำให้ ต้องทึบเต็มสี่เหลี่ยม
- ไม่เปลี่ยนโค้ด/กฎ/เซฟ/ตัวเลข: ทำเฉพาะภาพ

สมมติฐานและข้อมูลที่ยังขาด (ให้ Codex ตัดสินและบันทึกใน NOTES.md):
- เจ้าของยังไม่ได้เลือกแนวภาพ ให้ทำ 3 ทางเลือก (R1–R3) แล้วแนะนำหนึ่งตัว:
  R1 สัญลักษณ์: ดวงดาวสี่แฉกที่มีด้ายเส้นเดียวถักผ่านกลาง/พันรอบ (fateweave) บนพื้นลาดสีน้ำเงินกรมท่า มีประกายทองบางส่วน เรียบ คม
  R2 ตัวละคร: ใบหน้า/ครึ่งตัวของ "ผู้นำทาง" หรือฮีโร่หลักของเกมในกรอบดาว ตัดแน่นให้ใบหน้าเด่น สไตล์เดียวกับพอร์ตเทรตในเกม (ถ้าใช้ตัวละคร ให้ใช้ตัวที่อนุมัติใน incoming/ART-CHAR-REDESIGN-001 และระบุว่าตัวไหน)
  R3 ผสม: ตัวละครเล็กหรือเงาดาบ/ธนูด้านหน้า ดาวและด้ายเป็นฉากหลังเรืองแสง
- ตัวแนะนำ = ทางที่ยังอ่านออกที่ 60 px และดูต่างจากไอคอนเกมอื่นบนหน้าจอโฮม

ท่า ทิศ จำนวนเฟรม และจังหวะ:
ภาพนิ่ง ไม่มีเฟรม

ขนาดเฟรม จุดยึด และรูปแบบไฟล์:
- Master 1024×1024 PNG sRGB ทึบเต็มสี่เหลี่ยม ไม่มี alpha ไม่มีมุมมน (ระบบจะตัดมุมเอง)
- วางองค์ประกอบสำคัญทั้งหมดในวงกลมกลางขนาด 80% (เส้นผ่านศูนย์กลาง ~820 px) เพื่อให้ Android maskable ไม่ตัดของสำคัญ; พื้นหลังต่อเนื่องถึงขอบ
- ส่งสำเนาที่ย่อด้วยตนเอง (Lanczos) 512, 192, 180 px และ preview เปรียบเทียบ 180/120/60/40 px บนพื้นหน้าจอโฮมสีเข้มและสีอ่อน
- ชื่อไฟล์ตาม R: icon-r1-1024.png ฯลฯ

คำอธิบายด้านภาพ:
- โทน: น้ำเงินกรมท่าลึก (#0a1422–#101c36) ไล่ไปฟ้าเรือง (#7cdaed) พร้อมทองอุ่น (#ffcc72/#f2d596) เป็นสีเด่นเดียว; คอนทราสต์สูง ไม่เกิน 3 เฉดหลัก
- รูปทรงใหญ่ เรียบ ขอบสะอาด เส้นหนา อ่านออกที่ขนาดจิ๋ว ไม่มีรายละเอียดเล็กหรือเส้นบางกว่า ~2% ของความกว้าง
- ความรู้สึก: ลึกลับ อบอุ่น ผจญภัย ไม่โหด ไม่การ์ตูนเด็ก; แสงเดียวจากกลางภาพ
- หลีกเลี่ยง: ตัวอักษร ขอบมนปลอมที่ทำให้ซ้อนกับมุมระบบ เงาตกภายนอก ลายตารางโปร่งใสปลอม ลายน้ำ

Prompt สำหรับเครื่องมือสร้างภาพ (ปรับตาม R; ภาษาอังกฤษ):
"Mobile game app icon, square 1:1, fully opaque full-bleed background, no text, no letters, no border, no rounded corners. Dark fantasy-adventure mercenary game about fate threads and stars. Deep navy gradient background (#0a1422 to #101c36) with a soft cyan glow (#7cdaed) from the centre. One bold glossy gold (#ffcc72 / #f2d596) four-pointed star as the main shape, a single luminous thread weaving through and around it (R1) — OR a close, centred bust of the party leader inside a star frame (R2) — OR a small hero silhouette in front of a glowing star and thread (R3). Clean thick shapes, high contrast, readable at 60 px, all key elements inside the central 80% circle, polished painterly game-icon finish, same visual language as the game's gilded navy glass UI. No watermark, no UI chrome."

งานปรับ asset และ metadata (Codex ทำ):
- NOTES.md ภาษาไทย: สิ่งที่ทำ เหตุผลของตัวแนะนำ ตัวละคร/สัญลักษณ์ที่ใช้ ข้อจำกัด; validation.json + SHA256SUMS; prompts.json (prompt จริง, ภาพอ้างอิง, generation id ถ้าเปิดเผยได้ ไม่ใส่ base64)
- build_handoff.py ที่ทำซ้ำได้ (resize + preview) และ verify_remote.py

งานนำเข้าเกมและการเปลี่ยนสถานะ (Claude ทำ ไม่ใช่ Codex):
- Claude แทนที่ public/apple-touch-icon.png, public/icon-192.png, public/icon-512.png และตรวจ build; ไม่แก้โค้ดเพิ่ม

เกณฑ์ตรวจรับ:
- อ่านออกที่ 60 px และต่างจากไอคอนทั่วไป; องค์ประกอบสำคัญอยู่ในวงกลม 80%; พื้นทึบไม่มี alpha; ไม่มีตัวอักษร
- สีตรงพาเลตเกม; ตัวละคร (ถ้ามี) ตรงรูปลักษณ์ที่อนุมัติ ไม่มีอุปกรณ์ผิดหรือหน้าเพี้ยน
- ขนาดและไฟล์ตรง "ขนาดเฟรม"; SHA-256 ตรง validation.json และ decode ด้วย Pillow ผ่านทุกไฟล์

ขอบเขตงานที่ผู้ใช้อนุญาต:
- สร้าง branch art/art-ui-appicon-001 จาก feature/fateweave-initial-prototype (ไม่ใช่ main); เปลี่ยนไฟล์เฉพาะใต้ incoming/ART-UI-APPICON-001/ ห้ามแตะ src/ tests/ public/ .github/ เปิด PR แต่ไม่ merge
- push ด้วย git ปกติ แล้ว fetch กลับมาตรวจ SHA-256 ทุกไฟล์และ decode ภาพ
- การเลือกภาพเป็นของเจ้าของ ผล CI/ผลเทสต์/การตรวจอัตโนมัติไม่ใช่การอนุมัติ
```
