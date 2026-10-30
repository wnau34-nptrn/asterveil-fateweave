# ART-VFX-FOE-SIGNATURE-001

Art only. Base `feature/fateweave-initial-prototype` at `5e9e65026b8949f7877db12a2e70496fe2aac77b`; branch `art/art-vfx-foe-signature-001`. Original OpenAI ImageGen paintings, 2026-10-29 (Asia/Bangkok). One selected final design per move, no revision alternatives. Owner artwork selection and actual in-game motion approval remain pending; technical checks are not approval. Open PR only; do not merge.

## Delivery and reproduction

- `layers/`: 40 independent transparent, straight-RGBA 256×256 PNGs. Each move has prepare, peak-travel, peak-impact, settle. The two peak components share the **same beat**, not an extra beat.
- `source/`: seven untouched generator outputs: five two-move sheets plus isolated Spore Dust and Veil Quake refinements. `generation-prompts.json` stores exact requests; `sources.json` records manually inspected crop divisions because the generator did not obey equal column widths. The source sheets are not runtime atlases.
- `layers.json`: per-layer hashes, original crop/trim/packing transforms, alpha bounds, anchors, pivots, left orientation, display sizes and suggested beat timings.
- `storyboards/*-390.png`: ten illustrative three-beat boards, 390×754, using target-repository Guardian and Riftweaver sprites as context. Riftweaver is a caster proxy, not a proposal to change any foe identity. These are art boards, **not runtime screenshots or clips**.
- `preview-390.png`: 390px contact sheet, each move on dark navy and bright gold, normal blending. The pure bright gold swatch is an extra contrast stress test; the boards separately show the actual blue/gold Guardian armour.
- `references/`: unchanged atlas-cell crops for board reproducibility, not new unit art. Hero = `public/assets/art/units.webp`, frame 0 / cell (0,0); caster = `units_foes.webp`, frame 5 / cell (1,2), each 512×512. All references come from this repository, none from Rise Beyond.
- `build_handoff.py`: Pillow crop/trim/uniform-resize/composition only; no repainting or recolouring. Near-transparent generator haze (alpha ≤2/255) is cleared before trimming; other alpha is preserved, not reconstructed. Run `python incoming/ART-VFX-FOE-SIGNATURE-001/build_handoff.py` to rebuild. Python 3 + Pillow 12.3.0; DejaVu Sans for review annotations. No generated pixels are used as UI text.
- `validation.json`: byte lengths and SHA-256 for **every file except itself**, avoiding a circular self-hash. `--verify` checks exact manifest coverage and fully decodes every PNG. `--verify-git REF` reads fetched Git blobs, compares fetched validation.json bytes to local bytes, checks all hashes, and fully decodes every PNG; it reports the manifest's own SHA-256 separately.

The Command reference is on art PR #93 (`23f433ba6691dce1c665144db1e4c85c84820766`), not in this pinned base. Its independent layer/source/storyboards/metadata layout is followed without R1/R2 directories. The current brief's single-final rule takes precedence over its two-choice format. Handoff notes remain here to respect the explicit incoming-only scope; general docs/handoffs files were not modified.

## Signatures and order

Every move: **prepare → peak (travel + independent impact) → settle**. Travel points LEFT. Energy peaks stop at the resolved hero chest; prepare attaches to the foe's chest/forward hand. Only Veil Quake uses feet/ground anchors.

| Move | Selected signature | Settle |
| --- | --- | --- |
| Seed Spark | Pale-yellow dandelion parachutes, fine dark seed stems; organic tuft impact | Detached seed husks |
| Ember Spark | Orange molten spit, charred red contours, tapered flame | Cooling ember tongues |
| Spore Hex | Teal hooked, knotted cloud with hard luminous spore nodules | Broken curling teal spores |
| Spore Dust | Soft sage puff with round cream spore beads | Soft separated puffs |
| Star Flame | Violet-white four-point star head in a small purple fire comet | Three cooling violet flames |
| Rune Lash | Magenta curved filament with attached abstract diamond fragments; **no readable runes** | Unravelling filament ends |
| Rift Needle | Thin obsidian needle, pale lavender slit; long narrow trajectory | Closing vertical tear |
| Shard Burst | Fan of cyan faceted crystals with navy edges | Falling angular chips |
| Rift Bolt (foe) | Broad serrated black-violet void wedge, torn split contour and ragged wake | Collapsing dark void fragments |
| Veil Quake | Physical low crack wave with stone chips, travelling left along ground | Grounded broken fissure |

Rift Needle stays needle-thin; foe Rift Bolt is much broader and torn. Star Flame has a white star core rather than a dark void. The existing hero Bolt is pale lavender/white with a luminous star core (`public/assets/fx/bolt_fx.webp`); this foe bolt uses a black core and ragged violet split edge. No hero bolt asset was edited or incorporated. All nine energy moves retain their Ward-readable energy character; Veil Quake alone is physical. No balance, event or timing changes are requested. Inspected move names/kinds in `src/content/enemies/species.ts`, `src/content/encounters/catalog.ts` and `veil-siege.ts`; no new move such as Rift Beam or Crystal Stab is included.

## Placement, timing and blend

Suggested prepare 0–120ms, peak travel 120–270ms, impact 240–330ms, settle 330–480ms; these are art suggestions to map into existing playback, not authorization to retime battle. Energy pivots are texture centre (128,128), Quake pivots (128,224), normalized equivalents in layers.json. Texture display sizes (including transparent padding) are prepare 40px, travel 132px, impact 52px, settle 40px in a 390px field. Keep aspect ratio; never stretch a square texture into a beam. Translate travel right-to-left using actual source and resolved target; omit impact for unrelated targets. Quake's texture baseline is at 224; anchor that baseline to ground rather than the square's centre.

Normal alpha is required and sufficient; **no additive glow is required**. Optional additive bloom would need fresh contrast/occlusion review and must not replace dark contours. Pale seeds use dark stems, orange fire uses charred edges, cyan shards use navy facets. Avoid opacity reduction that erases those contours. Effects stay below hero faces and above HP labels except Quake, which stays on the ground. Boards record protected face/HP rectangles and assert zero effect alpha over them, with **no masking**. Integrators must check actual moving actor rectangles, crowded formations and actual event outcomes in runtime clips. The boards do not establish runtime approval.

## Internal rejections and limits

- Rejected equal-grid extraction: generated sheets allocate extra width to travel paintings; equal quarters would cut a painting and leak adjacent art. Used visually inspected per-sheet crop boundaries, recorded reproducibly.
- Rejected any use of the source sheet as a runtime sprite: source resolution/layout differs from 256px square layers. Trimmed each isolated component and uniformly fitted it within 224×224 (Quake within 224×208, bottom at pivot y=224), preserving aspect ratio and at least 16px transparent border.
- Rejected the original Spore Dust and Veil Quake cells because the source paintings touched across the intended crop seams. Generated one isolated four-component refinement for each and selected those only. The two original lower rows remain visible solely inside untouched provenance sheets whose upper rows supply the selected Spore Hex and foe Rift Bolt; they are not extracted or offered as alternatives. Exact refinement prompts are in generation-prompts.json. Also rejected a 445px horizontal crop boundary for the original foe Bolt because its impact extended below it; the inspected clear division at 480px preserves the full painting.
- No letters, numbers, real-world emblems, floor rings or ellipses in layer art. Annotation text exists on review boards only. Floating caster positions in a real encounter must come from the renderer, not these proxy boards.
- Concerns to carry into intake: keep Seed Spark's fine dark stems visible at normal speed; keep Rune Lash curved and continuous, not a straight projectile; preserve Needle versus Bolt width contrast; do not raise Quake to chest level. Reduced motion should show a short held peak/fade at the truthful target rather than sweeping across faces.

## Handoff status

No existing art, src, tests, public or .github files changed. No game integration or motion approval claimed. Local checks: two identical rebuilds; exact package coverage, 40 unique RGBA layers, transparent borders, dimensions/pivots, all PNG full decode, 390px board width and protected face/HP overlap, visual inspection on dark and gold. Reproduction determinism and fetched-branch byte verification are reported in the PR/chat after execution. No gameplay suite is relevant to an incoming-only art package.
