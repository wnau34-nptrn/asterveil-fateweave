# ART-WORLD-FOG-002 — asset intake

Original painted cold-night cloud fog for Asterveil · Fateweave. Asset-only delivery based on feature/fateweave-initial-prototype at 9191d74. All additions are inside this package. Existing runtime art and application code are unchanged.

## Delivered

15 runtime WebPs, each 128×128, with matching PNG copies: three opaque RGB fills, four RGBA edges, four RGBA outer corners and four RGBA inner corners. fog.json maps every runtime file and its PNG counterpart. Lossless WebP is used rather than quality 85 to preserve decoded shared borders exactly. Embedded sRGB ICC profiles are included in both formats. Runtime total: **86,708 bytes** (84.68 KiB; below even a decimal 120,000-byte budget).

| WebP | Bytes |
|---|---:|
| fog_corner_ne.webp | 4160 |
| fog_corner_nw.webp | 3992 |
| fog_corner_se.webp | 3952 |
| fog_corner_sw.webp | 4052 |
| fog_edge_e.webp | 6438 |
| fog_edge_n.webp | 6152 |
| fog_edge_s.webp | 6118 |
| fog_edge_w.webp | 6492 |
| fog_inner_ne.webp | 7838 |
| fog_inner_nw.webp | 7690 |
| fog_inner_se.webp | 8044 |
| fog_inner_sw.webp | 7768 |
| fog_tile.webp | 4684 |
| fog_tile_b.webp | 4644 |
| fog_tile_c.webp | 4684 |

## Palette and alpha

Midnight base #16263d; cloud tones trend toward #2a4363–#36516e, within the requested cool range. No cyan glint is added. No props, lights, terrain, characters, text, logos, grain or borrowed repository art appears in the runtime fog. Reference sheets alone composite the existing terrain and decor.

The three fill interiors vary, while all four boundaries share identical decoded RGB pixels, including corners. Fill pixels are opaque (RGB; decoded alpha 255). Cloud source is blended into a common symmetric boundary texture with a smooth interior envelope; no runtime blending is required.

Edges have a fully opaque 3-pixel hidden-side strip. The cubic feather reaches alpha zero at about 90 px (70.3% of the cell); painted luminance and periodic lateral displacement add cloud irregularity. Tangential boundary profiles are identical at both sides. Alpha is stored at 64 levels in an 8-bit channel; no runtime filter, blur, animation or blend mode is required. RGB is straight/unassociated alpha, with zero RGB only at completely transparent pixels. Partial-alpha pixels retain navy cloud colour; no light matte is baked in.

Outer corners are quarter puffs: most visible material lies within about 77 px (60%); a faint feather continues to 90 px so both side profiles meet the edge images exactly. Boundary RGB also matches; no clipping outside the cell.

Inner corners ARE delivered. For exactly two adjacent hidden cardinals, replace both edge layers with fog_inner_{dir}. Do not stack the corresponding two edges on top. The mask is max(a,b) + .22*min(a,b)*(1-max(a,b)), reducing double darkening and rounding the concavity. With three or four hidden cardinal sides, retain the original edge rule (no ambiguous pair selection). Preserve the existing diagonal-corner eligibility rule and CSS first-layer-on-top order.

Optional fog_wisps.webp is deliberately skipped. This package needs no animated layer.

## Review layout and validation

fog-on-map-60.png and fog-on-map-90.png have six panels, in reading order: 7×7 revealed square; L-shape; staircase diagonal; enclosed hidden cell; isolated revealed cell; one-cell-wide corridor. Cell interiors are rendered at exactly the named size; sheets may need opening at 100% instead of fit-to-window. Real terrain and decor crops are used. These are offline reference composites, not in-game screenshots or a frame-time benchmark.

before-after.png: old fog above, new fog below, same geometry and crops. greyscale.png: new 60 px sheet. current-layer-rule-60.png additionally shows current cardinal stacking without the inner replacement.

seams.png: deterministic random 8×8 fill grid; all nine ordered fill pairs horizontally and vertically at 4×; every directional edge, outer corner and inner corner at 4× on light/dark underlays; then directional neighbourhood joins at 4×. joins-4x.png is also supplied separately for convenient inspection. No labels are baked into any image. Directional inspection rows are N/E/S/W, NE/NW/SE/SW outer, NE/NW/SE/SW inner; split-underlay rows use edge N/E/S/W then outer NW/NE/SW/SE then inner NE/NW/SE/SW.

69 automated checks passed against decoded delivery images: exact 128 px dimensions, WebP/PNG pixel parity, every fill pairing, opaque edge borders, fill continuation and outer-corner/edge alpha matches, runtime budget. validation.json records results and byte counts. Visual review covered both map scales, before/after, greyscale, 4× joins and light/dark overlay mattes. Existing tracked-file diff is empty outside this incoming folder.

Known renderer consequence: opposing 90 px feathers substantially cover a one-cell corridor and an isolated revealed cell. This is shown honestly in the requested review shapes; inner replacements only apply to exactly two adjacent sides. Claude should assess gameplay readability during intake and measure phone frame-time after integration. A square reveal remains broadly square, with a soft cloud feather rather than a hard boundary.

## Existing SHA-256

- tileset.webp: 38b3ba3719ce3534e1e5ecee1c4ec1aa52fb1bbb16a5a05d66852e11fdb49c33
- decor.webp: 4b09ba9340c464ea09a0b66c8eedb9f715696d2106ae5a87ec7c00505d436928

## Production provenance and prompt

Built-in image_gen produced an original opaque painted material source. Offline normalization/cropping, shared-border construction, palette reduction, alpha construction, rotations and compositing produced the delivery cells and review sheets. No external art was imported. No named artist, studio or game style was requested.

Prompt: "Use case: stylized-concept. Generate one square seamless painted fog texture source for Asterveil Fateweave browser JRPG. Full canvas opaque cold night veil cloud material, flat top-down texture, no horizon or perspective. Soft hand painted layered swirling mist, broad delicate brushwork and wispy billows, dark muted midnight blue base #16263d, understated lighter cloud folds #2a4363 to #3a5878. Keep contrast restrained and cloud features readable when reduced to 128 pixels. Texture must cover entire square, tile in both axes; avoid a central vignette, uniform border or framed composition. No photo texture, no noise grain, no hard outlines. No terrain, rocks, props, light sources, stars, characters, text, letters, numbers, logos or watermark. Original art. This is a material source, not an illustrated scene."
