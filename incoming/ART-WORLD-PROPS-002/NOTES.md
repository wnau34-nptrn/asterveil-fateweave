# ART-WORLD-PROPS-002 — map props, camp flame and market icons

Branch: `art/art-world-props-002`, from latest fetched `feature/fateweave-initial-prototype` at `aad45b854500ea6885982d912ea4d22274e90539`. Produced 2026-10-16 for Claude Asset Intake Review. The full handoff and placement rules sections 3–4 were read before production.

## Runtime and files

**79,980 bytes / 400,000 bytes**, decimal, across exactly three runtime WebPs. All are RGBA, WebP quality **85**, method 6, with embedded sRGB ICC profiles. PNG masters, generated sources, JSON, reviews and the reference GIF do not count against the runtime budget.

| Runtime file | Dimensions | Bytes |
| --- | --- | --- |
| `props/map_props.webp` | 512×256 | 33,614 |
| `flame/camp_flame.webp` | 1536×256 | 36,366 |
| `market/market.webp` | 256×128 | 10,000 |

## Atlas and anchor contract

`props/map_props.webp`: 4 columns × 2 rows, 128 px cells, ordered herb / event_bandits / event_shrine / event_merchant, then event_traveller / event_rift / herb_glow / spare. JSON uses atlas-local x/y/w/h and frame-local **footY=116** (0-based, last base scanline; exclusive alpha bound 117). Prop canvas anchor is (64,116); preserve the entire frame when sampling. Six painted objects have 96 px visible width (75% of cell) and at most 90 px height. The upper **26 scanlines are fully transparent**, leaving the requested top fifth clear for the code-drawn event badge. The spare is entirely transparent.

The herb uses broad rounded leaves and mint-green luminous tips, distinct from the existing narrow grass blades; the checkerboard review includes a direct 36 px comparison. `herb_glow` is a separate soft circular underlay, 90 px across, with preserved radial alpha falloff and restrained peak alpha around 110/255. It shares the bottom anchor and is intended to be drawn beneath the herb and pulsed by code. Local tip light, rift energy and this explicit glow sprite are intentional emission; no cast shadow or background halo is baked into the object sprites.

The events are physical crates/stakes with a blank tattered pennant; a secular stone altar with a small amber recess; an open-sided potion cart with a canopy roof and lantern; a pack/bedroll/staff beside a stump; and a jagged violet tear with a small scatter of charred stone fragments. No floor tiles or large ground planes are included. The rift is torn air, not a curtain, veil, magical barrier or gate architecture. No people, monsters or party members are painted into any prop.

`flame/camp_flame.webp`: six **256×256** frames in one horizontal strip, **1536×256** total. JSON: frames=6, w=256, h=256, **baseY=200**. Keep the same 256 px canvas/origin as `public/assets/lobby/lobby_firepit.webp`: centre x=128, base y=200. Each flame crop is about 154 px tall including close sparks (about 60% of frame). Only flame and a few sparks are delivered; the stones and logs in review images come exclusively from the unchanged existing firepit. No smoke column or background. The six distinct frames curl right then left and return close to frame 1. The final-to-first visible-image delta is checked against internal transitions; the contact sheet and reference GIF support visual review. The GIF runs at an average 8 fps (alternating 120/130 ms delays); runtime playback timing belongs to the developer.

`market/market.webp`: 2 columns × 1 row, **256×128**, 128 px cells, contract then gearbox. JSON records atlas-local x/y/w/h. The contract is blank rolled parchment with a physical gold star seal; this is the requested seal motif, not a rating. The iron-bound box has restrained violet-gold light at the lid seam. Both are centred within a 104 px extent, with transparent padding, no rarity frames and no labels. This new market container is a distinct original icon, not a replacement or redraw of existing map chests.

## Review sheets

- `props-sheet.png`: every atlas cell over checkerboard, labelled by id; includes the 36 px herb/grass comparison. `props-gray.png` is the same sheet in greyscale.
- `props-in-map.png`: three **7×5** patches at 64 px tiles, using the real shipped tileset. Meadow contains herb/traveller/merchant; thicket contains bandits/shrine; scar contains rift/herb.
- `props-sizes.png`: those exact compositions at **36, 48 and 64 px** tiles. Props are one cell in frame scale; their 75% visible width is 27/36/48 px respectively. The bottom anchor is placed on the tile's lower edge. The herb's separate glow is composited beneath it.
- `flame-strip.png`: all six decoded runtime flame frames over the unchanged firepit, plus a 90 px frame-scale sample. `flame-loop.gif` is an additional reference-only preview of the same six frames, with no extra runtime variants.
- `market-icons.png`: both decoded runtime market icons at **128, 48 and 32 px**, on #0d1c2e.

Labels appear only in review images, as permitted. These are static art placement compositions, not integrated application screenshots. No map data, UI layout, code-drawn badges or game rules are altered.

## Production and validation

All painted source masters and the prompt record are retained under `provenance/`. The source groups were drawn against this repository's own accepted map, camp and item references. There is no imported third-party art. `build_package.py` performs mechanical cropping, alpha component cleanup, size/anchor normalization, packing, encoding and reference compositing. Nonuniform source gutters are cropped explicitly to retain complete bases. It does not synthesize painting or change existing files.

Rebuild: Python with Pillow, NumPy and SciPy, then `python -B incoming/ART-WORLD-PROPS-002/build_package.py`. For validation only append `--validate`. Checks cover dimensions, RGBA and sRGB, JSON map order and rectangles, all prop baselines/widths/top clearance, empty spare, six flame frames/baseY/seam, market map/padding, exactly three runtime files, byte budget and unchanged protected SHA-256 hashes. The final visible flame transition is smaller than the largest internal transition; this numerical check supports, rather than replaces, the visual loop review.

The decoded runtime checkerboard, map sizes, greyscale, flame/firepit and market sheets were inspected. Fine moss, bottle detail and material texture simplify naturally at 36 px. Final subjective style and animation acceptance remains with Claude Asset Intake Review. Only `incoming/ART-WORLD-PROPS-002/` is added; existing art, src/, tests/, .github/ and public/ remain untouched. No merge or deployment.

## SHA-256 — existing references, unchanged

| Existing file | SHA-256 |
| --- | --- |
| `public/assets/world/tileset.webp` | `38b3ba3719ce3534e1e5ecee1c4ec1aa52fb1bbb16a5a05d66852e11fdb49c33` |
| `public/assets/world/decor.webp` | `4b09ba9340c464ea09a0b66c8eedb9f715696d2106ae5a87ec7c00505d436928` |
| `public/assets/world/chests.webp` | `f79a477776c14ea82f5055bbf3d0bc3a623b46e2a5a67a693f2558e920ff460b` |
| `public/assets/world/puzzle.webp` | `b5ac72ba5eb8ced88aced91ba2e1ae0643bb6cb0f7909d2067555657c7ba6050` |
| `public/assets/lobby/lobby_firepit.webp` | `d1b0798daca8b9047c2895c75911895a172f205cc617990ddce4df805023eb26` |
