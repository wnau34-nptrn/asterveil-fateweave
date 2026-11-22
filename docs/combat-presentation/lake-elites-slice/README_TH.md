# เฟส 3 ภาพแผนที่ 4 · อสรพิษเงาและนางเงือกร้องไห้ R1

คลิปจาก Phaser และ Battle UI ที่ 390×844 ใน Chromium จำลองจอสัมผัส แต่ละคลิปแยกท่าจาก intent ของ encounter จริงในฉากทะเลสาบ แล้วตรวจผลหลังเล่นซ้ำกับ resolver

| ศัตรู | ท่าต่อสู้ | ท่าล้ม |
| --- | --- | --- |
| อสรพิษเงา | [Shadow Fang](shadow-serpent-shadow-fang-390.webp) · [Venom Spit](shadow-serpent-venom-spit-390.webp) · [Coil Gathering](shadow-serpent-coil-gathering-390.webp) · [Crushing Coil](shadow-serpent-crushing-coil-390.webp) | [ล้ม](shadow-serpent-down-390.webp) |
| นางเงือกร้องไห้ | [Tide Lash](weeping-siren-tide-lash-390.webp) · [Weeping Song](weeping-siren-weeping-song-390.webp) · [Drowning Call](weeping-siren-drowning-call-390.webp) | [ล้ม](weeping-siren-down-390.webp) |

- ภาพมาจาก ART-UNIT-ANIMATION-LAKE-001 ที่ commit `0ea9c459` (PR #340) ทั้งคู่ใช้ R1 ตามคำเลือกของเจ้าของ เฟรมต้นฉบับ 512×512 ผ่านการตรวจ SHA-256 และเทียบพิกเซลที่มองเห็นหลังประกอบ atlas รายละเอียดขนาดและ hash อยู่ใน [รายงานการประกอบ](../../validation/map4-lake/elites-runtime.json)
- งบทีม 5 คนที่ใช้ atlas หนักที่สุดอยู่ที่ 48.3 MiB / 14.60 MB สำหรับอสรพิษ และ 48.2 MiB / 14.61 MB สำหรับนางเงือก ทั้งคู่ผ่านเพดาน decoded 64 MiB แต่เกินเป้าหมายดาวน์โหลด ~12 MB ด้านยาวของ atlas อสรพิษคือ 2182 px พอร์เทรตใช้ภาพครอปจาก ready seed [รายงานงบ](../../validation/w8-field-audit/BUDGET_TH.md)
- รอเจ้าของอนุมัติ motion สำหรับเฟสนี้ คลิปทดสอบบน Chromium emulation การตรวจบนมือถือจริงและ Safari ยังรออยู่

## ทำซ้ำ

```sh
python3 -I scripts/build-lake-foes.py <package-dir> --elites
python3 scripts/portraits-half.py
npm run coverage:presentation
UNIT_A4_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser -- tests/browser/unit-a4-clips.spec.ts -g 'foe_shadow_serpent|foe_weeping_siren' --trace off
```

คลิป WebP ประกอบด้วย Pillow จากเฟรม CDP ของ Playwright ตามช่วงห่างของ timestamp โดยค้างเฟรมสุดท้าย 300 ms จำนวนเฟรม ระยะเวลา และ SHA-256 อยู่ใน [clips.json](clips.json)
