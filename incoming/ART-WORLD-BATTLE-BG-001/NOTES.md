# ART-WORLD-BATTLE-BG-001

Original battle backdrops for map 2 (forest trail) and map 3 (crystal rift scar), 2026-10-22. Artwork intake only; no runtime integration. Leave the PR unmerged.

## Files

- `bg_forest.webp`: 1536×1024, opaque RGB. Moss-sand clearing, teal foliage, thorn arches, mossy roots, edge fungus light and distant rift glow.
- `bg_riftline.webp`: 1536×1024, opaque RGB. Violet crystal scar, star-filled sky and quiet stone floor with subdued seams.
- `preview_forest_390x844.png`, `preview_riftline_390x844.png`: phone composition checks with four placeholder heroes on the left and four foes on the right.
- `preview_forest_1366x768.png`, `preview_riftline_1366x768.png`: desktop composition checks. The current game uses a centred 480px portrait frame on desktop; these intentionally preserve that behavior.
- `PROMPTS.json`: complete built-in image generation and refinement prompts.
- `build_previews.py`: reproducible WebP export and placeholder composition builder (Pillow).
- `validation.json`: dimensions, opacity, byte sizes and preview geometry.

## Placement contract

Use the existing `riftBackdropFrame` behavior: 1536×1024 reference dimensions, artwork horizon approximately 45% down, anchored at 27% of the field. Do not use a simple viewport cover crop. Upper scenery and side framing carry the visual detail; the lower floor remains continuous and free of raised props at the actors' soles. Crystal seams are deliberately subdued to preserve HP and target-ring readability.

Previews are deterministic art-review composites, not screenshots or a claim of runtime integration. They use the exact backdrop scale/anchor formula from `src/game/visuals/rift-backdrop.ts`, approximate field boxes of (6,152,378,454) on phone and (6,152,468,378) on desktop, and the existing continuous-scene dimming gradient. The current runtime has six field slots; the two additional enemy positions are not implemented here. The requested eight-actor stress test mirrors the allied two-pair layout onto the enemy side. Rings and HP-bar samples are preview overlays only. Actual sprites, labels, status rows and final UI must be checked during integration.

## References and provenance

Read `public/assets/art/ruins.webp`, `src/game/visuals/rift-backdrop.ts`, `src/game/visuals/field-layout.ts`, battle CSS and `docs/handoffs/ART-PLACEMENT-RULES.md`. The shipped backdrop supplied camera, floor-band and painting-quality reference. Forest palette/material reference: `keyart_2.png` and `palette_2.png` on `art/art-world-keyart-001`; deep teal #102C32/#24515A, moss #64724A/#A4A774, sand #D2C79D/#E6DCB8, teal light #74D4CE, bark #77534A. That package's historical notes label its concepts awaiting approval; this task explicitly directs use of that palette.

New original artwork generated with the built-in image tool and visually refined; no external-project assets were used. WebP conversion and previews are mechanical Pillow operations. No characters, UI, text, rings or bars are baked into the two backdrops. Original generated PNGs remain in the tool's generation folder; only deliverable WebPs and review artifacts are committed.

## Validation

Both exported backdrops and all four previews were visually inspected: clear sole areas, readable ring/HP samples, no writing or baked characters. Mechanical checks passed for exact dimensions and RGB opacity. Eight silhouettes appear per preview. `git diff --check` and the added-files-only scope check passed. Gameplay code is unchanged; these composites do not replace an integration playtest.
