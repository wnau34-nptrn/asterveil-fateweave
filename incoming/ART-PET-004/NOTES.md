# ART-PET-004 · Pet battle-assist effects

This art package contains six prepare, peak and fade sequences for the existing pet assist pose. Present the effect at the end of rounds 3, 6, 9 and so on when the battle event calls for it. Use the peak frame alone for reduced motion. Owner approval of look and motion is pending.

| Pet | Anchor in metadata | Placement |
| --- | --- | --- |
| Meadow fox | `target_foe_center` | Centre of the affected foe's body. The gold crescent and two claws sit at torso level. |
| Thicket piglet | `hero_center` | Centre of the recipient's body. The moss and heal glints curl around the lower torso. |
| Rift crystal moth | `above_foe_head` | Above the head of the marked foe. Position the centre of the glyph about 16 CSS px above the painted top at the preview scale. |
| Fort gargoyle pup | `hero_center` | Centre of the recipient's body. Slate plates flank the body and meet in a low shield. |
| Forest lantern owl | `hero_center` | Centre of the recipient's body. The lantern pulses at the chest and feathers rise along its sides. |
| Gate starveil slime | `hero_center` | Centre of one recipient's body. Repeat the same small burst at each surviving hero when presenting the slime assist. |

Use a centre origin and normal alpha compositing. At a 390 px viewport the storyboard draws the 256 px cell at 128 CSS px. Use the unobstructed face and HP regions in the storyboard as placement references for other unit silhouettes. The moth's glyph is deliberately compact, with dust extending the outer reach.

The storyboard stacks the three beats inside each pet section at 390 px wide. Every beat uses Guardian and the mirrored Raider from the game `units.webp` atlas in the front columns, with the original forest backdrop and illustrative HP labels. Unit cells render at 109 CSS px, the field layout cap for a 390 px width. This is a static placement reference for the incoming art.

The atlas artwork was painted with deterministic raster brushes. References were the ART-PET-002 assist poses, the shipped effects in `public/assets/fx/` and the Execute/Ward art package at PR #54. The painter uses masked pigment, tapered strokes and local light, with zero alpha and zero RGB beyond the rendered shapes. The WebP is lossless RGBA. The validation manifest records SHA-256 for every other package file and the alpha range, bounds and visible radius of each frame.

From a checkout of the game branch, rebuild with Pillow 12.3.0 and Python 3.10 or newer.

```sh
python incoming/ART-PET-004/assemble.py
python incoming/ART-PET-004/assemble.py --verify /path/to/downloaded/ART-PET-004
```

The rebuild reads `public/assets/art/units.webp` and `public/assets/art/battle_forest.webp`. Use `--units` and `--background` for alternate input paths. Rebuilds with different Pillow or libwebp versions can produce different encoded bytes.
