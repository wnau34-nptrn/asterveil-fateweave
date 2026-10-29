# ART-UI-LOBBY-001

Delivery from base `1adcd386da89d5612679408dd2a42df74bb50206` on `art/art-ui-lobby-001`. Original illustrations generated with the built-in image_gen tool on 2026-10-15, using only this repository's masters. No named third-party artist, studio or game imitation. No outside repository assets.

## Runtime and files

Runtime total: **1,200,288 bytes** / 1,600,000 bytes (decimal MB). Only five WebPs are runtime: three scene layers and the hero and mercenary atlases. PNGs, raw generations, scripts, metadata and reviews are reference/build materials only. See `provenance/validation.json` for every image's dimensions, mode and byte count. All exports embed sRGB.

Scene background: 2400x1000 RGB; foreground: 2400x1000 RGBA with nonzero alpha confined to y=880..999; firepit: 256x256 RGBA, bottom-centre anchor, no flame. Central x=400..1999 is the safe region. Outer scenery is expendable. The background has no actors or fire. Blank hire board; pictorial banner flourishes are decorative, not letters. Flames are review-only placeholders.

Hero atlas: 1536x2048; mercenary atlas: 1536x3072. Both use 512px square cells, three columns sit / cheer / idle_alt. Hero rows guardian, tracer, weaver, healer. Mercenary rows merc_spear, merc_archer, merc_alchemist, merc_scout, merc_warden, merc_bard. JSON coordinates are atlas-local; footY and seatY are frame-local (0-based). All soles end at y=496; the last alpha scanline is 496, exclusive bound 497. Seated poses include their log; seatY records the body/log contact, which varies anatomically while soles share the baseline. Keep the whole frame when sampling.

## Mercenary approval

All six masters were approved before work: `docs/validation/art-char-merc-enemy-001/INTAKE.md`, status ACCEPTED_WITH_TECH_FIX, source PR #4. All eighteen mercenary poses are therefore included. The recorded tech fixes concern encoding and an enemy's direction, not rejection of these mercenary masters.

## Facing and review placement

Every stored pose faces RIGHT. No writing, one-sided lettering or logos. Mirror review pairs show each stored frame followed by its horizontal reflection. Weapons changing hands are expected. Phone and desktop use x=18%,33%,67%,82% from `src/ui/lobby-ui.ts`; both right-hand actors are mirrored. Four poses: guardian sit, tracer sit, weaver cheer, healer idle_alt. The scene uses the real scene band and 21vh actor frame sizing from `world.css`; back scale .92 and front 1.0. The 0.75 back scale remains available for the additional slots. Mock outlines follow the supplied lobby validation captures: header, scene, tabs, roster/reserve and footer boundaries, without text or painted UI. These are static review compositions, not integrated application screenshots. The desktop band naturally crops more of the tall source backdrop; preserve ground anchoring in integration.

`poses-lineup.png`: original master at left, then sit / cheer / idle_alt at identical 224px frame scale. `silhouettes.png`: each hero silhouette itself is exactly 90px tall. `mirror-check.png` and `mercs-mirror-check.png` check all thirty poses both ways. `lobby-phone.png` and `lobby-desktop.png` are exact viewport dimensions and sample decoded runtime files.

## Production and limits

Source PNGs are preserved under `provenance/generated/`. `PROMPTS.md` records the prompt set. `build_package.py` performs atlas cutting, connected-component isolation, size/sole normalization, alpha export, encoding and deterministic mock compositing; no existing image is overwritten. Run it with Python + Pillow, then `finalize.py` for assertions and this report.

WebPs use quality 70, method 4. To keep BOTH pose atlases within budget, pose RGB detail is filtered through a 384px-per-cell grid then restored to the exact 512px canvas; alpha stays on the 512px grid with sixteen coverage levels and faint fringe removal. Lossless PNG copies retain normalized source detail. Runtime review uses actual decoded WebP. Fine trim is softer than PNG at full zoom; identity, silhouettes and equipment remain readable at 90–200px. Generation is raster artwork and can vary in tiny costume filigree; subjective final acceptance remains Claude's Asset Intake Review. Healing/book light is intentional local magic, not a background halo. No floor shadows are baked into poses.

## Validation

Exact dimensions, alpha modes, foreground height, 30 JSON entries, sole endpoints, >=8px frame padding, sRGB profiles and runtime budget asserted in `finalize.py`. Protected master/world SHA-256 hashes were compared against the fetched base and are unchanged. No runtime code or tests were changed; application tests are outside this image-only delivery.

## Protected original SHA-256

| File | SHA-256 |
|---|---|
| `public/assets/world/boss_pedestal.webp` | `2c75527fc94517e2856a564a0957679f348bba578ccb4cf5f7c8204ec60d2f7d` |
| `public/assets/world/chests.webp` | `f79a477776c14ea82f5055bbf3d0bc3a623b46e2a5a67a693f2558e920ff460b` |
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
| `public/assets/world/items.webp` | `85af39c29b48faccb2f4bc2bd03d021da9a8dc8862cf01912e038839e0705138` |
| `public/assets/world/landmark_boss_cleared.webp` | `a7dc00358c691afc2dd071bb62ce35728d1e17bb94347bab6f1d75c02a74bbe5` |
| `public/assets/world/landmark_camp.webp` | `d7cb524e2e81d2c760b129bf373ddeee42b7840f76e7ae25f4097ae49f6a1699` |
| `public/assets/world/landmark_gate.webp` | `1988cb4815adcd459bdd65cfa2d92fe9cc03b764ab91bd1533f99ed1d10d2560` |
| `public/assets/world/landmark_gate_open.webp` | `676d3aedf958e71b1fe913aba5391a71d200d048ba6a8ecf80d5f0bf38a84f39` |
| `public/assets/world/landmark_start.webp` | `8cd01dd4f0d28b7316d7a2ca977f632e4805d8903470ca319132f09affd030fd` |
| `public/assets/world/step_dust.webp` | `93e9edca60a88ad78b29d0c72ef15edf18134ee338fad6aa04f4579551034267` |
| `public/assets/world/step_hint.webp` | `9be5794c2e4982dcd5d0efc4be7553b65cf41b262ea6f8ae9d96becaeb69e449` |
| `public/assets/world/tileset.webp` | `38b3ba3719ce3534e1e5ecee1c4ec1aa52fb1bbb16a5a05d66852e11fdb49c33` |
| `public/assets/world/token_frame.webp` | `b3b6db2bf27fd711bb2e7269b88bb32dcca3fd17509d95faf9f91563ea3781f9` |
| `public/assets/art/units.webp` | `d205b57d8a4082290a3a2e5a415407245106f948033cf3c66eb7b8e537393629` |
| `public/assets/art/portraits.webp` | `f604b5f93c6526130546e194674d37f4e3265083908bbbb3448affadf4b70496` |
| `public/assets/title/title_bg.webp` | `f63ad252a1ccd4a5c67a896f70a6b9a0dbd847e011b5cb801e74bf958e94b556` |
| `public/assets/art/units_mercs.webp` | `f56977d16167593da97b41417239ef1db4fd2d790301b230c62b8ffbb1825e54` |
