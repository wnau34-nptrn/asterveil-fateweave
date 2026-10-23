# ART-VFX-EXEC-WARD-001 — Rose-Gold Edge / Luminous Aegis

2026-10-22. Original effect-only artwork for Phaser integration. Owner passed Bolt on this date and requested these two skills. Base inspected: 375698e on feature/fateweave-initial-prototype. Read the v1 art direction/storyboards, Bolt delivery on art/art-vfx-bolt-001, current bolt-fx.ts and bolt-slice review. This delivery changes only its incoming folder; no runtime integration or merge.

## Files and coordinates

`execute_fx.webp/json` and `ward_fx.webp/json` use the Bolt lossless 2048×2048 RGBA / Phaser JSON-hash contract. Load with `this.load.atlas('execute-fx', imageUrl, jsonUrl)` and similarly `ward-fx`. Numbered names use zero-based two-digit suffixes, untrimmed/unrotated 256² source cells, normalized pivots, spriteSourceSize and sourceSize. All origins are .5,.5; call setOrigin explicitly if the adapter does not apply pivots. Layer sequences appear in meta.animations with count/cell/layout/frames, matching Bolt. Static frame alias `static_impact` exists in each atlas.

Original selected RGBA sheets are in generated/. Individual frames and horizontal strips are in execute/sources/ and ward/sources/. Phone previews are execute/preview_dark.png, execute/preview_light.png, ward/preview_dark.png and ward/preview_light.png, all exactly 390×844.

## Execute — Rose-Gold Edge

| Layer / frames | Cell | Origin / direction | Blend | Suggested CSS size at 390px | Normal stage time |
|---|---|---|---|---|---|
| blade_glint_00–03 | 256² | .5,.5 at Duelist blade tip; rotate glint to blade axis | NORMAL | 70–84px cell; compact blade highlight | 0–150ms, 37.5ms/frame |
| slash_ribbon_00–03 | 256² | .5,.5 around actual recipient body; open C faces +X; mirror/rotate toward contact | NORMAL | 90–104px cell; approximately one actor width | 150–298ms, 37ms/frame; ONE continuous cut |
| contact_star_00–03 | 256² | .5,.5 at actual body/barrier contact | NORMAL | 56–70px cell; small sharp core | start exactly 298ms, 30ms/frame through 418ms |
| rose_mark_pulse_00–03 | 256² | .5,.5 at existing Mark anchor, separate from contact | NORMAL | 28–44px cell | 298–450ms, 38ms/frame; only on actual Mark→Execute condition |
| falling_spark_00–03 | 256² | .5,.5 below contact; sparse descending flecks | NORMAL | 64–80px cell | 418–650ms, 58ms/frame; alpha zero at 650ms |
| static_impact | 256² | .5,.5 at actual contact; aliases contact_star_01 | NORMAL | 40–50px cell, alpha .5 | OS reduced-motion: immediately at stage start, static |

Draw slash behind contact-star; keep Mark pulse independent and small. Single crescent, no X, second swing, fire or full-body flash. Stop slash at contact, do not loop it. Mark pulse does not consume, break or replace the authoritative status indicator. Without the actual condition, omit the pulse; keep the real status per resolver. Rest 650–850ms, stage ends 850ms.

## Ward — Luminous Aegis

| Layer / frames | Cell | Origin / direction | Blend | Suggested CSS size at 390px | Normal stage time |
|---|---|---|---|---|---|
| weave_thread_00–03 | 256² | .5,.5 at actual barrier recipient body | NORMAL | 72–80 × 94–104px cell | 0–100ms, 25ms/frame |
| curved_veil_00–03 | 256² | .5,.5 around recipient; vertical curved volume, center open | NORMAL | 78–84 × 104–110px cell; visible width ~55–65px | 100–260ms, 40ms/frame |
| settle_00–03 | 256² | .5,.5 at same body anchor | NORMAL | 78–84 × 104–110px cell | start exactly 260ms; 40ms/frame through 420ms |
| rim_crescent_00–03 | 256² | .5,.5, highlight on right curved surface | NORMAL | same Ward cell size; optional subtle accent | 260–420ms, 40ms/frame; omit if rim becomes too bright |
| sparse_rune_00–03 | 256² | .5,.5, isolated ornamental glints, no lettering | NORMAL | 40–52 × 80–96px cell | optional 260–420ms; omit for reduced intensity |
| quiet_rim_00–03 | 256² | .5,.5, follow recipient body | NORMAL | 78–84 × 104–110px cell, alpha .35–.6 | 420–650ms, 57.5ms/frame; then hold quiet_rim_02 ONLY while actual barrier >0 |
| dissolve_00–03 | 256² | .5,.5 at same body anchor | NORMAL | same Ward cell size | for cast-only transient fade 420–650ms, 57.5ms/frame; omit while persistent rim is active |
| static_impact | 256² | .5,.5; aliases settle_01 | NORMAL | 64–72 × 86–96px cell, alpha .45 | OS reduced-motion: immediately at stage start, static |

Ward has no damaging impact. The settle sequence is its contact cue. Never play dissolve as an incoming hit, shatter or heal. Do not layer two full veils: curved_veil ends at 260ms, settle ends at 420ms, then quiet_rim replaces it. The optional rim accent is a single crescent, not a second shield. Keep the face and silhouette visible through the opening and restrict width to the recipient slot. Cyan/pearl and faint gold distinguish this from mint Heal.

## Shared timing and integration handoff

All cue times are normal stage times, not timer instructions to duplicate. Use existing stageTiming's .65 fast factor and contact/end boundaries. Bolt's runtime gather uses 85ms rather than its old artwork table's 100ms; these new skills follow their own specified Execute 298ms / Ward 260ms contact boundaries, without changing gameplay. Use the existing play-counter pattern to step frames and the effect layer's lifecycle for cleanup.

OS reduced-motion must show only the static impact frame immediately with authoritative results at stage start: no cast, travel/form sequence, drifting particles or looping held rim. Reduced intensity may omit glints, Mark pulse extras and rim accent, keeping the principal silhouette. No new result, hit, target or status can be inferred from these images.

Use actorPanels/body anchors in CSS pixels, including actual Guard-redirection damage/dodge recipients. Execute full block: smaller pearl-tinted contact-star at barrier contact, no body-damage flash; dodge: omit contact-star/Mark resonance and use sparse passing flecks only. Ward follows the actual barrier recipient, including self-cast. Persistent rim requires barrier >0, and must be removed on depletion/down/load/skip/hidden-tab/resize/cancel with the existing cleanup rules. Nothing may arrive or flash after cancel.

## Alpha and QA

Straight (unassociated) RGBA, lossless WebP with exact transparent RGB preservation. Colored edges and low baked glow use NORMAL throughout. No ADD layer is required; applying ADD to whole colored layers erases their shape on bright scenery. Do not premultiply files a second time. Frames have 32px fully transparent internal borders, with 8px atlas spacing; linear filtering/clamp, no atlas mipmaps.

The build keeps grid-relative centers, fits each original cell within 192² inside 256² and tapers its exterior to transparent, reserving the 32px border. Supplemental rows use reviewed nonuniform boundaries to exclude adjacent glints; see build_assets.py. It does not remove a solid background or use chroma key. All pixels with alpha zero are zero RGB. The validation decodes the WebP and compares every source frame byte-for-byte, verifies the border band is entirely transparent, and scans every outer-32px row/column for long nontransparent runs that could reveal a grid/frame artifact. The Bolt defect at 4px inset is therefore covered explicitly. See validation.json for per-frame results.

Previews show separated phase samples top-to-bottom: cast (105,210), cut/form (225,370), contact/settle (280,485 or500), dissolve/held (280,630 or650). Execute contact shows the optional Mark pulse at (312,474), separate from the contact core. Both dark and bright variants use only existing target-repository ruins.webp as alpha inspection scenery; no characters, UI or text. These are inspection composites, not gameplay screenshots or runtime motion approval. Review actual 390×844 / 320×568 / PC normal/fast/reduced clips after integration.

## Provenance and rebuild

Final visual QA on 2026-10-22: opened both review_frames.png contact sheets and all four final 390×844 dark/light previews after rebuilding. No cell/frame outlines observed. The build validated 21 Execute entries and 29 Ward entries (including static aliases), all lossless RGBA round trips and transparent outer bands. Supplemental quiet-rim orientation was corrected before export; reviewed row boundaries exclude adjacent glints. Bright-scene sparks are intentionally subtle. Review sheets are inspection artifacts with a flat dark background, not runtime textures.

Fresh original built-in image_gen artwork; no CLI/API fallback, stock images or sibling-project material. Storyboards were viewed only for shapes/palette/sequence; no scene, character or UI pixels were cropped from them. Existing ruins.webp is used only for preview scenery, not in atlases. generation-prompts.json records the complete prompt set. Generated artwork supplied for this project; no external stock license asserted.

Run `python incoming/ART-VFX-EXEC-WARD-001/build_assets.py` with Pillow from the repository root. It writes only inside this folder and rebuilds both atlases, sources, strips, phone composites and validation report. AI flipbooks can vary between frames; runtime animation continuity, occlusion and event correctness still need integration review. Keep this branch as artwork-only and open a PR into feature/fateweave-initial-prototype; do not merge as part of this delivery.
