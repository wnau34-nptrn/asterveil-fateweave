# R10 — portrait ขนาดเล็กสำหรับรูปหน้าตัวละครใน DOM (20 พ.ย. 2026)

เจ้าของ: “ต่อ R10 เลย” — ต่อจากรายงาน audit (C5) บน branch `claude/perf-audit-2026-11-20` ไม่เปลี่ยนกติกา เซฟ หรือภาพต้นฉบับ

## สิ่งที่เปลี่ยน

- `scripts/portraits-half.py` สร้าง `portraits_half.webp`, `portraits_mercs_half.webp`, `portraits_foes_half.webp`, `portraits_foes2_half.webp`: ตารางเดิมย่อครึ่งพอดี (เซลล์ 512 → 256 px, Lanczos) encode แบบเดียวกับต้นฉบับ (mercs lossless, ที่เหลือ q92) แล้วเขียน revision ลง `src/game/visuals/portraits-half.json`
- `portrait(id)` (`src/ui/portraits.ts`) ใช้ไฟล์ขนาดครึ่งเป็นค่าเริ่มต้น — portrait ทุกจุดแสดง 24–84 CSS px (≤ 252 px จริงบนจอ DPR 3) จึงพอ; `portrait(id, true)` ใช้ต้นฉบับ 512 px เฉพาะรูปใหญ่ในฉากเล่าเรื่อง (`story-ui.ts`, กว้าง ~234 CSS px); World Boss ใช้ atlas 256 px เดิมอยู่แล้ว
- ไฟล์ 512 px ยังเป็น master (เพิ่มตัวละครที่นั่น แล้วรันสคริปต์)

## ผลวัด (Chromium 390×844 DPR 3, ทีมเริ่มต้น 4 คน, ค่ายและแผนที่)

| | ก่อน | หลัง |
|---|---|---|
| ดาวน์โหลด portrait | 1.55 MB | **0.67 MB** |
| หน่วยความจำภาพหลังถอดรหัส | 28 MiB | **7 MiB** |
| ถ้าทีมมีทหารรับจ้าง (`portraits_mercs`) เพิ่มอีก | 4.93 MB / 14 MiB | 1.45 MB / 3.5 MiB |

ภาพ: [map-party-portraits-390.png](map-party-portraits-390.png) (DPR 3) — portrait ยังคม ยังไม่ได้ให้เจ้าของดู

## ทดสอบ

- `tests/portraits-half.test.ts` (5): ไฟล์ครึ่งขนาดพอดี + revision ตรง, portrait ปกติใช้ไฟล์ครึ่ง, ฉากเรื่องใช้ต้นฉบับ, World Boss ไม่เปลี่ยน
- Vitest ทั้งหมด, typecheck, lint, build; Playwright story-p05, hire-shots, lobby-shots, summary, battle-hud, character, world, team-five, star-upgrade (133; ปรับ 5 ข้อใน `world.spec.ts` ที่ตรวจชื่อไฟล์ atlas ให้รับไฟล์ `_half`)
- ไม่ได้ทดสอบมือถือจริง
