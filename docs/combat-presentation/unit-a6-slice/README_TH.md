# A6 — เซฟา + ลิโอ + ผู้ทอรอยแยก + ภูตสปอร์

29 ตุลาคม 2026 · branch `claude/unit-a6-song-shadow-vfx` · ฐานเกม `1355252`

[หน้าเลือกคลิปจริง 390px](index.html) · [แหล่งภาพ/ข้อสังเกตของ Codex](../../../incoming/ART-UNIT-ANIMATION-A6-001/NOTES.md) · [สคริปต์ normalize](../../../incoming/ART-UNIT-ANIMATION-A6-001/build_assets.py) · [ผล normalize/แพ็ก](../../../incoming/ART-UNIT-ANIMATION-A6-001/validation-normalized.json)

**สถานะ: รอเจ้าของดูคลิปจริงและอนุมัติ motion ก่อน merge/เผยแพร่** — ผลเทสต์ไม่ใช่การอนุมัติภาพ

## การเลือกภาพ

เจ้าของตอบ “ใช้ตาม codex แนะนำ”: R2 สำหรับ Sefa low stab และ Lio finale; sharp-strum และ compact ribbon ใช้ R1; ท่าอื่นใช้ candidate preferred ใน `strips.json` PNG ดิบ 26 ไฟล์ (50 ไฟล์ทั้งแพ็ก) ตรวจ sha256 กับ `validation.json` ตรงทั้งหมด (ไฟล์ดิบไม่ถูกแก้) ใช้ 21 แถบ (R1 ของ low stab/finale, R2 ของ strum/ribbon เป็นตัวเทียบ ไม่ถูกใช้)

## Audit จาก content/runtime จริง

Sefa 7 ActionId (`attack ambush backstab decoy disarm evade knives`) และ Lio 7 ActionId (`attack dread finale mend note solo valor`) มาจาก `mercenaries.ts` + unlock + `talentTrees` (เทสต์เทียบ content ครบ) Rift Weaver มี `Rune Lash` / `Rift Needle` / `Ribbon Snare`, Spore Puff มี `Spore Dust` (เทสต์ audit ทุก encounter)

| ActionId / intent | body clip | เฟรม (เตรียม → สัมผัส → คืน) |
| --- | --- | --- |
| Sefa `attack` `ambush` | double-slash 1–8 | สัมผัส**5** (ฟันไขว้ที่สอง) |
| Sefa `backstab` `disarm` | low-stab **R2** 9–16 | สัมผัส**13** (แทงต่ำยาว) |
| Sefa `knives` | knives 22–29 | สัมผัส**26** (มือเปล่าปล่อย ไม่มีมีดวาด; มีดบินใช้ VFX เดิม) |
| Sefa `evade` `decoy` | evade 30–37 | สัมผัส**34** (ก้าวหลังลงพื้น) |
| Lio `attack` `note` | strum-strike **R1** 1–8 | สัมผัส**5** (ดีดแรง) |
| Lio `valor` `mend` `solo` | sustained-song 9–16 | สัมผัส**13** (ดีดลง) |
| Lio `dread` | dread-chord 22–29 | สัมผัส**26** (ดีดลงแรง) |
| Lio `finale` | finale **R2** 30–37 | สัมผัส**34** (ยกพิณเหนือหัว) |
| hit / down (ทั้ง 4) | 17–18 / 19–21 ค้าง21 | ตาม damage/down event จริง |
| Sefa / Lio block | 38–39 | เฉพาะ event ดาเมจ 0/absorb จริง |
| Rift Weaver `Rune Lash` | rune-lash 1–8 | สัมผัส**5** (สะบัดถุงมือ) |
| Rift Weaver `Rift Needle` | rift-needle 9–16 | สัมผัส**13** (ดีดสองนิ้ว ไม่มีเข็มวาด) |
| Rift Weaver `Ribbon Snare` | ribbon-snare R1 22–29 | สัมผัส**26** (สะบัดผ้าแบบกระชับ) |
| Spore Puff `Spore Dust` | spore-dust 1–8 | สัมผัส**5** (ขยายตัวปล่อย; ละอองลอยไม่ได้วาดในตัว) |
| dodge / counter / block ของศัตรู / missing clip / โหลดช้า | ภาพเดิม + procedural เดิม | ไม่ gate Start/เทิร์นแรก |

เทสต์ตรวจว่า Rift Weaver ทั้งสาม intent อ่านต่างกัน (เฟรมต่างกัน) และ Lio attack/valor/dread/finale ใช้เฟรมต่างกัน finale/solo ต้องมีเพลงเล่นอยู่ก่อน จึงใช้ prelude จริงของ resolver (valor แล้วเทิร์นอื่น) ก่อนคำสั่งที่ถ่ายทำ

## การ normalize และงบภาพ

- หนึ่ง scale ต่อแถบ (พื้นที่ตัวแรกเทียบ seed คูณ factor ร่วม): ฮีโร่ .42 (display ratio 1/.42), ศัตรู .5 (ratio 2)
- ท่าติดพื้นวางพื้นเท้า y=496 / x=256; Spore Puff ลอย (รากห้อย) ใช้ centroid และคงความสูงจริงของแต่ละเฟรม; ขอบล่างทุกเฟรม ≤500/512 (เทสต์)
- defringe, trim/dedup, atlas WebP lossless (ยืนยัน RGBA ตรงต้นฉบับ), optional atlas ไม่อยู่ใน critical preload

| ตัว | เฟรม | ไม่ซ้ำ | decoded | ดาวน์โหลด |
| --- | --- | --- | --- | --- |
| Sefa | 40 | 28 | 4.04 MiB | 1,066,697 B |
| Lio | 40 | 28 | 4.96 MiB | 1,455,863 B (ใกล้เพดาน 1.5MB) |
| Rift Weaver | 30 | 21 | 3.70 MiB | 1,148,424 B |
| Spore Puff | 22 | 11 | 1.58 MiB | 456,125 B |

ทุกตัว ≤6MiB / ≤1.5MB ผลข้างเคียง: encounter ที่มี Sefa/Lio/Rift Weaver/Spore Puff โหลด optional sheet เพิ่ม; สนาม 10 ตัว (OD-05) ต้องวัดงบรวมหลัง P02

## หลักฐานและข้อจำกัด

- เทสต์: `tests/unit-a6.test.ts` (26 เคส), browser `unit-a6.spec.ts` 33 เคส (windup/release/ผลลัพธ์ตรง, fast/reduced/OS reduce, skip/resize/reload/hidden, ทุก intent ศัตรู, hurt/down/enemy-down, optional texture ล่าช้า, ปล่อย texture ตอนเปลี่ยน encounter)
- คลิปจริง 23 คลิป 390px จาก UI/Phaser/playback/resolver จริง (Chromium จำลองมือถือบน cloud ไม่ใช่ iOS Safari/มือถือจริง) ถอดรหัสซ้ำยืนยันเวลาเฟรม
- ไม่เปลี่ยน rules/save/content/balance/playback timing
