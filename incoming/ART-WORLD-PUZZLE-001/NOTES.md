# ART-WORLD-PUZZLE-001

Painted puzzle pieces for Asterveil · Fateweave. Prepared from base commit
`6e66831fd256f6e61b81124b14aa321406f48a23` on
`feature/fateweave-initial-prototype`, following its full handoff.

## Delivery

- `puzzle.webp`: **79,522 bytes**, 640×512 RGBA, five columns × four rows,
  128×128 cells, WebP quality 85, embedded sRGB ICC profile.
- `puzzle.json`: direct frame-id map with x/y/w/h/footY.
- `puzzle/`: 19 individual 128×128 RGBA PNG masters, embedded sRGB.
- `review/`: labelled checkerboard, greyscale checkerboard, four 7×5 map patches,
  and the same patches at actual tile sizes 36, 48 and 64 px.
- `validation.json`: export metadata and protected-file SHA-256 values.

The brief says “20 frames” but enumerates **19 named frames**. This delivery
preserves their exact order and leaves cell 20 (512,384) transparent. There is
no invented twentieth puzzle type or JSON id for the unused cell.

## Placement and state registration

Props use bottom-centre registration with footY 116. Pits, wall replacements,
the crack overlay and standalone emblems use footY 128. Emblems are visually
centred and intended for centre anchoring inside sockets, rather than prop
placement. The six rune stones are about 90 px wide; boulder about 109 px.

Rune lit states reuse the exact unlit stone geometry and alpha, compositing
only the generated cyan engraving and restrained bloom inside the silhouette.
The lever states share their fixed plinth pixels below y=82. Their handle
angles differ independently of their red-orange/green knobs. Both pit states
share their outer rim. Filled stone is inset within that rim.

The wall replacements reuse the **original wall_face pixels** along the top
five rows and outer six columns. These boundary pixels match exactly in the
lossless masters; normal quality-85 WebP compression can slightly alter RGB.
Door and passage apertures are transparent through the bottom edge. Closed
doors remain opaque. Door sockets/slots contain no baked emblems. Emblems in
the map review are separate composited instances to demonstrate game placement.

The crack hint is a sparse, low-opacity overlay, not a replacement wall. Place
it over wall_face. Replace the whole wall with crack_open after discovery.

## Protected originals (SHA-256)

Verified against the fetched base branch and again after export:

| File under public/assets/world/ | SHA-256 |
|---|---|
| tileset.webp | `38b3ba3719ce3534e1e5ecee1c4ec1aa52fb1bbb16a5a05d66852e11fdb49c33` |
| decor.webp | `4b09ba9340c464ea09a0b66c8eedb9f715696d2106ae5a87ec7c00505d436928` |
| chests.webp | `f79a477776c14ea82f5055bbf3d0bc3a623b46e2a5a67a693f2558e920ff460b` |

## Production provenance

Generated with the built-in image_gen tool, followed by sprite extraction,
registration, removal of atlas-boundary contamination, state compositing,
reuse of existing wall boundary pixels, colour-managed export and review-sheet
assembly. No CLI/API generation and no assets from another repository.

Generation prompt specification: one transparent five-column/four-row atlas,
19 sprites in the handoff's exact order, last cell empty; painted 3/4 overhead
JRPG decor matching the viewed tileset/decor references, top-left lighting,
worn pale stone and aged teal-bronze; three carved grey-blue rune stones and
their #8ef0ff lit states; left/red-orange and right/green levers on a shared
plinth; round mossy boulder; open and level-filled square pits; three-socket
stone rune door, two-slot iron-bound wood door, open arch; sparse faint violet
hairline crack overlay; broken stone passage; centred cyan four-point star,
crescent and sun emblems. No floor under props, cast shadows, text, letters,
numbers, logos, watermark, characters, UI, pixel art, 3D, photographs, veils,
curtains, barriers or extra props. All content inside its cell.

Final edit prompt: preserve the source atlas's layout, perspective, style,
positions, colours and transparency; change lever-door circles to two empty
keyhole-like slots; reduce the crack overlay to subtle hairlines; make filled
pit flat and level; remove intact ornate columns from the broken passage and
keep rubble at the sides with a transparent walkable centre. Preserve the
19-frame order and empty last cell.

## Validation limits

Reviewed visually as exported sprites, greyscale states and real-tileset map
composites at 36/48/64 px. Technical checks verified dimensions, frame order,
PNG/WebP alpha, embedded profile, spare-cell transparency, rune registration,
shared lever plinth, wall-edge pixels, transparent apertures, protected hashes
and path scope. No game code changed; these are static art reviews, not
browser gameplay or device tests. Claude performs final Asset Intake Review.
