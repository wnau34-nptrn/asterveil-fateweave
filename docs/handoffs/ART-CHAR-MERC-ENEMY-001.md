# CODEX HANDOFF — ART-CHAR-MERC-ENEMY-001
## Asterveil · Fateweave: mercenary roster and new enemy cast (2D character art)

> Copy everything below this line into Codex.

---

You are the **character art director and asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG for the browser. Produce **original 2D character art** that sits next to the existing cast without looking out of place: six **mercenaries** the party can hire, and nine **new enemies** for the Veil Frontier map.

Return a package that a developer (Claude) will review and integrate. **Do not change `src/`, tests, workflows or existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`. Create the branch `art/art-char-merc-enemy-001` from it.

---

### 0. Placement rules (read first)

Read `docs/handoffs/ART-PLACEMENT-RULES.md` before drawing. It describes exactly where and how the game places, scales and overlays these frames. The key rules:

- **Mercenaries fight on the LEFT half of the battlefield and must face RIGHT (→).**
- **Enemies stand on the RIGHT half and must face LEFT (←).**
- **The game never mirrors battle sprites**, so the facing in your file is final.
- Large foes take the enemy front position and are shown about 1.5× normal size.
- Frames are anchored at the soles (`footY`). The game draws shadows, rings, names and HP bars below the feet.

### 1. Read before drawing (style lock)

Study these existing files closely. They are the style bible. **Do not regenerate, repaint or modify them.**

- `public/assets/art/units.webp`: 1024×1536 RGBA, a 2×3 atlas of 512×512 full-body frames. Order: Knight, Duelist, Mage, Priest, Raider, Brute.
- `public/assets/art/portraits.webp`: 1024×1536, a 2×3 atlas of square bust portraits in the same order.
- `public/assets/art/ruins.webp`: the battle backdrop (floating ruins courtyard, dusk sky).
- `public/assets/world/tileset.webp`, `decor.webp` and the landmark images, plus `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`: the world art and the "Luminous Veil" palette.
- `docs/ART_DIRECTION.md`.

Style to match exactly:

- **Heroic chibi anime, about 2.5–3 heads tall.** Same line weight, cel shading with soft gradients, warm rim light from the top-left, and saturated but not neon colour.
- **Proportions and scale.** Characters stand on the ground at the same pixel scale as the existing heroes (figure height about 430–470 px inside a 512 px frame). Large enemies may fill the frame; small enemies stay readable at about 60% height.
- **Facing.**
  - Mercenaries face **right** in a 3/4 view, like the 4 heroes.
  - Enemies face **left** toward the party, like the Raider and Brute.
- **Grounding.** Soles sit on one baseline, with a small transparent margin (soles at about y = 490–500 of 512). No cast shadow is painted into the frame; the game draws its own.
- **Silhouette.** Each character must be identifiable as a black silhouette at 64 px high, and clearly different from the 4 heroes:
  - blonde shield Knight;
  - red-haired sword Duelist;
  - silver-haired violet Mage;
  - brown-haired green Priest.

### 2. The world they live in

The setting is the Veil Frontier ("ชายแดนม่านเวล"): floating ancient ruins, cyan waterfalls, pale stone and gold filigree. Purple rift corruption grows toward the north. There are four zones:

1. **Meadow** (ทุ่งชายแดน): lush grass and wildflowers.
2. **Thicket** (พงหนามม่านเวล): teal and olive thorns, mist and veil wisps.
3. **Rift Scar** (แผลรอยแยก): cracked violet ground, glowing fissures and crystals.
4. **Sanctum** (ประตูรอยแยก): pale holy stone around the Rift Gate.

Enemies belong to a zone's ecosystem. They get stranger and more crystal-corrupted the closer they are to the rift.

### 3. Mercenaries (6), hired at camps

These are hireable adventurers, not story heroes. They need practical gear and a confident, friendly look. Each one needs a role readable from its weapon alone. The names are working names.

| ID | Working name | Role / weapon | Look keywords |
|---|---|---|---|
| `merc_spear` | Garran | Front-line spear vanguard, round buckler | Broad, tanned, short dark hair, teal tabard over scale, long leaf-blade spear |
| `merc_archer` | Mira | Back-line longbow ranger | Lean, auburn braid, forest-green hood, quiver of white-fletched arrows |
| `merc_alchemist` | Toma | Back-line alchemist (support / energy) | Round glasses, goggles on head, brass satchel of glowing vials, apron |
| `merc_scout` | Sefa | Front-line twin-dagger scout | Agile, short silver-blue hair, dark leather, scarf, crouched ready pose |
| `merc_warden` | Brann | Front-line hammer warden (heavy defence) | Big, bearded, stone-grey armour with gold trim, two-handed rune hammer |
| `merc_bard` | Lio | Back-line rune bard (buff / heal) | Curly hair, layered coat, lute-like rune instrument with floating notes |

Mercenary colour accents must not reuse a hero's main colour as their dominant colour. Each mercenary gets its own accent:

- `merc_spear`: teal
- `merc_archer`: forest green
- `merc_alchemist`: brass and amber
- `merc_scout`: steel blue
- `merc_warden`: stone and gold
- `merc_bard`: coral

### 4. New enemies (9)

The names are working names. Every enemy must be readable as either a physical threat (claws, weapons, bulk) or an energy threat (glow, runes, floating), because the game shows physical and energy attacks differently. The original Raider (magenta horned) and Brute (violet crystal dragon) stay in use; do not redraw them.

| ID | Zone / tier | Concept | Threat |
|---|---|---|---|
| `foe_tusker` | Meadow / normal | **Mossback Tusker**: stocky boar-like beast with mossy back and flower sprigs, small tusks; cute but tough | Physical |
| `foe_sprite` | Meadow / normal | **Dandelion Sprite**: small floating seed-puff fairy with a glowing core, mischievous | Energy (small, about 60% height) |
| `foe_stalker` | Thicket / normal | **Briar Stalker**: lean lynx-like predator with thorn spines and glowing teal eyes | Physical |
| `foe_mycon` | Thicket / normal | **Hollow Mycon**: mushroom shaman with a cap hood and a staff of glowing spores | Energy |
| `foe_golem` | Scar / normal | **Shard Golem**: chunky rock golem with violet crystals growing through its cracks | Physical (large) |
| `foe_riftweaver` | Scar / normal | **Rift Weaver**: hooded cultist floating over a fissure, with rune ribbons | Energy |
| `foe_matriarch` | Thicket / **elite** | **Thorn Matriarch**: towering dryad-like queen of briars with a crown of thorns; clearly bigger and more ornate than normal foes | Mixed |
| `foe_juggernaut` | Scar / **elite** | **Crystal Juggernaut**: armoured beetle-rhino encased in rift crystal | Physical (large) |
| `foe_sentinel` | Scar / **mini boss** | **Veilbound Sentinel**: ancient gate guardian of pale stone and gold, cracked open by purple corruption, with a halberd and a floating sigil ring; fills the frame | Mixed |

Tier readability rules:

- **Elites** have a subtle gold accent somewhere, such as a crown, banding or a horn tip.
- **The mini boss** has both gold and violet glow.
- **Normal foes** have no gold.

### 5. Exact deliverables

For **each of the 15 characters**:

1. **Full-body idle frame**: 512×512 RGBA PNG plus WebP (quality about 85), transparent background, facing as specified, soles on the shared baseline.
2. **Square bust portrait**: 512×512 RGB WebP plus PNG. Head and shoulders, same angle as the existing portraits, with a soft painted background in the character's accent colour (the existing portraits have painted backgrounds, not transparency). The face must be readable when shown at 40 px in a circle crop.

**Atlases** in the existing format: 2 columns of 512 px frames, ordered as in the tables.

- `units_mercs.webp` (1024×1536, 6 frames) and `portraits_mercs.webp` (1024×1536).
- `units_foes.webp` (1024×2560, 9 frames in 2 columns × 5 rows, last slot empty) and `portraits_foes.webp` (1024×2560).
- Matching `*.json` frame maps: `{ "<id>": { "x", "y", "w", "h", "footY" } }`, where `footY` is the sole baseline in source pixels.

**Optional (nice to have):** an attack pose and a hit pose per character in the same frame format. These go in `units_*_attack.webp` and `units_*_hit.webp`, with identical frame order and anchors so the poses can swap without shifting.

**Review sheets** (reference only, not runtime):

- `review/lineup-mercs.png`: all 6 mercenaries next to the 4 existing heroes at the same scale on a neutral background.
- `review/lineup-foes.png`: all 9 new enemies next to the existing Raider and Brute, same scale.
- `review/silhouettes.png`: black silhouettes of all 15 at 64 px high.
- `review/in-arena.png`: a mock composition of 2 mercenaries plus 2 heroes against 2 new foes over `ruins.webp`. This is a mock only; do not change the arena.
  - Use the real positions: our side at x 14–39% facing right; foes at x 70–85% facing left, with the large foe at the front position.
  - Show it at phone size (about 100 px units) and at desktop size (about 145 px units, 215 px for large foes).
- `review/on-map.png`: the elite and mini-boss full-body frames scaled to about 1.5 world tiles, standing on the existing tileset.

### 6. Technical constraints

- **Original work only.** No copying, tracing or "in the style of" any named game, studio or artist. No trademarked designs. Do not import anything from any other repository.
- **No text** in any image: no names, numbers or letters. All labels are rendered live in Thai HTML.
- Transparent background for full-body frames. sRGB. No semi-transparent halo or fringe around edges; no stray pixels outside the figure.
- **Consistent scale and anchor.** Every full-body frame shares the same sole baseline (record it as `footY`). Nothing may cross the 512 px frame edges; keep 8 px of padding, except the mini boss, which may reach 4 px.
- **Readability at gameplay size:**
  - Phones render units at about 120–180 px tall and portraits at 30–40 px.
  - Faces and weapons must read at those sizes.
  - Avoid thin lines that vanish when scaled down.
- **Budget.** All new runtime WebP files together must stay at or under **2.0 MB**. PNG copies are build/review only and do not count.
- Keep the six existing frames and the backdrop byte-for-byte unchanged. Include a SHA-256 check in `NOTES.md`.

### 7. Do not

- Do not redesign or regenerate the 4 heroes, the Raider, the Brute or any world or UI asset.
- Do not add UI, HUD, icons, cards, gacha frames, rarity stars, prices or currency art. The mercenary hiring UI and rules are not designed yet.
- Do not make any character sexualised, gory or frightening for young players. Corruption should read as magical crystal and glow, not body horror.
- Do not use pixel art, 3D renders, photo textures or realistic proportions.
- Do not change files under `src/`, `tests/`, `.github/` or `public/`.

### 8. Validation checklist (tick before returning)

- [ ] 15 full-body idle frames, 512×512 RGBA, shared baseline (`footY` recorded)
- [ ] **Facing:** all 6 mercenaries face RIGHT (→); all 9 enemies face LEFT (←); portraits match their frame's facing
- [ ] `review/in-arena.png` uses the real formation: mercenaries on the left facing right and foes on the right facing left, at the real display sizes from `ART-PLACEMENT-RULES.md`
- [ ] 15 portraits, 512×512, readable at 40 px in a circle
- [ ] 4 atlases + 4 JSON frame maps in the 2-column 512 px format
- [ ] Line-up, silhouette, in-arena and on-map review sheets
- [ ] Every silhouette is distinct at 64 px, including against the 4 heroes and 2 existing enemies
- [ ] Elites show a gold accent, the mini boss shows gold plus violet, normal foes show no gold
- [ ] No text, logos or copied designs; no edge halos
- [ ] Runtime WebP total ≤ 2.0 MB; existing art hashes unchanged
- [ ] `NOTES.md` complete

### 9. Return package

```text
incoming/ART-CHAR-MERC-ENEMY-001/
  NOTES.md            # file list, sizes, footY per frame, palette per character, generation provenance, hashes
  STYLE_CHECK.md      # how each character matches the existing style lock, plus known deviations
  mercs/   merc_spear.webp/.png … (full body)   portrait_merc_spear.webp/.png …
  foes/    foe_tusker.webp/.png …               portrait_foe_tusker.webp/.png …
  atlas/   units_mercs.webp  portraits_mercs.webp  units_foes.webp  portraits_foes.webp  *.json
           (optional) units_mercs_attack.webp  units_mercs_hit.webp  units_foes_attack.webp  units_foes_hit.webp
  review/  lineup-mercs.png  lineup-foes.png  silhouettes.png  in-arena.png  on-map.png
```

**Git steps (required):**

1. Create the branch `art/art-char-merc-enemy-001` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-CHAR-MERC-ENEMY-001/`.
3. Commit with the message `art: add ART-CHAR-MERC-ENEMY-001 mercenary and enemy art`.
4. Push the branch to `origin`.
5. Open a **draft pull request** into `feature/fateweave-initial-prototype`.
   - Title: `[ART-CHAR-MERC-ENEMY-001] Mercenaries and new enemies`.
   - Body: embed the review sheets, include the ticked checklist and the runtime byte total, and end with the line **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

**Game context, updated 2026-10-15.** Every party member is a hired mercenary, including the existing four. Each mercenary is one unique character with one portrait; the art is not a class skin. Star ranks are shown live in HTML; do not paint stars into any image.

After you return, the developer runs an Asset Intake Review: style match, scale and anchors, readability at gameplay size, budget and provenance.

**Not included in this art task:**

- Game rules for mercenaries: hiring, cost, party size and how they join battles.
- New enemy stats or encounters.

Those are a separate scoped gameplay task. Combat currently fields exactly 4 heroes, and enemies use two illustrated slots.
