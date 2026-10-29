# A7 — เมตตา + ธีรัน (Saint) + ลลิน + วิลา (Dancer)

29 ตุลาคม 2026 · branch `claude/av06-a7-saint-dance-bodies` · ฐานเกม `ba5db3f` · งาน audit AV06 (W5)

[หน้าเลือกคลิปจริง 390px](index.html) · [แหล่งภาพ/ข้อสังเกตของ Codex](../../../incoming/ART-UNIT-ANIMATION-A7-001/NOTES.md) · [สคริปต์ normalize](../../../incoming/ART-UNIT-ANIMATION-A7-001/build_assets.py) · [ผล normalize/แพ็ก](../../../incoming/ART-UNIT-ANIMATION-A7-001/validation-normalized.json)

**สถานะ: รอเจ้าของดูคลิปจริงและอนุมัติ motion ก่อน merge/เผยแพร่** — ผลเทสต์ไม่ใช่การอนุมัติภาพ

## การเลือกภาพ (สมมติฐานที่ต้องยืนยัน)

แพ็กต้นทาง: branch `art/art-unit-animation-a7-001` ที่ `ef31abc` (PR #98) ตรวจ sha256/ขนาดของไฟล์ทั้ง 115 ไฟล์กับ `validation.json` ตรงทั้งหมด (ไฟล์ดิบไม่ถูกแก้)

**เจ้าของยังไม่ได้เลือก candidate ของ A7** จึงใช้ตามรูปแบบประจำ “ใช้ตาม Codex แนะนำ” เป็นสมมติฐาน (ไม่ใช่คำตอบตรงจากเจ้าของ): หมัด Saint R1 (attack/saintstrike/vowstrike), saintarc R1, communion/sharewound R1, **lastlight R2**, Dancer attack R1, **cadence/duet/deepbeat R2**, rounddance R1, echofoot R1, **closingstep R2**, reaction ทั้งหมด R1 หากเจ้าของเลือกต่าง ให้แก้ตาราง `SAINT`/`DANCE` ใน `build_assets.py` แล้วรันใหม่

## ด่านสัดส่วน (anatomy gate): strip ที่หัวใหญ่กว่า seed ไม่ถูกส่ง

ตรวจด้วย `scripts/unit-anatomy-audit.py` (scale ของหัว/ลำตัวส่วนบนเทียบ seed) กฎ: ส่งได้เมื่อ median ≤1.15 และไม่มีเฟรมที่วัดได้เกิน 1.20 (bbox/พื้นเท้าตรงไม่พอ ตามบทเรียน Aegis)

| ตัว | ผ่าน | **ไม่ส่ง (คง procedural)** — head scale |
| --- | --- | --- |
| Metta | ทุก strip (≤1.09) | — |
| Thiran | ทุก strip (≤1.14) | — |
| Lalin | partner-turn R2 (1.06), closing-step R2 (1.08) | dance-strike R1 (1.32), circle-spin R1 (1.31), echo-closing R1 (1.31), hit R1 (1.15–1.18), block R1 (1.14–1.25), down R1 (1.24) |
| Wila | dance-strike R1 (1.13–1.18), partner R2, circle R1 (1.14), closing R2, hit R1, block R1 (1.15–1.19) | echo-closing R1 (1.20–1.34), down R1 (1.23–1.25) |

ไม่ได้ปรับ scale ชดเชยหรือซ่อนความต่าง (ลดตัวตามหัวทำให้ลำตัวเล็กลง ~22%) ผลคือ Lalin เหลือ 4 จาก 7 ActionId ที่มีท่า (cadence/duet/deepbeat/closingstep) ส่วน `attack`, `rounddance`, `echofoot` + hit/block/down ใช้ motion procedural เดิมกับภาพ seed; Wila ไม่มี `echofoot` และไม่มี down sprite (ล้มแบบ procedural) ต้องการให้ Codex วาด R1 ของ strip เหล่านี้ใหม่ให้หัวตรง seed (ลลิน dance-strike/circle/echo/reactions, วิลา echo-closing R1/down) ก่อนจึงจะเติมได้

## Audit จาก content จริง และ mapping

Metta/Thiran 7 ActionId: `attack saintstrike communion` + ต้นไม้ `saintarc vowstrike sharewound lastlight`; Lalin/Wila 7 ActionId: `attack cadence duet` + `rounddance deepbeat echofoot closingstep` (`roster-batch1.ts`; เทสต์เทียบ content + talentTrees ครบ) ทุก strip 6 ช่อง (ช่อง 0 = seed idle ล็อกเป็นเฟรม 0) สัมผัส = เฟรมแรกของช่วงคืนท่า เวลา/สัมผัสยังเป็น cue ของ UI/resolver เหมือนเดิม

| ActionId | body clip | เฟรม (atlas) | สัมผัส |
| --- | --- | --- | --- |
| Metta/Thiran `attack` `saintstrike` `vowstrike` | หมัดตรง R1 | 1–6 | **3** |
| `saintarc` | กวาดแขน R1 | 7–12 | **9** |
| `communion` `sharewound` | ยื่นฝ่ามือ R1 | 13–18 | **15** (ท่าอย่างเดียว; heal/damage มาจาก event จริงของ resolver) |
| `lastlight` | ทุบลง R2 | 19–24 | **22** (ยกกำปั้นแล้วทุบลง) |
| hit / block / down | R1 | 25–27 / 28–30 / 31–34 | down ค้างเฟรม **34** (นอนคว่ำ) |
| Wila `attack` | dance-strike R1 | 1–6 | 3 |
| Wila/Lalin `cadence` `duet` `deepbeat` | partner-turn R2 | Wila 7–12, Lalin 1–6 | Wila **10**, Lalin **4** (เชิญเพื่อนทางซ้าย) |
| Wila `rounddance` | circle-spin R1 | 13–18 | **15** |
| Wila/Lalin `closingstep` | echo-closing R2 | Wila 19–24, Lalin 7–12 | Wila **22**, Lalin **10** (โค้งคำนับ) |
| Wila hit / block | R1 | 25–27 / 28–30 | down = procedural |

`unit-frames.ts` เพิ่มเฉพาะ `own: true` (เลย์เอาต์เฉพาะ identity: clip/reaction ที่ไม่ได้ลงทะเบียนคง procedural ไม่ตกไปใช้เลย์เอาต์ร่วม 0–37) และ `downFrame` (เฟรมนอนค้างของ Metta/Thiran = 34; อื่นๆ คง 21; identity ที่เป็น `own` ไม่มี down = เฟรม seed 0) พร้อมแก้ `unitFrameView.reset` และ `BattleScene` ให้ใช้ `unitDownFrame` identity เดิมทั้งหมดไม่เปลี่ยน ไม่มีการวาดแสงฟื้นฟู/ริบบิ้น/ออร่าในตัว: Dancer ไม่เพิ่มเทิร์น/SPD และ Saint ไม่ฟื้นก่อนมี damage — ผลทุกอย่างมาจาก event ของ resolver

## การ normalize และงบภาพ

- หนึ่ง scale ต่อ strip (พื้นที่ร่างแรกเทียบ seed × factor .42, display ratio 1/.42) พื้นเท้า y=496/x=256 คงความสูงจริงของท่าคุกเข่า/นอนคว่ำ ขอบล่าง ≤500/512 (เทสต์) defringe, trim/dedup, WebP lossless (ยืนยัน RGBA ตรงต้นฉบับ), optional atlas ไม่อยู่ใน critical preload
- ท่า ready (ร่างแรกของแต่ละ strip) แทนด้วย seed idle เพื่อให้เริ่ม/จบที่ภาพเดิมเสมอ

| ตัว | เฟรม | ไม่ซ้ำ | decoded | ดาวน์โหลด |
| --- | --- | --- | --- | --- |
| Metta | 35 | 31 | 4.18 MiB | 1,372,287 B |
| Thiran | 35 | 31 | 4.10 MiB | 1,358,416 B |
| Lalin | 13 | 11 | 1.93 MiB | 625,180 B |
| Wila | 31 | 27 | 4.34 MiB | 1,417,238 B |

ทุกตัว ≤6MiB / ≤1.5MB (ครั้งแรกที่ใส่ strip ครบ Lalin เกินงบที่ factor .42 จึงตัด strip ที่ไม่ผ่าน anatomy ออกก่อน ซึ่งทำให้ไม่ต้องลด factor) ผลข้างเคียง: encounter ที่มี Metta/Thiran/Lalin/Wila โหลด optional sheet เพิ่มหนึ่งแผ่นต่อคน; ไม่มี Aegis (`anatomyHold`) ถูกโหลด

## หลักฐานและข้อจำกัด

- เทสต์: `tests/unit-a7.test.ts` (40 เคส: ActionId เทียบ content, สัมผัส/windup ต่อ ActionId จาก resolver จริง, strip ที่ไม่ส่งคง procedural, downFrame/reset, hit/down event จริง, งบ/เลย์เอาต์/idle ที่ล็อก) และ browser `unit-a7.spec.ts` 45 เคส ผ่านหมด (28 ActionId × windup/contact/ผลลัพธ์ตรง, fast/reduced/OS reduce, skip/resize/reload/hidden, hurt/down 4 ตัว, optional texture ล่าช้า, ปล่อย texture เมื่อเปลี่ยน encounter) เพิ่มใน `browser.yml`/`pages.yml`
- คลิปจริง 26 คลิป 390px จาก UI/Phaser/playback/resolver จริง (แต่ละตัว: attack + 2 สกิลเด่น + hit + down) ถอดรหัสซ้ำยืนยันเวลาเฟรม: 2,140 เฟรม, ช่องว่างสูงสุด 0.826 s (Chromium SwiftShader บนเครื่องที่แชร์ CPU), PTS error ≤0.0062 ms ไม่ retime/แทรกเฟรม ตรวจเฟรมของคลิปเอง: ตัวหันขวา ยืนบนพื้นเท้า และกลับ idle หลังท่า
- Chromium จำลองมือถือบน cloud ไม่ใช่ iOS Safari/มือถือจริง ไม่รับรอง 60fps
- ไม่เปลี่ยน rules/save/content/balance/ActionId/playback timing; ข้อสังเกต: `unit-a6.spec.ts` บนฐานนี้ยังนับ `unit-pilot-aegis` (ค้างจากก่อน anatomy hold) ไม่ได้แตะในงานนี้
