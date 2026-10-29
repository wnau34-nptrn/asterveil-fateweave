# A5 — การ์แรน + แบรนน์ + หมูป่าหลังตะไคร่ + ลิงซ์หนามพราง + ด้วงหนาม

29 ตุลาคม 2026 · branch `claude/unit-a5-garran-brann-command-vfx` · ฐานเกม `f214ef1`

[หน้าเลือกคลิปจริง 390px](index.html) · [แหล่งภาพ/ข้อสังเกตของ Codex](../../../incoming/ART-UNIT-ANIMATION-A5-001/NOTES.md) · [สคริปต์ normalize](../../../incoming/ART-UNIT-ANIMATION-A5-001/build_assets.py) · [ผล normalize/แพ็ก](../../../incoming/ART-UNIT-ANIMATION-A5-001/validation-normalized.json)

**สถานะ: รอเจ้าของตรวจ motion** — ผลเทสต์ไม่ใช่การอนุมัติภาพ ยังไม่ merge/เผยแพร่

## การเลือกภาพ

เจ้าของตอบ “ใช้ตาม codex แนะนำ”: R2 สำหรับ Garran war cry, Brann taunt และ Tusker Stampede (8 เฟรม); ท่าอื่นใช้ candidate preferred (R1) ใน `strips.json` PNG ดิบ 26 ไฟล์ตรวจ sha256 ซ้ำกับ `strips.json` ก่อนใช้ ตรงทั้งหมด (ไฟล์ดิบไม่ถูกแก้) ใช้ 23 แถบ (R1 ของ war cry/taunt/Stampede เป็นตัวเทียบ ไม่ถูกใช้)

## Audit จาก content/runtime จริง

Garran 7 ActionId และ Brann 7 ActionId มาจาก `mercenaries.ts` + unlock + `talentTrees` (เทสต์เทียบ content ครบทุกตัว) ศัตรูทั้งสามปรากฏใน encounter จริง: Tusker มี `Tusk Charge` + `Stampede` (elite จ่าฝูง), Stalker `Thorn Pounce`, Beetle `Thorn Bite` (เทสต์ audit ทุก encounter)

| ActionId / intent | body clip | เฟรม (เตรียม → สัมผัส → คืน) | VFX เดิม / จุดเกิดผล |
| --- | --- | --- | --- |
| Garran `attack` `pierce` `halt` | spear-thrust 1–8 | เตรียม1–4 สัมผัส**5** (แทงออก) คืน5–8 | blade VFX เดิมตาม event จริง |
| Garran `warcry` | warcry **R2** 9–16 | เตรียม9–12 สัมผัส**13** (ตะโกนยกทวน) คืน13–16 | VFX คำท้า C5.9 (ส่วนที่ 2) |
| Garran `brace` `spearwall` `hold` | spearwall 22–29 (stance) | เตรียม22–25 สัมผัส**26** (ท่าทวนต่ำ) คืน26–29 | defense VFX เดิม |
| Brann `attack` | hammer-swing 1–8 | สัมผัส**5** (ฟาดแนวนอน) | blade/earth เดิม |
| Brann `slam` `quake` `tremor` | ground-slam 9–16 | สัมผัส**13** (ค้อนกระทบพื้น) | earth VFX เดิม |
| Brann `taunt` | taunt **R2** 22–29 | สัมผัส**26** (ยืดอก มือเปล่าเรียก) | VFX คำท้า C5.9 |
| Brann `stonearmor` `guardstone` | stone-brace 30–37 | สัมผัส**34** (ค้อนขวางอกต่ำ) | defense VFX เดิม |
| hit / down (ทั้ง 5) | 17–18 / 19–21 ค้าง21 | ตาม damage/down event | ไม่แก้ state |
| Garran block / Brann block | 30–31 / 38–39 | เฉพาะ event ดาเมจ 0/absorb จริง | — |
| Tusker `Tusk Charge` | tusk-charge 1–8 | สัมผัส**5** (พุ่งชน) | basic impact เดิม |
| Tusker `Stampede` | stampede **R2** 9–16 | เตรียม9–12 (ก้มหัว/ตะกุย/หมอบลึก 3 ท่าต่างกัน) สัมผัส**13** (พุ่งชน) ก้าวที่สอง 14 เบรก 15 | basic impact เดิม |
| Stalker `Thorn Pounce` | thorn-pounce 1–8 | สัมผัส**5** (ลอยกลางอากาศ กรงเล็บ) | basic impact เดิม |
| Beetle `Thorn Bite` | thorn-bite 1–8 | หุบเขี้ยว: สัมผัส**5** = เฟรมกัด (เฟรม3 ของแถบ) แล้วหดหัว ไม่ผูกทุกท่ากับเฟรมสุดท้าย | basic impact เดิม |
| dodge / counter / ศัตรู block / missing clip / โหลดช้า | **ภาพเดิม + procedural เดิม** | — | ไม่ gate Start/เทิร์นแรก |

Tusk Charge อ่านต่างจาก Stampede: Charge ใช้ท่าเตรียม 2 ท่า (ก้มหัว/ตะกุย) ซ้ำเฟรม ส่วน Stampede มีหมอบ 3 ท่าที่ต่างกัน + ก้าววิ่งสองก้าว (เทสต์ตรวจว่า clip/เฟรมไม่เหมือนกัน)

## การตรวจภาพและ normalize

- **Scale**: หนึ่ง scale ต่อแถบ (พื้นที่พิกเซลของตัวแรกเทียบ seed แล้วคูณ factor ร่วม) factor: Garran .42 (display ratio 1/.42), Brann **.37** (1/.37; ที่ .42 ดาวน์โหลดเกิน 1.5MB จึงลดความละเอียดลง), ศัตรู .5 (ratio 2)
- **พื้นเท้า/แกน**: ท่าติดพื้นวางพื้นเท้า y=496 / x=256; ท่าลอย (Stalker pounce เฟรมกลางอากาศ) คงความสูงจริงเทียบเฟรมพร้อม ไม่ snap ลงพื้น **ข้อยกเว้น Brann**: หัวค้อนในท่าฟาด/ตีพื้นยื่นต่ำกว่าพื้นเท้า (เท้าตรงเส้นเดียวกันทุกเฟรมในแถบดิบ) ถ้าเกินขอบ cell (>500) จะยกเฉพาะเฟรมนั้นขึ้นพอให้หัวค้อนไม่ถูกตัด (เฟรม 6/13/14 ของ atlas) ซึ่งเท้าลอยสูงจากพื้นเล็กน้อยเฉพาะเฟรมเหล่านั้น — **จุดให้เจ้าของดู**
- **ขอบสี/เศษ**: defringe, ลบเศษเล็ก; ขอบล่างสุดทุกเฟรม ≤500/512 (เทสต์); reaction ของ A5 เป็นแถบ 4 เฟรม (hit [1,2], down [1,2,3] ค้างท่านอน, block [1,2])
- **ข้อควรระวังจาก Codex**: ไม่มี VFX/ฝุ่น/วงพื้นในแถบ; Garran ถือโล่+ทวนตลอด; Brann ค้อนสองหัวตามต้นฉบับ (รายละเอียดลายค้อน/มือจับต่างจาก seed เล็กน้อยตามที่ Codex แจ้ง)

## งบภาพ (decoded RGBA) — สนาม 10 ตัวในอนาคต (OD-05)

| ตัว | logical/unique | decoded atlas RGBA | atlas+JSON (ดาวน์โหลด) | display ratio |
| --- | --- | --- | --- | --- |
| Garran | 32 | 4,036,608 B (3.85 MiB) | 1,017,823 B | 1/.42 |
| Brann | 40 | 4,612,096 B (4.40 MiB) | 1,494,058 B (ชนเพดาน 1.5MB) | 1/.37 |
| Tusker | 22 | 4,275,200 B (4.08 MiB) | 1,204,923 B | 2 |
| Stalker | 22 | 2,555,904 B (2.44 MiB) | 695,922 B | 2 |
| Beetle | 22 | 1,863,680 B (1.78 MiB) | 475,744 B | 2 |

เพดานต่อตัว: decoded ≤6 MiB, ดาวน์โหลด ≤1.5MB — ผ่านทุกตัว ใช้ optional background loader เดิม ไม่เพิ่ม critical preload ตัวเลขนี้ไม่ใช่ RAM/GPU รวมเกมหรือผลมือถือจริง; สนาม 10 ตัวที่เป็นภาพ animated คนละตัวต้องวัดรวมหลัง P02 (รวมทุก A1–A5 ที่โหลดพร้อมกัน)

## Runtime ที่เปลี่ยน

- `unit-frames.ts`: registry `garran`/`brann`/`foe_tusker`/`foe_stalker`/`foe_thorn_beetle`; clip ใหม่ `stance`/`taunt`/`brace`; reaction block ของ Garran/Brann
- `unit-atlases.json` + `public/assets/units/{garran,brann,tusker,stalker,beetle}_a5.*` (hash ในชื่อไฟล์)
- ไม่แก้ rules/save/content/balance/playback timing

## ผลตรวจ

- typecheck, lint, `npm test` ผ่าน; `tests/unit-a5.test.ts` 26 เทสต์ (ทุก action/intent เทียบ content, contact frame, reaction, fallback, งบ/เลย์เอาต์ atlas, Charge ≠ Stampede)
- browser (Chromium + SwiftShader, 390×844, ไม่ใช่มือถือ/iOS Safari จริง): `unit-a5.spec.ts` 34 เทสต์ผ่าน; full suite ปล่อยให้ CI
- คลิปจริง 20 คลิป 390×844 ([index](index.html)): Garran attack ×{normal,fast,reduced,osreduce}, pierce, warcry, spearwall, Stampede; Brann attack ×4, slam, taunt, stonearmor; hurt/down; enemy-down ×3 ถ่ายด้วย CDP timestamp จริง ไม่เร่งเวลา ไม่แทรกเฟรม (Chromium จำลอง) บางคลิปมีช่องว่างระหว่างเฟรมที่ capture ได้สูงสุด 0.27 วินาที ดู `clips.json`
- ภาพถ่ายต่อสู้ใช้ encounter QA ที่ resolver จริง; ผลเทสต์ไม่ใช่การอนุมัติภาพ

## ให้เจ้าของดู

ท่าฟาด/ตีพื้นของ Brann (หัวค้อนต่ำกว่าพื้น/เท้ายกเล็กน้อย), ท่าพุ่ง Stampede ของ Tusker เทียบ Tusk Charge, ท่าลอยของ Stalker, ท่าตะโกนของ Garran และท่าเรียกของ Brann
