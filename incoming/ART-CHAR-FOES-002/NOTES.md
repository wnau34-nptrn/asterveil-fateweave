# ART-CHAR-FOES-002

Original foe artwork for Asterveil · Fateweave, 2026-10-22. Artwork intake only. No runtime integration, merge or deployment.

## Delivery

- `units_foes2.webp`: 1024×2560 RGBA, two columns × five rows of 512×512 cells, nine left-facing creatures in the requested order; last cell transparent. Every frame uses local `footY: 496` (last occupied pixel row; bottom edge 497). Floating foes use their lowest body/tendril/tail point as the shared visual anchor.
- `portraits_foes2.webp`: 1024×2560 RGB, same cell order; nine square close-up busts with opaque painted backgrounds; last cell black/unused. Matching JSON maps contain x/y/w/h/footY; portrait footY is compatibility metadata, not a bust anchor.
- `foes/`: individual 512×512 transparent PNG and WebP sprites. `portraits/`: individual opaque 512×512 PNG and WebP busts.
- `preview.png`: two adjacent 390×844 phone frames (780×844 combined); also delivered separately as `preview_map1.png` and `preview_map3.png`. Unchanged ruins backdrop, four existing heroes on the left facing right, new foes on the right facing left. Neutral interface reservation bands; no baked labels, HUD, rings or shadows.
- Map 1 preview: dew front, ember and bat back. Map 3 preview: two channelers in front, wisp and crawler in back, demonstrating four foes using the three supplied map-3 species. This is a formation/scale mock, not encounter configuration or a runtime screenshot. Normal cells 100px; large channelers 150px (~1.5×). Crawler occupies a back review slot to satisfy the requested two-front/two-back composition; its intended gameplay role remains normal front.
- `scale_ladder.png`: dew slime → thorn beetle → rift channeler, one representative per map, showing softer/lighter/smaller to armoured/darker/larger.
- `review.png`: all nine sprites on gray; each has a 40px portrait, a black silhouette in a 64px cell, and a 64px colour-cell sample.
- `sources/`: selected original ImageGen outputs, retained for reproducible export. `package.py`: deterministic Pillow crop/resize/atlas packing and preview compositing. `validation.json`: exact byte totals, source identifiers, bounds and unchanged reference SHA-256 hashes.

## Silhouette, palette and move readability

| Atlas cell | ID | Silhouette / attack cue | Size / role |
|---|---|---|---|
| 0,0 | dew_slime | Mint-blue squat jelly with one broad leaf; round lobes and happy silly face, no armour or spikes. Body bounce reads physical. | Small, normal front, map 1 |
| 1,0 | ember_slime | Peach-orange soft triangular dome, sleepy grin; internal ember rift crack distinguishes energy from dew's body bounce. No armour or spikes. | Small, normal back, map 1 |
| 0,1 | ruin_bat | Dusty-lilac fuzzy ball, enormous rounded ears and wide scalloped wings; tiny feet and buckteeth, physical flapping/bites. No armour or spikes. | Small, normal back, map 1 |
| 1,1 | vargoth_guard | Broad horned closed helmet, tall rectangular tower shield and round spiked mace; violet-black plate, ember cracks and orange eyes. Heavy physical threat. | LARGE front, map-1 story only |
| 0,2 | thorn_beetle | Low horizontal thorn shell, six chunky legs and paired mandibles; olive moss armour with teal fungus. Physical shell/mandible attacks. | Normal front, map 2 |
| 1,2 | spore_puff | Round mossy floating core, broad scalloped fungal crown, attached spore bulbs and three dangling tendrils; teal luminous face reads energy. | Normal back, map 2 |
| 0,3 | rift_channeler | Hulking squat demon, tall back-crystal conduits, empty open palms and luminous violet channels; no weapon, clearly energy. | LARGE front, map 3 |
| 1,3 | rift_wisp | Asymmetric pointed violet flame crown and single hooked tapering tail; luminous eyes and internal star-light, no limbs or weapons. | Normal back, map 3 |
| 0,4 | shard_crawler | Wide low arachnid, angular crystal stabbing legs, faceted abdomen and mandibles; violet eyes, hard silhouette reads physical. | Normal front, map 3 |

Map 1 deliberately has friendly soft pastel creatures. The story guard is the explicit dangerous contrast. Map 2 adds olive armour, thorns and darker teal. Map 3 uses charcoal-violet bulk, hard crystal facets, sharper silhouettes and luminous eyes. Warm armour highlights on the guard are copper/ember reflections rather than officer gold rank trim.

## Style and production provenance

Built-in ImageGen was used, not CLI/API generation. Existing `units_foes.webp`, `portraits_foes.webp`, placement rules, the mercenary/enemy handoff, and the latest accepted ruins foe package were read/inspected as style references. Original designs were generated in this task; no artwork from another project was imported. Existing heroes and ruins appear only as compositing inputs in review previews.

Prompt set: each of the nine subject descriptions in the table was issued separately with heroic chibi anime proportions, clean dark outline, polished cel shading plus soft gradients, warm top-left rim light, restrained saturation, complete isolated LEFT-facing body, true transparent background, no ground/contact shadow/rings/text/UI/logos/watermarks/companions. Map-one prompts explicitly excluded spikes and armour. Guard referenced accepted ruins foes for tribe/style only and specified tower shield plus spiked mace. Channeler specified open empty energy-channeling hands and crystal conduits. Each portrait was separately generated from its corresponding sprite identity, with a LEFT-facing close bust and opaque soft painted accent-colour background, no frame or text.

Two targeted edits: dew exterior-glow cleanup and channeler zoom-out to complete the top crystal tip. The selected source generation identifiers are in `package.py` and `validation.json`. The dew's apparent surrounding haze in the tool display was absent when composited using its real alpha.

Export operations only: crop using alpha >=16 bounds to ignore invisible generator dust, uniform Lanczos reduction, placement on transparent cells, square portrait crop/reframe to lift eyes toward the upper-middle, WebP quality 85, and image compositing. Generated alpha inside the crop is preserved; no background replacement, repainting, synthetic alpha masks, or drawn shadows. Source RGB under fully transparent pixels is not visible in composited exports.

Known review considerations: the two slimes share a round body family by design but separate leaf-versus-dome silhouettes and colour/energy cues. Energy crystals/flames have brighter internal highlights than the soft map-one creatures. Close portrait crops intentionally trim some crown/ear/horn tips to keep faces readable at 40px. The atlas contains no animation or live UI. Style acceptance remains the asset reviewer's decision.

## Validation

- [x] Nine individual full-body frames, nine opaque square portraits, correct order and left facing.
- [x] Two 1024×2560 atlases, matching x/y/w/h/footY maps, empty tenth unit cell.
- [x] Every battle frame anchored at y=496, minimum 8px horizontal padding, no frame-edge clipping in exports.
- [x] Review of real-alpha composites, 64px silhouette samples, 40px portraits, both phone compositions and difficulty ladder.
- [x] Runtime WebP budget below 2MB; exact atlas and all-WebP totals in `validation.json`.
- [x] SHA-256 and byte-for-byte Git HEAD verification for existing art references, including accepted ruins artwork; all hashes in `validation.json`.
- [x] Changes restricted to this incoming package; no existing art, source, tests, public assets or workflows changed.

Ready for Claude Asset Intake Review.
