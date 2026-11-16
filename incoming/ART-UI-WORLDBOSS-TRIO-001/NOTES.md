# ART-UI-WORLDBOSS-TRIO-001

หัวการ์ดบอสโลกสามตัวและการ์ดรวมหน้าค่าย ตามคำขอ 2026-11-16 ใช้ seed/concept A/B/C จาก PR #263 ชุดนี้เป็น **ภาพนิ่งสำหรับส่งต่อ Claude** ยังไม่นำเข้า DOM/CSS หรือเปลี่ยนสถานะในเกม ผลเทสต์/CI ไม่ใช่คำอนุมัติรูปลักษณ์ของเจ้าของ

Branch `art/art-ui-worldboss-trio-001` จากเกม `feature/fateweave-initial-prototype` ที่ `cca1c3db38028781306072011d8dc4c0aed438f3` แก้เฉพาะ package นี้ ไม่แตะ src/tests/public/.github/ ภาพเดิม หรือเอกสารสถานะนอก incoming เปิด PR ไม่ merge ส่งต่อใน NOTES นี้ตามขอบเขตงานภาพ

## ไฟล์ส่งมอบ

| ชื่อ | ใช้กับ | ขนาด / mode |
| --- | --- | --- |
| banner_kragmor.png / .webp | หัวการ์ด Kragmor | 1080×360 RGB |
| banner_valdrakk.png / .webp | หัวการ์ด Valdrakk | 1080×360 RGB |
| banner_morvane.png / .webp | หัวการ์ด Morvane | 1080×360 RGB |
| banner_trio.png / .webp | หน้าค่ายรวมสามตัว | 1080×288 RGB |
| emblem_kragmor.png / .webp | เหรียญหน้าคราก์มอร์ | 256×256 RGBA |
| emblem_valdrakk.png / .webp | เหรียญหน้าอสูรปีก | 256×256 RGBA |
| emblem_morvane.png / .webp | เหรียญหน้าราชันเงา | 256×256 RGBA |

PNG กับ lossless WebP ของทั้ง7คู่ตรงทุก pixel รวม RGBA ช่องโปร่งใสของ emblem พื้นนอกวงกลม alpha0 จริง มุมทั้งสี่โปร่งใสและมีขอบว่างอย่างน้อย6px

`preview_390.png` เป็น mockup390px วางแต่ละการ์ดกว้าง **358px** ที่ x16 มีชื่อบอส/ข้อความไทย/สิทธิ์/ดาเมจสีขาวเพิ่มภายหลังเพื่อจำลอง DOM และแสดง emblem ที่ **40×40px** ตัวเลข2/5,12,480,4วันเป็นค่าตัวอย่าง ไม่มีข้อความใดถูกฝังใน banner/emblem ที่ส่งนำเข้า ไม่มี logo/UI/ฮีโร่ใน asset

## อ้างอิงที่ตรวจแล้ว

- `src/ui/world-boss-panel.ts`: camp banner `#lobby-wboss`, รายชื่อบอสและ `wb-boss-card` ปัจจุบันใช้ medallion ตัวอักษร ยังไม่มี artwork ทั้งสามผูกไว้ใน DOM
- `src/ui/camp-layout.css`: ความกว้างค่าย/การ์ดและแบบเหรียญ ปัจจุบัน camp banner มี min-height52px จึงต้องตรวจ aspect/crop ของภาพใหม่ตอน Claude ประกอบ ไม่อ้างว่า mockupนี้คือ layout runtime จริง
- Reference art commit `46f366dc931e4994d3a6ccd9ad3951ac444a70cf` จาก `art/art-char-worldboss-001`: seed-a/b/c และ concept-a/b/c คัดลอกทุก byteไว้ใน references ใช้ภาพต้นแบบของเกมนี้ ไม่ใช้ภาพจาก Asterveil: Rise Beyond
- Reference UI commit `1895f837c02cdfe1d8744a7a98ff1fad0cc2bc32` จาก `art/art-ui-worldboss-001`: อ่าน handoff.py/contrastเก่า และใช้ R1 emblem เป็นแนวกรอบทองเท่านั้น ไม่ใช้ใบหน้าผู้คุมแทนตัวใหม่
- `public/assets/art/battle_riftline.webp`: ฉากแนวรอยแยกของเกม แนบ generator ทุก banner
- SHA ของบริบทและ reference ทั้งหมดอยู่ใน references/context.json และ seeds.json ฟอนต์ Noto Sans Thai + Noto Sans พร้อม license เก็บใน references/fonts เพื่อ rebuild preview ได้ลำพัง

## การจัดภาพและเอกลักษณ์

แบนเนอร์เดี่ยวเก็บบอสเต็มตัวไว้ทางขวา ไม่มีการ cropอวัยวะ/มงกุฎ ไม่มี mirror ขนาดภาพต้นฉบับ2172×724 ย่อทั้งภาพเป็น1080×360 โดยรักษาสัดส่วน

- Kragmor: ผลึกมงกุฎ5ชิ้น มือใหญ่2ข้าง กรงเล็บ3นิ้ว/มือ แผล cyanกลางอก จุดม่วงเป็นแสงรอง
- Valdrakk: สี่ขา ปีกผลึก2ข้างชู หางเดียวโค้งทางขวา หันซ้าย แกนพลังอยู่ไหล่ซ้ายทางกายวิภาคข้างเดิม ไม่ mirror
- Morvane: หกแขนสามคู่ มีช่องว่างแยกคู่แขน ผ้าคลุมสามแฉกแทนขา แกน cyanกลางอก มงกุฎทอง

ภาพรวม: A กลาง-หลัง, B ซ้ายของกลุ่ม, C ขวาของกลุ่ม ทุกตัวอยู่ครึ่งขวาของ **ภาพส่งออก** ต้นฉบับ generator เป็น1983×793 จึงย่อด้วยความสูงเดียวเป็น720×288 วางชิดขวาที่x360 แล้วต่อสีท้องฟ้าว่างทางซ้าย ไม่มีการยืดตัวละครหรือ cropมงกุฎ/หน้า อวัยวะบางส่วนซ้อนบังกันตามการจัดกลุ่ม ให้ตรวจรายละเอียดเต็มตัวจากแบนเนอร์เดี่ยว ไม่ถือภาพรวมเป็นหลักฐานนับอวัยวะที่ถูกบัง

Emblem สร้างเป็นชุดสามวงเดียวกันแล้วตัดตามช่องโปร่งใส กรอบทองเดียวกัน พื้นวงในnavy ใบหน้าหันซ้าย เก็บจุดจำของแต่ละตัว อ่านเทียบที่40pxแล้ว ภาพ portraitตั้งใจไม่แสดงแขน/ขาส่วนล่าง จึงไม่อ้างว่าตรวจ anatomyที่ซ่อนได้จาก emblem การตัดสินความเหมือนต้นแบบสุดท้ายเป็นของเจ้าของ

## Contrast ทุก pixel

พื้นที่ข้อความคือ `[0,0,540,H)` ครึ่งซ้ายเต็มความสูงทุกใบ ใช้สูตร WCAG sRGB → linear RGB → luminance ด้วยน้ำหนัก .2126/.7152/.0722 แล้วคำนวณ `(1.0+.05)/(L+.05)` กับขาว **#FFFFFF** ไม่ใช้ค่าเฉลี่ยหรือการสุ่มตัวอย่าง

| Banner | contrastต่ำสุดครึ่งซ้าย native | ต่ำสุดเมื่อย่อ358px |
| --- | ---: | ---: |
| Kragmor | 15.5587:1 | 15.9904:1 |
| Valdrakk | 10.7194:1 | 12.6519:1 |
| Morvane | 14.2779:1 | 15.6400:1 |
| Trio | 18.4644:1 | 18.5930:1 |

ทุกใบมี0pixelต่ำกว่า4.5:1 จำนวน pixelที่ตรวจ ตำแหน่ง pixelเลวร้ายที่สุด และค่าความสว่างเต็มความละเอียดอยู่ใน validation.json วัดซ้ำจาก PNGที่ส่งออก และหลัง resize358px ด้วย Lanczos ไม่วัดภาพที่ใส่ตัวอักษรจำลองแล้ว

ใช้ navy veil สี(8,18,32), opacity .72 ตลอด x≤540 แล้ว smoothstepลดเป็น0ที่x720 จึงไม่มีขอบแบ่งสว่าง/มืดตรงกลางแบบเส้นแข็ง ไม่ตัด RGBด้วยเพดานรายช่อง ข้อมูล gradientและ framing อยู่ใน seeds.json

## ทำซ้ำและตรวจ

```sh
python -I incoming/ART-UI-WORLDBOSS-TRIO-001/handoff.py
python -I incoming/ART-UI-WORLDBOSS-TRIO-001/handoff.py --verify
```

ต้องมี Python3, Pillow12.3.0 และ NumPy2.3.5 ตาม requirements.txt ฟอนต์เก็บครบ ใช้ RAQMของ Pillowเพื่อจัด Thai clusters และแยก Noto SansสำหรับLatin/เลข/punctuation เพราะฟอนต์ Thaiอย่างเดียวไม่มี glyphเหล่านั้น ตรวจ previewที่แก้ fallbackแล้ว ไม่มีสี่เหลี่ยมแทนชื่อ/ตัวเลข

source/ เก็บ generator outputsเดิมทุก byte prompts.jsonระบุ promptจริงและภาพอ้างอิงทุก call ไม่มี numeric RNG seedที่เครื่องมือเปิดให้จึงบันทึก null ไม่แต่งค่าสุ่ม สคริปต์ทำซ้ำเฉพาะการย่อ/จัดกรอบ/veil/normalize emblemและ export จาก sourceที่เก็บไว้ ไม่รับประกันสุ่มสร้างภาพใหม่ได้พิกเซลเดิม

ตรวจขนาด/mode, Pillow decodeเต็มทุกภาพ, PNG/WebP7คู่ตรงกันทุก pixel, alphaจริงของ emblem, contrastครบทุกpixelทั้ง native/358px, rebuildเทียบ manifest, SHA-256+byte lengthทุกไฟล์ ยกเว้น validation.jsonที่ hashตัวเองไม่ได้ SHAของ manifestใส่ใน PRเป็นreceipt หลัง git push ให้ fetchกลับเข้า object databaseใหม่และรัน --verify เพื่อกันไฟล์ถูกตัด

## ส่งต่อ Claude

เลือกไฟล์ตามboss id `kragmor/valdrakk/morvane`; trioสำหรับหน้าค่าย ใช้ข้อความจริงจากstateเป็นDOM ไม่ใช้เลขตัวอย่างจาก preview ทวนพื้นที่textครึ่งซ้ายและขนาดวง40pxขณะประกอบ ตรวจobject-fit/การ cropจริงโดยเฉพาะกรอบcampเดิมที่สูงขั้นต่ำ52px รูปนี้เป็นภาพใหม่ที่ยังไม่ได้wireเข้าruntime ไม่มีการรันเกม/เปลี่ยนDOMหรือกติกาในงานนี้ เจ้าของเป็นผู้ตัดสินรูปลักษณ์และอนุมัติ ไม่ mergeงานภาพเอง
