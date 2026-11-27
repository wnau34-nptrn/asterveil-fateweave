# Map 5 event markers

| Event | Map tile (x, y) | Artwork |
| --- | --- | --- |
| Trapped worker | (6, 13) | Collapsed slate and splintered timber surround the worker in grey-green overalls and a lamp hard cap. R1 shows one knocking fist. R2 shows both hands braced on the rocks, with small loose stones at the base. |
| Abandoned cart | (5, 23) | A tilted wooden cart carries a dusty tarp with rope and a blue potion visible under the fold. |
| Fresh vein | (18, 13) | A diagonal emerald seam runs through a broken slate wall. The separate `vein_glow.png` provides a soft emerald layer for an optional additive pulse. |
| Ore merchant | (19, 21) | A semi-chibi merchant in a burgundy waistcoat works a brass scale at a counter with ore, a pouch and two potions. |

**R1 is the recommended trapped-worker variant and the version packed in the atlas.** Its isolated fist, lamp and larger face make the knocking pose easier to read at 48 px. R2 gives the owner a braced pose for comparison. The owner chooses the artwork for integration.

The four lossless atlas cells use straight alpha, 128 × 128 pixels, anchor `[0.5, 1]` and `footY: 124`. The glow has a transparent outer margin and a radial alpha falloff. It uses the vein's cell origin and has no ground-contact baseline.

## Review sheets

- [48 px](preview/markers-48.png) and [96 px](preview/markers-96.png) show atlas order on a cream-gold yard stress swatch and a dark slate tunnel swatch. Both use the shipped floor textures with adjusted brightness and color to cover the brief's lighting extremes. The centered badge is rendered at the lowest point of its bob.
- [390 px](preview/markers-390.png) shows four stacked camera crops at the original event coordinates and 48 px per tile. The prior 390 px `map-5-lit.png` exists in ART-WORLD-MINE-PROPS-001. It covers the west tunnel only and was originally rendered at 60 px per tile. The west view uses its overlapping portion rescaled to 48 px per tile. The remaining views use that preview's layout, floor and overlays. The map points span 15 columns, which requires 720 px at this scale.
- [Borrowed and dedicated markers](preview/compare.png) uses the same legacy atlas cells and approximates their CSS tint in Pillow. [Character comparison](preview/people-compare.png) includes both worker poses, the merchant, the standing yard worker and the six camp busts.

## Rebuild

Run `python3 incoming/ART-MAP5-EVENTS-001/build.py` with Pillow (built with 12.3.0). The script reads the original generator PNGs from `source/` and uses reference assets already in the repository. It removes low-alpha noise below 18, crops to the subject, resizes with Lanczos and seats the visible pixels at the shared baseline. `build.py --verify` checks every manifest entry, fully decodes each package image and compares the unpacked WebP cells byte-for-byte with the normalized PNG pixels. The manifest omits its own hash to avoid a circular digest.

Art handoff for Claude: the frame keys in `runtime/mine_events.json` match the four event kinds. Use the map mockups for art review and the real map for integration verification.
