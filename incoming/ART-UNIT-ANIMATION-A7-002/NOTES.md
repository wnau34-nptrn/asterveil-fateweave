# ART-UNIT-ANIMATION-A7-002 — ลลิน / วิลา redraw

2026-10-30 (Asia/Bangkok) · branch `art/art-unit-animation-a7-002` · base `feature/fateweave-initial-prototype` @ `d83cd71da71971a1ce3fed74a4b3d069636bbcd3`

ส่ง 8 แถบ: ลลิน dance-strike, circle-spin, echo-closing-step, hit, block, down; วิลา echo-closing-step, down เท่านั้น ไม่มีภาพที่ไม่ผ่านเกณฑ์ตัวเลขเป็นตัวเลือกใน package นี้ ยัง **ไม่ใช่การอนุมัติภาพหรือ motion** และยังไม่ได้นำเข้าเกม

## ไฟล์

- `seeds/`: exact crop A7-001 เดิม byte-identical พร้อม provenance/hash ใน `seeds.json`
- `raw/`: PNG จาก ImageGen ทั้ง strip ไม่แก้ต้นฉบับ ไม่ประกอบภาพจากหลาย generation
- `spaced/`: RGBA ช่อง 640×512 โปร่งใส มีช่องว่างกว้างจริง พร้อม `cells/<ตัว>-<ท่า>/000.png` เป็น seed อ้างอิง; `001…` เป็นท่าที่สร้าง ไม่แทนท่าแรกด้วย seed เพื่อกลบปัญหา
- `lalin-preview-390.png`, `wila-preview-390.png`: seed เทียบทุกเฟรม ใช้ crop/scale เดียวกันทุกภาพ เป็นภาพ review ไม่ใช่คลิปจากเกม
- `prompts.json`: prompt จริง, references ที่แนบจริง, generation ID ของภาพที่ส่ง
- `strips.json`: ลำดับท่าเดิม/route, shared scale, offsets, audit summary, สถานะรอเจ้าของ
- `audits/`: JSON และ stdout/stderr ของตัวตรวจเดิมทุกแถบ
- `build_handoff.py`: สร้าง spaced/cells/preview/metadata/audit ใหม่ได้
- `verify_remote.py`: ตรวจ SHA-256/ขนาด/decode จาก git objects หลัง fetch กลับ
- `validation.json`: hash/ขนาด/PNG decode ของทุกไฟล์ ยกเว้นตัว manifest เอง

## Anatomy audit

รัน `python3 scripts/unit-anatomy-audit.py --cells incoming/ART-UNIT-ANIMATION-A7-002/cells/<ตัว>-<ท่า> --json ...` ทุกแถบผ่าน build script โดยใช้สคริปต์เดิมไม่แก้เกณฑ์หรือ matcher

| ตัว / ท่า | เฟรม | median | max ที่วัดได้ | วัดไม่ได้ (เลขท่า 1-based) |
| --- | ---: | ---: | ---: | --- |
| lalin dance-strike | 6 | 1.116 | 1.148 | — |
| lalin circle-spin | 6 | 1.073 | 1.085 | 3, 4 |
| lalin echo-closing-step | 6 | 1.132 | 1.169 | — |
| lalin hit | 4 | 1.027 | 1.057 | — |
| lalin block | 4 | 1.041 | 1.053 | — |
| lalin down | 4 | 1.076 | 1.078 | 4 |
| wila echo-closing-step | 6 | 1.127 | 1.163 | — |
| wila down | 4 | 1.098 | 1.108 | 4 |

เกณฑ์ brief คือ median ≤1.15 และทุกเฟรมที่วัดได้ ≤1.20; ทั้ง 8 แถบผ่านเกณฑ์นี้ ตัวตรวจเดิมติดป้าย `drift` ที่เกิน ±12% และคืน exit 1 ได้แม้ยังผ่านเกณฑ์ brief จึงเก็บ stdout และ JSON จริงไว้ ไม่เปลี่ยน `drift` เป็น `ok` ในผลต้นทาง

**not-measured ไม่ใช่ผ่าน:** circle-spin 3/4 หันหลัง/ด้านข้าง, down 4 นอนราบทั้งสองตัว ตรวจภาพจริงประกอบแล้ว: หมุนโดยเปลี่ยนมุมของศีรษะและลำตัว; down จบด้วยร่างแนวนอน เท้าอยู่ด้านซ้าย ศีรษะด้านขวา ไม่มีเฟรมลุกกลับ แต่ไม่มีหลักฐาน matcher ยืนยันสัดส่วนของสี่เฟรมนี้ ต้องตรวจภาพ/คลิปโดยเจ้าของอีกขั้น ห้ามอ้างว่าทุกเฟรมได้ผลวัดผ่าน

## วิธีจัดภาพและข้อจำกัด

ใช้ whole-strip generation ต่อท่า อ้าง seed เดิม ไม่ยืดลำตัว บีบหัว หรือปรับ scale รายเฟรม รอบแรก circle/echo ยังหัวใหญ่ จึงวาดใหม่จาก seed โดยไม่แนบแถบหัวโต; block วาดใหม่ให้เฟรมแรกยกป้องกันและเฟรมกลางไขว้แขน ทุก generation ที่เกินเกณฑ์ถูกตัดออก ไม่ส่งเป็นทางเลือก

การจัด cells ยึดวิธี shared area scale ของ A7-001: `scale = .42 * sqrt(seed alpha area / first figure alpha area)` ใช้ตัวคูณนี้ทั้งแถบ และ resize seed ด้วย factor .42 เท่ากัน ตัวคูณ .42 เป็น convention ของ pipeline เดิม ไม่ใช่การลดหัวเฉพาะส่วน; renderer ฝั่ง integration ต้องชดเชย factor เช่นเดิม ห้ามเปรียบเทียบ cells ย่อกับ seed เต็ม 512 โดยไม่ใช้ factor เดียวกัน

แยก figure ด้วย connected components alpha >80 + nearest-component ownership เศษ alpha จางนอกระยะ 3px ถูกตัดเฉพาะในภาพ derived; raw ไม่เปลี่ยน ใช้ bbox-center ใน X และ Y offset ร่วมอ้างพื้นของท่าแรกที่ y=497 รักษาความต่างระดับจากต้นทาง ไม่มี per-frame Y snap มี assert จำนวนตัว/ขอบต้นทาง/ขอบ cells เพื่อไม่ตัดพัดหรือริบบิ้น แถบ spaced ใช้ช่องกว้าง 640×512 แบบ A7-001 ที่ผ่านแล้ว แต่ปรับ common scale ด้วย convention integration; raw รุ่นใหม่มีขนาด generation ต่างจาก raw A7-001 จึงห้ามคัดค่า pixel scale เดิมมาใช้ตรง ๆ

Seed เต็มยังเป็น logical 512×512 พื้นเท้า y=497 ตามเดิม จุดวาง seed ที่ย่อใน audit cells คือ (212,288); generated ยึด sole reference เดียวกันใน logical review canvas ช่อง X เพิ่ม padding เท่านั้น ไม่เปลี่ยน facing

## ทำซ้ำ / ส่งต่อ Claude

ต้องมี Pillow, numpy, scipy, opencv-python-headless จากนั้น:

```bash
python3 incoming/ART-UNIT-ANIMATION-A7-002/build_handoff.py
git fetch origin art/art-unit-animation-a7-002
python3 incoming/ART-UNIT-ANIMATION-A7-002/verify_remote.py FETCH_HEAD
```

ตรวจ preview 390px, true alpha, จำนวนเฟรม, ไม่มี source/cell clipping, seed hash และ anatomy แล้ว ไม่รันเทสต์ runtime เพราะไม่มี runtime เปลี่ยน ไม่ได้อัดคลิปเกมและไม่ได้อ้างว่า CI อนุมัติภาพ

Claude: ตรวจไฟล์จาก fetched commit, เลือก raw/spaced ตาม pipeline, normalize/pack เข้า atlas ลลิน/วิลาเดิมโดยคง seed/pivot/timing/route และตรวจ anatomy หลัง pack อีกรอบ จากนั้นอัดคลิปจริง 390px ให้เจ้าของเลือกภาพและอนุมัติ motion โดยเฉพาะ spin/back/prone ที่วัดไม่ได้ ไม่ merge PR งานภาพนี้เอง

ไฟล์ทั้งหมดอยู่เฉพาะ `incoming/ART-UNIT-ANIMATION-A7-002/`; ไม่แตะภาพเดิม, `src/`, `tests/`, `public/`, `.github/` บันทึกส่งต่อไว้ที่นี่ตามขอบเขตเฉพาะงาน แทนการแก้ docs handoff นอก directory ที่ผู้ใช้กำหนด
