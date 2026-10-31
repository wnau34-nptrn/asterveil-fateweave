# W8 — ปิดแผน animation/VFX: ตาราง coverage, A11 ตรวจสนามรวม, งบภาพ, แก้ VFX อ่านยาก, แผงวัดมือถือ (2026-10-31)

สาขา `claude/w8-animation-vfx-close` จากสาขาเกม `7dcace8` · ไม่แก้ rules/save/content/balance/timing (resolver, เซฟ, ตัวเลข, contact/end ไม่แตะ)

## 1. ตาราง coverage สร้างจากโค้ด

- [`../../combat-presentation/COVERAGE_TH.md`](../../combat-presentation/COVERAGE_TH.md) + `coverage.json` สร้างโดย `src/game/visuals/presentation-coverage.ts` จาก registry `unit-frames.ts`, content (ตัวละคร + ท่าจากต้นไม้ทุกท่า, encounter ทุกอันรวม phase/สำรอง) และลำดับ routing ของ `BattleScene` — `npm run coverage:presentation` เขียนใหม่, `tests/presentation-coverage.test.ts` ล้มเมื่อตารางค้าง
- ผล: **36 identities** (เรา 14 · ศัตรู 22) · มี atlas 34 · **73 ActionId** (98 แถว) · 40 ชื่อท่าศัตรู/phase (49 แถว)
- ท่าร่างกาย sprite 133 แถว / procedural 14 แถว = โอดราน `thiran` + อิโซลด์ `wila` เท่านั้น (OD-14 พัก: ภาพนิ่งใหม่ + procedural, A7-003 / PR #122 ค้าง) · เทสต์ยืนยันทุกเฟรมที่ registry อ้างมีอยู่จริงใน atlas
- VFX: วาดเฉพาะ 112 · ชุดร่วมตั้งใจ 31 (ฟันพื้นฐานตามสีอาชีพ + ท่ากายภาพศัตรูบนชุดดาบ) · วาดด้วยโค้ดตั้งใจ 4 (ธนู/ขวดพื้นฐาน AV03, Shadow Knife ×2)
- แก้ที่พบ: **Rift Beam** (ท่าประจำของอสูรส่งพลังใน 3 encounter แผนที่ 3) เคยตกไปที่เส้นพลังงานวาดด้วยโค้ด เพราะแพ็กเกจ foe signature ไม่ได้วาดชื่อนี้ → ใช้ภาพ Rift Bolt ของตัวเดียวกัน (ท่าเดียวกัน ผู้ร่ายเดียวกัน) [คลิป](clips/rift-beam-hit-normal-after-390.mp4)

## 2. A11 ตรวจสนามรวม

- `tests/browser/field-a11.spec.ts` (fixture `tests/browser/fixtures/field-a11.ts`): BattleUI/BattleScene จริง เปิด **ทุก encounter 24 อันต่อกัน 2 รอบ** ด้วยทีม 5 (OD-05) ที่ atlas หนักสุด (ไลรา, เซรีส, เซเรน, แบรนน์, ลิโอ) — ทุกตัวที่ยืนอยู่วาดจาก atlas ของตัวเอง, ชนิดซ้ำใช้ texture เดียว, รอบที่สองถือ texture เท่ารอบแรกทุก encounter (**ไม่สะสม**), ผล [`runtime.json`](runtime.json)
- สนามใหญ่สุดในเกม: หัวหน้ากองหน้า 5+3 ยืน + สำรอง 1 (เรียกเมื่อ HP 60% → 9 ตัว) — atlas ของสำรองโหลดพร้อม encounter จึงไม่มี texture ใหม่ตอนเรียก; ท่า phase/เรียกกำลังเสริมของบอสทดสอบใน `unit-a9.spec.ts` เดิม
- **แก้ที่พบ:** atlas VFX เฉพาะ encounter (boss 7.9 / foe signature 6.4 / saint-dance 6.7 MiB) เดิมโหลดแล้วไม่ปล่อยจนปิดเกม → ตอนนี้ปล่อยเมื่อ encounter ถัดไปไม่ใช้ เหมือน unit sheet (`BattleScene.encounterFx`)
- งบต่อ encounter สร้างจากโค้ด: [`BUDGET_TH.md`](BUDGET_TH.md) (`tests/encounter-budget.test.ts` ล้มถ้าสนามใดเกิน 64 MiB) — แย่สุด `vanguard-captain` ทีม 5 = **40.0 MiB decoded** (งบ ≤64) / **12.49 MB download** (เป้า ~12 MB: เกิน 0.5 MB เฉพาะกรณีเลือก 5 ตัวที่หนักสุดพร้อมกัน) · วัดใน Chromium ได้ 40.0 MiB ตรงกัน

## 3. งบภาพ: repack แบบ render-identical

`scripts/repack-atlas-lossless.py`: ตัดขอบโปร่งใสต่อเฟรม, ใช้เฟรมซ้ำร่วม, MaxRects ด้านละ ≤2048, WebP lossless — ทุกเฟรมตรวจกับต้นฉบับ `7dcace8` ด้วย `scripts/verify-atlas-repack.py`: RGBA ตรงทุกพิกเซลที่มองเห็น และโปร่งใสตรงที่เดิมโปร่งใส ([`repack-verify.json`](repack-verify.json), 14 atlas / 431 เฟรม) Phaser อัปโหลด texture แบบ premultiplied จึงไม่เคยอ่านสีใต้ alpha 0 — ภาพบนจอเหมือนเดิมทุกพิกเซล ไม่ลดคุณภาพหน้า/อาวุธ

| atlas | ขนาด | decoded MiB | ไฟล์ภาพ MB |
| --- | --- | --- | --- |
| `bolt_fx` | 2048×2048 → 746×1440 | 16.00 → 4.10 | 0.64 → 0.61 |
| `execute_fx` | 2048×2048 → 1814×358 | 16.00 → 2.48 | 0.46 → 0.44 |
| `ward_fx` | 2048×2048 → 1064×910 | 16.00 → 3.69 | 0.76 → 0.73 |
| `blade_fx` | 1584×1848 → 690×1708 | 11.17 → 4.50 | 0.55 → 1.07 ¹ |
| `projectile_fx` | 1440×2016 → 1194×1452 | 11.07 → 6.61 | 1.01 → 0.81 |
| `defense_fx` | 1584×1584 → 578×1672 | 9.57 → 3.69 | 0.50 → 1.06 ¹ |
| `alchemy_fx` | 1584×1128 → 1482×1036 | 6.82 → 5.86 | 0.98 → 0.90 |
| `earth_fx` | 1584×1152 → 1546×1032 | 6.96 → 6.09 | 1.39 → 1.18 |
| `saint_dance_fx` | 792×3168 → 1458×1209 | 9.57 → 6.72 | 1.73 → 1.68 |
| `boss_signature_fx` | 2048×1093 → 1362×1527 | 8.54 → 7.93 | 1.60 → 1.55 |
| `foe_signature_fx` | 1024×1804 → 906×1858 | 7.05 → 6.42 | 1.87 → 1.82 |
| ไลรา `lyra_pilot` | 1280×1743 → 1479×1444 | 8.51 → **8.15** | 2.31 → 2.26 |
| เซรีส `lalin_a7` | 800×2040 → 824×1881 | 6.23 → **5.91** | 2.17 → 2.16 |
| ลิโอ `lio_a6` | 768×1693 → 662×1701 | 4.96 → **4.30** | 1.45 → 1.44 |

¹ ต้นฉบับ blade/defense เป็น WebP แบบ lossy; เก็บพิกเซลเดิมแบบ lossless จึงไฟล์ใหญ่ขึ้น (+0.5 MB ต่อไฟล์) แลกกับหน่วยความจำ −6.7 / −5.9 MiB · `healing_fx` ไม่แตะ (−10 MiB ได้ แต่ไฟล์ +1.45 MB และใช้ `setCrop`)

- VFX ที่ preload ทุก battle: **124.4 → 67.8 MiB decoded** (download 10.1 MB รวม)
- ไลรา/เซรีสยังเกินเป้า download 1.5 MB และไลรายังเกิน 6 MiB: พื้นที่เฟรมไม่ซ้ำของไลราเองคือ 7.14 MiB จึง lossless ไม่ถึง 6 MiB — ทางที่เหลือต้องเปลี่ยนภาพ (ลดความละเอียด ~0.85× หรือตัดเฟรมค้างที่คล้ายกัน) ซึ่งต้องให้เจ้าของเลือก **ยังไม่ทำ**

## 4. แก้ VFX อ่านยาก (ภายใน module, คลิปก่อน/หลัง 390px จริง)

| ข้อสังเกต | แก้ | หลักฐาน |
| --- | --- | --- |
| Rift Bolt / Veil Quake มืดบนศัตรูสีมืด | ใส่ halo ด้านหลังภาพ = เงาของภาพเติมสีอ่อน (FILL tint + ADD) ใหญ่กว่าเล็กน้อย เส้นขอบมืดของภาพเดิมยังอยู่ด้านบน (Rift Beam ได้ด้วย) | [bolt](clips/rift-bolt-hit-normal-before-after.jpg) [before](clips/rift-bolt-hit-normal-before-390.mp4)/[after](clips/rift-bolt-hit-normal-after-390.mp4) · [quake](clips/veil-quake-hit-normal-before-after.jpg) [before](clips/veil-quake-hit-normal-before-390.mp4)/[after](clips/veil-quake-hit-normal-after-390.mp4) |
| ribbon นักเต้นยืดเมื่ออยู่ช่องบน | link ที่ยาวเกิน 1.8× ความยาวภาพ วาดเป็นหลายช่วงต่อกัน (≤4) แต่ละช่วงยืดไม่เกิน 1.8×; ระยะใกล้เหมือนเดิม | [duet](clips/duet-normal-before-after.jpg) [before](clips/duet-normal-before-390.mp4)/[after](clips/duet-normal-after-390.mp4) |
| Rounddance / Deepbeat จาง | ขอบหน้าของวงแหวนเป็น additive และแรงขึ้น (.55 → .85–.9) | [rounddance](clips/rounddance-normal-before-after.jpg) · [deepbeat](clips/deepbeat-normal-before-after.jpg) (Deepbeat ต่างเล็กน้อย: วงฟ้าบนพื้นฟ้า) |

คลิปทั้งหมดจับจาก CDP screencast ตามเวลาจริง (ไม่ retime) ที่ 390×844 Chromium SwiftShader — ภาพก่อนจาก worktree `7dcace8` ภาพหลังจากสาขานี้ จังหวะเฟรมอาจไม่ตรงกันทุกภาพนิ่ง

## 5. แผงวัดบนมือถือจริง

`?perf=1` → `src/platform/perf-probe.ts` (โหลดเฉพาะเมื่อมี flag, 4.4 kB) — เวลาเริ่ม/สนามพร้อม, fps/p95/เฟรมช้า/กระตุก, texture และ heap (ถ้าเบราว์เซอร์ให้วัด), ปุ่มคัดลอก JSON · วิธีใช้: [`MOBILE_PERF_TH.md`](MOBILE_PERF_TH.md) · เทสต์ `tests/browser/perf-probe.spec.ts`
**ยังไม่ได้ทดสอบบน iOS Safari หรือมือถือจริง** จนกว่าเจ้าของส่งผล

## การทดสอบ

- `npm run typecheck`, `npm run lint`, `npx vitest run` 97 ไฟล์ / 1348 เทสต์ผ่าน, `npm run build`
- Playwright ในเครื่อง: foe-signature, saint-dance, bolt, blade, exec-ward, defense, projectile, alchemy, earth, unit-a1/a6/a7/a9, field-a11, perf-probe — ผ่าน; alchemy 2–3 เคสล้มเฉพาะตอนรัน 4 worker พร้อมกัน (เคสต่างกันแต่ละรอบ) และผ่าน 57/57 เมื่อรันเดี่ยว; full browser 4 shards บน CI

## งานค้างที่รู้อยู่แล้ว

1. โอดราน/อิโซลด์ (`thiran`/`wila`) — พักตาม OD-14, A7-003 (PR #122) ไม่อยู่ในงานนี้
2. งบ download ไลรา 2.26 MB / เซรีส 2.16 MB และ decoded ไลรา 8.15 MiB ยังเกินเป้า — ต้องให้เจ้าของเลือกวิธีที่เปลี่ยนภาพ
3. ผลวัดมือถือจริง/iOS Safari — รอเจ้าของ
4. เคล/วินน์/แอสทริด (`incoming/ART-CHAR-CLASS-NEW-002`) เป็นงาน P03 ไม่ใช่ W8
