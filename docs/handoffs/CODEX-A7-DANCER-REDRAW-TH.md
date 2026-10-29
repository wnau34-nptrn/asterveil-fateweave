# Brief ให้ Codex — ART-UNIT-ANIMATION-A7-002: วาดใหม่ strip นักระบำที่หัวใหญ่กว่า seed (ลลิน/วิลา)

สถานะ: **Claude เขียน brief แล้ว (2026-10-29) ยังไม่ได้ส่ง/ยังไม่มีภาพ** — เจ้าของเป็นผู้ส่ง prompt ท้ายไฟล์ให้ Codex
ที่มา: งานแก้ audit AV06 นำ A7 (PR #98) เข้าเกม; strip ด้านล่างไม่ผ่านด่านสัดส่วนจึงไม่ถูกส่ง ตัวละครเหล่านั้นใช้ภาพนิ่ง + motion ของโค้ดแทน ดู [A7 slice](../combat-presentation/unit-a7-slice/README_TH.md)

## ปัญหาที่วัดได้

วัดด้วย `scripts/unit-anatomy-audit.py` (scale หัว/ลำตัวส่วนบนเทียบ seed) เกณฑ์รับ: median ≤1.15 และไม่มีเฟรมที่วัดได้เกิน 1.20 — บทเรียนเดียวกับ Aegis (หัว ~1.37 เท่า, `docs/validation/aegis-anatomy-2026-10-29/README_TH.md`) ขนาดรวม/พื้นเท้าตรงไม่พอ

| ตัว | strip ที่ต้องวาดใหม่ (ต้นทาง `incoming/ART-UNIT-ANIMATION-A7-001/dancers/`) | head scale ที่วัดได้ |
| --- | --- | --- |
| ลลิน (`lalin`, units_mercs cell 8) | dance-strike R1 (attack) | 1.32 |
| ลลิน | circle-spin R1 (rounddance) | 1.31 |
| ลลิน | echo-closing R1 (echofoot) | 1.31 |
| ลลิน | hit R1 / block R1 / down R1 (4 เฟรมต่อแถบ) | 1.15–1.18 / 1.14–1.25 / 1.24 |
| วิลา (`wila`, units_mercs cell 9) | echo-closing R1 (echofoot) | 1.20–1.34 |
| วิลา | down R1 | 1.23–1.25 |

ผ่านแล้วและเข้าเกมแล้ว (ใช้เป็นแบบอ้างอิงสัดส่วนได้): ลลิน partner-turn R2 (1.06), closing-step R2 (1.08); วิลา dance-strike, partner R2, circle R1, closing R2, hit, block

## ข้อกำหนด

- seed: exact crop ใน `incoming/ART-UNIT-ANIMATION-A7-001/dancers/<ตัว>/seeds/` (หันขวา, พื้นเท้า y=497 ใน logical 512) — **หัวต้องเท่ากับ seed ทุกเฟรม** รวมท่าก้ม/หมุน/ล้ม (ท่าล้มนอนราบ ความยาวลำตัวเท่า seed ไม่ใช่หัวโตขึ้น)
- จำนวนเฟรม/ลำดับท่าเหมือน A7-001 เดิม (ท่าโจมตี 6 เฟรม, reaction 4 เฟรม; down จบท่านอนค้าง ไม่ลุก) ไม่มี VFX/พัด-ริบบิ้นเรืองแสงในตัว
- สร้างทั้ง strip ต่อท่า ช่องโปร่งใสกว้าง scale เดียวกับ strip ที่ผ่านแล้วของตัวเดียวกัน
- **ก่อนส่ง** รัน `python3 scripts/unit-anatomy-audit.py --cells` กับ strip ใหม่ทุกแถบ แนบผลใน NOTES; strip ที่ยังเกินเกณฑ์อย่าส่งเป็นตัวเลือก

## Prompt สำหรับเครื่องมือสร้างภาพ (ปรับตามเครื่องมือจริงของ Codex)

```text
Redraw these move strips of the same dancer using the attached seed as the exact model: same face, hair, costume, fans and ribbons, and — most important — the SAME head size relative to the body as the seed in every frame (the previous version drew the head about 1.3x too large). Keep the body proportions of the seed, facing right, standing on the same ground line, on a transparent background with wide empty gaps between figures. One horizontal strip per move, poses in the same order as the previous strip of that move (attached). Down ends lying prone and stays down. No effects, glows, trails, text or background.
```

## ส่งมอบ / ขอบเขต

branch `art/art-unit-animation-a7-002` จาก `feature/fateweave-initial-prototype`; เฉพาะ `incoming/ART-UNIT-ANIMATION-A7-002/`: seeds, raw strips, preview 390px เทียบ seed, ผล anatomy audit, `prompts.json`, `strips.json`, `seeds.json`, `validation.json`, `NOTES.md`, สคริปต์ handoff; push ด้วย git ปกติแล้ว fetch กลับตรวจ SHA-256/decode; เปิด PR ไม่ merge; ห้ามแตะ `src/ tests/ public/ .github/` และภาพเดิม — การเลือกภาพและอนุมัติ motion เป็นของเจ้าของ ผล CI/เทสต์ไม่ใช่การอนุมัติ หลังได้ภาพ Claude เพิ่ม strip เข้า atlas เดิมของแต่ละตัว (`incoming/ART-UNIT-ANIMATION-A7-001/build_assets.py`) และถ่ายคลิปจริง 390px
