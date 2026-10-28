# แผนทำแอนิเมชันตัวละครและ VFX สกิลให้ครบ — 2026-10-28

ทิศทางเจ้าของ 2026-10-28: “แผนการคือจะทำ animation ของตัวละคร กับ vfx ของสกิลต่างๆ ให้เสร็จสิ้นก่อน โดยให้ codex ทำภาพ แล้ว claude ทำในเกม” งานนี้จึงมาก่อน P01–P11 ใน [แผนพัฒนารวม](../DEVELOPMENT_PLAN_TH.md) จนจบระลอก W8 ด้านล่าง เอกสารนี้เป็นแผน; การเริ่มแต่ละระลอกตามที่เจ้าของสั่ง ส่วน approval ภาพ/การเคลื่อนไหวยังต้องผ่านเจ้าของทุกชุดเหมือนเดิม

## 1. สถานะจริงตอนเขียน (game branch `81d0c83`)

**แอนิเมชันตัวละคร** ([แผนเดิม](UNIT_ANIMATION_ROLLOUT_TH.md)): 36 visual identities ในเกม (ฝ่ายเรา 14 + ศัตรู 22)

| เสร็จและเผยแพร่ | ตัว |
| --- | --- |
| pilot | ไลรา `tracer` + Vargoth Hunter `foe_hunter` (เฉพาะท่าใน pilot; A0 audit แล้ว) |
| A1 (PR87) | ไอรา `weaver` + ภูตแดนดิไลออน `foe_sprite` |
| A2 (PR88) | เอกิส `guardian` + องครักษ์อสูร `foe_vargoth_guard` |

เหลือ 30 identities (ฝ่ายเรา 10 + ศัตรู 20) = A3–A10 ตัวละครอนาคต 16 คนใน roster 30 ยังไม่มีกฎ/ภาพต้นแบบ จึง **ไม่อยู่ในแผนนี้** ทำพร้อม P03 ตอนเพิ่มตัว

**VFX สกิล** (painted atlas/module ใน `src/game/visuals/*-fx.ts`): Bolt, Execute/Ward, ตระกูล 1 ดาบ, 2 ป้องกัน, 3 ฟื้นฟู, 4 กระสุน, 5 ปฐพี, 6 เคมี เผยแพร่แล้ว ศัตรู physical ใช้ชุดดาบ ศัตรู energy ใช้ชุด Bolt ร่วมกัน

สกิลฝ่ายเราที่ยัง **ไม่มี** VFX วาด (ตรวจจาก `ActionId` 73 รายการเทียบ module ทั้งหมด) 32 ท่า:

| ตระกูลที่เสนอ | ท่า (ActionId) | เจ้าของสกิล |
| --- | --- | --- |
| C5.7 ผนึกอาคม | `mark` ติดตรา, `sigil` ตรึงเวท, `storm` พายุเวท, `dispel` สลายเวท | ไลรา, ไอรา |
| C5.8 บทเพลง | `valor` เพลงกล้า, `finale` บทสุดท้าย, `dread` เพลงสะท้าน, `note` โน้ตคม, `solo` เพลงเดี่ยว | ลิโอ |
| C5.9 เงาและคำท้า | `evade` ก้าวเงา, `decoy` เงาคุ้มกัน, `taunt` ยั่วยุ, `challenge` ท้าดวล, `warcry` เสียงศึก | เซฟา, แบรนน์ (`taunt`), เอกิส (`challenge`), การ์แรน (`warcry`) |
| C5.10 แสงนักบุญ | `saintstrike`, `communion`, `saintarc`, `vowstrike`, `sharewound`, `lastlight` | เมตตา, ธีรัน |
| C5.11 ระบำ | `cadence`, `duet`, `rounddance`, `deepbeat`, `echofoot`, `closingstep` | ลลิน, วิลา |

ท่าศัตรูที่ยังใช้ชุดร่วมแต่ควรมีภาพเฉพาะ (C5.12): Spore Hex, Seed Spark, Thorn Bloom/Storm/Tempest/Rage, Gather Thorns, Shard Burst, Crystal Fist, Rift Needle, Rift Wave/Gathering/Cataclysm/Awakening, Veil Quake, War Cry, Stampede

## 2. แบ่งงาน Codex / Claude

| ขั้น | Codex (ภาพ) | Claude (ในเกม) |
| --- | --- | --- |
| 0 บัญชีท่า | — | สร้างตาราง ActionId/intent → ท่าร่างกาย + VFX + เป้า + จุดเกิดผลจาก content จริง ใส่ในคำสั่งงานภาพ |
| 1 ภาพ | ทำ strip ทั้งท่าจาก seed ที่ผ่านแล้ว (แอนิเมชัน) หรือ painted layers/storyboard 3 จังหวะ (VFX) ส่ง R1/R2 ให้เลือก ใน `incoming/<ID>/` เท่านั้น ห้ามแตะ `src/ public/ tests/ .github/` | ตรวจ package (ขนาด, alpha, ลำดับอาวุธ, หน้าตาไม่เพี้ยน) แล้วส่งให้เจ้าของเลือกแบบ |
| 2 เจ้าของเลือกภาพ | แก้ตาม feedback | — |
| 3 นำเข้า | — | normalize/trim/pack lossless, registry/mapping, routing ตาม event จริง, fallback, reduced motion, เทสต์ unit/browser |
| 4 เจ้าของตรวจ motion | — | อัดคลิปจริง 390px ส่งให้ตรวจ แก้จนผ่าน |
| 5 ปล่อย | — | PR, CI ครบ, merge, Pages, release proof + handoff |

กติกาที่คงไว้: ไม่แก้ rules/save/balance/timing ของคำสั่ง, ผลบนจอต้องตรง event จริง, งบภาพตาม [§7 แผนเดิม](UNIT_ANIMATION_ROLLOUT_TH.md), ผลเทสต์ไม่ใช่ visual approval

**ทำงานแบบสายพาน:** ระหว่างที่ Claude นำชุดที่ N เข้าเกม Codex ทำภาพชุด N+1 ไว้ เจ้าของจึงมีของให้ตรวจสองจุดต่อชุด (เลือกภาพ, ตรวจ motion) โดยไม่มีใครรอกัน

## 3. ลำดับระลอก

จับคู่แอนิเมชันกับ VFX ของคนเดียวกันในระลอกเดียว ให้จังหวะร่างกายกับเอฟเฟกต์ออกแบบไปพร้อมกัน ชุดที่ใหญ่เกินแยกเป็น PR ย่อยได้ (คน / สัตว์ / VFX)

| ระลอก | แอนิเมชัน | VFX | เหตุผล |
| --- | --- | --- | --- |
| W1 | A3 เซเรน + เห็ดหมอผีกลวง | C5.7 ผนึกอาคม | ไอรา/ไลรามีร่างแล้ว VFX ทำได้ทันที; เซเรนใช้ VFX ฟื้นฟูที่ผ่านแล้ว |
| W2 | A4 มิร่า + โทมะ; สไลม์น้ำค้าง/ถ่านไฟ + ค้างคาวซาก | — (ใช้ชุดกระสุน/เคมีเดิม) | งานร่างกายล้วน จังหวะยึด VFX ที่ผ่านแล้ว |
| W3 | A5 การ์แรน + แบรนน์; หมูป่า + ลิงซ์ + ด้วงหนาม | C5.9 ส่วนคำท้า (`taunt`, `challenge`, `warcry`) | แบรนน์/การ์แรนได้ร่างพร้อมเอฟเฟกต์คำท้า; เอกิสมีร่างแล้ว |
| W4 | A6 เซฟา + ลิโอ; ผู้ทอรอยแยก + ภูตสปอร์ | C5.8 บทเพลง + C5.9 ส่วนเงา (`evade`, `decoy`) | ท่าดีดพิณ/ถอยหลบต้องเข้ากับเอฟเฟกต์ |
| W5 | A7 เมตตา + ธีรัน; ลลิน + วิลา | C5.10 แสงนักบุญ + C5.11 ระบำ | สกิล C12 ยังไม่มีทั้งร่างและเอฟเฟกต์ |
| W6 | A8 โกเลม + อสูรส่งพลัง; วิญญาณรอยแยก + แมงมุมผลึก | C5.12a ท่าศัตรูสายผลึก/รอยแยก | ท่าพลังงานของศัตรูเลิกใช้ Bolt ร่วม |
| W7 | A9 ราชินีหนาม + ด้วงเกราะผลึก; ผู้คุมรอยแยก + หัวหน้ากองหน้า | C5.12b ท่าบอส/หนาม/เรียกกำลังเสริม | บอสต้องการร่างกายและเอฟเฟกต์ phase ไปด้วยกัน |
| W8 | A10 Raider + Brute เดิม + A11 ตรวจสนามรวม | ตรวจครบทุก ActionId/intent | ปิดงาน: ไม่มี fallback ค้างโดยไม่ระบุ |

**จุดตรวจมือถือจริง:** หลัง W2 (มีสนามที่ animated หลายตัว) ให้เจ้าของเปิดเกมบนมือถือจริงหนึ่งเครื่อง Claude ทำหน้า debug/วิธีวัด Start, กระตุก และหน่วยความจำ ตาม §7 แผนเดิม ก่อนขยายถึงบอส

## 4. เกณฑ์จบทั้งแผน

- 36 identities มีแอนิเมชันครบทุกท่าที่ใช้จริง หรือ fallback ที่ระบุเหตุผลในตาราง mapping
- 73 ActionId และ intent ศัตรูทุกชื่อมี VFX วาดหรือใช้ตระกูลร่วมโดยตั้งใจ (บันทึกใน `COVERAGE_TH.md`)
- สนามเต็ม 8 ตัว ทุก encounter อยู่ในงบภาพ และไม่สะสม texture ข้าม encounter
- ทุกชุดมีคลิป 390px, release proof และ approval ของเจ้าของ

## 5. คำสั่งงานภาพชุดแรก (W1) — copy-ready สำหรับ Codex

### ART-UNIT-ANIMATION-A3-001 — เซเรน + เห็ดหมอผีกลวง

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A3-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Create branch art/art-unit-animation-a3-001. Add files only under incoming/ART-UNIT-ANIMATION-A3-001/. Do not change src/, tests/, public/, .github/ or existing art. Open a PR into the base branch; do not merge. Original artwork only; nothing from Asterveil: Rise Beyond.

Scope: Seren (`healer`, Priest, back row) and Hollow Mycon (`foe_mycon`). Claude does normalization, packing and runtime; you deliver art.
Follow incoming/ART-UNIT-ANIMATION-A2-001/ as the format reference (seed, whole-strip generation per move, raw strips, prompts.json, generation.json, preview, NOTES.md). Use the current in-game unit art of each character as the seed: keep face, outfit, staff, proportions, facing and sole line identical in every frame.

Seren moves (one whole strip per body set, 6–8 frames, prepare → release → follow-through → recover):
1. staff strike (attack)
2. single-target healing cast: staff raised toward an ally (heal, revive, bless)
3. party prayer: both hands on staff, upward release (prayer, halo)
4. protective seal: staff planted forward (sanctuary)
5. reactions: hit, block, down (3–4 frames each)
Light/glow belongs to the existing healing VFX; draw only small hand/staff glints in the body strips.

Hollow Mycon (Spore Hex, energy, back row):
1. cast: cap swells, spores gather, release forward, settle (6–8 frames)
2. reactions: hit, down

RETURN in incoming/ART-UNIT-ANIMATION-A3-001/: seeds, raw strips (transparent PNG, one file per strip), preview sheet at 390px game scale, prompts.json, NOTES.md listing frame order per strip and anything uncertain. Provide R1 and, if a move is ambiguous, an R2 alternative for owner selection.
```

### ART-VFX-ARCANE-SEAL-001 — ตระกูล C5.7 ผนึกอาคม

```text
CODEX HANDOFF — ART-VFX-ARCANE-SEAL-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Create branch art/art-vfx-arcane-seal-001. Add files only under incoming/ART-VFX-ARCANE-SEAL-001/. Do not change src/, tests/, public/, .github/ or existing art. Open a PR into the base branch; do not merge. Original artwork only.

Painted effect layers for four moves; Claude builds the atlas/module and routes them to real battle events. Follow incoming/ART-VFX-ALCHEMY-001/ and public/assets/fx/bolt_fx.* for format, scale and palette consistency (Luminous Veil navy-glass HUD; Mage violet/indigo, Duelist ivory/rose).
- mark (Duelist, single enemy, no damage): a rose-ivory seal that stamps onto the target and stays as a small floating mark.
- sigil / Sigil Bind (Mage, single enemy, damage + bind): violet runic circle closing around the target's feet, chains of light tightening.
- storm / Arcane Storm (Mage, damage to all enemies): falling arcane shards over the enemy side, one impact flash per foe.
- dispel (Mage, single target, removes effects): a ring that shatters outward into fading glyph fragments.
Each move: 3 beats (prepare at caster, travel/peak, impact/settle) as separate transparent layers, readable at 390px width, no text or real-world symbols. Leave targets' faces and HP numbers readable.

RETURN: layer PNGs per move and beat, a 390px storyboard preview of all four moves, generation prompts, NOTES.md with intended anchor (caster hand/target centre/target feet) and timing per beat. Provide R1 and R2 for owner selection.
```

หลังสองงานนี้ส่งกลับ Claude เปิดแชตงาน W1 ตาม §2 และเตรียมคำสั่งภาพ W2 ไว้ให้ Codex ทำต่อทันที
