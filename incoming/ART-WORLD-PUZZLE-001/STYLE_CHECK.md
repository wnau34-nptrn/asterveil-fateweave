# Style and intake checks

- [x] Painted 3/4 overhead treatment, soft material variation, top-left light,
  and thin contours compared with existing decor and chests.
- [x] Worn pale stone, mossy grey boulder, aged teal-bronze lever mechanisms,
  dark wood and iron, restrained cyan magic and faint violet secret hint.
- [x] Nineteen named sprites occupy the specified sequence in twenty 128 px
  cells; the last cell is transparent. Atlas is 640×512.
- [x] 19 PNG masters and direct JSON frame map, including footY, supplied.
- [x] Rune unlit/lit alpha masks match exactly. Fixed lever plinth pixels
  match; left/right handles remain distinct in greyscale.
- [x] Stone glyphs and puzzle states reviewed at 36 px. Emblems use bold,
  simple celestial silhouettes suited to small sockets and info dialogs.
- [x] Door masters and broken passage retain exact original wall_face seam
  pixels on the north and lateral boundaries. They sit in real wall rows in
  the review patches; open centres reveal the underlying zone floor.
- [x] Three rune-door sockets and two lever-door slots are empty in the atlas.
  Review-only glyph overlays demonstrate the intended placement.
- [x] Crack hint is transparent and sparse, with low-opacity violet light;
  it is deliberately difficult to notice at a glance on the busy wall.
- [x] Filled pit has a flat cracked top inside the shared pit rim. Open pit
  remains a dark recess; both leave the surrounding zone floor visible.
- [x] Transparent prop backgrounds, no floor plates or cast shadows. Removed
  disconnected generation speckles and adjacent-cell fragments before export.
- [x] No text, letters, numbers, UI, party, enemies, logos or watermarks in
  runtime sprites. No veil, curtain or barrier imagery. Review labels only.
- [x] WebP quality 85, 79,522 bytes, embedded sRGB; PNG masters also profiled.
- [x] Original tileset, decor and chest SHA-256 values unchanged, listed in
  NOTES.md. No original art or application source modified.
- [x] Four requested PNG review sheets supplied and visually inspected.

These checks describe this art package. Final acceptance and integration stay
with Claude's Asset Intake Review; no gameplay integration is included.
