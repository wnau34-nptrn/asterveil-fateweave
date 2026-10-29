# Prompt Codex ที่เหลือ — W6, W7, W8 (ฉบับ copy-ready ครบในตัว)

เตรียม 2026-10-29 หลัง W3 เข้าเกมแล้ว (PR #102) ปรับจาก [CODEX-ANIMATION-VFX-PROMPTS-TH.md](CODEX-ANIMATION-VFX-PROMPTS-TH.md) ให้แต่ละ prompt อ่านจบในตัว (ไม่อ้าง “as A5”) และเพิ่มบทเรียนจากการนำ A3–A5 เข้าเกม ชื่อท่า/ID/seed ตรวจกับโค้ดจริงแล้ว (`species.ts`, `encounters/`, `assets.ts`)

**ที่ยังไม่ต้องส่ง:** W4 (#94/#96) และ W5 (#97/#98) Codex ส่งภาพแล้ว รอเจ้าของเลือก R1/R2 — ไม่ใช่ prompt ใหม่ **ส่งทีละระลอก** (W6 → W7 → W8) ตามลำดับแผน เพื่อใช้ feedback ของเจ้าของ

## ส่วนร่วม (วางไว้ต้นทุก prompt)

```text
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype (NOT main). Create branch art/<id> named below. Put files only under incoming/<ID>/. Do not change src/, tests/, public/, .github/ or existing art. Open a PR; do not merge. Original artwork only; nothing from Asterveil: Rise Beyond. Push with normal git, then fetch the pushed branch and verify the SHA-256 of every file against validation.json and decode every PNG with Pillow (an earlier package was truncated at ~768 KB on push). The owner chooses the artwork and approves motion; CI/tests are not approval.

BODY ANIMATION RULES (unit packages)
- Seed = the unit's shipped sprite, cut from the atlas cell named below (cell = 512x512, zero-based, in public/assets/art/<sheet>.webp). Keep face/body/outfit/equipment/proportions, facing and the sole line (y~497 in the cell) identical in every frame. Keep the exact seed as the idle frame.
- One horizontal strip per move, generated as a whole (never frame by frame). Moves: 6 frames = ready -> wind-up -> deeper wind-up/anticipation -> contact -> follow-through -> recover to ready. Reactions (hit, block, down) = 4 frames, down ends in a grounded hold and never stands up again.
- Same body size in every frame and every strip, close to the seed (earlier packages drifted 0.44-1.07x between strips; do not start a strip with a folded/atypical pose that sets a different scale). Weapons/tools that extend below the feet are fine, but keep the feet on the same line in every frame.
- Wide transparent gutters between figures (>=48 px clear), real alpha (no checkerboard), nothing clipped at the edge (leave room for weapons, hair, wings, tails). Left-facing foes stay left-facing; airborne/floating poses keep their real height (do not bottom-align them).
- No projectiles, light bursts, floor rings, dust or other VFX in the body strips; those belong to the VFX packages.
- When a move can be read more than one way, deliver R1 and R2 and mark the recommended one.
- Deliver, like incoming/ART-UNIT-ANIMATION-A5-001/: seeds/, templates/, source-sheets/ (untouched generator outputs), raw/ (one transparent PNG per strip), preview-390.png, prompts.json, seeds.json, strips.json (file, move, revision, frame order, sha256, suggested intents), validation.json, NOTES.md (frame order of every strip, preferred candidates, concerns) and a reproducible build_handoff.py.

VFX RULES (VFX packages)
- Transparent straight-RGBA 256x256 layers, three beats per move: prepare (on the caster), peak (one or two independent components), settle. Pivots/anchors in layers.json (caster chest/hand, target chest/feet, whole side). Suggested timing per beat. 390px-wide storyboards, readable at 390px, never covering faces or HP labels, no real letters/symbols, no floor ellipses or leg auras unless the move is truly a ground effect. Provide R1 and R2 and mark the recommended one. Follow incoming/ART-VFX-COMMAND-001/ for the file layout.
```

## W6-a. ART-UNIT-ANIMATION-A8-001

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A8-001 (art only). Branch art/art-unit-animation-a8-001. Folder incoming/ART-UNIT-ANIMATION-A8-001/.
[paste the shared block above]

Seeds (all face LEFT, sole y~497):
- Shard Golem `foe_golem` — public/assets/art/units_foes.webp cell 4 (also the map-3 boss body; large): moves = Crystal Fist and Stone Fist (one punch strip, wind-up -> punch), Veil Quake (overhead slam to the ground), hit, down.
- Rift Channeler `foe_rift_channeler` — units_foes2.webp cell 6 (large): Rift Bolt (gather energy at the hands -> release pose -> recover), hit, down.
- Rift Wisp `foe_rift_wisp` — units_foes2.webp cell 7 (floating): hover loop of 4 frames (last returns to the first), Star Flame (gather -> cast), hit, down as a fade/sink.
- Shard Crawler `foe_shard_crawler` — units_foes2.webp cell 8: Crystal Stab (raise legs -> stab -> return), hit, down.
Deliver R1 plus R2 for Veil Quake and Star Flame.
```

## W6-b. ART-VFX-FOE-SIGNATURE-001

```text
CODEX HANDOFF — ART-VFX-FOE-SIGNATURE-001 (art only). Branch art/art-vfx-foe-signature-001. Folder incoming/ART-VFX-FOE-SIGNATURE-001/.
[paste the shared block above]

The caster is a FOE on the left-facing enemy side (right of the screen) and the target is a hero, so peaks travel toward the LEFT and impact on a hero's chest; never cover hero faces or HP labels. These energy moves currently share one generic Bolt look; give each a recognisable signature that still reads as "energy" (players block it with Ward). Moves: Seed Spark (dandelion seeds, pale yellow), Ember Spark (ember spit, orange), Spore Hex (teal spore curse cloud), Spore Dust (soft spore puff), Star Flame (small violet-white star fire), Rune Lash (thread whip of runes), Rift Needle (thin dark rift needle), Shard Burst (cyan crystal shards burst), Rift Bolt as used by foes (dark rift bolt clearly different from the hero Mage's bolt). One physical ground move: Veil Quake (crack wave along the ground toward the heroes; floor effect allowed here only).
```

## W7-a. ART-UNIT-ANIMATION-A9-001

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A9-001 (art only). Branch art/art-unit-animation-a9-001. Folder incoming/ART-UNIT-ANIMATION-A9-001/ (one subfolder per boss).
[paste the shared block above]

Large LEFT-facing boss bodies in public/assets/art/units_foes.webp. Bosses announce heavy moves a turn ahead, so each needs a clear charge/telegraph pose that can be held while the boss waits.
- Thorn Matriarch / Briar Lord `foe_matriarch` — cell 6: Briar Lash (whip), Gather Thorns (charge pose), Thorn Bloom + Thorn Storm + Thorn Tempest (one cast strip; Tempest is the bigger variant), Thorn Rage (phase-change roar), hit, down.
- Crystal Juggernaut `foe_juggernaut` — cell 7: Horn Charge (lower horns, charge), Shard Burst (release), hit, down.
- Rift Warden / Sentinel `foe_sentinel` — cell 8: Raking Slash, Crushing Blow, Rift Bolt and Rift Wave (energy cast), Rift Gathering (charge/telegraph), Rift Cataclysm (slam), Rift Awakening (phase awakening), Call the Rift (summon gesture), hit, down.
- Vanguard Captain `foe_captain` — cell 10: Crushing Blow, War Cry (roar), Call the Hunt (summon gesture), hit, down.
Deliver R1 plus R2 for each boss's signature move (Thorn Tempest, Horn Charge, Rift Cataclysm, War Cry).
```

## W7-b. ART-VFX-BOSS-SIGNATURE-001

```text
CODEX HANDOFF — ART-VFX-BOSS-SIGNATURE-001 (art only). Branch art/art-vfx-boss-signature-001. Folder incoming/ART-VFX-BOSS-SIGNATURE-001/.
[paste the shared block above]

The caster is a boss on the enemy side. Bosses use "charge" (announced a turn ahead), "unstoppable" (cannot be interrupted) and "all" (hits every hero) moves. Each charge needs a telegraph layer that can sit on the boss during the waiting turn (it must not hide the boss's face or HP), then the release. Unstoppable telegraphs must look clearly different from normal charges so players know interrupting will not work. Moves: Matriarch — Gather Thorns (charge telegraph), Thorn Bloom, Thorn Storm (unstoppable), Thorn Tempest (all + unstoppable), Thorn Rage (phase change). Sentinel — Rift Gathering (charge telegraph), Rift Wave (all), Rift Cataclysm (unstoppable), Rift Awakening (phase change), Call the Rift (summon portal). Captain — War Cry (unstoppable shout), Call the Hunt (summon signal). Juggernaut/Tusker — Horn Charge, Stampede (charge dust trail and impact).
```

## W8. ART-UNIT-ANIMATION-A10-001

```text
CODEX HANDOFF — ART-UNIT-ANIMATION-A10-001 (art only). Branch art/art-unit-animation-a10-001. Folder incoming/ART-UNIT-ANIMATION-A10-001/.
[paste the shared block above]

Legacy foes of the original encounters (LEFT-facing, public/assets/art/units.webp): 
- Veil Raider `raider` — cell 4: Raking Slash, Shadow Knife (knife-throw pose), hit, block, down.
- Rift Brute `brute` — cell 5: Crushing Blow, Rift Bolt (energy release), hit, block, down.
```

## หลังส่ง

ตามบทเรียน A3–A5: Claude ตรวจ sha256 ก่อนใช้ เลือกตาม feedback เจ้าของ นำเข้าตาม skill `fateweave-art-intake` และทำคลิป 390px ให้เจ้าของดู motion ก่อน merge; งบภาพสนาม 10 ตัว (OD-05) วัดรวมหลัง P02
