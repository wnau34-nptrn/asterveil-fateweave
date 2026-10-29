# ART-SKILL-ICON-001-R1 — painted skill icon revision

Original AI-assisted artwork revised with built-in ImageGen on 2026-10-22. Reference: round 1 on `art/art-skill-icon-001`, commit `33da1056b4f74143f492263da17339d800ae7a66`. Reviewed its PNGs, preview, prompts and notes before production. This delivery contains art only and awaits owner artistic acceptance; no runtime integration or merge.

## Revision details

1. **Scale:** every icon was uniformly normalized to a 190–205 px longest opaque bounding-box dimension, with every nonzero-alpha pixel inside the centered 224 px circle. Original aspect ratios remain intact. Needle/spear angles and the compact placement of Hinder, Weakshot and Quake were revised to satisfy both constraints without cutting off artwork.
2. **40 px readability:** larger painted masses, reduced small sparks/filigree, strong dark contours, brighter material faces and clearer solid-versus-glow separation. The top-left light, painted finish, warm gold trim and all ten palette families follow round 1. Full-resolution atlas and every native 40 px normal/cooldown icon were visually inspected. The final preview also includes 56 and 72 px comparisons. Cooldown uses black alpha 156/255 (rounded 61%) over navy `#0b1730`.
3. **Silhouette pairs:** Guard has one kite shield in front of one ally bust; Rally has a broad fan of three shields and three ally busts. Taunt is a floating angular challenge sigil with two shout-wave arcs; Quake is grounded fractured rock with an upward burst and its small original hammer. Volley is a separated descending diagonal arrow fan; Evade is one navy scout sidestepping with a trailing blue blurred afterimage. All three pairs were checked at native 40 px in normal and cooldown views; their forms remain distinguishable without relying on their palette differences.
4. **New Knight skills:** Challenge is one gauntleted sword pointed at a single target marker. Bulwark is a rectangular tower shield planted in a heavy stone-block base. Rouse is a raised golden-cloth banner with royal blue insignia/edging and rising mint recovery light, without resurrection imagery. All use the original Knight royal-blue/silver/gold family, painted materials and top-left light.
5. **Provenance:** `sources.json` maps IDs to generated original file names only. No local paths or user names. `prompts.json` records the shared brief, per-skill motif/palette, follow-up edits and normalization rules. Generated originals are not runtime dependencies.

## Delivery and validation

- [x] Exactly 33 PNGs, each 256×256 RGBA, true alpha with transparent and fully opaque pixels.
- [x] Every longest opaque extent is 190–205 px; measured values appear below.
- [x] Every nonzero-alpha pixel is inside radius 112 px from (127.5,127.5).
- [x] Requested pairs visibly differ at 40 px, including under the cooldown overlay.
- [x] New Knight icons follow the round-1 family.
- [x] Atlas order, mapping and decoded cells validated; sources contain file names only.

`skills_atlas.webp` is lossless RGBA, 1536×1536, six columns and six rows of 256 px cells. The first row is exactly `guard, bash, rally, challenge, bulwark, rouse`; the remaining 27 follow round-1 order. Last three atlas cells are empty transparent cells. `skills_atlas.json` retains round-1 schema (`order` plus `frames[id]` index/column/row/x/y/width/height). Every decoded atlas cell was compared byte-for-byte against its PNG.

`preview.png` is 2480×1320 on navy, with the same class-row, size-block and normal/cooldown-pair structure as round 1; width increases to fit all six Knight icons. Review labels exist only on the preview. No icon or atlas contains labels, numbers, frames or UI.

Packaging removes only sub-visible alpha dust below 4/255, uses uniform Lanczos resampling and enclosing-circle centering, and clears invisible RGB for exact lossless atlas comparison. No circle mask clips visible effects. No gameplay files or round-1 files are changed; gameplay tests are not applicable to these isolated raster exports. PNG metadata was checked separately from visual review; passing measurements does not replace owner visual acceptance.

## Measured bounds

Opaque means alpha ≥128/255. Extent is the longer of width/height, preserving narrower dimensions of elongated motifs. Bounding coordinates use an exclusive right/bottom edge. Safe radius includes **all** remaining nonzero alpha, including effects.

| ID | Opaque bbox (x0,y0,x1,y1) | Width × height (px) | Extent (px) | Max alpha radius (px) |
| --- | --- | --- | --- | --- |
| guard | 29,27,227,222 | 198 × 195 | 198 | 102.823 |
| bash | 21,22,219,206 | 198 × 184 | 198 | 108.897 |
| rally | 33,30,222,227 | 189 × 197 | 197 | 99.982 |
| challenge | 28,42,226,206 | 198 × 164 | 198 | 105.643 |
| bulwark | 29,20,227,200 | 198 × 180 | 198 | 108.593 |
| rouse | 43,37,221,234 | 178 × 197 | 197 | 109.144 |
| mark | 32,29,224,226 | 192 × 197 | 197 | 99.501 |
| execute | 20,55,216,231 | 196 × 176 | 196 | 111.214 |
| finisher | 22,29,208,226 | 186 × 197 | 197 | 108.086 |
| bolt | 57,34,189,224 | 132 × 190 | 190 | 108.731 |
| ward | 28,27,226,219 | 198 × 192 | 198 | 104.530 |
| sigil | 32,45,229,228 | 197 × 183 | 197 | 110.247 |
| heal | 29,29,227,225 | 198 × 196 | 198 | 100.551 |
| prayer | 36,27,219,225 | 183 × 198 | 198 | 102.482 |
| sanctuary | 29,28,226,219 | 197 × 191 | 197 | 99.602 |
| brace | 55,32,213,230 | 158 × 198 | 198 | 103.897 |
| pierce | 27,65,225,179 | 198 × 114 | 198 | 105.444 |
| spearwall | 26,23,224,220 | 198 × 197 | 198 | 106.125 |
| hinder | 42,28,218,226 | 176 × 198 | 198 | 99.511 |
| volley | 41,31,232,216 | 191 × 185 | 191 | 109.108 |
| weakshot | 26,33,225,227 | 199 × 194 | 199 | 104.769 |
| acid | 28,30,224,229 | 196 × 199 | 199 | 110.826 |
| haste | 38,31,233,228 | 195 × 197 | 197 | 110.826 |
| bomb | 29,34,212,224 | 183 × 190 | 190 | 110.048 |
| ambush | 27,27,226,220 | 199 × 193 | 199 | 102.189 |
| evade | 31,36,229,196 | 198 × 160 | 198 | 103.356 |
| backstab | 28,47,226,223 | 198 × 176 | 198 | 106.689 |
| taunt | 28,58,226,194 | 198 × 136 | 198 | 102.647 |
| slam | 30,46,229,222 | 199 × 176 | 199 | 104.702 |
| quake | 24,41,223,220 | 199 × 179 | 199 | 106.811 |
| valor | 20,34,212,226 | 192 × 192 | 192 | 109.611 |
| mend | 25,47,223,231 | 198 × 184 | 198 | 105.387 |
| finale | 27,42,226,224 | 199 × 182 | 199 | 104.195 |
