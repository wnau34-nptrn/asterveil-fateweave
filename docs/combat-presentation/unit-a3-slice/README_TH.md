# A3 — เซเรน + เห็ดหมอผีกลวง

28 ตุลาคม 2026 · branch `claude/unit-a3-seren-mycon` · ฐานเกม `8616ad3155a179e05210fe6aa552e6d234c9bd24`

[หน้าเลือกคลิปจริง 390px](index.html) · [แหล่งภาพ/ข้อสังเกตของ Codex](../../../incoming/ART-UNIT-ANIMATION-A3-001/NOTES.md) · [สคริปต์ normalize](../../../incoming/ART-UNIT-ANIMATION-A3-001/build_assets.py) · [ผล normalize/แพ็ก](../../../incoming/ART-UNIT-ANIMATION-A3-001/validation-normalized.json)

**สถานะ: เจ้าของอนุมัติ motion “เอาเข้าเกมได้” (2026-10-28) หลังดูคลิปจริง 16 คลิป** — เป็นการอนุมัติโดยตรง ไม่ได้อนุมานจากผลเทสต์; เผยแพร่แล้ว: PR #99 merge `d610b63`, Pages 40741221429 สำเร็จ (build+browser 4 shard+deploy)

## การเลือกภาพ

เจ้าของตอบ “ไปขั้นต่อไป ทั้งสองอย่าง” (2026-10-28) = ตามที่ Codex แนะนำ: ท่าฟาดไม้เท้า Seren ใช้ `seren-attack-r2`, ท่าร่าย Mycon ใช้ `hollow-mycon-cast-r2` ส่วนอื่นใช้ R1 ที่ส่งมา PNG ดิบ 12 ไฟล์ตรง sha256 ใน `validation.json` ทุกไฟล์ (ตรวจก่อนใช้) ไฟล์ดิบ/seed/prompt เก็บเดิมไม่แก้

## Audit จาก content/runtime จริง

เซเรนมี 7 ActionId จาก `team.ts` + unlock ดาว + `talentTrees.healer` (ทดสอบเทียบกับ content ทุกตัว) Mycon ปรากฏใน encounter เดียว `thicket-ambush` (b1) และมี intent เดียว `Spore Hex` (energy, ไม่มีท่ากายภาพ)

| ActionId/intent | body clip | เฟรม (เตรียม → สัมผัส/ปล่อย → คืน) | VFX เดิม / จุดเกิดผล |
| --- | --- | --- | --- |
| Seren `attack` | ฟาดไม้เท้า R2 1–8 | เตรียม1–4 สัมผัส**5** คืน5–8 | basic impact เดิมบน recipient จริง |
| `heal` / `revive` / `bless` | heal R1 9–16 | เตรียม9–12 สัมผัส**13** คืน13–16 | VFX healing C5.3 เดิมตาม event heal/revive/buff จริง ไม่สร้างใหม่ |
| `prayer` / `halo` | prayer R1 22–29 | เตรียม22–25 สัมผัส**26** (ยืดสูงสุด = เฟรม5 ของแถบ) คืน26–29 | VFX healing เดิม: prayer ตามผลทั้งปาร์ตี้, halo ตาม buff ตนเอง |
| `sanctuary` | sanctuary R1 30–37 | เตรียม30–33 สัมผัส**34** (ปักไม้เท้า) คืน34–37 | C5.2 เดิมตาม event sanctuary/ward จริง |
| hit | 17–18 | ท่าสะดุ้ง→ย่อรับแรง | damage event/HP จริง |
| block | 38–39 | ไม้เท้าขวางลำตัว→ตั้งรับ | เฉพาะ event ดาเมจ 0/absorb จริง |
| down | 19–21 ค้าง21 เมื่อ HP0 | ทรุด→คุกเข่าลง→ล้มสนิท | actual down; skip/resize/reload คงภาพล้ม |
| revive (เป้าหมาย) | reset seed เมื่อ HP>0 | ไม่มี stand-up strip ใหม่ | Revive เดิมโดยผู้ร่ายจริง |
| Mycon `Spore Hex` | cast R2 9–16 | เตรียม9–12 (หมวกพองเห็นชัด) สัมผัส**13** (หดหมวก/ปล่อยมือ) คืน13–16 | **energy VFX เดิม** บน recipient/barrier/dodge จริง ไม่สร้างโปรเจกไทล์/ฮาซสปอร์ใหม่ |
| Mycon hit / down | 17–18 / 19–21 | ตาม damage/down event | ไม่แก้ state |
| dodge ทั้งคู่ / counter / Mycon block | **procedural เดิม** | — | ไม่มีแถบเฉพาะ; Mycon ไม่มีท่าตั้งรับ |
| missing clip / โหลดช้า | **ภาพเดิม + procedural เดิม** | — | ไม่ gate Start/เทิร์นแรก ไม่เปลี่ยน texture กลาง stage ที่ commit แล้ว |

ท่าพื้นฐานของ Priest ยังเป็น `cast` (ไม่พุ่งไปหาเป้า) ตามเดิม ไม่เปลี่ยนจังหวะ/การเคลื่อนที่ Passive (afterglow ฯลฯ) ไม่มีท่าร่างกายใหม่ ท่าที่ไม่มีเฟรมจริงใช้ซ้ำ [prayer/heal/sanctuary ใช้แถบของตนเอง; revive/bless ใช้ heal] ตามที่ Codex ระบุ (`NOTES.md`)

## การตรวจภาพและ normalize

- **ขอบแคนวาส**: แถบดิบไม่มีพิกเซลทึบติดขอบบน/ล่าง/ซ้าย; ติดขอบขวาเล็กน้อย 4–13px ใน 4 แถบ (ตัดทิ้งเมื่อแยกตัว) เฟรมที่ผ่าน normalize ผ่านเกณฑ์ `x+w≤512, y+h≤512` ทุกเฟรม และขอบล่างสุดของทุกเฟรมไม่เกิน 500/512
- **รอยขอบสี**: พิกเซลโปร่งใสบางส่วน (alpha 4–249) ถูกแทนสีด้วยสีของพิกเซลทึบที่ใกล้ที่สุด (ตัดสีแดง/เหลือง/เขียวที่ปนจากการ generate) alpha เดิมคงไว้; เศษของตัวละครข้างเคียงที่ไม่ติดตัว (<400px) ถูกลบ ตรวจ atlas บนพื้นสว่างด้วยตา ไม่พบขอบสีเด่น
- **Scale**: ใช้ scale เดียวต่อ 1 แถบ (ไม่ย่อทีละท่า) หาจากพื้นที่พิกเซลที่มองเห็นของตัวแรกเทียบ seed (ratio ต่อแถบ 0.31–0.47 ของ Seren, 0.45–0.60 ของ Mycon เพราะ ImageGen วาดแต่ละแถบคนละขนาด) แล้วคูณ factor ร่วม: Seren .36 (display ratio 1/.36 เท่า Aegis), Mycon .5 (ratio 2 เท่า Vargoth) Ready/idle = seed เดิมตัดเศษ ย่อด้วย factor เดียวกัน
- **Sole/แกน**: ทุกเฟรมวางพื้นเท้าที่ y=496 (เท่าเฟรมเดิม/origin 496/512) และกึ่งกลางเท้า (กลุ่มพิกเซล 12% ล่างของตัว) ที่ x=256 ท่าล้มคงรูปล้มโดยไม่ปรับความสูง
- **ปัญหาจากต้นฉบับ (ไม่แก้ภาพดิบ)**: ในแถบ `seren-attack-r2` ตัวที่ 3–6 ติดกัน ปลายไม้เท้าท่า 4 ทับเสื้อ/รองเท้าท่า 5 และปลายท่า 5 แตะผ้าคลุมท่า 6 จึงแบ่งด้วยกฎกำหนดเอง (`split_attack_r2`, อ่านจากภาพขยาย) **ท่า 5 (follow-through, เฟรม6) ขาซ้ายถูกไม้เท้าท่า 4 บังในต้นฉบับ จึงไม่มีรองเท้าซ้าย** และมีรอยตัดตรงที่ขอบแก้ว laurel เฟรม5 — ถ้าเจ้าของไม่พอใจ แนะนำให้ Codex gen แถบใหม่ที่ช่องไฟกว้างกว่า ใบหน้า Seren บางท่ามีรูปทรงต่างจาก seed เล็กน้อยตามที่ Codex ระบุ
- Mycon: เห็ด/หยดสปอร์สีเขียวเป็นส่วนของตัว (ไม่ใช่ VFX); hit/down/cast เล็กกว่า raw ตามสเกลแถบ; Mycon หันซ้ายตาม seed (ไม่ flip เพิ่ม)

## งบภาพ (decoded RGBA) — สนาม 10 ตัวในอนาคต (OD-05)

| ตัว | logical/unique | decoded atlas RGBA | atlas+JSON | display ratio |
| --- | --- | --- | --- | --- |
| Seren | 40/28 | 4,902,912 bytes (4.68 MiB) | 1,463,594 bytes | 1/.36 |
| Hollow Mycon | 22/10 | 2,435,072 bytes (2.32 MiB) | 826,472 bytes | 2 |

ตัวเลขนี้ไม่ใช่ RAM/GPU รวมเกมหรือผลมือถือจริง เพดานต่อตัว (เหมือน A2): decoded ≤6 MiB, ดาวน์โหลด ≤1.5 MB — Seren เข้าเพดานที่ 1.46 MB (ผ่านด้วยการเลือก factor .36) ใช้ optional background loader เดิมโหลดเฉพาะ encounter ที่ใช้ (art เดียวกันหลายตัวใช้ texture ร่วม) evict เมื่อไม่ใช้ ไม่โหลด roster อนาคต ถ้า 10 ตัวบนสนามเป็นภาพ animated คนละตัวทั้งหมด (ตัวละ ~2.3–4.7 MiB) จะรวมราว 25–45 MiB decoded จึงต้อง: คง optional/evict ต่อ encounter, ใช้ factor ร่วม ≤.36 สำหรับตัวที่มีท่าหลายชุด และรวม texture ของ art เดียวกัน — ตัวเลขจริงรวมสนาม 10 ตัวต้องวัดหลัง P02

## Runtime ที่เปลี่ยน

- `unit-frames.ts`: registry `healer` (sheet `seren`, ratio 1/.36) + `foe_mycon` (sheet `mycon`, ratio 2); clip ใหม่ `prayer`/`sanctuary`; reaction block ของ Seren; ไม่เปลี่ยน sequence/จังหวะเดิมของ pilot/A1/A2
- `unit-atlases.json` + `public/assets/units/{seren,mycon}_a3.*` (hash ในชื่อไฟล์); ไม่เพิ่ม critical preload
- **ผลข้างเคียงที่ตั้งใจ**: encounter ที่มี `healer` (เช่น first-clash) จะโหลด optional sheet `seren` เพิ่ม 1 ชุด (A1/A2 browser spec และ `unit-loading` ปรับตัวเลข 5→6 / รายการ texture)
- ไม่แก้ rules/save/content/balance/playback timing, VFX atlas/module เดิม

## ผลตรวจ

- typecheck, lint, `npm test` 82 ไฟล์/1104 เทสต์ ผ่าน (รวม `tests/unit-a3.test.ts` 13 เทสต์: ครอบคลุม action/intent ทั้งหมด, contact frame, reaction, fallback, งบ/เลย์เอาต์ atlas)
- browser (Chromium + SwiftShader, 390×844, ไม่ใช่มือถือ/iOS Safari จริง): `unit-a3.spec.ts` 21 เทสต์ (ทุกท่า 7 ท่า, fast/reduced/OS-reduce, skip/resize/reload/hidden, Spore Hex, hurt/down/enemy-down/revive, โหลดช้ากลางท่า, ปล่อย texture เมื่อเปลี่ยน encounter) + A1/A2/pilot/loading ที่ปรับแล้วผ่าน; full suite ปล่อยให้ CI
- คลิปจริง 16 คลิป 390×844 (หน้า [index](index.html)): attack/prayer ×{normal,fast,reduced,OS-reduce}, heal, sanctuary, halo, bless, hurt, down, enemy-down, revive ทุกคลิปรวมเทิร์น Spore Hex ของ Mycon (เห็ดหมอผีตอบโต้หลังเซเรนเสมอ) ถ่ายด้วย CDP timestamp จริง ไม่เร่งเวลา ไม่แทรกเฟรม; ยังไม่มีคลิป Seren block เพราะ resolver ไม่ให้เหตุการณ์ดาเมจ 0 ในฉากที่จัดได้ง่าย (เฟรมมีแต่ใช้เมื่อ event เกิดจริง)
- หลักฐาน: [proof.json](proof.json), capture-metadata

## การอนุมัติของเจ้าของ

เจ้าของตอบ “เอาเข้าเกมได้” หลังดูคลิป (รวมจุดที่แจ้งไว้: ขาซ้ายท่า follow-through และหมวก Mycon) จึงคงภาพตามนี้ ไม่ขอ Codex gen ใหม่
