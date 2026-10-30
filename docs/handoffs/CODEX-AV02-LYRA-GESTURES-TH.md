# Brief ให้ Codex — ART-UNIT-ANIMATION-LYRA-002: ท่า Mark และ Parry stance ของไลรา

สถานะ: **Claude เขียน brief แล้ว (2026-10-29) ยังไม่ได้ส่ง/ยังไม่มีภาพ** — เจ้าของเป็นผู้ส่ง prompt ท้ายไฟล์ให้ Codex ผลตรวจที่มาของงานนี้: [audit AV02](../validation/animation-vfx-full-audit-2026-10-29/README_TH.md)

## เป้าหมาย

ไลรา (`tracer`, Duelist) มี atlas `lyra_pilot` 22 เฟรม: 0 idle, 1–8 ฟัน, 9–16 แทง, 17–18 เจ็บ, 19–21 ล้ม ในงานแก้ AV02 Claude นำท่าเดิมที่ตรงชนิดมาใช้แล้ว (finisher/sweep → ฟัน, lunge → แทง, ripost ของ Parry → แทง 12→13 ในหน้าต่าง reaction เดิม) เหลือสองท่าที่ **ไม่มีภาพที่ตรงชนิด** และยังเป็นภาพนิ่ง + การเลื่อน/หมุนของโค้ด:

| ท่า | กลไกจริง (`src/core/battle/engine.ts`) | ท่าที่ต้องการ | ห้าม |
| --- | --- | --- | --- |
| Mark (`mark`, ติดตรา) | ไม่ทำดาเมจ ติดตราศัตรูหนึ่งตัวจนจบรอบตาม `markDuration` | นักดาบ "กำหนดเป้า": ชี้ปลายดาบไปข้างหน้าช้าๆ มือซ้ายแตะใบดาบ/ชี้ ตาจับเป้า แล้วคืนท่า **ไม่ฟัน ไม่แทงพุ่ง** | ห้ามวาดตรา/วง/แสงสีชมพู (VFX ตราเป็นของ arcane-seal family อยู่แล้ว) |
| Parry stance (`parry`, ปัดดาบ) | เทิร์นของไลราเอง ตั้งท่ารับ hit กายภาพครั้งแรกแล้วสวน ไม่มีเป้าศัตรูในเทิร์นนี้ | ตั้งการ์ดรับดาบ: ดาบเฉียงขวางหน้าตัว ย่อเข่า น้ำหนักหลัง ถือนิ่งที่จุดสูงสุด แล้วคืนท่า | ห้ามวาดประกายปะทะ/คมดาบเรืองแสง (blade-fx `parry_prepare` วาดอยู่แล้ว) |

## บริบทเกมและไฟล์ที่ตรวจแล้ว

- seed: `incoming/ART-UNIT-ANIMATION-PILOT-001/lyra-seed.png` (512×512, หันขวา, alpha bbox (0,15,512,512)) = `public/assets/art/units.webp` frame 1 (`assets.ts` `tracer`)
- runtime ปัจจุบัน: `public/assets/units/lyra_pilot.*` เซลล์ 512 แสดงที่ 2× slot (`displayRatio: 2`) พื้นเท้า y=496 ใน cell ที่ pack แล้ว; ท่าใหม่จะต่อเป็น 22–29 (mark) และ 30–37 (parry stance) โดย Claude
- กฎสัดส่วน: บทเรียน Aegis (`docs/validation/aegis-anatomy-2026-10-29/README_TH.md`) — หัว/ลำตัว/ดาบต้องเท่ากับ seed ทุกเฟรม ตรวจด้วย `python3 scripts/unit-anatomy-audit.py --cells` ก่อนส่ง ท่าที่หัวโตเกิน seed จะถูกพักไม่ใช้

## ท่า ทิศ จำนวนเฟรม และจังหวะ

- หันขวาเท่า seed ทั้งสอง strip, strip ละ 8 เฟรม (เท่า pilot เดิม) เรียงซ้าย→ขวา
- Mark: 1 ready (seed) → 2 ยกดาบ → 3 หมุนข้อมือให้ปลายดาบชี้หน้า → 4 ชี้นิ่ง (จุดติดตรา = contact) → 5 ถือชี้ → 6–7 ลดดาบ → 8 ready (seed)
- Parry stance: 1 ready (seed) → 2 ถอยเท้าหลัง → 3 ยกดาบขวาง → 4 การ์ดเต็ม ย่อเข่า (contact) → 5 ถือการ์ด → 6–7 คลาย → 8 ready (seed)
- Claude map: prepare = เฟรม 2–4, recover = 5–8 (contact = เฟรมแรกของ recover ตามเวลา UI เดิม ไม่เปลี่ยน timing)

## ขนาดเฟรม จุดยึด และรูปแบบไฟล์

- สร้างทั้ง strip ต่อท่าในครั้งเดียว ช่องโปร่งใสกว้างระหว่างตัว (≥48px) ไม่ให้ดาบล้นช่องข้างเคียง
- scale เดียวกันทั้งสอง strip และใกล้ seed; เส้นพื้นตรงกับ seed (y≈497 ใน logical 512) เผื่อพื้นที่ดาบด้านบน/หน้า
- PNG RGBA alpha จริง ไม่มีลายหมากรุก ไม่มีพื้นหลัง/ข้อความ/VFX

## Prompt สำหรับเครื่องมือสร้างภาพ (ปรับตามเครื่องมือจริงของ Codex)

```text
Using the attached reference (exact same character, costume, chibi head-to-body proportions, red hair, crimson cape and long red-edged sword, facing right), draw ONE horizontal strip of 8 full-body poses on a transparent background with wide empty gaps between figures, all at the same scale as the reference and standing on the same ground line.
Strip A "Mark": 1 the reference idle pose; 2 raises the sword; 3 turns the wrist so the sword tip points straight forward at chest height; 4 holds the point steady at an unseen enemy, off-hand two fingers along the flat of the blade, eyes focused; 5 holds; 6 and 7 lower the sword; 8 the reference idle pose. Calm and precise, no lunge, no slash.
Strip B "Parry stance": 1 the reference idle; 2 rear foot steps back; 3 sword rises diagonally across the body; 4 full guard, knees bent, weight back, blade angled to catch a blow; 5 holds the guard; 6 and 7 relax; 8 the reference idle.
No effects, sparks, glows, symbols, rings, text, background or extra characters. Keep the head the same size as the reference in every frame.
```

## งานปรับ asset และ metadata (Codex)

branch `art/art-unit-animation-lyra-002` จาก `feature/fateweave-initial-prototype`; เฉพาะ `incoming/ART-UNIT-ANIMATION-LYRA-002/`: seeds, raw strips, preview 390px, `prompts.json`, `seeds.json`, `strips.json`, `validation.json`, `NOTES.md`, สคริปต์ handoff ที่ทำซ้ำได้, ผล `unit-anatomy-audit.py --cells`; push ด้วย git ปกติแล้ว fetch กลับตรวจ SHA-256 + decode ทุก PNG เปิด PR เข้าสาขาเกม **ห้าม merge** ห้ามแตะ `src/ tests/ public/ .github/` และภาพเดิม

## งานนำเข้าเกม (Claude หลังเจ้าของเลือกภาพ)

normalize scale เดียวกับ `lyra_pilot`, ต่อเฟรม 22–37, registry `tracer`: `mark` และ `parry` → clips ใหม่, คง ripost เดิม, เทสต์เทียบ content, คลิปจริง 390px ส่งเจ้าของ

## เกณฑ์ตรวจรับ

สัดส่วนหัว/ลำตัว/ดาบเท่า seed ทุกเฟรม; อ่านออกที่ 390px ว่า "ชี้กำหนดเป้า" ต่างจาก "ฟัน/แทง" และ "ตั้งการ์ด" ต่างจาก idle; เท้าไม่ไถล; ไม่มีเฟรมถูกตัด; ไม่มี VFX ในตัว

## ขอบเขต

ภาพเท่านั้น ไม่เปลี่ยน rules/save/content/balance/timing การเลือกภาพและการอนุมัติ motion เป็นของเจ้าของ ผล CI/เทสต์ไม่ใช่การอนุมัติ
