# ART-SKILL-ICON-002 — painted Attack

Original AI-assisted artwork created with built-in ImageGen on 2026-10-22. Reviewed ART-SKILL-ICON-001-R1 notes, shared prompts, preview and Guard artwork for style. Only that Fateweave pack was used as a reference. Art intake only; no runtime integration or merge.

## Delivery

- `png/attack.png`: 256×256 RGBA with genuine transparency; one silver steel sword mid-slash with warm gold fittings, a dark neutral grip and one short white-gold arc. Broad painted material faces, substantial dark contour and top-left light follow R1 without class-specific colour.
- `preview.png`: 1240×540 navy `#0b1730` review sheet. Three size blocks (40, 56, 72 px); Attack appears beside the unchanged R1 Guard, Mark, Bolt and Heal references. Each row contains normal / cooldown pairs. Cooldown is a black circular overlay at alpha 156/255 (rounded 61%), matching R1. Labels are preview-only.

## Measured bounds

Coordinates have exclusive right/bottom edges, matching R1. Opaque means alpha >=128/255.

| Measurement | Value |
| --- | --- |
| Opaque bbox (x0,y0,x1,y1) | 77,29,202,227 |
| Opaque width × height | 125 × 198 px |
| Longest opaque extent | 198 px |
| All nonzero-alpha bbox | 75,28,205,229 |
| Maximum nonzero-alpha radius from (127.5,127.5) | 106.332 px |
| Required safe-circle radius | 112 px |

Export removes only sub-visible alpha dust below 4/255, rotates the complete motif 25 degrees counterclockwise to retain a long sword inside the circular safe area, uniformly resamples with Lanczos and translates to its enclosing-circle centre. No circular clipping mask was used. The original generated alpha is preserved apart from dust cleanup and resampling. Transparent pixels have cleared RGB.

## Generation brief and provenance

Built-in ImageGen, style reference: R1 `png/guard.png`. Brief: original painted fantasy JRPG Attack icon; one clean steel sword diagonally mid-slash, neutral silver blade, restrained warm gold crossguard/pommel, dark grip, one short white-gold arc; crisp bevels, bold dark contours, top-left light, broad readable masses, genuine transparency, no characters, hands, additional swords, scenery, text, frames, UI or watermark. Intended for a 256 px export, 190–205 px motif and centered 224 px safe circle, readable at 40 px under 61% black cooldown.

Targeted follow-up preserved the sword and shortened the initial wrapping arc to a compact arc behind the blade, removing the arc below the pommel. Final generated source filename: `exec-82f09fa4-ab54-4841-8146-64e29c6541c2.png`. Generated originals are not runtime dependencies.

## Verification and handoff

Validated dimensions, RGBA mode, transparent and opaque pixels, opaque extent and every nonzero-alpha pixel against the safe circle. Visually inspected the final 256 px icon and all native 40/56/72 px normal/cooldown comparisons. The single sword and short arc remain identifiable at 40 px including cooldown. Artistic acceptance remains with the owner.

Only these three new files are delivered under this intake folder. Gameplay tests are not applicable to isolated raster exports. The consumer can later map the shared Attack action to this asset in a separate integration change.
