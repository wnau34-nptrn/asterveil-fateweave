# ART-UNIT-ANIMATION-A4-001 — art handoff

2026-10-28 (Asia/Bangkok). Branch `art/art-unit-animation-a4-001`, target `feature/fateweave-initial-prototype`, seed/base commit `1e563999d014b5b12abcac5aeb82c3c0263d3a52`.

Five exact shipped seeds; 25 transparent raw strips / 146 figures including alternatives; 21 preferred strip candidates covering every requested move/reaction. **Artwork review only. No owner artwork selection or motion approval is implied. Do not merge or publish from this handoff.** Claude owns normalization, packing, runtime mapping and eventual in-game motion evidence.

## Package

- `heroes/`: Mira and Toma seeds, raw strips, exact original ImageGen source sheets, edit canvases, and a 390px review sheet.
- `foes/`: Dew Slime, Ember Slime and Ruin Bat equivalents.
- `preview-390.png`: complete 390 × 3164 review sheet, all 25 strips. The group sheets are 390 × 1800 and 390 × 1428. Gold captions mark preferred candidates; grey captions retain alternatives.
- `prompts.json`: all 13 exact submitted generation prompts, references, original output paths and source-sheet names. Whole continuous strips were generated together, never one frame at a time.
- `seeds.json`: pinned atlas blob, zero-based cell, exact crop, facing, RGBA seed SHA-256 and seed silhouette bounds.
- `strips.json`: each raw file, frame count, source row/crop, ordered frame bounds, candidate choice and suggested route/intent names. These are handoff metadata, not a runtime manifest.
- `validation.json`: file hashes, dimensions, transparency and source-pixel preservation checks.
- `build_handoff.py`: reproducible row isolation and static review-sheet rendering; Pillow, NumPy and SciPy required.

All new files are inside this package. No `src/`, `tests/`, `public/`, `.github/`, existing artwork or shared handoff document was changed. This local NOTES file carries the Claude handoff because the owner's incoming-only boundary overrides the repository's usual shared-doc updates.

## Seeds and invariants

Seeds are unmodified 512 × 512 RGBA crops of this repository's current shipped assets, verified pixel-for-pixel against the pinned base:

| Identity | Shipped atlas / cell (zero-based) | Facing | Ground reference |
| --- | --- | --- | --- |
| Mira `mira` | `public/assets/art/units_mercs.webp` / 1 | right | y=497 in 512px cell |
| Toma `toma` | `public/assets/art/units_mercs.webp` / 2 | right | y=497 |
| Dew Slime `foe_dew_slime` | `public/assets/art/units_foes2.webp` / 0 | left | y=497 |
| Ember Slime `foe_ember_slime` | `public/assets/art/units_foes2.webp` / 1 | left | y=497 |
| Ruin Bat `foe_ruin_bat` | `public/assets/art/units_foes2.webp` / 2 | left | y=497; hover/flying motion remains above this reference |

Original generated edits use only those target-repository seeds. No art, code or history from Asterveil: Rise Beyond was accessed or imported. No third-party character artwork was used.

Prompts lock face, hair, outfit, weapon, proportions, palette, facing, handedness, scale and ground reference. Raw generation still has small design/sole/spacing deviations; **these are not normalized, pixel-identical finished frames**. Exact seeds are supplied for Claude's endpoint lockback and shared-scale/ground matching. Airborne and down silhouettes must keep their natural height instead of being independently resized to standing height.

No arrows or flasks in flight, airborne sparks, painted targets, trails, contact flashes or impact layers are in the selected strips. A nocked arrow in a draw pose and a flask held before release are intentional. Mira's fan and single-arrow flight use existing `projectile_*`; Toma's flight/impact use `alchemy_*`. Ember's charge is inside its jelly body. Existing VFX and runtime timing remain untouched.

## Frame order — every raw strip

Every sequence reads **left to right**. All strips have six frames except the two four-frame bat hover alternatives. Names below are the filenames under the appropriate `raw/` directory. Recovery returns to ready except down, which ends in a collapsed hold. Release/contact is the fourth figure of action strips; this describes artwork and does not prescribe game timing.

| File | Frames 1 → 6 (or 1 → 4) |
| --- | --- |
| `heroes/raw/mira-single-arrow-r1.png` | ready → nock/start draw → full horizontal draw → empty-string release → open draw-hand follow-through → ready |
| `heroes/raw/mira-volley-r1.png` | ready → lift bow → high full draw → release with bow lowering too early → raised-arm follow-through → ready; retain for comparison |
| `heroes/raw/mira-volley-r2.png` | ready → raise bow high right → high diagonal full draw → open-hand high release → high follow-through → ready; **preferred** |
| `heroes/raw/mira-disengage-r1.png` | ready → low weight shift → draw in backstep stance → release right → brace/follow-through → ready |
| `heroes/raw/mira-disengage-r2.png` | ready → knees bend/shift back → full draw in wider retreat stance → release right → open-hand braced follow-through → ready; **preferred** |
| `heroes/raw/mira-hit-r1.png` | ready → head/shoulder flinch → deepest flinch → forward balance correction → straighten → ready |
| `heroes/raw/mira-block-r1.png` | ready → forearm/bow raised across front → braced guard → small defensive recoil → lower guard → ready |
| `heroes/raw/mira-down-r1.png` | ready → knees buckle → kneel → lower onto side → collapsed with bow → down hold |
| `heroes/raw/toma-overhand-r1.png` | flask ready → flask up by shoulder → cocked overhead throw → empty forward hand release → empty hand follows down → ready with next held flask |
| `heroes/raw/toma-underhand-r1.png` | flask ready → flask lowered → low forward swing holding flask → empty palm-up release → upward follow-through → ready; retain for comparison |
| `heroes/raw/toma-underhand-r2.png` | flask ready → lower to hip → low backswing holding flask → empty palm-up release below chest → soft palm-up follow-through → ready; **preferred** |
| `heroes/raw/toma-hit-r1.png` | ready → recoil clutching flask → deepest recoil → hunch/rebalance → straighten → ready |
| `heroes/raw/toma-block-r1.png` | ready → free forearm protects face/flask at chest → firm forearm brace → small recoil behind guard → lower forearm → ready |
| `heroes/raw/toma-down-r1.png` | ready → knees buckle → kneel → hand to ground → collapsed with equipment → down hold |
| `foes/raw/foe_dew_slime-jelly-bounce-r1.png` | ready → low squash → stretch/leap → airborne forward contact body → descend/re-form → ready |
| `foes/raw/foe_dew_slime-hit-r1.png` | ready → side recoil → deep low squash/eyes pinch → wobble rebound → settle → ready |
| `foes/raw/foe_dew_slime-down-r1.png` | ready → sag → flatten → eyes close/leaf droops → flattened down → down hold |
| `foes/raw/foe_ember_slime-ember-spark-r1.png` | ready → body brace → bright internal charge → mouth-open spit/recoil with no spark → glow settles → ready |
| `foes/raw/foe_ember_slime-hit-r1.png` | ready → side indent → deep lateral squash → rebound → settle → ready |
| `foes/raw/foe_ember_slime-down-r1.png` | ready → tension fades → slump → flatten with eyes closed → low coherent jelly → down hold |
| `foes/raw/foe_ruin_bat-hover-r1.png` | slightly raised wings → halfway down → low/out wings → rising wings; subtle original loop |
| `foes/raw/foe_ruin_bat-hover-r2.png` | wings high → wings out → wings fully down → wings rising/out; loop 4 → 1; **preferred** |
| `foes/raw/foe_ruin_bat-swoop-bite-r1.png` | hover → compact forward lean → descending swoop with mouth open → lowest forward bite → bank back → hover |
| `foes/raw/foe_ruin_bat-hit-r1.png` | hover → flinch → strongest wing tuck/eyes pinch → rebound → stabilize → hover |
| `foes/raw/foe_ruin_bat-down-r1.png` | hover → wings falter/eyes close → body sinks → ground contact/fold wings → grounded unconscious → down hold |

## Generation repairs and raw extraction

ImageGen did not obey every requested layout. Toma's first sheet contains four rows (overhand, underhand, hit, down), omitting block; a separate six-frame block pass supplies it. Bat's first sheet has four hover figures followed by three six-figure rows, rather than a uniform six-column grid. Mira's original down row touches the bottom/right source edges; its raw strip instead uses the separate, fully contained six-frame down pass. The original clipped down row is retained only inside `mira_r1-source.png`.

R2 volley/disengage, Toma underhand and block were rerun on larger reference canvases for safer margins. The earlier `mira_r2-source.png`, `toma_underhand_r2-source.png` and `toma_block_r1-source.png` are provenance/comparison outputs; raw strip mappings explicitly select their `_final` replacements. Bat hover R2 uses its first four-frame output. Reference canvases contain uniformly reduced copies of the shipped seed, solely to guide generation scale; raw artwork was not independently resized to them.

Close rows overlap in vertical extent without their silhouettes touching. `build_handoff.py` identifies their inspected major alpha components (>80, >500 pixels), assigns low-alpha edges/small detached details to the nearest major component, zeros figures belonging to other rows, and crops a shared Y range for the entire strip. It preserves source X positions and all retained RGBA bytes exactly. It performs **no per-frame movement, fitting, scaling, endpoint substitution, atlas packing or runtime conversion**. Original source PNGs remain intact for any alternate extraction. Frame bounds and shared crop offsets are explicit in `strips.json`; do not assume that dividing a raw strip into equal-width cells will isolate every pose, especially the bat.

## Uncertainties and Claude intake

- R2 is a recommendation for owner review, not an approved selection. Use R2 for Mira volley/disengage, Toma underhand and bat hover unless the owner chooses otherwise.
- Exact face embroidery, satchel bottle details, bow curvature, weapon grip and planted soles still need a final consistency pass against the supplied seeds. Generated returns are not byte-identical seed endpoints. The package does not claim these invariants are already exact.
- Toma's low backswing crosses the body; check throwing-hand continuity against the seed when extracting. Ally toss remains right-facing to preserve identity/facing. Runtime selects the ally target and flight direction.
- Mira's retreat is deliberately short. Preserve the widening/backstep foot poses; let Claude decide the existing controller's root translation without adding a teleport or changing game rules.
- Dew leap/contact is a body pose only; landing displacement/contact cadence and physical travel need in-game review. Do not normalize away the jump by bottom-aligning every airborne frame.
- Ember charge/spit reads through internal brightness, face and body recoil. Its cheek/mouth cue is small at 390px; verify it with the existing spark VFX before approving motion.
- Bat hover R2 wing extremes are clearer but wing/body scale and loop seam still need in-game review. Preserve ears, two fangs and left-facing head through extraction.
- Some source outputs retain pale/colored antialias fringes and low-alpha matte RGB. Pixel preservation intentionally retains these. Inspect against the real battle background during Claude's normalization; no backdrop is baked into the raw strips.

## Validation and handoff boundary

Run `python3 incoming/ART-UNIT-ANIMATION-A4-001/build_handoff.py` from the repository root (or invoke the script by absolute path). It verifies all five seed hashes and exact atlas crops when the shipped atlases are available, checks observed figure counts, writes one RGBA PNG per strip, asserts pixel identity for every retained source pixel, checks that no selected major silhouette reaches a source canvas edge, and renders all three 390px sheets. Outputs: 25 strips, 146 figures including alternatives, 21 preferred candidates. Source sheets, seeds and templates are included in the PNG hash report.

`git diff --check` and an added-files-only path audit accompany the commit. Static 390px hero and foe sheets were inspected. No runtime, browser, device, timing, RAM/GPU-budget, normalized-atlas or owner motion validation was performed; this task supplies art inputs only. Gameplay tests are not a substitute for that future visual review. Shared Claude handoff documents, runtime assets and game code remain untouched per the explicit owner boundary. Open a PR into the named base and leave it unmerged.
