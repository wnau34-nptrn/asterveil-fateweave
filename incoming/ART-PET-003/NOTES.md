# ART-PET-003 — pet hatch, map walks and camp den

## Owner review

- [preview_390.png](preview_390.png) shows both hatch families, four walk phases at 48 px on actual world tiles, the two den states on the camp art and the optional blessings at 24 px.
- [motion_390.webp](motion_390.webp) loops both hatch samples and all six walks. The hatch sample uses 1.4 s for three growing rattles, 0.3 s for staged cracks and 0.3 s for the burst, followed by the existing fox happy pose as a sample reveal. The review walks run at 10 fps.
- Owner choice and motion approval are pending. The production filename `egg.webp` provisionally maps to R1 because the occupied den brief specifies a gold speckled egg. R2 is a complete alternate with identical frame names and positions in `egg_r2.webp`. The occupied den holds R1 in both review paths.

## Art and placement

| Element | Palette and motion |
| --- | --- |
| R1 choice egg | Warm amber and butter highlights, toasted ochre shade, mint and lilac speckles, and a thin champagne thread lattice. Burgundy-brown fracture lines, amber burst. |
| R2 choice egg | Ivory and honey cream, dusty teal threads and one gold star stamped into the shell. Deep teal fracture lines, mint burst. |
| Meadow fox | Approved cream and ochre fur with green leaf ears. Alternating diagonal steps and a small puff-tail bounce. |
| Thicket piglet | Approved clay and cream under a saturated moss saddle. Short diagonal steps with a slight spring in the leaves. |
| Rift crystal moth | Approved ivory body and angular lilac/crystal wings. Counter-rotating wing sweeps over a virtual y=240 baseline. |
| Fort gargoyle pup | Approved slate stone, moss and champagne chest. Weighty diagonal steps with a restrained wing bounce. |
| Forest lantern owl | Approved teal and cream feathers and amber lantern. Alternating waddle with a side-to-side lantern swing. |
| Gate starveil slime | Approved navy body, lilac veil and pale mint core. Contact squash, takeoff stretch, apex and landing stretch around a fixed x=128. |
| Camp den | Honey willow weave, deep blue-green cushion, teal ribbon and smoke-bronze unlit lantern. The occupied frame overlays a smaller copy of R1 on the cushion. |
| Blessings | Mint clover, amber acorn, teal eye, navy shield with cream paw, amber lantern and emerald leaf, in blessing order. |

## Atlas intake

- `egg.webp` and `egg_r2.webp` are 1792×512. Row 1 contains seven 256 px poses. Row 2 starts with six 128 px shards, then three 256 px burst beats. The hatch pivot is (128, 240) and the two wobble poses are ±8°. Fragment pivots are cell centers (64, 64). Burst sprites share the egg's 256 px logical canvas and overlay the hatch.
- `pets_walk.webp` is 1024×1536, four 256 px columns in A → B → C → D → A order. It follows ART-PET-002 row order and preserves the approved facing and local x=128, y=240 placement. The body can rise within the cell during moth flight and slime hops. Mirror the right-facing art for left movement.
- `pet_den.webp` is 512×256 with empty then egg-waiting. Both use the same basket and (128, 240) anchor. The pet is a separate overlay.
- `pet_blessing_icons.webp` is 768×128, six 128 px cells. Center the icons at (64, 64).
- `prop_seeds.webp` holds normalized original ImageGen props with coverage cleanup. The walk uses `idle_a` pixels from the approved ART-PET-002 atlas and continuous local deformations, with one reproducible four-phase cycle per pet. Crack stages and shards re-use the same shell pixels to preserve markings. `prompts.json` records the generation prompts and animation brief.

Run `python incoming/ART-PET-003/assemble.py` from the base checkout to rebuild with the included prop seeds and repository references. The reference build used Pillow 12.3.0 and NumPy 2.3.5. Run the same script with `--verify` to compare file hashes and decode every image and browser review frame with Pillow. Bitmap dimensions, transparent corners and alpha extrema are in `validation.json`. Its own bytes are checked independently across checkouts.

The 390 px review uses static placements and sample playback. Owner visual acceptance is still required for the egg choice and motion.
