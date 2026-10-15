# Style and intake review

The visual references are this repository's existing units, portraits, ruins, world tiles, decor and landmarks, plus `docs/ART_DIRECTION.md` and the Luminous Veil guide. No named third-party game, studio or artist was requested in generation prompts. No external repository assets were used.

## Shared treatment

Original heroic chibi anime designs use large expressive heads, compact bodies, dark contours, layered cel shading with softened painted gradients, saturated non-neon accents and warm upper-left light. Mercenaries face right; foes face left, all in three-quarter views. Full bodies have transparent backgrounds without painted ground shadows. Portraits are separate head-and-shoulders generations matched to the selected body, on opaque painted accent backgrounds. No UI, rarity markings, text, names or logos are baked into images. Decorative rune geometry and the bard's requested musical notes are pictorial marks.

## Character decisions

| ID | Style lock and distinct silhouette | Tier / material treatment |
|---|---|---|
| merc_spear | Broad tanned face, teal scale tabard; upright leaf spear and round buckler rather than hero tower shield | Teal and silver dominate |
| merc_archer | Auburn braid and hood; tall curved bow and white arrow fletching | Dark forest and charcoal; does not reuse Priest's emerald-white-gold outfit |
| merc_alchemist | Oversized glasses and goggles, apron, amber flask and vial satchel | Brass and amber |
| merc_scout | Silver-blue hair, scarf, wide crouch and opposing twin daggers | Steel blue and dark leather |
| merc_warden | Broad bearded head, heavy compact stance and diagonal block hammer | Stone grey and gold |
| merc_bard | Curly hair, layered coat, lute silhouette and floating note shapes | Coral and charcoal |
| foe_tusker | Low stocky boar, tusks, moss mound and flower sprigs | Normal, no gold ornament |
| foe_sprite | Dandelion crown and seed-wing silhouette; 300px figure rather than full hero height | Normal, mint magical core; no gold ornament |
| foe_stalker | Long tufted ears, curled tail and angular thorn spine | Normal, teal eyes; olive vegetation is not metallic gold |
| foe_mycon | Wide mushroom cap, squat robes and spore staff | Normal, mint energy; no gold ornament |
| foe_golem | Broad fists and jagged crystal shoulders; upright biped distinct from Brute | Normal, slate and violet; no gold ornament |
| foe_riftweaver | Rounded indigo hood, ceramic mask, closed robe and orbiting ribbons | Normal, violet core; no gold ornament |
| foe_matriarch | Large crown and branching briar silhouette, fully covered leaf/bark armor | Elite, gold crown and thorn tips |
| foe_juggernaut | Low horned armored shell; quadruped distinct from upright golem | Elite, gold horn and shell banding |
| foe_sentinel | Halberd and floating ring, broad closed helmet, pale plates | Mini boss, gold and violet glow |

## Visual QA and limits

- `lineup-mercs.png`: existing four first, then six mercs in handoff order; same 0.5 pixel scale and shared ground line.
- `lineup-foes.png`: existing Raider and Brute first, then nine foes in handoff order; same scale.
- `silhouettes.png`: all 15 new characters in order, then six existing references; each silhouette itself is 64px tall. Wide/round mushroom, tusker, armored fists, beetle shell and sigil ring remain distinct. Within the human cast, weapons provide the primary role cue.
- `portraits-40px.png`: actual 40px circular samples, no enlargement. Faces, masks and eyes remain visible.
- `gameplay-160px.png`: decoded runtime WebP, alternating light and dark surfaces, for contour/fringe checks.
- `in-arena.png`: two existing heroes and two mercs against Mycon and Sentinel, on the unmodified ruins image; review composition only.
- `on-map.png`: Matriarch, Juggernaut and Sentinel at a 192px frame height over existing 128px tiles (1.5 tiles). No gameplay or map data changes.

Known variations for intake: bearded mercenaries deliberately read older than the youthful existing cast. The scout is crouched; quadrupeds are wider than humanoids. Floating foes use their lowest foot/robe tip as a virtual ground anchor. Upper-left warm rim highlights on organic normal foes are light, not gold tier trim. Tiny painted surface detail is simplified in runtime RGB to meet the budget counting both standalone and atlas copies; PNGs retain the full 512px export detail and runtime alpha remains identical. Fine antennae, strings and spores are secondary detail, not the sole role cue. Exact subjective style acceptance remains the developer's Asset Intake Review.

Attack and hit poses are optional in the handoff and are not included.
