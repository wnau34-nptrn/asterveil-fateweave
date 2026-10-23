# ART-UI-RUNE-001 — rune icons

Twelve original socketable carved mineral gems for Asterveil · Fateweave. Artwork only; conditional meanings are descriptive, not new combat rules. No flat stats or SPD bonus. Source references: docs/MASTER_PLAN_TH.md section B, public/assets/ui/equip/gear_items.webp, and public/assets/world/puzzle.webp. No rune SVGs were present. The map puzzle stones were inspected only to keep their floor-stone presentation distinct from these inventory gems.

## Files and integration

- `rune_*.png`: twelve 256 × 256 RGBA icons; family is carried by mineral colour, never rarity.
- `runes.webp`: lossless RGBA atlas, 1040 × 780, four columns by three rows, 260 px stride, 2 px transparent padding per cell.
- `runes.json`: hash-format frame metadata; frame names match rune ids without extensions. Coordinates are pixels, top-left origin; no rotation or trimming. Use clamp sampling and avoid mipmaps that cross cells.
- `rune_socket_empty.png`: 96 × 96, dark recessed cavity.
- `rune_socket_filled_frame.png`: 96 × 96, transparent centre. Draw the selected gem beneath the frame, centred at 48,48. A gem canvas around 76 × 76 covers the opening while allowing the rim to overlap its edges. The metal rim is a neutral socket fitting, not a rarity frame.
- `preview.png`: native-size 24/40/56 px icons on dark and light panels, plus sockets at 96 px. Review at 100% image scale.
- `validation.json`: dimension, alpha and atlas frame checks.
- `PROMPTS.md`: exact generation prompt set and production method.

## Rune mapping

| id | family / colour | conditional meaning | glyph design brief |
|---|---|---|---|
| rune_guard | defence / blue | when guarding gain a shield | a broad cupped angular groove enclosing a floating short lozenge |
| rune_mark | utility / violet | hitting a marked foe ticks a cooldown | two offset inward hooks surrounding a single sunken lozenge |
| rune_opening | offence / red | first round damage up | three rising unequal wedges bursting from a short curved base |
| rune_mend | support / mint | healing grants resistance | two interlocking curved troughs sheltered by a small angled cap |
| rune_thorn | offence / red | reflect when hit | a bent central spur with three alternating hooked barbs |
| rune_echo | utility / violet | repeat a small part of the first skill | one large hooked arc followed by a smaller nested hooked arc |
| rune_focus | support / mint | support power on full HP | three thick inward curved segments surrounding a solid oval core |
| rune_last | offence / red | damage up below half HP | a split slanted slab glyph with a glowing lower jagged wedge |
| rune_ward | defence / blue | start with a barrier | two wide stacked canopy-shaped angular grooves above a solid pebble |
| rune_swift | utility / violet | act effects on the first turn, no SPD | two swept tapered hooks leaving a short separated dash behind |
| rune_leech | support / mint | heal on defeating a foe | two opposing inward bent channels pouring into a lower teardrop hollow |
| rune_veil | defence / blue | resist energy once per battle | three staggered curtain-like curved grooves deflecting around an offset small lozenge |

## Production and handoff

Generated with the built-in imagegen tool, one separate request per asset. Glyphs were requested as original abstract carvings without real-world alphabets or religious symbols. No other game or project's art was supplied or imported. No text, logos, watermarks or rarity borders were requested in any icon. Export operations only crop transparent outer margins, centre, downsample with Lanczos, and pack; preserve generated alpha. Generated working masters remain outside the repository in the tool output directory.

All delivered files belong under incoming/ART-UI-RUNE-001/. No runtime integration, gameplay changes or publication are included. The PR targets feature/fateweave-initial-prototype and must remain unmerged. Handoff notes are kept here to respect the requested path restriction.


## Validation completed

Inspected the final atlas and preview at 24/40/56 px on both light and dark panels. All twelve glyphs are distinct, with no text or rarity borders. Verified all icon dimensions and full alpha range, exact atlas frame pixel matches, lossless WebP alpha, both 96 px sockets, and a transparent filled-frame centre. Broad glyphs remain identifiable at 24 px; use the id and effect description in surrounding accessible UI. Artwork quality remains subject to owner review. No gameplay tests were needed for this incoming-only asset package.
