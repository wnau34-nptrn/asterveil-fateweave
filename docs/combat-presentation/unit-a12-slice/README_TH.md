# A12 — อนิเมชันศึกของเคล / วินน์ / แอสทริด (นำเข้า 2026-11-05)

ที่มา: PR #157 (`art/art-unit-animation-a12-001`, commit `b2adb6e`) นำเข้าเฉพาะไฟล์ที่ใช้ (cells + seeds + สคริปต์), ไม่ merge สาขาอาร์ต
**การเลือกภาพ/ท่าเป็นการตัดสินของ Claude ตามที่เจ้าของมอบหมาย 2026-11-04 ไม่ใช่การอนุมัติของเจ้าของ** — เจ้าของยังไม่ได้ดูคลิปจริง

- 21 strips ที่ตรวจรอบแรกรับครบ + `astrid-deflect` R2 (แขนเหยียดแล้วกวาดลง อ่านออกที่ 111px; ตรวจจากภาพ review) รวม 22 strips
- ย่อ cell ทุกภาพ ×0.42 ครั้งเดียว (Lanczos) วางเท้ากลาง x=256 เส้นพื้น y=496 ใน cell 512 ตามแบบ A7-002; `displayRatio` 1/.42; atlas lossless
- สล็อต 0 = seed idle; ท่าแอ็กชัน 6 สล็อต `[idle, เฟรม 2–6]` (prepare 2 / recover 4, contact = recover แรก); hit/block = เฟรม 2–4; down = 1–4
- งบ: kael 41 เฟรม 4.06 MB decoded / 1.06 MB; wynne 35 เฟรม 3.01 / 1.08 MB; astrid 35 เฟรม 2.81 / 0.97 MB — ทุกตัวอยู่ในงบ (≤6 MiB, ≤1.5 MB)
- แมป: kael attack→attack, gather/flow→gather, release/perfect→release, circlefist→circle, storedfist→stored; wynne threadhex/knothex/longthread→knot, lifetoll→toll, wovenhex/tollring→weave; astrid starneedle→attack, deflectfate/crossing→deflect, turncycle/doubledial→dial, readorbit→read
- `STILL_ONLY` ว่างแล้ว; `npm run coverage:presentation` regenerated

## คลิปจริง 390px (Chromium emulation ไม่ใช่มือถือจริง/iOS Safari)
19 คลิป (`UNIT_A12_CLIPS=1 npx playwright test tests/browser/unit-a12-clips.spec.ts` + `encode-unit-a12-clips.py`): attack ปกติ/ถูกตี/ล้ม/บล็อกของทั้งสามตัว, kael gather/release/stored, wynne threadhex/wovenhex, astrid crossing (deflect R2)/readorbit.
**ไม่มีคลิปในเกม**: circlefist, perfectfist, lifetoll, tollring, deflectfate, turncycle, doubledial (fixture จัดฉากจากต้นศึกไม่ได้ ต้องสะสม chi/สาป/ท่าศัตรู) — เฟรมของ circle/toll/dial ตรวจโดย `tests/unit-a12.test.ts` เท่านั้น ยังไม่ได้ดูในศึก; deflect ดูผ่าน crossing (ใช้ clip เดียวกัน)
VFX ของสามคลาสยังใช้ของร่วมตามเดิม (ตราผนึก/หมัดนักบุญ) ไม่เปลี่ยน
