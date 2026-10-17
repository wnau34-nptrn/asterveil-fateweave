# CODEX HANDOFF — ART-WORLD-FOG-002
## Asterveil · Fateweave: soft cloud fog of war for the exploration map

> Copy everything below this line into Codex.

---

You are the **2D environment artist and asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser. Replace the map's fog-of-war tiles with a **soft, painted cloud fog** so the explored area no longer reads as a hard square board. The developer (Claude) will review and integrate the files.

**Do not change `src/`, `tests/`, `.github/`, `public/` or existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`.

### 1. The problem

Read these first:

- `docs/validation/` screenshots of the map, and the P4 map notes in the latest commits.
- `public/assets/world/fog_*.webp`: the current set.
  - `fog_tile.webp` is a nearly flat 128 px square.
  - The `fog_edge_*` / `fog_corner_*` overlays fade over only a few pixels.
- On screen this gives a lit rectangle of land inside dark squares. It reads as a board game, not a world.

### 2. How the game draws fog (hard technical contract)

- **Grid.** The map is a grid of square cells. One cell is shown at **44–96 px** on screen (phone portrait about 60 px, desktop about 90 px). Every fog image is a **128×128 px** source cell scaled to that size.
- **Reveal shape.** Cells within a square radius of 3 around every visited cell are revealed. So the revealed area is made of rectangles, L-shapes and stairs, and single unrevealed cells can be enclosed.
- **Hidden cells** draw one **fill** image.
- **Revealed cells** that border hidden cells draw overlays stacked in one element with CSS `background-image` layers:
  - one **edge** per hidden cardinal neighbour (N/E/S/W);
  - an **outer corner** for a hidden diagonal neighbour whose two adjoining cardinals are both revealed.
- **No blur, no filters, no blend modes and no per-cell animation** are allowed at runtime; on phones they pushed the encounter transition past its time budget. **All softness must be painted into the images.**
- **Placement.** Overlays are drawn with the same size and position as the cell; nothing may extend outside the 128 px cell. Fog sits above the floor and props and below the HUD.
- **Beyond the map edge** the game shows a night gradient (#13233a centre → #0a1422 → #050b14 edge). The fog must sit naturally between that night and the lit land.

### 3. Art direction

- **Cold night cloud / veil mist:** layered, slightly translucent cloud with soft wisps, in the Luminous Veil palette (`incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`).
- **Colours:**
  - base about #16263d;
  - lighter wisps #2a4363–#3a5878;
  - a very rare, faint veil-cyan glint (#74d4ef at ≤15% alpha).
- Painted to match `tileset.webp` and `decor.webp`: soft brushwork, no photo texture, no noise grain, no hard lines.
- **The fill must hide what is underneath.** The game uses fog to hide unexplored terrain, so fill cells are opaque.

### 4. Exact deliverables (drop-in names; the game already loads these)

**A. Fill (hidden cells)**, 128×128, opaque RGB (WebP quality about 85):

- `fog_tile.webp`: replaces the current fill.
- `fog_tile_b.webp`, `fog_tile_c.webp`: two variants. The game picks one per cell by hash to avoid visible repetition.
- **Seamless rule:** any variant must tile seamlessly next to any other variant in all four directions, including diagonals (test a random 8×8 grid).

**B. Edges (revealed cell beside a hidden one)**, 128×128 RGBA:

- `fog_edge_n.webp`, `fog_edge_e.webp`, `fog_edge_s.webp`, `fog_edge_w.webp`.
- Each one is fully opaque fill at the hidden side and **fades to fully transparent over about 70% of the cell (about 90 px)**.
- The fading front is an **irregular, wispy cloud edge**, not a straight gradient. It must still meet its neighbours seamlessly at the cell borders: the same alpha profile at x=0 and x=127 for N/S edges, and at y=0 and y=127 for E/W edges.
- At the hidden side (for example y=0 of `fog_edge_n`) the colour and texture must continue the fill exactly, so no seam shows between a hidden cell and the edge beside it.

**C. Outer corners**, 128×128 RGBA:

- `fog_corner_ne.webp`, `fog_corner_nw.webp`, `fog_corner_se.webp`, `fog_corner_sw.webp`.
- A quarter cloud puff entering from that corner, about 60% of the cell radius, wispy.
- It must join the edges and fill without seams.

**D. Inner corners** (new, optional but recommended), 128×128 RGBA:

- `fog_inner_ne.webp`, `fog_inner_nw.webp`, `fog_inner_se.webp`, `fog_inner_sw.webp`.
- Used **instead of** the two edges when both cardinals on that side are hidden (for example N and E both hidden gives `fog_inner_ne`).
- This makes the concave corner round and soft instead of doubling the two edge alphas.
- If you deliver these, say so in `NOTES.md`; Claude will switch the layer rule.

**E. Optional drifting veil**, `fog_wisps.webp`, 1024×1024 RGBA:

- Tileable, very low alpha (≤18%) cloud wisps.
- The game may slide it slowly over the whole map as **one** layer, so it must tile seamlessly.

**Frame map:** `fog.json` listing every file with `{ "w": 128, "h": 128, "role": "fill|edge|corner|inner|overlay", "dir": "n|e|s|w|ne|…" }`.

### 5. Review sheets (reference only, not runtime)

Show everything at the real in-game sizes (**60 px and 90 px cells**) over the real `tileset.webp` / `decor.webp` floor. Use these reveal shapes:

1. A 7×7 revealed square.
2. An L-shape.
3. A staircase diagonal.
4. One hidden cell enclosed by revealed land.
5. One revealed cell enclosed by fog.
6. A long corridor one cell wide.

Files:

- `review/fog-on-map-60.png` and `review/fog-on-map-90.png`: the shapes above.
- `review/seams.png`: a random 8×8 grid of fill variants, plus every edge/corner joined to its neighbours at 4× zoom. No visible seams.
- `review/before-after.png`: the same shapes with the current fog and with the new fog.
- `review/greyscale.png`: the shapes in greyscale. The lit land must stay clearly readable.

### 6. Technical constraints

- **Budget:** all runtime fog WebP files together **≤ 120 KB** (the current set is about 13 KB; the wisps overlay is the largest part).
- sRGB. Overlays must have no halo or matte fringe; check them on light and dark.
- No text, letters, numbers or logos. Original work only; no "in the style of" any named game, studio or artist; import nothing from other repositories.
- Keep `tileset.webp`, `decor.webp`, the landmarks and every other existing asset byte-identical. List SHA-256 hashes of `tileset.webp` and `decor.webp` in `NOTES.md`.

### 7. Do not

- Do not paint terrain, props, light sources or characters into fog.
- Do not make the fill translucent; unexplored terrain must stay hidden.
- Do not exceed the 128 px cell, and do not rely on runtime blur or blend modes.
- Do not change files under `src/`, `tests/`, `.github/` or `public/`.

### 8. Validation checklist (tick in the PR body)

- [ ] 3 opaque fill variants, seamless in any combination (random 8×8 test)
- [ ] 4 edges with an about 70% wispy feather that join the fill and each other without seams
- [ ] 4 outer corners joining edges without seams
- [ ] Inner corners delivered, or explicitly skipped in `NOTES.md`
- [ ] Optional wisps overlay is tileable and ≤18% alpha, or skipped
- [ ] Review sheets at 60 px and 90 px over the real tileset, all six reveal shapes, plus before/after and greyscale
- [ ] No text, original work only; runtime total ≤ 120 KB; existing hashes unchanged
- [ ] `NOTES.md` (files, sizes, palette, alpha profiles) and `fog.json` complete

### 9. Return package, Git and review

```text
incoming/ART-WORLD-FOG-002/
  NOTES.md  fog.json
  fog/     fog_tile.webp fog_tile_b.webp fog_tile_c.webp fog_edge_{n,e,s,w}.webp fog_corner_{ne,nw,se,sw}.webp
           (optional) fog_inner_{ne,nw,se,sw}.webp fog_wisps.webp   (+ PNG copies)
  review/  fog-on-map-60.png fog-on-map-90.png seams.png before-after.png greyscale.png
```

**Git steps (required):**

1. Create the branch `art/art-world-fog-002` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-WORLD-FOG-002/`.
3. Commit with the message `art: add ART-WORLD-FOG-002 soft cloud fog of war`.
4. Push the branch to `origin`.
5. Open a **draft pull request** into `feature/fateweave-initial-prototype`.
   - Title: `[ART-WORLD-FOG-002] Soft cloud fog of war`.
   - Body: embed the review sheets, include the ticked checklist and the runtime byte total, and end with **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

After you return, Claude runs an Asset Intake Review: seams at real sizes, budget, the reveal shapes and frame-time on phones. Claude then integrates the variants and inner corners into the fog renderer.
