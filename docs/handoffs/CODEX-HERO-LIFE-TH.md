# ART-UNIT-ANIMATION-LIFE-001 / 002 — ท่ายืนวนลูปและท่าชนะของฮีโร่ฝั่งเรา

เขียนโดย Claude 2026-11-27 ตามคำสั่งเจ้าของ “ข้อ 8–10 ส่ง brief ให้ Codex และขอ prompt เพื่อเปิด chat ให้ codex” · ปรับหลัง PR #376 (เจ้าของ “มันตลกอ่ะ ให้ codex ช่วยทำเรื่อง animation ดีมั้ย” → “เก็บข้อ 3 ไว้ เอาเข้าเกมได้”): ท่าจากโค้ดที่ยืด/โยก/กระโดดภาพนิ่งดูเป็นตุ๊กตายาง ท่าจริงจึงต้องมาจากภาพวาด และต้องเป็นธรรมชาติ ไม่โอเวอร์ · สถานะ: **prompt พร้อมส่ง** Codex ยังไม่ได้สร้างภาพ

## ขอบเขต

- **ข้อ 8 ท่ายืนวนลูป (idle loop):** ทำ ตอนนี้ฮีโร่ทุกตัวใช้ภาพนิ่งเฟรม 0 แล้วโค้ดยืดตัวขึ้นลงให้เหมือนหายใจ (`BattleScene.liven`, scaleY 1.022) ทุกตัวเหมือนกันหมด ท่ายืนวนลูปจากภาพจริงตอนนี้มีเฉพาะศัตรูลอยตัว (`idleLoop` ของค้างคาว วิญญาณ ฯลฯ ใน `src/game/visuals/unit-frames.ts`)
- **ข้อ 9 เฟรมรับดาเมจ:** **ไม่ต้องทำ** ตรวจแล้วฮีโร่ทั้ง 15 ตัวมีครบ ตัวที่ใช้ layout ร่วมใช้เฟรม hit 17–18 และ down 19–21 (`sequence()` ใน `unit-frames.ts`) ส่วนคอริน เซรีส เคล วินน์ และแอสทริดมีเฟรมของตัวเอง ตัวที่ยังไม่มีคือศัตรูบางตัว ไม่อยู่ในงานนี้
- **ข้อ 10 ท่าชนะ (victory):** ทำ ตอนนี้จบการต่อสู้แล้วไม่มีท่าทางของตัวละครเลย

## แบ่งชุด (ทีละชุดเล็กตาม `ANIMATION_PROMPT_QUALITY_TH.md`)

| ชุด | ID | ตัวละคร | ทำเมื่อ |
|---|---|---|---|
| 1 นำร่อง | ART-UNIT-ANIMATION-LIFE-001 | เอกิส ไลรา ไอรา เซเรน (ทีมศึกแรก เห็นบ่อยที่สุด) | ส่งได้ทันที |
| 2 ที่เหลือ | ART-UNIT-ANIMATION-LIFE-002 | มิร่า โทมะ การ์แรน แบรนน์ เซฟา ลิโอ คอริน เซรีส เคล วินน์ แอสทริด | หลังเจ้าของอนุมัติ motion ชุด 1 ในเกมที่ 390px |

## ข้อเท็จจริงที่ตรวจแล้ว (2026-11-27 บนสาขาเกม)

| รายการ | ข้อเท็จจริง | ที่มา |
|---|---|---|
| seed | ภาพ 512×512 RGBA หันขวา ตรวจ SHA-256 แล้ว **แก้ 2026-11-27:** ภาพเต็มกรอบ รองเท้าถึงแถว 511 ทั้งสี่ตัว และขอบบนอยู่ที่แถว 0–20 (ไอรา/เซเรนชนขอบบน) ไม่มีที่ว่างเหนือหัว ข้อเดิม “y496” ผิด | `incoming/*/seeds/…` |
| ขนาดในเกม | ตัวละครสูงราว 111 px บนจอ 390 px (บันทึกตรวจ A12 R2) รายละเอียดเล็กกว่า ~5 px อ่านไม่ออก | `docs/handoffs/CODEX-A12-NEW-CLASSES-TH.md` |
| ท่าหายใจตอนนี้ | `HeroLife` ยืด scaleY 2.2% / หด scaleX 0.8% รอบละ ~3.6 วิ (ช้าลงเมื่อเลือด <30%) ตัวที่มี `idleLoop` จะข้ามท่านี้เองทันที (#376) | `src/game/visuals/hero-life.ts` |
| ท่าชนะตอนนี้ | โค้ดวาดประกายเหนือหัวทีละคน ตัวไม่ขยับ ถ้าตัวไหนมี `victory: { frames, frameMs }` ใน registry จะเล่นเฟรมนั้นแล้วกลับเฟรม 0 (Claude จะปรับให้ค้างเฟรมสุดท้ายตอนนำเข้า) | `BattleScene.finish()`, `unit-frames.ts` |
| idle loop ที่มีอยู่ | ศัตรูลอยตัวใช้ `idleLoop: { frames, frameMs }` เฟรม 0 = seed และเป็น fallback เมื่อลดการเคลื่อนไหว | `src/game/visuals/unit-frames.ts` |
| งบภาพ | ตัวทั่วไปไม่เกิน ~1.5 MB ดาวน์โหลด / 6 MiB decoded ต่อ art ตอนนี้ไลรา 2.27 MB / 8.5 MiB เกินแล้ว ส่วนตัวอื่น 0.6–2.2 MB งานนี้เพิ่มราว 10 เฟรมต่อตัว | `docs/design/UNIT_ANIMATION_ROLLOUT_TH.md` §7, `src/game/visuals/unit-atlases.json` |

| ตัวละคร (id ศิลป์) | อาชีพ | seed | sha256 (16 ตัวแรก) |
|---|---|---|---|
| เอกิส (aegis) | Knight | `incoming/ART-UNIT-ANIMATION-A2-001/aegis-seed.png` (A2-002 `cells/000.png` คือสำเนาเดียวกัน) | `0e888a0d889c61f2` |
| ไลรา (lyra) | Duelist | `incoming/ART-UNIT-ANIMATION-LYRA-002/seeds/lyra-seed.png` | `a0d462ce8c0469fa` |
| ไอรา (eira) | Mage | `incoming/ART-UNIT-ANIMATION-A1-001/eira-seed.png` | `89ae5c46336cefb8` |
| เซเรน (seren) | Priest | `incoming/ART-UNIT-ANIMATION-A3-001/seeds/seren-seed.png` | `0298b7eeffbdaee5` |
| มิร่า (mira) | Archer | `incoming/ART-UNIT-ANIMATION-A4-001/heroes/seeds/mira-seed.png` | `c0dfe376ceb6d507` |
| โทมะ (toma) | Alchemist | `incoming/ART-UNIT-ANIMATION-A4-001/heroes/seeds/toma-seed.png` | `39edb773bacfd7a2` |
| การ์แรน (garran) | Spear | `incoming/ART-UNIT-ANIMATION-A5-001/heroes/seeds/garran-seed.png` | `653fb5efb1f4b1bc` |
| แบรนน์ (brann) | Warden | `incoming/ART-UNIT-ANIMATION-A5-001/heroes/seeds/brann-seed.png` | `35f1aeb0f99c4d86` |
| เซฟา (sefa) | Scout | `incoming/ART-UNIT-ANIMATION-A6-001/heroes/seeds/sefa-seed.png` | `6cb511ce3ac8badd` |
| ลิโอ (lio) | Bard | `incoming/ART-UNIT-ANIMATION-A6-001/heroes/seeds/lio-seed.png` | `e6760e48b0403e13` |
| คอริน (metta) | Saint | `incoming/ART-UNIT-ANIMATION-A7-001/saints/metta/seeds/metta.png` | `62126d7f84767d64` |
| เซรีส (lalin) | Dancer | `incoming/ART-UNIT-ANIMATION-A7-002/seeds/lalin.png` | `3fc6f8259ca286dc` |
| เคล (kael) | Martial | `incoming/ART-UNIT-ANIMATION-A12-001/seeds/kael.png` | `5d9f344d4d44cad3` |
| วินน์ (wynne) | Hexer | `incoming/ART-UNIT-ANIMATION-A12-001/seeds/wynne.png` | `b2888ab61fcb39fc` |
| แอสทริด (astrid) | Seer | `incoming/ART-UNIT-ANIMATION-A12-001/seeds/astrid.png` | `a2d2ac7833818ff6` |

## สิ่งที่ Claude ตัดสินใจเอง (ถ้าเจ้าของไม่ตอบ ใช้ตามนี้)

1. idle loop 4 เฟรม และท่าชนะ 6 เฟรม เล่นครั้งเดียวแล้วค้างเฟรมสุดท้าย น้อยพอให้อยู่ในงบภาพ และพอให้อ่านออก
2. ท่ายืนต้องนิ่งพอไม่แย่งสายตาจากเจ้าของเทิร์นและท่าของศัตรู ขยับเฉพาะลมหายใจและของปลิว (ผม ผ้าคลุม ผ้าคาดเอว) เท้าไม่ขยับ
3. ท่าชนะของแต่ละตัวอิงอาวุธหรือของที่ถืออยู่ใน seed และบุคลิกอาชีพ ไม่เพิ่มของใหม่
4. ชุด 1 นำร่องก่อน เพราะต้องดูว่าเข้างบภาพและเห็นผลจริงที่ 111 px ก่อนทำอีก 11 ตัว

**สิ่งที่เจ้าของต้องเลือกภายหลัง:** R1 หรือ R2 ของท่าชนะที่ Codex ส่งมาสองแบบ และอนุมัติ motion จากคลิปในเกมที่ 390px หลัง Claude นำเข้า (ผลเทสต์ไม่ใช่การอนุมัติ)

## กล่อง prompt สำหรับ Codex — ชุด 1 (คัดลอกทั้งกล่อง)

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-LIFE-001 (art only)
Asterveil · Fateweave: a looping idle and a one-shot victory pose for four allies — Aegis (Knight), Lyra (Duelist), Eira (Mage), Seren (Priest)

Read AGENTS.md, CLAUDE.md, docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md and docs/handoffs/CODEX-HERO-LIFE-TH.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype (NOT main). Create branch art/art-unit-animation-life-001. Add files only under incoming/ART-UNIT-ANIMATION-LIFE-001/. Do not change src/, tests/, public/, .github/, existing art or any earlier incoming folder. Open a PR into the base branch; do not merge it.

GOAL: today every ally stands as one still frame while a script gently stretches it, so all four "breathe" the same way, and at a win only code sparkles appear. The owner tried script-driven sway, lean and hop on the still frames and found them silly (a flat picture stretching like rubber), so real motion must come from drawn frames and must look natural and understated, never cartoonishly exaggerated. Draw (1) a calm 4-frame idle loop and (2) a 6-frame victory pose for each of the four. Art only; Claude wires them into the game. Do not change rules, saves, text or timing.

SEEDS (on the game branch; verify the hashes and copy byte-for-byte into seeds/):
- Aegis: incoming/ART-UNIT-ANIMATION-A2-001/aegis-seed.png  sha256 starts 0e888a0d889c61f2
- Lyra:  incoming/ART-UNIT-ANIMATION-LYRA-002/seeds/lyra-seed.png  sha256 starts a0d462ce8c0469fa
- Eira:  incoming/ART-UNIT-ANIMATION-A1-001/eira-seed.png  sha256 starts 89ae5c46336cefb8
- Seren: incoming/ART-UNIT-ANIMATION-A3-001/seeds/seren-seed.png  sha256 starts 0298b7eeffbdaee5
512×512 RGBA, facing right, sole on y496 (logical ground y497, pivot (0.5, 497/512)). Every frame keeps exactly the seed's face, hair, costume, weapon and props and the SAME head-to-body size. Do NOT give the generator any other cast member as image input. Original art only; never copy Asterveil: Rise Beyond.

DISPLAY SIZE: in battle each ally is about 111 px tall on a 390 px phone screen. Anything smaller than about 5 px on screen disappears. Check every frame exported at 111 px tall.

MOVE 1 — idle (4 frames, loops 1→2→3→4→1 forever, about 1.2–1.6 s per loop):
1. exactly the seed.
2. inhale: chest and shoulders rise slightly (about 4–6 px in the 512 cell), head follows a little; loose parts start to drift.
3. top of the breath: loose parts at their furthest drift.
4. exhale on the way back, so frame 4 → frame 1 is seamless (frame 4 must not equal frame 1: no hitch).
Feet, soles and the ground line never move. Weapon and shield stay where they are in the seed, moving only with the breath. Only secondary motion sways: hair, cape and scarf tips, robe hems, hat brim, staff ornaments. Calm and small: it plays behind the turn owner and the enemy moves and must not draw the eye. Per character:
- Aegis: steady soldier's breath, cape edge and fringe of blond hair stir; sword point and shield stay grounded.
- Lyra: restless, slightly bouncy weight on the front foot; the red scarf and cape tails flutter more than the others; greatsword stays held.
- Eira: soft breath, long silver hair and the wide hat brim drift; the staff's purple gem may tilt a few degrees with the hand.
- Seren: serene breath, green mantle and white robe hems sway; laurel and golden staff stay steady.

MOVE 2 — victory (6 frames, plays once at the end of a won battle, then HOLDS frame 6 until the result screen):
1. exactly the seed.
2. small anticipation dip (knees bend, weapon lowered).
3. rising into the pose.
4. peak of the pose (the most readable frame).
5. small settle.
6. held victory pose, stable enough to hold for several seconds (eyes open, balanced, both feet on the ground line).
No jumps or leaps: soles stay on the ground line in every victory frame (heels may lift). Keep the gesture modest and believable: a proud, happy pose, not a comic one.
Per character (keep it in character; use only what the seed already holds; no new props):
- Aegis (Knight): plants the shield at the side and raises the sword straight up, chin up; held pose = sword raised, shield planted.
- Lyra (Duelist): spins the greatsword once at the side and rests it on the shoulder with a confident grin; held pose = blade on shoulder, other hand on hip.
- Eira (Mage): lifts the staff high on her toes (no jump) and smiles with eyes closed; held pose = staff raised, the free hand holding the hat brim.
- Seren (Priest): lowers the staff, places the free hand over the heart and bows the head slightly, then looks up with a gentle smile; held pose = hand on heart, staff upright.
Supply an R2 for any victory that does not read at 111 px on the first try, and mark the recommended one.

GENERATION: one whole continuous strip per move in a single edit request (never frame by frame), the seed attached as the model, transparent background, wide clear gutters between figures. One shared scale per character across both strips, equal to the seed; soles on the same ground line in every frame. Body only: no VFX, glows, sparkles, confetti, motion lines, speed lines, shadows, ground or text baked in (Claude adds any sparkle in code). Leave room for raised weapons, staff tops, hat tips and capes; never crop them.

CELL LAYOUT (same as A12): cell 640×512 with the logical 512×512 at x64, cell anchor (320,497); frame 1 of each strip and the held victory frame 6 aligned to the seed's ground line.

QUALITY GATE before delivery: run python3 scripts/unit-anatomy-audit.py --cells on every strip against its seed (median head scale <= 1.15, every measured frame <= 1.20; inspect not-measured frames by eye and say so in NOTES.md). Do not deliver a failing strip as final; regenerate it or list it as missing. Also check the idle loop by playing frames 1→4→1 at 300 ms per frame: no jump in position, size or outline between frame 4 and frame 1.

DELIVERABLES (same layout as incoming/ART-UNIT-ANIMATION-A12-001): seeds/ + seeds.json, raw/ (untouched generator strips), spaced/ and cells/<character>-<move>/000.png (seed) + 001…, <character>-preview-390.png (every frame next to the seed at in-game size, plus the four allies side by side at 111 px tall), loop previews idle-<character>.webp or .gif at 300 ms per frame, audits/ (audit JSON + stdout), prompts.json (exact prompts, references, generation ids — no base64 image data in JSON), strips.json (move → frames, shared scale, offsets, proposed runtime use: idle → idleLoop frames, victory → one-shot then hold), validation.json (SHA-256 and size of every file), NOTES.md (what was checked, what was not, R1/R2 choices to make).

DELIVERY CHECK: push with normal git (no API upload of images; PR #90 was once cut near 768 KB), fetch the branch back, compare SHA-256 of every file with validation.json, and fully decode every PNG with Pillow. Report results in the PR.

ACCEPTANCE: (1) identity, proportions, weapon and props match the seed in every frame; (2) the idle loop is calm, seamless and keeps the feet still; (3) each victory pose reads at 111 px and fits the character; (4) frame counts, order, cell layout and ground line follow this brief; (5) true alpha, no checkerboard, nothing cropped; (6) files, hashes and previews match the list above.

NOT YOURS: atlas packing, the texture budget, registry, code, tests and in-game clips — Claude does these. Artwork selection (R1/R2) and motion approval are the owner's decisions; offline checks and CI are not approval.

RETURN: incoming/ART-UNIT-ANIMATION-LIFE-001/
```

## รอบแก้ R3 — ท่าชนะอย่างเดียว (หลัง PR #377)

Claude ตรวจ PR #377 แล้วพบว่า (ตรงกับ NOTES ของ Codex) idle วาดใหม่ทั้งตัวทุกเฟรมจนวนลูปกระตุก ท่าชนะตัวเล็กลง อาวุธล้นกรอบ หมวกไอราถูกตัด และคทาเปลี่ยนสี ([ผลตรวจ](../validation/hero-life-2026-11-27/README_TH.md)) Claude แนะนำและเจ้าของขอ prompt แก้ไข: **ตัด idle แบบสร้างภาพใหม่** (ใช้หายใจจากโค้ดใน #376) ทำเฉพาะท่าชนะบนกรอบที่ใหญ่ขึ้น ส่วน idle ไปทำแบบดัดภาพในหัวข้อถัดไป

```text
CODEX FIX ROUND — ART-UNIT-ANIMATION-LIFE-001 R3 (art only, victory poses only)
Asterveil · Fateweave: redo the one-shot victory pose for Aegis (Knight), Lyra (Duelist), Eira (Mage), Seren (Priest)

Read AGENTS.md, CLAUDE.md, docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md and docs/handoffs/CODEX-HERO-LIFE-TH.md (section "รอบแก้ R3") first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype (NOT main). Continue on your branch art/art-unit-animation-life-001 and its PR #377. Add files only under incoming/ART-UNIT-ANIMATION-LIFE-001/r3/; leave the earlier files untouched as reference. Do not change src/, tests/, public/, .github/ or any other incoming folder. Do not merge.

WHAT CHANGED SINCE YOUR FIRST DELIVERY (thank you for the honest NOTES — they were right):
1. IDLE LOOPS ARE CANCELLED. Do not draw or redraw any idle frames. Regenerated idle frames changed pose, sword angle and outline every frame, so the loop jittered; the game keeps its code breath instead.
2. The brief's ground fact was wrong: all four seeds fill the 512×512 square, soles reach row 511 and the tops reach rows 0–20, so there was no room above the head. R3 uses a larger canvas (below).
3. Owner feedback on script-driven motion was "it looks silly". The victory must look natural and understated: a proud, happy pose, never comic. NO JUMPS: soles stay on the ground line in every frame (heels may lift).

SEEDS: the same four files as before (copy them from your seeds/ folder; same SHA-256). Do NOT give the generator any other cast member as image input. Original art only.

CANVAS (new): every frame is 768×768 RGBA. Frame 1 = the seed pasted UNSCALED with its top-left corner at (128, 256), so the seed's soles sit on row 767 and there are 256 px above the head and 128 px on each side for raised weapons, staff tops, hat tips and capes. Ground line = row 767 in every frame. Nothing may touch the canvas edge except the soles on the bottom row; nothing cropped.

SAME SIZE, SAME LOOK (the main failure last time): every frame is drawn at exactly the seed's scale — head width and body height within ±3% of the seed (measure them and list the numbers in NOTES.md). Keep exactly the seed's face, hair, costume colours, weapon, shield and staff: same shapes and SAME COLOURS (Eira's staff stays exactly as in the seed; Lyra's greatsword, Aegis's sword and shield, Seren's golden staff unchanged). No new props, no lost details.

VICTORY (6 frames, plays once when a battle is won, then HOLDS frame 6 for several seconds):
1. exactly the seed (pasted, not regenerated).
2. small anticipation (knees bend slightly, weapon lowered a little).
3. rising into the pose.
4. peak of the pose (the most readable frame).
5. small settle.
6. held pose: stable, balanced, eyes open, both soles on row 767.
Per character:
- Aegis (Knight): plants the shield beside him on the ground and raises the sword straight up with a firm grip, chin up. Held = sword raised, shield planted.
- Lyra (Duelist): swings the greatsword in one smooth half-arc at her side and rests it on her shoulder, confident grin. Held = blade on shoulder, other hand on hip.
- Eira (Mage): raises the staff high on her toes (no jump) with a happy closed-eye smile, free hand touching the hat brim. Held = staff raised, hand on brim, eyes open.
- Seren (Priest): stands the staff upright, places the free hand over the heart, bows the head slightly, then looks up with a gentle smile. Held = hand on heart, staff upright.
Deliver one version per character (R3). Add an R3b only if R3 fails the gates below, and mark the recommended one.

GENERATION: one continuous strip per character in a single edit request with the seed attached as the model; transparent background and wide clear gutters. Then cut, scale to the seed's measured size and place each frame on the 768×768 canvas with the soles on row 767. Body only: no VFX, glows, sparkles, motion lines, shadows, ground or text (Claude adds sparkles in code).

QUALITY GATES before delivery (do not deliver a failing strip as final; regenerate it or list it as missing):
- scale: head width and figure height of frames 2–6 within ±3% of the seed (table in NOTES.md);
- python3 scripts/unit-anatomy-audit.py --cells on each strip against its seed: median head scale <= 1.15, every measured frame <= 1.20;
- colour: a side-by-side of the seed and frame 6 at full size for each character, checked by eye for any colour or prop change;
- edges: no opaque pixel on rows 0–3 or columns 0–3 / 764–767 in any frame;
- ground: lowest opaque row = 767 in every frame;
- readability: frame 6 of all four side by side, scaled so the seed body is 111 px tall (in-game size on a 390 px phone).

DELIVERABLES under r3/: cells/<character>-victory/000.png (seed on the 768 canvas) + 001…005 (frames 2–6), raw/ (untouched generator strips), <character>-victory-r3-preview-390.png (all frames next to the seed at in-game size), allies-victory-held-390.png (the four held frames side by side at 111 px), audits/, prompts.json (exact prompts, references, generation ids; no base64), strips.json (frames, canvas 768×768, ground row 767, seed offset (128,256), runtime use: one-shot then hold frame 6), validation.json (SHA-256 and size of every file), NOTES.md (measurements, what passed, what was not checked, recommended version per character).

DELIVERY CHECK: push with normal git, fetch the branch back, compare SHA-256 with validation.json and fully decode every PNG with Pillow; report in PR #377.

NOT YOURS: atlas packing, texture budget, registry, code, tests and in-game clips (Claude). Picking versions and approving motion are the owner's decisions; offline checks are not approval.

RETURN: incoming/ART-UNIT-ANIMATION-LIFE-001/r3/
```

## นำร่องท่ายืนวนลูปแบบดัดภาพ — เอกิส (ART-UNIT-ANIMATION-LIFE-001 W1)

เจ้าของ 2026-11-27: “ท่ายืนวนลูปน่าสนใจนะ” → Claude เสนอให้ดัดภาพ seed เดิมด้วยสคริปต์แทนการสร้างใหม่ (หน้า อาวุธ เท้า สี คงพิกเซลเดิม) นำร่องเอกิสตัวเดียว → “เอาตามที่คุณแนะนำ” ส่งแยกจาก R3 ได้

```text
CODEX PILOT — ART-UNIT-ANIMATION-LIFE-001 W1 (art only): Aegis idle loop by warping the seed (no image generation)
Asterveil · Fateweave

Read AGENTS.md, CLAUDE.md and docs/handoffs/CODEX-HERO-LIFE-TH.md (section "นำร่องท่ายืนวนลูปแบบดัดภาพ") first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype (NOT main). Continue on your branch art/art-unit-animation-life-001 and PR #377. Add files only under incoming/ART-UNIT-ANIMATION-LIFE-001/w1-aegis-idle/. Do not change src/, tests/, public/, .github/ or other folders. Do not merge. This is independent of the R3 victory round; either may be delivered first.

WHY: your generated idle frames redrew the whole knight every frame, so the sword angle, outline and stance changed and the loop jittered. The owner still likes the idea of a drawn idle loop. This pilot makes it by DEFORMING THE SEED ITSELF with a script, so every frame keeps the seed's exact pixels except a few soft-moving parts.

INPUT: only incoming/ART-UNIT-ANIMATION-A2-001/aegis-seed.png (512×512 RGBA, sha256 starts 0e888a0d889c61f2; the figure fills the square, soles on row 511, right edge touching column 511). NO image generator, NO repainting, NO new pixels invented beyond what a smooth warp of the seed produces. Write the tool in Python (Pillow + numpy; scipy or OpenCV allowed) and commit it as w1-aegis-idle/tools/warp_idle.py so the frames can be rebuilt exactly.

METHOD:
1. Paint soft masks (feathered, 6–12 px falloff) over the seed for: (a) chest + shoulders + head (one rigid-ish group), (b) the blond hair fringe and loose strands, (c) the cape's free edge and tips, (d) any cloth tails / tabards. Save each mask as masks/<part>.png (8-bit, same 512×512).
2. Everything outside the masks stays byte-identical to the seed in every frame: face details, eyes, armour plates, sword, shield, hands, legs, feet, soles and the ground line. Check this with a pixel diff (report the count of changed pixels outside the masks = must be 0).
3. Deform only inside the masks with a smooth displacement field (e.g. thin-plate / moving-least-squares / sine displacement blended by the mask) driven by one breath phase:
   - (a) chest/shoulders/head rise by up to 3 px at the top of the breath and come back; the head follows by up to 2 px; NO scaling of the whole figure.
   - (b) hair strands drift up to 3 px, slightly behind the breath phase (lag ~1/8 of the cycle).
   - (c)/(d) cape and cloth tips sway up to 4 px sideways, lag ~1/4 of the cycle.
   Use bilinear or better sampling and premultiplied alpha so edges stay clean; no halos, no smearing of the dark outline, no holes. Nothing may move past the 512×512 edges (keep the right edge and the soles exactly where they are).
4. FRAMES: 8 frames over one full breath (phase 0, 1/8 … 7/8), frame 1 = the seed exactly (byte-identical). Proposed runtime: 400 ms per frame = 3.2 s per breath, looping 1→8→1 (phase 7/8 → 0 must be seamless by construction).

QUALITY GATES (do not deliver a failing set as final):
- pixel diff outside masks = 0 in every frame; frame 1 byte-identical to the seed;
- max displacement per part within the limits above (report measured values);
- outline check: no visible doubling, tearing or halo at 100% and at 111 px tall (in-game size on a 390 px phone);
- python3 scripts/unit-anatomy-audit.py --cells on the 8 frames against the seed: median head scale <= 1.15, every frame <= 1.20 (it should read ~1.00);
- loop preview watched at 400 ms per frame and at 200 ms per frame: calm, no jump between frame 8 and frame 1.

DELIVERABLES under w1-aegis-idle/: frames/000.png … 007.png (512×512, 000 = seed), masks/, tools/warp_idle.py (+ the exact command line), idle-aegis-400ms.webp and idle-aegis-111px.webp (in-game size), diff/ (per-frame heatmap of changed pixels over the seed), strips.json (frames, frameMs 400, loop, phase per frame, displacement limits), validation.json (SHA-256 and size of every file), NOTES.md (method, measured values, what was and was not checked).

DELIVERY CHECK: push with normal git, fetch back, compare SHA-256 with validation.json, decode every PNG with Pillow; report in PR #377.

NOT YOURS: atlas packing, registry, code, tests, in-game clips (Claude). Motion approval is the owner's; offline checks are not approval. If Aegis is approved, the same tool will be reused for Lyra, Eira and Seren.

RETURN: incoming/ART-UNIT-ANIMATION-LIFE-001/w1-aegis-idle/
```

## ชุด 2 — ท่าชนะของ 11 ตัวที่เหลือ (ART-UNIT-ANIMATION-LIFE-002)

เจ้าของ 2026-11-27 “ขอ Prompt สำหรับท่าดีใจของตัวอื่นที่เหลือ ยกเว้นตัวที่ยังพักไว้นะ” · ไม่รวม Odran `thiran` / Isolde `wila` (พักไว้ OD-14) · Claude เปิดดู seed ทั้ง 11 ตัวแล้ว: ต่างจากสี่ตัวแรก seed ชุดนี้มีที่ว่างเหนือหัว (ขอบบน 32–47, พื้นรองเท้า 493–496) ใช้กรอบ 768 เดียวกับ R3 เพื่อเผื่อพื้นที่ยกอาวุธ บทเรียนจาก R3/R4: ขนาดตัวต้อง ±3%, ความยาวอาวุธ ±5%, สีและของที่ถือตรง seed, ไม่กระโดด, ขอบสะอาด

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-LIFE-002 (art only): one-shot victory poses for the remaining 11 allies
Asterveil · Fateweave

Read AGENTS.md, CLAUDE.md, docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md and docs/handoffs/CODEX-HERO-LIFE-TH.md (sections "รอบแก้ R3", "ไลรา R4" and "ชุด 2 — ท่าชนะของ 11 ตัวที่เหลือ") first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype (NOT main). Create branch art/art-unit-animation-life-002. Add files only under incoming/ART-UNIT-ANIMATION-LIFE-002/. Do not change src/, tests/, public/, .github/, existing art or any earlier incoming folder. Open a PR into the base branch; do not merge it.

CONTEXT: the owner approved the in-game victory poses of Aegis R3, Eira R3b and Seren R3 (thank you — R3 worked). Lyra R4 is in review. Now the same one-shot victory pose for the other 11 allies. Odran and Isolde are parked: do NOT draw them. No idle loops in this task.

WORK IN TWO BATCHES (push and report each in the PR):
- Batch A: Mira, Toma, Garran, Brann, Sefa, Lio.
- Batch B: Corin, Cerise, Kael, Wynne, Astrid.

SEEDS (on the game branch; verify the hash prefix and copy byte-for-byte into seeds/):
- Mira (Archer): incoming/ART-UNIT-ANIMATION-A4-001/heroes/seeds/mira-seed.png  c0dfe376ceb6d507  sole row 495
- Toma (Alchemist): incoming/ART-UNIT-ANIMATION-A4-001/heroes/seeds/toma-seed.png  39edb773bacfd7a2  sole 496
- Garran (Spear): incoming/ART-UNIT-ANIMATION-A5-001/heroes/seeds/garran-seed.png  653fb5efb1f4b1bc  sole 496
- Brann (Warden): incoming/ART-UNIT-ANIMATION-A5-001/heroes/seeds/brann-seed.png  35f1aeb0f99c4d86  sole 496
- Sefa (Scout): incoming/ART-UNIT-ANIMATION-A6-001/heroes/seeds/sefa-seed.png  6cb511ce3ac8badd  sole 495
- Lio (Bard): incoming/ART-UNIT-ANIMATION-A6-001/heroes/seeds/lio-seed.png  e6760e48b0403e13  sole 496
- Corin (Saint): incoming/ART-UNIT-ANIMATION-A7-001/saints/metta/seeds/metta.png  62126d7f84767d64  sole 495
- Cerise (Dancer): incoming/ART-UNIT-ANIMATION-A7-002/seeds/lalin.png  3fc6f8259ca286dc  sole 493
- Kael (Martial): incoming/ART-UNIT-ANIMATION-A12-001/seeds/kael.png  5d9f344d4d44cad3  sole 496
- Wynne (Hexer): incoming/ART-UNIT-ANIMATION-A12-001/seeds/wynne.png  b2888ab61fcb39fc  sole 496
- Astrid (Seer): incoming/ART-UNIT-ANIMATION-A12-001/seeds/astrid.png  a2d2ac7833818ff6  sole 496
(sole row = lowest row with 20+ opaque pixels at alpha >= 128.) Do NOT give the generator any other cast member as image input. Original art only.

CANVAS (same as R3): every frame 768×768 RGBA; frame 1 = the seed pasted UNSCALED at (128, 256); ground line = the seed's sole row + 256 (e.g. 752 for sole 496) in every frame; nothing touches the canvas edges.

SAME SIZE, SAME LOOK (the gates R3/R4 taught us): head width and figure height within ±3% of the seed in frames 2–6 (measure and list); held weapons/props within ±5% of their seed length; same face, hair, costume colours and props, same shapes and SAME COLOURS; no new props. NO JUMPS: soles on the ground line in every frame (heels may lift). Natural and understated: a proud, happy pose, never comic. Body only: no VFX, glows, sparkles, music notes beyond what the seed already shows, motion lines, shadows, ground or text (Claude adds sparkles in code). Clean transparent edges (no grey/white matte), checked on dark and bright backgrounds.

VICTORY (6 frames, plays once when a battle is won, then HOLDS frame 6 for several seconds):
1. exactly the seed (pasted, not regenerated). 2. small anticipation. 3. rising into the pose. 4. peak (most readable). 5. small settle. 6. held pose: stable, balanced, eyes open unless stated, both soles on the ground line.
Per character (use only what the seed holds):
- Mira (Archer): lifts the bow high in her left hand, right fist at her side, bright smile; hood and braid settle. Held = bow raised overhead.
- Toma (Alchemist): raises the glowing flask to eye level, pushes his goggles up with the other hand and grins. Held = flask raised, goggles on forehead. No liquid splash.
- Garran (Spear): plants the spear butt beside his foot, shield on his arm, chin up with a proud grin. Held = spear upright, shield at his side.
- Brann (Warden): sets the hammer head on the ground and rests both hands on the handle, a hearty laugh (eyes closed allowed in frames 3–5). Held = leaning on the hammer, eyes open, broad smile.
- Sefa (Scout): one quick flip of a dagger, then both daggers in reverse grip crossed in front of the chest, a cool smirk; scarf settles. Held = daggers crossed.
- Lio (Bard): strums a final chord and lifts the lute neck up with a flourish, eyes closed smile in frames 3–4. Held = lute held up, eyes open, smile.
- Corin (Saint): presses his fist into his open palm in a martial salute and bows slightly, prayer beads hanging. Held = fist-in-palm salute, upright, calm smile.
- Cerise (Dancer): a small quarter turn and back (no full spin), ending with both fans open wide at her sides, one toe pointed; ribbons settle. Held = fans open at both sides, facing right.
- Kael (Martial): exhales from his stance, then raises one fist upward with a grin, other hand at his sash. Held = fist raised.
- Wynne (Hexer): hugs the charm-doll she holds close to her cheek, talismans sway, a shy smile. Held = doll hugged at cheek.
- Astrid (Seer): raises the astrolabe ring in one hand at shoulder height, closes her eyes in a calm smile in frames 3–4. Held = astrolabe raised, eyes open, gentle smile.
Supply an R2 only for a character that fails a gate; mark the recommended version.

GENERATION: one continuous strip per character in a single edit request, seed attached as the model; transparent background, wide gutters. Then cut, scale each frame back to the seed's measured size and place it on the 768 canvas with the soles on the ground line.

QUALITY GATES (do not deliver a failing strip as final; regenerate or list it as missing): scale table (±3%); prop length table (±5%); python3 scripts/unit-anatomy-audit.py --cells against the seed (median <= 1.15, every measured frame <= 1.20); edges (no opaque pixel on rows 0–3 or columns 0–3 / 764–767); lowest opaque row = the character's ground line in every frame; seed-vs-held side by side at full size; held frames of each batch side by side at 111 px tall (in-game size on a 390 px phone).

DELIVERABLES under incoming/ART-UNIT-ANIMATION-LIFE-002/: seeds/ + seeds.json, raw/, cells/<character>-victory/000.png … 005.png, <character>-victory-preview-390.png, <character>-victory-seed-vs-held.png, batch-a-held-390.png and batch-b-held-390.png, audits/, prompts.json (exact prompts, references, generation ids; no base64), strips.json (per character: frames, canvas 768, seed offset (128,256), ground row, scale/offset per frame, recommended version, runtime use one-shot then hold frame 6), validation.json (SHA-256 and size of every file), NOTES.md (measurements, what passed, what was not checked).

DELIVERY CHECK: push with normal git (no API upload of images), fetch back, compare SHA-256 with validation.json, fully decode every PNG with Pillow; report in the PR per batch.

NOT YOURS: atlas packing, budget, registry, code, tests and in-game clips (Claude). Picking versions and approving motion are the owner's decisions; offline checks are not approval.

RETURN: incoming/ART-UNIT-ANIMATION-LIFE-002/
```

## ชุด 2 (หลังเจ้าของอนุมัติชุด 1)

ใช้กล่องเดียวกัน เปลี่ยน ID เป็น `ART-UNIT-ANIMATION-LIFE-002` branch `art/art-unit-animation-life-002` แทนรายการ seed ด้วยตาราง 11 ตัวด้านบน และให้ Claude เขียนลักษณะท่ายืนและท่าชนะรายตัวจาก seed จริงก่อนส่ง (ยังไม่ได้เปิดดู seed ทั้ง 11 ตัว จึงยังไม่เขียนรายละเอียดรายตัวไว้ตรงนี้)

## หลัง Codex ส่ง (Claude ทำ ใช้ skill `fateweave-art-intake`)

- ตรวจแฮช สัดส่วน และเส้นพื้น
- ตัดสินเรื่องงบภาพ: ต่อท้าย atlas เดิม หรือแยก atlas เล็กของ idle/victory ที่โหลดทีหลังได้ (ไลราเกินงบอยู่แล้ว)
- ใส่ `idleLoop` ใน registry แล้วปิดท่าหายใจด้วยโค้ดของตัวที่มีภาพ
- เพิ่มท่าชนะที่เล่นจาก event ผลการต่อสู้จริง ปิดเมื่อลดการเคลื่อนไหว และไม่เปลี่ยนจังหวะเล่นท่าเดิม
- รัน `npm run coverage:presentation`, เทสต์ และ Playwright ที่เกี่ยวข้อง แล้วส่งคลิป 390px ให้เจ้าของอนุมัติ
