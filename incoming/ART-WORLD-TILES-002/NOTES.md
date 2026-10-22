# ART-WORLD-TILES-002 — map 2 forest intake

Original artwork for Asterveil · Fateweave, 2026-10-22 (Asia/Bangkok).
Approved ART-WORLD-KEYART-001 map-2 direction: pale olive trail, deeper olive grove, dark teal canopy and roots, mossy limestone, cyan fungus and lantern moss, restrained violet corruption. Warm upper-left light; top-down floors and gently tilted wall faces. No runtime integration is included.

## Files

- `tiles_forest.webp` / `tiles_forest.png`: 512×384 RGBA atlas, eleven 128×128 frames. The last cell is transparent unused padding.
- `tiles_forest.json`: direct frame-name → `{x,y,w,h}` map matching the shipped atlas schema. `forest_0`–`forest_3`, `grove_0`–`grove_3`, `forest_wall_top`, `forest_wall_face`, `forest_wall_inner`.
- `decor_forest.webp` / `decor_forest.png`: 512×256 RGBA atlas, eight 128×128 frames. Transparent backgrounds and arch opening; no baked floor squares.
- `decor_forest.json`: roots, thorn_arch, teal_fungus, fallen_log, lantern_moss, rift_touched_stump, fern_clump, stone_marker. Each has `{x,y,w,h,anchor,footY,zone}`.
- `preview.png`: exactly 390×844, a mechanical map composition at 60 px per tile, using actual map-2 grid geometry with a horizontal camera crop. This is an asset preview, not a runtime screenshot or proposed HUD. The ring indicates party position; camp/boss/goal landmarks and fog are omitted so the surfaces remain visible. Grove placement illustrates material grouping, not a new gameplay zone or changed collision.
- `seam_review.png`: 1024×768, mixed floor variants, a wall strip and all eight props over floors at source scale.
- `validation.json`: dimensions, frame counts, exact opposite-edge checks, transparent bounds, mean luminance and combined WebP bytes.
- `sources/`: two original generated source sheets. `PROMPTS.md` records generation prompts. `package_assets.py` packs, normalizes and validates the assets with Pillow/numpy.

## Integration contract

The existing map-2 `thicket` floor currently selects old art. Intake must explicitly choose the new forest/grove atlas and frame mappings; these files do not activate themselves. Use forest on the clear route and grove for coherent deeper pockets, avoiding a checkerboard mix. They are visual materials, not new rules. Retain the existing camp-ground and landmark assets when integrating.

Walls follow the shipped selector: use forest_wall_face when the tile immediately south is walkable, forest_wall_top next to other walkable cells, and forest_wall_inner inside wall masses. The face depicts a south-facing cliff. No autotiling engine or extra edge pieces are required. Distinct wall types have deliberate material transitions; their different edges are not claimed to be interchangeable. Each wall frame repeats seamlessly with itself.

All frames use square 128 px source coordinates; floor and wall frames are opaque. Each floor family has a shared perimeter, so every variant can meet every other variant in that family on either axis. Forest-to-grove is a deliberate material boundary; the two families do not share identical perimeter pixels. Generated boundaries were mechanically blended in a 12 px band, opposite boundaries normalized in a 10 px band. Lossless WebP preserves visible pixels and alpha exactly, including seam pixels; do not re-encode these as lossy WebP without rechecking seams. Keep smoothing on and round screen tile positions to integer pixels as the runtime does.

Decor anchor is normalized `(0.5,1)`, matching existing decor. The visible sole ends at source `footY:124`, leaving 4 px bottom padding; the art fits inside x=8..120 and does not overhang adjacent frames. Keep sparse props off route centres and interactive/puzzle cells. The thorn arch is decorative only and does not create a passage mechanic. No added baked shadow extends outside a cell; directional shading is painted into the object.

The current `tileSizeFor` uses portrait width / 6.5, clamped 44–96 px: 390 px → 60 px. Preview uses this exact tile size. The original handoff's 36–64 px guidance is a readability target; the shipped renderer's current scale controls the preview.

## Validation and provenance

Visually inspected both generated sheets, final transparent atlas, mixed seam review and phone composition. Automated checks cover 11 tile frames, 8 decor frames, exact self-repeating opposite edges, all pairwise boundaries within each floor family, transparent frame margins and lossless WebP/PNG visible-pixel equality. Mean luma is approximately 132–143 for trails, 85–88 for groves, and 42–68 for walls. Both walkable families remain lighter than every wall type. Combined runtime atlases are 491,276 bytes, below the original 2.5 MB world-art budget; fallback/source/review files are intake-only.

Original assets generated with the built-in image tool; no stock textures, third-party artwork, fonts, other-project assets or external licence dependencies. Reference inputs were this repository's current tile/decor atlases and the approved map-2 keyart/prop study. The palette and tile-mood references were visually reviewed. Sources were generated at 1448×1086 (tiles) and 1774×887 (props); final cells are downsampled to 128 px. No lettering, logo, watermark or UI is baked into the artwork.

Rebuild from this folder with a Python environment containing Pillow and numpy:

```powershell
python package_assets.py sources/tiles_generated.png sources/decor_generated.png
```

The script reads the map definition from the repository for the preview only. It writes only into this package. Checks appropriate to this artwork-only change are the asset validation, visual review, added-files scope check and `git diff --check`; gameplay tests are not applicable. Owner intake remains the visual acceptance point. Leave the PR unmerged.
