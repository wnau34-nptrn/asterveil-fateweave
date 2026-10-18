# Codex → Claude handoff

## 2026-10-18 — Publication follow-up: audio probe timing

- Owner authorized merging and publishing the sound fix. PR #13 merged at `253caaea0423fce587c8ad90cd8f90fad35dc91a`.
- First publication run `39131084875` passed all 416 unit tests and 127 browser cases, but the new audio case failed before deployment. Its probe read `AudioParam.value` immediately after scheduling automation; that getter can still reflect the previous audio render quantum and miss the low-frequency hit oscillator.
- Correct the test probe to observe the initial frequency passed through native `setValueAtTime`, while still asserting native oscillator start, context suspension/recovery, an actual battle attack and Arcane Bolt. No game code or audio recipes change in this follow-up.
- Validation: corrected focused case passed locally in Chromium; all 6 production-Pages cases passed across desktop (1366×1000) and touch-emulated phone (390×844, DPR 3): SFX controls, suspended-context attack/Arcane Bolt recovery and the Matriarch/Mycon battle. Real canvas screenshots were inspected; enemies face left. Typecheck, lint and whitespace checks passed. Physical iPhone audible output still needs owner verification.
- Follow-up is within the owner's instruction to complete the merge/publication. Do not describe the failed run as deployed. Check the latest successful Pages run for final publication state.

## 2026-10-18 — iPhone sound-effect recovery

- Owner hears background music on iPhone but no attack/skill effects; turning off Silent mode did not help.
- Base: `feature/fateweave-initial-prototype` at `fbd33dc40a09f16f9615ba712e4d56d04d6a1ce8`. Branch: `codex/fix-iphone-sfx-recovery`.
- Confirmed code defect: SFX removed its gesture listeners after the first attempt and `play()` silently discarded sounds unless the context was running. A rejected initial resume or later iOS suspension could leave effects silent for the rest of a touch session. The owner's exact device state is not remotely observable.
- Fix in `platform/sfx.ts`: keep gesture recovery available, retry on returning to a visible page/unmute/playback, recover Safari interruption, recreate closed contexts and request the optional Safari playback session. Preserve user preferences and do not queue missed sounds.
- Nine lifecycle unit tests observe oscillator/noise starts instead of relying on `data-sfx`. A new browser battle test suspends native Web Audio, then checks recovery plus attack and skill oscillator starts. Local Chromium cannot launch in this sandbox, so the browser case remains pending; real iPhone sound output is also unverified.
- Validation: all 416 unit tests, typecheck, lint and build passed before adding the browser-only case; the browser addition is typechecked/linted separately. Phaser retains its existing chunk-size warning.
- No gameplay/save changes or audio assets added. No merge/publication of this sound fix without the owner's instruction.

### Previous fix publication

- Owner approved merging PR #12. It merged at `fbd33dc` and GitHub Actions run `39128061742` completed both build/browser verification and deployment successfully. The older "no merge" note below records the state before that approval.

## 2026-10-18 — Thorn Matriarch faces left

- Owner reported the Thorn Matriarch (ราชินีหนาม) facing right in battle. Party units must face right and enemies left.
- Base: `feature/fateweave-initial-prototype` at `d2f311c3f6cd8725980607dc7320401e15ebbeaa`. Fix branch: `codex/fix-thorn-queen-facing`.
- Cause: incoming `foe_matriarch.png` and its portrait already face left. Intake mirrored both in the runtime atlases, making them face right. The earlier intake report incorrectly described the originals as right-facing.
- Fix: add `foe_matriarch` to `mirroredArt`, which BattleScene applies by art key (not enemy slot). Flip its cropped `.portrait` wrapper in CSS so every DOM portrait matches. Other actors retain their existing orientation.
- No artwork files, gameplay rules, encounters, saves, dependencies or balance values changed. Placement rules and the intake report now document the correction.
- If rebuilding the Matriarch runtime frames from the incoming originals, omit the intake mirror and remove **both** runtime display corrections to prevent a double flip.

### Validation

- Passed: `npm run typecheck`, `npm run lint`, `npm test` (407/407), `npm run build`, `git diff --check`. Build retains the existing Phaser chunk-size warning.
- Visually inspected incoming PNG/WebP and the shipped foes atlas; confirmed the direction discrepancy.
- In-game screenshot validation **pending**: the sandbox prevented the Playwright web server from starting; the request for network permission was cancelled. Browser extension automation tools were not exposed, so the repository's Playwright workflow was attempted.
- Resume with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser -- --grep 'new Veil Frontier foes'` where a local server is permitted. Inspect `foes-thicket.png` on desktop and a portrait phone; confirm the Matriarch and Mycon face left, allies face right, and selecting/attacking the Matriarch still works.
- No merge or deployment performed by Codex.
