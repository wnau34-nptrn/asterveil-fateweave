# ART-UNIT-ANIMATION-A5-001 — art handoff

2026-10-28 (Asia/Bangkok). Branch `art/art-unit-animation-a5-001`; target `feature/fateweave-initial-prototype`; pinned seed/base commit `8616ad3155a179e05210fe6aa552e6d234c9bd24`.

Five exact shipped seeds; **26 transparent raw candidate strips / 134 figures**, covering **23 preferred moves/reactions**. Actions have six frames, except Stampede R2 with eight; all reactions have four. R2 alternatives cover Garran war cry, Brann taunt and Tusker Stampede. Owner selection remains pending. This is artwork for review; leave the PR unmerged. Claude handles runtime integration and motion review.

## Package and provenance

- `heroes/` and `foes/` each contain `seeds/`, `templates/`, `source-sheets/`, `raw/` and a 390px review sheet.
- `preview-390.png`: complete 390 × 7044 static review sheet; gold captions and `*` indicate preferred candidates. Frames read left to right, wrapping every three for review only. Each strip uses one shared review scale and vertical reference, so airborne and collapsed poses retain their height differences.
- `seeds.json`: pinned atlas blob, zero-based cell, exact RGBA crop and file/pixel SHA-256.
- `prompts.json`: all 13 exact submitted prompts, seed/reference canvas paths, original output paths, source sheet mappings, frame count and sequence descriptions. Whole strips were generated together in one edit per sheet, never one frame at a time.
- `strips.json`: one record per raw strip, preferred candidate, frame order, suggested routes/intents, source bounds, raw bounds, fixed slot width, exact source-to-raw translations and SHA-256. Routes/intents describe the request; they are not a runtime manifest.
- `validation.json`: full-file SHA-256, dimensions, transparency and provenance checks.
- `prepare_seeds.py`: recreates exact seed crops and reference canvases from the shipped atlases.
- `build_handoff.py`: reproducible extraction, gutter spacing, reviews and validation. Requires Pillow, NumPy and SciPy.

Only `incoming/ART-UNIT-ANIMATION-A5-001/` is added. No `src/`, `tests/`, `public/`, `.github/`, existing art or shared handoff document is changed. This NOTES file carries the Claude handoff because the owner's incoming-only boundary supersedes the usual shared-doc updates. No Asterveil: Rise Beyond art, code or history was accessed or imported; these are original edits of this repository's five shipped character seeds.

## Exact seed mapping

| Identity | Shipped atlas / zero-based cell | Facing | Ground reference |
| --- | --- | --- | --- |
| Garran `garran` | `public/assets/art/units_mercs.webp` / 0 | right | y=497 in 512px cell |
| Brann `brann` | `public/assets/art/units_mercs.webp` / 4 | right | y=497 |
| Mossback Tusker `foe_tusker` | `public/assets/art/units_foes.webp` / 0 | left | y=497 |
| Briar Stalker `foe_stalker` | `public/assets/art/units_foes.webp` / 2 | left | y=497; pounce above this line |
| Thorn Beetle `foe_thorn_beetle` | `public/assets/art/units_foes2.webp` / 4 | left | y=497 |

Garran retains his shipped round shield as well as the spear. Brann retains the heavy two-headed hammer. Tusker retains its moss and flowers; Stalker its leaf/thorn mantle and curled tail; Beetle its olive/gold spined shell and turquoise nodules. Prompts lock face, outfit, equipment, proportions, facing and sole reference. The five seeds are byte/pixel-verified exact crops. Generated poses are raw candidates: they are **not** claimed to be pixel-identical copies of seed details or final normalized frames with an exact y=497 baseline. The supplied seed must remain the integration anchor.

## Preferred choices and concerns

- **Garran war cry: R2.** R1 loses the spear during frame 2. R2 keeps spear and shield visible through the preparation, high shout and recovery. R1 is comparison only.
- **Brann taunt: R2.** R1's hammer grip is unclear during the beckon. R2 keeps the planted hammer visible in frames 3–5, with a clearer free-hand challenge toward the right. Verify anatomical grip continuity and hammer head geometry/engraving against the seed during intake.
- **Tusker Stampede: R2.** Eight frames provide a longer paw/low-head/deep-crouch wind-up and two charging strides. R1 raises the head during anticipation and reads too similarly to Tusk Charge. Keep the low preparation; the painted body has no charge trail or dust.
- All other preferred candidates are R1. Garran spearwall is a low forward defensive spear guard, distinct from the active thrust; Brann stone brace keeps the hammer across the body and has no stone VFX. Beetle bite contact is frame 3, followed by shell retraction in frame 4; do not blindly map every action's release to frame 4.
- Face microfeatures, armor embroidery, hammer engraving, exact spear/shield grip and foe foliage patterns have small generated variations. Source scale and sole height also vary slightly across pose sets. Claude must use shared-scale normalization and exact seed endpoint/sole matching; never independently stretch each frame to standing height.
- Some source sheets have low-alpha matte haze and colored antialias fringes (especially visible on transparent viewers). Extraction removes distant low-alpha noise only; it retains near-silhouette RGBA unchanged, including remaining edge colors. Inspect edges on the actual battle background before motion approval. The full original source outputs are included unchanged.
- Stalker's claw/contact cue is smaller than its leap silhouette at 390px. Check it with the existing skill VFX and motion cadence. Preserve the airborne Y offset and landing, rather than bottom-aligning every pounce frame.
- No projectiles, floor rings, auras, large light, impact effects, dust or separate VFX layers are painted into the selected body strips. Existing/next VFX and all game timing remain untouched.

## Frame order — every strip

Each filename is relative to the package. All raw figures read **left to right in one row**. `preferred` is a recommendation, not owner approval. Down ends in a grounded hold; it never recovers to standing.

| File | Frames in order | Candidate |
| --- | --- | --- |
| `heroes/raw/brann-block-r1.png` | ready → hammer across torso → deep braced recoil → recover ready | preferred |
| `heroes/raw/brann-down-r1.png` | ready → knees buckle, hammer lowers → kneel and slump → unconscious side collapse, hammer beside body | preferred |
| `heroes/raw/brann-ground-slam-r1.png` | ready → lift hammer → hammer loaded overhead → downward ground contact → deep low follow-through → recover ready | preferred |
| `heroes/raw/brann-hammer-swing-r1.png` | ready → twist and draw hammer back → deep wind-up → horizontal swing right → low swing follow-through → recover ready | preferred |
| `heroes/raw/brann-hit-r1.png` | ready → upper body flinch left → deep recoil, hammer retained → recover ready | preferred |
| `heroes/raw/brann-stone-brace-r1.png` | ready → bend knees → hammer across chest → deep low defensive crouch → hold braced hammer → recover ready | preferred |
| `heroes/raw/brann-taunt-r1.png` | ready → lower hammer → plant hammer head → chest out, open beckon hand → curl beckon hand → recover ready | comparison only |
| `heroes/raw/brann-taunt-r2.png` | ready → lower hammer to ground → plant head, grip vertical shaft → chest out, free palm beckons → curl fingers toward himself → recover ready | preferred |
| `foes/raw/foe_stalker-down-r1.png` | ready → legs buckle, eyes close → lower onto side → unconscious side hold | preferred |
| `foes/raw/foe_stalker-hit-r1.png` | ready → head recoils right, eyes pinch → low crouched flinch → recover ready | preferred |
| `foes/raw/foe_stalker-thorn-pounce-r1.png` | ready → deep crouch → launch left → airborne forward claw contact → land back → recover ready | preferred |
| `foes/raw/foe_thorn_beetle-down-r1.png` | ready → legs buckle and eye closes → shell settles with legs folding → low unconscious prone hold | preferred |
| `foes/raw/foe_thorn_beetle-hit-r1.png` | ready → jolt right, legs flex → low crouch under shell → recover ready | preferred |
| `foes/raw/foe_thorn_beetle-thorn-bite-r1.png` | ready → rear up with mandibles open → forward bite contact → head retracts under shell → emerge → recover ready | preferred |
| `foes/raw/foe_tusker-down-r1.png` | ready → front legs buckle → roll onto side → unconscious side hold | preferred |
| `foes/raw/foe_tusker-hit-r1.png` | ready → head and shoulders flinch right → deep low recoil → recover ready | preferred |
| `foes/raw/foe_tusker-stampede-r1.png` | ready → deeper nose-down crouch → hindquarters rise, head also rises (weak R1 anticipation) → galloping charge left → braking stance → recover ready | comparison only |
| `foes/raw/foe_tusker-stampede-r2.png` | ready → nose down, shoulders sink → front hoof paws, head low → deepest coiled crouch → explosive charge contact left → second charging stride → brake and rise → recover ready | preferred |
| `foes/raw/foe_tusker-tusk-charge-r1.png` | ready → lower head, front hoof paws → compressed low charge preparation → forward charge contact left → brake and rise → recover ready | preferred |
| `heroes/raw/garran-block-r1.png` | ready → raise round shield → braced recoil behind shield → recover ready | preferred |
| `heroes/raw/garran-down-r1.png` | ready → knees buckle → collapse onto side with spear and shield → unconscious grounded hold | preferred |
| `heroes/raw/garran-hit-r1.png` | ready → head and shoulders flinch left → deep recoil, knees flex → recover ready | preferred |
| `heroes/raw/garran-spear-thrust-r1.png` | ready → draw spear back and flex knees → loaded shoulder, spear horizontal → forward thrust right → extended thrust follow-through → recover ready | preferred |
| `heroes/raw/garran-spearwall-r1.png` | ready → lower centre of gravity → rear foot plants, spear lowers → low forward spear guard → hold low spear guard → recover ready | preferred |
| `heroes/raw/garran-warcry-r1.png` | ready → chest expands; spear disappears (R1 defect) → spear rises upright → raised-spear shout → raised-spear follow-through → recover ready | comparison only |
| `heroes/raw/garran-warcry-r2.png` | ready, spear retained → chest expands, spear upright → raise spear → high spear open-mouth shout → high spear follow-through → recover ready | preferred |

## Extraction and gutters

The source PNGs are exact unmodified ImageGen outputs. Some original sheets have irregular spacing or silhouettes whose horizontal extents overlap at different heights. The delivered raw rows therefore use equal-width padded slots with at least 48px clear separation in major silhouettes (observed minimum 61px), plus outer padding. This is a spacing repair, not an independent redraw.

`build_handoff.py` labels major connected alpha components (>80, >400 pixels), checks the expected figure count, assigns antialias pixels to the nearest major silhouette, and discards low-alpha noise farther than four source pixels from all major silhouettes. No major silhouette is removed. Every retained RGBA value is identical to its original source pixel. Source-to-raw translations are explicit per figure. It preserves each pose's horizontal offset from its nominal source slot centre and **all relative source Y offsets**, with no per-frame scale, vertical alignment, seed substitution, animation retiming or runtime atlas conversion. It adds fully transparent spacing and does not recover source material that was clipped; validation confirms no major silhouette touches a source edge.

## Validation and Claude intake

From the repository root:

```sh
python3 incoming/ART-UNIT-ANIMATION-A5-001/build_handoff.py
```

Checks: five exact seed crops and pinned blobs; 26 raw RGBA strips; 134 isolated figures; 23 preferred candidates; six/eight-frame actions and four-frame reactions; transparent backgrounds and gutters; no major source edge clipping; retained source RGBA identity; three 390px review sheets. Static sheets and generated poses were visually inspected. `git diff --check` and an added-files-only path audit accompany the commit.

After normal Git push, fetch the pushed branch and verify its complete file set and every full-file SHA-256 against the local `validation.json`:

```sh
python3 incoming/ART-UNIT-ANIMATION-A5-001/build_handoff.py --verify-branch origin/art/art-unit-animation-a5-001
```

A manifest cannot contain its own full-file SHA-256 without a circular hash. Therefore `validation.json` hashes every other package file; the verifier separately compares the complete fetched manifest blob byte-for-byte and reports its actual SHA-256. No fake self-hash or placeholder is used. The PR records the post-push result.

No gameplay, browser, device, normalized atlas, GPU/memory-budget or in-engine motion validation was performed or implied; this task is an art-only handoff. Exact seed endpoints, shared body scale, sole alignment, anatomical hand/weapon continuity, contact-event timing, frame packing and real 390px motion evidence belong to Claude's intake. Leave selection and motion approval with the owner. Do not merge this PR.
