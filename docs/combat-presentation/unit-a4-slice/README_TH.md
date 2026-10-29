# A4 — มิร่า + โทมะ + สไลม์น้ำค้าง + สไลม์ถ่านไฟ + ค้างคาวซาก

28 ตุลาคม 2026 · branch `claude/unit-a4-mira-toma-slimes-bat` · ฐานเกม `7d41237`

[หน้าเลือกคลิปจริง 390px](index.html) · [แหล่งภาพ/ข้อสังเกตของ Codex](../../../incoming/ART-UNIT-ANIMATION-A4-001/NOTES.md) · [สคริปต์ normalize](../../../incoming/ART-UNIT-ANIMATION-A4-001/build_assets.py) · [ผล normalize/แพ็ก](../../../incoming/ART-UNIT-ANIMATION-A4-001/validation-normalized.json)

**สถานะ: เจ้าของอนุมัติ motion “เอาเข้าเกมได้” (2026-10-29) หลังดูคลิปจริง 20 คลิป** — อนุมัติโดยตรง ไม่ได้อนุมานจากผลเทสต์; PR #101 merge `a92625a`, Pages run 40808184534

## การเลือกภาพ

เจ้าของตอบ “ใช้ตาม codex แนะนำ” (2026-10-28): R2 สำหรับ Mira volley / disengage, Toma underhand และ Ruin Bat hover ส่วนอื่นใช้ candidate ป้ายทอง (preferred) ใน `strips.json` PNG ดิบ 25 ไฟล์ตรวจ sha256 ซ้ำกับ `strips.json` ก่อนใช้ ตรงทั้งหมด (ไฟล์ดิบ/seed/prompt ไม่ถูกแก้) ใช้ 21 แถบจาก 25 (R1 ของ volley/disengage/underhand/hover ไม่ถูกใช้)

## Audit จาก content/runtime จริง

Mira 7 ActionId และ Toma 7 ActionId มาจาก `mercenaries.ts` + unlock + `talentTrees` (เทสต์เทียบ content ครบทุกตัว) ศัตรูทั้งสามปรากฏใน encounter จริง (`slime-pair`, `bat-swarm`, `slime-nest`, `tusker-bats`) และแต่ละตัวมี intent เดียว (เทสต์ audit ทุก encounter)

| ActionId / intent | body clip | เฟรม (เตรียม → สัมผัส/ปล่อย → คืน) | VFX เดิม / จุดเกิดผล |
| --- | --- | --- | --- |
| Mira `attack` `hinder` `weakshot` `pin` `track` | single-arrow R1 1–8 | เตรียม1–4 สัมผัส**5** (ปล่อยสาย) คืน5–8 | projectile เดิมตาม event จริง |
| Mira `volley` | volley **R2** 9–16 | เตรียม9–12 สัมผัส**13** คืน13–16 | projectile เดิม (ห่าธนู) |
| Mira `disengage` | disengage **R2** 22–29 | เตรียม22–25 สัมผัส**26** คืน26–29 | projectile/delay เดิม ถอยสั้นใช้ shoot offset เดิม ไม่เพิ่ม teleport |
| Toma `attack` `acid` `bomb` `smoke` | overhand R1 1–8 | เตรียม1–4 สัมผัส**5** คืน5–8 | alchemy VFX เดิมตาม event จริง |
| Toma `haste` `fury` `catalyst` | underhand **R2** 9–16 | เตรียม9–12 สัมผัส**13** (ปล่อยมือเปล่า) คืน13–16 | alchemy VFX เดิม |
| hit / down (ทั้ง 5) | 17–18 / 19–21 ค้าง21 | ตาม damage/down event | ไม่แก้ state |
| Mira block / Toma block | 30–31 / 22–23 | เฉพาะ event ดาเมจ 0/absorb จริง | — |
| Dew `Jelly Bounce` | jelly-bounce 1–8 | เตรียม1–4 สัมผัส**5** (ตัวลอยพุ่งชน) คืน5–8 | basic impact เดิม; ท่ากระโดดคงความลอยจริง ไม่ bottom-align |
| Ember `Ember Spark` | ember-spark 9–16 (energy → skill) | เตรียม9–12 สัมผัส**13** (อ้าปากถ่ม/ถอย) คืน13–16 | spark/energy VFX เดิม ไม่สร้างโปรเจกไทล์ใหม่ |
| Bat `Nip` | swoop-bite 1–8 | เตรียม1–4 สัมผัส**5** (กัดต่ำสุด) คืน5–8 | basic impact เดิม |
| Bat hover (idle) | hover **R2** 22–25 | วน 22→25 ทีละ 150ms | ภาพนิ่งเฉพาะ presentation; อยู่ที่ seed (เฟรม0) เมื่อลดการเคลื่อนไหว |
| dodge / counter / Dew,Ember,Bat block / missing clip / โหลดช้า | **ภาพเดิม + procedural เดิม** | — | ไม่ gate Start/เทิร์นแรก ไม่เปลี่ยน texture กลาง stage ที่ commit แล้ว |

Mira/Toma ท่าที่ไม่มีเฟรมเฉพาะ (passive, tailwind/potent) ไม่มีท่าร่างกายใหม่

## การตรวจภาพและ normalize

- **Scale**: หนึ่ง scale ต่อ 1 แถบ (หาจากพื้นที่พิกเซลที่มองเห็นของตัวแรกเทียบ seed แล้วคูณ factor ร่วม) เพราะ ImageGen วาดแต่ละแถบคนละขนาด (scale ต่อแถบ 0.44–1.07 ของแถบดิบ) factor: Mira/Toma .42 (display ratio 1/.42), ศัตรู .5 (ratio 2) **ข้อยกเว้นเดียว**: hover R2 ของค้างคาวใช้ค่าเฉลี่ยพื้นที่ทั้ง 4 เฟรม เพราะเฟรมแรกปีกพับขึ้นมีพื้นที่น้อยกว่า seed ทำให้ลำตัวใหญ่เกินจริง
- **พื้นเท้า/แกน**: ท่าติดพื้นวางพื้นเท้า y=496 และกึ่งกลางเท้า x=256 ท่าที่ลอยพ้นพื้น (Dew เฟรมกระโดด) ใช้ความสูงจริงเทียบเฟรมพร้อม (offset −14.6px ที่เฟรมสัมผัสของ Dew) ไม่ถูก snap ลงพื้น ค้างคาวลอยตลอด จึงวางทุกท่าตามความสูงสัมพัทธ์เทียบเฟรมแรกของแถบ (ใช้จุดกึ่งกลางพิกเซลแนวนอน เพราะปีกไม่สมมาตร) แถบ down ของค้างคาวยกขึ้นทั้งแถบเท่ากันเพื่อไม่ให้ตกต่ำกว่าขอบล่าง
- **ขอบสี/เศษ**: defringe จากพิกเซลทึบใกล้สุด, ลบเศษเล็กที่ไม่ติดตัว (<400px); ทุกแถบแยกตัวได้ตรงจำนวนเฟรมโดยไม่ต้องตัดตัวที่ติดกัน ขอบล่างสุดของทุกเฟรม ≤500/512 (เทสต์)
- **ข้อควรระวังจาก Codex**: Toma backswing ข้ามตัว (underhand R2 เฟรม 2–3) ตรวจแล้วมือโยนต่อเนื่องในพรีวิว; Mira ถอยสั้น ใช้ shoot offset เดิม; Ember spit อ่านผ่านหน้า/ความสว่างและ spark VFX เดิม; ค้างคาวหันซ้ายตาม seed ไม่ flip เพิ่ม ใบหน้า/ลายปักของ Mira–Toma คงตามที่ Codex ระบุว่ายังมีความต่างเล็กน้อยจาก seed (ไม่แก้ภาพดิบ)

## งบภาพ (decoded RGBA) — สนาม 10 ตัวในอนาคต (OD-05)

| ตัว | logical/unique | decoded atlas RGBA | atlas+JSON | display ratio |
| --- | --- | --- | --- | --- |
| Mira | 32/23 | 4,161,536 bytes (3.97 MiB) | 1,103,668 bytes | 1/.42 |
| Toma | 24/18 | 2,288,640 bytes (2.18 MiB) | 646,978 bytes | 1/.42 |
| Dew Slime | 22/11 | 1,416,192 bytes (1.35 MiB) | 357,467 bytes | 2 |
| Ember Slime | 22/11 | 1,164,288 bytes (1.11 MiB) | 320,727 bytes | 2 |
| Ruin Bat | 26/15 | 1,972,224 bytes (1.88 MiB) | 430,211 bytes | 2 |

เพดานต่อตัว (เหมือน A2/A3): decoded ≤6 MiB, ดาวน์โหลด ≤1.5 MB — ทุกตัวผ่านโดยเหลือที่ว่าง ใช้ optional background loader เดิม โหลดเฉพาะ encounter ที่ใช้ (art เดียวกันใช้ texture ร่วม เช่น bat-swarm มีค้างคาว 2 ตัวโหลด 1 sheet) evict เมื่อไม่ใช้ ตัวเลขนี้ไม่ใช่ RAM/GPU รวมเกมหรือผลมือถือจริง; ถ้าสนาม 10 ตัวเป็นภาพ animated คนละตัวทั้งหมดต้องวัดรวมหลัง P02

## Runtime ที่เปลี่ยน

- `unit-frames.ts`: registry `mira`/`toma`/`foe_dew_slime`/`foe_ember_slime`/`foe_ruin_bat`; clip ใหม่ `disengage`; reaction block ของ Mira/Toma; `idleLoop` ของค้างคาว
- `unit-animation.ts` + `unit-frame-view.ts`: hover loop เป็น presentation ล้วน เล่นเฉพาะเมื่อยังไม่ตายและไม่ได้อยู่ใน motion/reaction; ไม่เล่นเมื่อ OS reduce-motion หรือเอฟเฟกต์ “ลด”
- `battle-ui.ts`: เรียก `configureEffects` ตอน `open()` เพื่อให้ loop ตามค่าเอฟเฟกต์/OS ตั้งแต่เฟรมแรก (ก่อนหน้านี้ตั้งเฉพาะตอนเริ่มเทิร์น) ไม่กระทบการเล่นเทิร์น
- `unit-atlases.json` + `public/assets/units/{mira,toma,dew,ember,bat}_a4.*` (hash ในชื่อไฟล์); ไม่เพิ่ม critical preload
- ไม่แก้ rules/save/content/balance/playback timing, VFX atlas/module เดิม

## ผลตรวจ

- typecheck, lint, `npm test`, build (ดู handoff); `tests/unit-a4.test.ts` 25 เทสต์ (ทุก action/intent เทียบ content, contact frame, reaction, fallback, งบ/เลย์เอาต์ atlas, hover loop + lifecycle)
- browser (Chromium + SwiftShader, 390×844, ไม่ใช่มือถือ/iOS Safari จริง): `unit-a4.spec.ts` 34 เทสต์ผ่าน (ทั้ง 14 ท่า, fast/reduced/OS-reduce, skip/resize/reload/hidden, intent จริงของศัตรูทั้งสาม, hurt/down/enemy-down, hover loop เปิด/ปิด, โหลดช้ากลางท่า, ปล่อย texture); full suite ปล่อยให้ CI
- คลิปจริง 20 คลิป 390×844 (หน้า [index](index.html)): Mira attack ×{normal,fast,reduced,OS-reduce} (ศัตรู Dew), volley (Ember), disengage (Dew), attack ต่อ Bat ×3 (รวมคลิป hover idle 1.8 วิ และ OS-reduce), Toma attack ×4 (Ember), haste (Bat), bomb (Dew), hurt/down ของฮีโร่, enemy-down ×3 ทุกคลิปถ่ายด้วย CDP timestamp จริง ไม่เร่งเวลา ไม่แทรกเฟรม; ทุกคลิปรวมเทิร์นศัตรูจริงหลังฮีโร่
- หลักฐาน: [proof.json](proof.json), capture-metadata

## การอนุมัติของเจ้าของ

เจ้าของตอบ “เอาเข้าเกมได้” (2026-10-29) หลังดูหน้ารวมคลิป จึงคงภาพตามนี้ จุดที่แจ้งให้ดูไว้: ท่ากระโดดของ Dew (ลอยแล้วลง), มือโยนของ Toma ท่า underhand, การถอยของ Mira, ปากถ่มของ Ember, loop ปีกค้างคาว (รอยต่อ 25→22) และความเร็ว 150ms/เฟรม
