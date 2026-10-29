# ART-UNIT-ANIMATION-A1-001

2026-10-27 · Scope A0/A1: Eira (`weaver`) + Dandelion Sprite (`foe_sprite`) only.

Seeds are exact 512px cells extracted from the shipped `units.webp` frame2 and `units_foes.webp` frame1. Original ImageGen RGBA sheets are retained as `eira-raw.png` (24 figures,4×6) and `sprite-raw.png` (16 figures,4×4); no other project's assets. Each continuous action strip was generated together in one whole-sheet edit, never as independent frame requests. Eira's transparent reference canvas is retained; Sprite used its full-resolution seed directly. No baked projectile/new VFX family.

Identity constraints: same painted chibi face/palette/outfit/staff/crown/wings/proportions, Eira faces right and Sprite faces left; constant scale and soles, transparent background, no scenery/UI/labels, isolated cells. Eira has8 energy cast poses +8 support poses +4 hurt +4 down; Sprite has8 Seed Spark poses +4 hurt +4 down. Exact prompts/provenance are in `prompts.json`.

`build_assets.py` uses connected alpha components to tolerate the generated nonuniform row spacing. It assigns rows by soles, columns by X; retains edge antialiasing, removes gutter noise, uses ONE shared scale per character (never independently rescales a pose) and anchors the same grid center/foot baseline at256/496. Seed endpoints0/1/8/9/16 are exact copies of the uniformly resized shipped seed. Sprite skill slots alias its cast strip; no duplicate downloaded pixels. Selected poses, transforms, source hashes and all resource counts are in `validation.json`.

Initial Eira at256px character height cost1,891,788bytes incl.JSON, over the1.5MB target. Final uses one215px source scale (`.42` of512) and displayRatio `1/.42` to preserve the same on-field height and foot position. Sprite retains the pilot `.5`/2 ratio. At phone size these exceed actual character pixel size. No change to the pilots' source pixels, atlas URLs, sequences, cadence or stage timing.

Trim/dedup/packing is lossless AFTER this documented normalization: every alpha value and every visible RGBA pixel reconstructs exactly from the encoded WebP. Per-art budget assertions fail the build script above6MiB decoded or1,500,000bytes download. Eira:4,067,328 decoded bytes,1,382,688 downloaded bytes; Sprite:1,251,328 decoded bytes,357,984 downloaded bytes. These count atlas RGBA only, not total game RAM/GPU or mobile-device measurements.

Rebuild: `python incoming/ART-UNIT-ANIMATION-A1-001/build_assets.py` (Pillow/NumPy/SciPy). It preserves existing manifest entries, including C5-independent pilots. Inspect previews and actual390px clips in `docs/combat-presentation/unit-a1-slice/`. See that README for action/fallback audit, actual verification and release status; generation/tests do not establish owner visual approval.
