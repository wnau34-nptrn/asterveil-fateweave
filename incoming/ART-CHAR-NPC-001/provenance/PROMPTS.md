# Generation record

Original artwork generated with OpenAI image_gen on 2026-10-16. Only this repository's accepted art and newly generated original sheets were supplied as visual references. No named artist/studio/game prompts and no external repository images.

## NPC masters

Shared prompt: original civilian NPC, match units.webp contour weight, cel shading, gradient rendering, warm firelight and 2.5–3-head chibi proportions. Transparent 4-column × 3-row sheet, eleven full-body figures plus empty bottom-right. All frames three-quarter facing right, feet planted, consistent costume and scale. Four idle, four work, two greet, one cheer. No workstation, floor, cast shadow, halo, lettering, numerals, UI, logo, armour or battle weapon. Four-slot loops follow rest/intermediate/peak/intermediate.

### smith

Broad cheerful middle-aged blacksmith, bald crown and russet sideburns, small moustache, goggles pushed up on headband, soot-smudged oxblood leather apron over ivory rolled sleeves, chunky work shoes. No armour. Compact utilitarian small hammer. idle wipes brow, work lifts and lowers hammer towards off-frame anvil to his RIGHT, greet nod then small wave, cheer proud raised fist.

### broker

Slim friendly hire broker with sandy bob hair, tall soft butter-yellow feathered cap, plum travel coat with many pockets over cream trousers, quill behind ear, plain coin. No armour. idle flips coin just above right hand, work reaches RIGHT to pin a blank paper on an off-frame board, greet looks up then tips cap, cheer delighted open palm.

### trainer

Older civilian drill instructor, warm stern face with tiny friendly eye scar, grey hair in long braid, terracotta knit vest over rolled cream sleeves, soft charcoal trousers and flat shoes, plain wooden walking/practice staff with rounded tip. No armour. idle leans on staff, work gently taps practice staff towards off-frame dummy to RIGHT with feet planted, greet looks up then nods, cheer pleased thumbs-up.

### keeper

Short tidy plump quartermaster with round spectacles, dark hair in neat double buns, powder-blue blouse, deep navy tidy split apron, cream measuring tape around neck WITHOUT MARKS, blank wooden ledger under arm, flat slippers. No armour. idle adjusts spectacles, work counts supplies by pointing successively RIGHT with free hand, greet looks up then small wave, cheer hands clasped delighted.

### herbalist

Young curious slightly clumsy potion brewer, freckles, dusty pink curly hair tied up in a round messy bun with cloth band, sage rolled-sleeve blouse, mauve short work apron, mushroom-colour trousers, herb satchel and teal glowing round flask. No goggles, no armour. idle sniffs flask, work uses small pestle to grind herbs in a handheld mortar close to body and towards RIGHT, greet looks up then waves carefully, cheer hugs flask happily. Tiny close steam only.

### scout

Lean calm civilian route guide, warm brown skin, dark short hair, pale sand hooded short cloak with folded hood up and no flowing tails, muted lilac tunic, cream trousers, soft walking boots, small brass spyglass, tiny round tawny owl on LEFT shoulder. No weapons, no armour, no quiver. idle raises spyglass and glances through it RIGHT, work reaches RIGHT moving small marker stone on off-frame map table, greet looks up then nods, cheer quiet smile and lifted thumb.

## Stations

Reference: units.webp and lobby_bg.webp. Original 3×2 civilian workstation atlas in role order, each group bottom-centred, work surfaces accessible from left, no people, no text, no flames, no floor/shadow. Smith: anvil, stump, coals forge, bellows and tools. Broker: blank notices and coin box. Trainer: straw dummy and rounded practice sticks. Keeper: crates, cloth mannequin and cloak rack. Herbalist: worktable, mortar, bottles, teal flask and drying herbs. Scout: pictorial map, marker stones and lantern pole.

Alpha correction removed painted backdrop/shadow and cloth emblems; original source retained as stations.png. Because keeper and herbalist groups touched in that source, each was separately redrawn from the same reference as a complete isolated square prop with transparent margins, no neighbour fragments, text, ground or shadow. These final replacements are station_keeper.png and station_herbalist.png.

## Busts

References: the original smith, broker, trainer, keeper and scout sheets; herbalist described using the same pink bun/sage blouse/mauve apron design. Exact 3×2 role order. Friendly head-and-shoulders facing right, consistent face scale, centred with eyes around 40% height, warm painted amber-brown backgrounds, safe circular crop, no framing, UI, text or logos.

## Packing

build_package.py performs mechanical crop, connected-component alpha cleanup, size/sole normalization, feet stabilization, ping-pong return selection, WebP encoding and review compositing. It never paints new characters or changes existing artwork. Source masters are review-only; the eight runtime WebPs alone count toward the budget.
