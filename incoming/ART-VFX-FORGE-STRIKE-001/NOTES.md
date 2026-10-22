# ART-VFX-FORGE-STRIKE-001 — painted forge strike

2026-10-22. Original effect-only art for enhancement and item-level results. Base inspected: `375698e`, `feature/fateweave-initial-prototype`. Artwork delivery only: no runtime integration, merge or deployment. This folder is the integration handoff; no other repository files are changed.

## Files and coordinates

`forge_strike_fx.webp` is a lossless 2048×2048 RGBA atlas; `forge_strike_fx.json` uses the same Phaser JSON hash convention as ART-VFX-BOLT-001. Load with `this.load.atlas('forge-strike-fx', imageUrl, jsonUrl)`. Frames are untrimmed and unrotated, suffixes are zero-based two-digit indices, source sizes are explicit, pivots are normalized. Explicitly apply `.setOrigin(frame.pivot.x, frame.pivot.y)` if the adapter does not. `sources/` contains individual transparent PNG frames and horizontal strips; `generated/` retains original selected AI PNG sheets. `generation-prompts.json` records the complete built-in imagegen prompts. No external stock artwork or other-project pixels were used.

| Layer / frames | Cell | Origin / direction | Blend | Suggested CSS size at 390px | Normal stage time |
|---|---|---|---|---|---|
| hammer | 256² | .5,.94 at lower handle; head above pivot | NORMAL | 104px cell; move from upper right | 0–300ms raise/approach; contact pose 300–360ms; rebound and contact again 700ms; lift away by 1100ms |
| hammer_smear | 256² | .5,.5; align terminal tip to moving head | NORMAL | 104–120px cell, alpha .35–.55 | 250–330ms and 630–700ms only; no looping |
| hit_flash_a_00–05 | 256² | .5,.5 at tile contact | NORMAL | 110px cell, alpha .65–.8 | 300ms onset; frame01 peak at exactly 330ms clang; 30ms/frame through 480ms |
| hit_flash_b_00–07 | 256² | .5,.5 at tile contact | NORMAL | 122px cell, alpha .8–1 | frame00 onset exactly 700ms clang; 25ms/frame through 900ms |
| spark_00–03 | 48² | .5,.5, rotate with initial velocity | NORMAL | 5–9px | sparse 2–3 at 330ms, 3–4 at 700ms; fade by 1220ms |
| spark_arc_00–05 | 48² | .5,.5, same local position each frame | NORMAL | 7–11px | spawn 330/700ms; 40ms/frame; adapter owns gravity and velocity |
| shock_ring_00–05 | 256² | .5,.5; thin broken ellipse around contact | NORMAL | 184px cell; alpha .25–.45 | 700–940ms, 40ms/frame; behind gear tile |
| result_glow_00–05 | 256×128 | .5,.5 behind actual enhancement label | NORMAL | 168×84px; alpha .4–.65 | 720–1320ms, 100ms/frame; fade with stage 1360–1700ms |
| result_glow_cyan_00–05 | 256×128 | .5,.5 behind actual Lv label | NORMAL | 146×73px; alpha .3–.5 | same 720–1320ms; use instead of warm variant |
| hit_flash_a_core_00–05 | 256² | same as corresponding coloured frame | ADD only | same cell; alpha .12–.25 | match hit A frames; omit on bright backgrounds if washed out |
| hit_flash_b_core_00–07 | 256² | same as corresponding coloured frame | ADD only | same cell; alpha .15–.3 | match hit B frames |
| result_glow_core_00–05 / result_glow_cyan_core_00–05 | 256×128 | same as corresponding coloured frame | ADD only | same cell; alpha .1–.2 | match selected glow frames; never combine both colours |

All coloured edges, sparks, steel, smear and ring use NORMAL alpha. Only the separately extracted pale cores permit ADD. Do not apply ADD to the whole coloured texture. The existing gear tile and rarity frame remain existing UI artwork, never part of this atlas. Keep contact flashes inside the tile's interior; cap display cells at the sizes above and put the ring behind the tile. Avoid opaque art on the rarity border. Place result bloom below the tile, behind the live label, and keep it faint enough for text contrast.

## Fixed cues and layering

The inspected placeholder's 1.1s swing has its first contact pose at 330ms (30%); its shake starts at 300ms. Preserve the owner's 300ms physical touch with the flash onset there and its 330ms peak aligned to the existing first clang. The second physical contact and clang are exactly 700ms; the result label appears at 720ms. Do not add extra sounds, hits, shakes, state writes or result changes. Gear is already committed and saved before this presentation starts. Overall fade starts at 1360ms and ends at 1700ms. No new speed policy is implied by these art assets.

Back-to-front: vignette → ring → hammer/smear → existing 132px gear tile → compact contact flash/core → sparse falling sparks → result glow/core → live label and live item name. For the brief contact moment the flash centre may cover the item interior, but its opaque footprint must stay inside the frame. The hammer should touch from above; do not park its head over the whole gear. Cull particles and all effects at 1700ms, including on cancellation/reload/hidden-tab/resize as the integrating UI requires.

**Reduced-motion single frame:** `result_glow_cyan_05`, NORMAL at 146×73px and alpha .22 behind the real label, for either result type. Show the authoritative result immediately; omit hammer, smear, flashes, ring and particle motion. Keep the existing reduced presentation lifetime (900ms) and sound policy; this artwork does not change it.

`anvil_dust` is deliberately omitted (optional in brief) to keep the small tile clear.

## Alpha, review and rebuild

PNG/WebP contain straight RGBA suitable for normal premultiplied GPU upload; do not premultiply the files a second time. Generated alpha is preserved, with transparent internal margins and 8px atlas gutters. No background colour keying. Lossless WebP uses `exact=True`. Use linear filtering, clamp, and no atlas-wide mipmaps. `validation.json` records frame sizes, alpha extrema, hashes and byte-exact atlas/source round trips. Rebuild using `python incoming/ART-VFX-FORGE-STRIKE-001/build_assets.py` with Pillow. The script only writes within this delivery folder. The first cyan sheet was rejected for overlapping rays; its replacement uses a 3-column/2-row layout. Replacement peak cell reached the source edge, so frames01/02 intentionally hold the intact second exposure. Other selected sheets use one row. A fixed shared vertical crop retains relative frame scale; hammer normalization places the actual handle end on the pivot.

`preview_dark.png` and `preview_light.png` are exactly 390×844 review composites of the second contact over a 132px placeholder tile containing unchanged target-repository guardian weapon art. The navy card is a review scaffold; warm and cyan glow alternatives are shown below the tile without UI text. No gear pixels are exported into the effect atlas. `contact_sheet.png` labels are outside sprite cells and are review-only. Previews are not gameplay screenshots or animation approval. The final integrated timing, glow strength, hammer contact alignment and occlusion still need review in real 390px gameplay clips. Original AI flipbook shapes can vary between frames; the runtime controls opacity, gravity and final fade.
