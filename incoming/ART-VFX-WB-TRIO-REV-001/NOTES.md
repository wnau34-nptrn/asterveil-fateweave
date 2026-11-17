# ART-VFX-WB-TRIO-REV-001 — ปรับความชัด 3 จุด

แพ็กเกจภาพใหม่จาก ART-VFX-WB-TRIO-001 / PR #292 head `df25df95ce31581e418b19a595aca3780a5d62a6` บนสาขา `art/art-vfx-wb-trio-rev-001` จาก game branch commit `f773c8ddc681e8b9c681f3ccbb0b6c9faaf24b44` ไม่ merge PR #292 หรือ PR ภาพนี้

## สถานะที่แยกจากกัน

- **สร้างภาพแล้ว:** 7 PNG RGBA โปร่งใสจริง (256×256) จาก image generator และ normalization ด้วย ImageMagick ไม่มีข้อความ ตัวเลข ตัวละคร หรือพื้นหลังใน `layers/`
- **ตรวจด้วยตาแล้ว:** เลเยอร์ทั้ง 7, ภาพประกอบบนเฟรมเกมจริงขนาดแต่ละช่อง 390px, Wing R1/R2/REV บน Valdrakk และรูปวงเล็บ Mountain Fall ที่ Titan hold ใช้จริง ตรวจคลิปเดิมทั้ง 5 ไฟล์เป็น **ลำดับเฟรมสุ่ม 2 fps เท่านั้น ไม่ได้ตรวจ motion ต่อเนื่อง**
- **ทดสอบในเกมแล้ว:** **ยังไม่ได้** นำ revision นี้เข้า runtime ไม่มีคลิปใหม่ ไม่มีการยืนยันจุดยึดระหว่างการขยับหรือการแสดงผล normal/fast/reduced motion
- **รอเจ้าของอนุมัติ:** ยังไม่มีคำอนุมัติภาพหรือ motion ของ revision นี้ ผล hash/alpha/ขนาดและความเห็น Codex ไม่ใช่คำอนุมัติ

## เลเยอร์ที่แทน (ไม่ซ้อนเพิ่ม)

ปลายทางอ้างอิง `incoming/ART-VFX-WB-TRIO-001/layers/<ชื่อเดียวกัน>` เท่านั้น ผู้นำเข้าอ่านไฟล์ใหม่จากแพ็กเกจนี้โดยไม่เขียนทับ raw เดิม

| ไฟล์ใหม่ใน layers/ | เหตุผล |
| --- | --- |
| severing-bolt-prepare.png | ขอบ slit ม่วงอ่อนสว่างแยกจากขอบม่วงเข้ม |
| severing-bolt-peak.png | แกนเส้นตรงบางสว่างกว่าเส้นขอบ ไม่มีแส้โค้งหรือมวลหนาเพิ่ม |
| severing-bolt-settle.png | เศษเส้นเล็กคงรูปและตำแหน่งเดิม ให้สีต่อกับ peak |
| shadow-tide-prepare.png | ยอดคลื่นสว่าง/ท้องคลื่นเข้ม อยู่ที่ระดับพื้นเดิม |
| shadow-tide-peak.png | ขอบม่วงอ่อนคั่นท้องคลื่นเข้มกับลายพื้น มวลไม่สูงขึ้น |
| shadow-tide-settle.png | เศษคลื่นจางเล็ก คงตำแหน่งและพื้นที่เดิม |
| wing-gathering-prepare.png | รอยแตกและขอบเปลือก R1 สว่างขึ้น ใช้กับ prepare และ waiting hold เดิม |

**Wing Gathering peak/settle ไม่เปลี่ยน** และไม่เปลี่ยน Worldshard Dive, Titan Gathering, Mountain Fall, Fate Lash หรือท่าอื่น ส่วน release/break ต้องถ่ายใหม่เพื่อตรวจการหายของ hold ที่แก้ภาพนี้ ไม่ได้เพิ่ม VFX ของสถานะเหล่านั้น

`layers.json` ระบุ `replaces`, checksum ต้นทาง/ปลายทาง และ metadata เดิมเต็มแถว Canvas, pivot, anchor, offset, suggested width และ alpha ของทุกพิกเซลคงเดิม: Bolt `[128,128]`, Tide `[128,210]`, Wing `[128,128]` + rear offset `[12,0]` Width เดิม Bolt 80/130/60, Tide 80/74/42, Wing hold 80 ที่ field 390px ไม่มี trim/หมุน/ย้าย motif ไม่มีการแก้ timing

## Wing R1 / R2 / ฉบับแนะนำ

ดู `evidence/wing-r1-r2-rev-on-valdrakk-390.png` (สามช่อง ช่องละ 390px ไม่ขยายภาพ):

- R1: ช่องแตกเฉียงเป็น negative space กว้าง จึงสื่อเปลือกเปราะได้ แต่พื้นผิวม่วง/ขอบ cyan กลืนกับไหล่และผลึกจริง
- R2: ขอบทองแยกสีบางส่วนและแผ่นขนนกสัมพันธ์กับตัวบอส แต่แผ่นซ้อนอ่านคล้ายปีก/เกราะเดิมมากกว่า รอยแตกละเอียดและแคบกว่าเมื่อแสดง 80px จึงไม่ถือว่าดีกว่า R1 โดยอัตโนมัติ
- **แนะนำ REV ที่ต่อจาก R1**: เก็บช่องแตกเดิม เพิ่มริมม่วงอ่อนเกือบขาวกับด้านในเข้ม รอบแกน cyan จึงอ่านขอบเปลือกได้ดีขึ้น ยังเป็นแผ่นโค้งเปราะ ไม่ใช่วงเล็บเหลี่ยมมีฟันแข็งของ Titan hold (`mountain-fall_prepare`)

ข้อจำกัดที่ยังเห็น: REV ยังใกล้สีแกน cyan และ highlight ปีกบอส บางขอบอาจกลืนเมื่อ pose เปลี่ยน; peak/settle Wing เดิมยังเป็นม่วงจัด ความต่อเนื่องของสีจึงยังต้องดูคลิปจริง ไม่มีข้อเสนอเปลี่ยนตำแหน่งหรือเวลาค้าง

## ภาพเปรียบเทียบและขอบเขตหลักฐาน

`evidence/*-compare-390.png`: ซ้าย R1 / ขวา REV แต่ละช่องเป็น screenshot เกมจริง 390×844 จากเฟรมแรกของคลิปเดิม แล้ววางเลเยอร์ด้วย normal alpha บนเฟรมเดียวกัน มีคู่ครบ 7 เลเยอร์ `*-detail-390.png` เป็น crop ที่คงสเกล 1:1 ไม่ใช่ภาพขยาย ส่วน Wing R1/R2/REV เป็น crop กว้าง 390 ต่อช่อง

**ทั้งหมดเป็น static composite ไม่ใช่ screenshot หลังนำ revision เข้าเกม** จุดวางใน `evidence/placements.json` อ่านจาก landmark ของภาพด้วยมือ ใช้ pivot/width ตรง metadata แต่ไม่ใช่ socket telemetry จาก renderer ไม่รับรอง anchor ระหว่างเคลื่อนไหว ภาพนี้แสดงหนึ่งตัวอย่างเป้าหมายสำหรับ Tide ไม่ใช่การยืนยันพร้อมกันครบ 5 ตัว ไม่มีการย้าย/ลบตัวบอส ฉาก ตัวละคร หรือ HUD ของ screenshot; คืนบริเวณป้าย HP จากเฟรมเดิมหลัง composite ให้ใกล้ลำดับ DOM อยู่บน canvas (rectangles ในสคริปต์) เป็นการจัดภาพนิ่ง ไม่ใช่ระบบ mask ใหม่ในเกม

ข้อจำกัดที่ยังเห็น: Bolt พาดผ่าน bow/เกราะสว่างของ Cherin บางช่วงจึงยังใกล้สีขาวของอาวุธ แต่แกนตรงชัดกว่าเดิม; Tide ที่ width 74 มีความสูงภาพจริงเพียงประมาณ 21px และ settle width42 เหลือรายละเอียดน้อย แนะนำชุดนี้เพื่อให้ผู้นำเข้าถ่ายคลิปตรวจ ไม่รับรองว่าแก้ความอ่านง่ายทุกเฟรมแล้ว ไม่มีภาพ navy ใช้แทนหลักฐานฉากจริง

## แหล่งภาพและกระบวนการ

อ่าน AGENTS.md, CLAUDE.md, CURRENT_STATE.md, คู่มือ ANIMATION_PROMPT_QUALITY_TH.md, แผน W1–W8/rollout, brief WB trio, เอกสาร/metadata/package ต้นทาง, `boss-signature-fx.ts`, `boss-signature-art.json`, PR #292 และ README ของคลิปแล้ว ใช้ skill โปรเจกต์ `fateweave-codex-art-brief` ยึดขอบเขตภาพเท่านั้น

`source/` เก็บ generator outputs ทั้ง byte; `prompts.json` เก็บ prompt/ลำดับ reference; `seeds/` สำเนาเลเยอร์เดิม/R2 และ screenshot เฟรม 0 เป็น **reference เท่านั้น** ไม่ใช่ภาพใน layers และไม่นำเข้า atlas ภาพอ้างอิงทั้งหมดมาจาก Fateweave เท่านั้น

Generator ทำ Bolt/Tide เป็นแถวสามจังหวะ และ Wing เป็นหนึ่ง hold ภาพเดียว Normalize เต็ม canvas เป็น 768×256 หรือ 256×256 แล้วแบ่ง cell; Tide เพิ่ม RGB sigmoid 6x40% และริมม่วงอ่อนด้านใน silhouette (alpha threshold35%, EdgeIn Diamond:3) เพื่อให้ขอบอ่านได้ที่74px; composite source-atop alpha เดิม จึงรักษา silhouette, ขอบว่าง และช่องแตกเดิมแบบพิกเซลต่อพิกเซล ไม่เพิ่ม opaque footprint Source canvas อัตราส่วน Tide 2170×725 ถูกย่อเป็น 768×256 ตามแถวอ้างอิง; ไม่มีการอ้างว่า generator รักษาพิกัดได้เอง การตรึง alpha เดิมเป็นขั้นตอน normalization ที่ตรวจจริง

## ตรวจซ้ำ

ต้องมี ImageMagick และ Pillow 12.3.0; ไม่ต้องรันเกมหรือใช้ network

```sh
python3 -I incoming/ART-VFX-WB-TRIO-REV-001/build_revision.py
python3 -I incoming/ART-VFX-WB-TRIO-REV-001/build_revision.py --verify
```

`validation.json` ใช้รูปแบบ files → sha256/bytes/size/mode/frames และ checks รายเลเยอร์: alpha extrema, bbox, transparent pixels, clear margins L/T/R/B, alpha เท่าต้นทาง และ metadata คงเดิม hash ของ manifest เองไม่รวมใน manifest ให้เก็บ receipt ใน PR ผลตรวจนี้ไม่ใช่การอนุมัติภาพ

## ฝากถึง Claude — ขั้นตอนถัดไป

1. นำเข้าเฉพาะ 7 แถวที่ `replaces` ระบุจาก revision ใหม่ ห้ามเขียนทับ/ซ่อม source เดิม และไม่เปลี่ยน routing/anchor/width/pivot/offset/กติกา/save/catalog.ts/balance/playback timing
2. Repack lossless โดยแทนภาพชื่อเฟรมเดิม ตรวจภาพอื่นทุกเฟรมไม่เปลี่ยน และทำ integrity/alpha/atlas checks ตาม pipeline เดิม ไม่สรุป owner approval จากเทสต์
3. ถ่ายคลิปจริง **390px** ใหม่: Severing Bolt normal, Shadow Tide normal, Wing Gathering normal พร้อม waiting hold, Wing Gathering release และ Wing Gathering break (Bash) ให้เห็นก่อน/หลัง state จริง ตรวจ normal/fast/reduced motion ตามเกณฑ์เดิม รวม pose ไหล่/ปีกที่ highlight มาก และ Tide ทุกเป้าที่โดนจริง โดย HP/ตัวเลขยังอยู่บนสุด
4. ให้เจ้าของดูคลิปเพื่อเลือกภาพและอนุมัติ motion อีกครั้ง บันทึกคำอนุมัติจริง ไม่ merge #292 จากผลเทสต์หรือข้อแนะนำนี้

ไม่มีการแก้ src/tests/public/.github หรือเอกสารสถานะในงาน art-only นี้ ตาม brief WB trio หัวข้อกติการ่วม จึงฝาก handoff ไว้ใน NOTES ของแพ็กเกจแทน status documents เดิม
