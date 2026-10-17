# ART-UI-WORLD-001 — developer intake

This is the Luminous Veil **visual package**, placed outside runtime. Move only accepted production files into `public/assets/`. No `src/`, tests, workflows, character images or game rules were modified. The checked-out repository was the minimal main branch; original reference assets were obtained read-only from `feature/fateweave-initial-prototype` through the connected GitHub tool.

## Revision 2 — current layout

Updated to the user's full-screen map correction. All exploration HUD floats above the map, with transparent four-arrow controls lower left and the contextual talk/rest action lower right. No world sidebar or tabs remain. `ui/world_overlay.css` supplies the revised skin. `RESEARCH.md` records the Guardian Tales / AFK Journey / Genshin exploration references and the original design interpretation. `reference/DESIGN_R2.md` records the visual inventory.

`mockups/concept-fullscreen-390x844.png` and `concept-fullscreen-1366x768.png` are Image Generation concept references; their Latin text is illustrative and never a runtime asset. Final `world-*` mockups render actual live Thai DOM, existing original portraits and the real tile/decor atlas. New `world-goals-390x844.png` and `world-high-1366x768.png` show the floating checklist and danger state. The version 1 ZIP remains next to the package as `ART-UI-WORLD-001-v1.zip` for comparison; the current ZIP and folder contain revision 2.

The former centre Rest control was deliberately moved to the lower-right contextual action per the user's latest direction. The D-pad's centre is now empty; movement remains one tile per tap. The interaction slot uses existing camp/rest availability and does not implement NPC dialogue or invent other game systems. The full four-goal checklist and stats are preserved in a disclosure rather than a permanent side panel.

## Start here

- Review `mockups/world-390x844.png`, `world-844x390.png`, `world-1366x768.png`.
- Review `world-states.png` and `encounter-transition.png` for the complete exploration state language.
- Review `mockups/asset-readability.png` for all biome variants at 36/64 px, grayscale texture cues, props and landmark silhouettes.
- Review title and battle mockups; extra `battle-states.png`, small-world, popover and title-confirm references are included.
- Use `STYLE_GUIDE.md`, `tokens.css`, `ui/components.css`, `ui/HUD_KIT.md` and `fx/README.md` for implementation. These are proposed visual values; existing game state remains authoritative.
- `MANIFEST.json` records file sizes, image dimensions and SHA-256 checksums. `reference/validation.json` records browser measurements and disclosure/target interactions.

## Package map and dimensions

| Files | Dimensions / purpose |
|---|---|
| `tiles/tileset.webp`, `.png`, `.json` | 512×768, 4 columns × 6 rows of 128 px frames; 21 occupied slots, unused slots transparent |
| `tiles/decor.webp`, `.png`, `.json` | 768×512, 6 columns × 4 rows, 24 transparent 128 px props, six per biome |
| `tiles/landmark_camp`, `landmark_start`, `landmark_gate`, `landmark_gate_open`, `boss_pedestal`, `landmark_boss_cleared` | Each 256×256 RGBA, WebP + PNG, one logical cell and 2×2-cell visual overhang |
| `tiles/camp_fire.webp/.png/.json`, `step_dust.webp/.png/.json` | Each 512×128; four 128 px frames in one row |
| `tiles/camp_fire_0..3`, `step_dust_0..3` | Individual 128 px WebP + PNG frames, convenient alternatives to strips |
| `tiles/fog_tile`, `fog_edge_n/s/e/w`, `fog_corner_ne/se/sw/nw` | Each 128×128 WebP + PNG; opaque tile plus transparent directional dissolves |
| `tiles/token_frame.png/.webp`, `step_hint.png/.webp` | 128×128 RGBA; portrait mask uses CSS, adjacent hint uses CSS pulse |
| `ui/panel_frame_9slice.png/.webp` | 128×128 transparent ornaments; 24 px insets |
| `ui/meter_danger.svg`, `components.css`, `HUD_KIT.md` | Editable gauge / CSS button and HP spec; no button rasters necessary |
| `icons/*.svg` | 29 originals, 24×24 viewBox, currentColor, stroke 1.8 px |
| `title/title_bg.webp/.png` | 1920×1080, sRGB, centre-safe portrait cover crop |
| `title/logo.svg/.png/.webp` | 700×224; Latin-only outlined SVG, transparent rasters; source SVG retained |
| `fx/effects.css`, `README.md` | Precise CSS delivery option for shatter, heal, flash and rift; reduced-motion variants |
| `reference/` | Live HTML/CSS art references, original unchanged art and licensed local preview fonts; never ship as new game art |
| `tools/` | Authored vector sources, packing, logo outlining, mockup rendering and intake validator; build-time only |
| `licenses/` | Font source licences; build-time/reference information |

Raster PNG fallbacks are palette-quantized for budget. WebP quality 80 is the primary image path; PNG retains actual transparency. Do not load WebP and PNG simultaneously. The budget includes **both formats**, all duplicate conveniences, SVGs, CSS and frame maps in production directories. Mockups, original reference art, preview fonts, build tools and documents are not runtime assets. See the manifest for exact totals; it enforces the stricter decimal 2,500,000-byte limit.

## Floor atlas

The JSON maps each name directly to `{x,y,w,h}` in source pixels. Every occupied frame is exactly 128×128. At display tile size T, atlas background size is `4*T` by `6*T`; frame offsets are `-(x/128)*T`, `-(y/128)*T`. Prefer DOM backgrounds with exact integer tile dimensions and clip each cell to prevent edge sampling. Phaser users may extrude frame boundaries in a separate texture packing step, but no engine/autotiler is required here.

Frame order:

- Row 0: `meadow_0`, `_1`, `_2`, `_3`
- Row 1: `thicket_0`, `_1`, `_2`, `_3`
- Row 2: `scar_0`, `_1`, `_2`, `_3`
- Row 3: `sanctum_0`, `_1`, `_2`, `_3`
- Row 4: `camp_ground_0`, `camp_ground_1`, `wall_top`, `wall_face`
- Row 5: `wall_inner`, then three unused slots

Choose variants with a stable tile-coordinate hash; never randomly change a floor variant on each render. The painted patterns differ while the revised lighting stays close enough to avoid strong checkerboarding. Floors have a true top-down surface. Painted rock ledges identify walls; use `wall_face` when the cell immediately south is walkable, `wall_inner` for fully surrounded wall cells, and `wall_top` otherwise. Each is a complete cell; no neighbour-rule autotiler, transparent cliff-edge layer or optional corner piece is required. Standalone wall duplicates are deliberately omitted: they are in the atlas.

Optional zone-blend overlays were not included. The four biome boundaries remain clearly readable and can receive low-density props near their edges. Do not blur individual floor cells or add opacity that reveals a bright page behind them.

## Decor and anchors

`decor.json` records each frame, biome and bottom-centre anchor `{x:.5,y:1}`. New props and landmarks were aligned using solid-alpha bounds; their solid base lies within 4 px of the image bottom. Source-sheet crop boundaries were adjusted in the packing tool around transparent gaps (not assumed to match every generated cell perfectly), preventing the next row's banner tip or the previous column's tent from entering another frame. Position a decor frame at the tile's bottom-centre. Render transparent props as an independent layer; each stays in a 128 px slot. The six per-zone props are:

- Meadow: `grass_tuft`, `ivory_flowers`, `moss_rock`, `fern`, `wildflowers`, `sapling`.
- Thicket: `thorn_bush`, `twisted_root`, `veil_wisp`, `briar_knot`, `mushrooms`, `teal_shrub`.
- Rift scar: `crystal_cluster`, `rift_crack`, `shard_pile`, `scar_rock`, `rift_mote`, `broken_rune`.
- Sanctum: `broken_pillar`, `rune_stone`, `banner`, `arch_fragment`, `marble_block`, `rune_crystal`.

Landmarks use the same `.5,1` image-box anchor, source 256 px, rendered at `2*T` with centre horizontally on the logical cell and bottom on its ground edge. Their visual overhang does not change collision: camp/start/boss/gate rules still refer to one logical cell. `landmarks.json` states both logical and visual footprints. Clip overhang at the viewport, not the individual tile; use foot-Y depth order for overlapping art.

The camp painting already contains fire. For stronger flicker, place the small `camp_fire` strip over its existing fire hotspot and keep the static art below; do not add another camp interaction or fire collision. Dust and fire have identical source slot sizes and stable frame anchors; their transparent bottom margin is deliberate for the ground effect. Keep all four frames at one scale, no frame-by-frame trimming.

Token frame: circle centre `(64,58)`, inner portrait radius approximately 36 px. CSS portrait box: left 22%, top 16%, width/height 56%, border-radius 50%. Put it below the frame and do not alter the original portrait atlas. Shadow centre `(64,110)`. Source box anchor `.5,1`; offset the token slightly above the logical tile ground point. The reference uses a 1.3*T token bounding box and keeps the actual visible portrait/frame around one tile.

Adjacent hint: 128 px corners inside 12..116; no dashed rectangle. Only adjacent walkable neighbours receive it. At T<44 px, its transparent button layer is 44 px and circularly clipped while artwork remains T px. Decorative overlays use pointer-events none.

## Fog

Use `fog_tile` on unexplored cells, above floor, props and token. Put an edge **inside the explored neighbour**: `_n` means opaque fog is to the north and the veil fades toward the south; analogous E/S/W. Corners name the unexplored diagonal; NE is strongest at the northeast corner. Do not draw an edge over a full opaque fog cell. Use a full edge for cardinal boundaries and a corner only for a diagonal boundary with no cardinal fog neighbour. Avoid stacking multiple opacity layers into a black seam. Keep the party's active cell and adjacent legal targets visible according to the existing reveal rules.

The tile's cloud detail is deliberately faint so repeating silhouettes do not become a visible grid. Fog is navy, not black. Fog movement is optional and should be a single viewport veil overlay, never a CSS filter on each tile.

## Title safe crop

Use `background-size:cover; background-position:50% 50%`. At 390×844, the 1920×1080 source shows about **499 px** of central width: source X approximately **710..1210**, full Y **0..1080**. Essential arch/waterfall detail is centred there. Place the Latin logo in the upper 12–34% of screen height and live buttons in the lower portion. A CSS navy gradient behind text is part of the reference skin, not baked into art. Optional source safe rectangle is `{x:710,y:0,w:500,h:1080}`. Side ruins intentionally crop out on phones.

The logo is path-based SVG, transparent PNG/WebP alternatives; all glyphs are Latin. `logo.source.svg` holds the editable typographic treatment. No external font dependency is required to display `logo.svg`.

## Original source art and provenance

Read-only source branch: [feature/fateweave-initial-prototype](https://github.com/wnau34-nptrn/asterveil-fateweave/tree/feature/fateweave-initial-prototype).

Unchanged references: `public/assets/art/units.webp` 1024×1536 RGBA; `portraits.webp` 1024×1536 RGB; `ruins.webp` 1536×1024 RGB. Frame order is Knight, Duelist, Mage, Priest, Raider, Brute, in a 2×3 atlas of 512 px squares. Local reference copies are byte-for-byte original; their checksums are in the manifest. Only CSS cropping/display sizing is used in mockups. Keep the existing runtime files and Phaser anchor/formation logic when applying this skin.

New art was generated for this brief through OpenAI Image Generation with original Asterveil environment prompts, without an artist/game imitation prompt. Original floor generation was refined for more consistent per-cell lighting. New cliffs, props, landmark sheet and title are separate generations; no characters or arena were regenerated. Runtime SVG icons, panel ornaments, token, hint, fog, fire and dust were authored specifically for this package. Generated environmental sheets were only cut, resized, aligned and encoded for production. Source generations remain in the session's `/workspace/generated_images/` and are referenced by the packing tool. The package supplies authored SVG sources; full large generated source sheets are not part of the runtime budget.

Art generation IDs:

- Floor first pass: `exec-b831390c-fa22-4568-90eb-0594d55b3a85`
- Final floor refinement: `exec-85f86af5-b5fb-4d38-8d91-ecd8ff3260a2`
- Painted wall sheet: `exec-f2a5c748-c834-4a19-894f-910d1b564d22`
- Decor first pass: `exec-57492cd7-87d4-452a-8b40-f88928d76b7d`
- Final decor cleanup: `exec-1f267b1c-0c2a-43a2-95f5-b8616466110d`
- Landmark first pass: `exec-d3115e7d-dd7f-4cb7-9da8-80cfb0890f3e`
- Final landmark cleanup: `exec-7b99f945-5678-418a-b9a1-52be304c6911`
- Title: `exec-4782c5d9-8876-41ad-b757-e1c3103ca89f`

New art can be used for this game subject to the image-generation service terms. No third-party game imagery, traced icons or purchased texture files are included. Reference art is the user's existing project art; this package does not relicense it.

Fonts: [Kanit](https://fonts.google.com/specimen/Kanit), [Noto Sans Thai](https://fonts.google.com/noto/specimen/Noto+Sans+Thai), [Liberation fonts](https://github.com/liberationfonts/liberation-fonts). Kanit 600 comes from `google/fonts/ofl/kanit/Kanit-SemiBold.ttf`; Noto Sans Thai 400/700 are the installed OFL font files copied for offline rendering. All licences are copied under `licenses/`. Liberation Serif Regular was used only to outline Latin logo paths.

## Compact copy suggestions

The reference uses `เลือกสกิล → แตะเป้าหมายในสนาม` for the compact coach strip and short status labels such as `รับแทน ✓`, `เวท · CD 1`, `ภาวนา · รอ`. In integration, supply full Thai accessible labels (`พร้อมใช้`, `คูลดาวน์อีก 1 รอบ`, `รอเทิร์น`) and retain the existing full skill names in the popover. These are suggested space-saving treatments, not changes to skill names or mechanics.

## Reference viewer and scope of validation

From this directory: `python3 -m http.server 4173 --bind 127.0.0.1`, then visit `http://127.0.0.1:4173/reference/index.html`. Query `screen=world|title|battle|states|transition|battle-states`; optional `state=camp|high|encounter|boss|first|complete|shatter|info|confirm|no-storage|popover|interrupted|start|victory|defeat|retry` as appropriate.

The viewer is a static art reference. D-pad/tile art does not execute movement; continue/restart does not replace saves; selected targets/skill disclosures demonstrate visual states. It is not a game implementation. Copy its skin/layout ideas, not its demonstration event handler, into the actual app. Production font loading, Phaser rendering, saved-state wiring, battle calculations and keyboard movement remain the integration developer's work.

Browser plugin was not available, so regular Playwright with installed Chromium was used. The flow under test was reference screen → disclosure/confirmation or skill selection → expected visible state. Every requested mockup was rendered from actual live Thai DOM text. The 11 viewports checked for each of world/title/battle were 320×568, 360×640, 375×812, 390×844, 414×896, 430×932, 844×390, 768×1024, 1024×768, 1366×768, 1920×1080. Root scrolling, undersized controls, out-of-viewport controls and clipped critical panels were checked; interactions cover info→restart confirmation→Escape, skill popover and field-target selection. All 33 final layout checks passed with no relevant console errors. Viewport emulation is not a physical iOS/Safari test; safe-area expressions are supplied for integration.

Visual refinements from intake checks: reduced tile lighting variation; replaced vector cliff placeholders with painted rock; converted exploration to a full-screen map with floating HUD and opposite-corner controls; added 44 px tap layers over 36 px hints; ensured four phone / six large-screen turn slots; kept floating popover away from targets; preserved target position while pressed; condensed 320 px and short-landscape battle metadata without dropping the specified regions. Fine rune patterns do not guarantee mathematical edge continuity; keep stable variants and use props sparingly at seams.

## Validation checklist

- [x] Three world mockups, world states and encounter/boss storyboard; two title and two battle mockups.
- [x] Extra 320×568 world, battle state sheet, title confirm and skill popover references.
- [x] 16 biome floors + two camp grounds + three painted complete-cell wall frames, all 128 px.
- [x] Fog tile, four edges and four corners; tile atlas below 2048 px.
- [x] Six props per biome; six landmarks; four fire frames.
- [x] Token frame, adjacent hint and four dust frames.
- [x] Nine-slice panel; CSS buttons/danger/HP; 29 SVG icons including nine battle skills.
- [x] Tokens, style guide, anchor/frame/size notes, OFL licences, source provenance.
- [x] >=44 px controls; no page scrolling on all 11 checked viewports.
- [x] Every animation has a reduced-motion fallback; encounter <=720 ms.
- [x] Original character and arena art preserved; all runtime labels live, except the Latin title logo.
- [x] New production runtime assets including PNG alternates remain below 2,500,000 bytes; no video.

Do not treat this checklist as game integration approval. The requested developer Asset Intake Review and actual runtime tests remain the next step.

Revision 2 concept generation IDs: portrait `exec-3b751583-58c8-4a4e-a4cf-3ebf990a2641`, desktop `exec-1a3419b2-1431-40f1-b536-ca98aa354ce1`. No character or battle backdrop was regenerated.
