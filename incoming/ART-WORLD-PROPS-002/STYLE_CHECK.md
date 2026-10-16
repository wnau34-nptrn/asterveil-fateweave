# ART-WORLD-PROPS-002 — style check

References read and inspected: the full ART-WORLD-PROPS-002 handoff; placement rules sections 3–4; tileset, decor, chests and puzzle; all five landmark WebPs; the three camp scene layers; all three accepted equipment atlases and world/items.webp; and the Luminous Veil palette guide. The guide's historical name supplies palette references only. New imagery follows the brief's Asterveil/rift lore with no veil, curtain or magical barrier motifs.

The props use the accepted painted three-quarter top-down viewpoint, upper-left highlights, fine dark contours, cel-shaded volume, soft gradients and compact silhouettes. Materials are painted wood, mossy stone, leather, parchment, glass and metal. No pixel art, photography, 3D renders, named-artist/studio/game imitation or other-repository imports.

| Frame | Silhouette and readability decision |
| --- | --- |
| herb | Broad rounded leaves, short stems and pale mint-green tips; strongly different from existing upright thin grass blades at 36 px |
| event_bandits | Wide crossed stakes and crates, one short ragged blank pennant; jagged outline |
| event_shrine | Squat stone block and arched amber recess; secular and unmarked, no deity or real-world religious symbol |
| event_merchant | Canopy roof, open cart sides, two clear wheels, bottles and lantern; distinctive roof-and-wheel outline |
| event_traveller | Low pack and cream bedroll beside stump/staff; no person, blood, body or weapon |
| event_rift | Narrow upright torn-air centre, sharp violet cracks and small charred fragments; no portal gate architecture or sheet-like screen |
| herb_glow | Separate soft round mint alpha underlay, restrained opacity and radial falloff |
| spare | Fully transparent |

Every event retains the top fifth of its cell clear for the live event badge. Physical bases share frame-local y=116; six object widths are 96 px. The checkered and greyscale sheets expose edges, base placement and the five distinct event contours. Map compositions show the exact requested zone groupings on real existing tiles at 36, 48 and 64 px. Local glow is confined to herb tips, shrine recess, lantern, rift edges and the explicitly separate herb underlay; there is no cast shadow or floor tile attached to an object.

The six painted flame poses have an amber/orange body and pale-yellow core with close small sparks. They are all distinct, centred over the unchanged stone ring with baseY=200 and roughly 60% frame height. The upper tongues curl right and left while the base stays in place; frame six returns close to frame one. The seam's visible-image change is below the maximum internal change. The contact sheet and reference-only GIF show the existing firepit beneath the new flame, including a 90 px frame-scale sample. Runtime flame art contains no stones, logs, smoke column or background.

The blank contract uses a physical gold star seal and short ribbon; it contains no writing or rating. The original iron-bound market box has restrained violet-gold seam light and a compact new design. Both use the same outline, lighting and material treatment as accepted item icons, with no rarity frame. Their 128/48/32 px decoded samples were inspected on navy.

No new people, monsters or party figures occur in any runtime frame. No text, letters, numbers, logos or watermarks are painted into runtime art. Labels exist only on the permitted review sheets. Source masters and the packing script are reference/build material; no extra runtime variants were added. Five protected existing files remain byte-identical, documented in NOTES.md and validation.json. Final subjective style and motion acceptance belongs to Claude Asset Intake Review.
