# ART-UI-EQUIP-001 — Equipment, set, potion and forge icons

Delivery branch: `art/art-ui-equip-001`, from latest `feature/fateweave-initial-prototype` at `8ba23cd5b5bb1cd3602ba98f620eb598a5995a12`. Produced 2026-10-16 for Claude Asset Intake Review. Art package only; no game code or integration.

## Runtime and atlas contract

**303,066 bytes / 600,000 bytes** (decimal), counting all **3 WebPs + 18 SVGs**. All painted runtime files are lossless WebP, RGBA with embedded sRGB. They decode pixel-identically to their normalized PNG atlas copies. Source generations and review PNGs are reference-only.

- `items/gear_items.webp`: 640×384, 5×3 cells, each 128×128. Row 1 guardian / tracer / weaver / healer / garran; row 2 mira / toma / sefa / brann / lio; row 3 head / body / gloves / boots / charm.
- `emblems/set_emblems.webp`: 768×128, dawn / wind / shadow / thorn / starveil / mender.
- `items/potion_items.webp`: 640×128, salve / tonic / repel / dust / gold.

Same-basename JSON maps record frame-local identity and atlas-local x/y/w/h. These are centred inventory items, not ground-anchored actors. Gear occupies about 104 px of its 128 px cell, with at least 6 px padding; emblems about 112 px. Salve uses a 96 px extent; tonic, repel and dust use 108 px; gold uses 104 px. Use the entire 128 px cell when sampling. Native class colours and materials are fixed across rarities: no rarity variants, borders, frames or rarity glow are baked in. Attach a separate 16–20 px set emblem in code.

## SVGs

All eighteen SVG roots use `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`, and round caps/joins. They contain only original path/circle geometry, no fixed colours, fonts, labels, embedded images or scripts. Slots: weapon, head, body, gloves, boots and charm. Materials/potions/currency: dust, salve, tonic, repel and gold coins. Actions: forge/anvil, enhance/hammer+spark, fuse/three shards converging into one, reroll/arrows around gem, salvage/broken piece and powder, brew/cauldron and set/linked rings.

The added `item_gold` is a small stack of plain gold coins without letters, numbers or currency symbols; `gold.svg` simplifies the stack to two clear tiers at 15 px. The salve is spherical with a short neck; tonic is broad, angular and flat-bottomed with a longer neck; repel is tall and slim. The SVGs retain those same three bottle silhouettes. Equipment outlines reduce each painted category to a readable 15 px shape.

## Review sheet order

`review/items-sizes.png`: painted frames in gear atlas order, then six emblems, then five potion/material/currency frames; five groups across, six rows. Each group shows 128, 56 and 32 px from left to right. Below, the SVGs appear in slot order, dust/potions, forge actions, then set and gold; each pair is 24 px followed by 15 px. The painted and vector samples render on #0d1c2e.

`review/rarity-mock.png`: three unchanged item designs (guardian sword, body armour and salve), each repeated across the five requested plain rarity-border colours with a separate 18 px set emblem. Border art exists only in this review PNG.

`review/greyscale.png`: salve, tonic, repel, dust, gold, dawn, wind, shadow, thorn, starveil, mender, at 32 px above and 16 px below. No labels or text are painted.

`review/weapons-vs-units.png`: row-major guardian, tracer, weaver, healer, garran / mira, toma, sefa, brann, lio. Each is the matching existing unit cell at 240 px with its new weapon at 128 and 32 px. Tiny disconnected neighbouring-cell crumbs are removed from review copies only. The source unit WebPs remain unchanged.

## Production, validation and limits

The image_gen source masters and prompt record are retained in `provenance/`. The sources were drawn with reference to unchanged items.webp/chests.webp and units.webp/units_mercs.webp. They are original painted redraws of this project's designs, not third-party imports or traced silhouettes. Small ornament and filigree variation is inherent in the raster redraw; the comparison sheet makes it available for Claude's subjective weapon/style review.

`build_package.py` performs mechanical source cutting, component-based alpha cleanup, centred downsampling, atlas packing, JSON generation, review compositing and validation. It does not paint items or change existing assets. Nonuniform source gutters are explicitly cropped so weapons remain complete. WebPs use lossless encoding, method 6; there is no lossy quality reduction.

Rebuild with Python + Pillow + NumPy + SciPy + CairoSVG: `python -B incoming/ART-UI-EQUIP-001/build_package.py`. Append `--validate` for checks only. CairoSVG is used for reference PNGs and SVG renderability checks, not runtime. This session used its temporary install under `/tmp/equip-python` via PYTHONPATH.

Checks passed: exact dimensions, 26 occupied frames, JSON order/rectangles, >=6 px padding, RGBA/alpha, embedded sRGB, PNG/WebP pixel equality, 18 exact-format renderable SVGs at 15/24 px, runtime file count/budget and unchanged protected hashes. All new files are under `incoming/ART-UI-EQUIP-001/`; no source, tests, workflows, public files or existing art changed. No merge or deployment. Visual review covered the decoded runtime size, greyscale, rarity and class-weapon comparison sheets. Final subjective intake remains with Claude.

## SHA-256 — existing references, unchanged

| File | SHA-256 |
| --- | --- |
| `public/assets/world/items.webp` | `85af39c29b48faccb2f4bc2bd03d021da9a8dc8862cf01912e038839e0705138` |
| `public/assets/world/chests.webp` | `f79a477776c14ea82f5055bbf3d0bc3a623b46e2a5a67a693f2558e920ff460b` |
| `public/assets/art/units.webp` | `d205b57d8a4082290a3a2e5a415407245106f948033cf3c66eb7b8e537393629` |
| `public/assets/art/units_mercs.webp` | `f56977d16167593da97b41417239ef1db4fd2d790301b230c62b8ffbb1825e54` |
| `public/assets/art/portraits.webp` | `f604b5f93c6526130546e194674d37f4e3265083908bbbb3448affadf4b70496` |
