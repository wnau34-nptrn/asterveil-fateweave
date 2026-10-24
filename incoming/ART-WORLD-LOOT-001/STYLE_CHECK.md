# ART-WORLD-LOOT-001 style check

Style lock read at base commit `e6dfc92415f2b9bbd76ae0257e30b307c13cecf5`: ART-UI-WORLD-001 STYLE_GUIDE and line icons, shipped SVG placeholders, world tiles/decor/camp/gate, phase-2a chest and pack screenshots, and Expedition Design mercenary decisions and Phase 2A rules.

| Asset | Match to Luminous Veil |
|---|---|
| Common chest | Weathered brown wood, oxidised teal-bronze bands, small cyan lock; rounded lid and darker midtones distinguish it from rare. Top-left painted lighting; front/right faces in a three-quarter view. |
| Rare chest | Pale ruin stone, champagne gold filigree and navy insets echo sanctum slabs, gate and camp trim. Flat beveled slab lid and corner buttresses distinguish its silhouette in greyscale. |
| Open states | Raised lids, dark empty interiors, dim locks. No treasure, cast shadow or ground platform. Same 118px ground baseline. |
| Star ore | Broad cyan-white crystal facets and one internal star sparkle. Cluster silhouette corresponds to ore line icon. |
| Veil ember | Amber coal, violet/cyan core, one restrained wisp; warm campfire association. No extra fire effect layer. |
| Contract seal | Champagne medallion, navy field and two ribbon tails; abstract loop motif, no lettering. Not a currency coin. |
| Line icons | 24px viewBox, 1.8 currentColor stroke, round joins/caps, no hard-coded colours; filled star alone has currentColor fill. Shape simplification supports 15px use. |
| Star badges | Individual five-point star, gold/navy filled and dark empty versions. Navy outline and restrained top highlight, no baked rank or row. |

## Evidence and review judgement

- `chests-on-map.png`: upper scene uses 48px tiles; lower scene uses 64px tiles. Within each scene the left-to-right sprites are common closed, common open, rare closed, rare open, followed by existing mossy-rock decor and camp. All source context art is unmodified and review-only.
- `items-sizes.png`: three painted columns are ore, ember, seal. Rows are 128px, 48px and 32px. Bottom rows show the eight line icons at 24px then 15px in delivery order.
- `greyscale.png`: same map and item sheets desaturated, followed by four isolated chest frames at 40px. The rounded dark common body versus pale angular rare body remains clear; open lids and empty cavities remain visible.
- `star-row.png`: 40px circular crop of the first shipped portrait plus three filled and two empty individual badges. No characters, fonts, UI panels or gameplay have been redesigned.
- Transparent sprites are inspected on navy and pale backgrounds; no rectangular matte, painted cast shadow or edge halo is visible at delivery sizes. Native transparent padding is checked programmatically.

## Known deviations / deliberate simplifications

- Fine filigree and wood grain soften at map sizes. Material value, lid shape and the open cavity carry recognition rather than those details.
- Open frames are generative edits of the corresponding closed sprite; surface marks are not pixel-identical. Shared frame geometry, baseline and broad material features are retained. These are static swaps, not tween animation frames.
- Colour tokens guide the lighting and materials; painterly shading naturally includes intermediate colours. Gold and cyan light stays local to the objects.
- Review compositions are static text-free evidence, not the live game or an integration test. All labels and rank counts remain the developer's live HTML responsibility.
- The optional opening burst is omitted to keep this intake focused on the required assets.

Final acceptance and integration belong to Claude Asset Intake Review.
