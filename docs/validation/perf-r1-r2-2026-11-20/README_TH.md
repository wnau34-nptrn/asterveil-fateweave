# R1 + R2 — โหลดภาพศึกเฉพาะที่ใช้ และ skill icon ขนาดจริง (20 พ.ย. 2026)

เจ้าของ: “แก้ R1 กับ R2 ก่อนเลย” แล้ว “ทำต่อจนเปิด PR แล้ว merge ได้เลย” — ต่อจาก [รายงานตรวจประสิทธิภาพ](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/claude/perf-audit-2026-11-20/docs/validation/perf-audit-2026-11-20/README_TH.md) (branch `claude/perf-audit-2026-11-20`) ไม่เปลี่ยนกติกา เซฟ เนื้อหา ตัวเลข หรือจังหวะการเล่นภาพ

## สิ่งที่เปลี่ยน

**R1** — `src/game/visuals/battle-assets.ts` + `BattleScene` โหมด lazy (`main.ts` ส่ง `true`)
- เปิดเกมไม่โหลด VFX atlas 13 ไฟล์และ unit sheet 5 แผ่นอีกต่อไป (เหลือแค่ฉาก ruins)
- แต่ละศึกโหลด atlas หลัก 6 ไฟล์ (bolt, execute, ward, blade, rework, defense — cue มาจากเหตุการณ์หลายแบบ บางตัวไม่มีภาพสำรอง) + atlas ตามสกิลเฉพาะเมื่อมีฮีโร่ที่มีสกิลตระกูลนั้น (healing ยังโหลดเมื่อมี earth/alchemy เพราะใช้วาดการรักษา) + unit sheet ของตัวที่อยู่ในสนาม
- ปุ่ม “เริ่มต่อสู้” และการสั่งการรอ `fieldReady` (ภาพที่จำเป็นมาครบ หรือไฟล์ไหนโหลดพลาดก็ไม่รอ) ภาพเคลื่อนไหวเสริม (unit pilot) ยังไม่คุมปุ่มเหมือนเดิม — ตรวจทุกครั้งที่ texture ถูกเพิ่ม ไม่รอทั้งคิว
- ระหว่างภาพยังไม่มา ตัวละครใช้ texture ว่าง (ไม่ขึ้นกล่อง missing) แล้ววาดใหม่เมื่อมาครบ ก่อนปุ่มเริ่มกดได้
- บนแผนที่ 1.2 วินาทีหลังเข้า: prefetch atlas ของทีม (ลงสนาม+สำรอง) และ sheet ของศัตรูทุกตัวในแผนที่ (ไม่เกิน 31 ไฟล์ = ไม่เกินขีด parallel ของ loader ขณะ loop หลับ)
- QA fixture ที่สร้าง `BattleScene` เองยังโหลดครบแบบเดิม (ค่าเริ่มต้น eager)

**R2** — `skill_icons_128.webp` (768×2048, lossless, 1.66 MB, decoded 6 MiB) แทน `skill_icons.webp` (1536×4096, 5.78 MB, 24 MiB) ไฟล์ 256 px ยังเป็น master สำหรับเพิ่มไอคอน สร้างใหม่ด้วย `python3 scripts/skill-icons-runtime.py` (บอกค่า `?v=`)

## ผลวัด (Chromium 390×844 DPR 3, CPU 4×, สคริปต์เดิมของ audit)

| | ก่อน | หลัง |
|---|---|---|
| ดาวน์โหลดหน้าชื่อเกม (4G) | 26.3 MB / 71 คำขอ | **5.0 MB / 23 คำขอ** |
| event load หน้าชื่อเกม (4G) | 24.8 s | **5.4 s** |
| LCP (4G) | 4.2–4.4 s | 3.1–3.2 s |
| skill icon โหลดเสร็จ (4G) | 24 s | 5.4 s |
| long task ตอนเปิดเกม | 19 ครั้ง รวม 3.8 s | 3 ครั้ง รวม 1.3 s |
| texture ที่ถือไว้ในศึก (ทีม Knight) | 151–170 MiB | 116–135 MiB |
| สนามพร้อม เมื่อเปิดเซฟที่ค้างในศึกตรงๆ (ไม่จำกัดเน็ต) | 2.6 s | 4.5 s (ไม่มี prefetch; เดินจากแผนที่ปกติภาพมาก่อนแล้ว) |

ข้อสังเกต: ศึกแรกที่ไม่ได้ prefetch มี long task ยาวสุด 869 ms ตอนอัป texture รวมกันตอนเข้าศึก (ก่อนหน้านี้เกิดตอนเปิดเกม) — ถ้าเจอบนมือถือจริง ทางแก้ต่อคือ R8/อัป texture ทีละไฟล์

ภาพ: [battle-icons-390.png](battle-icons-390.png) (DPR 3) — ไอคอนในแถบคำสั่งยังคม ยังไม่ได้ให้เจ้าของดู

## ทดสอบ

- Vitest ทั้งหมด (ใหม่: `tests/battle-assets.test.ts` 6 ข้อ; `encounter-budget` แยก atlas หลัก/ตามสกิล + สร้าง `BUDGET_TH.md` ใหม่), typecheck, lint, build
- Playwright Chromium: combat, unit-loading, presentation, world, portrait-keyboard, painted-skill-icons, perf-probe, battle-rewards, lessons, team-five, server-play (195 ข้อ; 6 ข้อที่ล้มรอบแรกแก้แล้วผ่าน) — ปรับเทสต์ 2 ข้อให้ตรงพฤติกรรมใหม่: หน้าชื่อเกมไม่โหลดภาพศึก, sheet โหลดหลังเปิดศึก
- ไม่ได้ทดสอบ iPhone/Safari/Android จริง; ไม่ได้วัดบน Pages จริง (container ถูกบล็อก)
