# Prompt สำหรับ Codex — แอนิเมชันตัวละครและ VFX ระลอก W1–W8

เตรียม 2026-10-28 ตาม [แผน W1–W8](../design/ANIMATION_VFX_COMPLETION_PLAN_TH.md) ท่าทุกตัวในเอกสารนี้ตรวจจากโค้ดจริงบน game branch (`src/content/heroes/talents.ts`, `src/content/enemies/species.ts`, `src/content/encounters/`) Codex ทำภาพเท่านั้น ส่วนการนำเข้าเกมเป็นของ Claude

## ลำดับส่ง

| ลำดับ | Prompt | สถานะ |
|---|---|---|
| 0 | แก้ PR #90 ไฟล์เสีย | **ส่งทันที** |
| W1 | A3 เซเรน+เห็ดหมอผี, VFX ผนึกอาคม | ส่งแล้ว (PR #90, #89) |
| W2 | A4 มิร่า+โทมะ+สไลม์+ค้างคาว | ส่งแล้ว (PR #91) |
| W3 | A5 + VFX คำท้า | ส่งได้ทันที (สายพาน) |
| W4 | A6 + VFX บทเพลง/เงา | ส่งหลังเจ้าของเลือกภาพ W2/W3 แล้ว เพื่อนำ feedback ไปใช้ |
| W5 | A7 นักบุญรบ/นักเต้นรำ + VFX แสงนักบุญ/ระบำ | ตามลำดับ |
| W6 | A8 ศัตรูผลึก/รอยแยก + VFX ท่าศัตรู | ตามลำดับ |
| W7 | A9 บอส + VFX ท่าบอส | ตามลำดับ |
| W8 | A10 Raider/Brute ชุดเดิม | ตามลำดับ |

ส่งทีละระลอกดีกว่าส่งทั้งหมดพร้อมกัน เพราะ feedback ของเจ้าของในระลอกก่อน (ขนาด เส้น แสง) ควรถูกนำไปใช้ในระลอกถัดไป

## กติการ่วม (อยู่ในทุก prompt แล้ว)

- อ่าน AGENTS.md และ CLAUDE.md ก่อน; base `feature/fateweave-initial-prototype`; branch `art/<id-ตัวเล็ก>`; ไฟล์เฉพาะใน `incoming/<ID>/`; ห้ามแตะ `src/ tests/ public/ .github/` และภาพเดิม; เปิด PR ห้าม merge
- ภาพต้นฉบับเท่านั้น ห้ามนำจาก Asterveil: Rise Beyond
- **push ด้วย git ปกติ แล้วตรวจ SHA-256 ของทุกไฟล์บน branch เทียบ validation.json หลัง push** (PR #90 ไฟล์ถูกตัดที่ ~768 KB)
- แอนิเมชัน: seed = ภาพตัวละครในเกมปัจจุบัน (หาตำแหน่งจาก `src/game/visuals/assets.ts`), หนึ่ง strip ต่อท่าทั้งแถว 6–8 เฟรม (รับผล 3–4 เฟรม) เตรียม → ปล่อย → ตามแรง → คืนท่า, หน้า/ชุด/อาวุธ/สัดส่วน/ทิศหัน/แนวเท้าเหมือน seed ทุกเฟรม, เว้นช่องโปร่งใสระหว่างตัวกว้างพอ, ไม่วาดกระสุน/แสงใหญ่ที่เป็นงาน VFX; รูปแบบ package ตาม `incoming/ART-UNIT-ANIMATION-A4-001/`
- VFX: ภาพชั้นโปร่งใส 256×256 สามจังหวะ (เตรียมที่ผู้ร่าย / พีค / จบ) ต่อท่า, แผ่น storyboard กว้าง 390px, อ่านได้ที่ 390px, ไม่บังหน้าตัวละครและป้าย HP, ไม่มีตัวอักษร/สัญลักษณ์จริง; รูปแบบตาม `incoming/ART-VFX-ARCANE-SEAL-001/`; ระบุ anchor (มือผู้ร่าย / กลางตัวเป้า / เท้าเป้า / ทั้งฝั่ง) และเวลาเสนอต่อจังหวะ
- ส่ง R1 และ R2 เมื่อท่าตีความได้หลายแบบ ทำเครื่องหมายตัวที่แนะนำ; บันทึกลำดับเฟรม ข้อกังวล และ handoff ใน NOTES.md ของ package

---

## 0. แก้ PR #90 (ส่งทันที)

```text
PR #90 (art/art-unit-animation-a3-001): PNG 13 files are truncated at 786,444–786,445 bytes and cannot be decoded; their SHA-256 do not match your validation.json. Affected: all 12 files in incoming/ART-UNIT-ANIMATION-A3-001/raw/ and preview/seren-all-390.png. Smaller files are fine.
Re-push the original, untruncated files to the same branch with normal git (not a size-limited upload path). After pushing, fetch the branch and verify every file's SHA-256 against validation.json and that each PNG decodes with Pillow; record the check in NOTES.md. Do not change the artwork, other files, or anything outside incoming/ART-UNIT-ANIMATION-A3-001/. Do not merge.
```

## W3-a. ART-UNIT-ANIMATION-A5-001 — การ์แรน + แบรนน์; หมูป่า + ลิงซ์ + ด้วงหนาม

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A5-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-unit-animation-a5-001. Files only under incoming/ART-UNIT-ANIMATION-A5-001/ (split heroes/ and foes/). Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only; nothing from Asterveil: Rise Beyond. Push with normal git and verify every file's SHA-256 on the branch against validation.json after pushing.

Package format as incoming/ART-UNIT-ANIMATION-A4-001/. Seed = current in-game art (src/game/visuals/assets.ts); keep face, outfit, weapon, proportions, facing and sole line identical. One whole strip per body set, 6–8 frames (prepare → release → follow-through → recover); reactions 3–4 frames. Leave wide transparent gutters. No projectiles, auras, floor rings or big light — those are existing/next VFX.

Garran (`garran`, Spear, front):
1. spear thrust (attack, pierce, halt)
2. braced stance: spear planted forward, low guard (brace, spearwall, hold)
3. war cry: spear raised, shout pose (warcry)
4. reactions: hit, block, down
Brann (`brann`, Warden, front, heavy hammer):
1. hammer swing (attack, slam)
2. overhead ground slam (quake, tremor)
3. taunt/challenge: hammer planted, chest out, beckon (taunt)
4. stone brace: hammer across body, low crouch (stonearmor, guardstone)
5. reactions: hit, block, down
Mossback Tusker (`foe_tusker`): paw/lower head → charge → impact → recover (Tusk Charge); bigger wind-up variant for Stampede; hit, down.
Briar Stalker (`foe_stalker`): crouch → pounce → claw → land back (Thorn Pounce); hit, down.
Thorn Beetle (`foe_thorn_beetle`): rear up → bite → retract under shell (Thorn Bite); hit, down.

RETURN: seeds, raw strips (transparent PNG, one per strip), 390px review sheet, prompts.json, strips.json, validation.json, NOTES.md with frame order, preferred candidates and concerns. R1, plus R2 where a move is ambiguous.
```

## W3-b. ART-VFX-COMMAND-001 — VFX คำท้า (C5.9 ส่วนแรก)

```text
CODEX HANDOFF — ART-VFX-COMMAND-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-vfx-command-001. Files only under incoming/ART-VFX-COMMAND-001/. Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Painted transparent layers, format as incoming/ART-VFX-ARCANE-SEAL-001/ (256×256 per layer, 3 beats: prepare at caster / peak / settle, 390px storyboard, anchors and suggested timing). Palette consistent with public/assets/fx/*. No text or real-world symbols; never cover faces or HP labels.
- taunt (Brann, Warden, self; enemies now target him): a heavy rune-pulse from his chest that rolls toward the enemy side, ending as a brief glowing mark on Brann. Stone grey/amber.
- challenge (Aegis, Knight, self; single duel focus): a sharp gold-white shield crest flash in front of Aegis, a thin line toward the foe side, settle as a small crest above the shield. Gold/ivory.
- warcry (Garran, Spear; hits the enemy side — check src/content/encounters/veil-siege.ts for its actual targets): a shout shockwave cone from Garran toward the foe side, one compact impact flash per affected foe. Ivory/teal.
Keep the three visually distinct from each other and from the existing defense family (low leg auras, floor rings). Provide R1 and R2.

RETURN: layers per move and beat, R1/R2 storyboards at 390px, source sheets, generation prompts, layers.json with hashes and pivots, NOTES.md with anchors and timing.
```

## W4-a. ART-UNIT-ANIMATION-A6-001 — เซฟา + ลิโอ; ผู้ทอรอยแยก + ภูตสปอร์

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A6-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-unit-animation-a6-001. Files only under incoming/ART-UNIT-ANIMATION-A6-001/ (heroes/, foes/). Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only; nothing from Asterveil: Rise Beyond. Push with normal git and verify SHA-256 after pushing.

Same format and rules as ART-UNIT-ANIMATION-A5-001 (seed identity, whole strips 6–8 frames, reactions 3–4, wide gutters, no VFX painted into bodies).

Sefa (`sefa`, Scout, front, daggers):
1. quick double slash (attack, ambush)
2. lunge stab from behind/low (backstab, disarm)
3. throwing motion, release of knives (knives) — knives themselves are existing projectile VFX
4. backstep evade with afterimage-free body (evade, decoy)
5. reactions: hit, block, down
Lio (`lio`, Bard, back, string instrument):
1. strum strike: instrument swung or sharp strum toward foe (attack, note)
2. sustained song: playing upright, swaying (valor, mend, solo)
3. dread chord: hunched, hard downward strum (dread)
4. finale: big flourish, instrument raised high (finale)
5. reactions: hit, block, down
Rift Weaver (`foe_riftweaver`, back): cast thread whip (Rune Lash), needle flick (Rift Needle), ribbon throw (Ribbon Snare, physical); hit, down.
Spore Puff (`foe_spore_puff`, back): inflate → release puff → deflate (Spore Dust); hit, down.

RETURN: as A5 (seeds, raw strips, 390px sheet, prompts/strips/validation json, NOTES.md). R1 plus R2 where ambiguous.
```

## W4-b. ART-VFX-SONG-SHADOW-001 — VFX บทเพลง (C5.8) + เงา (C5.9 ส่วนสอง)

```text
CODEX HANDOFF — ART-VFX-SONG-SHADOW-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-vfx-song-shadow-001. Files only under incoming/ART-VFX-SONG-SHADOW-001/ (song/, shadow/). Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Format as ART-VFX-ARCANE-SEAL-001 (3 beats, 256px layers, 390px storyboard, anchors, timing). No musical notation symbols copied from real scores; use original abstract note-like shapes. Never cover faces/HP labels.
Songs (Lio, Bard; coral/warm gold palette):
- valor (self song, team buff): rising warm rings from Lio, small sparks drifting to allies.
- finale (closing burst, damage to foes): gathered song ribbons released as one wave to the enemy side, one impact per affected foe.
- dread (damage + fear-like debuff on one foe): dark violet-coral discordant wave to one target, settle as a small tremor mark.
- note (single sharp hit): one bright note-blade flying to one target, small impact.
- solo (self, no damage): spotlight-like column on Lio, gentle and short.
Shadow (Sefa, Scout; steel blue/slate palette):
- evade (self dodge-ready stance): thin smoke wisps at feet, brief shimmer.
- decoy (self/guard illusion): a translucent shadow silhouette appears beside Sefa, then fades.
Provide R1 and R2 for songs; shadow may be R1 only if unambiguous.

RETURN: layers, storyboards (R1/R2) at 390px, sources, prompts, layers.json, NOTES.md.
```

## W5-a. ART-UNIT-ANIMATION-A7-001 — เมตตา + ธีรัน; ลลิน + วิลา

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A7-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-unit-animation-a7-001. Files only under incoming/ART-UNIT-ANIMATION-A7-001/ (saints/, dancers/). Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Same format and rules as A5. Two characters per class share the move list but each keeps their own personality in pose and timing — do not reuse one character's frames for the other. Read docs/design/ROSTER_30_TH.md for each character's personality.
Metta (`metta`) and Thiran (`thiran`), Saint, front, martial fists that turn damage into allied healing:
1. punch (attack, saintstrike, vowstrike)
2. sweeping arc strike across the front (saintarc)
3. palm-open share/communion gesture toward an ally (communion, sharewound)
4. last-light finisher: gathered stance → heavy strike (lastlight)
5. reactions: hit, block, down
Lalin (`lalin`) and Wila (`wila`), Dancer, back, restore allies' readiness:
1. dance strike (attack)
2. single-partner turn toward an ally (cadence, duet, deepbeat)
3. circle dance spin for the group (rounddance)
4. echo step / closing step flourish (echofoot, closingstep)
5. reactions: hit, block, down

RETURN: as A5, one folder per character. R1 plus R2 where ambiguous.
```

## W5-b. ART-VFX-SAINT-DANCE-001 — VFX แสงนักบุญ (C5.10) + ระบำ (C5.11)

```text
CODEX HANDOFF — ART-VFX-SAINT-DANCE-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-vfx-saint-dance-001. Files only under incoming/ART-VFX-SAINT-DANCE-001/ (saint/, dance/). Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Format as ART-VFX-ARCANE-SEAL-001. Keep distinct from the existing healing family (mint light) — Saint uses warm gold/ivory with a visible link from the struck foe to the healed ally; Dance uses rose/pink ribbons and petals.
Saint (Metta/Thiran): saintstrike (gold impact on foe + small light thread to the healed ally), communion (shared glow between two allies), saintarc (arc slash across the front row, one impact per foe), vowstrike (heavier gold impact with a vow seal), sharewound (split light between caster and ally), lastlight (big but brief gold burst on one foe, then fading thread to allies).
Dance (Lalin/Wila; no damage except echofoot): cadence (ribbon swirl to one ally showing cooldown restored), duet (two ribbons linking caster and ally), rounddance (petal circle around the whole team), deepbeat (pulse ring at an ally's feet), echofoot (step echo travelling to one foe, small impact), closingstep (closing flourish bloom on caster).
Provide R1 and R2.

RETURN: layers, storyboards at 390px, sources, prompts, layers.json, NOTES.md.
```

## W6-a. ART-UNIT-ANIMATION-A8-001 — โกเลมเศษผลึก + อสูรส่งพลัง; วิญญาณรอยแยก + แมงมุมเศษผลึก

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A8-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-unit-animation-a8-001. Files only under incoming/ART-UNIT-ANIMATION-A8-001/. Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Same format and rules as A5. These foes face left. Large units must stay inside their larger canvas.
Shard Golem / Veil Golem (`foe_golem`, also the map-3 boss body): wind-up → punch (Crystal Fist, Stone Fist); overhead slam to ground (Veil Quake); hit, down.
Rift Channeler (`foe_rift_channeler`, large): gather energy at hands → release beam pose → recover (Rift Bolt); hit, down.
Rift Wisp (`foe_rift_wisp`, floating): hover loop 4 frames; gather → cast (Star Flame); hit, fade-down.
Shard Crawler (`foe_shard_crawler`): raise legs → stab → return (Crystal Stab); hit, down.

RETURN: as A5. R1 plus R2 where ambiguous.
```

## W6-b. ART-VFX-FOE-SIGNATURE-001 — VFX ท่าศัตรูทั่วไป (C5.12a)

```text
CODEX HANDOFF — ART-VFX-FOE-SIGNATURE-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-vfx-foe-signature-001. Files only under incoming/ART-VFX-FOE-SIGNATURE-001/. Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Format as ART-VFX-ARCANE-SEAL-001, but the caster is a FOE on the left-facing enemy side and the target is a hero. Energy moves currently share the Bolt effect; give each a recognisable signature while staying readable as "energy" (blockable by Ward). Never cover hero faces/HP labels.
Energy: Seed Spark (dandelion seeds, pale yellow), Ember Spark (ember spit, orange), Spore Hex (teal spore curse cloud), Spore Dust (soft spore puff), Star Flame (small star fire, violet-white), Rune Lash (thread whip of runes), Rift Needle (thin rift needle), Shard Burst (crystal shards burst, cyan), Rift Bolt for foes (dark rift bolt distinct from the hero Mage bolt).
Physical with ground effect: Veil Quake (ground crack wave toward heroes).
Provide R1 and R2.

RETURN: layers, storyboards, sources, prompts, layers.json, NOTES.md.
```

## W7-a. ART-UNIT-ANIMATION-A9-001 — บอส 4 ตัว

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A9-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-unit-animation-a9-001. Files only under incoming/ART-UNIT-ANIMATION-A9-001/ (one folder per boss). Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Same format and rules as A5. These are large, left-facing boss bodies; each boss also needs a readable charge/telegraph pose because bosses announce heavy moves a turn ahead.
Thorn Matriarch / Briar Lord (`foe_matriarch`): whip lash (Briar Lash); charge pose gathering thorns (Gather Thorns); casting bloom (Thorn Bloom, Thorn Storm, Thorn Tempest — one cast set, bigger variant for Tempest); phase-change rage roar (Thorn Rage); hit, down.
Crystal Juggernaut (`foe_juggernaut`): lower horns → charge (Horn Charge); shard release (Shard Burst); hit, down.
Rift Warden / Sentinel (`foe_sentinel`): slash (Raking Slash); heavy blow (Crushing Blow); energy cast (Rift Bolt, Rift Wave); charge/gather telegraph (Rift Gathering); cataclysm slam (Rift Cataclysm); phase awakening (Rift Awakening); summon gesture (Call the Rift); hit, down.
Vanguard Captain (`foe_captain`): heavy blow (Crushing Blow); war cry roar (War Cry); summon/call gesture (Call the Hunt); hit, down.

RETURN: as A5. R1 plus R2 for each boss's signature move.
```

## W7-b. ART-VFX-BOSS-SIGNATURE-001 — VFX ท่าบอส (C5.12b)

```text
CODEX HANDOFF — ART-VFX-BOSS-SIGNATURE-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-vfx-boss-signature-001. Files only under incoming/ART-VFX-BOSS-SIGNATURE-001/. Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Format as ART-VFX-ARCANE-SEAL-001; caster is a boss on the enemy side. Bosses use "charge" (announced a turn ahead), "unstoppable" (cannot be interrupted) and "all" (hits every hero) moves — each needs a clear telegraph layer that can sit on the boss during the waiting turn, plus the release.
Matriarch: Gather Thorns (charge telegraph), Thorn Bloom, Thorn Storm (unstoppable), Thorn Tempest (all + unstoppable), Thorn Rage (phase change).
Sentinel: Rift Gathering (charge telegraph), Rift Wave (all), Rift Cataclysm (unstoppable), Rift Awakening (phase change), Call the Rift (summon portal).
Captain: War Cry (unstoppable energy shout), Call the Hunt (summon signal).
Juggernaut/Tusker: Horn Charge, Stampede (charge dust trail and impact).
Unstoppable telegraphs must look different from normal charges so players know interrupting will not work. Provide R1 and R2.

RETURN: layers, storyboards, sources, prompts, layers.json, NOTES.md.
```

## W8. ART-UNIT-ANIMATION-A10-001 — Raider + Brute ชุดเดิม

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A10-001 (art only)
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-unit-animation-a10-001. Files only under incoming/ART-UNIT-ANIMATION-A10-001/. Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only. Push with normal git and verify SHA-256 after pushing.

Same format and rules as A5. Legacy foes used in the original encounters; bring them to the same quality as the rest.
Veil Raider (`raider`): slash (Raking Slash); knife throw pose (Shadow Knife); hit, block, down.
Rift Brute (`brute`): heavy blow (Crushing Blow); energy release (Rift Bolt); hit, block, down.

RETURN: as A5.
```
