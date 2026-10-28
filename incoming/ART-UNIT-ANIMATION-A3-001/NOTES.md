# ART-UNIT-ANIMATION-A3-001 — art handoff

28 October 2026 (Asia/Bangkok). Seren (`healer`, Priest, back row) and Hollow Mycon (`foe_mycon`, Spore Hex, energy, back row). Art candidates for owner selection; not runtime assets or motion approval.

## Provenance and boundaries

Read AGENTS.md and CLAUDE.md on base commit `f2a4bab098fb3838ec348a7d2c92b87a69c705b5`. This delivery adds files only inside this directory. No game code, tests, public assets, existing art, packing, normalization, playback or timing changes. The owner's incoming-only instruction supersedes the standing request to edit docs/handoffs; this file is the handoff to Claude. No merge or publication is authorized by this task.

Both seeds are exact, unretouched 512×512 RGBA cells from the currently shipped Fateweave atlases at that commit, decoded from WebP. `src/game/visuals/assets.ts` maps both to frame 3 in two-column atlases: crop `(512,512,1024,1024)`.

- `seeds/seren-seed.png`: `public/assets/art/units.webp`, blob `ee8081a98caa037a5f48195eddbf143b3e343386`. Same brown-haired, green-eyed priest, green/gold laurel, ivory/green/gold robes, green cape, boots, gold staff and square emerald/laurel-star head. Faces right. Source cell contains stray neighboring artwork at its edges and semi-transparent source artifacts; the exact seed is retained, and prompts explicitly exclude those fragments. Its staff ornament reaches the top edge and boots approach the bottom edge.
- `seeds/hollow-mycon-seed.png`: `public/assets/art/units_foes.webp`, blob `885a4f9fe375de1f43deaf9271ee4a59cbd0cf08`. Teal spotted cap, cream gills, moss trim, cyan eyes on dark face, layered robes, root boots, crooked orb staff. Faces left. Painted alpha>40 rise is approximately y37–496; delivered sole origin is 497/512. This is NOT the separate Spore Puff from units_foes2.

All new artwork was generated as original edits of these Fateweave seeds. Nothing was read or imported from Asterveil: Rise Beyond. Each PNG in `raw/` is one original, unmodified, whole-strip ImageGen output from one edit request per move/version. No per-frame generation, copied pose assembly, recoloring, rescaling, alpha cleanup, seed lockback or post-generation compositing was applied to raw strips. Each output is 2172×724 RGBA with real alpha transparency. Exact submitted prompts, original output paths and retained output paths are in `generation.json`; briefs are also in `prompts.json`. File hashes and preview measurements are in `validation.json`.

## Frame order

Every raw file contains one horizontal row, read LEFT TO RIGHT. Numbering below is observed pose order, not uniform grid extraction coordinates. Action strips have six figures; reactions have four.

| Raw strip | Left-to-right frame order |
| --- | --- |
| `seren-attack-r1.png` | 1 ready; 2 raise/draw staff back; 3 loaded windup; 4 forward-right staff strike/contact; 5 extended follow-through; 6 recover |
| `seren-attack-r2.png` | 1 ready; 2 draw staff diagonally back; 3 raised windup; 4 downward-forward strike/contact; 5 low follow-through; 6 recover |
| `seren-heal-r1.png` | 1 ready; 2 gather staff at chest; 3 raise toward right-side ally; 4 staff/hand release toward ally; 5 hold follow-through; 6 recover. Body set for heal/revive/bless. |
| `seren-prayer-r1.png` | 1 ready; 2 both hands grip staff; 3 upright prayer with eyes closed; 4 begin upward release; 5 highest two-handed extension/follow-through; 6 recover. Body set for prayer/halo. |
| `seren-sanctuary-r1.png` | 1 ready; 2 two-handed grip; 3 reach staff forward; 4 plant staff forward/contact; 5 brace planted staff; 6 recover |
| `seren-hit-r1.png` | 1 ready; 2 backward flinch; 3 bent-knee recoil; 4 recover |
| `seren-block-r1.png` | 1 ready; 2 bring staff diagonally across torso; 3 brace behind staff; 4 recover |
| `seren-down-r1.png` | 1 buckle; 2 kneel; 3 descend with hand on ground; 4 collapsed, eyes closed, staff beside body. No recovery. |
| `hollow-mycon-cast-r1.png` | 1 ready; 2 crouch/gather; 3 gather with subtle cap lift; 4 release hand toward left; 5 settle/follow-through; 6 ready |
| `hollow-mycon-cast-r2.png` | 1 ready; 2 crouch/compress cap; 3 visibly domed/swollen cap; 4 contract cap/release gesture; 5 relax; 6 ready |
| `hollow-mycon-hit-r1.png` | 1 ready; 2 flinch/cap compresses; 3 low recoil; 4 recover |
| `hollow-mycon-down-r1.png` | 1 buckle/cap dips; 2 kneel; 3 descend beneath cap; 4 collapsed beneath intact cap, staff lowered beside body. No recovery. |

## Owner choices and uncertainties

- **Staff attack:** R1 is a horizontal thrust/swing. R2 is a downward-forward strike. Both are provided because “staff strike” does not specify the arc. R1's broad reach crowds adjacent silhouettes; R2 keeps a lower arc but its staff still crosses the nominal cell boundary. Neither should be blindly sliced into equal cells. R2 is the preferred motion candidate, pending owner choice.
- **Mycon cast:** R1 has excessive local spore haze and only subtle cap swelling. R2 makes the cap swell clearly and removes most haze; prefer R2 for the requested body set. R2's forward release direction is less pronounced than R1, so the owner should select the desired tradeoff. No new projectile should be derived from either PNG.
- **Raw layout defects:** generation did not honor the requested wide gutters. Several outer silhouettes approach/touch canvas edges, neighboring staff/cape silhouettes crowd or cross nominal equal-width boundaries, and some staff tips are close to the edge. Small red/yellow fringes occur on Seren; green fringes around Mycon's orb/droplets. These are generated edge contamination, not intended VFX. Do not treat these candidates as cleaned, integration-ready frames. Claude may need masking/edge cleanup or a further art revision after selection. Preserve these raw originals.
- **Identity and sole consistency:** face, costume, staff and facing remain recognizable, but generated ornament geometry, folds and proportions vary slightly. The generated first/last ready poses are redraws, not pixel-identical seed lockbacks. Upright poses broadly share a ground line; precise sole positions and scale still need measurement and normalization. Falling poses lower their silhouettes. No claim of pixel-identical identity, soles or frame registration is made for these raw outputs.
- **Prayer timing:** the observed highest extension is figure 5, although the prompt requested release at figure 4. Claude should map the selected release pose to the existing stage timing, without assuming the prompt's numbering was followed exactly.
- **Healing effects:** Seren contains only small local staff/hand glints plus the seed's emerald coloration. No painted halo, floor seal, sanctuary barrier or large healing light is supplied. Use the existing healing VFX during integration. Mycon's source orb/droplet decoration remains part of its body identity; R1 haze is not a requested new VFX asset.

## 390px review and checks

`preview/*-390.png` are static 390px-wide art contact sheets, two source windows per row; the two `*-all-390.png` files collect the same sheets per identity. `build_preview.py` regenerates them using Pillow. These are NOT screenshots or in-engine motion tests.

The nominal scale uses a 115px seed box: `floor(390 × .295)`, the unit width cap in `src/game/visuals/field-layout.ts`. The actual arena height can reduce the runtime box. Seren's ready figure is shown approximately 115px high; Mycon approximately 103px high, matching its seed rise of 460/512. ONE uniform scale is used for the entire raw strip; individual poses are not resized or aligned. Equal-width source windows are review crops only: they can visibly cut an overreaching staff/cape and must NOT be used as production frame boundaries. The raw PNG remains the authoritative full strip.

Checks completed: 12 PNGs decode as RGBA with alpha 0–255; expected six/four figure counts and left-to-right order visually reviewed; seed sources/frame mapping inspected; original output bytes retained unchanged; hashes recorded; 390px prayer and Mycon R2 previews inspected; all added paths confined to this directory; whitespace checked. No gameplay tests were run for this art-only delivery. Owner selection, cleanup/normalization, packing, runtime mapping, real 390px motion clips and motion approval remain with Claude/owner.
