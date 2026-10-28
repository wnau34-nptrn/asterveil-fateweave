# ART-UNIT-ANIMATION-A6-001 — art handoff

2026-10-28 (Asia/Bangkok). Branch `art/art-unit-animation-a6-001`; target `feature/fateweave-initial-prototype`; pinned seed/base commit `8616ad3155a179e05210fe6aa552e6d234c9bd24`.

Four exact shipped seeds; **26 transparent raw strips / 136 figures**, including four R2 alternatives. **22 recommended candidates cover every requested body set and reaction.** Artwork review only: no owner artwork selection or motion approval is implied. Open a PR and leave it unmerged. Claude owns normalization, packing, runtime routing and actual in-game motion review.

## Package and scope

- `heroes/`: Sefa and Lio seeds, original ImageGen source sheets, edit canvases, one transparent PNG per raw strip, and a 390px review sheet.
- `foes/`: Rift Weaver and Spore Puff equivalents.
- `preview-390.png`: all 26 candidates, 390 × 3712. Group sheets are 390 × 2452 (heroes) and 390 × 1332 (foes). Gold captions mark recommendations; grey captions retain alternatives. These are static strips at a 390px review width, not screenshots of a running game.
- `prompts.json`: all seven exact ImageGen requests, input reference paths, retained source filenames and original output paths. Each whole animation row was generated together, never frame by frame.
- `generation.json`: generation provenance and requested/observed layout exceptions.
- `seeds.json`: pinned atlas blob, zero-based cell, exact crop, facing, ground reference and seed PNG SHA-256.
- `strips.json`: observed source row, six/four-frame counts, ordered source/output bounds, chronological poses, routes and recommended candidates.
- `validation.json`: package file sizes/SHA-256, PNG decoding/dimensions/transparency, exact seed comparisons, retained-source-pixel checks and measured gutters.
- `build_handoff.py`: reproducible row isolation, gutter insertion, static review sheets and manifest; Pillow, NumPy and SciPy required.
- `verify_pushed.py`: checks every package file read from a freshly fetched Git commit against the local bytes and manifest, and decodes every remote PNG. The optional `post-push-verification.json` receipt identifies the exact first pushed commit it checked; the final commit including that receipt is checked again without rewriting it. See the PR for the final head and verification totals.

All additions are under this package. No `src/`, `tests/`, `public/`, `.github/`, existing artwork or shared handoff document was changed. This NOTES file is the Claude handoff because the owner's incoming-only scope overrides the repository's usual shared-doc updates. No assets, code or history from Asterveil: Rise Beyond were accessed or imported. New artwork was generated only from this repository's shipped seeds; no third-party character references.

## Exact seeds

| Identity | Shipped atlas / zero-based cell | Facing | Ground reference |
| --- | --- | --- | --- |
| Sefa `sefa` | `public/assets/art/units_mercs.webp` / 3 | right | y=497 in 512px cell |
| Lio `lio` | `public/assets/art/units_mercs.webp` / 5 | right | y=497 |
| Rift Weaver `foe_riftweaver` | `public/assets/art/units_foes.webp` / 5 | left | y=497 |
| Spore Puff `foe_spore_puff` | `public/assets/art/units_foes2.webp` / 5 | left | y=497; hanging roots preserve natural hover/body motion |

Seeds are unmodified 512 × 512 RGBA crops, verified pixel-for-pixel against the pinned commit. Lio's exact seed contains the original floating musical decoration; generation explicitly excludes it from new body strips. It remains in the seed/reference for provenance only. Rift Weaver's solid chest shard and embroidered cloth are held equipment/costume, not new spell projectiles.

## Frame order and candidates

Every strip reads left to right. Actions have six figures; reactions have four. These are artwork beats, not changes to existing playback timing. Down ends in a collapsed hold. Full machine-readable frame order and source/output bounds are in `strips.json`.

| Raw filename (under the appropriate group) | Frames in order | Recommendation |
| --- | --- | --- |
| `sefa-double-slash-r1.png` | ready → first dagger wind-up → first slash right → second cross slash → low follow-through → recover | R1 |
| `sefa-low-stab-r1.png` | ready → crouch → coil dagger → low lunge thrust → retract → ready | compare |
| `sefa-low-stab-r2.png` | ready → drop low → dagger at hip → long low thrust right → retract/rise → ready | **R2** |
| `sefa-knives-r1.png` | ready holding dagger → hand near shoulder → cock elbow → empty-hand release → empty follow-through → ready with next dagger | R1 |
| `sefa-evade-r1.png` | ready → sink weight → push off → back foot plants looking right → defensive settle → ready | R1 |
| `sefa-hit-r1.png` | ready → recoil left → guarded flinch → ready | R1 |
| `sefa-block-r1.png` | ready → crossed daggers → braced recoil → ready | R1 |
| `sefa-down-r1.png` | ready → buckle → lower onto side → collapsed hold | R1 |
| `lio-strum-strike-r1.png` | ready → lift wrist → prepare strum → hard strum right → follow-through → ready | **R1**, instrument stays in playing grip |
| `lio-strum-strike-r2.png` | ready → draw instrument back → swing right → physical strike extension → retract → ready | compare physical-swing interpretation |
| `lio-sustained-song-r1.png` | ready playing → sway left → upright upstrum → sway right → upright downstrum → ready playing | R1; valor/mend/solo |
| `lio-dread-chord-r1.png` | ready → hunch/lift hand → gather → hard downward strum → hunched follow-through → recover | R1 |
| `lio-finale-r1.png` | ready → gather → raise near face → diagonal flourish → lower → recover | compare |
| `lio-finale-r2.png` | ready → gather/bend → lift instrument → instrument above head → lower flourish → ready | **R2**, clearer high flourish |
| `lio-hit-r1.png` | ready → recoil clutching instrument → deep flinch → recover | R1 |
| `lio-block-r1.png` | ready → protective brace → absorb recoil → recover | R1 |
| `lio-down-r1.png` | ready → buckle clutching instrument → kneel/forearm support → collapsed side hold | R1, separate down pass |
| `foe_riftweaver-rune-lash-r1.png` | chest-shard ready → coil arm → raise elbow → open-glove snap left → low follow-through → recover | R1; cast body only |
| `foe_riftweaver-rift-needle-r1.png` | ready → pinch near shard → draw wrist back → two-finger flick left → follow-through → recover | R1; no needle painted |
| `foe_riftweaver-ribbon-snare-r1.png` | ready → grasp cloth at chest → wrist toward shoulder → compact wrist cast → low follow-through → recover | **R1**, compact cloth toss |
| `foe_riftweaver-ribbon-snare-r2.png` | ready → cloth at hip → elbow back → low sidearm release → follow-through → recover | compare broader sidearm |
| `foe_riftweaver-hit-r1.png` | ready → recoil right → hunch clutch shard → ready | R1 |
| `foe_riftweaver-down-r1.png` | ready → hood dips/buckle → robe sinks → collapsed robe hold | R1 |
| `foe_spore_puff-spore-dust-r1.png` | ready → compress → inflate/caps flare → squeeze/release stance → deflate → original size | R1; no airborne dust |
| `foe_spore_puff-hit-r1.png` | ready → recoil/caps tilt → squash/roots curl → recover | R1 |
| `foe_spore_puff-down-r1.png` | ready → caps sag → roots fold → flattened coherent hold | R1 |

Sefa's attack/ambush, backstab/disarm, knives, evade/decoy and hit/block/down are covered. Lio's attack/note, valor/mend/solo, dread, finale and hit/block/down are covered. Both foes' named intents and hit/down are covered. No extra block set is claimed for foes.

## Repairs and extraction

The first Sefa request omitted the evade row; a separate whole-strip pass supplies it, alongside low-stab R2. Lio's first finale stops near face level; the separate R2 raises the instrument above his head. His first down row has a crowded bottom margin and is retained only in the original source sheet; the separate four-frame down row supplies the raw strip. Rift Weaver's first ribbon row connects two adjacent figures with fabric; it is **excluded from raw delivery**, retained only as source provenance. The separate compact and sidearm rows supply both ribbon candidates. No frames from these excluded rows are substituted into selected strips.

The script identifies inspected major alpha components (>80, >500 pixels), assigns them to observed rows, and retains original RGBA pixels within an 8px fringe of each silhouette. It clears distant near-transparent matte residue and pixels belonging to other figures. It then translates each isolated figure by an additional 96px per column, preserving the original within-row X displacement and Y reference. This adds transparent gutters without resizing individual poses. The narrowest measured gap between retained alpha bounds is **73px**. Source sheets remain unchanged, byte-for-byte.

Every retained RGBA pixel is asserted equal to its source pixel; removed distant matte pixels are not claimed as retained. Raw strips have explicit bounds and are **not an equal-cell runtime atlas**. The script does no per-frame fitting/scaling, endpoint lockback, foot normalization, packing or runtime conversion. Review sheets alone use one shared scale per strip to fit six poses across 390px. Edit canvases use a uniformly reduced seed at top-left on a 1536 × 1024 transparent canvas to request more space; their output figures were still generated as complete strips.

## Concerns for Claude and owner review

- Generated faces, small embroidery, finger placement, grips and planted soles vary slightly from the seed. These are raw art inputs, not pixel-identical seeded endpoints or normalized finished animation. Use the exact seeds for lockback and consistent shared scale/ground matching; preserve natural down/hover height.
- Sefa's evade is a modest one-body backstep. Keep its foot changes; actual retreat displacement and return belong to the existing controller. Backstab is a low right-facing thrust; do not infer teleporting behind a target or change targeting rules.
- Knives release uses an empty throwing hand and no airborne knife. Existing projectile VFX supplies flight/impact. Check two-dagger/throwing-hand continuity during intake.
- Lio's sharp-strum R1 is recommended for attack/note; the R2 swing is an owner choice. Finale R2 has the clearest high instrument pose. Maintain the ordinary instrument strings, not the seed's floating notes. Songs, shadows, afterimages, auras and all other spell effects stay outside body strips.
- Rune Lash and Rift Needle are intentionally subtle hand gestures. Verify their distinction beside the existing effects at actual game scale. The shard remains held equipment. Ribbon Snare is physical embroidered cloth attached to the robe, not an energy whip. Check fingers, cloth attachment and cast direction on intake; R2's follow-through opens the far arm wider.
- Spore release is conveyed only by body inflation, cap movement and compression. Existing/future VFX supplies airborne dust. Caps and moss patches drift slightly; keep seed morphology and attached spore bulbs during normalization.
- Raw generation scales differ between separate source sheets. Apply one shared source-strip scale against the seed, not independent pose-height fitting. No budget, timing, browser/device or in-engine motion approval is claimed.

## Validation and push verification

Run `python3 incoming/ART-UNIT-ANIMATION-A6-001/build_handoff.py` from the repository root. It verifies all four exact seed crops against the pinned Git objects, observed figure counts, retained source pixels, source core edge clearance, six/four-frame rules, transparency, gutters and complete PNG decoding, then rebuilds the sheets/JSON. Both 390px group sheets were visually inspected. No gameplay code changed, so gameplay tests and runtime browser tests were not run for this art-only package. `git diff --check` and an added-files-only path audit accompany the commit.

Push using normal git, fetch `art/art-unit-animation-a6-001`, then run `verify_pushed.py` against that fetched commit. It SHA-256 checks **every** pushed package file against local bytes; all manifest-listed files must also match `validation.json`. The manifest excludes itself (a self-hash cannot be embedded in itself) and the optional post-push receipt; their remote/local SHA-256 values are still checked and reported. Every fetched PNG must fully decode. After committing/pushing the receipt, rerun the same verification against the final fetched head. The PR records the final result. Do not merge or publish; owner selection and Claude's actual 390px motion evidence are subsequent work.
