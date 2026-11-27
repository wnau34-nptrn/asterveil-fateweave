# ART-UNIT-ANIMATION-LIFE-001 / 002 — ท่ายืนวนลูปและท่าชนะของฮีโร่ฝั่งเรา

เขียนโดย Claude 2026-11-27 ตามคำสั่งเจ้าของ “ข้อ 8–10 ส่ง brief ให้ Codex และขอ prompt เพื่อเปิด chat ให้ codex” · สถานะ: **เขียน prompt แล้ว** Codex ยังไม่ได้สร้างภาพ

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
| seed | ภาพ 512×512 RGBA หันขวา พื้นรองเท้า y496 จุดยึด (0.5, 497/512) ตามตารางด้านล่าง ตรวจ SHA-256 แล้ว | `incoming/*/seeds/…` |
| ขนาดในเกม | ตัวละครสูงราว 111 px บนจอ 390 px (บันทึกตรวจ A12 R2) รายละเอียดเล็กกว่า ~5 px อ่านไม่ออก | `docs/handoffs/CODEX-A12-NEW-CLASSES-TH.md` |
| ท่าหายใจเดิม | โค้ดยืด scaleY 1.022 / scaleX .992 รอบละ 1.5–2.1 วินาที ถ้ามี idle loop จากภาพ Claude จะปิดท่าหายใจด้วยโค้ดของตัวนั้นตอนนำเข้า | `src/game/scenes/BattleScene.ts` (`liven`) |
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

GOAL: today every ally stands as one still frame while a script gently stretches it, so all four "breathe" the same way and the battle ends with no reaction from them. Draw (1) a calm 4-frame idle loop and (2) a 6-frame victory pose for each of the four. Art only; Claude wires them into the game. Do not change rules, saves, text or timing.

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
6. held victory pose, stable enough to hold for several seconds (eyes open, balanced, both feet on the ground line unless stated).
Per character (keep it in character; use only what the seed already holds; no new props):
- Aegis (Knight): plants the shield at the side and raises the sword straight up, chin up; held pose = sword raised, shield planted.
- Lyra (Duelist): spins the greatsword once at the side and rests it on the shoulder with a confident grin; held pose = blade on shoulder, other hand on hip.
- Eira (Mage): lifts the staff high with a little hop (feet may leave the ground only in frames 3–4) and smiles with eyes closed; held pose = staff raised, the free hand holding the hat brim.
- Seren (Priest): lowers the staff, places the free hand over the heart and bows the head slightly, then looks up with a gentle smile; held pose = hand on heart, staff upright.
Supply an R2 for any victory that does not read at 111 px on the first try, and mark the recommended one.

GENERATION: one whole continuous strip per move in a single edit request (never frame by frame), the seed attached as the model, transparent background, wide clear gutters between figures. One shared scale per character across both strips, equal to the seed; feet on the same ground line except the frames allowed above. Body only: no VFX, glows, sparkles, confetti, motion lines, speed lines, shadows, ground or text baked in (Claude adds any sparkle in code). Leave room for raised weapons, staff tops, hat tips and capes; never crop them.

CELL LAYOUT (same as A12): cell 640×512 with the logical 512×512 at x64, cell anchor (320,497); frame 1 of each strip and the held victory frame 6 aligned to the seed's ground line.

QUALITY GATE before delivery: run python3 scripts/unit-anatomy-audit.py --cells on every strip against its seed (median head scale <= 1.15, every measured frame <= 1.20; inspect not-measured frames by eye and say so in NOTES.md). Do not deliver a failing strip as final; regenerate it or list it as missing. Also check the idle loop by playing frames 1→4→1 at 300 ms per frame: no jump in position, size or outline between frame 4 and frame 1.

DELIVERABLES (same layout as incoming/ART-UNIT-ANIMATION-A12-001): seeds/ + seeds.json, raw/ (untouched generator strips), spaced/ and cells/<character>-<move>/000.png (seed) + 001…, <character>-preview-390.png (every frame next to the seed at in-game size, plus the four allies side by side at 111 px tall), loop previews idle-<character>.webp or .gif at 300 ms per frame, audits/ (audit JSON + stdout), prompts.json (exact prompts, references, generation ids — no base64 image data in JSON), strips.json (move → frames, shared scale, offsets, proposed runtime use: idle → idleLoop frames, victory → one-shot then hold), validation.json (SHA-256 and size of every file), NOTES.md (what was checked, what was not, R1/R2 choices to make).

DELIVERY CHECK: push with normal git (no API upload of images; PR #90 was once cut near 768 KB), fetch the branch back, compare SHA-256 of every file with validation.json, and fully decode every PNG with Pillow. Report results in the PR.

ACCEPTANCE: (1) identity, proportions, weapon and props match the seed in every frame; (2) the idle loop is calm, seamless and keeps the feet still; (3) each victory pose reads at 111 px and fits the character; (4) frame counts, order, cell layout and ground line follow this brief; (5) true alpha, no checkerboard, nothing cropped; (6) files, hashes and previews match the list above.

NOT YOURS: atlas packing, the texture budget, registry, code, tests and in-game clips — Claude does these. Artwork selection (R1/R2) and motion approval are the owner's decisions; offline checks and CI are not approval.

RETURN: incoming/ART-UNIT-ANIMATION-LIFE-001/
```

## ชุด 2 (หลังเจ้าของอนุมัติชุด 1)

ใช้กล่องเดียวกัน เปลี่ยน ID เป็น `ART-UNIT-ANIMATION-LIFE-002` branch `art/art-unit-animation-life-002` แทนรายการ seed ด้วยตาราง 11 ตัวด้านบน และให้ Claude เขียนลักษณะท่ายืนและท่าชนะรายตัวจาก seed จริงก่อนส่ง (ยังไม่ได้เปิดดู seed ทั้ง 11 ตัว จึงยังไม่เขียนรายละเอียดรายตัวไว้ตรงนี้)

## หลัง Codex ส่ง (Claude ทำ ใช้ skill `fateweave-art-intake`)

- ตรวจแฮช สัดส่วน และเส้นพื้น
- ตัดสินเรื่องงบภาพ: ต่อท้าย atlas เดิม หรือแยก atlas เล็กของ idle/victory ที่โหลดทีหลังได้ (ไลราเกินงบอยู่แล้ว)
- ใส่ `idleLoop` ใน registry แล้วปิดท่าหายใจด้วยโค้ดของตัวที่มีภาพ
- เพิ่มท่าชนะที่เล่นจาก event ผลการต่อสู้จริง ปิดเมื่อลดการเคลื่อนไหว และไม่เปลี่ยนจังหวะเล่นท่าเดิม
- รัน `npm run coverage:presentation`, เทสต์ และ Playwright ที่เกี่ยวข้อง แล้วส่งคลิป 390px ให้เจ้าของอนุมัติ
