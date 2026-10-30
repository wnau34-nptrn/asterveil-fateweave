# A7-002 — ท่าของเซรีส (`lalin`) จาก Codex PR #117

วันที่ 2026-10-30 · branch `claude/cerise-a7-002` · ภาพ Codex `art/art-unit-animation-a7-002` (R1 ชุดเดียว) · เจ้าของอนุมัติให้นำเข้าเฉพาะเซรีสด้วย “เอาตามที่คุณแนะนำทั้งหมด”

**สถานะ: เจ้าของอนุมัติ motion ด้วย “อนุมัติ” 2026-10-30 หลังดูหน้าคลิปจริง (อนุมัติตรง ไม่อนุมานจากเทสต์)** → merge PR #121 หลัง CI ผ่าน

## นำเข้าอะไร / ไม่นำอะไร

- นำ: dance-strike → `attack`, circle-spin → `rounddance`, echo-closing-step → `echofoot`, hit / block / down ของเซรีส (เฟรม 13–40 ของ atlas `lalin`; partner-turn R2 และ closing-step R2 เดิมเฟรม 1–12 คงพิกเซลเดิม)
- **ไม่นำส่วนอิโซลด์ (`wila`)** — เจ้าของสั่งออกแบบอิโซลด์ใหม่ทั้งตัว (`CODEX-ART-QUEUE-TH.md` ข้อ 29); `wila_a7` เดิมไม่ถูกแตะ
- ตรวจ package: sha256 90 ไฟล์ตรง `validation.json`, seed ตรงไบต์กับ A7-001, `scripts/unit-anatomy-audit.py --cells` ซ้ำได้ผลตาม NOTES (median 1.03–1.13; ทุก strip ผ่านเกณฑ์ brief ≤1.15 / ≤1.20)
- **วัดไม่ได้ (ไม่ใช่ผ่านด้วยตัวเลข):** circle-spin เฟรม 3–4 (หันหลัง/ด้านข้าง) และ down เฟรม 4 (นอนราบ) — ตรวจด้วยตาจากภาพและคลิป: หัวไม่ใหญ่ผิดสัดส่วน ตัวนอนลงแล้วค้างบนพื้น; ให้เจ้าของตัดสินจากคลิป

## วิธี normalize (`incoming/ART-UNIT-ANIMATION-A7-002/build_assets.py`)

cells ของ Codex อยู่ที่ factor .42 เดียวกับ atlas A7-001 อยู่แล้ว จึง **ไม่ resample**: ตัดตาม alpha, จัดเท้าที่ x=256 ด้วยวิธีแถบเท้าเดิม, พื้นเท้า y=496 ยกเว้นท่าที่ลอย/นอนจริง (>6% ของความสูงท่าเตรียม) ซึ่งคงความต่างระดับเทียบเฟรมเตรียม; ช่อง 0 ของ strip = idle (seed) เหมือน A7-001, เฟรม “ready” 001 ที่สร้างใหม่ไม่ใช้ (เหมือน figure 0 เดิม) ท่า hit ใช้ 002–004, block 001–003, down 001–004; pack lossless และตรวจ round-trip ทุกพิกเซล

| ActionId / reaction | clip | เฟรม | contact |
| --- | --- | --- | --- |
| `attack` | attack (dance-strike) | 13–18 | 15 |
| `rounddance` | circle (circle-spin) | 19–24 | 21 |
| `echofoot` | echo (echo-closing-step) | 25–30 | 28 |
| hit / block / down | reactions | 31–33 / 34–36 / 37–40 (ค้างเฟรม 40) | — |
| `cadence` `duet` `deepbeat` `closingstep` | เดิม | 1–12 | ไม่เปลี่ยน |

rules/save/content/balance/ActionId/playback timing ไม่เปลี่ยน; reduced motion ยังไม่เล่นเฟรม (เหมือนทุก clip)

## งบภาพ — **เกินแนวทาง (แจ้งเจ้าของ)**

atlas `lalin_a7` 41 เฟรม 800×2040: decoded **6.23 MiB** (6,528,000 B), download **2.18 MB** — แนวทางตัวทั่วไป ≤6 MiB / ≤1.5 MB (เดิม 1.93 MiB / 0.63 MB). เพราะเฟรมพัด/ริบบิ้นใหญ่และ lossless; ไม่ลดคุณภาพ. ปรับเพดานเทสต์เฉพาะ `lalin` เป็น 6.6 MB / 2.2 MB. ทางลด: แยก reactions/echofoot เป็น sheet ย่อย หรือ W8 ตรวจงบรายตัว

## คลิปจริง 390×844 (Chromium SwiftShader emulation — ไม่ใช่มือถือจริง/iOS Safari)

คลิปนาฬิกาจริงจาก harness `tests/browser/unit-a7-clips.spec.ts` (`UNIT_A7_CLIPS=1`) เข้ารหัสด้วย `tests/browser/fixtures/encode-unit-a7-002-clips.py` ครบทุกท่าที่เปลี่ยน: attack, attack ถูกตี (hit), attack จนล้ม (down), attack ถูกบล็อกเต็ม (block; fixture ใหม่ `scenario=block` = 0 damage), rounddance, echofoot, และ cadence/closingstep (ตรวจว่าไม่เปลี่ยน), attack โหมด fast และ OS reduced motion
“ก่อน” (procedural) = คลิปเดิมใน [`../unit-a7-slice/`](../unit-a7-slice/) (`lalin-attack-*`, `lalin-rounddance-*`); echofoot/block เดิมไม่มีคลิปก่อน (procedural บนภาพ seed)

เทสต์: typecheck, lint, vitest (unit-a7 40/40; ทั้งชุดผ่านก่อนแก้เทสต์ A7), Playwright unit-a7 + unit-loading 48 (47 ผ่านรอบแรก; metta attack ล้มครั้งแรกตอนเริ่ม dev server แล้วผ่านเมื่อรันซ้ำ) ชุดเต็มให้ CI
