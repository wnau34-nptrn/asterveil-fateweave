# ART-UNIT-ANIMATION-A12-001 — ชุดท่าต่อสู้ เคล / วินน์ / แอสทริด

เขียนโดย Claude 2026-11-04 ตามคำขอของเจ้าของ (“เขียน prompt ชุดท่าเคล วินน์ แอสทริดให้ด้วย”) · สถานะ: **เขียน prompt แล้ว** Codex ยังไม่ได้สร้างภาพ

ข้อเท็จจริงที่ตรวจแล้ว:

- seed คือภาพนิ่งที่ Codex ส่งใน `incoming/ART-CHAR-CLASS-NEW-002/unit/` (อยู่บนสาขาเกมแล้ว) ภาพเป็น 512×512 หันขวา พื้นรองเท้าอยู่ที่ y496 bbox ของ kael คือ (51,47,461,497) wynne (90,37,421,497) astrid (84,46,427,497)
- `NOTES.md` ของ package นั้นยังเขียนว่า “รอเจ้าของอนุมัติภาพ” และไม่พบบันทึกการอนุมัติภาพนิ่ง ถ้าส่ง prompt นี้ไป ถือว่าเจ้าของรับภาพนิ่งชุดนี้เป็น seed ถ้าเจ้าของจะแก้ภาพนิ่ง ต้องแก้ก่อนสั่งชุดท่า
- สกิลตามแผนใน `docs/design/ROSTER_30_TH.md`:
  - เคล (หน้า): attack, gatherfist, releasefist, flowfist, circlefist, storedfist, perfectfist
  - วินน์ (หลัง): attack, threadhex, lifetoll, wovenhex, longthread, tollring, knothex
  - แอสทริด (หลัง): attack, deflectfate, turncycle, crossing, doubledial, starneedle, readorbit
- **เคลต้องแก้สัดส่วนก่อน** (เจ้าของทักว่าสเกลต่าง ตรวจแล้วหัวจริงเล็กราว 105–115px เพราะวัดจากยอดมวยผม): ส่ง `docs/handoffs/CODEX-KAEL-SCALE-FIX-TH.md` (ART-CHAR-CLASS-NEW-003) ก่อน แล้วค่อยทำส่วนของเคลใน A12 โดยใช้ `incoming/ART-CHAR-CLASS-NEW-003/unit/kael.png` แทน seed เดิม และแทน sha256 ในกล่องด้วยค่าจาก NEW-003
- ทั้งสามอาชีพยังไม่มีในโค้ดเกม (งาน P03) ภาพที่ได้จะเก็บใน `incoming/` ไว้ก่อน Claude จะนำเข้าเมื่อเพิ่มอาชีพเข้าเกม ส่วนการจับคู่ท่ากับ ActionId ด้านล่างเป็นข้อเสนอที่ใช้รูปแบบเดียวกับ registry `src/game/visuals/unit-frames.ts` (เช่น `lalin`)

## กล่อง prompt สำหรับ Codex (คัดลอกทั้งกล่อง)

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A12-001 (art only)
Asterveil · Fateweave: battle body animation strips for the three new classes — Kael (id kael, Martial, front row), Wynne (id wynne, Hexer, back row), Astrid (id astrid, Seer, back row)

Read AGENTS.md, CLAUDE.md, docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md, docs/design/ROSTER_30_TH.md (Martial/Hexer/Seer sections) and incoming/ART-CHAR-CLASS-NEW-002/NOTES.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype (not main). Create branch art/art-unit-animation-a12-001. Add files only under incoming/ART-UNIT-ANIMATION-A12-001/. Do not change src/, tests/, public/, .github/, existing art or earlier incoming folders. Open a PR into the base branch; do not merge. Original artwork only; nothing from Asterveil: Rise Beyond. The group is the ค่ายทหารรับจ้าง; never use the word ม่านเวล.

SEEDS (on the game branch; verify the hashes and copy byte-for-byte into seeds/):
- Kael:   incoming/ART-CHAR-CLASS-NEW-003/unit/kael.png (owner-approved proportion fix; take its sha256 from that package's validation.json). Do NOT use the NEW-002 kael.png — its head is too small. If NEW-003 is not on the branch yet, skip Kael, do Wynne and Astrid, and list Kael as pending in NOTES.md.
- Wynne:  incoming/ART-CHAR-CLASS-NEW-002/unit/wynne.png  sha256 b2888ab61fcb39fc5e4fc508c0a6695efae1c74224c5460d32f724a24fa091e6
- Astrid: incoming/ART-CHAR-CLASS-NEW-002/unit/astrid.png sha256 a2d2ac7833818ff62cc877ecd0e90e87f24d8f56365f57e6c32d9321b36f1b29
512×512 RGBA, facing right, sole on y496 (logical ground y497, pivot (0.5, 497/512)). Every frame keeps that exact face, hair, costume, props and the SAME head size relative to the body as the seed, including crouched, spinning and fallen frames (a lying body is as long as the standing seed). Use the matching portrait/ and weapon/ cells of the same package only as identity reference. Do NOT give the generator Corin (metta), Odran (thiran) or any other cast member as image input.

FRAME RULES (same as A7-003, so integration only fills the registry): actions 6 frames, chronological: frame 1 = ready (seed pose), 2–3 prepare, 4 = contact/release, 5 follow-through, 6 = back to ready. Reactions 4 frames, frame 1 = ready. down ends lying unconscious and holds (does not get up). Preview timing weights: actions 1, 1.2, .75, 1, .8, 1; reactions .8, 1, .9, 1. Allies stand to the screen LEFT, foes to the screen RIGHT.

Kael — calm, controlled open-palm martial artist with a low wide stance (no weapon). Power comes from the legs and hips; he never flails. Distinct from Corin's straight fist punches: Kael uses palms, forearms, knees and low turning steps.
1. attack (attack): ready → small step in, rear palm chambered at the hip → quick open-palm strike forward-right → arm extended, feet planted → draw back → ready
2. gather (gatherfist, flowfist — strike that builds inner energy): ready → front palm strike forward-right → contact → pull BOTH hands back to the hip in a closed, breathing posture (energy being drawn in) → settle lower → ready
3. release (releasefist, perfectfist — the big finisher that spends all energy): ready → sink deep, both palms drawn back low → explosive lunge with a double palm thrust forward-right, back leg fully extended → hold the extension → step back up → ready
4. circle (circlefist — hits the whole front row): ready → coil the torso left → pivot on the front foot and sweep the forearm in a wide horizontal arc across his front → full follow-through past centre → unwind → ready
5. stored (storedfist — heavy short blow that keeps the energy in): ready → shift weight to the back leg, fist tight at the ribs → short compact forward elbow/forearm blow from close range, almost no wind-up → solid hold, breath held → ease → ready
6. hit: ready → recoil, guard still up → slide back half a step → ready
7. block: ready → cross both forearms in front, knees bent → absorb low → reset guard
8. down: knees give way → one hand and knee to the ground → sink sideways → lie unconscious and hold

Wynne — quiet, careful doll-maker; small precise movements, always cradling the stitched doll. Her short crimson thread loop and the hanging talismans may swing as part of the costume; long magic thread lines, curse glows and particles are VFX and must NOT be painted.
1. attack (attack): ready → lift the doll slightly, free hand pinching the thread → flick the free hand forward-right, the short thread loop snapping out → hand extended → draw the hand back to the doll → ready
2. knot (threadhex, knothex, longthread — tie a curse on one foe): ready → hold the doll up at chest height → free hand pulls the thread taut sideways → tie/pinch a knot with a sharp tug toward the screen right → hold the pinch → lower → ready
3. toll (lifetoll — a toll tag bound to a foe who pays when acting): ready → take one hanging talisman from her side → hold it up between two fingers → press it forward-right toward the foe at arm's length → hold → return the hand → ready
4. weave (wovenhex, tollring — threads across several foes): ready → step back, doll pulled in → open the free arm wide, half turn → sweep the free hand in a wide arc across the right side (weaving motion) → finish the arc → ready
5. hit: ready → flinch, curling around the doll to protect it → catch balance → ready
6. block: ready → turn the shoulder in, doll shielded behind her → brace → reset
7. down: knees give way → still holding the doll → sink → lie unconscious holding the doll and hold

Astrid — composed star-chart maker; graceful, deliberate hand gestures. The astrolabe ring set stays at or near her right hand (never orbiting the whole body). Ring glows, star trails and lines between units are VFX and must NOT be painted.
1. attack (attack, starneedle — a precise star-needle bolt): ready → raise two fingers of the free hand to eye level → straight precise point forward-right → arm fully extended and still → lower → ready
2. deflect (deflectfate, crossing — bend a foe's move onto another foe): ready → raise the open palm toward the screen right → push it outward then sweep it sideways and down, as if turning a line aside → hold the turned palm → recover → ready
3. dial (turncycle, doubledial — turn the foe's move cycle): ready → bring the astrolabe up in front of the chest → turn the rings with the other hand (one clear rotation gesture) → rings held turned, gaze on the foes → lower → ready
4. read (readorbit — reveal the next marks): ready → lift the astrolabe to eye level → look through it toward the screen right, slight lean → hold the reading pose → lower → ready
5. hit: ready → recoil, astrolabe pulled to the chest → catch balance → ready
6. block: ready → mantle raised across the body with the free arm → brace → reset
7. down: knees give way → astrolabe held close → sink → lie unconscious and hold

GENERATION: one whole continuous strip per move in a single edit request (never frame by frame), the seed attached as the model, transparent background, wide clear gutters between figures. One shared scale per character across all strips, equal to the seed; feet on the same ground line except intended airborne frames. Body only: no VFX, glows, energy, particles, motion lines, shadows or text baked in. Leave room for full arms, sash tails, hood tips, talismans, doll and astrolabe; never crop them. Work in small batches in this order: Wynne (7 strips) → Astrid (7) → Kael (8, only once NEW-003 is available); finish and audit one character before starting the next.

QUALITY GATE before delivery: run python3 scripts/unit-anatomy-audit.py --cells on every strip against its seed (median head scale <= 1.15, every measured frame <= 1.20; inspect not-measured frames by eye and say so in NOTES.md). Do not deliver a failing strip as final; regenerate it or list it as missing. Supply R2 only where a move is genuinely ambiguous (likely candidates: Kael stored, Wynne weave, Astrid deflect), and mark the recommended one.

DELIVERABLES (same layout as incoming/ART-UNIT-ANIMATION-A7-002): seeds/ + seeds.json, raw/ (untouched generator strips), spaced/ and cells/<character>-<move>/000.png (seed) + 001…, <character>-preview-390.png comparing every frame with the seed at one scale, audits/ (audit JSON + stdout), prompts.json (exact prompts, references, generation ids — no base64 image data in JSON), strips.json (move → frames, slot order above, shared scale, offsets, the proposed ActionId mapping), validation.json + SHA256SUMS, NOTES.md (Claude handoff), build_handoff.py, verify_remote.py.

PROPOSED RUNTIME MAPPING (for strips.json; final mapping is Claude's when the classes land in code):
- kael:   attack→attack; gatherfist, flowfist→gather; releasefist, perfectfist→release; circlefist→circle; storedfist→stored
- wynne:  attack→attack; threadhex, knothex, longthread→knot; lifetoll→toll; wovenhex, tollring→weave
- astrid: attack, starneedle→attack; deflectfate, crossing→deflect; turncycle, doubledial→dial; readorbit→read

Push with normal git, fetch back, verify every SHA-256 and decode every image with Pillow (PR #90 was once truncated near 768 KB). Owner artwork selection and later in-game motion approval are required; offline checks and CI are not approval. No merge, no runtime integration, no rules/content/save/balance changes (the three classes are not in the game code yet; Claude packs the atlases and captures real 390px clips when they are added).
```
