# Asset Intake Review — ART-UI-EQUIP-001

**PR:** wnau34-nptrn/asterveil-fateweave#8 (branch `art/art-ui-equip-001`, commit `198ed71`, based on `8ba23cd`).
**Status: ACCEPTED.** Integrated 2026-10-16 without merging the art branch. Files were copied from `incoming/ART-UI-EQUIP-001/`, which is kept as the source.

## Technical

- **Scope:** only files under `incoming/ART-UI-EQUIP-001/`. No changes to `src/`, `tests/`, `.github/`, `public/` or existing art.
- **Budget:** runtime 303,066 B of 600,000 B (3 lossless RGBA sRGB WebPs + 18 SVGs).
- **Atlases:**

  | File | Size | Layout |
  |---|---|---|
  | `gear_items.webp` | 640×384 | 5×3 cells of 128 |
  | `set_emblems.webp` | 768×128 | 6 cells |
  | `potion_items.webp` | 640×128 | 5 cells; includes the added `item_gold` |

  The JSON frame maps match the grid.
- **SVGs:** all 18 use the shipped format: viewBox 24, `currentColor`, stroke 1.8, round caps/joins, no fills, text or scripts.
- **Protected hashes:** unchanged (items, chests, units, units_mercs, portraits).

## Visual

- **Weapons:** all ten match the weapon each character holds in `units*.webp` (`review/weapons-vs-units.png`). Garran's item is the spear alone, without the shield, which fits the weapon slot.
- **Armour, potions and dust:** these follow the ART-WORLD-LOOT-001 painted style, with the same light direction, outline and saturation.
- **Distinct shapes:** the three potions and veil dust differ by silhouette and stay distinct in greyscale at 32 px. The six emblems differ in both shape and colour and read at 16 px.
- **No rarity in the art:** no rarity frames or rarity glow. `review/rarity-mock.png` shows how the code-drawn border and emblem combine.
- **Clean output:** no text, halos or stray pixels seen.

## Integration

- **Runtime files:** in `public/assets/ui/equip/`. Frame maps are in `src/game/visuals/equip/`, read by `game/visuals/equip-art.ts`.
- **Markup:** `ui/equip-art.ts` builds decorative spans (`aria-hidden`); names and numbers stay as DOM text.
  - `gearArt` draws the code-drawn rarity frame from the `--rarity-*` tokens, plus the set emblem.
  - `potionArt` draws potions, dust and gold.
- **Where the art appears:**
  - lobby equipment slots, the bag, and the worn-piece detail;
  - forge list, forge detail, and the enhance/fuse/reroll headings;
  - the brew list;
  - map pack potions, ore/gold/ember/seal/dust rows, and found gear.
- **Line icons:** the delivered SVGs replace the placeholders. The menu uses `forge` and `brew`.
- **Tests:** `tests/equip-art.test.ts` checks that every class weapon, slot, set, potion, dust and gold has a distinct frame. The lobby gear, forge, sets and potion browser tests pass, and their screenshots were inspected.
