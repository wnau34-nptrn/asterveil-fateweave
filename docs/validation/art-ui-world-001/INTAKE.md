# Asset Intake Review — ART-UI-WORLD-001 revision 2

Date: 2026-10-14 · Package: `incoming/ART-UI-WORLD-001/` (commit `60f942d`) · Status: **ACCEPTED_WITH_TECH_FIX**

## Checks performed

| Check | Result |
|---|---|
| `MANIFEST.json` checksums and byte sizes (178 files) | All match; no missing files. Only the manifest itself and `reference/intake-validation.json` are unlisted. |
| Original art `units.webp`, `portraits.webp`, `ruins.webp` | Package reference copies are byte-identical to `public/assets/art/`. Runtime files are untouched. |
| Atlas dimensions | `tileset` 512×768 (21 frames of 128 px; every occupied frame fully opaque). `decor` 768×512 (24 frames). Six landmarks at 256×256 RGBA. Fog, token and hint tiles at 128×128. Title background 1920×1080. Logo 700×224. |
| Bottom-centre anchors | All 24 decor frames and all 6 landmarks have their solid base within 3 px of the image bottom (alpha > 32). |
| Readability at 36 px | `mockups/asset-readability.png` reviewed. Each biome is distinguishable in greyscale by texture. Camp, flag, gate and boss-ring silhouettes are readable. |
| Licences | Kanit and Noto Sans Thai are under OFL 1.1; the licence texts ship next to the font files. The logo SVG uses outlined paths, so no font dependency. |
| Text in images | Only the Latin title logo. All Thai text is live HTML. |

## Accepted into runtime (WebP/SVG only, no PNG duplicates)

- `public/assets/world/`:
  - `tileset.webp`, `decor.webp`
  - six landmark images
  - `step_dust.webp`
  - `fog_tile.webp`, four fog edges, four fog corners
  - `token_frame.webp`, `step_hint.webp`
- `public/assets/title/`: `title_bg.webp`, `logo.svg`
- `public/assets/fonts/`: subset WOFF2 files for Kanit 600 and Noto Sans Thai 400/700 (Thai + basic Latin), plus OFL texts. These are built from the package's reference TTFs with `pyftsubset`.
- `src/ui/svg/`: all 29 icons, inlined so they inherit `currentColor`.
- Frame maps `tileset.json` and `decor.json` are copied to `src/content/world/`.
- CSS:
  - `tokens.css` is used as-is, with `@font-face` added.
  - `fx/effects.css` is used as `src/ui/effects.css`, with paths fixed and the unused camp-fire rule removed.
  - `ui/world_overlay.css` values are reimplemented in `src/ui/world.css` against real game state.

**Runtime budget.** New files on disk total **847,135 bytes** against the 2,500,000-byte limit. A first session (title → new expedition → walk → first battle) loads about 712 KB of them, measured on the production preview. The original character and backdrop art (1.60 MB) is unchanged and was already loaded before this work.

## Not used (deferred or not needed)

| Not used | Reason |
|---|---|
| All PNG fallbacks | Every target browser supports WebP. Loading both formats is prohibited by the handoff. |
| `camp_fire` strips | The camp painting already contains fire, and the hotspot offset is not specified. The flicker overlay is deferred. |
| `panel_frame_9slice`, `ui/components.css`, `meter_danger.svg` | Revision 2 removes heavy gold ornaments from exploration. Glass capsules and the danger gauge are pure CSS driven by state. |
| Zone-blend overlays | Not supplied (optional in the brief). |
| Ambient grass/water/rift animation classes | Only the veil motes are enabled; the rest is deferred to keep per-tile animation off. |
| Battle mockup card restructuring | The battle HUD is re-skinned only (glass, thin edges, Kanit headings, new icons, ground target rings). Regions, sizes and mechanics are unchanged. The compact-label suggestions were not adopted. |
| `reference/`, `mockups/`, `tools/`, concept images | Reference material only; never shipped. `reference/reference.js` demo handlers were not used. |

## Integration notes

- The map is a DOM tile grid driven by `ExpeditionState`. Art is chosen by `src/game/visuals/world-art.ts`:
  - floor variants come from a stable coordinate hash;
  - walls use `wall_face` above walkable ground and `wall_inner` when fully enclosed;
  - decor sits only on plain floor away from landmarks;
  - fog edges and corners follow the `fogLayers` rules.
- Movement rules are unchanged:
  - Step hints appear only on legal neighbours. Their tap layer is at least 44 px and circular.
  - The D-pad and keyboard input are unchanged, and there is no auto-pathing.
  - The lower-right action is enabled only by `canRest` and becomes **พัก** on a camp.
- The camera centres the party between the measured top HUD and the lower controls. No HUD element covers a legal step.
- The veil-shatter encounter transition takes 720 ms; under reduced motion it is a 100 ms crossfade. The battle is saved before the transition starts.
- Tech fixes made during intake:
  - Thai line height in clipped capsules, so tone marks are not cut off.
  - The battle canvas is re-measured with a `ResizeObserver` after the web fonts swap in.

## Not verified

Physical iPhone/Android, Safari and notch hardware have not been tested; the safe-area insets were only emulated. All evidence is from Linux Chromium with software WebGL.
