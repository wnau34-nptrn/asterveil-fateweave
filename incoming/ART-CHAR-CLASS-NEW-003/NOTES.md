# ART-CHAR-CLASS-NEW-003 — ส่งต่อ Claude: แก้สัดส่วน Kael

2026-11-04 (Asia/Bangkok) · branch `art/art-char-class-new-003`
base `feature/fateweave-initial-prototype` @ `d5fe9eaa668ef6c9a7384a95b0f365ba72dee10a`
**รอเจ้าของอนุมัติภาพ — ห้าม merge / ยังไม่ integrated**

วาดเฉพาะ static battle unit ของ Kael ใหม่: ขยายกะโหลก/หน้า/ตาจริง ไม่ใช้ยอดมวยผมเป็นยอดหัว ยกสะโพกและคงฝ่ามือต่ำ เข่างอ เท้ากว้างที่สุดในสามคนใหม่ เสื้อ umber ผ้าพันมือ สายคาดทอง กางเกง charcoal ผ้าพันขาและรองเท้าแตะคงเอกลักษณ์เดิม ใบหน้า chibi กลมขึ้นจึงสร้าง portrait ที่เข้าคู่กันด้วย หนึ่งผลงานสุดท้าย ไม่ใช่ชุดให้เลือก

## ไฟล์ส่งมอบ

- `unit/kael.png`: 512×512 RGBA หันขวา alpha จริง ไม่มีเงาพื้น ปราณ ตัวหนังสือ หรืออุปกรณ์ใหม่ pivot `(0.5,497/512)`
- `portrait/kael.png`: 512×512 ภาพใกล้พื้นหลังลานฝึก หน้า/ตา/ผม/ชุดเข้าคู่ unit ใหม่
- `sources/`: PNG output ตัวสร้างภาพ 4 ไฟล์ **ไม่แก้ไข bytes/metadata**; unit รอบ 01/02 ถูกแทนที่ เก็บเพื่อ audit เท่านั้น ผลสุดท้ายมาจาก `kael-unit-03.png` และ `kael-portrait-01.png`
- `prompts.json`: prompt จริง ภาพที่แนบ output artifact UUID ที่เครื่องมือเปิดเผย; ไม่มี separate generator job ID จึงบันทึก null ไม่แต่ง ID ไม่มี base64 ใน JSON
- `review/lineup.png`: 12 allies ปัจจุบัน + Kael ใหม่ + Wynne/Astrid เดิม เซลล์ 115px เท่ากันบน forest background พร้อม silhouette ดำ
- `review/kael-before-after.png`: NEW-002/NEW-003 ในเซลล์ 512px เท่ากัน และแถว 115px บนพื้นหลังเดียวกัน
- `review/anatomy.png`, `review/portraits-40.png`, `review/visual-inspection.json`: หลักฐานการตรวจด้วยตา; `audit-*` เป็น input/output สคริปต์ anatomy ไม่ใช่ art เพิ่ม
- `review/reference-unit-01.png`: intermediate ที่แนบตอนสร้างรอบ 02 เก็บเพื่อทำ reference chain ให้ตรวจย้อนกลับได้ ไม่ใช่ตัวเลือกส่งมอบ

## ผลวัด (ไม่รวมมวยผม)

| Landmark / ขนาด | ค่าที่ final 512px |
| --- | --- |
| skull crown / topknot tip / chin | y62 / y31 / y209 |
| crown → chin, inclusive | **148px** |
| crown → sole, inclusive | **435px** |
| head/body ratio, crown basis | **0.340230** |
| topknot เพิ่มเหนือ crown | 31px |
| สองเท้าบน y496 (alpha >40) | x61–93 และ x413–447; ทุก column อยู่ใน validation |
| alpha bounds, right/bottom exclusive | `[47,31,466,497]` |
| ความกว้าง silhouette | 419px (NEW-002 410px) |

ตำแหน่ง crown/chin ตรวจด้วยตาจาก source `(671,122)` / `(670,497)` ความไม่แน่นอนประมาณ ±2px ที่ final ใช้ inclusive extents ไม่วัดจากยอดมวยผม ตรวจว่าเท้าทั้งสองสัมผัส baseline จริง ไม่วาด pixel ต่อใต้เท้า ไม่มีการบิดภาพหรือขยาย/ย่อหัวแยกส่วน: alpha threshold >40 ตัด dust แล้ว uniform resize 1254→491px และ translate `(14,14)` เท่านั้น ไม่ต้องหมุน (0°) source คงเดิม

## Anatomy audit และการตรวจด้วยตา

รันสคริปต์เดิม **ไม่แก้ไข** โดยจัด reference เป็น `000.png` และ Kael ใหม่เป็น `001.png`:

```bash
python3 scripts/unit-anatomy-audit.py --cells incoming/ART-CHAR-CLASS-NEW-003/review/audit-corin --json incoming/ART-CHAR-CLASS-NEW-003/review/audit-corin.json
python3 scripts/unit-anatomy-audit.py --cells incoming/ART-CHAR-CLASS-NEW-003/review/audit-garran --json incoming/ART-CHAR-CLASS-NEW-003/review/audit-garran.json
```

เครื่องนี้ติดตั้ง OpenCV/NumPy ชั่วคราวนอก repo และรันด้วย `PYTHONPATH=/tmp/kael-python`:

- Corin → Kael: scale **1.006**, **4 inliers**, `not-measured` (ต่ำกว่า min12) — **ไม่ใช่ pass**
- Garran → Kael: scale **0.984**, **15 inliers**, `ok` ตาม tolerance ±12%

SIFT เดิมออกแบบเทียบตัวเดียวกันข้ามเฟรม ตัวละครคนละชุด/รายละเอียดอาจ match ไม่ได้หรือ match รายละเอียดที่ไม่ใช่กะโหลก จึงใช้เป็นหลักฐานเสริมเท่านั้น ไม่ใช้แทน landmark/การตรวจด้วยตา/การอนุมัติของเจ้าของ

Codex **ดูจริง** ทั้ง lineup 115px, silhouette, before/after, anatomy 512px และ portrait 40px: หน้า/ตาใหญ่ขึ้นจาก NEW-002 มืออ่านชัด สะโพกสูงขึ้น ท่ากว้างยังอยู่ สัดส่วนเข้า cast มากขึ้น หัวสูงตามเป้า 148px ซึ่งเล็กกว่า landmark แนวตั้งของ Corin/Garran เล็กน้อย แต่ความกว้างใบหน้า/ตาอ่านใกล้กัน รายละเอียดตรวจและ hash ของภาพที่ดูอยู่ใน `review/visual-inspection.json` นี่ไม่ใช่ owner approval และไม่ได้ทดสอบในเกม

อ้างอิงตัวตนจาก NEW-002 unit (ตรวจ SHA ตรง `cff332c889f5c677a8e7aef7d6b1bd1a75d899a8e342facabb27f233f80ed0d2`) และ portrait; สัดส่วนจาก Corin `metta` cell6 กับ Garran cell0 ใน **`units_mercs.webp` ตาม `assets.ts` จริง** (brief เขียน Garran units.webp แต่ registry ชี้ mercs) ไม่คัดลอกชุดหรือท่า เส้น Garran ใน lineup ตรวจใหม่: hair y66, chin/beard y235; y198 ใน sheet เก่าตัดผ่านใบหน้า ไม่ใช่คาง

## ทำซ้ำ / ตรวจไฟล์ / ขอบเขต

```bash
python3 incoming/ART-CHAR-CLASS-NEW-003/package.py
python3 incoming/ART-CHAR-CLASS-NEW-003/verify_remote.py
```

`package.py` สร้าง unit/portrait/review และ manifests ใหม่ด้วย Pillow เขียนเฉพาะ package นี้; audit inputs เกิดจากเซลล์ใน registry ไม่แก้ atlas สคริปต์ตรวจ SHA ของภาพที่เคย inspect ถ้าผลเปลี่ยนจะให้ inspect ใหม่ `validation.json` รายงาน landmarks, transform, alpha/bounds/size, SHA/bytes/Pillow decode ทุกภาพ และ audit numbers; `SHA256SUMS` ครอบคลุมทุกไฟล์ยกเว้นตัวเองเพื่อไม่เกิด self-hash cycle

Push ด้วย git ปกติ แล้ว `verify_remote.py` fetch branch กลับ ตรวจทุก SHA กับ sums/validation, decode ภาพทุกไฟล์ด้วย Pillow จาก git object bytes และ assert diff เป็น additions ใต้ package นี้ทั้งหมด ผลตรวจ remote สุดท้ายอยู่ใน PR description ไม่ใช้ API text แทน bytes ภาพ

อ่าน AGENTS/CLAUDE, animation quality guide, project art brief skill, NEW-002 NOTES และ handoff scale fix แล้ว (ไฟล์ scale fix เพิ่งปรากฏบน remote ระหว่างงาน จึง fetch base ใหม่ก่อน commit; เนื้อหาตรง brief ในแชต) ขอบเขตผู้ใช้เหนือข้อกำหนด handoff ทั่วไป จึงบันทึกเฉพาะที่นี่ ไม่แก้ CURRENT_STATE หรือ handoff นอก package ไม่แก้ src/tests/public/.github/ภาพเดิม/incoming เก่า ไม่มี runtime/rules/content/save/balance หรือ animation changes งานต้นฉบับจาก Fateweave references เท่านั้น ไม่ใช้ Rise Beyond

## ขั้นต่อไป

Claude ตรวจ PR และ review sheets ให้เจ้าของอนุมัติภาพก่อน งานนี้ **เปิด PR แต่ห้าม merge** ผล check/CI ไม่ใช่คำอนุมัติ หลังเจ้าของอนุมัติจึงให้ `ART-UNIT-ANIMATION-A12-001` ใช้ `unit/kael.png` นี้เป็น seed ของ Kael ไม่เริ่ม animation หรือ integration ในงานนี้
