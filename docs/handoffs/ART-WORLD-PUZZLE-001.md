# CODEX HANDOFF — ART-WORLD-PUZZLE-001
## Asterveil · Fateweave: painted puzzle pieces and secret walls

> Copy everything below this line into Codex.

---

You are the **2D game asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser. Phase 3C added map puzzles. Today all of them are **code-drawn placeholders**: CSS gradients and text glyphs in `src/ui/game-feel.css` (section "Phase 3C"). Paint real sprites for every puzzle piece so they sit naturally on the painted map. The developer (Claude) will review and integrate them.

**Do not change `src/`, `tests/`, `.github/`, `public/` or existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`.

### 0. What the pieces do (the game draws all text)

| Piece | Thai | In the game | State changes to show |
|---|---|---|---|
| Rune stone | หินรูน | 3 stones in the meadow, each with one glyph (star, moon, sun). Stepping on them in the right order lights them; a wrong stone resets the order. | unlit / lit |
| Rune door | ประตูรูน | A sealed stone door in a wall. It shows the correct glyph order as its hint and opens when all three stones are lit. | closed / open |
| Lever | คันโยก | 2 levers in the scar zone. Stepping on one pulls it, and it stays pulled. | up (not pulled) / down (pulled) |
| Lever door | ประตูคันโยก | A heavy iron-bound door that opens when every lever is pulled. | closed / open |
| Boulder | ก้อนหิน | A round boulder in the thicket. Walking into it pushes it one tile. | one frame (the game moves it) |
| Pit | หลุม | A deep hole the party cannot cross until the boulder is pushed into it. | open / filled (boulder sunk level with the floor) |
| Cracked wall | รอยร้าว | A secret wall. A **subtle** crack hints at it, the party walks through, and a hidden chest pocket lies behind. | hint (barely noticeable) / found (broken open passage) |

The glyphs are abstract shapes, **not letters**: star ✦, crescent moon ☾, sun ☀.

### 1. Read first (style lock)

**Do not modify or regenerate these files.**

- `public/assets/world/tileset.webp`: 128 px tiles, 4×6 grid. Includes the frames `wall_face`, `wall_top`, `wall_inner` and the floors `meadow_*`, `thicket_*`, `scar_*`.
  - Frame positions are in `src/game/visuals/world-art.ts` and its tileset map.
- `public/assets/world/decor.webp` (128 px props), `chests.webp` and `landmark_*.webp` (256 px, bottom-centre anchor).
  - This is the painted 3/4 top-down style, lighting and outline weight to match.
- `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`: palette, using only its colour values.
  - Rift light is violet `#c79bff`; the magic cyan accent is `#8ef0ff`.
- `docs/handoffs/ART-PLACEMENT-RULES.md` §3 (exploration map): bottom-centre anchor and the tile size T.
- `src/ui/game-feel.css` "Phase 3C" and the matching screenshots of the current placeholders, if present in `docs/validation/`.
- `docs/EXPEDITION_DESIGN.md` "Puzzles and secrets": the rules.

Lore: the land is แอสเตอร์เวล; the threat is รอยแยก (violet rifts). The puzzles are relics of the old frontier: worn pale stone, teal-bronze metal, faint magic light. **No veil, curtain or barrier imagery.**

### 2. Exact deliverables

One atlas of 128×128 RGBA cells, `puzzle.webp`, plus `puzzle.json`.

`puzzle.json` maps each frame id to `{ "x", "y", "w", "h", "footY" }`. `footY` is the base line for props; full-tile frames use 128.

**Prop frames.** These sit on a floor tile with a bottom-centre anchor and a shared baseline at footY ≈ 116. Do not paint a cast shadow; the game adds one.

1. `rune_star`, `rune_moon` and `rune_sun`: unlit rune stones.
   - Each is a low, flat-topped pale stone about 70% of the cell wide, with the glyph carved into the top face.
   - The glyph is dull and grey-blue but still readable at 36 px.
2. `rune_star_lit`, `rune_moon_lit` and `rune_sun_lit`: the same stones, pixel-aligned with the unlit frames.
   - The carved glyph glows cyan `#8ef0ff` with a soft glow that stays inside the cell.
3. `lever_up` and `lever_down`: a short stone plinth with a bronze lever.
   - Up: the lever leans left and the knob is red-orange (not pulled).
   - Down: the lever leans right and the knob is green (pulled).
   - Both share the same plinth position. The difference must read in greyscale (angle) as well as colour.
4. `boulder`: a round, mossy grey boulder about 85% of the cell, clearly pushable (round, not a wall).
5. `pit_open`: a dark square hole cut into the floor, with crumbling edges and a deep black-blue inside. It is drawn **flat on the floor** (footY 128); the edge is transparent so the zone floor shows around it.
6. `pit_filled`: the same hole with the boulder sunk in level with the floor, cracked flat top. It must look walkable.

**Full-tile frames** (128×128, they replace a wall tile; footY 128):

7. `door_rune`: a sealed pale-stone door set into the cliff wall. It matches `wall_face` (the party approaches from the south) so it sits in a row of `wall_face` tiles without a seam.
   - Three **empty round sockets** across the lintel; the game places the glyphs in them in the hint order.
8. `door_lever`: a heavy dark-wood and iron-bound door in the same wall face, with two empty keyhole-like slots.
9. `door_open`: an open archway in the same wall face.
   - The doorway floor is **transparent**, so the floor tile below shows through.
   - Both door types use it.
10. `crack_hint`: a **transparent overlay** laid over a `wall_face` tile. It holds thin hairline cracks with a very faint violet glimmer, barely noticeable: an attentive player can spot it, a hurried one should not.
11. `crack_open`: a broken-open passage in the wall face with rubble at the sides.
    - The walkable centre is transparent so the floor shows.
    - It must read as "you can walk through here".

**Glyph emblems** (for the door sockets and the info dialog):

12. `glyph_star`, `glyph_moon` and `glyph_sun`: each a 128×128 RGBA cell containing only the carved glyph, cyan-lit, centred, about 60% of the cell.
    - Readable at 14–24 px.

So 20 frames. Lay them out as 5 columns × 4 rows (640×512) in the order above. Fill unused cells transparent.

### 3. Technical constraints

- sRGB colour with an embedded profile; WebP quality about 85.
- The atlas must be at most **350,000 bytes**. Review PNGs do not count.
- Clean alpha edges: no halos and no stray pixels.
- Unlit and lit frames, and closed and open frames, must be pixel-aligned with each other: the same silhouette and position, only the state changes.
- Everything must read at the smallest tile size, T = 36 px.
- **No text, letters, numbers, logos or watermarks.** The glyphs must not read as letters of any alphabet.
- Keep these files byte-identical and list their SHA-256 hashes in `NOTES.md`:
  - `tileset.webp`, `decor.webp`, `chests.webp`.
- Import nothing from other repositories.

### 4. Do not

- Do not redraw the tileset, floors, walls, chests or landmarks.
- Do not bake the zone floor into prop frames: props stay transparent around their base.
- Do not draw the party, enemies or any UI.
- Do not add extra puzzle types, variants or animation strips.
- Do not use pixel art, photo textures or 3D renders.
- Do not write game code.

### 5. Review sheets (PNG, reference only)

- `review/puzzle-sheet.png`: every frame on a checkerboard, labelled outside the art. Labels may appear in review sheets only.
- `review/puzzle-in-map.png`: a mock 7×5 patch of each zone using the real tileset:
  - meadow: the three rune stones, one lit, and the rune door with glyphs in its sockets;
  - thicket: the boulder next to the open pit, then the filled pit;
  - scar: both levers and the lever door, closed and open;
  - a wall with `crack_hint`, then `crack_open`.
- `review/puzzle-sizes.png`: the patches scaled so a tile is 36, 48 and 64 px.
- `review/puzzle-gray.png`: the same sheet in greyscale, to check states without colour.

### 6. Validation checklist (tick in the PR body)

- [ ] 20 frames, 128 px cells, 640×512 atlas, `puzzle.json` with footY
- [ ] State pairs pixel-aligned; states readable in greyscale and at 36 px
- [ ] Doors and the cracked wall seamless with `wall_face`; open frames transparent in the walkable part
- [ ] `crack_hint` subtle, not obvious
- [ ] No text or letter-like glyphs; no veil imagery
- [ ] Atlas ≤ 350 KB; existing hashes unchanged
- [ ] Review sheets, `NOTES.md` and `STYLE_CHECK.md` included

### 7. Return package, Git and review

```text
incoming/ART-WORLD-PUZZLE-001/
  NOTES.md  STYLE_CHECK.md
  puzzle/  puzzle.webp  puzzle.json  (+ PNG masters per frame)
  review/  puzzle-sheet.png  puzzle-in-map.png  puzzle-sizes.png  puzzle-gray.png
```

**Git steps (required):**

1. Create the branch `art/art-world-puzzle-001` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-WORLD-PUZZLE-001/`.
3. Commit with the message `art: add ART-WORLD-PUZZLE-001 painted puzzle pieces`.
4. Push the branch to `origin`.
5. Open a **draft pull request** into `feature/fateweave-initial-prototype`.
   - Title: `[ART-WORLD-PUZZLE-001] Painted puzzle pieces`.
   - Body: embed the review sheets, the ticked checklist and the atlas byte size, and end with the line **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

After you return, the developer (Claude) runs an Asset Intake Review. If the art is accepted, Claude replaces the code-drawn placeholders with these sprites. Otherwise Claude answers with a revision request on the PR.
