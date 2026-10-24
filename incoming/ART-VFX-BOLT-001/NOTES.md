# ART-VFX-BOLT-001 — Astral Thread

2026-10-22. Effect-only artwork for Claude's Phaser integration. Owner approval: handoff/R03, 2026-10-21; corroborated by current CLAUDE.md. Base inspected: 51b1809. Existing code-drawn vertical slice remains authoritative for events, anchors, cleanup and stage timing. No runtime changes or merge in this delivery.

## Files and coordinates

`bolt_fx.webp` is a lossless 2048×2048 RGBA atlas; `bolt_fx.json` is Phaser JSON hash format. Load using `this.load.atlas('bolt-fx', imageUrl, jsonUrl)`. Frame names have zero-based two-digit suffixes. Frames are untrimmed/unrotated with source sizes and normalized pivots. Use `.setOrigin(frame.pivot.x, frame.pivot.y)` explicitly if your adapter does not apply atlas pivots. Every source frame and horizontal strip is in `sources/`; original selected generated sheets are in `generated/`. `comet_core.png` and atlas frame `comet_core` are the static head.

| Layer / frames | Cell | Origin / direction | Blend | Suggested CSS size at 390px | Normal stage time |
|---|---|---|---|---|---|
| cast_thread_00–03 | 256² | .5,.5 at Mage staff tip | NORMAL | 80–96px cell; ~20–32px gathering footprint | 0–100ms, 25ms/frame |
| comet_core_00–03 / comet_core | 128² | .5,.5, points +X; rotate toward actual recipient | NORMAL | 20–26px cell, ~14–22px visible head | 100–298ms, loop shimmer ~49.5ms/frame |
| tapered_wake_00 | 256×64 | 1,.5, right end follows head; tail extends −X | NORMAL | 50–90px long, 8–16px high; cap at half path length | 100–298ms, continuous travel |
| impact_petals_00–07 | 256² | .5,.5, actual body contact | NORMAL | 76–90px cell, ~28–40px peak visible radius | start exactly 298ms; 28ms/frame through 522ms |
| spark_00–02 | 32² | .5,.5 | NORMAL | 3–7px, few instances | 298–550ms; fade each instance |
| dissolve_wisps_00–03 | 256² | .5,.5, follow contact position | NORMAL | 76–90px cell | 430–650ms, 55ms/frame, fade out |
| light_core_00 (optional extra) | 128² | .5,.5, rotate +X | ADD only | 10–16px, alpha .2–.45 | overlap head in travel; contact 298–350ms only |

All colored edges and their baked low glow use normal alpha. Do not set the colored head, wake or petals to ADD. The separate pale `light_core_00` is the only additive overlay; omit if it washes out bright scenes. Optional extra is not a replacement for the head shimmer. Draw wake behind head, light core above it. Final dissolve frame retains a few flecks: fade alpha to zero by 650ms, then destroy. Rest 650–850ms; stage ends 850ms. Fast multiplies all cue times by existing `stageTiming` factor .65; do not create a separate hard-coded schedule.

Use actorPanels/body anchors in CSS pixels, never storyboard coordinates. Cast pivot follows actual staff tip. Contact follows actual damage/dodge recipient, including Guard redirection. For full block use a smaller burst at barrier contact without body-damage flash. Dodge skips impact petals and leaves sparse passing sparks/wisps. OS reduced-motion applies the authoritative result immediately and uses a quiet static mark; no projectile travel. Reuse existing cancel/down/skip/reload/hidden-tab/resize cleanup, and never invent hits or damage from the artwork.

## Alpha and QA

PNG/WebP store straight (unassociated) RGBA, suitable for Phaser's normal premultiplied upload. Do not premultiply the files again. Lossless WebP uses exact transparent RGB preservation; 4px frame gutters and at least 4px internal margins limit sampling bleed. No black/white background removal was used. Keep linear filtering and clamp; avoid mipmaps across atlas cells. All atlas frames were decoded and compared byte-for-byte to source PNGs, with alpha minimum zero, dimensions and 390×844 previews checked by `build_assets.py`; see `validation.json`.

`preview_dark.png` / `preview_light.png` show separated phase samples, top-to-bottom: cast (105,210), flight (225,370), peak impact (280,485), sparks and dissolve (280,630). These are alpha/scale inspection composites over the repository's ruins battle scenery, with darkened and brightened exposure. No characters or UI are baked in. They are not live gameplay screenshots, animation approval, or evidence of measured FPS. Normal colored layers are shown without optional additive light overlay so fringes remain visible. Bright preview intentionally stress-tests pale edges. Visually reviewed both previews; runtime motion/occlusion still requires Claude's actual 390×844 / 320×568 / PC clips.

## Provenance and rebuild

Built-in `image_gen` generated fresh effect-only RGBA sheets; no CLI/API fallback. Storyboard was viewed for shape/sequence only, with no pixels cropped or composited from it. No sibling-project art. `generation-prompts.json` records the full prompts including rejected first cast direction; only selected sparse cast is delivered. Generated artwork is supplied for this project's use; no external stock assets or third-party asset license is asserted. Preview scenery is existing target-repository `public/assets/art/ruins.webp` (reference only).

Run `python incoming/ART-VFX-BOLT-001/build_assets.py` with Pillow installed from the repository root. The script only writes inside this delivery folder. It splits generated sheets, normalizes sizes, exports PNG strips/frames, packs the atlas and validates its lossless round trip. Grid-relative centers remain fixed for cast/impact/dissolve; the four shimmer frames share a common crop. This is AI flipbook artwork, so review frame-to-frame shape continuity in motion before adopting.
