# ART-UI-PROGRESS-001

Original progression artwork for Asterveil · Fateweave. Artwork handoff only; no runtime integration or progression rules are included.

## Delivery

- 14 transparent painted item PNGs, each 256×256, alpha bounds no larger than 200×200.
- `tome_bulwark_{small,medium,large}` — ตำราปราการ: steel blue, shield clasp.
- `tome_blade_{small,medium,large}` — ตำราศัสตรา: crimson, sword clasp.
- `tome_accord_{small,medium,large}` — ตำราประสาน: mint/gold, radiant clasp.
- `rift_core` — แก่นรอยแยก; `star_shard` — เศษดาว; `honour_coin` — เหรียญเกียรติยศ.
- `pet_egg`, `pet_food` — speckled thread-pattern egg and glowing-grain pouch.
- `star_fate_empty.png`, `star_fate_lit.png`: transparent 64×64 star sockets. Use the same centre anchor for both states.
- `star_fate_frame.png`: transparent 512×160 decorative band with five open sockets, no text. Overlay socket PNGs at approximate local centres (98,80), (177,80), (256,80), (335,80), (414,80). Each socket is independently replaceable; effects and rank labels remain code-owned.
- `progress_items.webp`: 1024×1024 lossless RGBA atlas, fourteen untrimmed 256×256 cells in four columns, with two unused cells. `progress_items.json` uses the existing world item atlas convention: item key → `{x,y,w,h}`. UI PNGs remain separate.
- `preview.png`: all fourteen item canvases rendered at 32/48/64 px on #0b1730 and #edf0ee, plus the native frame with three lit and two empty sockets. Preview captions are review-only; asset PNGs contain no text.

## Art and production

Read `docs/MASTER_PLAN_TH.md` A6 and B, the existing world item mapping and painted world/equipment atlases, and `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`. Match their top-left light, dark contours, bright metal highlights and painted materials, while preserving quiet navy/champagne UI accents. No rarity frames are baked into the inventory icons.

Generated each asset separately with the built-in `image_gen` tool using only this repository's item artwork as visual references. Final prompts are recorded in `PROMPTS.json`. No external game imagery or content was used. Tier variants retain the same role, book construction and clasp motif; individual painted ornaments and tilt vary slightly. Large tomes carry additional spine and corner decoration.

Pillow was used only for alpha-bound trimming, Lanczos downsampling, transparent-canvas centring, atlas packing and preview composition. Trim bounds ignore alpha below 8 to exclude nearly invisible generation margins; retained edge alpha is preserved. Generated originals remain in the local generation cache; delivery contains the normalized assets.

## Verification

Visually inspected the source references, crystal heart, decorative band and final preview on both panels. Checked all seventeen PNG dimensions, transparent outer pixels and item alpha extents. Decoded the lossless WebP and compared all fourteen atlas cells byte-for-byte with the individual RGBA PNGs. `validation.json` records dimensions and final alpha bounds. `git diff --check` passed. Gameplay tests are unnecessary for this isolated artwork addition.

This handoff adds files only under `incoming/ART-UI-PROGRESS-001/`. No source, public assets, tests, workflows or existing art changed. PR targets `feature/fateweave-initial-prototype`; leave it unmerged for review.
