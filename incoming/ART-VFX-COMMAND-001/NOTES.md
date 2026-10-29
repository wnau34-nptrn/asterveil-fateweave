# ART-VFX-COMMAND-001 — R1 / R2

Original painted command VFX proposals for Asterveil: Fateweave, generated with OpenAI ImageGen on 2026-10-28 (Asia/Bangkok). Base: `feature/fateweave-initial-prototype`, commit `8616ad3155a179e05210fe6aa552e6d234c9bd24`. Branch: `art/art-vfx-command-001`. Artwork selection and actual runtime motion review remain pending. Open PR only; do not merge this delivery.

## Delivery

- `R1/layers/`, `R2/layers/`: 12 independent 256×256 straight RGBA PNGs per revision, 24 total. Four layers per move: prepare, two independent peak components, settle. Both peak components belong to the same beat, not a fourth animation beat.
- `R1/layer-sheet.png`, `R2/layer-sheet.png`: transparent 1024×768 sheets; rows Taunt / Challenge / War Cry; columns prepare / peak main / peak detail / settle. `layers-390.png` provides annotated dark-background layer contact sheets.
- `storyboards/R1-390.png`, `R2-390.png`: all three moves at exactly 390px width. Individual `<revision>-<move>-390.png` files are easier to review: Taunt/Challenge 390×844; War Cry 390×1086 with a separate later-counter example below the three cast beats.
- `source/`: untouched 1536×1024 generator originals, including the initial R1 and its layout refinement. Raw sheets are source material; use the extracted layers for integration.
- `generation-prompts.json`: exact prompts, source relationship and output paths. No outside artwork or sibling repository assets used to generate the effects.
- `layers.json`: source SHA-256 values, per-layer SHA-256, source crop rectangles, packing transforms, alpha bounds, anchors, pixel/normalized pivots, orientation, route and suggested timing; storyboard hashes and sizes included.
- `SHA256SUMS`: all delivery files except itself and an optional post-push report. `package.py` deterministically rebuilds packaging and boards with Pillow; it crops/resamples/composites only, and does not paint VFX or recolor generated pixels.

The requested `incoming/ART-VFX-ARCANE-SEAL-001/` reference folder does not exist at this base commit. Its copy-ready brief is in `docs/design/ANIMATION_VFX_COMPLETION_PLAN_TH.md` §5. This delivery follows that three-beat transparent-layer format and the existing alchemy/defense packaging conventions. Inspected `public/assets/fx/defense_fx.webp` for texture and palette compatibility. Amber `#d7b06d`, ivory `#fff0cb`, teal `#7ccfc8`, stone `#78858c` are prompt palette references; the paintings retain their natural color variation.

## R1 versus R2

| Move | R1 | R2 |
| --- | --- | --- |
| Taunt | Rough, chipped amber crescent and granular stone motes | Denser stone slabs, stronger single pressure edge |
| Challenge | Angular, sharp ivory crest and fine gold filament | Slimmer double gold rim and quieter ivory centre |
| War Cry | Broad, energetic breath cone and scattered impact brushwork | Cleaner separated pressure ribs, directional torn splash |

All three use upper-body / forward space. No low-leg auras, ground ellipses or floor rings. Taunt's crescent must remain upright: preserve its aspect ratio; do not squash it into a floor oval. The shield contains no heraldic device; stone marks are invented abstract facets. There are no letters, numbers, religious signs or real-world emblems in any VFX layer. Text on contact sheets/storyboards is review annotation only.

## Anchors, pivots and suggested timing

Coordinates in `layers.json` are top-left texture pixels and normalized values. Centre pivot is `(128,128)` / `(0.5,0.5)`. War Cry cone uses `(35,128)` / `(0.13671875,0.5)` so its left emission edge attaches to the forward chest. Challenge thread uses `(24,128)` / `(0.09375,0.5)` after its orientation correction. R1 thread was painted facing left: **flip X before placement**. R2 already points right. The metadata records this explicitly. Mirror the entire directional placement for a caster on the right.

| Move | Prepare | Peak | Settle |
| --- | --- | --- | --- |
| Taunt | 0–140ms; small pressure mark at Brann's chest | 140–320ms; pulse rolls from chest into open enemy-side corridor; motes trail separately | 320–520ms; small chest mark fades on Brann |
| Challenge | 0–100ms; glint immediately ahead of Aegis's shield | 100–220ms; crest flashes at shield front; thin line points to the actual selected foe | 220–420ms; small crest sits just above the shield rim, below face |
| War Cry | 0–120ms; compressed breath at Garran's forward chest | 120–280ms; open cone extends toward foe side as a command cue | 280–460ms; sparse wisps fade; no enemy impacts on cast |

These are suggested art timings, not changes to battle playback. Claude should map them into existing prepare/contact/recover phases. Suggested full texture display sizes in a 390px frame: prepare 48–60px; Taunt pulse 80–96px square / motes 50–70px; Challenge crest 52–64px, thread 120–170px wide and 18–26px high, settle crest 24–32px; War Cry cone 110–130px wide, impacts 40–56px square, settle wisps 50–65px wide. Display sizes include transparent padding; allow the wide directional layers to span open air, not faces.

Never attach to the 256-square texture edge or a generic screen centre. Use the rendered chest, shield front, shield rim and actual resolved foe body anchor. Keep effects below the face silhouette; clamp them above HP/status panels. Shrink or move the cue into the corridor when space is tight. Keep crest/mark away from eyes and hair. Draw normal alpha, modest opacity; additive bloom is optional and must pass the same face/HP constraints. Reduced motion: hold a quiet peak briefly and fade without translation, keeping actual counter impacts event-driven.

## Actual targets — integration must preserve this

Read-only inspection of `src/content/encounters/veil-siege.ts` and `src/core/battle/engine.ts` at the pinned base:

- **Taunt** (`engine.ts:1104`): self stance on Brann; emits a self-targeted `taunt` event. The pulse conveys enemy attention, never damage. No foe impact flash belongs to this move. Brief mark is on Brann.
- **Challenge** (`engine.ts:1052`): the visible cast originates on Aegis, but the command selects **one enemy**. The resolver stores `enemyId` and emits `taunt` targeting that foe. Route the filament to that actual `targetId`; never fan it out or aim it at all enemies. The settle crest stays with Aegis's shield.
- **War Cry** (`engine.ts:937–939`): a **self-targeted buff**, not an immediate area attack. It records living front-lane ally IDs. No enemy is hit by the cast. The encounter definition provides power/cooldown, not a cast target list.
- **War Cry later counters** (`engine.ts:488–491`): each recorded ally consumes its eligibility on a physical hit while Garran lives; only if that ally and attacker survive does `strikeBack` hit that attacker with `War cry counter.`. Use `warcry_peak-impact.png` once per **actual counter target**, when that resolved event occurs. Do not infer recipients from all living foes, all front-row enemies, or the cast cone. Counter source is the struck ally; do not draw a fresh cone from Garran for every counter.

The War Cry storyboard therefore separates its three cast beats from a later single-counter example. It intentionally shows no immediate impacts over the whole enemy side. If a future resolver legitimately reports multiple affected foes, instantiate one compact impact per reported foe. Nothing here requests rule, balance, encounter or save changes.

## Storyboard and validation limits

Boards are illustrative art compositions, not screenshots or clips of runtime playback. They use existing target-repository unit sprites for scale/context only; those sprites are not part of the newly authored layer assets. All panels are exactly 390px wide. The three reference foes are illustrative instances, not a fabricated result of a real encounter. No HP/damage values are asserted.

`storyboards/anchors.json` lists composition anchors and protected rectangles. A board-only mask guarantees zero VFX alpha over those face/HP rectangles; the delivered PNG layers remain intact. Future integration must use actual moving actor bounds and repeat this check in real 390px clips. Masking here does not establish in-game approval.

Packaging validation: 24 nonempty RGBA layers, 256×256 each, transparent border, unique bytes, hash/pivot/source checks; eight 390px storyboard PNGs; deterministic rebuild; `git diff --check`; scope restricted to this folder. Gameplay files are unchanged. Post-push verification must fetch the branch with normal git and compute SHA-256 from the fetched Git blobs against `SHA256SUMS`, not rely on Git's SHA-1 object IDs.

## Handoff to Claude

2026-10-28 (Asia/Bangkok). Art only, R1/R2 pending owner selection. Integrator chooses the selected revision, packs its layers, routes actual events and provides runtime clips for owner review. No merge or publication is authorized by this handoff request. The normal repository handoff files outside `incoming/ART-VFX-COMMAND-001/` were deliberately left untouched to honor the owner's explicit path restriction. No existing art, src, tests, public or CI files changed. PR URL, pushed commit and remote-byte verification are reported in the PR/chat.
