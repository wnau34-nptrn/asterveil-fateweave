# A10 — นักจู่โจม (Veil Raider, `raider`) + อสูรรอยแยก (Rift Brute, `brute`)

29 ตุลาคม 2026 · branch `claude/av06-a10-raider-brute` · ฐาน `ba5db3f` (audit AV06 / W8)

[หน้าเลือกคลิปจริง 390px](index.html) · [แหล่งภาพ/ข้อสังเกตของ Codex](../../../incoming/ART-UNIT-ANIMATION-A10-001/NOTES.md) · [สคริปต์ normalize](../../../incoming/ART-UNIT-ANIMATION-A10-001/build_assets.py) · [ผล normalize/แพ็ก](../../../incoming/ART-UNIT-ANIMATION-A10-001/validation-normalized.json)

**สถานะ: นำเข้าแล้ว รอเจ้าของดูคลิปและอนุมัติ motion** — ยังไม่มีการอนุมัติ ผลเทสต์ไม่ใช่การอนุมัติภาพ

## แหล่งภาพ

แพ็ก `art/art-unit-animation-a10-001` (10 แถบ `-r1` ท่าละหนึ่งแถบ ทั้งหมดเป็น preferred) — ตรวจ SHA-256/ขนาดทุกไฟล์กับ `validation.json` ผ่าน (`build_handoff.py --verify`: 33 ไฟล์, PNG 28 ไฟล์ verify+load) และเทสต์ `tests/unit-a10.test.ts` เทียบ sha256 ของแถบดิบที่ใช้ทั้ง 10 กับ manifest ไฟล์ดิบไม่ถูกแก้ เฟรมแรก/เฟรมสุดท้าย (ท่าคืน) ของแต่ละแถบคือ seed เดิมพิกเซลต่อพิกเซล

## ทิศทาง (สำคัญ)

แถบทั้งหมดหันซ้ายแล้ว (เจ้าของเลือก seed ที่ mirror ของ Raider แล้ว) atlas ที่แพ็กจึง**ไม่ถูกพลิกซ้ำ**: `BattleScene` ใช้ `setFlipX(!framed && mirroredArt.has(key))` ซึ่ง atlas ที่แพ็กไม่เคย flip (`mirroredArt` ยังมี `raider` สำหรับภาพ static เดิมเท่านั้น) ตรวจในเบราว์เซอร์ (`flipX === false` ที่เฟรมสัมผัสของทุกท่า) และจากภาพนิ่ง 390px: ทั้ง Raider และ Brute หันซ้ายเข้าหาฝ่ายฮีโร่

## Audit จาก content/runtime จริง

ทุก encounter ที่ใช้ `raider`/`brute` (เทสต์ audit ไล่ `encounters` ทั้งหมด): มีเฉพาะ `veil-siege` (`b1` Raider, `f1` Brute) ไม่มี intent ที่ไม่ได้แมป

| intent จริง | body clip | เฟรม (เตรียม → สัมผัส/ปล่อย → คืน) | VFX เดิม |
| --- | --- | --- | --- |
| Raider `Raking Slash` | raking-slash `attack` 1–8 | เตรียม1–4 สัมผัส**5** (ฟันซ้าย) คืน5–8 | basic impact เดิม |
| Raider `Shadow Knife` | shadow-knife `skill` 9–16 | สัมผัส**13** (มือว่างขว้าง ไม่มีมีดวาด) | พลังงาน/ขว้างเดิมตาม event |
| Brute `Crushing Blow` | crushing-blow `attack` 1–8 | สัมผัส**5** (กรงเล็บทุบลง) | basic impact เดิม |
| Brute `Rift Bolt` | rift-bolt `skill` 9–16 | สัมผัส**13** (สองฝ่ามือปล่อยซ้าย) | energy VFX เดิม |
| hit | 17–18 | ตาม damage event | — |
| down | 19–21 ค้าง**21** (ท่านอน) | ตาม down event | `unit-frame-view.reset` ใช้ 21 อยู่แล้ว ไม่ต้องเพิ่ม field |
| block | 22–23 | เมื่อ damage amount = 0 (ถูกดูดซับหมด) | — |

Contact/release = เฟรมที่ 4 ของแถบ 6 เฟรม = เฟรมแรกของ recover ไม่มี `release` (ไม่มีกระสุนวาด) intent อื่น/ไม่ได้แมปคงภาพ+procedural เดิม

**เรื่อง block:** ใน content ปัจจุบัน ศัตรูไม่มีทางเกิด block จริง (damage 0 ต่อศัตรูที่ยังมีชีวิตไม่เกิดจาก resolver) เฟรม block จึงถูกแมปไว้ล่วงหน้าตามนโยบาย `unitReactions` (amount 0 → `block`; เทสต์ยืนยัน) คลิป block ที่แนบสร้างด้วยฉาก QA ที่แก้ amount เป็น 0 ในเทิร์นฮีโร่จริง (presentation-only ไม่ commit/ไม่ save) — **ไม่ใช่เหตุการณ์ resolver จริง**

## การตรวจภาพและ normalize

- **Scale**: หนึ่ง scale ต่อแถบ = factor ร่วม .5 (display ratio 2 เท่า seed เดิมที่ cell 512 แสดงที่ขนาดเดิมของตัวละคร) แถบดิบถูกปรับ scale ให้ตรง seed ที่ฝั่ง Codex แล้ว (เฟรมแรกคือ seed เป๊ะ) จึงไม่ปรับรายเฟรม
- **พื้นเท้า/แกน**: ทุกท่าติดพื้น วางพื้นเท้า y=496 / x=256; ขอบล่างทุกเฟรม ≤500/512 (เทสต์) เส้นพื้นบน contact sheet ตรงทุกท่า ขนาดหัว/สัดส่วนสอดคล้อง seed ทุกท่า (ตรวจ 19 เฟรมต่อตัวบน contact sheet 256px) ไม่มีแถบที่สัดส่วนผิด จึงแมปครบ
- **ขอบสี/เศษ**: defringe, ลบเศษเล็กเฉพาะเฟรมที่ generate; เฟรม idle คือ seed เดิม
- **เศษทองจิ๋วจาก seed เดิม** (ขอบบนของ cell เดิม และผลึกสูงสุดของ Brute ชิดขอบบน): คงไว้ใน idle/เฟรมคืนท่า ไม่ retouch เห็นเป็นจุดทองเล็กเหนือหัวในเฟรม 0/1/8/9/16 การลบต้องเป็นการตัดสินใจ seed cleanup แยกต่างหาก
- Raider hit/down (เฟรม 17–21) ใบมีดยาวลากต่ำข้างลำตัวตามต้นฉบับ; เจ้าของควรดูท่า collapse ในคลิป

## งบภาพ (decoded RGBA, optional loader เดิม)

| ตัว | เฟรม | atlas | decoded | ดาวน์โหลด (atlas+JSON) | display ratio |
| --- | --- | --- | --- | --- | --- |
| Raider | 24 (unique น้อยกว่า: idle ใช้ซ้ำ) | 512×1905 | 3,901,440 B (3.72 MiB) | 1,141,459 B | 2 |
| Brute | 24 | 1536×713 | 4,380,672 B (4.18 MiB) | 1,442,837 B (ใกล้เพดาน) | 2 |

เพดานต่อตัว decoded ≤6 MiB / ดาวน์โหลด ≤1.5MB ผ่านทั้งคู่ ไม่ใช่ RAM/GPU รวมของเกมหรือผลบนมือถือจริง; ไม่เพิ่ม critical preload

## ผลทดสอบ

- `npx tsc --noEmit`, `npm run lint`, `npx vitest run tests/unit-*.test.ts tests/optional-unit-assets.test.ts`
- `tests/browser/unit-a10.spec.ts` (19 เทสต์: ทุก intent, hit, enemy-down ค้างเฟรม 21, block ฉาก QA, speed/reduced/OS reduce, skip/resize/reload/hidden, โหลดช้าไม่สลับภาพกลางเทิร์น, โหลดเฉพาะ sheet ที่ใช้)
- regression: `unit-loading`, `unit-pilot`, `unit-a1`–`unit-a6` (104 ผ่าน) — fixture A1–A6 เดิมใช้ `art:'brute'` เป็น "encounter ที่ไม่มีภาพ animated" ตอนทดสอบการคืน texture จึงเปลี่ยนเป็น `foe_golem`
- คลิปจริง 9 คลิป (เวลาจริง, 390px, Chromium จำลองบน cloud ด้วย SwiftShader — **ไม่ใช่ผลจากมือถือจริง**): ทั้ง 4 intent (มี hit ของศัตรูในคลิปเดียวกัน), down ×2, block ×2 (ฉาก QA), OS reduced-motion ×1 — จับด้วย `tests/browser/unit-a10-clips.spec.ts` (`UNIT_A10_CLIPS=1`) และ encode ด้วย `tests/browser/fixtures/encode-unit-a10-clips.py`

## Runtime ที่เปลี่ยน

- `unit-frames.ts`: registry `raider`/`brute` (intents + reaction block)
- `unit-atlases.json` + `public/assets/units/{raider,brute}_a10.*` (hash ในชื่อไฟล์)
- ไม่แก้ rules/save/content/balance/playback timing; โหลดเป็น optional + fallback เดิม
