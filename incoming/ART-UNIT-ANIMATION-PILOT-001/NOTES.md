# ART-UNIT-ANIMATION-PILOT-001

2026-10-26 · user authorized step 3 after the shared controller.

Original character seeds are extracted from the shipped Fateweave atlases: Lyra (`tracer`, units frame 1) and Vargoth Hunter (`foe_hunter`, units_foes frame 9). No user screenshot, other project's art or third-party character asset is included.

Generated with the image generation tool, one whole animation grid per character, using the shipped seed plus a transparent 4×6 template. The first attempts had overlapping weapon bounds or missing poses; retained originals remain under `/workspace/generated_images`, and are not the runtime sources. Accepted working sheets are `lyra-raw.png` / `hunter-raw.png` (second pass). These are pilot candidates for owner review, not approval of every animation or C5 VFX.

Prompt constraints: exact reference identity, facing right for Lyra / left for Hunter, same painted chibi costume and proportions, 24 equal slots in 4 columns × 6 rows, transparent background and gutters. Eight attack poses, eight skill poses, four hurt and four down poses. Lyra uses slash and precision thrust. Hunter uses dagger slash and a Shadow Knife throw with no detached projectile baked into the art. No UI, labels, scenery or attack VFX.

`build_assets.py` extracts the 24 connected figures from real alpha, chooses 8 attack + 8 skill + 2 hurt + 3 down frames, and normalizes with ONE shared scale per character. Foot baseline is y=496; horizontal pivot follows original grid center. It does not resize each pose independently. Empty alpha noise is removed around each connected figure. Existing shipped pose is packed at idle and locked at each action's first/last frame to stabilize entry/exit.

Runtime: 22 cells per character (idle plus 21 action/reaction slots). Of the 21 slots, 4 reuse the original seed; 17 contain generated poses. Across two characters that is 42 sequence slots, including 8 reused endpoints, not 42 unique newly drawn images. Atlas is 2048×3072 with 512px cells, drawn at twice the slot size because the logical 512px character occupies half the padded cell. This reserves room for weapons without changing actor hit targets or labels.

Runtime WebP totals ~2.75 MB compressed. Both decoded atlases total 50,331,648 bytes (~48 MiB) before renderer overhead; each dimension is below 4096px. Pilot preloads both to support encounter changes in the existing long-lived scene; broader rollout needs lazy loading/eviction before multiplying this budget. No real-device GPU/FPS measurement is claimed.

Rebuild: `python incoming/ART-UNIT-ANIMATION-PILOT-001/build_assets.py` with Pillow, NumPy and SciPy. See `validation.json` and the two preview sheets. `public/assets/units/*_pilot.webp` are generated output; never edit frame order without updating `unit-frames.ts` and its tests.
