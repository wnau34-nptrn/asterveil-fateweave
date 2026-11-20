# R9 — ภาพเคลื่อนไหวที่วนตลอดไม่กิน CPU ตอนอยู่นิ่ง (20 พ.ย. 2026)

เจ้าของ: “ต่อ R9 เลย” — ต่อจากรายงาน audit บน branch `claude/perf-audit-2026-11-20` ไม่เปลี่ยนกติกา เซฟ หรือ asset

## วัดก่อนแก้

ภาพเคลื่อนไหวที่วนตลอดในหน้าชื่อเกม/ค่าย/แผนที่ส่วนใหญ่ใช้ `transform`/`opacity` (GPU ทำเอง) แต่การวัดเวลา main thread ตอนอยู่นิ่ง 5 วินาที (CPU 4×) พบ 2 ตัวที่ทำให้ต้องคำนวณสไตล์ใหม่ทุกเฟรม:

| หน้าจอ | ปกติ | หยุด animation ทั้งหมด | ต้นเหตุ (ทดลองหยุด/ปล่อยทีละตัว) |
|---|---|---|---|
| ชื่อเกม | 691 ms (recalc 300 ครั้ง = ทุกเฟรม) | 34 ms | `logo-glow` animate `filter: drop-shadow` |
| แผนที่ | 184 ms (recalc 89 ครั้ง) | 3 ms | `toast-life` มี `visibility` ใน keyframe สุดท้าย (เล่น 4.6 วินาทีทุกข้อความ) |
| ค่าย | 43 ms | 25 ms | — (ไม่ต้องแก้) |

## สิ่งที่เปลี่ยน

- `game-feel.css` `toast-life`: ตัด `visibility: hidden` ออกจาก keyframe สุดท้าย (toast จางเป็น opacity 0 และ `pointer-events: none` อยู่แล้ว)
- โลโก้หน้าชื่อเกม (`game-shell.ts` + `game-feel.css`): แสงทองที่หายใจเข้าออกเปลี่ยนจาก animate `drop-shadow` เป็นโลโก้สำเนาด้านหลัง (`.title-logo-glow`, `aria-hidden`) ที่มีแสงคงที่ แล้ว animate แค่ `opacity` 0→1; โลโก้หลักมีเงาเข้มคงที่เหมือนเดิม; reduced motion ซ่อนแสง (เหมือนเดิมที่ไม่มี animation) — ต่างจากเดิมเล็กน้อย: รัศมีแสงคงที่ 22 px แล้วจางเข้า-ออก แทนการขยายรัศมี 0→22 px ([ภาพ 390px ตอนแสงสว่างสุด](title-logo-glow-390.png))

## ผลวัด (Chromium 390×844 DPR 3, CPU 4×, อยู่นิ่ง 5 วินาที, production build)

| หน้าจอ | ก่อน | หลัง |
|---|---|---|
| ชื่อเกม | 691 ms | **6 ms** |
| แผนที่ (มี toast) | 184 ms | **38 ms** |
| ค่าย | 43 ms | 54 ms (ไม่เปลี่ยน, ความแปรปรวน) |

## ทดสอบ

- Vitest ทั้งหมด, typecheck, lint, build; Playwright world, portrait-keyboard, update-banner, lessons, ui-shots (117)
- ภาพแสงโลโก้ยังไม่ได้ให้เจ้าของดู; ไม่ได้ทดสอบมือถือจริง
