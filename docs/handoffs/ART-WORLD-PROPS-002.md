# CODEX HANDOFF — ART-WORLD-PROPS-002
## Asterveil · Fateweave: painted map props for herbs and events, the camp flame, and market icons

> Copy everything below this line into Codex.

---

You are the **2D game asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser. A few pieces of the game are still **code-drawn placeholders** (CSS shapes and text). Paint real art for them so they match the rest of the painted world. The developer (Claude) will review and integrate them.

**Do not change `src/`, `tests/`, `.github/`, `public/` or existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`.

### 0. What is still a placeholder (and what each is for)

| Placeholder today | Where | What it means in the game |
|---|---|---|
| Three green CSS leaves | Exploration map, 1 tile | **Glowing herb** (สมุนไพรเรืองแสง). Three per map; the party picks them up for the herbalist's side quest. |
| A coloured circle with "!" | Exploration map, 1 tile | **Map event** tiles. Stepping on one opens a choice. There are five kinds, below. |
| CSS gradient flames | Lobby camp scene, over the firepit | The **campfire flame** at the centre of the camp where the team rests. |
| Line icons | Lobby market (broker's sheet) | **Market goods:** a duplicate contract and a gear box. |

The five map events:

| Kind | Thai | Scene | Prop to paint |
|---|---|---|---|
| `bandits` | ด่านโจร | Bandits hold a roadblock with stolen goods | A small barricade of crates and spikes with a tattered bandit banner (no people) |
| `shrine` | ศาลเก่า | An old shrine that heals at a cost | A weathered stone shrine or altar with a faint warm glow (no real-world religious symbols) |
| `merchant` | พ่อค้าเร่ | A travelling merchant sells potions for ore | A small merchant cart or stall with potion bottles and a lantern (no person) |
| `traveller` | นักเดินทางบาดเจ็บ | A wounded traveller asks for a potion | A dropped travel pack, walking staff and bedroll beside a tree stump (no person) |
| `rift` | รอยแยกเล็ก | A small rift is about to spill monsters | A small vertical violet tear in the air above scorched ground, crackling rift light `#c79bff` |

### 1. Read first (style lock)

**Do not modify or regenerate these files.**

- `public/assets/world/tileset.webp` (128 px tiles), `decor.webp` (128 px props), `chests.webp`, `puzzle.webp` and `landmark_*.webp`: the painted 3/4 top-down map style, light direction and outline weight to match.
- `docs/handoffs/ART-PLACEMENT-RULES.md` §3 (exploration map) and §4 (lobby camp scene).
- `public/assets/lobby/lobby_bg.webp`, `lobby_fg.webp` and `lobby_firepit.webp` (256×256, the stone ring the flame sits in): the warm dusk camp.
- `public/assets/ui/equip/*.webp` and `public/assets/world/items.webp`: painted item icons, for the market icons' style and size.
- `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`: palette.

Lore: the land is แอสเตอร์เวล; the threat is รอยแยก (violet rifts). **No veil, curtain or barrier imagery.**

### 2. Exact deliverables

**A. Map props atlas** (`map_props.webp` plus `map_props.json`)

- **Cells:** 128×128 RGBA, laid out as 4 columns × 2 rows (512×256), in this order:
  1. `herb`: a small clump of glowing leaves with a soft mint-green glow (`#8ef0a8`) at the tips. It must read at 36 px and be clearly different from the decorative grass in `decor.webp`.
  2. `event_bandits`
  3. `event_shrine`
  4. `event_merchant`
  5. `event_traveller`
  6. `event_rift`
  7. `herb_glow`: a soft round glow on transparent, laid under the herb and pulsed by the game.
  8. Spare: fully transparent.
- **Placement:**
  - Bottom-centre anchor, shared baseline `footY` ≈ 116.
  - Each prop is about 70–80% of the cell wide.
  - No cast shadow; the game adds one.
- **JSON format:** `{ "<id>": { "x", "y", "w", "h", "footY" } }`.
- **Readability:**
  - Every event prop must read at 36 px and be distinguishable from the others in greyscale.
  - The game adds a small "!" badge above unvisited events, so leave the top 20% of each cell clear.

**B. Campfire flame strip** (`camp_flame.webp` plus `camp_flame.json`)

- **Frames:** 6 looping flame frames, each 256×256 RGBA, in one horizontal strip (1536×256).
- **Placement:** the flame sits inside `lobby_firepit.webp`'s stone ring.
  - Base of the flame at y ≈ 200 of 256, centred.
  - Height about 60% of the cell.
- **Look:** warm painted fire (amber, orange, a pale yellow core) with a few sparks. It loops seamlessly from frame 6 to frame 1.
- **No firepit stones and no logs** (the firepit image already has them), no smoke column, no background.
- **JSON format:** `{ "frames": 6, "w": 256, "h": 256, "baseY": <y> }`.

**C. Market icons** (`market.webp` plus `market.json`)

- **Cells:** 128×128 RGBA, 2 frames side by side (256×128):
  1. `contract`: a rolled contract scroll with a gold star seal. It adds one duplicate to a mercenary.
  2. `gearbox`: a small iron-bound treasure box with a faint violet-gold glow. It holds a random rare-or-better piece of gear.
- **Style:** match the painted item icons in `public/assets/ui/equip`, centred, readable at 32 px. No rarity frame (the game draws it).

### 3. Technical constraints

- sRGB with an embedded profile; WebP quality about 85.
- **Budget:** all three runtime WebPs together at most **400,000 bytes**. Review PNGs do not count.
- Clean alpha edges with no halos or stray pixels.
- **No text, letters, numbers, logos or watermarks** anywhere. No real-world religious symbols.
- Keep these files byte-identical and list their SHA-256 hashes in `NOTES.md`:
  - `tileset.webp`, `decor.webp`, `chests.webp`, `puzzle.webp`, `lobby_firepit.webp`.
- Import nothing from other repositories.

### 4. Do not

- Do not draw people, monsters or the party into any prop.
- Do not redraw tiles, floors, walls, chests, puzzle pieces, landmarks, the firepit or the lobby layers.
- Do not bake floor tiles into props: keep them transparent around their base.
- Do not add extra variants beyond the frames listed.
- Do not use pixel art, photo textures or 3D renders.
- Do not write game code.

### 5. Review sheets (PNG, reference only; labels allowed here only)

- `review/props-sheet.png`: every frame on a checkerboard with its id.
- `review/props-in-map.png`: a mock 7×5 patch of each zone using the real tileset:
  - meadow: herb, traveller and merchant;
  - thicket: bandits and shrine;
  - scar: rift and herb.
- `review/props-sizes.png`: the map patches at tile sizes 36, 48 and 64 px.
- `review/props-gray.png`: the props sheet in greyscale.
- `review/flame-strip.png`: the 6 frames over `lobby_firepit.webp`, plus one frame at the in-game size (about 90 px wide).
- `review/market-icons.png`: both icons at 128, 48 and 32 px on `#0d1c2e`.

### 6. Validation checklist (tick in the PR body)

- [ ] Map props: 7 frames plus a spare, 128 px cells, 512×256 atlas, JSON with footY; readable at 36 px and in greyscale; top 20% clear
- [ ] Herb clearly different from decorative grass
- [ ] Flame: 6 seamless frames, 1536×256, sits in the firepit ring, no stones or logs
- [ ] Market icons: 2 frames, 256×128, readable at 32 px, no rarity frame
- [ ] No text, people or veil imagery
- [ ] Runtime total ≤ 400 KB; existing hashes unchanged
- [ ] Review sheets, `NOTES.md` and `STYLE_CHECK.md` included

### 7. Return package, Git and review

```text
incoming/ART-WORLD-PROPS-002/
  NOTES.md  STYLE_CHECK.md
  props/   map_props.webp  map_props.json  (+ PNG masters)
  flame/   camp_flame.webp  camp_flame.json  (+ PNG master)
  market/  market.webp  market.json  (+ PNG masters)
  review/  props-sheet.png  props-in-map.png  props-sizes.png  props-gray.png  flame-strip.png  market-icons.png
```

**Git steps (required):**

1. Create the branch `art/art-world-props-002` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-WORLD-PROPS-002/`.
3. Commit with the message `art: add ART-WORLD-PROPS-002 map props, camp flame and market icons`.
4. Push the branch to `origin`.
5. Open a **draft pull request** into `feature/fateweave-initial-prototype`.
   - Title: `[ART-WORLD-PROPS-002] Map props, camp flame and market icons`.
   - Body: embed the review sheets, the ticked checklist and the runtime byte total, and end with **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

After you return, the developer (Claude) runs an Asset Intake Review. If the art is accepted, Claude replaces the code-drawn placeholders. Otherwise Claude answers with a revision request on the PR.
