# Asset Intake Review — ART-WORLD-FOG-002 (PR #6)

**Status: ACCEPTED_WITH_TECH_FIX** · reviewed 2026-10-15 · package `incoming/ART-WORLD-FOG-002/`

## Independent checks (decoded delivery files)

| Check | Result |
|---|---|
| 15 runtime WebPs, 128×128; fills RGB opaque, edges/corners/inner RGBA 0–255 | pass |
| PNG copies pixel-identical to the WebPs | pass |
| Fill seams: any of the 3 fills next to any other, both axes | 0 difference at the shared border (interior step ≈ 0.9) |
| Edge hidden side continues the fill (edge_n row 0 vs fill row 127) | 0 difference |
| Edge feather (edge_n alpha by row 0/30/60/90) | 255 / 197 / 72 / 0, so it reaches 0 at about 90 px |
| Edge tangential profile (x = 0 vs x = 127) | identical |
| Runtime budget | 86,708 B delivered; 76,300 B after the tech fix (limit 120 KB) |
| Existing `tileset.webp` / `decor.webp` SHA-256 | unchanged (`38b3ba37…`, `4b09ba93…`) |
| Files outside `incoming/ART-WORLD-FOG-002/` | none |

## Tech fix

The delivered fill averaged **#283e58**, and its darkest pixel (#20334c) was already brighter than the specified base **#16263d**. In game this read as a flat blue mat that did not settle into the night beyond the map edge.

`darken_fog.py` applies one per-channel RGB scale to all 15 files so the fill mean is #16263d. It leaves alpha, shared borders and seams unchanged (re-verified: 0 seam difference, edge-to-fill 0 difference). The untouched delivery stays in `incoming/`, and the runtime copies are in `public/assets/world/`.

## Integration

- `fogLayers` picks one of `fog_tile` / `fog_tile_b` / `fog_tile_c` per unexplored cell by `cellHash`. The choice is stable per cell.
- If **exactly two adjacent** cardinals are hidden, the cell draws `fog_inner_{ns}{ew}` instead of two stacked edges.
  - With one, three or four hidden sides, it uses the edge rule as before.
  - The outer-corner rule is unchanged.
- No runtime blur, filter, blend mode or animation was added. The optional `fog_wisps` was not delivered.
- Unit tests cover inner-corner selection and the use and stability of all three fills.

## In-game review

Screenshots: `fog-390x844.jpg`, `fog-844x390.jpg`, `fog-1366x768.jpg`. `before-delivered-fixed-1366.jpg` stacks three versions: the old fog, the delivery as supplied, and the delivery after the fix.

The square board read is gone. The explored area ends in a soft cloud edge, and the concave corners are round.

The encounter transition budget test at 390×844 normal motion measured 1071–1223 ms over 5 runs (budget 1500 ms). The full world browser suite passes, 52/52. Tested only in Chromium headless with touch emulation, not on iOS Safari or real devices.

## Known limitations

- The shared-border construction leaves a faint repeating rosette in large fogged areas. After the darkening it is barely visible at 60–90 px.
- The 90 px feather covers about 70% of the outermost explored ring, so a chest at reveal distance 3 is only partly visible until approached. One-cell corridors and isolated revealed cells cannot occur, because reveal radius 3 always opens a 7×7 square.
- Where the map ends, fog meets the off-map night gradient along a straight line. This is softer than before but still visible on wide screens.
