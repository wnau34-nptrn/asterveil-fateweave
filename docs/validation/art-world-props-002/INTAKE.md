# Asset Intake Review — ART-WORLD-PROPS-002

**Status: ACCEPTED** (2026-10-17)

- Source: branch `art/art-world-props-002` (commit e15136c, based on aad45b8). Only `incoming/ART-WORLD-PROPS-002/` was added; the branch was not merged.
- Runtime files copied into the game: `public/assets/world/map_props.webp`, `public/assets/lobby/camp_flame.webp` and `public/assets/ui/market.webp`.
- Frame maps live in `src/content/world/map_props.json`, `camp_flame.json` and `market.json`.

## Technical checks (re-run here, not taken from the notes)

| Check | Result |
|---|---|
| Dimensions | map_props 512×256, camp_flame 1536×256, market 256×128; all RGBA with an embedded sRGB ICC profile |
| Runtime budget | 79,980 bytes of 400,000 |
| Prop foot line | Six props span x 16–112 (75% of the cell) and end on y 116 |
| Top band | At least 27 px clear above each event, so the "!" badge fits |
| Spare cell | Empty |
| Herb glow | A separate soft underlay |
| Flame | Six frames, each ending on y 200 (base), about 154 px tall, centred |
| Protected files | tileset, decor, chests, puzzle and lobby_firepit hashes unchanged (they match NOTES.md) |

## Visual review

| Item | Finding |
|---|---|
| Herb | Broad glowing leaves. Clearly different from the grass decor at 36 px. |
| Event props | All five read at map size and are distinct in greyscale. The rift is a torn violet crack, with no veil or curtain imagery. No people. |
| Flame | Six frames that loop cleanly. It sits inside the existing stone ring. No logs or stones are baked in. |
| Market | The contract and the gear box match the painted item icons. Both read at 32 px. |

## Integration

| Item | How it is drawn |
|---|---|
| Herbs | `.herb` draws the painted herb over the pulsing `herb_glow` frame. The glow pulse stops under reduced motion. |
| Events | `.event-mark` draws its kind's prop. The "!" badge bobs in the clear top band, and a finished event hides as before. |
| Lobby flame | `.lobby-flame` overlays the firepit box (same 256 px canvas). It steps six frames by `transform` only (`steps(6)`), with a static frame under reduced motion. |
| Market icons | The contract and gear box use the painted 2-cell atlas. Seals and repel keep their icons. |

## Tests

- `tests/props-art.test.ts` checks the frame maps against the CSS cells, the flame contract and the market atlas.
- The browser test "map props" checks the painted backgrounds and the badge position, with a screenshot.
- The market, events, side-quest and camp NPC browser tests pass.
