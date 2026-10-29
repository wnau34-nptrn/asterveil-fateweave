# ART-CHAR-MERC-ENEMY-001 intake notes

Original character-art package for Asterveil Fateweave. Generated on 2026-10-15 using the built-in image_gen tool. No external repository art, named-artist imitation or trademarked designs were imported.

Base branch: `feature/fateweave-initial-prototype`; base commit: `e6dfc92415f2b9bbd76ae0257e30b307c13cecf5`. Delivery branch: `art/art-char-merc-enemy-001`.

## Delivery and budget

Runtime WebP total: **1,939,496 bytes** (1.939496 MB), counting all 30 standalone WebPs and all four atlases. Limit: 2,000,000 bytes. PNG copies and review images are excluded from that runtime budget.

**Declared deviation from the requested approximate quality 85:** the final WebPs use quality **50**, method 4, with RGB texture detail filtered through a 256px grid and exported on the required 512px frame grid. Quality 85 could not fit the strict budget when both standalone and atlas copies were counted. PNG copies retain full 512px detail; unit alpha is identical between PNG and WebP. Review sheets use decoded runtime WebPs, so compression is visible for intake review.

All exports include an sRGB ICC profile. Individual full bodies are 512x512 RGBA PNG and RGBA WebP; portraits are 512x512 RGB PNG and RGB WebP. Unit PNG alpha has source glow fringe removed and only resampling edge antialiasing. No cast shadows are baked into units.

## Atlas contract

Two columns, 512px cells, row-major table order. Mercenary atlases: 1024x1536. Foe atlases: 1024x2560, bottom-right slot entirely transparent. Four same-basename JSON maps contain x, y, w, h and footY. Portrait maps use the corresponding unit footY for identity/anchor association; portrait images themselves are not ground-anchored.

Every unit uses frame-local **footY=496**, the last visible sole/foot or floating robe-tip scanline (0-based), not atlas-global Y. For atlas-global grounding use frame.y + footY. Keep the full cell when sampling. Shared horizontal frame center is x=256. Minimum transparent padding is 8px, or 4px for Sentinel; exact nonzero-alpha bounds appear below.

## Character anchors, palettes and source provenance

| ID | Facing | footY | Alpha bounds x0,y0,x1,y1 (exclusive max) | Palette |
|---|---|---:|---|---|
| merc_spear | right | 496 | [48, 37, 464, 497] | teal #348f91 / silver / leather |
| merc_archer | right | 496 | [40, 37, 472, 497] | forest #345b3c / charcoal / auburn |
| merc_alchemist | right | 496 | [96, 37, 415, 497] | brass #b78c48 / amber #e5a63c |
| merc_scout | right | 496 | [36, 37, 475, 497] | steel blue #617f9e / charcoal |
| merc_warden | right | 496 | [16, 37, 495, 497] | stone #899098 / gold #d9bf86 |
| merc_bard | right | 496 | [28, 37, 483, 497] | coral #ed927f / charcoal |
| foe_tusker | left | 496 | [19, 57, 493, 497] | moss #718746 / brown |
| foe_sprite | left | 496 | [107, 197, 405, 497] | mint #a6dfce / ivory |
| foe_stalker | left | 496 | [37, 57, 475, 497] | teal #397e77 / olive |
| foe_mycon | left | 496 | [11, 37, 500, 497] | teal #427f87 / ivory / mint |
| foe_golem | left | 496 | [16, 17, 496, 497] | slate #494358 / violet #9454d6 |
| foe_riftweaver | left | 496 | [96, 37, 416, 497] | indigo #343c70 / violet |
| foe_matriarch | left | 496 | [20, 17, 491, 497] | teal #397e77 / olive / gold tips |
| foe_juggernaut | left | 496 | [8, 40, 504, 497] | slate / violet / gold banding |
| foe_sentinel | left | 496 | [14, 5, 497, 497] | pale stone #e4dfcf / gold / violet |

Selected generation filenames and SHA-256 digests are in `provenance/manifest.json`; the prompt set and corrective iterations are documented in `PROMPTS.md`. `provenance/selected-sources.json` records the imagegen filenames needed to rebuild from the local raw generations.

## Validation checklist

- [x] 15 full-body idle frames, 512x512 RGBA, correct facing, shared baseline recorded
- [x] 15 portraits, 512x512, visually checked at 40px in a circle
- [x] 4 atlases and 4 JSON frame maps in the two-column 512px format
- [x] Line-up, silhouette, in-arena and on-map review sheets
- [x] 64px silhouettes visually checked, including against four heroes and two existing foes
- [x] Elites show gold; Sentinel shows gold and violet; normals have no gold tier ornament
- [x] No text, logos or copied character designs; new frames checked on light/dark for edge fringe
- [x] All runtime WebPs together are under 2.0 MB; existing source-art hashes unchanged
- [x] Notes, file sizes, anchors, palettes, generation provenance and hashes included

The checklist records the producer checks; subjective style acceptance and the declared encoding deviation remain visible for Claude Asset Intake Review. Optional attack/hit poses were not produced. No gameplay, UI, stats or encounter changes are included.

## Review guide

`review/lineup-mercs.png`: existing heroes first, then six mercenaries. `review/lineup-foes.png`: Raider and Brute first, then nine foes. Both use one pixel scale. Existing atlas frames contain a few boundary/adjacent-row specks visible in the unchanged reference previews; these are not new sprite pixels.

`review/silhouettes.png`: 15 new characters then six existing references, row-major, each silhouette 64px high. `review/in-arena.png`: two mercenaries (Spear/Archer), two heroes (Knight/Mage), two foes (Mycon/Sentinel), original backdrop. `review/on-map.png`: Matriarch/Juggernaut/Sentinel at about 1.5 world tiles. `review/portraits-40px.png` and `review/gameplay-160px.png` provide actual gameplay-size QA. All image sheets have no text labels.

## Existing-art SHA-256 check

Every hash below was compared against `git show <base_commit>:<path>` and against the working file after export. All match. The complete original six-frame unit atlas, complete six-frame portrait atlas, backdrop and all world WebPs are unchanged. No file under src/, tests/, .github/ or public/ is changed.

| Unchanged path | SHA-256 |
|---|---|
| `public/assets/art/portraits.webp` | `f604b5f93c6526130546e194674d37f4e3265083908bbbb3448affadf4b70496` |
| `public/assets/art/ruins.webp` | `a06f910462fb69b1a38d94c1a169274f8b28d559286ec6ae3fc7ac3db61e7868` |
| `public/assets/art/units.webp` | `d205b57d8a4082290a3a2e5a415407245106f948033cf3c66eb7b8e537393629` |
| `public/assets/world/boss_pedestal.webp` | `2c75527fc94517e2856a564a0957679f348bba578ccb4cf5f7c8204ec60d2f7d` |
| `public/assets/world/decor.webp` | `4b09ba9340c464ea09a0b66c8eedb9f715696d2106ae5a87ec7c00505d436928` |
| `public/assets/world/fog_corner_ne.webp` | `ed2d7652e15d083552fce96cbc3ec1eebc9429806141b4106a4512b75b6e1f4a` |
| `public/assets/world/fog_corner_nw.webp` | `298503f500547aba6a72f151228e9c2475dfe163c066d787b7132c68f4e4a1f5` |
| `public/assets/world/fog_corner_se.webp` | `8e5f0c368c23ac36967ae4930f303889bdec7f478638a0ca8ddbc75c3484631f` |
| `public/assets/world/fog_corner_sw.webp` | `435d06c46ebaae376718b37e85d084599a490ecf11775555b103ecb0d4dcfc47` |
| `public/assets/world/fog_edge_e.webp` | `7d09b1fb7e385a9607d7d0c9f45d01dca94a47d377a969b18fdd2733f7417334` |
| `public/assets/world/fog_edge_n.webp` | `a061f35dd6a414d65bc3ddf2f61ec247d63c894c933361d91b913a8ba443cdb3` |
| `public/assets/world/fog_edge_s.webp` | `5385603b2d2515de328529a3aea60a840f1af6afb62484c5233d077210d24d38` |
| `public/assets/world/fog_edge_w.webp` | `8a2422166cb732291adfc7095d1f07f8a73f1a5beb9f456803e1225fb0d86bed` |
| `public/assets/world/fog_tile.webp` | `f7fee7366b41db1bbb94e913ac1101ae053d1403dac9b61086133e7d05fd532f` |
| `public/assets/world/landmark_boss_cleared.webp` | `a7dc00358c691afc2dd071bb62ce35728d1e17bb94347bab6f1d75c02a74bbe5` |
| `public/assets/world/landmark_camp.webp` | `d7cb524e2e81d2c760b129bf373ddeee42b7840f76e7ae25f4097ae49f6a1699` |
| `public/assets/world/landmark_gate.webp` | `1988cb4815adcd459bdd65cfa2d92fe9cc03b764ab91bd1533f99ed1d10d2560` |
| `public/assets/world/landmark_gate_open.webp` | `676d3aedf958e71b1fe913aba5391a71d200d048ba6a8ecf80d5f0bf38a84f39` |
| `public/assets/world/landmark_start.webp` | `8cd01dd4f0d28b7316d7a2ca977f632e4805d8903470ca319132f09affd030fd` |
| `public/assets/world/step_dust.webp` | `93e9edca60a88ad78b29d0c72ef15edf18134ee338fad6aa04f4579551034267` |
| `public/assets/world/step_hint.webp` | `9be5794c2e4982dcd5d0efc4be7553b65cf41b262ea6f8ae9d96becaeb69e449` |
| `public/assets/world/tileset.webp` | `38b3ba3719ce3534e1e5ecee1c4ec1aa52fb1bbb16a5a05d66852e11fdb49c33` |
| `public/assets/world/token_frame.webp` | `b3b6db2bf27fd711bb2e7269b88bb32dcca3fd17509d95faf9f91563ea3781f9` |

## Inventory

Sizes below are exact on-disk bytes for every package file other than this self-describing NOTES.md. Package-wide byte totals are reported separately in the PR. PNGs are build/review copies; only WebPs count toward the runtime budget.

| File | Bytes |
|---|---:|
| `atlas/portraits_foes.json` | 935 |
| `atlas/portraits_foes.webp` | 252946 |
| `atlas/portraits_mercs.json` | 620 |
| `atlas/portraits_mercs.webp` | 153094 |
| `atlas/units_foes.json` | 935 |
| `atlas/units_foes.webp` | 344752 |
| `atlas/units_mercs.json` | 620 |
| `atlas/units_mercs.webp` | 206238 |
| `build_package.py` | 12206 |
| `foes/foe_golem.png` | 413013 |
| `foes/foe_golem.webp` | 39706 |
| `foes/foe_juggernaut.png` | 426910 |
| `foes/foe_juggernaut.webp` | 40694 |
| `foes/foe_matriarch.png` | 456286 |
| `foes/foe_matriarch.webp` | 57526 |
| `foes/foe_mycon.png` | 407312 |
| `foes/foe_mycon.webp` | 40806 |
| `foes/foe_riftweaver.png` | 247813 |
| `foes/foe_riftweaver.webp` | 25070 |
| `foes/foe_sentinel.png` | 441502 |
| `foes/foe_sentinel.webp` | 59658 |
| `foes/foe_sprite.png` | 139834 |
| `foes/foe_sprite.webp` | 19132 |
| `foes/foe_stalker.png` | 298267 |
| `foes/foe_stalker.webp` | 37254 |
| `foes/foe_tusker.png` | 356010 |
| `foes/foe_tusker.webp` | 31188 |
| `foes/portrait_foe_golem.png` | 483284 |
| `foes/portrait_foe_golem.webp` | 28864 |
| `foes/portrait_foe_juggernaut.png` | 523699 |
| `foes/portrait_foe_juggernaut.webp` | 35276 |
| `foes/portrait_foe_matriarch.png` | 551988 |
| `foes/portrait_foe_matriarch.webp` | 37074 |
| `foes/portrait_foe_mycon.png` | 480143 |
| `foes/portrait_foe_mycon.webp` | 27584 |
| `foes/portrait_foe_riftweaver.png` | 444298 |
| `foes/portrait_foe_riftweaver.webp` | 21256 |
| `foes/portrait_foe_sentinel.png` | 580828 |
| `foes/portrait_foe_sentinel.webp` | 40724 |
| `foes/portrait_foe_sprite.png` | 486509 |
| `foes/portrait_foe_sprite.webp` | 22574 |
| `foes/portrait_foe_stalker.png` | 488588 |
| `foes/portrait_foe_stalker.webp` | 26740 |
| `foes/portrait_foe_tusker.png` | 453199 |
| `foes/portrait_foe_tusker.webp` | 24416 |
| `mercs/merc_alchemist.png` | 242557 |
| `mercs/merc_alchemist.webp` | 26264 |
| `mercs/merc_archer.png` | 301148 |
| `mercs/merc_archer.webp` | 33658 |
| `mercs/merc_bard.png` | 346038 |
| `mercs/merc_bard.webp` | 42396 |
| `mercs/merc_scout.png` | 262047 |
| `mercs/merc_scout.webp` | 34090 |
| `mercs/merc_spear.png` | 294586 |
| `mercs/merc_spear.webp` | 34876 |
| `mercs/merc_warden.png` | 405115 |
| `mercs/merc_warden.webp` | 38292 |
| `mercs/portrait_merc_alchemist.png` | 469295 |
| `mercs/portrait_merc_alchemist.webp` | 26462 |
| `mercs/portrait_merc_archer.png` | 457652 |
| `mercs/portrait_merc_archer.webp` | 25076 |
| `mercs/portrait_merc_bard.png` | 483998 |
| `mercs/portrait_merc_bard.webp` | 26038 |
| `mercs/portrait_merc_scout.png` | 467854 |
| `mercs/portrait_merc_scout.webp` | 24114 |
| `mercs/portrait_merc_spear.png` | 466526 |
| `mercs/portrait_merc_spear.webp` | 26506 |
| `mercs/portrait_merc_warden.png` | 509719 |
| `mercs/portrait_merc_warden.webp` | 29152 |
| `PROMPTS.md` | 5875 |
| `provenance/manifest.json` | 12853 |
| `provenance/selected-sources.json` | 2390 |
| `provenance/validation.json` | 388 |
| `review/gameplay-160px.png` | 535684 |
| `review/in-arena.png` | 3077452 |
| `review/lineup-foes.png` | 971021 |
| `review/lineup-mercs.png` | 889115 |
| `review/on-map.png` | 683175 |
| `review/portraits-40px.png` | 55563 |
| `review/silhouettes.png` | 83857 |
| `STYLE_CHECK.md` | 4684 |
| `write_notes.py` | 6522 |

## Reproduction

With Pillow installed, run `build_package.py --source-dir <local imagegen output folder>` and then `write_notes.py`. Both scripts only write beneath this package. Raw imagegen generations are not committed; the normalized lossless PNG deliverables are retained for developer recompression. Model-version metadata was not exposed by the built-in image generation tool; no exact model version is asserted.

Ready for Claude Asset Intake Review.
