# ART-UNIT-ANIMATION-A12-001 — ส่งต่อ Claude

2026-11-05 (Asia/Bangkok) · branch `art/art-unit-animation-a12-001`
Base `feature/fateweave-initial-prototype` @ `d5fe9eaa668ef6c9a7384a95b0f365ba72dee10a`
Art only · **รอเจ้าของเลือกภาพและอนุมัติ motion** · ห้าม merge โดย Codex

## R2 — Astrid deflect เท่านั้น · 2026-11-05

Claude ตรวจ 21 จาก 22 strips ผ่านตาม delegation งานภาพของเจ้าของวันที่ 2026-11-04 (ไม่ใช่ owner approval) จึงคง raw/spaced/cells/audits/preview ของท่าอื่นและข้อมูล strip ทั้ง 21 รายการเดิม byte-identical ไม่มีการ regenerate อีก 21 strips

R1 ของ deflect มีมือชิดอกและการเคลื่อนเล็กเกินไป เมื่อย่อตัวประมาณ 111px มองไม่ออกว่า “ผลักออก แล้วกวาดด้านข้างลง” เก็บ raw R1 bytes เดิมที่ `raw/rejected/astrid-deflect-r1-small-motion.png` SHA-256 เดิมยืนยันใน validation; เปลี่ยน prompt record เดิมเป็น rejected พร้อมเหตุผล ไม่มีการแต้มแก้ภาพ

R2 สร้างทั้งแถบ 6 เฟรมใน edit request เดียว แนบ seed Astrid เดิมเท่านั้น: เฟรม 2 ยกฝ่ามือซ้าย/กางศอก; เฟรม 3 เหยียดแขนออกขวาพ้นลำตัวระดับไหล่; เฟรม 4 แขนยังเหยียดแต่กวาดลงใกล้สะโพก; เฟรม 5 ค้างมือต่ำและมองตาม ทั้งแถบมีแอสโทรเลบหนึ่งชิ้นต่อเฟรมที่มือขวา ไม่มี VFX หรือเงาพื้น ตรวจภาพจริงแล้ว มือไม่ถูกตัด/ไม่มีอุปกรณ์ซ้ำ/พื้นโปร่งใส เฟรม 1 และ 6 ล็อกกลับ seed เดิม

ใช้ uniform raw-to-seed scale จากความสูง ready เหมือน R1; cell 640×512, logical x64, anchor (320,497), sole alpha>40 บน y496, timing 1/1.2/.75/1/.8/1. Audit เดิมไม่แก้: **median 0.9215, max 0.926**, ทุกเฟรมวัดได้ ไม่มี not-measured ผ่านเกณฑ์ median ≤1.15 / ทุก measured ≤1.20

`review/astrid-deflect-r1-vs-r2.png` เทียบ R1/R2 คู่กันทุกเฟรมบน `battle_forest.webp`: แถวบนใช้ scale คงที่จาก seed ให้ตัวสูง 111px (ไม่ fit รายเฟรม) แถวล่าง cell-height 512px. ตรวจที่ 111px แล้ว silhouette เฟรม 3 เป็นแขนยื่นสูง และเฟรม 4 เป็นแขนเฉียงต่ำต่างจาก ready และต่างกันชัด นี่เป็น offline review ไม่ใช่การทดสอบในเกม

คำแนะนำใน strips.json: **R2 replaces R1 for small motion**, status candidate. **รอเจ้าของ/Claude ตรวจ motion**; ไม่มี owner approval หรือ runtime integration และไม่ merge PR #157

ทำซ้ำเฉพาะท่านี้ (ไม่ rebuild ท่าอื่น):

```sh
PYTHONPATH=/tmp/a12-python python3 incoming/ART-UNIT-ANIMATION-A12-001/build_handoff.py --only astrid-deflect
python3 incoming/ART-UNIT-ANIMATION-A12-001/verify_remote.py
```

Build ยืนยัน SHA ของ protected files จาก commit R1 `0404c7ff` และข้อมูล strip อีก 21 รายการก่อนเขียน manifest/checksums ใหม่ หลักฐาน `validation.json:r2_review` รวม hashes ที่ต้องคงเดิม

ข้อความ R1 ด้านล่างเป็นประวัติ; สถานะ deflect ล่าสุดให้ยึด R2 ส่วนนี้

## ส่งมอบ

- Wynne 7 strips: attack, knot, toll, weave, hit, block, down; Astrid 7 strips: attack, deflect, dial, read, hit, block, down. Kael 8 strips: attack, gather, release, circle, stored, hit, block, down. รวม 114 generated action/reaction slots และ seed comparison แยกในทุกโฟลเดอร์เซลล์
- Kael ใช้ seed NEW-003 เท่านั้น: ระหว่างทำงานสาขาเกมรวม PR #150 แล้ว ตรวจอีกครั้งที่ `743adc3f2e4967917f331a35f5f6f6a528628665` จึงคัดลอก `unit/kael.png` จาก git object byte-for-byte และตรวจ SHA `5d9f344d4d44cad32c169e74780c2ff10bed401fd9f9dd43ea27f4c2171dde1c` ตรง validation ของ NEW-003 ไม่ใช้ NEW-002 Kael; ไม่ merge/import ไฟล์อื่นจากสาขาเกมเข้ามา
- คัดลอก Wynne/Astrid seed byte-for-byte จาก NEW-002, SHA-256 ตรง brief ทั้งคู่ ดู `seeds.json` ไม่มีภาพ cast อื่นเป็น input; artwork ต้นฉบับจาก Fateweave เท่านั้น ตัวละครแห่งค่ายทหารรับจ้าง

## วิธีสร้างและไฟล์

สร้าง whole strip ต่อท่าในคำขอ edit เดียว แนบ seed ตัวตรงกันเป็น model เท่านั้น ทำ Wynne ให้ครบและ audit ก่อนเริ่ม Astrid และทำ Kael หลังตรวจว่า NEW-003 พร้อมบนสาขาเกม `raw/` คือ PNG ต้นฉบับที่ไม่แก้พิกเซลจากเครื่องมือ; `raw/rejected/` เป็น deflect รอบที่เกิดอุปกรณ์ซ้ำและ Kael hit รอบที่พื้นหลังผิด **ห้ามใช้** รอบแก้ไขแนะนำอยู่ใน `raw/astrid-deflect.png` ไม่มี R2 ตัวเลือกอื่น เพราะเป็นการแก้ข้อผิดพลาด ไม่ใช่เสนอความหมายท่าคนละแบบ; stored ของ Kael ใช้ศอกงอระยะสั้นเป็น candidate แนะนำ ท่าอ่านได้ชัดจึงไม่เพิ่ม variant

`prompts.json` เก็บ prompt จริง อ้างอิง artifact UUID และ output path; generation job ID ไม่เปิดเผยจึงเป็น null ไม่แต่ง ID ไม่มี base64 ภาพใน JSON รอบ hit ของ Wynne และ read ของ Astrid ที่พื้นหลังผิดถูกสร้างใหม่ก่อนรับเข้าชุด final (ไฟล์รอบผิดยังอยู่ใน workspace generator outputs ไม่ใช่ asset ส่งมอบ)

`spaced/` และ `cells/<character>-<move>/` ใช้ cell 640×512 สำหรับ Wynne/Astrid และ 768×512 สำหรับ Kael เพื่อเพิ่มขอบโปร่งใสซ้ายขวาให้ท่านอนและแขนกาง logical source ยังคง 512×512 ที่ offset x64 / x128 ตามลำดับ จุดยึด cell `(320,497)` / `(384,497)`; pivot logical `(0.5,497/512)` เส้น sole alpha>40 อยู่ y496, ground y497. `000.png` เป็น seed เดิมเพิ่มขอบ; `001.png` ready ล็อกกลับ seed; ท่าสุดท้ายกลับ seed ยกเว้น down ที่ค้างนอนหมดสติ

ทุกท่าใช้ขนาดตัวปลายทางเทียบ seed ที่ scale 1.0 เหมือนกันทั้งตัวละคร ปัจจัย raw-to-seed ต่างกันตามความสูงภาพที่ generator ส่งออก: คำนวณจาก raw ready เทียบความสูง seed แล้วใช้ uniform scale เดียวทั้ง strip ไม่มีการ fit/ย่อหัว/บิด/ปรับขนาดเฉพาะเฟรม แยก component และเก็บขอบ anti-alias ใกล้ component 3px เพื่อตัด dust แยกตัวจากพื้นโปร่งใส raw ไม่ถูกแตะ ไม่มีการวาดเพิ่ม

`strips.json` เรียง slot ตาม brief มี descriptions, scale, offsets, timing weights และ proposed ActionId mapping; Claude ตัดสิน mapping สุดท้ายเมื่อ classes ลง code. Preview PNG กว้าง 390px แสดง seed และทุกเฟรมใน scale เดียวกัน ไม่มี per-pose fitting

## คุณภาพและข้อจำกัด

รัน `scripts/unit-anatomy-audit.py --cells` เทียบ seed ของแต่ละ strip ทั้ง 22 ชุด เก็บ JSON + stdout ใน `audits/`; ทุก strip ผ่าน median ≤1.15 และทุกเฟรมที่วัดได้ ≤1.20 ดูค่าล่าสุดใน `validation.json`.

**Astrid down frame 004 เป็น not-measured** (หน้าตะแคง/หลับ; inlier ต่ำ) ไม่ถือเป็นผลผ่านอัตโนมัติ ตรวจด้วยตาเทียบ seed และ preview แล้ว: ขนาดหัวไม่ถูกย่อ ตัวนอนเต็มความยาว ขาปลายเท้าไม่ถูกตัด หลับตาและถือแอสโทรเลบใกล้ตัว **Kael down frame 004 เป็น not-measured เช่นกัน**: ตรวจด้วยตาเทียบ seed/preview แล้ว หัวไม่ถูกย่อ ลำตัว/แขนขาเต็มความยาว หลับตาและรองเท้า/ปลายผ้าครบ ไม่มีเฟรมอื่นที่ not-measured ทั้ง 22 ชุด. ค่า audit สุดท้าย: Wynne median สูงสุด 1.005 / max 1.048; Astrid median สูงสุด 1.013 / max 1.033; Kael median สูงสุด 1.060 / max 1.086. ตรวจ offline preview ทั้งสามตัวละครแล้ว รวม costume, doll/short thread, มือ, ring, gutters และท่านอน; deflect รอบเก่ามี ring ซ้ำจึงปฏิเสธและสร้างใหม่ให้เหลือหนึ่งชิ้น

ไม่มี VFX/เงาพื้น/เส้นเคลื่อนไหวใน body final. ลายดาวสีทองบนเสื้อคลุมเป็นลายผ้า ไม่ใช่ layer VFX. ไม่มี runtime integration, atlas packing, CI หรือการทดสอบในเกมในงาน art-only นี้ ผล audit และการตรวจ offline **ไม่ใช่ owner artwork/motion approval**. Claude นำเข้าตามงานแยกและจับคลิปจริง 390px เมื่อ classes พร้อม

## ทำซ้ำ / ตรวจ remote

Dependencies: Python 3, Pillow, NumPy, SciPy, opencv-python-headless. Session นี้ติดตั้ง OpenCV ที่ `/tmp/a12-python` จึงใช้:

```sh
PYTHONPATH=/tmp/a12-python python3 incoming/ART-UNIT-ANIMATION-A12-001/build_handoff.py
python3 incoming/ART-UNIT-ANIMATION-A12-001/verify_remote.py
```

Build ตรวจ seed hash, raw clipping/frame count, shared strip scale, anatomy gate, decode PNG ทุกภาพ; สร้าง validation และ SHA256SUMS ทุกไฟล์ (ยกเว้น checksum ตัวเอง). `verify_remote.py` fetch branch ด้วย git ปกติ ตรวจ SHA ทุกไฟล์และ Pillow decode จาก remote git object bytes รวมไฟล์ raw ขนาดเกิน 768 KB และตรวจ diff เป็น additions ใต้ package นี้เท่านั้น

ข้อกำหนดเฉพาะงานที่ให้เพิ่มไฟล์ใน package นี้เท่านั้นมีลำดับเหนือ handoff ทั่วไปใน AGENTS.md จึงบันทึกส่งต่อที่ NOTES.md นี้ ไม่แก้ CURRENT_STATE หรือ handoff นอก package ไม่แตะ runtime/rules/content/save/balance/tests/public/workflows และไม่ merge
