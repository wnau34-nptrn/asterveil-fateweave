# CODEX HANDOFF — ART-UI-WORLD-001
## Asterveil · Fateweave: next-gen World Map, HUD and Title redesign

> Copy everything below this line into Codex.

---

You are the **Art Director + UI/UX designer + asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser. Make the game look like a **premium 2026 mobile JRPG**: modern, luminous, playful and exciting to explore. The current exploration map and HUD look flat and dated: plain coloured squares, dark boxes and default-looking buttons. Replace that whole look with something players screenshot and share.

Design it, produce the assets, and return a package that a developer (Claude) will integrate. **Do not change game logic or files under `src/`.** Visual direction, assets, tokens and reference mockups only.

---

### 1. The game (what you are designing for)

- **Loop:** the player leads 4 heroes across a **square-tile map**, moving **one tile per tap** in 4 directions. Each step in a dangerous zone has a visible chance of triggering an SPD turn-based battle. HP carries between battles. **Camps** heal and revive. A **boss** guards the gate at the end.
- **Heroes** (existing art, keep exactly): Aegis (เอกิส) blonde shield Knight; Lyra (ไลรา) red-haired sword Duelist; Eira (ไอรา) silver-haired violet Mage; Seren (เซเรน) brown-haired green Priest. **Enemies:** magenta horned Raider; violet crystal-armored dragon Brute (also the boss "Rift Warden").
- **World:** "ชายแดนม่านเวล" (Veil Frontier). Floating ancient ruins, cyan waterfalls, pale stone arches, gold/navy magic, purple rift corruption spreading as you go north.
- **Zones on the map** (south → north, increasing danger):
  1. **Meadow** "ทุ่งชายแดน" — lush green frontier grass, wildflowers, safe-feeling.
  2. **Thicket** "พงหนามม่านเวล" — olive/teal thorny brush, misty, veil wisps.
  3. **Rift Scar** "แผลรอยแยก" — cracked violet ground, glowing purple fissures, crystal shards.
  4. **Sanctum** "ประตูรอยแยก" — pale holy stone plaza around the **Rift Gate** (goal).
  - Plus **walls/cliffs** (impassable), **camps** (warm firelight), **start flag**, **boss tile**, **gate/goal**, and **fog of war** (unexplored tiles).
- **Platforms:** phone portrait first (320×568 up to 430×932), also phone landscape (844×390), tablet (768×1024) and desktop (1366×768, 1920×1080). **The page never scrolls.** Everything fits one screen.
- **Tech:** the HUD is **HTML/CSS (DOM)** and the map is a **DOM grid of square tiles** (36–64 px per tile on screen, camera follows the party). The battle field is a Phaser canvas. All Thai text is rendered live in HTML, **never baked into images**.

### 2. Creative direction — "Luminous Veil"

Aim: **modern high-fidelity 2D JRPG** quality (the polish level of top 2024–2026 mobile JRPGs), but **100% original**. Do not copy any existing game's UI, logos, layout signatures, characters or assets.

- **Map style:** hand-painted **top-down with a gentle 3/4 tilt** (walls and cliffs show a front face; floors are top-down). Rich texture, soft ambient occlusion, warm light from the top-left, painterly but clean. Tiles must read clearly at **36 px** and look gorgeous at **64 px+**.
- **Make exploring feel alive:** layered depth (tiles → decor props → party token → fog → HUD), soft drop shadows, glow on interactive spots, gentle ambient motion (grass sway, water shimmer, rift pulse, campfire flicker, floating dust or veil motes).
- **HUD style:** "glass + gold filigree, minimal". Dark navy glass panels (blur/translucency), **thin champagne-gold edges**, small ornamental corner accents (not thick metal frames), soft inner glow, crisp line icons. Modern, airy, high contrast. Think premium fantasy rather than a medieval spreadsheet.
- **Palette** (evolve, don't discard): midnight navy `#08121f`–`#14243a`, champagne gold `#d9bf86`/`#f2d596`, veil cyan `#74d4ef`, mint HP `#68e5b6`, rift violet `#b59aff`/`#9454d6`, danger coral `#ed927f`. Add per-zone accent colours.
- **Fun factor:** juicy feedback. Hop squash-and-stretch, step dust puffs, a danger meter that heats up visibly, an **encounter transition** (the "veil shatters" into shards, then the battle starts), a boss reveal, camp-rest healing sparkles, and a gate-opening finale.
- **Typography:** must support Thai beautifully. Pick Google Fonts with open licences, e.g. **Kanit** or **Prompt** for headings/numbers and **Noto Sans Thai** or **IBM Plex Sans Thai** for body. State the exact families, weights and sizes. Min body 12 px on phones; numbers bold and legible.

### 3. Screens and components to design

Design every item in **all states**. Produce mockups at **390×844 (portrait), 844×390 (landscape) and 1366×768 (desktop)**.

**A. World / exploration screen** (top priority)
1. **Top bar:** zone name (+ small map-name eyebrow) · **Encounter Danger Meter** · ⓘ button.
   - The meter replaces the current text chip "โอกาสพบศัตรู 12%".
   - Show the % for the next step plus a visual gauge.
   - 4 states: **Safe** (camp/sanctum, shield icon, mint), **Low** < 15%, **Mid** 15–29%, **High** ≥ 30%. It heats from calm cyan to burning coral, with a pulse when it rises.
2. **Map viewport:** a rounded frame with a vignette. The camera follows the party.
   - The party token is the Knight's circular portrait (existing art) inside a premium frame, with a ground shadow.
   - Show **adjacent-step hints**: the up to 4 walkable neighbours get a tap highlight (current: dashed box, needs a much nicer design).
3. **Party strip:** 4 hero cards with portrait, name, HP number and HP bar. States: healthy / hurt / critical (<25%, pulsing) / **fallen** (grey portrait, "ล้มแล้ว").
   - Portrait phones: 4 compact cards in one row (no portrait; name + HP).
   - Desktop: 2×2 with portrait.
4. **Message line:** the last event, e.g. "ก้าวต่อไป · ไม่พบศัตรู (โอกาส 7%)" or "พักที่แคมป์แล้ว…".
5. **D-pad:** 4 arrow buttons around a centre **Camp/Rest button "พัก"**. The centre button glows only when standing on a camp tile.
   - States for each button: normal / pressed / disabled / focus-visible.
   - Button size: 60 px desktop, 46 px phones (min 44 px).
6. **Goal checklist** (desktop/tablet side panel only):
   - "ผ่านการปะทะครั้งแรก"
   - "พักที่แคมป์"
   - "ชนะผู้คุมรอยแยก"
   - "ไปถึงประตูรอยแยก"
   - Each in done/undone state, plus "เดิน X ก้าว · ชนะ X · แพ้ X".
7. **Banners/overlays on the map:**
   - "พบศัตรู!" + encounter name + enemy names (just before battle; the veil-shatter transition starts here).
   - Boss version: "บอส · ผู้คุมรอยแยก".
   - First battle: "ศึกแรก · การปะทะครั้งแรก".
   - Expedition complete: "สำเร็จการเดินทาง · ประตูรอยแยกปิดลงแล้ว" + stats + primary button "เริ่มการเดินทางใหม่".
8. **Info dialog (ⓘ):** modal sheet with rules text, stats and a danger-styled "เริ่มการเดินทางใหม่" button with a confirm state.

**B. Title screen**
- Background: a key-art style composition of the Veil Frontier (floating ruins, rift glow), with the 4 heroes optional as silhouettes or using the existing portraits. Create **new background art only** and keep character art unchanged.
- Game name "**Asterveil · Fateweave**" as a **logo treatment**: deliver it as an SVG/transparent PNG. This is the one place text-in-image is allowed, Latin letters only.
- Buttons: "เล่นต่อ →" (primary, with a save summary line above it such as "เดินแล้ว 12 ก้าว · ชนะ 3 ศึก") and "เริ่มการเดินทางใหม่" (secondary, plus its confirm state).
- No-storage warning line style.

**C. Battle HUD skin refresh** (same layout regions; re-skin only)
- Keep these regions in place:
  - header: battle kind eyebrow "ศึกสอน/พบศัตรู/บอส" + name + round chip + ⓘ;
  - SPD turn-order band (4 slots on phones, 6 on large screens; now/next/round labels; "หยุด" interrupted state);
  - tutorial coach strip;
  - arena (Phaser canvas, existing backdrop and units);
  - enemy HP cards;
  - enemy intent band (attacker → target, power number, physical/energy tag, lethal warning);
  - 2×2 hero cards (class/lane, HP, barrier, 2 skill statuses: ready/cooling/waiting);
  - command buttons (Attack + 2 skills: name, English sub-label, power, cooldown reason);
  - floating skill popover;
  - start card ("เริ่มต่อสู้ →");
  - result card (victory/defeat + "กลับสู่แผนที่ →" / "กลับแคมป์ →" / "ลองศึกสอนอีกครั้ง ↻").
- Give it the same "Luminous Veil" language as the world. Cyan = heroes, violet/pink = enemies, gold = current turn/selection.
- Field target markers: ≥44 px tap areas over characters; the valid-target ring looks inviting, not like a debug box.

### 4. Exact deliverables

Return in `incoming/ART-UI-WORLD-001/` (outside runtime; the developer moves accepted files into `public/assets/`).

**Concept and spec**
- `mockups/world-390x844.png`, `world-844x390.png`, `world-1366x768.png`
- `mockups/world-states.png` — the danger meter's 4 states, hero card states, D-pad states, adjacent-step highlight, fog edge
- `mockups/encounter-transition.png` — 3–5 storyboard frames of the veil-shatter transition + boss reveal variant
- `mockups/title-390x844.png`, `title-1366x768.png`
- `mockups/battle-390x844.png`, `battle-1366x768.png` (re-skinned HUD over the existing arena art)
- `STYLE_GUIDE.md` — palette (hex), fonts, type scale, spacing, radii, shadows/glows, icon style, motion timings, do/don't

**Map tileset** (painted, transparent where needed, **source tile 128×128 px**, exported WebP + PNG)
- `tiles/tileset.webp` — grid atlas + `tiles/tileset.json`, frame name → `{x, y, w, h}`. Frames:
  - Floor per zone, **4 variants each** to break repetition: `meadow_0..3`, `thicket_0..3`, `scar_0..3`, `sanctum_0..3`, `camp_ground_0..1`.
  - **Walls/cliffs:** `wall_top`, `wall_face` (3/4 front face for when the tile below is walkable), `wall_inner`, plus `wall_edge_n/s/e/w` and corner pieces if you use them. Walls must work on a **plain square grid with no autotiling engine**. If edge pieces are optional, the plain set alone must still look good.
  - **Zone transitions (optional, nice to have):** soft blend overlays `blend_<zoneA>_<zoneB>_<n|s|e|w>` as transparent PNG.
- `tiles/decor.webp` + `decor.json`: transparent props placed on floor tiles. Grass tufts, flowers, rocks, thorn bushes, crystal shards, rift cracks, broken pillars, rune stones, banners. At least 6 per zone. Each prop sits inside one 128 px tile with a bottom-centre anchor.
- **Landmarks** (transparent, 128 px or 256 px for 2×2 visual overhang, bottom-centre anchor):
  - `landmark_camp` — tent + campfire, plus a 4-frame fire strip `camp_fire_0..3`;
  - `landmark_start` — frontier flag/waystone;
  - `landmark_gate` — the Rift Gate, a glowing portal arch;
  - `landmark_gate_open` — the finale;
  - `boss_pedestal` — dark rift circle the boss stands on (the boss figure itself comes from the existing Brute portrait/unit art);
  - `landmark_boss_cleared` — a broken seal after victory.
- **Fog of war:** `fog_tile` (seamless dark veil cloud) and `fog_edge_n/s/e/w` + corners (soft dissolve where explored meets unexplored), or a single soft radial mask PNG with clear instructions.
- **Party token:** `token_frame` (circular gold frame + base shadow, transparent; the portrait goes inside via CSS), `step_hint` (adjacent-tile highlight, 128 px, transparent, suitable for a CSS pulse) and `step_dust_0..3` (hop dust puff strip).

**HUD kit** (prefer CSS-recreatable designs; images only where painting adds real value)
- `ui/panel_frame_9slice.png` — glass panel corner ornaments with the slice insets documented (e.g. 24 px)
- `ui/button_primary_9slice.png`, `ui/button_secondary_9slice.png` (if not pure CSS)
- `ui/meter_danger.svg` (or CSS spec) — gauge track/fill/glow for 4 states
- `ui/hp_bar` spec — track, fill gradients (ally mint, enemy violet, critical coral), barrier overlay
- `icons/*.svg` — 24×24 viewBox, single-colour `currentColor`, 1.6–2 px strokes, rounded caps:
  - movement: up/down/left/right;
  - places and events: camp/rest, flag, gate/star, danger, safe-shield, boss-skull/horn, map;
  - steps/footprints, info, close, settings, check (done), circle (todo);
  - **also re-draw** the 9 battle skill icons: attack, guard, bash, mark, precision strike, arcane bolt, ward, heal, prayer.
- `title/title_bg.webp` (1920×1080 safe crop for 390×844 portrait — mark the focal safe area), `title/logo.svg` + `title/logo.png`
- `fx/` — small transparent sprite strips (≤ 8 frames, ≤ 256 px): `veil_shatter`, `heal_sparkle`, `encounter_flash`, `rift_pulse`. Or precise CSS keyframe specs instead.
- `tokens.css` — CSS custom properties for every colour, radius, shadow, blur, font and motion duration in the style guide (e.g. `--panel-bg`, `--gold-edge`, `--danger-high`, `--hop-ms`).
- `NOTES.md` — file list, sizes, frame maps, anchors, 9-slice insets, licence/font sources, and anything the developer must know.

### 5. Technical constraints (must follow)

- **Original work only.** No traced or copied UI, characters, logos or textures from any game or artist. No AI-reproduced trademarked styles.
- **No text inside images** except the title logo. All Thai/English labels stay live HTML.
- **Keep existing character art unchanged:** `units.webp` (6 × 512 px full-body frames: Knight, Duelist, Mage, Priest, Raider, Brute), `portraits.webp` (2×3 square portraits) and `ruins.webp` (battle backdrop). New art must match their **heroic chibi anime** style, lighting and saturation.
- **Readability:** tiles readable at 36 px. Zones distinguishable by colour **and** texture (colour-blind safe). Walls clearly impassable. Interactive spots (camp, gate, boss) recognisable by silhouette.
- **Touch:** every control ≥ 44×44 px; layouts fit the viewport with **no page scroll**; respect iOS safe areas (notch/home bar).
- **Motion:** every animation needs a **reduced-motion** fallback (fade or instant). Keep the hop at ~140–180 ms and the encounter transition at ≤ 800 ms. Nothing blocks input longer than that.
- **Performance budget:**
  - total new runtime assets ≤ **2.5 MB** (WebP, quality ~80);
  - tile atlas ≤ 2048×2048;
  - no video;
  - effects must run smoothly on a mid-range phone (prefer CSS transforms/opacity; avoid heavy filters on many tiles).
- **Formats:** WebP + PNG fallback for raster, SVG for icons/logo, transparent backgrounds, sRGB, consistent bottom-centre anchors, consistent top-left light.
- Fonts must be free for commercial web use (Google Fonts / OFL) with exact family names.

### 6. Preserve (do not change)

- Game rules, layout regions and the information shown on each screen (listed above).
- One-tile movement with D-pad + tapping adjacent tiles. **No virtual joystick, no auto-pathing.**
- Battle mechanics UI: SPD turn queue, enemy intent band, 2×2 hero cards, 3 command buttons, tapping characters on the field to target, the floating skill popover.
- Thai as the UI language; existing Thai copy (you may suggest copy tweaks in NOTES).
- No big logo/header bar during gameplay (logo only on the title screen).

### 7. Do not

- Do not redesign or regenerate the 6 characters or the battle backdrop.
- Do not add systems that don't exist: no currency counters, gacha, energy/stamina, shop, AUTO button, minimap, chat or ads. (Equipment/loot UI comes in a later task.)
- Do not use thick metallic frames, skeuomorphic wood/parchment or pixel-art.
- Do not use dark-on-dark low-contrast text; keep WCAG AA contrast for body text.
- Do not modify `src/`, tests or workflows.

### 8. Validation checklist (tick before returning)

- [ ] 3 world mockups + states sheet + transition storyboard + 2 title + 2 battle mockups
- [ ] Tileset: 4 variants × 4 zones + camp ground + wall set + fog set, all 128 px, with atlas JSON
- [ ] Decor ≥ 6 per zone, landmarks (camp + fire strip, start, gate closed/open, boss pedestal/cleared)
- [ ] Party token frame, step hint, dust strip
- [ ] HUD kit: panels, buttons, danger meter (4 states), HP bars, icons (movement/world + 9 skills) as SVG
- [ ] `tokens.css`, `STYLE_GUIDE.md`, `NOTES.md` complete (sizes, anchors, 9-slice insets, fonts + licences)
- [ ] Every control ≥ 44 px; portrait 320×568 and landscape 844×390 shown without scroll
- [ ] Reduced-motion fallback documented for every animation
- [ ] Matches the existing chibi art style; no text baked into images (except logo)
- [ ] Total runtime assets ≤ 2.5 MB; no copied or trademarked material

### 9. Return package

```text
incoming/ART-UI-WORLD-001/
  STYLE_GUIDE.md
  NOTES.md
  tokens.css
  mockups/   world-390x844.png  world-844x390.png  world-1366x768.png
             world-states.png  encounter-transition.png
             title-390x844.png  title-1366x768.png
             battle-390x844.png  battle-1366x768.png
  tiles/     tileset.webp  tileset.png  tileset.json
             decor.webp  decor.png  decor.json
             landmark_*.webp/png  fog_*.webp/png  token_frame.png  step_hint.png  step_dust.webp
  ui/        panel_frame_9slice.png  button_*_9slice.png  meter_danger.svg
  icons/     *.svg
  title/     title_bg.webp  logo.svg  logo.png
  fx/        veil_shatter.webp  heal_sparkle.webp  encounter_flash.webp  rift_pulse.webp
```

After you return the package, the developer will run an Asset Intake Review (style match, sizes, anchors, readability at 36 px, budget, licences). The developer then integrates the assets into the DOM map renderer and HUD, and checks them on all 11 test viewports.
