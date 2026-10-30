# ART-UNIT-ANIMATION-A7-003 — Claude handoff

สถานะ: สร้างภาพแล้ว 15 ท่า / 78 เฟรม · รอเจ้าของเลือกภาพและอนุมัติ motion ในเกม

สาขา `art/art-unit-animation-a7-003` จาก `feature/fateweave-initial-prototype` commit `e83cad78e7ed039265d4f775a478891b1df2e5e5` ส่งเฉพาะโฟลเดอร์นี้ เปิด PR ไม่ merge ไม่แก้ runtime หรือ atlas เดิม การรายงานส่งต่อ Claude อยู่ในไฟล์นี้ตามข้อจำกัด incoming-only ของคำขอปัจจุบัน

## ต้นแบบและขอบเขต

- Odran (`thiran`, Saint) และ Isolde (`wila`, Dancer) ใช้ seed ใหม่จาก branch `art/art-char-redesign-002`, PR #120 ที่เจ้าของเลือกแล้ว 2026-10-30 ตรวจ SHA-256 ตรง brief ทั้งสองไฟล์ และเก็บ byte-for-byte ใน `seeds/` (512×512 RGBA)
- แนบเฉพาะ seed ของตัวนั้นในการสร้างแต่ละครั้ง ไม่ส่งภาพ A7 เก่า / Corin / Cerise ให้ตัวสร้างภาพ งานวาดใหม่ ไม่มีภาพจากเกมอื่น
- หนึ่งคำขอต่อหนึ่งแถบต่อท่า; 6 เฟรมสำหรับ actions, 4 สำหรับ reactions รวม down ที่ค่อย ๆ ล้มและนอนค้าง ไม่ลุกขึ้น ไม่มี VFX/พื้น/เงาหรือข้อความใน body
- ไม่ทำ R2 ให้เลือก เพราะไม่มีท่าที่ต้องแยกตัวเลือกเชิงการตีความ มี corrective retry ของ Odran arc/communion/lastlight; รุ่นก่อนหน้าใน `raw/` และ `prompts.json.rejectedGenerations` เป็นหลักฐานที่ไม่ใช่ตัวเลือกส่งมอบ

## แผนที่และไฟล์

- Odran: attack (attack/saintstrike/vowstrike), arc (saintarc), communion (communion/sharewound), lastlight, hit, block, down — ลำดับ slot 1–36 (รวม seed ที่ 0 เป็น 37)
- Isolde: attack, partner (cadence/duet/deepbeat), circle (rounddance), closing (closingstep), echo (echofoot), hit, block, down — ลำดับ slot 1–42 (รวม seed ที่ 0 เป็น 43)
- `strips.json` ระบุ slot ลำดับเต็มตาม brief สำหรับชุดใหม่ รวม reaction ready slots อย่าเอาเลขเหล่านี้ไปใส่ atlas เก่าโดยไม่ pack ใหม่: runtime ปัจจุบันมี reaction ขนาด 3 slot และยังไม่มี wila echo/down จึงต้องให้ Claude จัด atlas/mapping ตามแผนใหม่
- `raw/`: PNG จาก generator ไม่แก้ไข รวมไฟล์ที่ถูกแทนที่; `prompts.json`: prompt จริงทุกคำ, seed references และ generation IDs โดยไม่มี base64
- `cells/<character>-<move>/000.png` เป็น seed reference; `001…` เป็นท่าตามลำดับ; `spaced/` มีช่องว่าง 96px ระหว่างเซลล์
- `<character>-preview-390.png` กว้างจริง 390px เทียบ seed กับทุกเฟรมที่สเกลเดียวกัน ไม่ใช่คลิปในเกม

## พิกัดและ scale

ตัวสร้างภาพให้ raster แต่ละแถบมีขนาดตัวไม่เท่ากัน จึงมี **raw raster registration หนึ่งค่าเดียวต่อทั้งแถบ** อ้างอิงความสูงท่าแรกเทียบ seed; ไม่มีการปรับ scale แยกเฟรม ค่าเหล่านี้เปิดเผยใน `rawRasterRegistrationScale` และ `frameTransforms` ของ `strips.json` หลัง register ทุกท่าใช้ logical character scale = 1.0 เทียบ seed เดียวกัน การเปลี่ยนท่าจริงไม่ถูกยืด/บีบให้ bbox สูงเท่ากัน

เซลล์ 1024×1024 เป็น transparent overscan รอบ logical 512×512 เพื่อเก็บคทาที่ชูเหนือหัว/กางแขนเต็ม ไม่ย่อทั้งตัวเพื่อให้อาวุธลงกรอบ logical เดิม ต้นกำเนิด logical อยู่ (256,256), พื้น logical y497 = cell y753, sole y496 = cell y752, pivot (512,753) ใช้ข้อมูลนี้คืน offset ใน atlas ห้ามนำ canvas 1024 ไปตีความว่าตัวต้องสูง 1024px ในเกม Seed reference คือ seed เดิมวางที่ (256,256) โดยไม่มีการย่อ

แยก silhouette ด้วย connected components ไม่ตัดเส้นแนวตั้งผ่านคทาที่เอียงทับช่วง x ของเฟรมข้าง ๆ เก็บขอบ antialias รอบ component 4px และตัด speck alpha ที่ไม่เชื่อมกับตัวออกเท่านั้น ตำแหน่ง x ใช้ bottom/center normalization ตามกรอบตัว พื้นทุกเฟรมที่ไม่ลอยอยู่ที่เดียวกัน; Claude ต้องตรวจ foot sliding ในคลิปจริงด้วย

เฟรม ready/reset (action 1/6, hit/block 1/4) คืน seed จริงเพื่อไม่ให้รอยต่อหน้าตากระโดด; down ไม่มีการคืน seed ท้ายท่า เพราะต้องนอนค้าง

## ผลตรวจและข้อจำกัด

รัน `python3 scripts/unit-anatomy-audit.py --cells … --json …` ครบทุกแถบใหม่ อ้างอิง `000.png` เป็น seed เดิม ผล JSON และ stdout ใน `audits/`; ทั้ง 15 ตัวเลือกสุดท้าย exit 0, median ≤1.15 และทุกเฟรมที่วัดได้ ≤1.20 (ค่าสูงสุด 1.095) ไม่ใช้ bbox/พื้นเท้าแทนการตรวจศีรษะ

เฟรมที่สคริปต์ **วัดไม่ได้** ตรวจขยายเทียบ seed ด้วยตาแล้วและบันทึกใน `visual-review.json` ไม่เรียกว่า automated pass:

| ท่า | เฟรม (001-based; 000 คือ seed) | สิ่งที่ตรวจด้วยตา |
| --- | --- | --- |
| Odran communion | 2, 3 | ก้มศีรษะ/หันซ้าย; ขนาดหัว เสื้อผ้า gauntlet ครบ; ฝ่ามือเสนอไปทางซ้ายใน 3–4 |
| Odran down | 3, 4 | ล้มตะแคงจนหลับตานอนค้าง ความยาวตัวเต็ม ไม่ขยายหัว |
| Isolde circle | 3 | หันหลังสามส่วนระหว่างหมุน; เส้นรอบผม/หัวเท่าเดิม คทาและกระดิ่งครบ |
| Isolde down | 3, 4 | ทรุดและนอนหมดสติ ตัวเต็มความยาว คทาวางข้างตัวครบ ไม่ขยายหัว |

Odran arc/lastlight รุ่นแรกมี head shrink จนสคริปต์แจ้ง drift จึงสร้างใหม่ทั้งแถบ รุ่น communion แรกเสนอฝ่ามือผิดทิศในช่วงค้างจึงสร้างใหม่ด้วย ผล audit รุ่นที่ถูกแทนเก็บ `audits/rejected-r1/` ไม่ใช่ตัวเลือกสำรอง

ไม่มีท่าขาดในตัวเลือกสุดท้าย การผ่าน offline audit, การตรวจไฟล์ และ CI ไม่ใช่การอนุมัติภาพหรือ motion ของเจ้าของ **ยังไม่ได้ทดสอบในเกม และยังไม่ได้รับอนุมัติภาพชุดนี้**

## สร้างซ้ำและตรวจ remote

ต้องมี Pillow, NumPy และ opencv-python-headless จากนั้นรัน:

```sh
python3 incoming/ART-UNIT-ANIMATION-A7-003/build_handoff.py
git fetch origin art/art-unit-animation-a7-003
python3 incoming/ART-UNIT-ANIMATION-A7-003/verify_remote.py --ref FETCH_HEAD
```

build script ใช้ `raw/` ที่เก็บใน repo ไม่เรียก generator และใช้ audit เดิมได้เฉพาะเมื่อ hash เซลล์ก่อน/หลังสร้างตรงกันทุกไฟล์ `validation.json` เก็บ SHA-256/bytes/ขนาด/mode ของ payload; `SHA256SUMS` ครอบคลุม validation ด้วย (เว้นตนเอง) ตัว verifier อ่าน blob จาก commit ที่ fetch มาโดยตรง ตรวจทุก hash และ decode PNG ทุกภาพด้วย Pillow สองรอบ (verify และ load)

## ฝาก Claude

1. ให้เจ้าของเลือกภาพจาก preview ก่อน integration; ทั้ง 15 เป็นตัวเลือกแนะนำชุดเดียว ไม่มี R2
2. Pack atlas ใหม่แบบ lossless โดยรักษา logical offset/scale และ ready/reset เดิม; อัปเดต thiran/wila entries ตาม slot จริง รวม echo/down ที่ยังไม่มีใน runtime
3. ผูกจุด contact กับ event จริง คง rules/save/content/balance/playback timing และ VFX เดิม; timing weights ใน manifest ใช้เฉพาะ preview
4. ถ่ายคลิปจริงที่ viewport 390px ครบทุกท่าและเปลี่ยนสถานะ ตรวจ planting/sliding, overscan, รูปหน้า/หัว, คทา/gauntlets, ทิศ communion/partner, down hold; ให้เจ้าของอนุมัติ motion อีกครั้งก่อน merge/publication

Codex งานนี้ไม่ merge และไม่ทำ runtime integration
