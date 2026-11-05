# ART-UI-APPICON-001 — ไอคอนแอป · ส่งต่อ Claude

2026-11-05 (Asia/Bangkok) · branch `art/art-ui-appicon-001`
Base สาขาเกม `feature/fateweave-initial-prototype` @ `2b9a7ffb92cc0ffc40644a4dee81049bd389627e`
Brief เต็มอ่านจาก `claude/app-icon` @ `3c9f3aa7f87be156087827dd834c2a3a9f3cd4f3` (PR #162) โดยไม่ merge สาขา brief เข้า branch งานภาพ
**งานภาพเท่านั้น — รอเจ้าของเลือกแบบ — ห้าม merge**

## ผลงานและตัวแนะนำ

- **R1 — แนะนำ:** ดาวสี่แฉกทองกับด้ายทองเส้นเดียวถักผ่านกลาง/วนรอบหนึ่งครั้ง บนกรมท่าและแสงฟ้าจากกลาง รูปทรงหลักยังแยกเป็นดาวกับแนวด้ายเมื่อย่อ 60px และยังจำได้ที่ 40px สื่อ Fateweave โดยไม่ผูกไอคอนกับตัวละครคนใด จัดเส้นด้ายเฉียงเป็นเอกลักษณ์ของแบบนี้ ไม่อ้างว่าได้สำรวจหรือพิสูจน์ความไม่ซ้ำกับทุกเกมในตลาด
- **R2 — ตัวละคร:** Isolde (`wila`) จาก portrait ใน `incoming/ART-CHAR-REDESIGN-001/` ตามชุดอ้างอิงที่ brief อนุญาต ไม่ได้อ้างว่าเธอเป็นผู้นำทีมในระบบเกม คงตาอำพัน ผมสั้นสีน้ำตาลปอยขาว ผ้าคลุม ochre ทอง เข็มกลัดกลม และคอเสื้อ navy/ivory ในกรอบดาว ภาพใบหน้าคงเอกลักษณ์เดิม แต่เมื่อย่อ 40–60px รายละเอียดหน้า/เข็มกลัดลดลงจึงไม่แนะนำเป็นหลัก
- **R3 — ผสม:** เงาดาบทหารรับจ้างด้านหน้าดาวและด้ายทอง ไม่มีการอ้างตัวละครหรืออาวุธ cast คนใด ดาบทรงเรียบสร้างใหม่ทั้งหมด อ่านแนวเกมผจญภัยได้ แต่ดาว/ด้าย/ดาบซ้อนกันมากกว่า R1 เมื่อขนาดเล็ก

ตรวจภาพจริงทั้งสามแบบที่ 180/120/60/40px บนพื้นโฮมสว่างและมืด และดูการ crop วงกลมจำลองแล้ว นี่เป็น art-review composition ไม่ใช่ screenshot จาก iOS/Android จริง ไม่ใช่ owner approval หรือผล CI

## ไฟล์และวิธีทำ

- `icon-r1-1024.png` ถึง `icon-r3-1024.png`: master **1024×1024 RGB PNG**, embedded sRGB ICC, ทึบเต็มสี่เหลี่ยม ไม่มีช่อง alpha ไม่มีมุมมนหรือเงาตกนอกภาพ ไม่มีตัวอักษร ตัวเลข ชื่อเกม หรือลายน้ำในตัวไอคอน
- สำเนาแต่ละแบบ `-512.png`, `-192.png`, `-180.png` ย่อ Lanczos โดยตรงจาก master ไม่มีการ crop/ยืด/วาดเพิ่ม
- `preview-dark.png`, `preview-light.png`: เปรียบเทียบครบทุกแบบที่ขนาดจริง 180/120/60/40px; ป้ายกำกับอยู่เฉพาะ preview ไม่ใช่ artwork
- `preview-maskable-390.png`: แถวบนขีดวงกลม 80% บนสำเนา preview; แถวล่างจำลอง mask วงกลมเพื่อดูการตัด ไม่ได้ทำมุมมนหรือ alpha ลงในไฟล์ไอคอนจริง
- `sources/`: generator outputs ไม่แก้ bytes/metadata รวมไฟล์รอบเก่าที่ถูกแทนที่ใน `sources/rejected/` เพื่อ audit **ไม่ใช่ตัวเลือกเพิ่ม** รอบแรกของ R1/R2 ปลายดาวใหญ่เกิน safe circle จึง edit ทั้งภาพใหม่ให้ emblem เล็กลงและมีพื้นกรมท่ารอบนอกมากขึ้น ไม่ใช้ Python แต้มแก้ภาพ
- `seeds/` และ `seeds.json`: สำเนา reference byte-identical จาก repo — temporary SVG / title logo / title background / tokens ใช้อ่านสีและภาษารูปทรง ไม่แนบ SVG ที่มีตัวหนังสือเข้า generator; portrait Isolde แนบเฉพาะ R2. R1/R3 ใช้คำอธิบายสี/รูปทรง ไม่รับภาพจากเกมอื่น
- `prompts.json`: prompt จริงทุกครั้ง รวมรอบที่ปฏิเสธ พร้อม image-reference chain, artifact UUID ที่เครื่องมือเปิดเผย; separate generation ID ไม่เปิดเผยจึงเป็น null ไม่มี base64 และไม่แต่ง ID

Artwork ใหม่สร้างด้วย ImageGen จาก Fateweave references เท่านั้น ไม่ใช้ภาพ/โลโก้/ตัวละครจาก Rise Beyond หรือเกมอื่น ไม่ได้เพิ่มอุปกรณ์ให้ Isolde. โทนหลัก navy/cyan/warm gold; R2 คงสีผิวและผมเดิมไว้ในกลุ่มโทนอุ่น/เข้ม เงาและเส้นผมเป็นรายละเอียดรอง รูปทรงหลัก/กรอบดาว/ด้ายใช้มวลหนา ไม่พึ่งลายเส้นเล็กในการอ่านไอคอน

## เกณฑ์ตรวจและข้อจำกัด

ทุก master/สำเนาเป็น RGB จึงไม่มี alpha โดยโครงสร้าง Decode ผ่าน Pillow และมี ICC มาตรฐาน sRGB; ตรวจขนาดตามชื่อไฟล์ ไม่มี cropping หรือขอบมนปลอม

ของสำคัญอยู่ภายในวงกลมกลาง 80%: build วัด warm-foreground proxy (ดาว/ด้าย/กรอบ/ผิว) เทียบรัศมี 409.6px ที่ master1024 และไม่พบ warm pixels นอกวง ร่วมกับการดูด้วยตาว่าหน้า ผม ดาบ ปลายดาวและด้ายครบในวง ดู bounds/radius จริงใน validation. การตรวจสีเป็น proxy ไม่ใช่ semantic segmentation; แสง glow/background ไหลออกนอกวงได้ตาม brief

การอ่านที่ 60px และความตรงรูปลักษณ์เป็นการตรวจด้วยตา ไม่ใช่ผลอัตโนมัติ องค์ประกอบภายในเล็ก เช่น shading ของผม/ดวงตา จะลดรายละเอียดเมื่อย่อ; R1 ตั้งใจให้พึ่ง silhouette มากที่สุด ไม่มีการทดสอบติดตั้ง Home Screen บนอุปกรณ์จริงในงานนี้

## ทำซ้ำ / remote

```sh
python3 incoming/ART-UI-APPICON-001/build_handoff.py
python3 incoming/ART-UI-APPICON-001/verify_remote.py
```

ต้องมี Python3, Pillow และ NumPy. Build ใช้ source PNG ที่เก็บไว้ สร้าง RGB/sRGB masters/สำเนา/preview ใหม่ ตรวจ safe-area proxy และ seed hashes แล้วสร้าง validation.json กับ SHA256SUMS (รวม validation ยกเว้น checksum ตัวเอง) ล็อก timestamp ใน ICC profile เพื่อให้ build ซ้ำได้ bytes เดิม

Push ด้วย git ปกติ แล้ว verify_remote.py fetch branch กลับมาตรวจ SHA ทุกไฟล์และ decode PNG/WebP จาก git object bytes; ตรวจว่า diff จาก base เป็น additions เฉพาะ package นี้ ผล remote สุดท้ายบันทึกใน PR description

Claude รับไฟล์หลังเจ้าของเลือกแบบ แล้วนำเข้า public/apple-touch-icon.png, public/icon-192.png, public/icon-512.png ในงานแยก ไม่ได้แก้ public/src/tests/workflows/rules/save/balance หรือ package อื่นในงานนี้ และไม่ merge ขอบเขต package-only ของผู้ใช้มีลำดับเหนือ handoff ทั่วไป จึงส่งต่อใน NOTES.md นี้เท่านั้น
