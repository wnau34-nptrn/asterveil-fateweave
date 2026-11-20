# R3 + R4 — เดินบนแผนที่ลื่นขึ้น (20 พ.ย. 2026)

เจ้าของ: “ต่อ R3 กับ R4 เลย” — ต่อจาก R1/R2 ([บันทึก](../perf-r1-r2-2026-11-20/README_TH.md)) และรายงาน audit (C2) บน branch `claude/perf-audit-2026-11-20` เปลี่ยนเฉพาะการวาด DOM ของแผนที่ ไม่แตะกติกา เซฟ การเดิน หรือลำดับคำสั่ง

## สาเหตุที่พบเพิ่มจาก trace

นอกจาก forced reflow และหมอกในรายงาน audit แล้ว trace หลังแก้รอบแรกยังเห็นการคำนวณสไตล์ใหม่ **ทั้งหน้า (~1,370 element) ทุกก้าว** เพราะ
- `layout()` ตั้ง custom property `--ox`/`--oy` (ตำแหน่งกล้อง) บน `#map-viewport` ทุกก้าว — custom property ถูกสืบทอด ทุก element ใต้แผนที่ต้องคิดสไตล์ใหม่ ทั้งที่ใช้แค่กับพื้นหลังหมอกของ viewport เอง
- `--t`, `data-zone`, `data-view`, `hidden`/`inert` ของทุก view ถูกเขียนค่าเดิมซ้ำทุกก้าว

## สิ่งที่เปลี่ยน

- `src/ui/dom-cheap.ts`: `replayClass()` เล่น animation ซ้ำโดยกรอ animation ที่กำลังเล่น/ค้างท้าย (`toast-live`) แทน `void el.offsetWidth`; คลาสที่ไม่ค้างท้ายถูกถอดเมื่อ `animationend` เพื่อให้ครั้งต่อไปแค่เติมคลาส; ไม่ยุ่ง animation ไม่รู้จบ — `setHtml()` เขียน `innerHTML` เฉพาะเมื่อ markup เปลี่ยน
- `world-ui.ts`: token hop, toast, กระเป๋า, ประตู, หีบ ใช้ `replayClass`; danger chip สลับคลาส `rise` ตามจริง (แถบใหม่เล่นเองเมื่อค่าเปลี่ยน); หมอกเก็บ element ต่อช่องและแก้เฉพาะช่องที่เปลี่ยน; zone, objective, ปุ่มโต้ตอบ, กระเป๋า, ทีม, hint ใช้ `setHtml`; พื้นหลังหมอกตามกล้องด้วย `background-position` (ไม่สืบทอด) แทน `--ox/--oy`; `--t`/`data-zone` เขียนเมื่อเปลี่ยน
- `game-shell.ts`: `show()` เขียนเฉพาะ attribute ที่เปลี่ยน; หลังก้าวไม่ `focus()` ซ้ำถ้าโฟกัสอยู่บนปุ่มเดินแล้ว

## ผลวัด (Chromium 390×844 DPR 3, CPU 4×, เดินไป-กลับ 10 ก้าว ห่าง 350 ms, local play, production build)

| | ก่อน (audit) | หลัง R3+R4 |
|---|---|---|
| กดปุ่ม → เฟรมที่เห็นตัวละครขยับ p50 / p95 / สูงสุด | 154 / 215 / 236 ms | **27 / 42 / 56 ms** |
| JS ของหนึ่งก้าว p50 | 27 ms | 19 ms |
| long task (> 50 ms) ใน 10 ก้าว | 12 ครั้ง (110–190 ms) | **0** |
| Recalc style รวม 10 ก้าว | 1.29 s | 0.28 s |
| element ที่ต้องคิดสไตล์ใหม่ต่อก้าว | ~1,370 | ไม่มีรอบใดเกิน 40 |

หมายเหตุ: การกดคีย์ถี่กว่า 120 ms ยังถูกตัดโดยตั้งใจ (`world-ui.ts` ตัวกันปุ่มค้าง) ไม่เปลี่ยน — การแตะปุ่ม/ช่องไม่ถูกจำกัด

## ทดสอบ

- Vitest ทั้งหมด, typecheck, lint, build
- Playwright Chromium: world, portrait-keyboard, lessons, map-quest-tabs, map-team-tabs, camp-trip-panel, team-five, server-play, story-p05
- ไม่ได้ทดสอบ iPhone/Safari/Android จริง ตัวเลขเป็น Chromium emulation; โหมด server ยังติดเรื่องรอคำตอบทีละก้าว (R5) ซึ่งงานนี้ไม่ได้แก้
