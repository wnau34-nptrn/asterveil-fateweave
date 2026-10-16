# ART-CHAR-NPC-001 — Living camp NPCs

Delivery branch: `art/art-char-npc-001`, from latest base `feature/fateweave-initial-prototype` at `e3643672e0bbc89bea46b014fca87a8cb947cfd3`. Produced 2026-10-16 for Claude Asset Intake Review. The owner's NPC exception replaces only the old no-NPC line in ART-UI-LOBBY-001.

## Delivery

Eight runtime WebPs: **2,027,196 bytes / 2,400,000 bytes** (decimal), sRGB profile embedded. Six 2048×1536 RGBA NPC atlases, one 1536×1024 RGBA station atlas and one 1536×1024 RGB painted bust atlas. PNG masters, review PNGs, GIF, JSON and the packing script are not runtime assets.

Each NPC atlas is four columns × three rows of 512 px cells. Row-major indices: idle 0–3, work 4–7, greet 8–9, cheer 10, transparent empty 11. Frame-local `footY=496` is the last visible sole scanline, exclusive alpha bottom 497. `npc/npc_frames.json` records the common anchor and every occupied frame's footY; empty frame has null footY. Use the whole 512 px cell, origin at top left, sole anchor (256,496).

Idle and work run at 8 fps. Each is rest/intermediate/peak/intermediate, with the return intermediate intentionally reused in slot four. The feet are stabilized independently of small held/grounded tools, so a staff tip does not persist into a work pose. Greet is two frames; cheer is a single reaction. Reduced motion uses idle index 0. The optional GIF shows all six idle loops across its top row and work loops across its bottom row. GIF delays alternate 120/130 ms for an exact 8 fps average.

Station and bust cell order: smith, broker, trainer / keeper, herbalist, scout. Cell (column,row)=(index%3,index//3), with 512 px cells. Station anchor is (256,496), matching NPC ground. Place the station to the NPC's right; NPC artwork contains only the figure, held tools and small local effects. Pair placement and work-surface alignment remain developer integration choices. Portrait faces are centred for 56–96 px rounded/circular crops with eyes around 40% height.

All stored NPC frames face RIGHT. Right-side NPCs and their paired stations are mirrored inward in both camp mocks. Notices, map, ledger and measuring tape contain no writing. No runtime ground shadow, painted floor, halo, UI panel or flame. Coals and teal glass retain local light. The camp flame in review compositions is a code-drawn placeholder only.

## Review and production

`review/camp-phone.png` is 390×844; `camp-desktop.png` is 1366×768. They use the accepted scene layers and existing hero poses, with thin HUD-region outlines and no text. The scene ratios are approximately 2.4:1 and 4.7:1, following placement rules. Six staff sit beside stations in two depth rows; two existing heroes occupy the fire area. These are proposed placement compositions, not integrated application screenshots. Phone staff are intentionally smaller than the two foreground heroes to accommodate all six stations in the existing scene band; final tap targets and service HTML are outside this asset task.

`npc-lineup.png` uses one common 256 px frame scale for the six idle-0 NPCs, Aegis and Lio. `npc-silhouettes.png` order is six staff, four base heroes, six additional mercenaries, all at 90 px visible silhouette height. `npc-mirror-check.png` covers every occupied frame alongside its reflection. All reviews sample decoded runtime WebPs.

Original images were generated with image_gen, using only this repository's approved art as references. No external repository imports or named artist/studio/game imitation. Source masters and the prompt record are preserved in `provenance/`. Two touching source station groups were replaced with isolated complete keeper/herbalist drawings. The original station master remains provenance only; the runtime atlas uses the corrected replacements.

Packing uses Pillow, NumPy and SciPy: `python -B incoming/ART-CHAR-NPC-001/build_package.py`. Validation only: append `--validate`. The script performs mechanical cropping, alpha component cleanup, anchor normalization and compositing, without painting characters or editing existing assets. NPC RGB detail passes through a 384 px-per-cell grid, with sixteen alpha coverage levels, before export on the exact 512 px frame grid. NPCs/stations use WebP quality 68, method 4; busts use quality 85. Full-resolution source PNGs remain for review. Fine texture is softer in compressed runtime files; final subjective style, expression and silhouette acceptance belongs to Claude Asset Intake Review.

## Validation

Exact atlas and viewport dimensions, alpha modes, embedded sRGB, six empty cells, frame/prop baselines, stable boot alpha, eight runtime files and the byte budget passed. All eleven requested protected hashes match the pre-production snapshot and base Git blobs. Only `incoming/ART-CHAR-NPC-001/` is added; no changes under src/, tests/, .github/, public/ or existing art. No merge or deployment.

## SHA-256 — existing references, unchanged

| Existing file | SHA-256 |
| --- | --- |
| `public/assets/art/portraits.webp` | `f604b5f93c6526130546e194674d37f4e3265083908bbbb3448affadf4b70496` |
| `public/assets/art/portraits_foes.webp` | `a0af4dc53e1413de8d161e2f454845b856ca255622a2efdc03b8439961ca841e` |
| `public/assets/art/portraits_mercs.webp` | `4e52e0ebad02dee265cba112fecfe162757f4f9d4f596df09771768ade7b9ceb` |
| `public/assets/art/units.webp` | `d205b57d8a4082290a3a2e5a415407245106f948033cf3c66eb7b8e537393629` |
| `public/assets/art/units_foes.webp` | `a76432680856f6f45bf2c7a006124e29cc8a248ea680779194dfa339c7338860` |
| `public/assets/art/units_mercs.webp` | `f56977d16167593da97b41417239ef1db4fd2d790301b230c62b8ffbb1825e54` |
| `public/assets/lobby/lobby_bg.webp` | `3fbd0e041c78904fa0dc83f86e019d46124238555a250f95dc1f60e487d83f1f` |
| `public/assets/lobby/lobby_fg.webp` | `dfa00861cb3220f89a23cb9570d345ae835150850e74e2ab9111d02190a2a969` |
| `public/assets/lobby/lobby_firepit.webp` | `d1b0798daca8b9047c2895c75911895a172f205cc617990ddce4df805023eb26` |
| `public/assets/lobby/lobby_poses_heroes.webp` | `ed95adc4ad471a182077fd21ec2031b2babd197044ab3d6ebb991044046dc40f` |
| `public/assets/lobby/lobby_poses_mercs.webp` | `0b8fb22c56a0b10c9cbc26161c3859e15eb3130e5b8aad7a7b4fc0fdf2122c49` |
