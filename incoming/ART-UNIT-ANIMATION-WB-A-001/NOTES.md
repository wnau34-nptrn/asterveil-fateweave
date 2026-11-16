# ART-UNIT-ANIMATION-WB-A-001 — Kragmor body motion

ทำตามคำขอ 2026-11-16: คราก์มอร์ ไททันรอยแยก จาก seed A ของ PR #263 ชุดนี้เป็น **body-only art handoff** ให้ Claude ประกอบ atlas และ registry ภายหลัง ยังไม่ได้นำเข้าเกมหรือรับการอนุมัติ motion จากเจ้าของ ผลเทสต์/CI ไม่ใช่คำอนุมัติภาพ ไม่มี idle loop เพิ่ม

Branch `art/art-unit-animation-wb-a-001` จากสาขาเกม `feature/fateweave-initial-prototype` ที่ `081766e1cfec0b66f5e4de136adb062c894e3daf` เปลี่ยนเฉพาะ `incoming/ART-UNIT-ANIMATION-WB-A-001/` ไม่แก้ src/tests/public/.github/ ภาพเดิม กฎ ตัวเลข หรือจังหวะเกม เปิด PR ไม่ merge ตามขอบเขตงานภาพ; ส่งต่อด้วย NOTES นี้แทนการแก้ CURRENT_STATE/docs/handoffs นอก package

## ภาพอ้างอิงและบริบทจริง

- Seed ที่แนบ generator **ทุกครั้ง**: `origin/art/art-char-worldboss-001` ที่ commit `46f366dc931e4994d3a6ccd9ad3951ac444a70cf` → `incoming/ART-CHAR-WORLDBOSS-001/seed-a.png` คัดลอก byte-for-byte เป็น `references/seed-a.png` (1024², alpha จริง, หันซ้าย, sole≈896)
- Seed SHA-256: `ebefafd4696527f71a8e8eeb196447e2b0ba77a6506995bc1a5ddf39909afd97` Turnaround และ transform เดิมอยู่ใน references เพื่อประกอบการอ่าน แต่ seed เป็นหลัก
- ตรวจ `wbKragmor` / `wb-kragmor` ใน `src/content/encounters/catalog.ts`: f1 ยังยืม `foe_sentinel`, ท่าจริง Stone Fist / Titan Gathering / Mountain Fall / Rift Quake / Boulder Hurl; เฟส **70% Fault Awakening** ไม่มีการนำท่าผู้คุมเก่าหรือเฟส 35% มาแทน
- ตรวจ `bossMove` และ BOSS_SOLE ใน `unit-frames.ts`: prepare `[0,1,2]`, recover `[3,4,0]`; hit ใช้สอง reaction frames; down สาม reaction framesแล้วค้างล้ม displayRatio 2, sole 896/1024
- ตัวผู้คุมเก่าที่เทียบใช้ atlas frame0 ของฐานนี้จริง ไม่แตะไฟล์เดิม ต้นทาง/hash/frame rect และ sourceSize อยู่ `references/sentinel-reference.json`

## ไฟล์หลักและลำดับ

ทุกท่าเป็น whole strip สร้างพร้อมกันในภาพเดียว ไม่สร้างทีละเฟรม `source/` เก็บผล generator เดิมทุก byte; `raw/` เป็น sheet เดียวกันที่ทำความสะอาด alpha; `strips/<move>.png` คือ 1024² ต่อเซลล์เรียงแถวเดียว รวม **44 logical frames**

| ท่า | เฟรม | ลำดับภาพ 1-based | จุดที่ Claude ใช้ |
| --- | --- | --- | --- |
| stone-fist | 6 | พร้อม → ง้างหมัดขวา → เอนเต็มแรง → หมัดต่ำซ้าย → ตามแรง → พร้อม | contact=4 |
| titan-gathering | 6 | พร้อม → มือเข้าอก → ก้มไหล่ชาร์จอก → กดมือลง → ยืดตัว → พร้อม | **เลือก R1**, hold=3 |
| mountain-fall | 6 | พร้อม → มือประสานเหนือหัวพร้อมย่อ → ย่อลึก → สองมือทุบพื้นซ้าย → ค้างต่ำ → พร้อม | contact=4 |
| rift-quake | 6 | พร้อม → ยกเท้าหน้า → ถ่ายน้ำหนัก/เท้าสูง → กระทืบ → สะเทือน → พร้อม | contact=4; เฟรม2–3ใช้เท้าหลังเป็นหลักพื้น |
| boulder-hurl | 6 | พร้อม → มือใกล้กล้องดึงหินจากไหล่มาถือระดับเอว → ง้างหินข้างหลังหัว → แขนเดิมปล่อยไปซ้าย มือว่าง → ตามแรงมือว่าง → พร้อม | ถือหินเฉพาะ2–3, ปล่อย=4 ไม่มีหินบิน |
| fault-awakening | 6 | พร้อม → ก้ม → เปิดแขน/อกสว่าง → เงยคำรามปากเปิด → ผ่อน → พร้อม | phase70%, contact/peak=4 |
| hit | 4 | พร้อม → สะท้านไปขวา → ตั้งหลัก → พร้อม | reaction=2–3 |
| down | 4 | พร้อม → เข่าทรุด → ลำตัวพังเป็นกองครึ่งสูง → ร่างหมอบค้าง/แผลอกดับ | reaction=2–4, final hold=4 ไม่ลุก |

เฟรมแรกทุกท่า และเฟรมสุดท้ายทุกท่ายกเว้น down เป็น seed ตรงทุกพิกเซลทั้ง RGBA ไม่มีแถบ idle เพิ่ม กรณี down เฟรม4เป็นภาพใหม่จริง ไม่ย้อนกลับ seed

## สเกล จุดยึด และ alpha

ใช้ **สเกลร่างกายร่วมค่าเดียวทั้งชุด** ใน canonical coordinate ที่ช่อง raw กว้าง 362px: `GLOBAL_SCALE=760/271≈2.804428` วัดครั้งเดียวจาก Stone Fist เฟรมพร้อม (ยอดมงกุฎ y273 → เท้าจริง y544) เทียบ seed (ยอด y136 → sole896) ไม่ fit ความสูงท่าอื่นใหม่ ไม่ย่อท่าที่กางแขนเพื่อให้พอดี

ผล generator 6 เฟรมเป็น 2172×724 (362px/slot); hit 4 เฟรมเป็น 2048×768 (512px/slot); down เป็น 2172×724 (543px/slot) จึงแปลง **ความละเอียด canvas** ด้วย `362/(source_width/N)` ก่อนคูณสเกลร่วม ตัวเลข effective scale ต่างกันเพราะ sampling resolution ของ sheet ไม่ใช่การปรับขนาดร่างกายรายท่าหรือรายเฟรม ทุก pose ของแต่ละ sheet ใช้ค่าเดียวกัน ไม่มีการยืดแกนใด

ตัด alpha bbox แล้ววางกึ่งกลางซิลูเอต x=512 เช่น seed, ไม่ fit รายเฟรม source sole/contact ทุกเฟรม annotate จากเท้าหรือส่วนร่างที่รองรับน้ำหนักจริง แล้ว map ไป y896 (ปัดเศษไม่เกิน0.5px) ไม่ใช้มือ/ก้อนหินเป็นเส้นพื้นของท่ายืน ท่าย่อคงความสูงที่ย่อลงจริง ท่ากระทืบใช้เท้าหลังที่ยังแตะพื้น และท่าล้มใช้ contact ของเข่า/ร่างที่พื้น ระบุข้อยกเว้นใน strips.json แล้ว

`source/` ยังมี hidden RGB/alpha haze ของ generator; `raw/` กำจัดเฉพาะ alpha≤8 เป็นศูนย์พร้อมเคลียร์ RGB ช่องโปร่งใส ไม่มีลายตารางปลอม ไม่วาด/ตัด anatomy ขอบท่า `raw/` มีช่อง alpha0 ≥48px จริง (ต่ำสุด49px) ไม่ได้คำนวณเฉพาะ alpha>32 ส่วน normalized ตรวจขอบว่าง ≥32px, ไม่มีอวัยวะล้น cell และมี pixel contact ใกล้ y896

ล็อกภาพจำ: ผลึกมงกุฎ5ชิ้น กรงเล็บ3นิ้ว/มือ มือใหญ่2ข้าง แผล cyanกลางอกจุดเดียว รอยม่วงเป็นแสงรอง บางส่วนถูกแขน/มุมมองบังตามท่า ไม่เพิ่มแขน/อาวุธใหม่ ไม่มีคลื่นกระแทก ฝุ่นใหญ่ หินบิน ระเบิด หรือแสงภายนอกร่าง หินใน Boulder Hurl อยู่ติดมือก่อนปล่อยเท่านั้น

## Preview และข้อจำกัด

- `preview-390.png`: ทุกเฟรมทุกท่าในความกว้าง390px ใช้ scale เดียว .213 (seed สูง≈162px) ไม่ zoom แต่ละ pose; ท่ากว้างใช้เต็มแถวเพื่อไม่ตัดภาพ
- `preview-keyposes-390.png`: เฟรมเตรียม/พีคที่อ่าน silhouette ได้ชัด เลขใต้ภาพเป็นเลขเฟรมจริง 1-based
- `sentinel-compare.png`: พร้อม Kragmor เทียบผู้คุมเดิม ใช้ความกว้าง logical cell แสดงผลเท่ากัน และ sole=7/8เหมือนกัน จึงเห็น Kragmorใหญ่กว่าจริงในเงื่อนไขเปรียบเทียบนี้
- `previews/<move>.webp`: offline body playback ขนาด390×280px ภาพตัวละครจาก strip เดียวกัน (seed≈162px) ท่าล้มเล่นครั้งเดียวและจบค้างร่างล้ม ท่าอื่น loop เพื่อดูจังหวะต่อกลับ seed **มิใช่ loop idle ในเกม**
- เวลา WebP เป็นเวลาสาธิต `[420,220,280,180,260,420]` ms ต่อท่า6เฟรม และ `[420,220,280,700]` สำหรับ4เฟรม ไม่แก้/ไม่รับรอง playback timing ของ runtime

ภาพ preview เป็นการประกอบ offline ไม่ใช่ screenshot/คลิปที่นำเข้าเกม ไม่มีผลสนามจริง HP/ลูกน้องใน runtime ให้กล่าวอ้าง Claude ต้องตรวจท่าทั้งหมดในเกมรวมแถวหลังกลาง, HP, floor anchors, hit/down, ลด motion, memory/atlas budget หลังประกอบ งานนี้ยังไม่ใช่ atlas ที่พร้อมโหลด หรือหลักฐานอนุมัติ motion

## Anatomy และการตรวจ

ใช้ `scripts/unit-anatomy-audit.py` ของฐานนี้ผ่าน `audit_anatomy.py` กับสำเนา QA512px จาก normalized (ไม่แก้ภาพส่ง): 44เฟรม = 15เฟรม seedตรง, 19เฟรมวัดได้, **0 drift**, 10เฟรม not-measured; สเกลหัวที่วัดได้ 0.954–1.106, median1.045 ภายใต้เกณฑ์ ±12% ของโปรเจกต์

not-measured คือ Stone Fist เฟรม5; Mountain Fall เฟรม2–5; Boulder Hurl เฟรม4; Fault Awakening เฟรม2/4; down เฟรม3/4 เกิดเมื่อหัวก้ม แขนบัง หันคำราม หรือร่างล้ม จำนวน SIFT inliers ไม่พอจึง **ไม่ใช่ผลผ่าน** ตรวจด้วยตาแยกตาม `anatomy-review.json` ว่าขนาดส่วนหัว/มือยังสอดคล้องและท่าอ่านออก ไม่มีข้อสรุปแทนเจ้าของ

ตรวจจำนวน/ขนาด/alpha, ทุกเฟรม decode เต็ม, ≥48px raw gutter, ≥32px normalized margin, contact y896, exact seed locks, canonical scale เท่ากัน, SHA-256+byte length ทุกไฟล์ และรัน build ซ้ำเทียบ manifest ไม่รัน gameplay suite เพราะไม่มี runtime change

## แก้ระหว่างผลิต

- Mountain Fall รอบแรกมือยกสูงเกิน cell เมื่อใช้สเกล seed จึงสร้าง whole strip ใหม่ให้ย่อเข่าลึกขึ้น ไม่ shrink เฟรม
- Boulder Hurl สองรอบแรกถือหินสลับมือ จึงสร้าง/แก้ whole strip จนมือใกล้กล้องข้างเดิมถือจากเอว → ง้างข้างหัว → ไขว้ปล่อยซ้าย หินหายหลังปล่อย
- Fault Awakening รอบแรกแขนกว้างและ gutter แคบ จึงงอศอกให้มือใกล้สะโพกแทนลดขนาดตัว
- Hit มีการขอ matte ใหม่ ตรวจ compositing จริงแล้วสีม่วงนอกตัวอยู่ใน RGB ที่ alpha0 ไม่ใช่ VFX ที่มองเห็น raw สุดท้ายเคลียร์ hidden RGB แล้ว

เก็บเฉพาะ accepted original sheets ใน source/; prompt/revisionและ output id ของทุก attempt อยู่ใน prompts.json รุ่นที่ไม่เลือกอยู่ในพื้นที่สร้างชั่วคราว ไม่ส่งเป็น alternate ให้สับสน

## รันซ้ำและส่งต่อ

ใช้ Python3 และ requirements.txt (Pillow12.3.0, NumPy2.2.6; OpenCV4.12.0.88 สำหรับ audit):

```sh
python -I incoming/ART-UNIT-ANIMATION-WB-A-001/build_handoff.py
python -I incoming/ART-UNIT-ANIMATION-WB-A-001/build_handoff.py --verify
# ต้องมี checkout เกมเต็มและ OpenCV สำหรับ rerun audit
python -I incoming/ART-UNIT-ANIMATION-WB-A-001/audit_anatomy.py
# หลัง audit ให้ rebuild manifest อีกรอบ
```

build/verify ใช้ package นี้ได้ลำพัง audit wrapperอ่านสคริปต์จาก checkoutเกม ไม่มี network/generation API ในการ rebuild เครื่องมือไม่เปิด numeric RNG seed จึงไม่แต่งค่าสุ่มขึ้นมา การแปลง asset จาก sourceเดิมทำซ้ำได้ ไม่รับประกันสุ่มสร้างภาพใหม่ได้พิกเซลเดิม

validation.json hash ทุกไฟล์ยกเว้นตัวมันเอง SHA ของ manifestใส่ใน PR เป็น receipt หลัง git push ต้อง fetch เข้า object database ใหม่และรัน --verify เพื่อกันไฟล์ภาพถูกตัด ไม่ตรวจจาก local working copyอย่างเดียว

Claude: trim/dedup/lossless-pack, สร้าง identity/registryสำหรับ Kragmor แยกจาก foe_sentinel, routeชื่อท่าจริงตามตาราง, คงกติกา/ตัวเลข/จังหวะเดิม ตรวจ body anchors (อย่าใช้ปลายมือในท่าทุบเป็นเท้า), head continuity, โยนหิน/คลื่น/impactจาก eventจริงใน VFXภายนอก และทำคลิปเกม390pxให้เจ้าของพิจารณา ชุดนี้ยังไม่ใช่คำอนุมัติให้นำเข้า/merge และไม่เริ่ม WB-B/WB-C
