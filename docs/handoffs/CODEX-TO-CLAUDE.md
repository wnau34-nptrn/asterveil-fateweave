# Codex → Claude handoff
## 2026-10-19 — Battle status inspection inside information

- Owner selected the recommended unit-status inspector but moved it into battle ⓘ as a tab. Every click/tap/keyboard opening must reset to สถานะ; other tabs remain available. No new battlefield/header button.
- `ui/battle-status.ts` projects temporary buffs/debuffs from the displayed `BattleState` plus the real resolver helpers. It covers barriers/reflect, evade charges, haste, Guard, front-lane counter/wall, taunt, group songs/rally, sanctuary/solace, marks, corrosion, delay and physical interruption/energy seals. Expiry is round-based only where the rules are; otherwise explain consumption or the caster's next turn. Show songs on every living recipient. Dead units/casters, expired data and ended battles do not invent active effects.
- The native status tab lists the actual party/enemy definitions with portraits/HP and compact status icons. Unit inspection is independent of the command owner/target, and uses `displayState` during actor-stage playback. Shared tab selection now supports resetting the default while retaining keyboard navigation; world information keeps its existing default.
- Initial validation: typecheck/lint/build and 428 unit tests passed, including six status projection cases. Three mobile/PC browser cases passed at 320×568, 390×844 and 1366×768, verifying default-on-reopen, both sides/empty states, unchanged save/selection, blocked background casts, a subsequent real cast and consumed-barrier updates. A clock-controlled actor-stage case also passed: the inspector keeps the hero-stage barrier until the enemy stage actually absorbs it. Screenshots visually inspected. Browser plugin not available; repository Playwright/Chromium used. Physical iPhone/Safari remains unverified. CI/publication results follow below.

- Final local focused browser sweep: 9/9 passed (status tab, stage snapshots, battle-info keyboard, audio tabs, teaching settings and SPD details). Full unit rerun passed 428/428 with `--maxWorkers=2`; a concurrent all-worker run had one unrelated 5s balance-simulation timeout under local load, so do not report that particular run as passing. No simulation or game-rule changes were made.

## 2026-10-19 — Restore Home contrast after owner review

- Owner found the brightened Home washed out. Correct only its CSS: reduce brightness from 1.22 to .96, add modest contrast 1.08, reduce saturation from 1.18 to 1.04, lower screen-blended rays (including normal-motion keyframes), remove the pale wash and restore restrained navy edge shading. Preserve the existing painting and all controls/tabs.
- Home screenshots at 390×844 and 1366×768 visually inspected: waterfall/rock/sky detail and logo separation restored. No new assets, dependencies, gameplay, audio or save changes.
- Typecheck, lint, build and 422 unit tests passed. All eight focused frame/Home Chromium cases passed (320×568, 390×844, 768×1024, 1366×768 and 1920×1080); publication results follow below. Chromium verification is not physical iPhone/Safari verification.


- Published commit `8285268` through successful Pages run [39198790412](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/39198790412); quality runs 39198790629 and 39198794175 also passed. Live smoke checks at 390×844 and 1366×768 confirmed the new filter, unchanged tabs and no page/console errors; live phone screenshot inspected. Also inspected normal-motion rays at peak opacity .12 locally. Publication complete; do not redeploy for this documentation-only completion note.

## 2026-10-19 — Home brightness and tabbed in-game settings

- Owner requested removing all audio panels/sample buttons from Home, brightening its artwork and moving volume controls into in-game information, with separate tabs for settings and advice.
- Home reuses its existing painting with brighter/more vivid CSS treatment and lighter vignette. No generated assets or gameplay changes.
- Map information has คำแนะนำ / ตั้งค่า; battle information adds บันทึก. Settings contain shared music/effects mute and volume, with no sample button. First-battle coaching toggle lives under settings. Preferences remain synchronized and persistent under the existing audio keys; save v21 is unchanged.
- Shared tab helper supplies tab/tabpanel relationships, selected state, roving focus and Left/Right/Home/End keyboard navigation. Native close/Escape focus return and closing-touch protection remain.
- Initial validation: typecheck, lint, build and 422 unit tests passed; eight focused Chromium cases passed on 320×568, 390×844, 430×932 touch and 1366×768 PC. Home/map/battle screenshots visually inspected. Browser plugin not available; repository Playwright used. Full browser/CI/publication results follow below. Physical iPhone/Safari audible output remains unverified.

- PR [#19](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/19) merged as `423df77842b943e2023fa0b85be532bba31c3785`. Quality run [39196998161](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/39196998161) passed; production browser run [39196998162](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/39196998162) passed all 148 browser tests plus three focused frame/focus cases.
- Full local Chromium run was stopped after production CI passed: the local `blind Attack priority raider` case exhausted its 75-second timeout near the final summary assertion; the same unchanged combat case passed in full production CI. Do not report the interrupted local full run as passing. Eight focused local settings/input cases passed, and real screenshots were inspected.

- Publication complete: Pages run [39197657164](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/39197657164) passed build/browser verification and deployed successfully. Live smoke checks at 390×844 and 1366×768 confirmed the brighter Home, zero Home audio/sample controls, both tab containers, no error overlay and no page/console errors. Desktop live screenshot inspected. Live URL: https://wnau34-nptrn.github.io/asterveil-fateweave/ . Do not republish for this documentation-only completion note.

## 2026-10-19 — Portrait game and keyboard selection on PC

- Owner accepted one mobile portrait layout on PC, then authorized implementation, merge and publication. Standing authorization applies; do not add another approval checkpoint.
- Base `4a87e5b` on `feature/fateweave-initial-prototype`; work branch `codex/portrait-game-keyboard`.
- `#app` is a named size container, centred and capped at 480px wide / 960px high on PC. Existing component breakpoints and viewport units now refer to the frame (`@container game`, cqw/cqh). This keeps all title/camp/map/story/summary/battle surfaces on the same portrait layout. Pointer/hover and reduced-motion queries still describe the actual device.
- `platform/viewport.ts` retains live viewport/safe-area handling and adds a native rotation-guidance modal plus inert/input gating for coarse-pointer landscape. Too-small desktop windows request more space. Text editing avoids a false rotation gate when the mobile keyboard reduces height. Native game dialogs must centre in the top layer over the frame; do not restore left:0/margin:0 full-monitor sheets.
- Battle queue now uses circular six-slot portraits with optional actor/SPD/HP details and accessible round/interruption copy. Team HP stays readable. Command dock is central within the frame and becomes ready on each actual hero turn. Selecting an action no longer automatically opens its description; use the explicit dock ⓘ.
- `platform/keyboard.ts` shares shortcut guards and game bounds. Keys 1–4 select the displayed owned skill only; click/tap still commits through the unchanged resolver. Escape closes a description first, or clears targeting when no overlay is open. After cancellation, both DOM and canvas targets cannot cast until a new selection. Repeated keys, browser modifiers, editing/IME, hidden/rotation-blocked pages, other modals and presentation cannot queue a skill for the next actor. Missing slot 4 does nothing; unavailable skills explain why and expose no valid targets.
- Map retains WASD/arrows (including its existing movement throttle); B toggles its bag, I toggles world/battle info. Closing dialogs returns focus to visible triggers so a hidden slider/select cannot swallow subsequent hotkeys. A desktop keyboard guide and action-number badges make shortcuts discoverable.
- Final implementation `5bebfe9`: typecheck, lint, 422 unit tests and build passed in quality run [39191578178](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/39191578178). Production-Pages Chromium run [39191578133](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/39191578133) passed all 149 browser cases, including 15 new keyboard/frame cases, plus three focused regressions. The run retains portrait screenshots. Earlier local canvas screenshots were visually inspected; final dialog/frame/input geometry is covered by the passing browser assertions.
- First full browser run had 146/149 passes. Repairs now verified: camera HUD measurements subtract the game frame's viewport origin; native battle-info Escape restores focus synchronously and hidden editors cannot suppress shortcuts; the lobby hire/team test closes each full-frame panel before switching service or departing. One earlier test seed also used repel 20 above the permitted 10; use `map.potions.repelSteps`.
- PR [#18](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/18) merged as `8c26d61d3e2576d69b9825e83513e70371ce70c8`. The new PR-only `browser.yml` verifies production browser gameplay before merge; existing `pages.yml` remains responsible for publication. Pages run [39192734047](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/39192734047) passed 422 unit tests, lint, Pages build and all 149 browser tests, then deployed successfully at 2026-10-19 03:11 UTC. Live: https://wnau34-nptrn.github.io/asterveil-fateweave/ . Publication is complete; do not reimplement this task or republish just for this documentation-only completion note.
- Browser extension runtime/tools were unavailable, and local web-server permission requests were cancelled in this session. Remaining browser verification was completed through GitHub Actions. Actual iPhone/Safari and audible audio output remain unverified. Previous audio diagnosis is unchanged. No new assets, dependencies, gameplay numbers, encounter/save versions or core rules. Keep the current save v21 and the owner's standing authorization.


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
