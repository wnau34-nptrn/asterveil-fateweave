# A8 — Shard/Veil Golem, Rift Channeler, Rift Wisp, Shard Crawler (AV06 / W6)

สถานะ: นำเข้าเป็น atlas ทางเลือก (optional) บนสาขา `claude/av06-a8-crystal-rift-bodies` รอเจ้าของเลือกงานศิลป์และอนุมัติ motion — ผ่านเทสต์ไม่ใช่การอนุมัติ ไม่แตะ rules / save / content / balance / timing

## แหล่งที่มา

- Codex `art/art-unit-animation-a8-001` commit `244b22c307f3db88eb39edd1c3dc3ef9300569e1`, `incoming/ART-UNIT-ANIMATION-A8-001/`
- ตรวจ sha256 ทั้ง 46 ไฟล์ตรงกับ `validation.json`; 14 strip สุดท้าย (`-r1`) หนึ่ง strip ต่อหนึ่งท่า ไม่มีตัวเลือกให้เลือก
- Build: `python incoming/ART-UNIT-ANIMATION-A8-001/build_assets.py --write` (ไม่แก้ raw; ผลลัพธ์ละเอียดใน `validation-normalized.json`, contact sheet `*-preview.png`)

## การทำให้เป็นมาตรฐาน

- สเกลเดียวต่อ strip จากพื้นที่ของท่า ready (ซึ่งเป็น seed ตรง ๆ) = factor .5 (`displayRatio` 2) เท่าเซลล์ idle; ไม่ปรับต่อเฟรม
- ตัวที่ยืนพื้น: ฝ่าเท้า y=496 กึ่งกลางเท้า x=256; หมัดโกเลมยื่นไกลเกินขอบเซลล์ซ้าย 8px จึงเลื่อนทั้งเฟรมเข้าใน 8px (บันทึกเป็น `slide`)
- Rift Wisp (ลอย): ทุกท่าคงตำแหน่งที่วาดไว้เทียบ ready ทั้งความสูงและการเลื่อนข้าง; hover ถูกยกขึ้น 6px ทั้ง strip เพื่อไม่ให้ท่าลดต่ำเกินเซลล์ (≤500)
- Wisp down: alpha 85% → 50% → 20% คงไว้ตามที่วาด (defringe จากพิกเซลทึบที่สุด)
- ศัตรูหันซ้ายอยู่แล้ว ไม่ flip; ลบขอบสี (defringe), lossless WebP, ชื่อไฟล์มี content hash

## Layout / งบ

ช่อง 0 idle; โจมตี 1–8 (ช่อง 5 = contact = recover แรก); ท่าที่สอง 9–16 (golem = Veil Quake; ตัวอื่น alias เป็น idle); hit 17–18; down 19–21 (21 = ท่าล้มค้าง ตรงกับ `reset()` เดิม จึงไม่ต้องเพิ่มฟิลด์ downed frame); wisp hover 22–24 (seed / ลอยขึ้น / ลอยลง) เป็น `idleLoop` 160ms/เฟรม

| ตัวละคร | เฟรม | decoded | download |
| --- | --- | --- | --- |
| golem | 22 | 3.30 MiB | 1,077,307 B |
| channeler | 22 | 2.03 MiB | 547,872 B |
| wisp | 25 | 1.30 MiB | 336,175 B |
| crawler | 22 | 1.30 MiB | 386,769 B |

เกณฑ์ ≤6 MiB / ≤1.5 MB ต่อตัวละคร ผ่านทั้งหมด

## Mapping (ชื่อ intent จริงจาก content; ไม่เปลี่ยน content)

| Identity | Intent จริง | Clip |
| --- | --- | --- |
| foe_golem | Crystal Fist, Stone Fist | attack (หมัดเดียวกัน) |
| foe_golem | Veil Quake | skill (ท่าทุบสองมือ) |
| foe_rift_channeler | Rift Beam (species) และ Rift Bolt (Rear Ambush) | attack |
| foe_rift_wisp | Star Flame | attack |
| foe_shard_crawler | Crystal Stab | attack |

ไม่มี strip ใดถูกระงับ (ตรวจสัดส่วนหัว/ลำตัวเทียบ seed, ฝ่าเท้า, ทิศหันซ้าย, กลับสู่ idle และท่าล้มบน contact sheet แล้ว)

## ทดสอบ

- `npx tsc --noEmit`, `npm run lint` ผ่าน
- `npx vitest run tests/unit-*.test.ts tests/optional-unit-assets.test.ts`: 151 ผ่าน (`tests/unit-a8.test.ts` เทียบทุก intent ของ 4 identity ในทุก encounter กับ mapping; `tests/unit-a4.test.ts` ปรับให้รับ hover ของ wisp)
- `tests/browser/unit-a8.spec.ts`: 25 ผ่านใน Chromium (contact/กลับ rest ต่อ intent จริง, hit, enemy-down ค้างเฟรม 21, ความเร็ว/reduced, skip/resize/reload/hidden, hover และ reduced motion, texture มาช้า, ปล่อย texture เมื่อเปลี่ยน encounter)
- เพิ่ม `unit-a8.spec.ts` ใน `.github/workflows/browser.yml` และ `pages.yml`

## คลิป 390px จริง

13 คลิปเวลาจริง (CDP screencast + timestamp, ถอดรหัสตรวจซ้ำ) ในโฟลเดอร์นี้ + `clips.json`: 7 intent (`*-normal-normal-390.mp4` พร้อมภาพนิ่ง hero/foe), wisp hover (`*-hover-390.mp4`), enemy-down ทั้ง 4 identity, Veil Quake แบบ OS reduced-motion. ท่า hit ของศัตรูอยู่ในทุกคลิปปกติ (ฮีโร่โจมตีก่อน)

## ข้อจำกัด / ข้อควรทราบ

- Chromium SwiftShader บนเดสก์ท็อป ไม่ใช่อุปกรณ์จริงหรือ iOS Safari
- ตัวที่ล้มถูกทำให้โปร่งด้วย alpha ของ body 0.28 ตามพฤติกรรม `BattleScene` เดิม; ท่า down ของ wisp วาด alpha 20% อยู่แล้ว จึงเกือบมองไม่เห็นเมื่อซ้อนกัน (ตามที่วาด ไม่ปรับ alpha)
- ท่าลอยของ wisp กระโดดเล็กน้อยจาก seed (ลอยขึ้น ~31px ที่ขนาดเซลล์) ตามภาพ Codex
- Crawler มีขาซ้อนมาก ควรดูท่า stab บนจอจริง; ไม่มีการเปลี่ยนจังหวะเวลา (timing) หรือ VFX
