# CODEX HANDOFF — ART-WORLD-LOOT-001
## Asterveil · Fateweave: treasure chests, resource items and star rank badge

> Copy everything below this line into Codex.

---

You are the **2D game asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser. Produce original assets to replace three code-native placeholders that shipped in phase 2A. Add one star badge needed in phase 2C.

Return a package that the developer (Claude) will review and integrate. **Do not change `src/`, `tests/`, `.github/`, `public/` or any existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`.

### 0. Placement rules

See `docs/handoffs/ART-PLACEMENT-RULES.md` §3 (exploration map): chests are about 0.75 of a tile, centred slightly above the tile's bottom edge.

### 1. Read first (style lock)

These files are the style bible. **Do not modify or regenerate them.**

- `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md` and `incoming/ART-UI-WORLD-001/icons/`: the Luminous Veil palette and the 24 px line-icon set.
- `public/assets/world/tileset.webp` (128 px tiles), `decor.webp` (128 px props) and `landmark_*.webp` (256 px, bottom-centre anchor): the painted map style that the chests must sit beside.
- `src/ui/svg/*.svg`: shipped icons. The placeholders to replace are `chest.svg`, `chest-open.svg`, `ore.svg`, `ember.svg`, `seal.svg` and `pack.svg`.
- `docs/validation/phase-2a/*.jpg`: screenshots of the current placeholders in the game.
- `docs/EXPEDITION_DESIGN.md` ("Phase 2A rules" and "Mercenary decisions"): what each item means.

### 2. What the items mean in the game

| Item | Thai name | Meaning | Visual direction |
|---|---|---|---|
| Common chest | กล่องสมบัติ | 4 per map, gives ore and sometimes an ember | Weathered wood with teal-bronze bands and a small veil-cyan glow at the lock |
| Rare chest | กล่องสมบัติหายาก | 2 per map, always gives an ember and a seal | Pale stone and gold filigree, matching the ruins and gates, with a soft gold glow |
| Star ore | แร่ดาว | Main currency, used to hire mercenaries and upgrade stars | A small cluster of cyan-white crystal with a tiny star sparkle inside |
| Veil ember | ถ่านม่านเวล | Rare; revives one fallen member at camp | A glowing coal, warm amber outside with a violet-cyan veil core, faint wisp |
| Contract seal | ตราสัญญา | Rare; replaces one duplicate when upgrading a mercenary's star | A wax seal or medallion with ribbon, gold and deep navy, with an abstract weave mark |
| Star rank | ดาว ★1–★5 | A mercenary's rank, shown beside portraits | A five-point star badge, filled and empty states |

### 3. Exact deliverables

**A. Chest map sprites** (these replace the code-drawn chest markers)

- Four frames, each 128×128 RGBA, in this order:
  1. `chest_common`
  2. `chest_common_open`
  3. `chest_rare`
  4. `chest_rare_open`
- Atlas `chests.webp`: 512×128 RGBA, WebP quality about 85.
- Frame map `chests.json`: `{ "<id>": { "x", "y", "w", "h", "footY" } }`.
- Same 3/4 top-down view and painted style as `decor.webp` and the landmarks.
- The chest occupies about 70–80% of the frame width, with its base on a shared baseline (`footY` about 118). Use a bottom-centre anchor. Do not paint a cast shadow; the game draws one.
- Open frames show the lid open, the inside empty, and the glow dimmed. A player must see at a glance that the chest is already opened.
- The common and rare chests must be distinguishable in greyscale at 40 px wide.
- **Optional:** `chest_open_burst.webp`, a 4-frame horizontal strip (512×128) of a short light burst played once over the chest when it opens. Use a transparent background, no text, and nothing outside the frame.

**B. Resource item icons (painted)**

- Three frames, 128×128 RGBA, in this order: `item_ore`, `item_ember`, `item_seal`.
- Atlas `items.webp` (384×128) plus `items.json`.
- They are used at 32–48 px in the pack dialog, the camp sheet and loot messages. They must read at 32 px: strong silhouette and no fine detail that disappears. Each item gets its own dominant colour:
  - ore: cyan-white;
  - ember: amber with a violet core;
  - seal: gold and navy.

**C. Line icons** (these replace the placeholder SVGs; used at 15–24 px in the HUD and on buttons)

- `chest.svg`, `chest-open.svg`, `ore.svg`, `ember.svg`, `seal.svg`, `pack.svg` (pack = travel bag), `star.svg` (star outline), `star-filled.svg`.
- Match the shipped set exactly:
  - `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`;
  - round caps and joins;
  - no hard-coded colours (`star-filled.svg` may use `fill="currentColor"`);
  - no text.
- Each must read at 15 px. Keep shapes consistent with the painted items in B.

**D. Star rank badge (phase 2C)**

- `star_badge.svg`: one scalable SVG of a small gold star for a ★1–★5 row next to portraits.
  - Navy outline for contrast, works on dark glass.
  - Provide `star_badge_empty.svg` for unearned stars.
- The game renders the row and the count with HTML. Do not bake numbers, the "★1" text or a five-star strip into one image.

**E. Review sheets** (reference only, not runtime)

- `review/chests-on-map.png`: the four chest frames placed on the real `tileset.webp` tiles at 48 px and 64 px tile size, next to existing decor and the camp landmark. Show common and rare, closed and open.
- `review/items-sizes.png`: the painted items at 128, 48 and 32 px, and the line icons at 24 and 15 px, on the navy glass background (`#0d1c2e`).
- `review/greyscale.png`: the same sheets in greyscale.
- `review/star-row.png`: ★3 of 5 next to a 40 px circular portrait from `public/assets/art/portraits.webp`. This is a mock only.

### 4. Technical constraints

- **Original work only.** No copying, tracing, or "in the style of" any named game, studio or artist. Do not import anything from any other repository.
- **No text, numbers or letters** in any image. All labels are live Thai HTML.
- sRGB colour.
- Transparent backgrounds without halos or stray pixels. Nothing touches the frame edge; keep at least 4 px of padding.
- **Budget:** all new runtime WebP and SVG files together must be at most **350 KB**. PNG copies are review-only and do not count.
- Keep existing files byte-for-byte unchanged. List SHA-256 hashes of `tileset.webp`, `decor.webp`, `units.webp` and `portraits.webp` in `NOTES.md`.

### 5. Do not

- Do not redesign the HUD, the map tiles, landmarks, characters or fonts.
- Do not create gacha frames, rarity card frames, price tags, currency coins, shop art or UI panels.
- Do not change any game numbers or rules, and do not write game code.
- Do not use pixel art, photo textures, 3D renders or neon glow that is brighter than the existing veil-cyan.

### 6. Validation checklist (tick in the PR body)

- [ ] 4 chest frames 128×128, shared `footY`, open/closed obvious, common vs rare readable in greyscale at 40 px
- [ ] 3 painted items 128×128, readable at 32 px
- [ ] 8 line SVGs in the shipped icon format, readable at 15 px
- [ ] Star badge filled and empty SVGs, no baked text
- [ ] Atlases and JSON frame maps match
- [ ] Review sheets included
- [ ] No text, no halos, original work only
- [ ] Runtime total ≤ 350 KB; existing art hashes unchanged
- [ ] `NOTES.md` complete

### 7. Return package, Git and review

```text
incoming/ART-WORLD-LOOT-001/
  NOTES.md          # file list, sizes, footY per frame, palette, how each item was made, hashes
  STYLE_CHECK.md    # how each asset matches the style lock, plus known deviations
  chests/  chests.webp  chests.json  chest_*.png  (optional) chest_open_burst.webp
  items/   items.webp   items.json   item_*.png
  icons/   chest.svg chest-open.svg ore.svg ember.svg seal.svg pack.svg star.svg star-filled.svg star_badge.svg star_badge_empty.svg
  review/  chests-on-map.png  items-sizes.png  greyscale.png  star-row.png
```

**Git steps (required):**

1. Create the branch `art/art-world-loot-001` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-WORLD-LOOT-001/`.
3. Commit with the message `art: add ART-WORLD-LOOT-001 chest, item and star assets`.
4. Push the branch to `origin`.
5. Open a **draft pull request** from `art/art-world-loot-001` into `feature/fateweave-initial-prototype`.
   - Title: `[ART-WORLD-LOOT-001] Chests, resource items and star badge`.
   - Body: embed the four review sheets, include the ticked checklist from §6 and the runtime byte total, and end with the line **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

After you return, the developer (Claude) runs an Asset Intake Review on the PR: style match, anchors, readability at gameplay size, budget and provenance. Claude integrates only the accepted files into `public/` and `src/ui/svg/`, or answers with a revision request on the PR.
