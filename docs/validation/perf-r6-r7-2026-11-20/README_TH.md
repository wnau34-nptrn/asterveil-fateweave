# R6 + R7 — ศึกกระตุกน้อยลง (20 พ.ย. 2026)

เจ้าของ: “ต่อ R6 กับ R7 เลย” — ต่อจาก R1–R5 และรายงาน audit (C4) บน branch `claude/perf-audit-2026-11-20` ไม่เปลี่ยนกติกา ตัวเลข เซฟ หรือจังหวะการเล่นภาพ (VFX ยังมาจากเหตุการณ์จริงเหมือนเดิม)

## สิ่งที่เปลี่ยน

**R6 — HUD และฉาก**
- `battle-ui.ts` `set()`: เขียน `innerHTML` ของ HUD แต่ละส่วน (~25 ส่วน) เฉพาะเมื่อ markup เปลี่ยน (`setHtml` จาก R3/R4)
- คืนโฟกัสหลัง render เฉพาะเมื่อปุ่มที่โฟกัสถูกแทนที่ (เดิม `focus()` ทุก render = forced layout)
- `placeBackdrop`: อ่านขนาดครั้งเดียวต่อเฟรมใน `requestAnimationFrame` (เดิมอ่านทันทีหลังเขียน DOM ทุก render)
- `BattleScene.sync()`: คำสั่ง repaint ตอนสนามเงียบ (ไม่มี stage, timer, สั่น, ล้ม, cue, เลเยอร์เอฟเฟกต์, ท่าทางกำลังเล่น) และภาพที่จะวาดเหมือนเดิม (ตัวละครชุดเดิม เป็น/ตายเหมือนเดิม คู่ที่กำลังลงมือเดิม ขนาดเดิม) จะ refresh ตัวละครแทนการทำลาย-สร้างทุก sprite/tween ใหม่ — การเลือกฮีโร่/สกิล/เป้าหมายไม่ rebuild ฉากอีก; หลังจบการเล่นภาพ (ยังมีเอฟเฟกต์ค้าง) ยัง paint เต็มเหมือนเดิม
- `UnitAnimation.still` บอกว่าไม่มีท่าทางกำลังเล่น

**R7** — `GameShell.local()` ส่ง `battleMemo()` ตัวเดียวกับ Durable Object: commit แต่ละเทิร์นคำนวณเฉพาะเทิร์นใหม่ ไม่ replay ทั้งศึก ผลเท่ากันทุกบิต (`tests/server-perf.test.ts`)

## ผลวัด (Chromium 390×844 DPR 3, CPU 4×, SwiftShader, ทีม Knight ชนะ 3 ศึกติด; เทียบหลัง R1 สคริปต์เดียวกัน)

| ศึก | FPS (เป้า 30) | เฟรม > 50 ms | เฟรม > 100 ms | long task รวม (ยาวสุด) |
|---|---|---|---|---|
| 1 (โหลดภาพครั้งแรก) | 20.5 → **23.2** | 193 → 126 | 47 → 20 | 13.8 s (869 ms) → **7.3 s** (689 ms) |
| 2 | 23.9 → **26.4** | 54 → 35 | 11 → 2 | 2.1 s → **0.9 s** (115 ms) |
| 3 | 22.2 → **26.1** | 65 → 34 | 20 → 4 | 2.4 s → **1.1 s** (86 ms) |

heap หลัง GC 12.0–12.5 MB และ DOM nodes ~2,900–3,000 คงที่ (ไม่รั่ว) FPS วัดบน WebGL แบบซอฟต์แวร์ มือถือที่มี GPU ควรดีกว่านี้

## ทดสอบ

- Vitest ทั้งหมด, typecheck, lint, build
- Playwright Chromium 16 spec (132 ข้อ): combat, presentation, battle-hud, battle-rewards, unit-loading, status, field-a11, formation, portrait-keyboard, painted-skill-icons, world-boss-p11, world-boss-trio-ui, team-five, unified-skills, skill-popup-enhancement, magic-power
- ไม่ได้ทดสอบมือถือจริง
