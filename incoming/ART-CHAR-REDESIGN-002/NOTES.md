# ART-CHAR-REDESIGN-002 — Isolde ready/rest seed

Fix of PR #118, artwork only. Isolde is now grounded on two level soles, with a cast-sized head and a near-upright bell staff. Her figure is sized first; the staff fits beside it. This is the intended rest/return seed for later A7-003 animation, not an animation delivery.

## Scope and approved copies

Only Isolde's static unit is redrawn. `unit/odran.png`, `portrait/odran.png`, `weapon/odran.png`, `portrait/isolde.png` and `weapon/isolde.png` are byte-for-byte copies from PR #118 commit `426fbf273330b8e704a247bce154e22ba3f77cf8`. Their expected SHA-256 and byte counts are recorded in `provenance/approved-copies.json` and asserted on every package run. Odran's owner/Claude approval is carried forward as instructed; it is not a new approval of Isolde.

The staff retains the dark shaft, brass fittings/cap, bell cluster and short attached cream streamers. Its upper length/hold is adjusted for the ready pose; its design remains the same, so the existing weapon icon and portrait are retained. No gear/portrait atlases are exported, as requested. These copies remain available for Claude's integration alongside the previous package.

## Anatomy and alpha

- Hair top y37; chin contour y194; head height 158px (inclusive rows).
- Hair top to sole: 460px. Head/body ratio: 0.343478.
- Both soles contact y496, confirmed by alpha>=40 scans in separate foot ROIs; 15 left-foot and 17 right-foot pixels contact that row.
- Unit 512×512 RGBA, alpha bounds `[94,37,418,497)`; pivot `(0.5,497/512)`, full staff within frame, no baked shadow.
- Chin is a manually reviewed visual landmark, approximately ±2px; the hair top and foot rows are checked from alpha. `landmarks.json` preserves the measurement inputs, and `review/anatomy-512.png` makes them reviewable. Even that manual uncertainty stays inside all requested anatomy ranges.
- The ImageGen previews display RGB color behind transparent areas. Actual alpha was checked by compositing on a contrasting solid background; it contains real transparent exterior, not a painted scene. Batch 1 alpha cleanup removes values below four before normalization. Raw generator files remain untouched.

## Must-not review

- [x] Both feet grounded, weight balanced, right-facing; no spin, single-foot or airborne pose.
- [x] Same short silver-streaked dark hair, face, ochre half-cape, navy wrapped top, fitted cream legs and wrapped boots.
- [x] No fans, orbiting ribbons, ruffled skirt, harem trousers, braid, crescent/leaf ornament, purple/lilac/coral/teal main palette, text or checkerboard.
- [x] Short streamers remain attached to the bell cluster; no VFX or floor shadow.
- [x] Original ImageGen artwork; no assets imported from another game.

## Rebuild and verification

Run `python incoming/ART-CHAR-REDESIGN-002/package.py --base origin/feature/fateweave-initial-prototype` after fetching the base. Python uses the Batch 1 component isolation, mask dilation, alpha cleanup, proportional crop/scale/translation only; it does not repaint or separately resize the head/body. Base commit and hashes are recorded in `validation.json`.

The lossless units atlas replaces only frames 7 (approved Odran) and 9 (new Isolde). Every other cell and every untouched RGBA pixel, including transparent pixels, is asserted identical to base. The output is asserted no larger than the base atlas. At base `e5e6b074f7c42e790e8bec097857028d30b4192a`, output is 2,481,852 bytes versus base 2,510,564 bytes; eight other frames pass exact equality.

The JSON provenance contains only generation IDs, prompts, settings, reference paths and expected copy hashes, never base64 image data. `validation.json` hashes every other package file and records bytes; it excludes itself to avoid a recursive hash. After normal Git push and fetch, run `verify_remote.py` against the fetched branch to verify hashes, sizes, approved copies and Pillow decoding.

## Review and handoff to Claude

`review/lineup.png` shows Corin, unchanged Odran, Cerise and Isolde in 115px cells on the actual forest background and as black silhouettes. Cyan/pink horizontal guides use manually reviewed Cerise hair-top/chin rows on the current base; those guide landmarks are approximate ±2px, independent of the new Isolde acceptance measurements. `native-sizes.png` checks the 115px unit beside the unchanged 40px portrait. These are art QA compositions, not gameplay captures.

Owner visual approval of the new Isolde is still required. CI, measurements and hash checks are not approval. Do not merge or integrate this art PR. Claude should review the anatomical landmarks, then show the owner the ready pose before integrating it and preparing the later animation set. No rules/save/content/balance/timing/runtime changes are included. Handoff notes stay inside this package to respect the user's exclusive incoming-folder scope.
