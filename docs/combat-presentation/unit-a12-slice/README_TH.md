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
**เพิ่ม 2026-11-11 — 7 คลิปของท่าที่ต้องจัดฉาก** (`UNIT_A12_CLIPS=1 UNIT_A12_ONLY=staged …` แล้วรวม manifest กับ 19 คลิปเดิม = 26; คลิปเดิมไม่ได้อัดใหม่ จึงยังเป็น HUD ก่อน #216–#218) ทุกผลลัพธ์มาจาก resolver จริง ฉากจัดใน `tests/fixtures/unit-a12.ts` เท่านั้น ไม่แตะกฎ/คอนเทนต์/สมดุล:

| คลิป | ท่า (clip) | การจัดฉาก |
|---|---|---|
| `kael-circlefist` | หมัดวงกลม (circle) | ต้นศึก ไม่มีปราณ จ่าย HP 7 ตีทั้งแถว 14 |
| `kael-perfectfist` | หมัดสมบูรณ์ (release) | prelude สะสมปราณครบ 3 ด้วยหมัดรวมปราณ; ศัตรู HP ×6 เพื่อให้รอดถึงตอนปล่อย (ตัวเลข 167/264 ในคลิปจึงไม่ใช่ค่าจริงของมอนสเตอร์) |
| `wynne-lifetoll` | ดึงด้าย (toll) | prelude ลงสาปด้วยด้ายสาปก่อน แล้วดึง |
| `wynne-tollring` | วงด้ายดึง (weave) | prelude ลงสาปหนึ่งชั้นก่อน เพื่อให้เห็นการดึง |
| `astrid-deflectfate` | เบนชะตา (deflect) | ศัตรูสองตัว เลือกเป้าแล้วเลือกผู้รับใน dialog จริง; ท่าของตัวแรกเบนไปโดนตัวที่สอง |
| `astrid-turncycle` | เลื่อนท่าใหญ่ (dial) | ศัตรูมีสองท่าและท่าถัดไปเป็นท่าใหญ่ การเลื่อนจึงเกิดจริง |
| `astrid-doubledial` | ดาวตก (dial) | คลิปเห็นเฉพาะตอนตั้งท่า **ดาวที่ตกตอนจบรอบไม่อยู่ในคลิป** (ต้องให้อีกสองคนเล่นจนจบรอบ) |

แถบสกิลในคลิปใหม่มี 3 ปุ่ม (โจมตี + ท่าปูทาง + ท่าที่ดู) Claude ตรวจภาพจังหวะปะทะของทั้ง 7 แล้ว: ใช้เฟรมที่วาด ไม่มีข้อผิดพลาดในหน้า

**เจ้าของอนุมัติ motion ของ 7 คลิปนี้ด้วยคำว่า “ผ่าน ไปต่อได้” เมื่อ 2026-11-11 หลังได้รับคลิป (อนุมัติโดยตรง ไม่ได้อนุมานจากเทสต์)** คำอนุมัตินี้ครอบคลุม 7 คลิปที่ส่งรอบนี้; 19 คลิปเดิมไม่ได้ส่งซ้ำในรอบนี้
VFX ของสามคลาสยังใช้ของร่วมตามเดิม (ตราผนึก/หมัดนักบุญ) ไม่เปลี่ยน
