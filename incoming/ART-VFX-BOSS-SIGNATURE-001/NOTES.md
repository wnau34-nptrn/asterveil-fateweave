# ART-VFX-BOSS-SIGNATURE-001

Art-only, 2026-10-29 (Asia/Bangkok). Branch `art/art-vfx-boss-signature-001`, base `feature/fateweave-initial-prototype` at `5e9e65026b8949f7877db12a2e70496fe2aac77b`. Original generated paintings, no Rise Beyond artwork or inputs. Exactly **one final design per move**, 14 moves / 42 independent layers. Owner artwork selection and actual in-game motion approval remain pending. Open PR only; do not merge.

## Delivery and reproduction

- `layers/`: the only integration candidates, 256x256 straight RGBA PNGs, three beats per move, `prepare -> peak -> settle`. No alternate final versions.
- `source/`: untouched ImageGen outputs. Some generator sheets contain unselected cells; only crops explicitly listed in `layers.json` are selected. These source cells are provenance, not extra integration candidates.
- `generation-prompts.json`: exact prompts, generation settings, source paths and rejected attempts.
- `seeds/` and `seeds.json`: exact read-only crops of this repository's shipped sprites used in review boards. Matriarch is mirrored to match the runtime's enemy-side correction. Gold-armour test uses the actual original guardian sprite. No body animation is delivered.
- `storyboards/<move>-390.png`: three full-width illustrative beat panels per move, not runtime clips. All-side panels stress five heroes; this is a placement/readability study, not a change to party size.
- `storyboards/contrast-*-390.png`: every beat on navy and an actual bright gold shield/armour crop, at normal blending. `telegraphs-390.png` and `preview-390.png` compare waiting-turn silhouettes.
- `layers.json`: every selected source rectangle, proportional packing transform, alpha bounds, checksum, pivot, anchor, suggested timing and truthful route. Centre pivot is `[128,128]`; War Cry's right emission point is `[226,128]`; Stampede uses low ground contact `[128,210]`.
- `validation.json`: SHA-256 and byte count for every package file except itself, with decoded PNG dimensions/modes. Self-hashing is impossible; the fetched-blob verifier separately compares the manifest's SHA-256 against its local exact bytes.
- `build_handoff.py`: mechanical cropping, proportional scaling, transparent padding and review compositing, with Pillow 12.3.0. No generated effects are repainted or recoloured by this script. `python incoming/ART-VFX-BOSS-SIGNATURE-001/build_handoff.py` rebuilds all packaged outputs. Seeds and original source sheets are fixed inputs. Fonts use Pillow's bundled default; no network/font download required.

After any documentation or script edit, rebuild the manifest. `--verify` verifies local bytes. After normal git push and fetch, `--git-ref <fetched-ref>` hashes actual Git blob bytes, checks the exact package file set, verifies PNG structure, and fully loads every PNG with Pillow. Do not trust a local-only check after push.

## Move direction and three-beat order

All release directions are enemy-right toward hero-left. Rift Wave and the Cataclysm peak required a recorded mechanical horizontal mirror during packaging; the untouched originals retain their generated direction. Do not mirror the Captain cone a second time. Palette carries dark plum/indigo contours and bright ivory/mint/cyan edges so the effect retains contrast on both navy and gold. **Normal blend is intended for every layer; additive glow is not required.** Do not flatten away the dark contours with additive stacking.

| Move | Prepare | Peak | Settle | Truthful placement |
| --- | --- | --- | --- | --- |
| Gather Thorns | open briar curves | compressed briar knot | loose thorn seeds | Boss chest, zero damage; waiting telegraph selection below |
| Thorn Bloom | compressed bud | single radial thorn flower | falling petal shards | Actual selected hero chest |
| Thorn Storm | rigid double-tooth brackets | narrow diagonal thorn volley | short barbed wisps | Actual selected hero; unstoppable, **not all** |
| Thorn Tempest | broad rigid brackets | three separated thorn gusts | separated thorn curls | All actual affected heroes; unstoppable |
| Thorn Rage | coral thorn buds | outward coral/ivory briar crown | ruby/coral embers | Boss phase cue; no invented hero impact |
| Rift Gathering | soft open rift wisps | compressed rift spindle | loose rift motes | Boss chest, zero damage; waiting telegraph below |
| Rift Wave | crescent seed | three lateral wave slices | broken wave fragments | All actual affected heroes; normal interruptible appearance |
| Rift Cataclysm | rigid crystal brackets | heavy angular crystal cleave | crystalline embers | Actual selected hero; unstoppable, **not all** |
| Rift Awakening | fracture slivers | outward splitting crystal fans | scattered violet shards | Boss phase cue, not damage |
| Call the Rift | upright tear wisps | upright dimensional tear | vertical rim remnants | Actual newly summoned slot, below HP, never floor ellipse |
| War Cry | rigid crimson brackets | leftward sawtooth pressure cone | torn pressure wisps | Captain forward chest toward actual selected hero; offensive unstoppable shout |
| Call the Hunt | two signal sparks | upright three-prong flare | rising crimson motes | Caster-side signal; no hero damage, summon only on real event |
| Horn Charge | compressed crystal grit | compact air/contact wedge | crystal chips and air slip | Juggernaut forward release / actual selected hero contact |
| Stampede | broad low dust trail | heavy rock/dust contact | low drifting dust and rocks | Tusker feet / actual selected hero feet |

Horn Charge and Stampede are physical single-target moves in the inspected content, with no `charge: true` flag. Their prepare/trail artwork is an action cue, **not a newly invented waiting turn**. Stampede remains interruptible; its heavier broad rock plume distinguishes it from the narrower crystalline Horn Charge. Ground dust is used only for these ground-running effects. No other move uses leg auras or floor rings.

## Waiting-turn telegraphs and unstoppable

The normal key uses flexible open curves. Unstoppable uses two rigid, toothed, interlocked brackets with a clear central gap, visible even without a colour distinction. Never place the brackets above the head or over the intent/HP label. Hold just forward of the rendered lower chest/hand (about 30px toward hero-side space) at approximately 90px canvas width in a 390px field. Keep the face/label masks active through idle sway, recoil and camera shake.

`Gather Thorns` currently announces the subsequent **Thorn Tempest**, and `Rift Gathering` precedes **Rift Cataclysm**. Therefore use the corresponding release's `prepare` layer as the persistent **unstoppable-release warning** during those actual waiting turns. The normal preparation layers remain the ordinary gathering action beat and normal-charge visual key. This distinction describes the announced release's unstoppable property; it does not change whether the zero-damage gathering action itself can be interrupted. Select from actual intent data, not actor identity or a fabricated flag. The exact reusable references are in `layers.json.telegraphs`.

Waiting lifetime is state-driven: start on the real announced charge; retain until actual release, interruption, death or intent replacement; clear immediately on cancellation. Do not add a turn or trigger damage with the hold. Suggested normal motion is a slow opacity breathe (0.85-1.0); unstoppable brackets remain rigid with no spinning. Reduced motion uses a static hold. These are suggestions for Claude to fit into existing timing.

For three-beat one-shot actions, suggested art windows are prepare 0-140ms, peak 140-320ms, settle 320-540ms. These are **not new gameplay timings**. Fit to the current presentation duration and actual contact event; preserve normal/fast/reduced-motion behavior. Phase and summon cues must not pretend an attack occurred.

## Readability, masks and limits

Reviewed the 390px contrast and staging boards at their native width. Bright rim/core strokes retain their silhouette on navy; dark plum/indigo bodies separate from the bright gold test armour. Settle beats intentionally recede and should fade, never linger as an extra hit. Whole-side effects use small per-actual-target instances rather than a full-screen blanket, with no extra decorative impact events. Do not instantiate for unaffected or missing heroes.

The boards apply conservative reference face and HP rectangles to the **effect overlay only**. `layers.json.storyboards` records the masks and removed pixel counts, and checks zero residual overlap. This proves only the illustrative composition with these masks; it does not prove naturally clear placement without masks or correct runtime attachment. Source sprites and labels themselves are never cut. Claude must use real current face/name/HP/status bounds and preserve the source pivot under pose changes, formation changes, resize, shake, fast playback and reduced motion.

Captain War Cry is the boss's offensive single-target shout in `src/content/encounters/catalog.ts`, not Garran's ally-buff/counter War Cry from the command package. Call the Hunt and Call the Rift are phase summons. No damage numbers, status application or summons are invented by these assets.

## Rejected attempts

1. Initial Matriarch painting: insufficient brightness, especially small prepare/settle thorns on navy at 390px. Rejected after real normal-blend contrast compositing. A bright mint/ivory edit improved contrast, but dense lower rows still put faint particles too close to source crop boundaries. Only its clean Gather Thorns row is selected; Bloom/Storm/Tempest/Rage were regenerated as individual whole three-beat rows.
2. First Sentinel five-row source: Awakening and portal too crowded near the row boundary; generated those two moves on a separate, roomier source. Wave/Cataclysm had loose fragments close to neighboring row cuts and were also regenerated as individual three-beat rows. Only the clean Rift Gathering row remains selected from the original sheet.
3. First Captain source: broader flame-like pressure ribs read less clearly as a directional shout; chose the sharper sawtooth crimson/violet design. The rejected file is not shipped as an alternate. Initial viewer RGB haze was checked against real alpha: hidden RGB is not a painted background; acceptance uses actual alpha composites.
4. Rejected packaging: automatic equal-grid cuts of dense sheets risked crop-boundary particles; selected row sources plus manually inspected rectangles replace those cuts. No alternate packaged finals are included.

## Validation and handoff

Required checks: exactly 42 nonempty 256x256 RGBA layers, genuine zero-alpha borders of at least 12px, complete PNG verification/decode, per-file SHA-256, 390px board widths, per-beat normal-blend review on navy/gold, masked face/HP clearance, deterministic rebuild, folder-only diff and `git diff --check`. Normal git push and fetched-blob verification are mandatory before the PR is reported complete; verification output belongs in the PR description.

No runtime, browser, gameplay or motion tests are claimed. This art-only package does not alter rules/save/content/balance/timing, `src/`, `tests/`, `public/`, `.github/` or existing art. The current incoming-only instruction takes precedence over the shared docs-handoff rule, so this file is the Codex-to-Claude handoff. Reference command-package layout was inspected from PR #93 on `art/art-vfx-command-001` because that folder is not yet on the base branch. Preserve owner artwork and real-motion decisions; neither asset checks nor CI are approval. Claude integrates separately and provides real 390px motion clips for owner approval. Leave this PR open and unmerged.
