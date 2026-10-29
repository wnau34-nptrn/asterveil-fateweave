# C5.9 VFX คำท้า (Taunt · Challenge · War Cry) — R2 runtime จริง รอเจ้าของตรวจ motion

29 ตุลาคม 2026 · branch `claude/unit-a5-garran-brann-command-vfx` · ภาพจาก PR #93 (`incoming/ART-VFX-COMMAND-001/`)

[หน้าเลือกคลิป](index.html) · [แพ็ก atlas](../../../incoming/ART-VFX-COMMAND-001/atlas.py) · [โมดูล](../../../src/game/visuals/command-fx.ts)

**สถานะ: เจ้าของอนุมัติ motion “เอาเข้าเกมได้” (2026-10-29) หลังดูคลิปจริง 14 คลิป** — อนุมัติโดยตรง ไม่ได้อนุมานจากเทสต์ (R2 คงไว้); PR #102 merge `ab3e004`

## การเลือก

เจ้าของมอบให้ Claude เลือก (Codex ไม่ได้แนะนำ) → **R2**: ขอบโล่หนา, เส้นด้ายชี้ขวาไม่ต้อง flip, ซี่ War Cry แยกชัด ตรวจ sha256 ของ 12 เลเยอร์ R2 กับ `layers.json` ก่อนแพ็ก; ถ้าเจ้าของไม่ชอบ เปลี่ยน `REV='R1'` ใน `atlas.py` (R1 เส้นด้ายต้อง flipX — ต้องเพิ่มโค้ดรองรับก่อน)

## สิ่งที่ทำ

- `atlas.py` แพ็ก 12 เลเยอร์ lossless → `public/assets/fx/command_fx.webp/json` (1056×792, 375,948 B; 3.19 MiB decoded) pivot ใน `src/game/visuals/command-art.json` (cone (35,128), thread (24,128))
- `command-fx.ts` + ต่อใน `BattleScene` (prepare/play/update/anchor) cue มาจาก event จริงเท่านั้น ไม่แก้ core/save/content/balance/playback timing
  - **Taunt**: event `taunt` ที่ target = ผู้ร่าย (Brann) → prepare ที่อก, pulse+motes กลิ้งไปทางศัตรู, settle ที่อก ไม่มี impact ที่ศัตรู
  - **Challenge**: event `taunt` ที่ target = ศัตรูที่เลือกจริง → crest ที่โล่ + เส้นด้ายเส้นเดียวไปที่ศัตรูตัวนั้น (ไม่แตก/ไม่ชี้ทุกตัว) + crest เล็กเหนือขอบโล่
  - **War Cry**: ตอนร่ายเป็น buff ของตัวเอง (event `buff` “War cry.”): prepare ที่อกหน้า + cone ไปทางศัตรู + wisps (ไม่มี impact) ส่วน `warcry_impact` วาดต่อ event `counter` “War cry counter.” **หนึ่งอันต่อเป้า** ที่ถูกสวนจริง ในเทิร์นศัตรู ไม่ใช่ที่ศัตรูทุกตัว
  - ทุกชั้นอยู่ระดับอก/โล่/ศัตรู ไม่มีวงพื้นหรือออร่าขา; ข้อความ/ตัวเลข HP ยังอยู่บนสุด
- ชั้นสีทอง/อำพัน (Taunt, Challenge) ใช้ additive blend อ่อน (ตามที่ NOTES ของ Codex อนุญาต) เพราะที่ normal blend กลืนกับเกราะทองจนมองไม่เห็นในคลิปรอบแรก; War Cry ใช้ normal blend
- โหมด: normal/fast ใช้เวลาเดิมของ stage; “ลดเอฟเฟกต์” ใช้ความทึบ .74 normal blend; OS reduced motion = peak นิ่งค้างสั้นๆ แล้วจางโดยไม่เลื่อน ไม่มี prepare/settle; impact ของ counter ยัง event-driven

## ผลตรวจ

- typecheck, lint, `npm test` ผ่าน (`tests/command-fx.test.ts` 9 เทสต์: cue ตรง event, Challenge เป้าเดียว, War Cry ไม่มี impact ตอนร่าย, impact เฉพาะ counter จริง, ศัตรูพลังงานไม่ทริกเกอร์, cancel ไม่วาด)
- browser `command-fx.spec.ts` 8 เทสต์ผ่าน (prepare/peak/settle/skip, เส้นด้ายตำแหน่งตรง anchor, counter impact ตามเทิร์น, OS reduce นิ่ง)
- คลิปจริง 14 คลิป 390×844 (Chromium จำลอง ไม่ใช่มือถือจริง): taunt/challenge/warcry × normal/fast/reduced/osreduce + challenge(energy) + warcry(kill) ใช้ CDP timestamp จริง ไม่เร่ง ไม่แทรกเฟรม ดู [index](index.html) และ `clips.json`
- fixture ใช้ภาพ Aegis/Brann/Garran จริงของ A2/A5

## งบภาพ (OD-05: สนามอนาคต 10 ตัว)

atlas เดียว 3.19 MiB decoded ใช้ร่วมทุกตัว ไม่เพิ่มต่อยูนิต ต่อการร่าย ≤3 image (Challenge: crest+thread+settle) และ counter 1 image ต่อเป้า (≤5 ในสนาม 5 ศัตรู) ต้องวัดซ้ำเมื่อ P02 มา

## ให้เจ้าของดู

ความชัดของ Taunt บนเกราะทอง (additive), เส้นด้าย Challenge ที่ยาวถึงศัตรูแถวหลัง, ขนาด cone ของ War Cry, impact ของ counter, การโหลด atlas ตอนเริ่มสู้ (eager preload +376 KB)
