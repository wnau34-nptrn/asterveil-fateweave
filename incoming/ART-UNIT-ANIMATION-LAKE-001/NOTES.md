# ART-UNIT-ANIMATION-LAKE-001 — ทะเลสาบเงาจันทร์

**สร้างภาพแล้ว** สำหรับศัตรู 6 ตัว รวม 8 แบบและ 35 strips (187 เฟรม) เจ้าของเป็นผู้เลือกภาพและอนุมัติ motion แพ็กเกจนี้ยังรอนำเข้าเกมโดย Claude

สาขางาน `art/art-unit-animation-lake-001` เริ่มจาก `origin/claude/map4-moonlake` ที่ `72c3d0584c0b98c8267314b7d89461a5ac589e4f` ไฟล์ส่งมอบทั้งหมดอยู่ในโฟลเดอร์นี้

## ดูภาพและเลือกแบบ

- [ภาพรวม 390px](preview-390.png) เรียงตัวตามตารางจากบนลงล่าง
- แต่ละลิงก์ในตารางเป็นภาพเคลื่อนไหว WebP กว้าง 390px ในฉากต่อสู้รอยแยกเดิม `public/assets/art/battle_riftline.webp` เพราะสาขาฐานยังไม่มี `bg_lake` พรีวิวจัดตัวละครตามแถวและขนาดสำหรับทบทวนภาพ ระยะระหว่างคลิปและเวลาต่อเฟรมเป็นจังหวะสำหรับดูงานภาพ
- รูปร่างใหม่หันซ้าย แสงเงินจากบนซ้าย เน้นสีน้ำเงินทะเลสาบกับม่วงเฉพาะจุด เงาสะท้อนเป็นนักดาบสวมหน้ากากต้นฉบับ ใช้ดาบเดี่ยวและความทึบสูงสุด 88%

| ตัวละคร / แบบ | พรีวิว | ลำดับท่าในพรีวิว |
| --- | --- | --- |
| Tide Slime | [R1](preview/tide-slime-r1-390.webp) | Water Spit → hit → down |
| Mist Wisp | [R1](preview/mist-wisp-r1-390.webp) | Mist Needle → hit → down → idle |
| Stone Crab | [R1](preview/stone-crab-r1-390.webp) | Pincer → hit → down |
| Shadow Serpent **R1 แนะนำ** | [งูขดบนแผ่นหิน](preview/shadow-serpent-r1-390.webp) | Shadow Fang → Venom Spit → Coil Gathering → Crushing Coil → hit → down |
| Shadow Serpent R2 | [นาคโผล่จากน้ำ](preview/shadow-serpent-r2-390.webp) | Shadow Fang → Venom Spit → Coil Gathering → Crushing Coil → hit → down |
| Weeping Siren **R1 แนะนำ** | [นั่งบนโขดหิน](preview/weeping-siren-r1-390.webp) | Tide Lash → Weeping Song → Drowning Call → hit → down |
| Weeping Siren R2 | [ลอยด้วยหางน้ำ](preview/weeping-siren-r2-390.webp) | Tide Lash → Weeping Song → Drowning Call → hit → down |
| Mirror Shade | [R1](preview/mirror-shade-r1-390.webp) | Mirror Strike → hit → down |

R1 ของอสรพิษอ่านรูปขดและการกดตัวได้ชัดในช่องใหญ่ ส่วน R1 ของนางเงือกมีโขดหินเป็นจุดคงที่ให้เห็นท่าก้ม เงย และแรงสะบัดของผมเมื่อย่อภาพ

## ข้อมูลสำหรับ Claude

- `seeds/` เก็บ stand-in เดิม 6 ภาพที่ crop จาก atlas ตาม `assets.ts` และภาพพร้อมเคลื่อนไหว 8 ภาพ `seeds.json` บันทึก atlas, cell, ขอบ alpha, เส้นพื้น และ SHA-256
- `sources/` เก็บภาพต้นฉบับจาก ImageGen พร้อม SHA-256 และ prompt ใน `prompts.json` ใช้ภาพรวมเฉพาะ 7 ช่องที่ระบุใน `seeds.json` และใช้ `serpent-r2.png` เป็นนาค R2 โดยตรง
- `raw/` เก็บ RGBA PNG แถวเดียวต่อ intent หรือ reaction ช่องละ 512×512 อ่านจากซ้ายไปขวา เส้นพื้นร่วม y=497 รักษาระยะลอยของ Mist Wisp และ Siren R2 ไว้ในเซลล์ ท่าล้มจบที่ down hold
- `strips.json` ระบุชื่อ intent ตามเกม จำนวนเฟรม ลำดับจังหวะ ขอบ alpha ช่องว่าง และดัชนีใน layout ของ stand-in ช่วง attack คือ 1–8, skill 9–16, hit 17–18, down 19–21 และ Mist Wisp idle 22–24 ที่ 160 ms จุดปล่อยหรือสัมผัสอยู่เฟรมที่ 5 ในแถบแอ็กชัน VFX และกระสุนอยู่ในงานแยก
- เกมปัจจุบันแชร์ช่อง `skill` ให้ Venom Spit, Coil Gathering และ Crushing Coil และแชร์อีกชุดให้ Weeping Song กับ Drowning Call การสลับ key อย่างเดียวจะเลือกได้หนึ่ง strip ต่อช่อง จึงส่งทุก intent แยกไฟล์โดยคงจำนวนเฟรมของช่องเดิมไว้ หากต้องการให้ทุกท่าแสดงคนละ motion ตอนนำเข้า Claude ต้องกำหนดเส้นทางคลิปสำหรับ intent ที่ใช้ช่องร่วมกัน
- Motion มาจากภาพพร้อมเคลื่อนไหวเดียวต่อแบบและ pose tracks ใน `motion.py` ใช้สเกลเดียวตลอดแถบและอิงจุดยึดเดียวทุกคลิป เฟรมเปิดและปิดของแถบแอ็กชันใช้พิกเซลเดียวกับภาพ ready

## รันซ้ำ

ใช้ Python 3.10 ขึ้นไปกับ Pillow, NumPy และ opencv-python-headless จากราก repository

```bash
python incoming/ART-UNIT-ANIMATION-LAKE-001/build_handoff.py --sources incoming/ART-UNIT-ANIMATION-LAKE-001/sources
python incoming/ART-UNIT-ANIMATION-LAKE-001/build_handoff.py --verify
```

คำสั่งแรก crop seed เดิม ประกอบ seed ใหม่จากภาพต้นฉบับ สร้าง strips และพรีวิว ตรวจ mapping กับ `unit-frames.ts` และรันฟังก์ชันตรวจจาก `scripts/unit-anatomy-audit.py` ทุกเฟรม คำสั่งที่สองตรวจชุดไฟล์ SHA-256 และ decode ทุกเฟรมของ PNG/WebP ด้วย Pillow ผลการวัดเชิงตัวเลขอยู่ใน `validation.json` ภาพและ motion รอเจ้าของอนุมัติก่อนนำเข้าเกม
