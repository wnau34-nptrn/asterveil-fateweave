# ART-PET-002 — production pet artwork

Six owner-approved ART-PET-001 identities, produced as right-facing companion sprites. All files for this task are confined to this folder. No runtime integration, merge or deployment is included.

## Intake

- `pets.webp`: lossless RGBA, 1024×1536; six rows in the requested ID order and four 256×256 columns: `idle_a`, `idle_b`, `assist`, `happy`.
- `pets.json`: named frames with x/y/w/h and frame-local `footY: 240`. Place at bottom-centre x=128, y=240. The moth uses this as a virtual hover baseline. Happy is the camp resting pose; moth hovers and slime squashes.
- `pet_portraits.webp`: opaque painted busts, 768×512, 3 columns × 2 rows of 256×256. `pet_portraits.json` maps the same six IDs.
- `preview.png`: 1536×1320 static placement study. Actual repository Knight at a 100 px frame, pet at a 52 px frame (maximum painted dimension about 44 px), enemy on the opposite side. Map checks use 128 px source tiles plus 48/64 px display tiles. Camp uses happy frames at 60 px, mirrored only on the right. Portrait checks show 48 px squares and 40 px circles. Labels belong only to this review board.
- `atlas_review.png`: alpha-composited atlas for inspection. `sprite_source.png` and `portrait_source.png` retain built-in imagegen outputs. `assemble.py` reproduces registration, scaling, lossless encoding and review composition; `validation.json` records export checks.

## Visual identity and poses

Cream/ochre leaf-ear fox with one puff tail; clay/cream moss piglet with paired leaves; ivory/lilac angular-wing moth; slate/moss gargoyle pup with champagne chest; teal/cream owl with amber chest lantern; navy slime with pale lilac veil and mint core. Idle B blinks; assist lifts fox paw, points piglet snout, opens moth wings, braces pup paws, sweeps owl wing and lifts slime droplet. Happy rests or smiles. Broad silhouettes and value masses remain identifiable in the 44 px study; fine leaves, fur and crystal facets merge at that scale.

These are presentation poses, not combat event definitions. Place beside the party, below the Knight's waist, outside actor tap areas. Pets never enter the turn queue. The game determines assist timing and results. No painted ground, contact shadow, text or UI appears in either production atlas. Portraits intentionally have painted backgrounds, per placement rules.

## Provenance and prompt set

Built-in imagegen only, no API/CLI fallback. References: approved ART-PET-001 concept sheet and scale preview on `art/art-pet-001`; current placement rules and `public/assets/art/units.webp`. Only this game's existing environments/units are composited into the review board. All pet artwork is original.

Sprite prompt: create a transparent 4×6 atlas, 1024×1536, matching the six reference identities and painted chibi style; each row one pet in the requested order; columns neutral idle, blink/breath idle, helping gesture right, cheerful resting pose. All face right. Keep silhouette/palette, crisp dark outlines, broad shapes readable at 44 px, stable scale/baseline; fox one filled puff, piglet moss saddle/two leaves, moth broad crystal planes, pup few seams. No labels, ground, shadows, extra creatures, props or weapons. Helping gestures: raised fox paw, piglet nose point, opened moth wings, braced pup, owl feather sweep/brighter lantern, slime mint droplet.

Two extraction passes requested genuine alpha transparency while preserving all creatures and poses, removing colored backdrop, glow haze and ground shadows. The stored RGB channels retain former backdrop colors in transparent pixels; compositing and WebP decoding verify the actual alpha. Alpha is preserved during export, including antialiased edges.

Portrait prompt: six square painted busts in a strict 3×2 sheet, fox/piglet/moth then pup/owl/slime, matching reference identities; right-facing three-quarter view; large readable face for a 40 px circle, dark outlines, broad highlights, simple navy/teal painted backgrounds; no labels, borders, UI or extra subjects.

## Validation

Decoded all output images; verified exact dimensions, 24 named frames, 256 px frame size, transparent frame corners and local baseline 240. Inspected the alpha-composited atlas and battle/map/camp preview. Source spacing is slightly uneven, so extraction uses individual bounds before registering into the exact final grid. A single scale per pet row keeps its four poses consistent. No game behavior is modified by these unreferenced assets.
