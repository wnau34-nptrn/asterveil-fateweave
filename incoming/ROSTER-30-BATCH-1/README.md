# C12 Batch 1 — Saint / Dancer production assets

Original artwork generated 2026-10-25 for Asterveil · Fateweave. Four right-facing static combat units, four corresponding portrait closeups, twelve painted skill icons and four unique class weapons. No artwork, names or code imported from other games. Palette is costume/mechanic language, never an element system.

## Identity and intake

PR #61 discussion was inspected on 2026-10-25: no comments/owner option choice found. C12's explicit fallback selects option A for Metta (Saint) and Lalin (Dancer). The two reference boards are copied read-only from `origin/art/art-char-class-new-001`; Thiran and Wila are new distinct identities. This is implementation artwork under that fallback, not a claim of owner visual acceptance.

- Metta: youthful tousled chestnut hair, ivory tabard, single gold shoulder, gold knuckles/ivory prayer beads.
- Thiran: mature dark-tan skin, short dark hair gray at temples, neat beard, sage/ivory gold costume, wooden beads.
- Lalin: chestnut braid, gold leaf/red bow, coral/teal layers, paired folding fans and ribbons.
- Wila: warm brown skin, dark bob with silver highlights, crescent/purple bow, ivory/plum layers and pale-violet fans.

## Runtime maps

Existing frames are preserved, four new cells appended to `units_mercs.webp` and `portraits_mercs.webp`:

| ID | Frame | Cell x/y | Unit pivot |
|---|---:|---|---|
| metta | 6 | 0 / 1536 | (0.5, 497/512) |
| thiran | 7 | 512 / 1536 | (0.5, 497/512) |
| lalin | 8 | 0 / 2048 | (0.5, 497/512) |
| wila | 9 | 512 / 2048 | (0.5, 497/512) |

Each frame is 512×512; unit bounds fit 480×460, alpha sole bottom y496 inclusive, figure top y37, no baked ground shadow. Two columns × five rows. Portraits are separate generated high-resolution closeups faithful to the corresponding unit identity; CSS clips portraits in UI as before.

Skill icons append to original order (0–60 retained): `saintstrike`, `communion`, `saintarc`, `vowstrike`, `sharewound`, `lastlight`, `cadence`, `duet`, `rounddance`, `deepbeat`, `echofoot`, `closingstep` at indices 61–72. 256px cells, 6 columns × 13 rows; last five unused cells transparent. All new icons meet the existing radius ≤112px and opaque-extent 190–205px contract. Runtime `skill_icons.json` carries dimensions and order.

Weapons use new columns in the 7×3, 128px-cell gear atlas: Metta (5,0), Thiran (6,0), Lalin (5,1), Wila (6,1). All original five columns and equipment frame coordinates remain unchanged.

## Rebuild and validation

Run `python incoming/ROSTER-30-BATCH-1/package.py` with Pillow, numpy and scipy. The script reads original atlases/metadata from base `5a613a5`, isolates each source unit's connected silhouette globally (generated ribbons cross the nominal grid boundary), performs rigid crop/scale/translation to normalize the feet, crops portrait tiles and normalizes icon cells using the existing C1 packaging routine. It does no character painting or synthesis. Artwork originates solely from ImageGen.

All modified runtime atlases use lossless WebP to preserve each old decoded RGBA cell exactly. The generator asserts pixel equality against the old six unit/portrait frames, all old 61 skill frames and all old fifteen equipment cells. Lossless export increases file size; the original image identities/colors and frame IDs remain intact. Source art and deterministic packaging can support a later performance pass with separately reviewed image-quality tolerances.

`provenance/generations.json` and `gear-generation.json` record exact prompts and tool output hints/paths; raw PNG sources are retained. No exact image model version was exposed, so none is asserted. `provenance/validation.json` records bounds, pivots, icon extent/radius and decoded-pixel checks. `provenance/manifest.json` records package SHA-256 and byte sizes. Reviews include native 115px units, 40px portraits, 40/56/72px icons and normal/cooldown samples. These are art QA compositions, not live gameplay screenshots or real-device verification. Runtime screenshots and new-class mechanics are the enclosing C12 implementation task.
