# ART-STORY-PROLOGUE-001 — production notes

Original illustrations generated with the built-in imagegen tool, then technically normalized and encoded with Pillow. No art imported from any other repository. Reference files were read only. PNG masters accompany each of the five runtime WebPs. Review sheets are made from decoded runtime WebPs, so compression is represented.

## Runtime inventory

| File | Dimensions | Mode | Bytes |
|---|---|---|---:|
| vargoth/vargoth_full.webp | 1024×1024 | RGBA | 271,662 |
| vargoth/vargoth_bust.webp | 512×512 | RGB | 99,024 |
| scenes/story_awaken.webp | 1920×1080 | RGB | 415,622 |
| scenes/story_rift.webp | 1920×1080 | RGB | 353,070 |
| scenes/story_retreat.webp | 1920×1080 | RGB | 369,084 |
| **Total** | | | **1,508,462** |

Budget: 1,600,000 bytes; headroom: 91,538 bytes. Runtime WebPs use quality 91 for Vargoth and 87 for scenes, method 6, with embedded sRGB ICC. PNG masters and review PNGs also embed sRGB ICC.

## Placement and normalization

- `vargoth_full.json` records `footY: 1000` (baseline immediately below the lowest sole row). Figure alpha bounds are x=68..954, y=130..999, or 870 px / 84.96% frame height. Transparent space below the baseline is 24 px. No painted ground or contact shadow.
- The brief's near-24-px head padding and 70–85% overall height cannot both hold with soles at y≈1000. This delivery prioritizes the explicit 85% height limit and y=1000 soles: horn-top padding is 130 px, exceeding the minimum 24 px safety padding. No anatomy was stretched to resolve that conflict.
- Transparent output retains generated alpha; 163 isolated source speck pixels were removed. Fully transparent RGB was cleared before encoding. No background replacement, shadow, or painted halo was added.
- Source generations were 1254×1254 for Vargoth and 1672×941 for the scenes. Final PNG masters were normalized to delivery dimensions with Lanczos and centred aspect fitting (less than one pixel of aspect correction in the scene source). The source and delivery sizes are not interchangeable.
- Bust eyes are around 43% of image height; the face remains inside the circle at all required sizes. Horn tips may crop in portrait circles, while eye, nose, smirk and jaw remain readable.
- Centre 9:16 column: source x=656.25..1263.75 (607.5 px); review/scenes.png outlines this column. Night rift focal core and pillar stay inside it. The pillar also stays visible in the narrower actual 390×844 cover crop.
- Scene progression retains the framing pillars, paired broken arches, floating ruined islands, waterfalls, mountain horizon and circular gold-inlaid courtyard. The distant camp is visible off the left-hand escape stairs in retreat. Faint demon silhouettes appear only inside the night tear, as requested.

## Review sheet construction

These are art-placement composites, not screenshots of integrated gameplay. No game code was changed. `story-ui.ts` and `game-feel.css` currently contain a circular sentinel placeholder; the full-body placements below follow this handoff's intended intake presentation.

- Phone 390×844 and desktop 1366×768: centred `background-size: cover`, same dark background gradient as current story CSS, new full figure composited above an empty dark rounded card starting at y=65%. Card width is min(720 px, viewport−32 px), 18 px radius, 16 px bottom inset. No labels or text.
- Phone figure: square frame 350 px, x-centre 55%, sole at y=565; visible figure about 297 px before card overlap. Desktop: square frame 560 px, x-centre 65%, sole at y=515; visible figure about 476 px before card overlap. Feet intentionally pass behind the dialogue card. These are proposed integration sizes, not a claim that the current placeholder already uses these values.
- Lineup order: knight (units frame 0), Vargoth, crystal golem/brute (units_foes frame 4). All three use the same 1:1 source-pixel scale, on a shared sole baseline. Vargoth uses a 1024 frame; existing actors use 512 atlas cells. The knight review extraction excludes right-edge neighbouring-cell bleed; source atlas remains byte-identical.
- Bust sizes left-to-right: 260 / 96 / 56 / 40 px, circle-cropped on #0d1c2e.
- Supplemental `vargoth-edges.png`: runtime sprite against navy and light stone for fringe inspection. `validation.json` records dimensions, modes, byte counts, normalization and hashes.

## Protected source SHA-256

The following hashes were captured before generation and checked again after production. All match the base-branch files byte for byte.

| Protected file | SHA-256 |
|---|---|
| public/assets/art/ruins.webp | `a06f910462fb69b1a38d94c1a169274f8b28d559286ec6ae3fc7ac3db61e7868` |
| public/assets/art/units.webp | `d205b57d8a4082290a3a2e5a415407245106f948033cf3c66eb7b8e537393629` |
| public/assets/art/units_foes.webp | `a76432680856f6f45bf2c7a006124e29cc8a248ea680779194dfa339c7338860` |
| public/assets/art/portraits.webp | `f604b5f93c6526130546e194674d37f4e3265083908bbbb3448affadf4b70496` |
| public/assets/art/portraits_foes.webp | `a0af4dc53e1413de8d161e2f454845b856ca255622a2efdc03b8439961ca841e` |
| public/assets/lobby/lobby_bg.webp | `3fbd0e041c78904fa0dc83f86e019d46124238555a250f95dc1f60e487d83f1f` |

## Generation prompts

Built-in imagegen only. References came from this repository. Iterations below document the selected identity and scene corrections; rejected drafts are not runtime assets.

### Vargoth initial

Use case: illustration-story. Asset: original 2D fantasy mobile JRPG villain sprite, single full-body Vargoth. Input images: units.webp STYLE reference only; units_foes.webp style and EXCLUSION reference only. Match the units atlas' clean dark contour weight, luminous hand-painted anime shading, large expressive head, compact heroic-chibi body about THREE heads tall. Create an ORIGINAL humanoid demon chief, arrogant, patient, commanding, not feral. Three-quarter view FACING LEFT: nose, gaze, chest and both boots point to image LEFT. Strong pale grey-violet jaw, visibly confident closed-mouth smirk, glowing violet eyes, no beard. Jagged crown of obsidian HORNS emerging from head with small violet crystal TIPS; NOT a metal crown or helmet. Heavy broad shoulders, layered black-stone armour with THIN glowing #c79bff violet cracks, a little cold silver trim; navy-violet lit planes, no large pure black regions. Long dark tattered cloak dissolves into small violet rift-light tongues at its edges, contained near cloth. One great crescent GLAIVE held LOW across his lower body, blade toward LEFT, away from face, single long straight pole with one curved crescent blade. Warm restrained amber rim light outlines face and shoulders. Relaxed planted standing pose, chin lifted, no attack pose. Clearly distinct from crystal brute/golem, hooded rift weaver, gold-armoured masked sentinel: exposed expressive face, horn crown, long cloak, thin-cracked stone plates and single low glaive. No gold armor, no helmet, no halo behind head, no wings. Square 1024x1024 RGBA with GENUINE TRANSPARENT BACKGROUND. Whole figure and weapon entirely inside canvas, generous horizontal padding, soles at y about 1000. Occupy 85% canvas height including horns, no cropping. NO ground, contact shadow, pedestal, ring or rift behind him. No text, runes, letters, numbers, logos, symbols, watermark, UI, scenery, companion. Painterly 2D illustration, no pixel art, photographic textures or 3D render. Output only the single sprite.

### Vargoth chibi correction

Use case: style-transfer. Edit target is the attached transparent Vargoth sprite. Keep his original identity, left-facing three-quarter pose, obsidian horns with violet tips, exposed pale smirking jaw, lavender hair, black-stone armour with fine violet cracks, tattered dark cloak ending in violet light, single low-held crescent glaive, warm rim light and genuine transparent background. ONE essential correction: make him HEROIC CHIBI in the same proportions as the units.webp reference, about THREE heads tall measured from skull top to soles, excluding horns. Enlarge the head and face relative to the body, shorten his torso and legs substantially, broad heavy shoulders, compact imposing stature. Do not turn him into a tall normal anime adult. Match the second image unit atlas proportions and painted contour/shading quality. Face is large enough to read clearly at 60px. Single sprite, entire low-held glaive inside canvas. 1024x1024 transparent, no shadow, ground, scenery or portal. Keep all visible pixels inside a central height of 85% of canvas, soles near y1000; at least 24px padding around all weapons and horns. No text, runes, UI, numbers or watermark. No new props.

### Bust

Use case: identity-preserve. Asset: square 512x512 head-and-shoulders bust of Vargoth for circle cropping. Reference 1 is the FINAL Vargoth identity, preserve his exact exposed pale lavender face, angular strong jaw, smug confident closed-mouth smirk, luminous violet eyes, lavender swept long hair, jagged obsidian horn crown with violet crystal tips, stone pauldrons and warm amber rim lighting. Reference 2 portraits.webp is the painted anime rendering style reference ONLY. Three-quarter facing LEFT. Recompose into an intimate bust: the face centred horizontally (nose around x44%, eye around x50%); eye line EXACTLY y40% (205px). Head large, chin around y65%; shoulders across lower 30%; horns/hair may crop at outer circle edge but entire eye, nose, jaw and mouth remain cleanly within central circular safe area, readable even at40px. Simple deep navy-violet background with subtle dark violet glow behind head, no scenic environment, no glaive in crop. Polished 2D painted anime portrait consistent with the sprite, fine strong contours, no 3D rendering. No text, numbers, runes, icons, watermark, UI, no halo ring. Output single square portrait.

### Dusk initial

Use case: illustration-story. Asset: story_awaken, 1920x1080 wide 16:9 painterly 2D JRPG background. Input image ruins.webp is the AUTHORITATIVE SAME LOCATION and painting style reference, not an optional mood image. Repaint this SAME ruined frontier fort at DUSK. Preserve its recognizable circular blue-stone courtyard with concentric slender old gold inlay, broken paired arches at far courtyard left of centre, enormous broken stone arch pillars framing left and right edges, ivy on broken masonry, distant floating rock islands topped with ruined towers and thin waterfalls, mountain horizon. Recompose into widescreen with topmost 10% ONLY quiet sky; foreground bottom 35% calm dim blue flagstone floor with broad circular inlay, no important objects or bright detail. Add ONE long narrow jagged VIOLET TEAR through the dusk sky, centre at x=53%, y=27%, entire focal tear inside x=35%-65% (centre 608px phone slice). The tear is a physical irregular crack with a dark violet interior and #c79bff thin luminous torn edges, no circular portal. Sparse embers and dust. Warm faded peach sunset at horizon, navy-violet shadows, quiet ominous mood. Keep x55%-75%, y35%-65% low contrast dark stone/sky for a villain overlay; no bright clutter there. Retain painterly brushwork, fine painted contours, rich luminous anime environment finish of reference. NO characters, people, creatures or silhouettes. No veil, curtain, dome or barrier of light. No text, runes, letters, numbers, logos, watermark or UI. No pixel art, photo textures or 3D renders. Output a single landscape image.

### Dusk HUD correction

Use case: precise-object-edit. Edit target: the supplied dusk ruined fort illustration. Keep exactly its fort architecture, circular courtyard, broken arches, islands, waterfalls, lighting, palette and painterly style. Correct ONLY the violet sky rift: remove the current tear touching the upper edge and replace it with one much NARROWER long jagged SLIT fully enclosed in the sky, at x=46%-60%, y=16%-34%. Its upper tip must be below y=14%, lower tip above y=40%. Calm sky in topmost 10%, no tear or bright rift light in that top band. The slit has thin #c79bff torn edges and dark centre, quiet and ominous before it opens. All focal light inside centre x=35%-65%; x55%-75% below horizon remains quiet and dark. No people, creatures, UI, text, letters, numbers or watermark. No veil, curtain, dome, light barrier or circular portal. Preserve the same empty fort. 1920x1080 landscape, painterly 2D.

### Night initial

Use case: lighting-weather. Edit target: supplied story_awaken image, a painterly fort courtyard. Make story_rift, same exact fort at NIGHT with its sky rift torn WIDE OPEN. LOCK camera, architecture and terrain: same circular stone courtyard and gold inlay, left and right broken foreground arch pillars with ivy, same broken paired arches left of centre, identical floating islands and waterfalls, same far courtyard edge and stairs. Change lighting to deep navy-violet night with restrained cold light. Open a large irregular jagged violet gash in the central sky, wholly inside x37%-63%, y14%-40%, no touch to top edge. Its interior is very dark, thin glowing #c79bff ripped edges, faint TINY distant demon silhouettes only INSIDE the rift, barely legible dark horn shapes, no detailed characters. A single slender PILLAR of violet light descends from the tear to ground at x58%, y59% (right of centre, still inside centre608px/9:16 column). Pillar is a narrow atmospheric shaft, not a wall or curtain; brightest at sky mouth and ground impact, low contrast through y35%-55% where the villain torso overlays. Keep x55%-75%, y35%-65% dim and uncluttered apart from narrow soft shaft. Bottom35% calm dim flagstone floor, NO large fissures or bright effects there. Top10% quiet sky (framing masonry only at far lateral edges). No characters anywhere on ground, no hero, commander or foe. Never veil, curtain, dome, barrier, circle portal or ring. No text, letters, numbers, runes, logos, UI, watermark. Painterly 2D rendering exactly matches reference, no pixel art, photo textures or3D. 1920x1080 landscape16:9.

### Night crop correction

Use case: precise-object-edit. Edit target is attached night ruined fort image. Preserve every stone, arch, courtyard, island, waterfall, camera, lighting and all painting. Change ONLY shape and placement of violet sky tear and its pillar. Current tear is too big and touches top: erase it and redraw the SAME wide-open jagged dark rift at HALF ITS CURRENT WIDTH, fully enclosed in a central rectangle x43%-61%, y16%-37%. No luminous tear/lightning/shards outside that rectangle, especially NONE above y14% or right of x63%. Keep tiny barely visible distant horned silhouettes INSIDE dark tear. One slender violet atmospheric pillar descends from its RIGHT end at x58% to the existing far courtyard y56%, strongest near sky mouth and ground foot, soft dim shaft through midsection. Open rift is a WIDE irregular wound, unlike narrow slit in dusk image, but it fits entirely inside centre608px column. Topmost10% calm night sky. Keep villain torso area x55%-75% y35%-65% readable dark. No floor alterations. No veil, dome, curtain, barrier or circle portal. No text, letters, numbers, runes, logos, UI or watermark. No ground characters. Single1920x1080 painterly2D environment.

### Night phone adjustment

Use case: precise-object-edit. Edit the attached image ONLY by moving the entire violet sky tear, all its edge light, its distant interior silhouettes AND descending light pillar as ONE GROUP horizontally LEFT by precisely 6% of the total canvas width (about100px in supplied image,115px at1920px). Keep group size, shape, height and brightness unchanged. Fill old position with matching night sky. The pillar should now land at x57% instead of x63%. Every glowing pixel of main tear must lie inside central column x35%-65%, top tip remains below top10% sky. Preserve every other pixel of fort, arches, island architecture, waterfalls, floor, lighting and camera. No new subjects or objects, no text or UI, no veil/dome/barrier/curtain. Output single landscape1920x1080 painterly image.

### Retreat initial

Use case: lighting-weather. Edit target: supplied story_awaken illustration. Make story_retreat, this SAME fort just before dawn after battle. LOCK camera, composition, fort architecture and terrain: identical circular stone courtyard with gold inlay, identical massive left/right edge broken arches, ivy, broken paired arches left of centre, identical floating ruined islands and waterfalls, same stair line and horizon. Change atmosphere to cold pre-dawn blue, warm sunset fades to a pale cool eastern horizon. The violet sky tear is now NARROWING to a faint slim jagged slit wholly inside x48%-58%, y17%-34%, weak dim violet edges fading. Entire sky's top10% stays calm, framing masonry only at lateral edges. A little low smoke drifts over the far courtyard; several restrained dark violet scorch marks on stones at y52%-64%, never writing/runes, not a glowing circular magical glyph. Bottom35% stays calm floor with no bright focal marks. Keep x55%-75% y35%-65% dim and readable behind a villain. An existing broken pathway from the courtyard leads off LEFT through ruins toward a very small distant WARM AMBER CAMP GLOW at left far background (x18%,y51%); hint shelter only as distant low warm lights, no people, no foreground camp. Central focal point remains fading rift in centre608px/9:16 slice. No figures, characters or demon silhouettes. No veil, curtain, dome or light barrier, circle portal, UI, text, letters, numbers, runes, logos or watermark. Preserve rich painterly2D anime environment style, no pixel art/photo textures/3D renders. 1920x1080 landscape16:9.

### Retreat camp path correction

Use case: precise-object-edit. Edit target is attached pre-dawn ruined fort. Preserve EXACTLY the rift, sky, light, islands, circular floor, gold inlay, arches, camera, smoke, violet scorch marks and painterly style. Strengthen ONLY the retreat story cue on LEFT: make the existing left-side stair/path clearly lead away through the broken fort side opening toward a tiny distant warm camp glow. Put a very small cluster of dim AMBER lights with two tiny remote tent silhouettes beyond masonry at x16%-22%, y45%-49%, connected to courtyard by the existing left stair/path. Must read as faraway camp, not foreground fire or new building. No people, no characters. Central fading rift remains focal; bottom35% calm floor, top10% central sky. No text, numbers, letters, runes, logos, UI or watermark. No veil, dome, light barrier or curtain. Single1920x1080 painterly2D image.
