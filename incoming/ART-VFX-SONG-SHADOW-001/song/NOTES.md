# ART-VFX-SONG-SHADOW-001 — song / Lio, Bard

2026-10-28 (Asia/Bangkok). Art-only handoff on `art/art-vfx-song-shadow-001`, based on `feature/fateweave-initial-prototype`. Open PR for review; do not merge. R1 and R2 are both supplied, with R2 recommended for its clearer silhouette at 390px. This is a recommendation, not owner artwork or motion approval.

## Deliverables

- `R1/`, `R2/`: 15 separate transparent 256×256 RGBA PNG layers each: five moves × prepare / peak / settle. Straight alpha, minimum 8px transparent outer padding, no atlas, characters, labels or UI baked into the effect layers.
- `storyboard-R1-390.png`, `storyboard-R2-390.png`: exactly 390×1286. Three beats per move, neutral caster/target anchor diagrams and sample HP text. These are art placement boards, not screenshots or animation tests.
- `source/R1.png`, `source/R2.png`: byte-identical original generated sheets, 972×1619 and 971×1620 respectively. `source/R2-draft.png` (971×1619) is archived generation provenance only: its valor peak was missing and was corrected by image generation in the final R2 sheet. Never extract from the draft.
- `generation-prompts.json`: exact prompts, transparent-background setting, original generated paths and edit reference. `layers.json`: source sizes/crop rectangles, source and output SHA-256, alpha bounds, actual floor anchor source pixels, normalized pivots, suggested canvas widths and beat ranges.
- `package.py`: reproducible mechanical crop, proportional resize and transparent padding, plus diagram boards and manifests for both `song/` and `../shadow/`. Requires Python, Pillow and `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`. Run from repository root: `python incoming/ART-VFX-SONG-SHADOW-001/song/package.py`.
- `SHA256SUMS`: all files in this family except itself. Verify from this folder with `sha256sum -c SHA256SUMS`. After modifying/rebuilding anything, regenerate this manifest before committing.

R1 has softer curved ribbons, drifting flecks and airy warm paint. R2 has firmer ivory edges and angular ribbon/shard silhouettes. Coral/warm gold is the shared song palette; Dread uses dark violet with coral accents. All art is original image-generated work for this brief. Abstract ribbon, shard and zigzag forms are invented; no clefs, staff lines, score excerpts or conventional notation are used. No external images or score references were supplied. The decoy in the sibling package is an original faceless illusion, not copied character art.

Reference: `incoming/ART-VFX-ARCANE-SEAL-001/NOTES.md` on `art/art-vfx-arcane-seal-001`, read through the GitHub connector because the reference was not on this base snapshot. Its three-beat/layer/source/storyboard/manifest format was followed. Existing art was read only; no reference painting was copied into these files.

## Anchors and timing

These times are **art-direction suggestions**, not gameplay changes. Fit the three beats within the current presentation stages, preserving the existing total duration, real contact instant, fast playback and reduced-motion behavior. Do not add hits, damage, statuses or turns. Widths are the entire padded 256px canvas at a 390px game width; visible paint is smaller. Scale proportionally for other widths. Use rendered pose anchors, never fixed formation coordinates.

| Move | Prepare | Travel / peak | Settle |
| --- | --- | --- | --- |
| `valor` — self song / team buff | 0–120ms, Lio's feet, 58px. Warm ring seed. | 120–280ms, Lio's feet, 76px. Three rising rings, kept below shoulders. | 280–480ms, ally feet, 34px. Drift small flecks from Lio toward each actual buff recipient. No impact flash. |
| `finale` — closing damage wave | 0–140ms, Lio's hand, 42px. Gather ribbons. | 140–300ms, hand → enemy side, 98px. Release **one shared wave**, not a separate travelling wave per foe. Orient from caster toward real enemy side. | 300–520ms, affected foe lower torso, 42px. Exactly one compact contact per actually affected foe at its real damage event. |
| `dread` — one foe, damage + fear-like debuff | 0–120ms, Lio's hand, 38px. Gather discord. | 120–260ms, hand → one target lower torso, 78px. One violet-coral broken wave and one contact at the existing event. | 260–460ms, beside that target's waist, 24px. Small tremor mark only if debuff applies; no repeated damage flash or indefinite loop. |
| `note` — one sharp hit | 0–90ms, Lio's hand, 32px. Bright shard seed. | 90–200ms, hand → one target lower torso, 74px. One note-blade, right-facing source art. Mirror as necessary for actual travel direction. | 200–340ms, same target lower torso, 34px. One small contact. Decorative tail never implies extra hits. |
| `solo` — self, no damage | 0–100ms, Lio's feet, 56px. Gentle pool. | 100–220ms, Lio's feet, 48px. Brief narrow spotlight column; keep below face and render broad light behind him. | 220–380ms, Lio's feet, 44px. Pool fades completely; no target flash, ally buff or healing implied. |

Hand means the current rendered release point. Lower torso/waist means below the face, not geometric sprite centre. Feet means rendered sole contact, including pose/recoil offsets. Floor pivots are mapped from inspected paint anchors in the original sources, not the lower edge of their broad glow. Other pivots are `[0.5, 0.5]`. Full per-file values are in `layers.json`.

The board uses `C` and `T`: T is a buff recipient for Valor, an enemy for offensive moves, and an idle comparison figure for Solo. It shows only one representative recipient; this is not a claim about party size or the number of affected foes. Per-actor contact copies belong to actual event routing.

## Readability and handoff to Claude

Never cover Lio's, a target's or a neighboring actor's face or any real HP/name/status label. The review boards apply explicit face/label masks, while supplied effect PNGs retain their original alpha. The runtime integration must apply actual sprite/label masks and inspect all formation slots; the flat art cannot guarantee clearance in arbitrary poses. Move the effect or mask paint, never move a face or label to accommodate it. Rings/pools use rear paint behind the actor and only a thin foreground floor rim. Keep Solo's column behind Lio. Place Dread's mark beside the waist, not above the head.

Normal alpha blending is the baseline. Avoid broad additive stacking that washes out coral or labels. Valor is an ally-status cue, not healing; Solo has no damage; Finale gets one shared launch and one actual contact per affected foe. Show Dread's tremor only when that status applies. Missing/downed actors and absent statuses must not receive fabricated outcomes.

Claude integrates atlas/module and actual-event routing later, preserving runtime rules, save format, content, balance and presentation duration. Supply real 390px motion clips including fast and reduced motion for owner review. This package supplies neither runtime integration nor motion approval.

## Validation and scope

Packaging verifies all 30 song and six shadow outputs are 256×256 RGBA, nonempty, with at least 8px transparent gutters. Both song boards and the shadow board were inspected at 390px. Source/output hashes, source rectangles and placement data are recorded. `git diff --check`, folder-only change checks and post-push SHA-256 comparison against freshly fetched Git blobs are part of delivery verification. No gameplay/browser tests are claimed or needed for this art-only intake.

`AGENTS.md` and `CLAUDE.md` were read first. The user's more specific folder restriction takes precedence over the general shared-docs handoff instruction: this file and the sibling shadow note carry the Codex-to-Claude handoff. Only additions under `incoming/ART-VFX-SONG-SHADOW-001/song/` and `shadow/` are permitted. No src, tests, public, workflows, shared handoffs or existing art changed. No merge or publication is authorized in this task. Remaining: artwork selection, Claude integration and actual-motion review.
