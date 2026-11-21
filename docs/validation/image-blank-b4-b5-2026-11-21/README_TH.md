# B4 ภาพเบลอแทนช่องว่าง + B5 ไฟล์ภาพแผนที่เบาลง (21 พ.ย. 2026)

เจ้าของ: “ทำ B4 กับ B5 ต่อใน chat ใหม่” (ต่อจาก [รายงานวิเคราะห์ภาพว่าง](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/claude/image-blank-audit/docs/validation/image-blank-2026-11-21/README_TH.md) และ [B1–B3/B6](../image-blank-fix-2026-11-21/README_TH.md)). แก้เฉพาะการโหลด/การเข้ารหัสภาพ — ไม่เปลี่ยนกติกา เซฟ เนื้อหา ตัวเลข หรือพิกัด frame

## สถานะการอนุมัติภาพ

เจ้าของ (21 พ.ย. 2026) ดูภาพเทียบไทล์ lossless/lossy และ placeholder เบลอหน้าชื่อเกมแล้วตอบ: **“ภาพใช้ได้ merge ได้เลย”**

## B4 — placeholder เบลอ

- `scripts/build-lqip.py` (Pillow) สร้างภาพ 32 px ความกว้างของ 8 ฉาก (หน้าชื่อเกม `title_party`, ค่าย `lobby_bg`, พื้นหลังศึก `ruins`/`battle_forest`/`battle_riftline`, เล่าเรื่อง `story_awaken/rift/retreat`) → `src/ui/lqip.generated.ts` (data URI webp 190–640 อักขระต่อภาพ) พร้อม hash ของไฟล์ต้นฉบับ
- `src/ui/lqip.ts` `trackLqip(host, url)`: ถ้าภาพจริงยังไม่โหลด ใส่คลาส `lqip-on` + `--lqip`; CSS (`game-feel.css` ท้ายไฟล์) วาดชั้นเบลอทับภาพจริงที่ยังโหลดไม่ครบ (ชื่อเกม: `::after` ของ `.title-stage`; ค่าย: `::after` ของ `.lobby-backdrop`; ศึก/เล่าเรื่อง: `::before` ใต้เนื้อหา คงเกรเดียนต์เดิม) แล้ว fade ออก 0.4 s เมื่อ decode เสร็จ (reduced motion: ถอดทันที). ใช้ `Image` ของตัวเองเฝ้าไฟล์ จึงไม่แตะแคช/เพดานรอของ B1
- ไม่มี placeholder สำหรับ `lobby_fg` (ชั้นหน้ามี alpha) และ atlas อื่น
- ภาพ 390px DPR 3 (จำลองเน็ตช้าด้วย route ที่ค้างไฟล์): [`title-placeholder.png`](title-placeholder.png), [`camp-placeholder.png`](camp-placeholder.png) (ฉากค่ายขึ้นตามเพดาน 1.8 s ขณะ `lobby_bg` ยังค้าง), [`camp-loaded.png`](camp-loaded.png)

## B5 — ไฟล์ภาพแผนที่

| ไฟล์ | ก่อน (lossless) | หลัง (lossy q92, alpha lossless) | เท่า |
|---|---|---|---|
| `world/tileset.webp` | 907 KB | 239 KB | 3.8× |
| `world/decor.webp` | 736 KB | 255 KB | 2.9× |

- ต้นฉบับ lossless เก็บเป็น master ที่ `assets-master/world/` (ไม่ถูก ship); `scripts/build-lossy-world.py [--report]` สร้างซ้ำได้; ขนาดภาพและ frame เหมือนเดิมทุกตัว (ทดสอบขนาดตรงกับ master)
- revision `?v=` ใน `WORLD_REV` (`world-art.ts`) และ CSS (`world.css`, `game-feel.css`); `tests/world-art-rev.test.ts` ตรวจ hash ของไฟล์ที่ ship
- วัด: alpha ต่างกัน 0; ทั้งจอแผนที่ 390px DPR 3 เทียบ lossless/lossy: ต่างเฉลี่ย 1.6/255 (p99 12) ไม่เห็นรอยต่อไทล์หรือสีเพี้ยนด้วยตา. ภาพเทียบ: [`map-compare.png`](map-compare.png) (ซ้าย lossless ขวา lossy), เต็มจอ [lossless](map-lossless-390.png) / [lossy](map-lossy-390.png)
- `title_party.webp` ไม่ทำ: lossy q85 เล็กลงแค่ 1.4× (439→305 KB) — ไม่คุ้มความเสี่ยงต่อภาพหลักหน้าชื่อเกม

## วัด `blank.perf.ts` (Chromium emulation 390×844 DPR 3, 4G + CPU 4×, เปิดครั้งแรก, ตัวอย่างเดียว ไม่ใช่มือถือจริง)

[`blank-after-b4b5-cold.json`](blank-after-b4b5-cold.json) เทียบ [หลัง B1–B6](../image-blank-fix-2026-11-21/blank-after-cold.json): ไม่มีภาพที่ว่างตอนหน้าจอขึ้นเลย (ค่ายเหลือ 0 จากเดิม 1 ไฟล์); เวลาขึ้นหน้าจอแกว่งตามรอบวัด (ค่าย 2.7→3.3 s, แผนที่ 1.2→2.1 s, ศึก 1.4→1.5 s) — ตัวอย่างเดียว ยังสรุปว่าเร็วขึ้นหรือช้าลงไม่ได้ ควรวัดซ้ำ/บนมือถือจริง ส่วนศึกปุ่มเริ่มยังรอ ~17 s (decode atlas, ไม่เกี่ยวกับงานนี้)

## ทดสอบ

- ใหม่: `tests/lqip.test.ts`, `tests/world-art-rev.test.ts`, `tests/browser/lqip.spec.ts` (ชื่อเกม/ค่าย: placeholder ขึ้นระหว่างไฟล์ค้าง แล้วหายเมื่อมาถึง); `image-ready.spec` ปรับให้ค้างพื้นหลังค่ายจนหลังกด (ค่ายถูกสร้างตอนเปิดแอป)
- typecheck, eslint, `npm test` (2136 ผ่าน), build; Playwright: lqip, image-ready, lobby-shots, story-p05, world, battle-hud, portrait-keyboard, combat, region-shots ผ่านทั้งหมด. Chromium เท่านั้น — ไม่ได้ทดสอบ iOS Safari/มือถือจริง
- สคริปต์ถ่ายภาพ: [`scripts/b4b5-shots.spec.ts`](scripts/b4b5-shots.spec.ts) (คัดลอกไว้ใน `tests/browser/` แล้วรันด้วย `SHOTS_DIR`)
