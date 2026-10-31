# ART-VFX-SONG-SHADOW-002 — R3 song / shadow

29 October 2026 (Asia/Bangkok). Art only. Branch `art/art-vfx-song-shadow-002`, based on game commit `157d6855808edbcf055929cd00f1e0b1dbfea91e` (`feature/fateweave-initial-prototype`). Open PR for owner review; do not merge.

## Provenance and scope

Read AGENTS.md, CLAUDE.md, animation prompt quality guide, W1–W8 plan, unit rollout, existing animation/VFX prompts and project skill `fateweave-codex-art-brief`. Prior song R2 / shadow R1, their notes, manifests and the integration module were read from PR #110 head `e56f4cb5f194302b2fb2a1cd9871da7280911302`. At inspection PR #110 was open and draft; its art is absent from the game base. Reference copies are retained here so packaging is self-contained; no original file was changed. Character references are cells 5 (Lio), 3 (Sefa), 0 (Garran, representative ally) of `public/assets/art/units_mercs.webp`, as mapped by `assets.ts`.

All modifications are inside this package. The owner's folder-only restriction supersedes the shared-doc handoff rule; this file is the Codex-to-Claude handoff. No src/tests/public/workflows, rules, balance, saves, runtime event routing or atlas changed.

Delivered: **21 layers / seven moves**, including the optional finale-mend and finale-dread candidates. Enemy placement reference is frame 4 from the current `units.webp` (the runtime's raider seed). References are review-only, not new game assets.

## Confirmed semantics

- Valor: song at Lio's feet, three nested broad rings; small settle flecks drift toward actual allies. No healing or impact implied.
- Solo: ONE actual ally other than Lio receives the playing song three times. Pool and narrow pillar belong behind that recipient. No damage or healing.
- Evade: low steel-blue smoke/readiness shimmer at Sefa's feet. No hit, shield or successful-dodge claim before the real event.
- Dread: non-damaging song reducing every enemy move. Gather at hand, one broad semicircular status wave toward enemy side, then one small weakness emblem beside each standing enemy's waist. Code repeats the single supplied emblem. No contact flash, slash or single-target beam.
- Finale (valor): one shared launch toward enemy side, compact contact only per real damage recipient. Finale mend heals all allies; finale dread shields all allies. Never use the offensive contact for the latter two variants.

These override the incorrect dread/solo descriptions in package 001. No musical notes, clefs, text, character or UI is baked into any deliverable layer.

## Files, scale and pivots

`song/R3/` and `shadow/R3/`: separate 256×256 straight-alpha PNGs, three beats each, no atlas. `source/`: byte-identical image-generator output, one move per call. `references/`: exact prior beat references and game seed crops. `generation-prompts.json`: exact submitted prompts/settings/reference paths. `layout.json`: reproducible extraction/placement choices. `layers.json`: same `art-vfx-three-beat-v1` schema as 001, with source rectangles, hashes, measured alpha bounds, normalized canvas pivots, anchor and original beat time ranges.

One common proportional scale is used for all beats of each move, preserving the generated relationship. Only crop/resize/padding is applied; no painted effects are drawn by packaging code. All layers have at least 12px transparent outer padding. No background removal or painted checkerboard is used.

Floor pivots mark the center of the illustrated ground-contact ellipse/pool, not its lowest diffuse glow. They are measured on the source and transformed to normalized 256px canvas coordinates. Do not reuse old package pivots after changing art. Follow rendered sole anchors, not fixed formation positions. Non-floor anchors are hand/waist coordinates. Full padded canvas widths are provided; visible paint is about 91% of canvas width: valor 120px canvas ≈109px paint, solo 100px ≈91px, evade 104px ≈95px. These already include R3's intended size: **do not apply the old 1.9/1.6/1.7 multiplier again**.

Normal alpha blending around .7 is the review baseline. Floor art belongs above floor shadows and behind sprites, with at most a thin foreground rim. Solo's column remains behind the ally; do not attach it to Lio. Keep faces and real HP/name/status labels clear. Place dread settle beside the waist and repeat only for standing affected enemies.

Timing ranges are retained verbatim from package 001 for the matching moves. Fit them to existing stageTiming without changing total duration, event timing, fast playback or reduced motion.

## Review evidence and limits

`comparison-100px.png` shows EVERY old/new beat at 100px canvas width on #1a2447, alpha .7. Prior song uses the integrated R2, shadow uses R1; these are the user's previous round, rather than the unused song R1 variant. `storyboard-390.png` is an exactly 390px-wide static placement simulation using 111px game sprite cells, with the floor layers behind sprites. It is not a game screenshot or a motion test. Each row shows one representative recipient; the owner-confirmed actual recipients govern integration.

The individual boards in `review/` retain native 390px width for easier inspection. The two optional variants have no prior variant art: their left comparison uses the previous offensive finale solely as a palette/motif reference, not as a valid prior heal/barrier effect. Review found wider solo bases, brighter/broader low evade wisps, and visible outer valor arcs around the sprite; the central upper valor rings are intentionally occluded by the character. Dread has a rounded broad wave and one waist emblem with no contact burst. The optional shield is a stylized ribbon contour; owner selection remains pending.

Source crops were inspected individually. Dread's generated strip included faint separators in the empty gutters; extraction excludes those separators. Unequal generated panel widths are recorded explicitly in layout.json. The narrowest evade gutters contain only faint diffuse alpha; crops separate those wisps without cutting a bright core. All delivered frames have new clear outer padding.

`validation.json` records every non-manifest file's SHA-256, byte count and PNG decode properties. It excludes itself and SHA256SUMS to avoid recursive hashes; `SHA256SUMS` covers everything except itself, including validation.json. Rebuild with `python incoming/ART-VFX-SONG-SHADOW-002/package.py` (Python 3 + Pillow + DejaVu Sans). Validate hashes from this folder with `sha256sum -c SHA256SUMS`.

Post-push verification fetches the branch with normal git, compares every committed file byte-for-byte and by SHA-256 with the local package, checks validation and SHA256SUMS, and fully decodes all fetched PNGs with Pillow. No GitHub API upload path is used for image delivery.

Repeat verification with `python incoming/ART-VFX-SONG-SHADOW-002/verify.py origin/art/art-vfx-song-shadow-002` after fetching that remote ref. This verifies all committed files, including manifests and scripts, against local bytes; both hash manifests and all layer properties are checked separately. Technical results are reported in the PR, without treating them as visual approval.

**Artwork selection and motion approval remain the owner's decisions. Static readability inspection, technical checks and CI are not approval.** Claude still needs to pack the atlas, route real events, and capture actual 390px normal/fast/reduced-motion clips before owner motion review.
