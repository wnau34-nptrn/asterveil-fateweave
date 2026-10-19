# Codex → Claude handoff

## 2026-10-19 — Portrait game and keyboard selection on PC

- Owner accepted one mobile portrait layout on PC, then authorized implementation, merge and publication. Standing authorization applies; do not add another approval checkpoint.
- Base `4a87e5b` on `feature/fateweave-initial-prototype`; work branch `codex/portrait-game-keyboard`.
- `#app` is a named size container, centred and capped at 480px wide / 960px high on PC. Existing component breakpoints and viewport units now refer to the frame (`@container game`, cqw/cqh). This keeps all title/camp/map/story/summary/battle surfaces on the same portrait layout. Pointer/hover and reduced-motion queries still describe the actual device.
- `platform/viewport.ts` retains live viewport/safe-area handling and adds a native rotation-guidance modal plus inert/input gating for coarse-pointer landscape. Too-small desktop windows request more space. Text editing avoids a false rotation gate when the mobile keyboard reduces height. Native game dialogs must centre in the top layer over the frame; do not restore left:0/margin:0 full-monitor sheets.
- Battle queue now uses circular six-slot portraits with optional actor/SPD/HP details and accessible round/interruption copy. Team HP stays readable. Command dock is central within the frame and becomes ready on each actual hero turn. Selecting an action no longer automatically opens its description; use the explicit dock ⓘ.
- `platform/keyboard.ts` shares shortcut guards and game bounds. Keys 1–4 select the displayed owned skill only; click/tap still commits through the unchanged resolver. Escape closes a description first, or clears targeting when no overlay is open. After cancellation, both DOM and canvas targets cannot cast until a new selection. Repeated keys, browser modifiers, editing/IME, hidden/rotation-blocked pages, other modals and presentation cannot queue a skill for the next actor. Missing slot 4 does nothing; unavailable skills explain why and expose no valid targets.
- Map retains WASD/arrows (including its existing movement throttle); B toggles its bag, I toggles world/battle info. Closing dialogs returns focus to visible triggers so a hidden slider/select cannot swallow subsequent hotkeys. A desktop keyboard guide and action-number badges make shortcuts discoverable.
- Tests: 422 unit tests, lint, normal and Pages builds passed before final focus/centering follow-ups. Four existing focused battle cases passed in the prior environment; a new 15-case keyboard/frame suite is being verified. First broad run found top-layer dialogs pinned outside the PC frame (fixed), a text-setting focus return issue (fixed), and one invalid test seed with repel 20 above the permitted 10 (corrected). Update final validation and publication state before finishing.
- Browser extension runtime/tools are unavailable, so use repository Playwright with system Chromium; actual iPhone/Safari and audible audio output remain unverified. Previous audio diagnosis is unchanged. No new assets, dependencies, gameplay numbers, encounter/save versions or core rules.


## 2026-10-18 — Isolate effects from possible music masking

- Owner suggests background music may mask effects. This remains a hypothesis: no physical iPhone sample result or audible output has been confirmed. Avoid claiming a mix fix or that the device is now audible.
- A direct effects sample now pauses **all** music tracks, including an outgoing crossfade, for two seconds. Repeated samples extend the pause; playback restores only the current track and respects mute, page visibility and the latest volume. Music preferences and game saves remain untouched. Pausing deliberately avoids relying on HTML media volume changes that some iPhones ignore.
- Battle **ⓘ → เพลงและเสียงเอฟเฟกต์** now includes music mute/volume as well as the existing effects controls/sample. Music controls synchronize with title controls. The owner can disable music and test actual attacks/skills without leaving the fight or spending a turn on settings.
- Validation: 422 unit tests, typecheck, lint, normal and Pages builds passed. All eight focused production-Pages browser cases passed, including real media pause/resume, synchronized music controls and unchanged save/battle commands. Portrait 390×844 and landscape 844×390 battle screenshots were inspected; title controls also passed at 320×568, 390×844, 844×390 and 1366×768. Browser extension tools are unavailable in this session, so use repository Playwright/Chromium under the Pages subpath. Physical iPhone output remains unverified.
- Next device check: refresh, continue, open battle ⓘ and press the effects sample. If still silent while music is paused, masking alone cannot explain the problem. If audible, disable music and try actual attacks/skills to confirm before changing every recipe or replacing the audio engine.

## 2026-10-18 — Make sound settings discoverable and add a direct sample

- Owner still hears no effects on iPhone and asked whether an effects toggle even exists. Current device mute/volume preferences remain unconfirmed; do not assert the iPhone issue is resolved from Chromium results.
- Owner clarified that the battle screen has no effects toggle. Expose the shared effects controls and preview at the top of the battle's **ⓘ** dialog so they are available immediately during a fight. Title and battle controls use unique IDs and synchronize preferences; audio interactions cannot commit commands or exit the battle.
- Replace icon-only title toggles with explicit เพลง/เอฟเฟกต์ เปิด/ปิด text and visible percentages. Add a direct attack sample. If effects are muted/0%, the button explicitly says it will enable and test them, restoring only zero volume to 70%.
- `Sfx.preview()` awaits context resume before scheduling the sample, avoids first-sample loss, preserves preferences itself and returns a failure if unsupported/blocked. The UI changes preferences only on the explicitly labelled enable-and-test action. No game save changes.
- Validation: 418 unit tests, typecheck, lint, normal and Pages builds passed. Final 8 focused browser cases passed on the production Pages build: existing effects/attack/skill paths, title settings/sample at 320×568, 390×844, 844×390 and 1366×768, and touch-input battle-dialog settings at 390×844 and 844×390. Battle tests verify preference synchronization, unchanged save/commands during audio interaction, safe modal close and a subsequent valid attack. Screenshots inspected; feedback deliberately avoids claiming the device speaker was heard.
- Ask for the result of the sample and the visible on/off/percentage if silence persists. Physical iPhone output is not verified, and automatic tests cannot establish the owner's current preferences or speaker output. No audio-engine replacement or new assets in this change.

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
