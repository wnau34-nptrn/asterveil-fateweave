# ART-UNIT-ANIMATION-WB-B-001 — Valdrakk body motion

ภาพต้นฉบับสำหรับ วัลดรัค อสูรโลกแตก: 8 whole strips / 44 logical cells, หันซ้าย ตาม seed B จาก commit `46f366dc931e4994d3a6ccd9ad3951ac444a70cf` ฐานเกม `8e672a17211239ab5b12acf2f33d51d01bae0ecd` บน `feature/fateweave-initial-prototype` ไม่มีการนำเข้าเกมหรือแก้กฎ/เซฟ/ตัวเลข/เวลาเล่น

**Draft สำหรับตรวจภาพ ยังไม่ผ่านเกณฑ์สัดส่วนครบทุกเฟรมและยังไม่อนุมัติ motion**: 15 cells ตรง seed ทุก pixel, อีก 9 cells มี torso-only feature fit อยู่ใน ±4%; อีก 20 cells จับคู่ส่วนไหล่ถึงลำตัวด้านหลังไม่พอ จึงเป็น `not-measured` ไม่ใช่ผ่าน ต้องตรวจความยาวลำตัวกับ seed ด้วยตา/โครงร่างก่อนนำเข้า หากไม่ผ่านให้สร้าง whole strip ใหม่ ห้ามย่อเฉพาะเฟรมเพื่อแก้ตัวเลข

## ดูภาพ

- `preview-keyposes-390.png`: ท่าสำคัญครบทุกท่า มี Staggered / hit / down ให้เทียบโดยตรง
- `preview-390.png`: ทุกเฟรม 390px กว้าง สเกลเซลล์เดียว .22 (seed สูงประมาณ161px) ท่ากว้างใช้เต็มแถวเพื่อไม่ตัด/ไม่ย่อ
- `previews/<move>.webp`: 390×280, เซลล์225px (seed สูงประมาณ161px) เวลาเป็นเพียง offline preview ไม่ใช่เวลาในเกม; down เล่นครั้งเดียวและค้างภาพท้าย
- `sentinel-compare.png`: ready เทียบผู้คุมที่ใช้แทนอยู่ ด้วยขนาดเซลล์และ sole เดียวกัน ไม่ใช่ภาพจับจากเกม
- `previews/torso-reference-mask.png`: ขอบเขตไหล่/ลำตัวที่ใช้ตรวจ แยกจากปีก หาง หัว และเท้า

## ไฟล์และท่า

`strips/*.png` เป็น RGBA 1024×1024 ต่อเฟรม แถวเดียว: Shard Talon / Wing Gust / Wing Gathering / Worldshard Dive / Staggered / Sky Rend ท่าละ6, hit4, down4 รวม44 ไม่มี idle loop เฟรมแรกทุกท่า และเฟรมสุดท้ายทุกท่ายกเว้น down ล็อก seed B ทุก pixel รวม alpha และ hidden RGB

ใช้ R1 สำหรับ Wing Gathering (พับปีกแนบหลัง, hold index2) และ Staggered (ปีกใกล้กล้องตกข้างเดียว) ท่าชาร์จเห็นแกนไหล่สว่าง, Dive หัวต่ำลาดไปซ้าย, hit สะท้านเงยไปขวาโดยปีกยังชู, down พับปีกและแกนดับค้างไม่ลุก ทั้งหมดไม่มี VFX/เงาพื้น/ตัวอักษร/โลโก้/UI

ลักษณะที่ตรวจด้วยตา: ขา4 ปีก2 หาง1 แกนวงกลม1 อยู่ไหล่ซ้ายใกล้กล้อง ไม่ mirror หางโค้งขึ้นทางขวาปลายฟ้า กรงเล็บทอง ตาฟ้า `anatomy-review.json` มีบันทึกทุกเฟรม การตรวจนี้เป็นของ Codex ไม่ใช่การอนุมัติของเจ้าของ

## สเกล จุดยึด และ raw

- `seeds/scale-calibration.json`: วัดจาก Shard Talon R3 ready **ครั้งเดียว** ใช้ torso-only similarity กับ seed ได้ global canonical scale `2.8401709469953085` ที่ความละเอียดslot362px ไม่มีการ fit ความสูงปีกหรือย่อเฉพาะเฟรม
- แถบ6pose ต้นฉบับ2172×724 ใช้ scale ค่าข้างต้น; แถบ4pose ต้นฉบับ2172×724 ใช้ค่าเดิมคูณ362/543 เพื่อแปลงความละเอียด raster เท่านั้น ทั้งสองเป็น canonical body scale เดียวกัน
- กลาง alpha silhouette x512; ย้ายตำแหน่งตามท่าเท่านั้น ไม่เปลี่ยนสเกล เท้ากรงเล็บที่รับน้ำหนัก/จุดสัมผัสที่ระบุใน `strips.json` แปลงไป y896 ปัดเศษไม่เกิน0.5px เท้าอื่นสูงต่างกันตามมุมสามส่วน ท่าล้มใช้จุดสัมผัสลำตัว/เท้า ไม่ใช่ยืน4เท้า ฝ่าเท้าหรือเล็บสัมผัสเป็นจุดยึด ไม่ใช้ขอบปีกเป็นพื้น
- ทุกเซลล์เว้นขอบบน/ซ้าย/ขวา≥32px ไม่มีการตัดอวัยวะ Dive ทั้งแถบมี minX≥49 (ขยับซ้ายจาก seed x89 ไม่เกิน40px) R3 แก้ท่าDiveด้วยการพับเข่าหลัง/ม้วนหาง ไม่ย่อรูป
- `raw/original/*.png` คือ generator output **ทุก byte** ทั้ง14ครั้ง รวมรอบที่ไม่เลือก ไม่ปรับไฟล์เหล่านี้ ดู prompt/reference/selected ใน `prompts.json`
- `raw/<move>.png` คือ **derived raw ที่เตรียมตัด**: ล้าง alpha≤8 และ RGB ที่มองไม่เห็น ตัด alpha bbox แล้วเติมช่องว่าง64px โดยไม่ rescale/วาดซ่อม มีช่อง alpha0≥64px ภาพต้นฉบับ generator บางใบไม่มีช่องว่าง48px หรือมี haze จึงไม่ได้อ้างว่าต้นฉบับทุกใบผ่าน ขนาด/bbox/ช่องว่างของทั้งต้นฉบับและ derived เก็บแยกใน `strips.json` ห้ามสับสนว่า derived คือ byte-original
- R1 ของ Wing Gathering และ Dive ไม่เลือกเพราะ alpha haze; Wing Gust R2 เพิ่ม follow-through ให้ชัด; Shard Talon R3 เพิ่มความยาวช่วงหลังลำตัวของท่าง้าง; Dive R3 ทำทรงกระชับเพื่อตรง margin ต้นฉบับเก็บครบ

## ทำซ้ำและตรวจ

จาก root repo ใช้ Python3 และเวอร์ชันใน `requirements.txt`:

```sh
python3 -I incoming/ART-UNIT-ANIMATION-WB-B-001/build_handoff.py
python3 -I incoming/ART-UNIT-ANIMATION-WB-B-001/audit_anatomy.py
python3 -I incoming/ART-UNIT-ANIMATION-WB-B-001/audit_torso.py
python3 -I incoming/ART-UNIT-ANIMATION-WB-B-001/build_handoff.py
python3 -I incoming/ART-UNIT-ANIMATION-WB-B-001/build_handoff.py --verify
```

การ build ใช้ original PNG ที่เก็บแล้ว ไม่เรียก generator ซ้ำ ไม่มี numeric RNG seed จากเครื่องมือ; `prompts.json` เก็บ prompt จริงและ seed/layout ที่แนบทุกรอบ การตรวจ anatomy ต้องใช้ full repo เพราะเรียก `scripts/unit-anatomy-audit.py` โดยตรงและบันทึก SHA script

`--verify` ตรวจรายการไฟล์/bytes/SHA-256 และ decode ทุกภาพ/ทุกเฟรม WebP, ขนาด/โหมด, seed lock, reconstruction จาก crop/scale/paste จริง, สเกลร่วม, real alpha, ขอบเซลล์, contact, derived raw gutters และขอบ Dive `validation.json` ไม่ hash ตัวเอง (เป็นวงจร) SHA ของ manifest บันทึกภายนอกใน PR หลัง push ใช้ fresh clone ไม่มี object alternates, fetch จาก origin และตรวจเทียบทุกไฟล์รวม manifest กับ local อีกครั้ง

## รายงานสัดส่วนที่ยังค้าง

`anatomy-audit.json` เก็บผลสคริปต์โครงการตามจริง: มี10 drift flags และ8 not-measured เพราะ top42% ของสัตว์สี่ขาครอบคลุมปีกที่กำลังพับ/กางเป็นส่วนใหญ่ จึงใช้ผลนั้นรับรองความยาวลำตัวไม่ได้ และไม่ได้ลบ flag ทิ้ง

`torso-audit.json` ตรวจแยกด้วย mask เฉพาะไหล่ถึงช่วงท้ายลำตัว ต้องมี≥12 inliers, ช่วง x≥180px และ posterior inliers≥3 เพื่อไม่ให้จับคู่เฉพาะแกนไหล่แล้วอ้างวัดลำตัวได้ ผล24 cells เป็น seed-exact/within-4pct-proxy และ20 cells not-measured; proxy นี้ไม่ใช่การวัดกระดูกจริง **ยังไม่รับรองเงื่อนไข ±4% ครบ44เฟรม** รายการค้างและผลดูด้วยตาอยู่ใน `anatomy-review.json` อย่าถือว่าผล `--verify` คือผ่านเกณฑ์ภาพหรืออนุมัติ motion

## ฝากถึง Claude

- ยังไม่ประกอบ atlas/ไม่แทน foe_sentinel ใน PR นี้ รอเจ้าของตรวจภาพและสัดส่วนที่ยังค้างก่อน
- เมื่อนำเข้า ใช้ `foe_valdrakk` / sheet `valdrakk`, atlas30เฟรม: seed0 + move1–6 อย่างละ4 (strip index1–4) + hit index1–2 + down index1–3 เท้า896/1024, displayRatio2, encounter-only loading ตาม WB-A ห้ามเพิ่ม idle loop
- Staggered คือ engine move หลังตัดชาร์จ ไม่ใช่ hit และไม่ใช่ down คงกฎ/ตัวเลขเดิมทั้งหมด
- ปีกสองข้างอาจซ้อนกันในท่าพับ ต้องรักษารูปทรงและแยกขอบ ไม่ให้ลามบังแกนไหล่หรือหัว ห้าม mirror เพื่อให้แกนผิดข้างหรือกางปีกแนวนอน
- ทำ presentation coverage/คลิป390px ในเกมและขอเจ้าของอนุมัติ motion ภายหลัง เวลา offline preview ในงานนี้ไม่ใช่ข้อเสนอเปลี่ยนเวลาเกม
