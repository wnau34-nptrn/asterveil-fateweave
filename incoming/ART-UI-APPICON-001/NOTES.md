# ART-UI-APPICON-001 — ไอคอนแอป · ส่งต่อ Claude

2026-11-05 (Asia/Bangkok) · branch `art/art-ui-appicon-001`
Base สาขาเกม `feature/fateweave-initial-prototype` @ `2b9a7ffb92cc0ffc40644a4dee81049bd389627e`
Brief เต็มอ่านจาก `claude/app-icon` @ `3c9f3aa7f87be156087827dd834c2a3a9f3cd4f3` (PR #162) โดยไม่ merge สาขา brief เข้า branch งานภาพ
**งานภาพเท่านั้น — รอเจ้าของเลือกแบบ — ห้าม merge**

## รอบ R2 — ภาพวาดรวมแคมป์ · 2026-11-05

เจ้าของเลือกแนว **R1 ดาวทองสี่แฉก + ริบบิ้นทองถักผ่าน** และขอใช้ฉากแคมป์ตาม handoff นี้ การเลือก R2a/R2b รอบใหม่ **ยัง pending** ไม่ใช่การอนุมัติจากผลเทสต์

รับฉาก `public/assets/lobby/lobby_bg.webp` และฉบับประกอบชั่วคราว `final-r1-camp-1024.png` จาก `claude/app-icon` commit `fb1c7d7aa4e9bb56ad2a1b831e4c31c6915d021d` เก็บเป็น reference bytes เดิมใต้ seeds/ โดยไม่ merge สาขา Claude หรือเปลี่ยน public. ฉบับประกอบใช้เทียบใน preview เท่านั้น ไม่ได้แนบเป็น model ของภาพใหม่

ส่ง **R2a และ R2b**: ทั้งสองภาพสร้างใหม่ทั้งฉากใน edit request เดียวต่อแบบ แนบ `icon-r1-1024.png` ที่เจ้าของเลือกและภาพ lobby เท่านั้น ไม่ได้ตัดดาว/แปะ/paint-over ด้วย Python คงรูปดาวสี่แฉกยาวแนวตั้ง หน้าผลึก ริบบิ้นเส้นเดียวเฉียงจากล่างซ้ายไปบนขวาและประกายเล็ก 2 ดวง ขนาด/จังหวะ facet เป็นภาพวาดใหม่อ้างอิง R1 ไม่ใช่การคัดลอกพิกเซลดาว

- **R2a:** ดาวกึ่งกลางประมาณครึ่งความกว้าง ฉากเห็นเต็นท์ผ้าใบ ธง teal/navy ดอกลิลลี่ทอง ตะเกียง และปราสาทลอยแห่งเดียวพร้อมน้ำตกฟ้า 2 สายชัดกว่าแบบ B ผ้าเต็นท์กินพื้นที่ล่างแทนพื้นดินว่าง แสงทองสะท้อนบนผ้าและหินในโทนเดียวกับดาว
- **R2b — แนะนำ:** ดาวใหญ่ขึ้นใกล้ 60% ความกว้าง ฉากปราสาทและน้ำตกนุ่ม/คอนทราสต์ต่ำลง ตัดต้นไม้/รายละเอียดข้างดาวออก ทำให้ silhouette ดาวและเส้นริบบิ้นอ่านง่ายสุดที่ 60px และยังจำได้ที่ 40px ฉาก twilight สีม่วง-ชมพู-ส้มและมวลเต็นท์ยังสื่อค่ายทหารรับจ้างได้ แสงจากดาวเด่นที่สุด โดยตะเกียง/น้ำตกเป็น accent รอง

ส่ง `icon-r2a-1024.png`, `icon-r2b-1024.png` และขนาด 512/192/180 ของแต่ละแบบ (RGB PNG ทึบ ไม่มี alpha, embedded sRGB ICC). สร้างสำเนา Lanczos ตรงจาก master ไม่มีการ crop/ยืด/แต้มฉาก

`preview-camp-dark.png` และ `preview-camp-light.png` เทียบ **ฉบับ Claude ชั่วคราว → R2a → R2b** ที่ 180/120/60/40px จริง; `preview-camp-maskable-390.png` เทียบวงปลอดภัยและ circle mask. ตรวจภาพทั้งสองธีมและ mask แล้ว: ดาว/ริบบิ้น/ประกายครบอยู่ในวงกลาง 80%; background ต่อถึงขอบ โดยต้นผ้า ธง และยอดฉากรอบนอกยอมให้ mask ตัดตามธรรมชาติ ไม่ใช่องค์ประกอบโลโก้หลัก ฉากยังอ่านเป็นแคมป์ ไม่มีพื้นที่พื้นดินว่างด้านล่าง

การวัด safe area รอบนี้ใช้ landmark ปลายดาว/ริบบิ้น/ประกายที่ตรวจด้วยตาบน source แล้วแปลงสู่ master (uncertainty ประมาณ ±4px source) ไม่ใช้ warm-color proxy ทั้งภาพ เพราะผ้า/ท้องฟ้าสีอุ่นตั้งใจให้เต็มขอบ ตัวเลข landmark/radius อยู่ใน validation. ข้อจำกัด: การกลมกลืนของแสงและความอ่านง่ายเป็น offline visual review ไม่ใช่ผลวัดเชิงกายภาพหรือการติดตั้ง iOS/Android จริง; ให้เจ้าของเลือกภาพใหม่ก่อน Claude นำเข้า

รักษาไฟล์ R1/R2/R3 เดิมทั้ง 12 exports รวม source/reference/preview เดิม **byte-identical** เทียบ commit `47ff96c4`; build และ verify ตรวจ protected hashes 25 ไฟล์ก่อนผ่าน มีเฉพาะ metadata/shared scripts ที่อัปเดต ไม่มีไฟล์นอก package เปลี่ยน

รัน `python3 incoming/ART-UI-APPICON-001/build_handoff.py` จะสร้างเฉพาะ R2a/R2b + camp previews/metadata และตรวจว่าไฟล์เดิมไม่เปลี่ยน; `verify_remote.py` fetch กลับมาตรวจทุก SHA/decode และยืนยัน protected hashes พร้อม RGB/size/sRGB ของ exports ใหม่อีกครั้ง ตรวจ build ซ้ำว่า bytes ตรงกัน รอเจ้าของเลือก R2a/R2b; ไม่ merge และไม่ integrate public

ส่วนด้านล่างเก็บประวัติรอบแรก คำแนะนำ R1 เดิมหมายถึงทิศทางที่เจ้าของเลือกแล้ว ส่วนคำแนะนำรอบ camp ล่าสุดคือ R2b

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
