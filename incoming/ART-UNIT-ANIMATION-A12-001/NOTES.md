# ART-UNIT-ANIMATION-A12-001 — ส่งต่อ Claude

2026-11-05 (Asia/Bangkok) · branch `art/art-unit-animation-a12-001`
Base `feature/fateweave-initial-prototype` @ `d5fe9eaa668ef6c9a7384a95b0f365ba72dee10a`
Art only · **รอเจ้าของเลือกภาพและอนุมัติ motion** · ห้าม merge โดย Codex

## ส่งมอบ / pending

- Wynne 7 strips: attack, knot, toll, weave, hit, block, down; Astrid 7 strips: attack, deflect, dial, read, hit, block, down. รวม 72 generated action/reaction slots และ seed comparison แยกในทุกโฟลเดอร์เซลล์
- **Kael ทั้ง 8 ท่า pending**: `incoming/ART-CHAR-CLASS-NEW-003/` ไม่มีบน base commit ที่ตรวจ ไม่ใช้ Kael NEW-002 ซึ่งสัดส่วนหัวเล็กเกินไป ไม่มีการสร้างภาพ Kael หรือใช้อีกคนแทน
- คัดลอก Wynne/Astrid seed byte-for-byte จาก NEW-002, SHA-256 ตรง brief ทั้งคู่ ดู `seeds.json` ไม่มีภาพ cast อื่นเป็น input; artwork ต้นฉบับจาก Fateweave เท่านั้น ตัวละครแห่งค่ายทหารรับจ้าง

## วิธีสร้างและไฟล์

สร้าง whole strip ต่อท่าในคำขอ edit เดียว แนบ seed ตัวตรงกันเป็น model เท่านั้น ทำ Wynne ให้ครบและ audit ก่อนเริ่ม Astrid `raw/` คือ PNG ต้นฉบับที่ไม่แก้พิกเซลจากเครื่องมือ; `raw/rejected/` เป็น deflect รอบที่เกิดอุปกรณ์ซ้ำ **ห้ามใช้** รอบแก้ไขแนะนำอยู่ใน `raw/astrid-deflect.png` ไม่มี R2 ตัวเลือกอื่น เพราะเป็นการแก้ข้อผิดพลาด ไม่ใช่เสนอความหมายท่าคนละแบบ

`prompts.json` เก็บ prompt จริง อ้างอิง artifact UUID และ output path; generation job ID ไม่เปิดเผยจึงเป็น null ไม่แต่ง ID ไม่มี base64 ภาพใน JSON รอบ hit ของ Wynne และ read ของ Astrid ที่พื้นหลังผิดถูกสร้างใหม่ก่อนรับเข้าชุด final (ไฟล์รอบผิดยังอยู่ใน workspace generator outputs ไม่ใช่ asset ส่งมอบ)

`spaced/` และ `cells/<character>-<move>/` ใช้ cell 640×512 เพื่อเพิ่มขอบโปร่งใสซ้ายขวาให้ท่านอนและแขนกาง logical source ยังคง 512×512 ที่ offset x64 จุดยึด cell `(320,497)`; pivot logical `(0.5,497/512)` เส้น sole alpha>40 อยู่ y496, ground y497. `000.png` เป็น seed เดิมเพิ่มขอบ; `001.png` ready ล็อกกลับ seed; ท่าสุดท้ายกลับ seed ยกเว้น down ที่ค้างนอนหมดสติ

ทุกท่าใช้ขนาดตัวปลายทางเทียบ seed ที่ scale 1.0 เหมือนกันทั้งตัวละคร ปัจจัย raw-to-seed ต่างกันตามความสูงภาพที่ generator ส่งออก: คำนวณจาก raw ready เทียบความสูง seed แล้วใช้ uniform scale เดียวทั้ง strip ไม่มีการ fit/ย่อหัว/บิด/ปรับขนาดเฉพาะเฟรม แยก component และเก็บขอบ anti-alias ใกล้ component 3px เพื่อตัด dust แยกตัวจากพื้นโปร่งใส raw ไม่ถูกแตะ ไม่มีการวาดเพิ่ม

`strips.json` เรียง slot ตาม brief มี descriptions, scale, offsets, timing weights และ proposed ActionId mapping; Claude ตัดสิน mapping สุดท้ายเมื่อ classes ลง code. Preview PNG กว้าง 390px แสดง seed และทุกเฟรมใน scale เดียวกัน ไม่มี per-pose fitting

## คุณภาพและข้อจำกัด

รัน `scripts/unit-anatomy-audit.py --cells` เทียบ seed ของแต่ละ strip ทั้ง 14 ชุด เก็บ JSON + stdout ใน `audits/`; ทุก strip ผ่าน median ≤1.15 และทุกเฟรมที่วัดได้ ≤1.20 ดูค่าล่าสุดใน `validation.json`.

**Astrid down frame 004 เป็น not-measured** (หน้าตะแคง/หลับ; inlier ต่ำ) ไม่ถือเป็นผลผ่านอัตโนมัติ ตรวจด้วยตาเทียบ seed และ preview แล้ว: ขนาดหัวไม่ถูกย่อ ตัวนอนเต็มความยาว ขาปลายเท้าไม่ถูกตัด หลับตาและถือแอสโทรเลบใกล้ตัว เฟรมอื่นไม่มี not-measured. ตรวจ offline preview ทั้งสองตัวละครแล้ว รวม costume, doll/short thread, มือ, ring, gutters และท่านอน; deflect รอบเก่ามี ring ซ้ำจึงปฏิเสธและสร้างใหม่ให้เหลือหนึ่งชิ้น

ไม่มี VFX/เงาพื้น/เส้นเคลื่อนไหวใน body final. ลายดาวสีทองบนเสื้อคลุมเป็นลายผ้า ไม่ใช่ layer VFX. ไม่มี runtime integration, atlas packing, CI หรือการทดสอบในเกมในงาน art-only นี้ ผล audit และการตรวจ offline **ไม่ใช่ owner artwork/motion approval**. Claude นำเข้าตามงานแยกและจับคลิปจริง 390px เมื่อ classes พร้อม

## ทำซ้ำ / ตรวจ remote

Dependencies: Python 3, Pillow, NumPy, SciPy, opencv-python-headless. Session นี้ติดตั้ง OpenCV ที่ `/tmp/a12-python` จึงใช้:

```sh
PYTHONPATH=/tmp/a12-python python3 incoming/ART-UNIT-ANIMATION-A12-001/build_handoff.py
python3 incoming/ART-UNIT-ANIMATION-A12-001/verify_remote.py
```

Build ตรวจ seed hash, raw clipping/frame count, shared strip scale, anatomy gate, decode PNG ทุกภาพ; สร้าง validation และ SHA256SUMS ทุกไฟล์ (ยกเว้น checksum ตัวเอง). `verify_remote.py` fetch branch ด้วย git ปกติ ตรวจ SHA ทุกไฟล์และ Pillow decode จาก remote git object bytes รวมไฟล์ raw ขนาดเกิน 768 KB และตรวจ diff เป็น additions ใต้ package นี้เท่านั้น

ข้อกำหนดเฉพาะงานที่ให้เพิ่มไฟล์ใน package นี้เท่านั้นมีลำดับเหนือ handoff ทั่วไปใน AGENTS.md จึงบันทึกส่งต่อที่ NOTES.md นี้ ไม่แก้ CURRENT_STATE หรือ handoff นอก package ไม่แตะ runtime/rules/content/save/balance/tests/public/workflows และไม่ merge
