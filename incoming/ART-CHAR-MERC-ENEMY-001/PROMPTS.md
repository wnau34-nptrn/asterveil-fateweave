# Generation prompt set and provenance

Tool: built-in `image_gen`, not the API/CLI fallback. Date: 2026-10-15. Source-generation filenames and SHA-256 digests are recorded per selected body and portrait in `provenance/manifest.json`. Original raw generations remain in the local imagegen output folder; the deliverable PNGs are normalized 512px exports.

## Shared production specification

These are the normalized production instructions used across the calls, rather than a verbatim conversation transcript:

> Create one original standalone full-body idle game sprite. Heroic chibi anime, approximately 2.5–3 heads tall, oversized expressive head, compact body and readable weapon silhouette. Crisp dark outlines, rich cel shading softened by painted gradients, warm upper-left rim light, saturated non-neon colors. Existing Asterveil artwork is rendering reference only; do not copy existing characters. Mercenaries face right in three-quarter view; enemies face left. Entire character, weapon and ornaments visible with clear padding on a square canvas, level soles, true transparent background, no ground or cast shadow. Original family-friendly design. No text, letters, numbers, logos, UI, rarity stars, extra subjects, gore or sexualization.

| ID | Subject instruction |
|---|---|
| merc_spear | Garran, broad tanned adventurer, short dark hair, teal tabard over silver scale, round buckler, long leaf-blade spear |
| merc_archer | Mira, lean ranger, auburn braid, forest green hood over charcoal practical leather, white-fletched arrows, curved longbow |
| merc_alchemist | Toma, round glasses, chestnut hair, goggles on head, brass satchel of glowing vials, ivory apron, amber potion flask |
| merc_scout | Sefa, short silver-blue hair, steel blue scarf, dark leather, two thick steel daggers, crouched ready pose |
| merc_warden | Brann, broad bearded adult, dark braided beard, stone grey heavy plate with gold trim, enormous two-handed geometric rune hammer |
| merc_bard | Lio, curly dark hair, layered coral charcoal coat, lute-like rune instrument, compact floating musical note light shapes |
| foe_tusker | Mossback Tusker, stocky cute tough brown boar, mossy back, white pink flower sprigs, small ivory tusks, thick hooves, no gold |
| foe_sprite | Dandelion Sprite, mischievous seed-puff fairy, oversized ivory dandelion head, mint glowing core, leafy body, seed tuft wings, no gold |
| foe_stalker | Briar Stalker, lean teal olive lynx predator, thorn spines, glowing teal eyes, pointed ear tufts, curved tail, thick paws, no gold |
| foe_mycon | Hollow Mycon, huge dusky teal mushroom cap hood, little dark face, mint eyes, squat moss robes, staff with glowing spore orb, no gold |
| foe_golem | Shard Golem, broad chunky dark slate rock body, huge fists, thick short legs, violet crystals through cracks, glowing eyes, no gold |
| foe_riftweaver | Rounded indigo CLOTH HOOD, no pointed hat or hair, smooth dark ceramic mask with cyan-violet eye slits, closed midnight robe, geometric rune ribbons, violet crystal core, no gold |
| foe_matriarch | Thorn Matriarch, mint hair, teal olive bark armor, fully covered torso shoulders and abdomen, leaf layers, ornate branching thorn crown with gold tips, clawed branch hands |
| foe_juggernaut | Crystal Juggernaut, huge armored beetle-rhino, dark slate chitin encased in violet crystals, horn with gold tip, gold shell banding, compact heavy legs |
| foe_sentinel | Veilbound Sentinel, pale stone and gold plates split by violet crystal glow, heavy halberd, floating geometric gold-violet sigil ring, oversized closed helmet, broad thick compact limbs |

## Targeted revisions

Garran, Mira, Brann and Lio were revised using their initial original generation as the identity reference and the existing units atlas as the rendering reference. The correction requested substantially larger heads, shorter compact torsos and legs, approximately 2.5–3-head proportions, unchanged gear, palette and right-facing identity. Mira's boots were made practical and flat. Lio's rank-like star badges were discouraged while retaining requested musical light shapes.

The first Rift Weaver resembled the existing Mage too closely and was discarded. The final instruction explicitly required a rounded cloth hood, no wizard hat, no visible hair, ceramic mask, closed robe and indigo palette. The first Matriarch was revised to continuous practical bark and leaf armor covering shoulders, chest and abdomen, with compact chibi proportions. Discarded variants are not packaged.

## Portrait instruction applied separately to every character

> Create one square head-and-shoulders bust portrait of the character in the selected body reference. Preserve the unique face or mask, hair, gear and accent colors; use the same three-quarter facing. The existing portrait atlas supplies polished anime rendering and closeup framing only, not character identity. Large expressive face centered for readability at 40px in a circle. Crisp linework, rich cel shading, soft painted gradients and warm upper-left rim light. Soft painted opaque accent-color background. Head and shoulders only, no full body, border, text, letters, numbers, logos, stars or UI. Normal enemies have no gold ornament; elites retain gold accents; Sentinel retains gold and violet.

Portrait backgrounds by order: teal, deep forest green, amber, steel blue, stone with muted gold, coral; moss green, mint, teal olive, teal, violet, indigo violet, teal, dark lilac, violet with pale gold.

## Export only

`build_package.py` performs deterministic resampling, transparent-matte fringe removal, alignment, WebP encoding and atlas/review composition. It does not invent character artwork. The original six frames and all world references are only decoded for the explicitly requested review composites; their source files remain byte-for-byte unchanged.
