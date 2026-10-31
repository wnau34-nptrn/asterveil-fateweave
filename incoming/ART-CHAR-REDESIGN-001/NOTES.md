# ART-CHAR-REDESIGN-001 — Odran / Isolde

One final design each, original ImageGen artwork, 2026-10-30. IDs remain `thiran` / `wila`. Owner visual approval is pending; validation is technical evidence only.

Odran is a low, wide, heavy gatewright: a single work-apron mass over an olive-lined charcoal coat, scarred hinge gauntlets and iron-dark boots. The low anatomical right fist is larger; the raised left forearm carries the wrapped prayer cord and iron ring. His outline replaces Corin's forward punch and trailing tabard with a planted rectangular guard.

Isolde has a narrow turning stance on one foot, a single strong diagonal bell-staff, fitted cream legs, short silver-streaked hair and one ochre half-cape. The staff's short streamers remain attached to the bell cluster; they do not orbit her body. Her outline differs from Cerise's fan-and-ribbon silhouette.

## Must-not review

- [x] Odran: no gold pauldron, ivory/gold-emblem tabard, separate front cloth panel, hand-held beads, forward punch or Corin-like brown greaves. The specified heavy leather work apron is retained; it is not a cloth tabard.
- [x] Isolde: no fans, orbiting ribbons, ruffled skirt, harem trousers, braid, gold-leaf/crescent hair ornament or purple/lilac/coral/teal main palette.
- [x] Right-facing static units, no baked ground shadow, no text, real alpha, full implements inside frame.
- [x] Portraits are separate closeup paintings with painted backgrounds and matching identities.
- [x] Original heroes 0–3 and mercenaries 0–5 were the generation style references. Corin/Cerise were used only for post-generation comparison, never attached to ImageGen.
- [x] No gameplay, save, balance, timing, shared skill-icon or runtime integration changes.

## Reproduction and checks

`package.py` reuses Batch 1's connected-component isolation, two-pixel mask dilation, alpha cleanup, proportional crop/resize and translation. No character painting is performed by Python. Units are 512×512, within 480×460, top at least y37, sole y496 inclusive and pivot `(0.5, 497/512)`. Portraits are 512×512; weapons are 128×128 with 112px maximum item extent.

Run `python incoming/ART-CHAR-REDESIGN-001/package.py --base origin/feature/fateweave-initial-prototype` after fetching the base. The script reads base atlases directly from Git, retains their current dimensions and replaces only mercenary frames 7/9 and gear cells (6,0)/(6,1). It writes lossless WebP only under `packaged/` and asserts exact RGBA equality for every untouched cell and every untouched pixel, including unused cells.

`validation.json` records the actual run status, source transforms, bounds, pivots, checks and SHA-256/byte counts for every other package file. It excludes itself to avoid a recursive hash. `verify_remote.py` checks the fetched branch's file bytes and decodes all PNG/WebP files with Pillow; it rejects incomplete packages.

`review/lineup.png` compares unchanged Corin/Cerise against the redesigns at 115px on the game's forest background, with black silhouettes below. `native-sizes.png` shows native 115px units, 40px portraits and 128px weapons. `portraits-40.png` compares the four faces. These are art-review compositions, not real gameplay screenshots.

## Handoff to Claude

Local packaging against base `c41a500158904844637213b050d1b77b99f6ad61` passed: eight untouched unit cells, eight untouched portrait cells and 88 untouched gear cells are decoded-pixel identical. All delivered PNG/WebP files decoded with Pillow. The 115px silhouette and 40px portrait compositions were visually inspected. The initial environment proxy problem was resolved by enabling network access for the Git command; final delivery uses normal Git, not the contents API.

Use the final normalized cells and packaged atlases after owner visual review. Integrate only through a separate game change, remove old `thiran`/`wila` A7 animation registrations simultaneously, capture real 390px screenshots and then prepare ART-UNIT-ANIMATION-A7-003. Do not let the old animated bodies replace these seeds. Keep Corin and Cerise unchanged. No merge or publication is part of this art task.

The generated detail is intentionally reduced by proportional scaling; small tool loops and ankle bells become accents at 115px. The full staff contributes to Isolde's frame bounds, so her body occupies less height than Odran's broad body; her chibi head/body proportion is preserved rather than independently rescaled. Final aesthetic acceptance belongs to the owner.
