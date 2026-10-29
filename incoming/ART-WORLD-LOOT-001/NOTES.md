# ART-WORLD-LOOT-001 intake notes

Base: `feature/fateweave-initial-prototype` at `e6dfc92415f2b9bbd76ae0257e30b307c13cecf5` (latest remote when fetched, 2026-10-15).
Delivery branch: `art/art-world-loot-001`. Assets are proposed for review only; no runtime integration.

## Runtime and anchors

Two sRGB RGBA WebP atlases, encoded at quality 85 / method 6 with explicit sRGB ICC profile. SVG colours are sRGB. PNGs are lossless 128px reference copies, not runtime dependencies.

- `chests/chests.webp`: 512x128; four horizontal 128x128 cells in order common, common open, rare, rare open. X offsets 0, 128, 256, 384; Y=0. Every frame has `footY=118`, anchor `(64,118)` in frame coordinates. Place the anchor at the ground point. All visible bounds end at exclusive Y=118 and have at least 4px frame clearance. Occupied widths 99-100px (77-78%). No cast shadows; the game supplies them.
- `items/items.webp`: 384x128; ore, ember, seal at X offsets 0,128,256. Centered inventory frames. JSON files map the exact frame rectangles.
- Eight HUD/button line SVGs use viewBox 0 0 24 24, no fill, currentColor stroke 1.8, round joins/caps. Only star-filled has currentColor fill. The two separate rank badges use gold/navy fill and navy outlines. No numbers or text are embedded in assets.
- `chest_*.png` and `item_*.png` are individual 128x128 review/source copies. The optional opening burst is not included.

## Palette and original production

Luminous Veil: navy #08121f / #0d1c2e / #14243a; champagne #d9bf86, highlight #f2d596, muted gold #8d7855; cyan #74d4ef; violet #9454d6. Painterly materials use shaded intermediate colours. White is #f4f7fc.

All seven painted objects were newly created with the built-in imagegen tool from task-specific descriptions, without named artists, games or studios. No art was imported from another repository or stock library. Closed common: weathered wood and oxidised teal-bronze with tiny cyan lock. Closed rare: pale stone, gold filigree and navy insets. Each open state was an imagegen edit of its own closed source, lifting the lid and emptying the cavity while dimming the lock. Ore: three cyan-white facets with internal star. Ember: amber coal with violet/cyan core and faint wisp. Seal: gold/navy ribbon medallion with abstract weave. All SVGs are newly authored paths, matching the shipped line grammar, not copied artwork.

Imagegen source identifiers (full-resolution originals remain in the local generation history; normalized 128px PNGs are supplied here):

| Frame | Imagegen source |
|---|---|
| chest_common | exec-0bbc891d-eb15-4261-a29b-38ef23890b28.png |
| chest_common_open | exec-2e432349-7570-409e-84c7-e0c2b7e76473.png |
| chest_rare | exec-be1b5825-35b2-4a76-8a04-ef2f96e57c8c.png |
| chest_rare_open | exec-9dcfe484-1418-48ff-8633-d274703f0d45.png |
| item_ore | exec-0cf9465b-15d7-4733-af00-825681e8542e.png |
| item_ember | exec-42373984-9b40-4d7c-8568-234da8228b15.png |
| item_seal | exec-2433e0d1-2c38-4e17-a210-f8eed92f868b.png |

Packaging removes imperceptible alpha=1 generator speckles, trims transparent margins, resamples with Lanczos, and places each chest at the shared ground baseline. It preserves generated transparency, without adding a matte or synthesising a shadow. No new illustration was substituted by procedural drawing. `tools/build.py` records packaging and SVG authoring; `render_icons.cjs` renders the actual SVGs with sharp; `validate.py` checks dimensions, bounds, frame alpha consistency, SVG grammar, runtime budget and source hashes. Tools are offline production helpers, not game code. The final PNGs allow atlas repacking without access to generation history.

## Review sheets

- `review/chests-on-map.png`: original tiles at 48px above and 64px below; left-to-right common closed/open, rare closed/open, existing decor and camp. Context art is review-only.
- `review/items-sizes.png`: ore/ember/seal columns; 128px,48px,32px rows, then eight SVGs at 24px and 15px on #0d1c2e.
- `review/greyscale.png`: desaturated copies of both sheets, then isolated chest frames at 40px for rarity/open-state comparison.
- `review/star-row.png`: actual first shipped portrait cropped circularly at 40px, with three filled and two empty 24px badges. Rank count stays live HTML.

Visual inspection: open cavities and pale rare versus darker rounded common remain distinguishable at 40px; three item silhouettes remain distinct at 32px; line icons read at 15px. No text, matte halos or visible stray pixels at delivery sizes. See STYLE_CHECK.md for deliberate simplifications and the generative open-frame surface variation.

## Existing art SHA-256

Verified against both the checked-out files and the original base Git blobs. Git diff must contain additions only inside this package.

- `public/assets/world/tileset.webp`: `38b3ba3719ce3534e1e5ecee1c4ec1aa52fb1bbb16a5a05d66852e11fdb49c33`
- `public/assets/world/decor.webp`: `4b09ba9340c464ea09a0b66c8eedb9f715696d2106ae5a87ec7c00505d436928`
- `public/assets/art/units.webp`: `d205b57d8a4082290a3a2e5a415407245106f948033cf3c66eb7b8e537393629`
- `public/assets/art/portraits.webp`: `f604b5f93c6526130546e194674d37f4e3265083908bbbb3448affadf4b70496`

## Byte budget

Runtime WebP + SVG total: **44,878 bytes** (limit 350,000 bytes). JSON, review PNGs, docs and production helpers are excluded from the runtime budget.

Total package (all files including this manifest): **868,838 bytes**.

| File | Bytes |
|---|---:|
| `chests/chest_common.png` | 22860 |
| `chests/chest_common_open.png` | 24695 |
| `chests/chest_rare.png` | 18365 |
| `chests/chest_rare_open.png` | 22757 |
| `chests/chests.json` | 421 |
| `chests/chests.webp` | 23710 |
| `icons/chest-open.svg` | 237 |
| `icons/chest.svg` | 260 |
| `icons/ember.svg` | 269 |
| `icons/ore.svg` | 258 |
| `icons/pack.svg` | 249 |
| `icons/seal.svg` | 299 |
| `icons/star-filled.svg` | 269 |
| `icons/star.svg` | 249 |
| `icons/star_badge.svg` | 330 |
| `icons/star_badge_empty.svg` | 330 |
| `items/item_ember.png` | 20376 |
| `items/item_ore.png` | 20088 |
| `items/item_seal.png` | 20443 |
| `items/items.json` | 246 |
| `items/items.webp` | 18418 |
| `NOTES.md` | 6534 |
| `review/chests-on-map.png` | 272551 |
| `review/greyscale.png` | 275182 |
| `review/items-sizes.png` | 90766 |
| `review/star-row.png` | 5855 |
| `STYLE_CHECK.md` | 3641 |
| `tools/build.py` | 5766 |
| `tools/document.py` | 5916 |
| `tools/render_icons.cjs` | 1151 |
| `tools/source-hashes.json` | 427 |
| `tools/validate.py` | 3264 |
| `tools/validation.json` | 2656 |
