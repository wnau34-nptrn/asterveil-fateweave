# Asset Intake Review: ART-WORLD-PUZZLE-001 (painted puzzle pieces)

- **Source:** draft PR #10, branch `art/art-world-puzzle-001` (commit 582adff), package in `incoming/ART-WORLD-PUZZLE-001/`.
- **Status:** ACCEPTED (2026-10-16).

## Checks

| Check | Result |
|---|---|
| Atlas | 640×512 RGBA WebP, 79,522 bytes (budget 350,000), embedded sRGB |
| Frames | 19 named 128 px cells plus one transparent spare; `puzzle.json` matches the 5×4 order (`tests/puzzle-art.test.ts`) |
| State pairs | Rune stones unlit/lit, lever up/down, pit open/filled and door closed/open are aligned; the lever state reads by angle in greyscale |
| Walls | Doors and the open arch sit seamlessly in `wall_face` rows. `crack_hint` is a faint overlay (alpha ≤ 101). `crack_open` and `door_open` leave the walkway transparent |
| Text | No text and no letter-like glyphs; the star, moon and sun are abstract shapes. No veil imagery |
| Existing art | `tileset.webp`, `decor.webp` and `chests.webp` are byte-identical (hashes in `validation.json` match) |

## Integration

- The atlas lives at `public/assets/world/puzzle.webp` and the frame map at `src/content/world/puzzle.json`.
- The puzzle styles in `game-feel.css` ("Phase 3C") pick each frame by state class (`--px`/`--py`), replacing the code-drawn placeholders.
- Open doorways and found secret walls layer the arch or rubble over a neighbour's floor tile.
- The rune door shows the stone order as glyph emblems in its three sockets.
- A filled pit now shows `pit_filled` instead of disappearing.
- Screenshots in Chromium were checked at 1366×1000: the meadow rune door and vault, and the thicket boulder and pit.
