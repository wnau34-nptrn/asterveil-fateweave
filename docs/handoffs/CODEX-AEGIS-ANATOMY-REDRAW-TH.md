# ART-UNIT-ANIMATION-A2-002 — วาดท่าอัศวิน Aegis ใหม่ให้สัดส่วนตรงกับ idle (brief สำหรับ Codex)

วันที่ 2026-10-29 · ผู้ส่ง: Claude · สาขาเกม `feature/fateweave-initial-prototype`
หลักฐานและเหตุผล: [docs/validation/aegis-anatomy-2026-10-29/README_TH.md](../validation/aegis-anatomy-2026-10-29/README_TH.md)

## ทำไมต้องวาดใหม่

ท่าที่ ImageGen สร้างใน A2 (`incoming/ART-UNIT-ANIMATION-A2-001/aegis-raw.png`) วาด Aegis เป็น chibi คนละสัดส่วนกับภาพ idle ที่เจ้าของอนุมัติ (`aegis-seed.png`): หัวและผมใหญ่กว่า idle ราว **1.35–1.4 เท่า** (วัดด้วย feature matching ของหัว/ใบหน้า ค่ากลาง 1.37) ไหล่และโล่กว้างกว่า ขณะที่ความสูงรวมเท่ากัน เมื่อสลับ idle ↔ ท่าโจมตีจึงเห็น “หัวโตกระโดดออกมา” การ normalize ด้วยความสูง/ฝ่าเท้าแก้ไม่ได้: ถ้าย่อให้หัวเท่ากัน ตัวทั้งตัวจะหดเหลือราว 73% ถ้าคงความสูง หัวจะโต นี่จึงเป็นปัญหาของภาพต้นทาง ต้องวาดใหม่

ระหว่างรอภาพใหม่ เกมพัก (hold) เฟรม A2 ของ Aegis ทั้งชุด อัศวินกลับไปใช้ภาพนิ่ง seed กับท่าขยับแบบ procedural เดิม ส่วน Vargoth Guard ยังใช้เฟรม A2 ตามปกติ

![เทียบ seed กับท่าที่ถูกปฏิเสธ ในพิกัด 512px เดียวกัน](../validation/aegis-anatomy-2026-10-29/aegis-model-sheet-vs-rejected.png)

## สิ่งที่ต้องส่ง

วาด 25 ท่า คนเดิม ชุดเดิม หันขวา กล้องเดิม **สัดส่วนเดียวกับ `aegis-seed.png` ทุกท่า** ใช้ `incoming/ART-UNIT-ANIMATION-A2-001/aegis-model-sheet-guides.png` (seed + เส้นนำ) เป็น model sheet และ template ของทุกช่อง

| ชุด | จำนวน | ลำดับท่า | ช่องในเกม (คงเดิม) |
| --- | --- | --- | --- |
| ฟันดาบ (attack) | 6 | ง้างดาบ → ยก → ตั้งท่า → **ฟันไปข้างหน้า (contact)** → ตามแรง → ผ่อนกลับ | 2–7 (contact = 5) |
| ป้องกัน/สนับสนุน (guard/rally/challenge/bulwark/rouse) | 6 | ยกโล่ → หันโล่ไปหน้า → ค้าง → **ยกโล่แรง (contact)** → ลดเล็กน้อย → ผ่อนกลับ | 10–15 (contact = 13) |
| กระแทกโล่ (bash) | 6 | ย่อหลังโล่ → ดึงโล่เข้าอก → ตั้งแรง → **ดันโล่ไปหน้า (contact)** → เด้งกลับ → คืนโล่ | 23–28 (contact = 26) |
| โดนตี (hit) | 2 | สะดุ้งหลังโล่ 2 ระดับ | 17–18 |
| ล้ม (down) | 3 | เข่าทรุด → คุกเข่า → นอนหมดสติ ถือดาบ/โล่ ไม่สลายตัว | 19–21 |
| รับการโจมตี (block) | 2 | ยันโล่รับแรง 2 ระดับ | 30–31 |

ไม่ต้องวาด idle ใหม่: เฟรม 0/1/8/9/16/22/29 ใช้ seed เดิมตรงตัว ห้ามแก้ seed

## กติกาสัดส่วน (ข้อบังคับ ตรวจด้วยเครื่องมือ)

วัดใน canvas 512px ของ seed (ฝ่าเท้าที่ y≈500):

- **หัว**: จากยอดผม (ไม่นับปอยชี้) y≈40 ถึงคาง y≈180 ≈ **140px** ความกว้างผม ≈ **190px** (x 195–385) ตาอยู่ที่ y≈150 ทุกท่าที่ยืนต้องมีหัวขนาดนี้ ±6%
- **ตัว**: คางถึงเข็มขัด ≈ 110px ไหล่และโล่ไม่ใหญ่กว่า seed โล่ห้าแฉกขนาดเท่าเดิม ดาบยาวเท่าเดิม
- การย่อตัว/ก้าวกว้าง **ลดความสูงได้ด้วยการงอขา ไม่ใช่การย่อทั้งตัวหรือขยายหัว** ท่าย่อตัวจึงมีหัวขนาดเท่า idle แต่ฝ่าเท้าถึงยอดหัวสั้นลง
- การหันหัว/ก้มเล็กน้อยทำได้ แต่ห้ามเปลี่ยนรูปหน้า (ตาโตขึ้น คางสั้นลง) ให้อ่านว่าเป็นคนละสัดส่วน
- มือขวาจับด้ามดาบที่เดียวกันทุกท่า มือซ้ายถือโล่ ไม่มีดาบ/โล่สองชิ้นหรือเงาซ้อน ไม่มีเศษภาพของช่องข้างเคียง (seed เดิมมีเศษ 69px ติดขอบขวา x 503–512 y 205–224 ให้ตัดออกในภาพใหม่)
- พื้นหลังโปร่งใสจริง (alpha) ห้ามมีแสงฟุ้งหรือพื้นสีรอบตัว (`aegis-raw.png` เดิมมีพื้นฟุ้งสีทอง ทำให้ตัดยาก) ไม่มีเส้นการเคลื่อนไหว ไม่มี VFX ที่วาดติดตัว
- ทุกท่าเต็มตัว ไม่โดนตัดขอบ ช่องละท่า ไม่ซ้อนกัน

ข้อห้ามจากรอบก่อน: ห้าม “ตีความใหม่” เป็น chibi หัวโตกว่าเดิม ห้ามให้ทุกท่าในแถวเหมือนกันแต่ผิดสัดส่วนทั้งแถว ถ้า ImageGen ให้สัดส่วนผิด ให้แก้ทีละท่าบน template จนผ่าน ไม่ส่งชุดที่ไม่ผ่านมาให้ Claude normalize

## วิธีส่งงานและตรวจก่อนส่ง

1. โฟลเดอร์ใหม่ `incoming/ART-UNIT-ANIMATION-A2-002/` (ห้ามเขียนทับ A2-001)
2. `raw/` ไฟล์ดิบจาก ImageGen ทุกไฟล์ + `generation.json` (prompt ที่ส่งจริง ชื่อไฟล์ผลลัพธ์)
3. `cells/` ภาพ PNG 512×512 RGBA ต่อท่าในพิกัดเดียวกับ seed (ฝ่าเท้า y≈500 ตัวอยู่กลางช่อง) ตั้งชื่อ `000.png` = สำเนา `aegis-seed.png` ตามด้วย `001.png…025.png` ตามลำดับตารางด้านบน (attack 6, support 6, bash 6, hit 2, down 3, block 2)
4. รันตรวจสัดส่วนเองก่อนส่ง: `python3 scripts/unit-anatomy-audit.py --cells incoming/ART-UNIT-ANIMATION-A2-002/cells` (ต้องมี `opencv-python-headless`) เกณฑ์ผ่าน: ทุกท่ายืน/ย่อ/ฟัน/ยกโล่ อยู่ใน `ok` (สเกลหัว 0.88–1.12 เทียบ idle ตั้งเป้า 0.94–1.06) ท่าล้ม/นอนที่ขึ้น `not-measured` ให้แนบภาพเทียบด้วยตา ห้ามถือว่า not-measured คือผ่าน
5. แนบภาพเทียบ `contact-sheet.png`: seed กับทุกท่าที่ขนาดเดียวกัน มีเส้นนำ hair top/eye/chin/belt/sole แบบ `aegis-model-sheet-guides.png`
6. บันทึกใน `NOTES.md`: ท่าไหนแก้กี่รอบ ผลตรวจแต่ละท่า และสิ่งที่ยังไม่ตรง แล้วเพิ่ม entry ใน `docs/handoffs/CODEX-TO-CLAUDE.md`

Codex ไม่ต้องแก้ runtime, `build_assets.py`, atlas, rules, save, balance, ActionId หรือเวลา contact/end Claude จะ normalize/pack (สเกลเดียวทั้งชุดเทียบ seed + ตรวจ anatomy ซ้ำ), ปลด hold ใน `src/game/visuals/unit-frames.ts` (`anatomyHold`), อัดคลิป before/after จาก runtime จริงที่ 320/390/PC และส่งให้เจ้าของตรวจ motion ก่อนนำเข้าเกม

## Prompt ที่คัดลอกไปใช้ได้

```text
Production game animation frames edited from the supplied approved model sheet (aegis-seed.png with guide lines). Transparent alpha background, no glow, no scenery, no labels, no motion trails, no VFX.
Character: Aegis, blond blue-eyed young knight in ornate royal blue and gold armor with blue cape, silver-blue sword in his right hand and five-point blue-gold shield on his left arm. Faces RIGHT exactly as the model sheet. Same camera and lighting.
PROPORTIONS ARE LOCKED TO THE MODEL SHEET: head from hair top to chin = 140px, hair width = 190px, eye line 110px below hair top, chin to belt = 110px, feet on the sole line at y=500 in a 512px cell. Do NOT draw a bigger head, bigger eyes, broader shoulders or a bigger shield than the model sheet. Crouching poses get shorter by bending the knees only; the head stays model-sheet size.
One pose per 512x512 cell, full body visible, never overlapping, never cropped. Same sword grip in the right hand, shield on the left arm in every pose, no duplicate weapons.
Poses: [list one set at a time from the brief table, e.g. "6-frame sword slash: draw sword back, lift, poised windup, forward slash CONTACT, follow through, ease back"].
```

ส่งทีละชุด (attack ก่อน) แล้วตรวจสัดส่วนทุกชุดก่อนทำชุดถัดไป
