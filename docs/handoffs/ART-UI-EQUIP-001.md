# CODEX HANDOFF — ART-UI-EQUIP-001
## Asterveil · Fateweave: equipment, set, potion and forge icons

> Copy everything below this line into Codex.

---

You are the **2D game asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser.

Phase 2D shipped equipment, sets, a forge and map potions with **code-drawn placeholder icons**. Produce the painted item art and the line icons that replace them. The developer (Claude) will review and integrate them.

**Do not change `src/`, `tests/`, `.github/`, `public/` or any existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`.

### 0. Placement rules

Read `docs/handoffs/ART-PLACEMENT-RULES.md` §5 (general).

- Item art appears at **32–56 px** in lists:
  - the lobby equipment sheet (bag rows and six slot buttons);
  - the forge list;
  - the map pack dialog;
  - loot toasts.
- Line icons appear at **15–24 px** on buttons and capsules.
- Rarity (common → legendary) is shown by **code-drawn colour borders**, so items must not carry rarity frames or colour coding of their own. Sets are shown by a small emblem that the game places in a corner of the item.

### 1. Read first (style lock)

These files are the style bible. **Do not modify or regenerate them.**

- `public/assets/world/items.webp` with `src/content/world/items.json` (painted ore, ember and seal) and `public/assets/world/chests.webp`: the painted item style to match exactly. Use the same light direction, outline weight, saturation and 128 px framing.
- `src/ui/svg/*.svg`, the shipped line icons (ART-UI-WORLD-001 and ART-WORLD-LOOT-001). These are the placeholders to replace:
  - `gear-weapon.svg`, `gear-head.svg`, `gear-body.svg`, `gear-gloves.svg`, `gear-boots.svg`, `gear-charm.svg`;
  - `dust.svg`;
  - `potion-salve.svg`, `potion-tonic.svg`, `potion-repel.svg`.
- `public/assets/art/units.webp` and `units_mercs.webp`: each class's weapon, as drawn on the characters. The weapon items must match these designs.
- `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`: the Luminous Veil palette.
- `docs/EXPEDITION_DESIGN.md`: the sections "Equipment", "Equipment sets", "Forge" and "Map potions", which describe what each item means.

### 2. What is needed and what it means

**Class weapons** (one per class; only that class can wear it). The design must match the weapon the character holds in `units*.webp`:

| id | Class | Weapon |
|---|---|---|
| `weapon_guardian` | Knight Aegis | knight's longsword |
| `weapon_tracer` | Duelist Lyra | duelist's sword |
| `weapon_weaver` | Mage Eira | arcane staff |
| `weapon_healer` | Priest Seren | holy staff |
| `weapon_garran` | Spear Garran | spear |
| `weapon_mira` | Archer Mira | bow |
| `weapon_toma` | Alchemist Toma | alchemy flask set |
| `weapon_sefa` | Scout Sefa | twin daggers |
| `weapon_brann` | Warden Brann | rune hammer |
| `weapon_lio` | Bard Lio | rune lute |

**Armour pieces** (anyone can wear them; one neutral design each):

| id | Piece |
|---|---|
| `gear_head` | an adventurer's helm or hood |
| `gear_body` | a light breastplate over cloth |
| `gear_gloves` | leather and metal gauntlets |
| `gear_boots` | travel boots |
| `gear_charm` | an amulet with a small veil-cyan stone |

**Set emblems** (the game draws them small on any item of the set):

| id | Set | Motif |
|---|---|---|
| `set_dawn` | Dawn Guardian | a rising sun over a shield, gold |
| `set_wind` | Swift Wind | swirling feathers, mint |
| `set_shadow` | Shadow Hunter | a crescent and a dagger, violet |
| `set_thorn` | Thorn | a thorned vine, deep green |
| `set_starveil` | Star Veil | a star inside a veil arc, cyan |
| `set_mender` | Mender | a leaf with a soft glow, warm pink |

**Map potions and veil dust:**

| id | Meaning | Look |
|---|---|---|
| `potion_salve` | heals one member | small round flask, red-amber liquid |
| `potion_tonic` | heals the whole team | larger flask, green-gold liquid |
| `potion_repel` | no random encounters for 10 steps | slim vial, violet-cyan liquid with a faint veil wisp |
| `item_dust` | veil dust, the forge material from salvage | a small heap of glittering cyan-violet powder |

### 3. Exact deliverables

**A. Painted equipment items** (WebP, alpha)

- `gear_items.webp`, 640×384: a 5 × 3 grid of 128×128 frames.
  - Row 1: `weapon_guardian`, `weapon_tracer`, `weapon_weaver`, `weapon_healer`, `weapon_garran`.
  - Row 2: `weapon_mira`, `weapon_toma`, `weapon_sefa`, `weapon_brann`, `weapon_lio`.
  - Row 3: `gear_head`, `gear_body`, `gear_gloves`, `gear_boots`, `gear_charm`.
- `gear_items.json`: `{ "<id>": { "x", "y", "w", "h" } }`.
- Show each item centred at a slight 3/4 angle. Long weapons sit diagonally. Fill about 80% of the frame, with at least 6 px of padding.

**B. Set emblems** (WebP, alpha)

- `set_emblems.webp`, 768×128: six 128×128 frames, in the order of the table above, plus `set_emblems.json`.
- Use a round or shield-shaped badge with a strong silhouette. It is shown at **16–20 px** on a corner of an item, so it must read at 16 px and the six must differ in both colour and shape.

**C. Potions and dust** (WebP, alpha)

- `potion_items.webp`, 512×128: `potion_salve`, `potion_tonic`, `potion_repel`, `item_dust`, plus `potion_items.json`.
- The three potions must differ in shape as well as colour, so they read in greyscale at 32 px.

**D. Line icons** (SVG, to replace the placeholders)

- Files:
  - slots: `gear-weapon.svg`, `gear-head.svg`, `gear-body.svg`, `gear-gloves.svg`, `gear-boots.svg`, `gear-charm.svg`;
  - materials and potions: `dust.svg`, `potion-salve.svg`, `potion-tonic.svg`, `potion-repel.svg`;
  - new for the forge and lobby: `forge.svg` (anvil), `enhance.svg` (hammer with a spark), `fuse.svg` (three shards becoming one), `reroll.svg` (two circular arrows around a gem), `salvage.svg` (a broken piece with dust), `brew.svg` (a small cauldron), `set.svg` (two linked rings).
- Match the shipped set exactly:
  - `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`;
  - round caps and joins;
  - no hard-coded colours and no text.
- Each must read at 15 px and match the shape of its painted counterpart.

**E. Review sheets** (PNG, reference only)

- `review/items-sizes.png`: every painted item at 128, 56 and 32 px, and every line icon at 24 and 15 px, on navy glass (`#0d1c2e`).
- `review/rarity-mock.png`: three items inside five plain coloured borders (`#b9c8d8`, `#7fd99a`, `#6fb7ff`, `#c79bff`, `#f2b84b`) at 48 px, each with a set emblem at 18 px in the corner. This shows how the game will combine them; do not deliver the borders.
- `review/greyscale.png`: the potions and emblems in greyscale at 32 and 16 px.
- `review/weapons-vs-units.png`: each weapon item next to its character's idle frame from `units*.webp`, to prove they match.

### 4. Technical constraints

- **Original work only.** No copying, tracing, or "in the style of" any named game, studio or artist. Import nothing from other repositories.
- **No text, numbers or letters** in any image.
- sRGB colour. Transparent backgrounds without halos or stray pixels.
- **Budget:** all new runtime WebP and SVG files together must be at most **600 KB**. PNG copies are review-only and do not count.
- Keep existing files byte-identical. List the SHA-256 hashes of `items.webp`, `chests.webp`, `units.webp`, `units_mercs.webp` and `portraits.webp` in `NOTES.md`.

### 5. Do not

- Do not draw rarity frames, glows by rarity, card frames, price tags, gacha art or UI panels. Rarity colour is drawn by the game.
- Do not redesign the characters' weapons, the HUD, the palette or the existing icons that are not listed here.
- Do not change game numbers or rules, and do not write game code.
- Do not use pixel art, photo textures, 3D renders, or neon brighter than the existing veil-cyan.

### 6. Validation checklist (tick in the PR body)

- [ ] 15 equipment frames (10 class weapons + 5 armour) at 128 px, with the JSON map; the weapons match `units*.webp`
- [ ] 6 set emblems readable and distinct at 16 px
- [ ] 3 potions + dust, distinct in greyscale at 32 px
- [ ] 17 line SVGs in the shipped format, readable at 15 px
- [ ] No rarity frames or rarity colouring in the item art
- [ ] Review sheets included
- [ ] No text, no halos, original work only
- [ ] Runtime total ≤ 600 KB; existing hashes unchanged
- [ ] `NOTES.md` and `STYLE_CHECK.md` complete

### 7. Return package, Git and review

```text
incoming/ART-UI-EQUIP-001/
  NOTES.md  STYLE_CHECK.md
  items/    gear_items.webp  gear_items.json  potion_items.webp  potion_items.json  (+ PNG copies)
  emblems/  set_emblems.webp  set_emblems.json
  icons/    gear-*.svg  dust.svg  potion-*.svg  forge.svg  enhance.svg  fuse.svg  reroll.svg  salvage.svg  brew.svg  set.svg
  review/   items-sizes.png  rarity-mock.png  greyscale.png  weapons-vs-units.png
```

**Git steps (required):**

1. Create the branch `art/art-ui-equip-001` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-UI-EQUIP-001/`.
3. Commit with the message `art: add ART-UI-EQUIP-001 equipment, set, potion and forge icons`.
4. Push the branch to `origin`.
5. Open a **draft pull request** into `feature/fateweave-initial-prototype`.
   - Title: `[ART-UI-EQUIP-001] Equipment, set, potion and forge icons`.
   - Body: embed the review sheets, include the ticked checklist and the runtime byte total, and end with the line **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

After you return, the developer (Claude) runs an Asset Intake Review. Claude then integrates the accepted files: item art in the bag, slots, forge and pack; emblems on set items; and icons replacing the placeholders. Otherwise Claude answers with a revision request on the PR.
