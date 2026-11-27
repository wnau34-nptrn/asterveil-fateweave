# ART-CHAR-BOSS-CH1-002

Production intake package, 2026-10-22. Owner approved all eight CH1-001 concepts in the task instruction. No runtime integration or merge is included.

## Files and contract

- `units_bosses_ch1.webp`: 1024 x 2048 RGBA, 2 columns x 4 rows, 512 x 512 cells, WebP quality 88. Transparent background, no cast shadows or ground.
- `portraits_bosses_ch1.webp`: 1024 x 2048 RGB, same cells/order, painted accent backgrounds, WebP quality 88.
- Matching JSON maps use the existing flat ID-to-frame format, with frame-local `footY: 496`. Portrait footY is retained for schema compatibility; portraits do not use a ground anchor.
- `preview.png`: exactly 390 x 844, eight separate encounter comparison bands in atlas order. Each band composites existing ruins pixels with the existing Knight at left and one boss at right. Frame sizes 64 / 96 px (1.5x), shared ground baseline. This compact review montage is not an actual runtime screenshot or a simultaneous eight-boss encounter.
- `portraits_source.png`: retained built-in imagegen output for reproducible packaging.
- `package.py`: deterministic resize, alpha cleanup, baseline placement, atlas and preview assembly. Pillow required. Run from this folder with `--portraits portraits_source.png`; approved concepts are read from the sibling `boss-ch1-work` checkout. Adjust SOURCE when using a different checkout layout.
- `validation.json`: source image SHA-256s, output alpha bounds and existing-art hashes.
- `PROMPTS.md`: built-in generation prompt record.

Order: lake_spirit, crystal_giant, swamp_witch, flame_general, ancient_guardian, fate_shadow, vargoth_armoured, vargoth_unleashed. All face LEFT; Knight faces RIGHT.

## Design preservation and provenance

Approved source branch `art/art-char-boss-ch1-001`, commit `182eae02e31836b4d90227a64d97519fbf8c319b`. Full-body artwork is directly derived from the eight approved transparent concepts, preserving their complete silhouette, palette, pose, chibi proportions and outlines rather than generating a redesign. Downsampling consolidates fine detail for the runtime frame. Source alpha below 12/255 is cleared before measuring bounds, then antialiased alpha is retained. Each figure fits within 480 x 472 before placement. The lake spirit's lowest water curl extends three pixels below her sole; the sole remains at y=496. Other frames align their lowest boot/foot pixel to y=496.

Portraits generated with the built-in imagegen tool from the approved lineup and existing project portrait style reference. A targeted second pass corrected both Vargoth portraits to the approved male identity and left-facing angle. First-pass Vargoth portraits were rejected and are not included. No external project assets were consulted or imported.

Palette locks: lake spirit moon white/cyan/deep teal; crystal giant ice blue/indigo/pale gold; swamp witch moss jade/aubergine/yellow-green/amber; flame general soot iron/copper/ember/dark red; ancient guardian ivory/aged bronze/cyan; fate shadow navy/muted blue/silver lilac, empty faceless hood; Vargoth black violet/purple/aged gold/lavender, phase 2 brighter violet threads.

## Validation and limitations

- Visually inspected source concepts, output atlas, corrected portrait sheet and compact arena montage. Silhouettes and equipment preserved; no text, labels, UI or baked shadows in runtime images.
- Exact atlas and preview dimensions, frame ordering and JSON coordinates checked with Pillow. Decoded unit alpha stays inside each cell with transparent outer padding.
- Combined runtime WebP total is below 2,000,000 bytes; final byte totals are recorded in the PR.
- Portraits retain face/helmet/hood readability at small size; ornate energy and crystal detail naturally merges at compact sizes. Fate shadow intentionally has no face or eyes.
- These are single idle frames, not animations. Preview is a comparison montage, not engine/browser validation. No gameplay code changed, so gameplay test suite was not run.
- Only files inside this incoming package were added. Existing art was checked against the base branch and is unchanged. Exact SHA-256 values follow and also appear in validation.json.

| Existing public/assets/art file | SHA-256 |
|---|---|
| units.webp | d205b57d8a4082290a3a2e5a415407245106f948033cf3c66eb7b8e537393629 |
| portraits.webp | f604b5f93c6526130546e194674d37f4e3265083908bbbb3448affadf4b70496 |
| units_foes.webp | dcf79e09f2b0b813aa03894bd65222ae3afb2df875e84870d1dba968c49a1895 |
| ruins.webp | a06f910462fb69b1a38d94c1a169274f8b28d559286ec6ae3fc7ac3db61e7868 |

Ready for Claude Asset Intake Review.
