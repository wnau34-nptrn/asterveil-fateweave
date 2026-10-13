# Prototype validation history

Current encounter is version 3 with four classes. Earlier sections below describe previous implementations and their checks; they are historical evidence, not current rules. The latest section records current validation.

## Environment and installation

Linux managed workspace, Node 24.19.0, npm 11.9.0. The target repository was empty, confirmed with remote repository metadata and `git ls-remote origin`. `main` was initialized with an independent README commit, then development moved to `feature/fateweave-initial-prototype`. The Godot repository was never fetched, read, modified, or pushed.

Stable npm versions and engine/peer requirements were inspected before installation. Initial setup used:

```sh
npm install
npm install --save-dev --save-exact @types/node@24.19.2
```

The completed lockfile was then verified from scratch with `npm ci`.

## Initial prototype checks (commit 0ac2a38)

| Command | Result |
|---|---|
| `npm ci` | PASS — 136 dependency packages installed from lockfile |
| `npm run typecheck` | PASS — strict app, tests and config checking |
| `npm run lint` | PASS — ESLint |
| `npm test` | PASS — 30 tests, 2 test files, Node environment |
| `npm run build` | PASS — production output generated |
| `git diff --check` | PASS |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser` | PASS — 6 browser gameplay tests |

The build reports a non-fatal Phaser chunk-size warning: Phaser 1,374.10 KB minified / 357.33 KB gzip; application JS 24.83 KB / 9.22 KB gzip and CSS 11.05 KB / 3.05 KB gzip. No final art or font downloads are required. This records local validation; remote GitHub Actions status must be checked independently on the PR.

## Automated rules coverage

Initialization; immutable state; exact damage and zero-HP boundaries; Guard interception/mitigation and lethal Guard; Counter cap/generation/consumption; hero action restrictions; stale commands; Mark duration, refresh/eligibility and Tracer interaction; energy-only Redirect; valid/invalid/exhausted targets; source and other-enemy redirection; bounded exposure; Crystal absorption/barriers; source death canceling pending events; fixed announced target; Victory/Defeat; complete preview/resolution equality; an attack-only winning route; deterministic command replay; valid save replay and corrupt/unsupported/unavailable storage handling.

## Real browser gameplay checks

Used installed **Chromium on Linux**, software WebGL through SwiftShader, a 1366×1000 desktop viewport and a 390×844 touch/mobile viewport (also resized to 844×390). Screenshots of actual Phaser-rendered geometry were captured and visually inspected; DOM assertions alone were not treated as visual verification.

1. Real canvas pointer selection, explicit preview, cancel button and Esc, Guard HP prediction, Crystal Redirect, barrier gain, exhausted crystal, reload restore and restart. This test runs with normal motion.
2. Mark → Redirect to a marked Brute using real controls. Physical intent visibly blocks Redirect. Exact redirected damage and Exposed status verified.
3. Attack-only Victory from normal initial state, then Play again. No fabricated state or hardcoded win screen.
4. Poor decisions produce Defeat from normal initial state. The long encounter test has a 90-second timeout for software-rendered browser automation.
5. Touch taps, mobile Preview/confirmation, reduced-motion behavior, orientation resize and no horizontal page overflow.
6. Browser storage access throws; the battle remains playable and clearly reports session-only storage.

Final assertions reported no page exceptions or console errors. Earlier validation caught and fixed a missing favicon 404, overlapping arena intent text, missing Node config types, and an insufficient long-encounter test timeout. Source HP text and the intent diamond no longer overlap in the inspected screenshots.

Screenshot artifacts (ignored by Git) are under `test-results/`: desktop battle, desktop Crystal preview, Victory, Defeat and mobile Guard preview. Playwright recreates that directory on subsequent runs.

## Limits of the evidence

- This is browser automation with actual interactive gameplay, not human balance/replayability validation.
- No real Windows, Android, iPhone or iPad was available. Mobile emulation does not prove iOS Safari behavior.
- Firefox and Safari/WebKit were not tested. Canvas fallback and GPU/context-loss behavior need a later device matrix.
- The initial browser tests used the Vite development server. The later GitHub Pages preparation additionally tests the production server under the repository subpath.
- Tab/background behavior commits and saves before animation and releases its UI lock on visibility change, but OS-level suspension was not tested on a mobile device.
- World exploration, backend, online challenges, progression and mobile packaging are unimplemented future work.
- At the initial prototype check, reference images were not available. Battle/World references have since been inspected as described below; none are committed. Current characters/environment remain original geometric placeholders.
- No public deployment occurred during the initial prototype/reference update. The user subsequently authorized GitHub Pages publication. Repository visibility/access and merge state remain unchanged.

## Supplied-reference visual update — 2026-10-12

Directly inspected the two subsequently supplied images: Battle (C) first, World Exploration (B) second. Updated art direction and README to record actual observations; Key Art (A) remains unavailable. Images are not added to repository assets. Original 2D scenery now includes pale portal ruins, bridges, static waterfall ribbons, greenery, decorative tiles and purple rift shards. Heroes gain clearer role silhouettes and the Crystal/HUD use gold framing and action-specific colors. Hero HP was moved beside each silhouette to prevent overlap. Combat data, rules, commands and saves are unchanged.

Follow-up commands and results:

```sh
npm run typecheck                 # PASS
npm run lint                      # PASS
npm run build                     # PASS, same non-fatal Phaser chunk warning
git diff --check                  # PASS
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser -- --grep 'real canvas|mobile touch'
# PASS: 2 targeted browser tests (desktop normal motion and mobile touch/reduced motion)
```

Inspected the updated desktop Crystal preview and mobile Guard preview screenshots. Checked actor/HP/intent separation, scenery and text contrast, gold frames, canvas selection, explicit confirmation/cancel, Guard/Redirect, persistence/restart and responsive touch/orientation behavior. The unchanged full six-test combat suite and 30 Node tests were validated for the initial prototype; this visual follow-up reruns the two affected browser paths rather than claiming a new full six-test run. Application output is 27.18 KB JS / 10.04 KB gzip and 12.12 KB CSS / 3.37 KB gzip; Phaser output is unchanged. No real-device or Safari testing was added.

## User-authorized GitHub Pages preparation — 2026-10-12

Added `build:pages` for `/asterveil-fateweave/`, a base-aware favicon path, and a production mode in Playwright. The GitHub Pages workflow gates deployment on lint, all Node tests, typechecked production build and the two affected desktop/mobile browser scenarios. It uploads only `dist/` and uses official GitHub Pages actions. Publication was explicitly requested by the user; no automatic PR merge or repository visibility/access changes are included.

Local validation passed `npm run lint`, `npm test` (30 tests), `npm run build:pages`, `git diff --check`, and:

```sh
PLAYWRIGHT_PAGES=true PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser -- --grep 'real canvas|mobile touch'
# PASS: 2 tests against the production server at /asterveil-fateweave/
```

The preview server is started with the matching `--base=/asterveil-fateweave/`. This verifies production asset paths, actual Phaser canvas interaction, confirmation/cancel, Guard/Crystal Redirect, reload/restart, and responsive touch controls without console errors. Public availability must be confirmed by the Pages deployment; preparing a working build alone is not evidence that the public URL is live. The environment's direct GitHub Pages administration API request was denied, so the workflow attempts automatic enablement using official `configure-pages`. If its token lacks the required permission, a repository administrator must select GitHub Actions as the Pages source in repository Settings before retrying deployment.

## Tactical balance update — encounter content version 2

After player feedback that Attack spam dominated, increased Rift Bolt from 18 to 30 and Tracer's Mark/Exposed bonus from 6 to 22 (38 total damage). Added two planned future intents, exact next-intent preview, lethal-hit warnings and a survivors/HP result summary. Victory still requires defeating enemies with at least one hero alive; keeping all three is an optional challenge. Existing battle rules and Crystal's one-charge/+8 barrier behavior remain unchanged. Version-1 saves restart safely. Detailed strategy routes and comparisons are in `BALANCE_VALIDATION.md`.

Local checks passed `npm run typecheck`, `npm run lint`, `npm test` (37 tests across 3 files), `npm run build:pages` and `git diff --check`. The full production suite was then run with:

```sh
PLAYWRIGHT_PAGES=true PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser
# PASS: all 8 tests (2.4 minutes), production /asterveil-fateweave/ subpath
```

Verified real UI results: Raider-first Attack policy loses; Brute-priority Attack wins with 2/3 heroes and displays Costly victory; a nine-beat Guard/Mark/Crystal route wins with 3/3 heroes, 88 party HP and Party intact. Core strategy regression tests additionally verify nine-beat Guard/Mark wins without Redirect and marked-enemy Redirect wins without Crystal, with exact replay and preview equality. Inspected screenshots of the lethal Attack preview, Crystal choice, whole-party victory and mobile controls/forecast. Browser tests reported no page exceptions or console errors. The Pages publication workflow now gates deployment on all eight production browser tests. No new real-device/Safari evidence or claim of final human-tested balance is added.

## Thai guided layout — 2026-10-12

Replaced the dense command area with four numbered steps: hero, the selected hero's two actions, target, then preview/confirmation. Wide screens place the field/current intent beside the decision panel; widths up to 1040px stack it. Critical intent and the Crystal's one-use/+8 party-barrier explanation remain visible outside the help disclosure. Future forecasts, detailed rules and combat history are secondary disclosures. The UI, canvas actor names, warnings, restrictions, event log and save indicator are Thai; action buttons retain secondary English names to connect earlier feedback about Mark/Redirect to their Thai labels. Preview separates player events from enemy/team events and shows changed HP, barrier, Counter and charges. Core simulation, balance data and content version 2 are unchanged, so existing compatible saves continue.

Passed lint, strict typecheck, all 37 Node tests, production Pages build and `git diff --check`. All **9 production browser tests passed (1.4 minutes)**, including the new Thai four-step/role-action/restriction test and 320px/768px layout checks. Existing paths continue to cover canvas input, Guard, both Redirect targets, preview/cancel/Esc, reload/restart, reduced motion, touch/orientation, wins/losses and storage failure. Inspected desktop Crystal and mobile Guard screenshots. Inspection found an Attack icon too close to its Thai label; adjusted the action grid spacing and rebuilt. The three affected desktop/mobile/Thai-layout scenarios were then rerun against the final production build: **all 3 passed (21.8 seconds)**. The final 320px screenshot was inspected to confirm the icon/text separation.

No horizontal page overflow was detected at 320px, 390px, 768px or landscape 844px. Selected hero/action/target/confirmation hit areas in the narrow/tablet test are at least 44×44px. Tests reported no page exceptions or console errors. Thai fonts use installed system fallbacks and do not require a font download. These are Linux Chromium/software-WebGL tests with emulated viewports/touch, not real mobile or Safari validation. The existing non-fatal Phaser chunk-size warning remains.

## Phone layout and preview dialog — 2026-10-13

Phones up to 600px and landscape viewports up to 960px wide / 540px high now use a 224px arena, compact hero/action controls, a sticky current enemy intent, and secondary forecast/help below the controls. Command explanations are collapsible; disabled controls keep readable reasons. Short-field character/platform positions and hit zones adapt to the actual canvas height.

Selecting a valid target on a phone opens the same preview element in a native modal bottom dialog. Only its results scroll; confirmation/cancel stay in the footer with safe-area padding and dynamic viewport height. The background is locked and native modal focus keeps input in the preview. Cancel, close, Escape and backdrop taps do not advance the battle and return focus to the selected target. Rotation and moving between phone/desktop layouts preserve the pending command; confirming commits once, closes the sheet and restores selection controls. Victory scrolls the reachable result/restart into view. No core rules, encounter version or save format changed.

Local quality checks passed strict typecheck, ESLint, all 37 Node tests, `build:pages` and `git diff --check`. All **16 production browser tests passed (2.0 minutes)** under `/asterveil-fateweave/`, including the existing desktop/balance/save paths plus seven phone cases:

- Touch flows at 320×568, 390×844, 600×800 and 844×390: initial Start, Guard, Crystal Redirect, cancellation, focus return, Escape/backdrop dismissal, reload and no horizontal overflow. The 390px flow uses normal motion; others cover reduced motion.
- Confirmation/cancel boxes remain entirely within the viewport and at least 44×44px; center-point hit testing confirms they are actually reachable. Scrolling long results leaves confirmation in the same position. The current intent stays fully in view while selecting a target.
- A pending preview survives portrait → landscape → desktop → portrait changes without committing or duplicating its confirm button.
- A genuine nine-command phone battle finishes with 3/3 survivors and 88 party HP, then restarts through touch controls.
- Actual compact-canvas taps select Guardian/Weaver, protect Tracer and redirect into Crystal, validating the resized render/input alignment.

Inspected desktop preview, narrow Crystal sheet, portrait Guard controls, landscape choices and phone victory screenshots. Initial landscape inspection caught a Start button close to the viewport edge; header spacing was reduced. Final inspection also prompted tightening the landscape encounter heading so all of the arena fits at 844×390. The two affected landscape/rotation scenarios were rerun on the final build, including a full-arena visibility assertion: **both passed (11.2 seconds)**. The final landscape screenshot was inspected.

Evidence is automated Linux Chromium with software WebGL and emulated touch/viewports, not physical Android/iPhone/Safari or notch-hardware validation. Safe-area rules are implemented but physical notch behavior remains unverified. The existing non-fatal Phaser bundle warning remains; no runtime console errors were observed in the full passing suite.

## Supplied battle-layout reference — 2026-10-13

The supplied annotated JRPG/Brave Frontier layout now guides the actual playable screen: full-width field, an event timeline at the upper left, current enemy intent in a backed panel, visually separated front/back hero columns, enemies on the right, and a lower command dock. The dock contains the selected hero's original SVG portrait and real HP/attack/barrier, the hero's supported actions and targets, and a three-member portrait roster. Portrait phones place hero/roster information above commands; landscape retains the three-part dock. The ruin background gains foreground masonry, banners and a larger tiled courtyard; unit light rings replace individual floating platforms.

Timeline portraits represent the selected hero, the current frozen enemy intent and two projected future intents. These are actual encounter events, not a new initiative/turn-order system. Front/back placement is visual presentation; announced target selection remains authoritative. Core combat, content version 2, numeric balance and save/replay behavior are unchanged. Current Mark/Exposed state supplies enemy markers. Five small, original hand-authored SVG portraits are public assets served using Vite's typed base URL; the supplied reference image itself is not committed.

Preview now uses the same native dialog on desktop and mobile, preserving exact resolver predictions and the pending choice on rotation. Modal focus, cancellation/return focus, background lock and the fixed confirmation footer remain tested. Full help/forecast/history and the Crystal explanation sit below the dock.

Validation passed ESLint, strict typecheck, all 37 Node tests, `build:pages` and `git diff --check`. All **17 production browser tests passed (2.3 minutes)** under `/asterveil-fateweave/`. The new reference-layout scenario verifies a full-width field above the dock, real timeline IDs/targets/damage, selected-hero portrait and HP, and the next announced event after Guard. Existing paths cover both Redirect routes, Mark, actual canvas input, complete wins/losses, saved reload/restart, unavailable storage and touch flows at 320×568, 390×844, 600×800 and 844×390. Pending previews remain open and uncommitted across phone/landscape/desktop resizing.

Inspected desktop and portrait/landscape screenshots for field/controls separation, hero columns, data consistency, and target/HP legibility. Inspection caught overlapping HP/Crystal labels in narrow formations; actors and HP labels were separated. A final 14px adjustment separates the narrow Crystal caption from the Brute caption. The affected narrow-phone, compact-canvas and reference-layout tests were rerun against the final build: **all 3 passed (15.4 seconds)**. Inspected the final narrow screenshot to confirm caption separation.

The tested short-landscape field fits entirely in 844×390. Confirmation/cancel remain inside the viewport, at least 44×44px and physically hit-testable while results scroll independently. Browser tests reported no page exceptions or console errors. Evidence remains Linux Chromium/software WebGL with emulated touch; real devices, Safari and physical notch behavior are unverified. Characters and portraits are original prototype artwork, not the reference's finished illustrations. The non-fatal Phaser bundle warning remains.


## Four classes, front 2 / back 2 — 2026-10-13

Removed Crystal, Redirect, Counter and Exposed from authoritative state, actions, render/input and UI. Added front Knight/Duelist and back Mage/Priest, each with Attack and two owned skills. Formation now governs physical targeting; energy reaches back heroes. Class skills implement physical interruption, exact-beat cooldowns, non-stacking barriers and bounded pre-response healing without revival. Encounter ID/version change to `veil-siege` / 3 rejects older three-member saves. Cooldowns are reconstructed by command replay.

Local checks passed strict typecheck, ESLint, all **32 Node tests across 3 files**, `build:pages`, and `git diff --check`. All **14 production browser tests passed (2.4 minutes)** against `/asterveil-fateweave/`:

- Four classes, actual lane/roster data, three owned commands per class and absence of Crystal/resource controls.
- Actual canvas selection, Guard, exact previews, cancel/Escape/focus return, saved reload and restart.
- Mage cooldown restoration and exact availability, Ward absorbing a same-beat hit, bounded Heal, and multi-ally Prayer before the enemy response.
- Offensive 11-beat and defensive 16-beat routes through real controls, each preserving 4/4 heroes with respectively 134 and 94 HP. Both tested basic-attack priorities reach defeat.
- Touch controls and confirmation at 320×568, 390×844, 600×800 and 844×390, including 44px hit areas, center-point reachability, disabled cooldowns, scrolling preview footers and no horizontal overflow.
- A full phone victory, selection of the bottom back-row Priest on the actual canvas, and pending-command preservation through portrait/landscape/desktop rotation.
- Incompatible old saves start fresh; denied browser storage leaves play functional.

Inspected actual desktop, narrow portrait, short landscape, Priest party-healing preview and four-survivor victory screenshots. The scene shows two heroes in each lane, distinct green Priest art and six original SVG portraits; the phone roster is 2×2. Confirmation/cancel remain separate from independently scrolling results. Browser tests report no page exceptions or runtime console errors. Evidence is Linux Chromium with software WebGL and emulated touch, not real Android/iOS or Safari. The existing non-fatal Phaser bundle-size warning remains.


## Automatic next-hero selection — 2026-10-13

Confirmed active commands now select the next living roster member, wrapping Aegis → Lyra → Eira → Seren and skipping fallen actors. The action resets to Attack, and the portrait, class commands, timeline and canvas selection update together. Cancel does not change selection. Manual hero choice remains available. Reload derives the next actor from the last committed command; battle completion keeps the final actor selected. No core mechanics, encounter version or save format change. Existing version-3 saves continue.

Strict typecheck, ESLint, all 32 Node tests, production Pages build and whitespace checks passed. The production browser suite passed 16 scenarios on its first run; one new fallen-hero fixture initially expected a casualty on the wrong scheduled beat. Corrected the fixture to follow actual frozen intents and reran that case successfully (15.6 seconds). Thus all 17 scenarios passed across the full run and corrected targeted rerun, with no implementation change between them. The publication workflow runs all 17 together before deployment.

New coverage checks automatic progression through all four heroes and wraparound on desktop and 390px touch, class/action/timeline consistency, cancellation, manual override, restart and saved reload. A valid replay reaches fallen members, skips them, falls back to the sole survivor, and retains the final actor after defeat/reload. Existing full victories verify that ending the battle does not advance the selected hero. Inspected actual desktop and phone screenshots after the four-command cycle. Evidence remains Linux Chromium/software WebGL with emulated touch, not physical Safari/iPhone validation.


The first remote publication run passed 16/17 scenarios, including automatic selection and fallen-hero cases, but the rotation test measured a temporarily hidden confirmation before resize/media events finished (`boundingBox()` returned null). The reachability helper now polls the actual DOM geometry and center hit together until layout settles, retaining the 44px size, full-viewport containment and hit-testing requirements. All five affected mobile/rotation scenarios passed locally after this test-only correction (31.6 seconds); lint and strict typecheck also passed. No product behavior or cooldown/selection mechanics changed. Final publication remains gated on the complete suite.

## Modern classic JRPG battle HUD — 2026-10-13

Adapted the supplied classic battle screenshots into a modern navy/champagne HUD with an illustrated arena, true enemy HP band, frozen intent band, 2×2 hero cards, class-colored line icons and portrait targets. Cards show numeric HP, optional barrier, lane/class and actual cooldown/target readiness. Original generated WebP unit/portrait atlases and a static ruin backdrop total 1.53 MiB. Phaser samples six 512px frames; DOM text and controls remain interactive. Initial Start waits for scene asset readiness. Full-body pointer zones include heads, and status labels render above artwork. Existing combat, automatic next-hero selection and version-3 saves remain unchanged.

Strict typecheck, ESLint, all 32 Node tests, production Pages build and whitespace checks passed. The full then-current production browser suite passed all **18 tests (3.9 minutes)**. Added a delayed-atlas readiness gate and increased compact readiness typography; **all 8 affected checks passed (57.5 seconds)**, covering loading gate, real HUD values/barriers, canvas head selection, four mobile sizes and full phone victory/rotation. After the final status-layer and landscape timeline adjustment, **all 7 affected checks passed (52.9 seconds)**, including final desktop/card screenshots, 320px and landscape input, mobile victory and denied/old storage. The complete publication suite now contains **19 tests** and gates artifact deployment.

Visual inspection compared the Image Gen concept with actual desktop, 320px, 390px, 600px and 844px landscape views. Fixed compact hero text overlap, a landscape timeline covering the Mage, a partially covered Raider HP label, tiny readiness copy and potential shield-text clipping. Inspected final portrait cooldown/barrier and landscape screenshots. The fidelity ledger and intentional copy/layout adaptations are in `UI_DESIGN.md`. No horizontal overflow, page exceptions or runtime console errors were reported in passing browser runs. Confirm/cancel retain 44px hit areas, full viewport containment and center hit testing. Original supplied screenshots and generated concept images are not repository/runtime UI.

Browser plugin is not available; testing uses Linux Chromium/software WebGL with emulated touch/viewports. It does not establish physical iPhone/Android/Safari or notch behavior. The existing non-fatal Phaser chunk warning remains. Art has static idle frames rather than new character animations. Generated assets and their source provenance are documented in `ART_DIRECTION.md`.


## Explicit hero/enemy turn presentation — 2026-10-13

The resolver now returns independent render-only states/events after the hero and enemy stages. Both retain the original beat and frozen intent. The UI presents cyan hero → pink enemy → next living hero, one second per stage. Visible HP/barriers and logs advance with that stage; final outcome and next intent wait until presentation completes. Interruption or source defeat displays a canceled enemy turn, with no false attack effect. The final state still commits/saves once immediately; numeric rules and version-3 saves are unchanged.

Strict typecheck, ESLint, all **34 Node tests across 3 files**, production Pages build and whitespace checks passed. The full browser run passed **22 of 23 cases (5.2 minutes)**. The remaining existing normal-motion canvas test had accidentally received the new screenshot clock pause, preventing Phaser input frames from progressing; restored its original running clock and reran it successfully (**1 passed, 12.4 seconds**). All 23 scenarios therefore passed across the full run and corrected targeted rerun; the publication workflow runs all 23 together on the final revision before deployment.

New coverage verifies separate hero/enemy HP, stage-specific logs, held frozen intent, actor highlights, disabled controls, next-hero selection after both stages, reduced-motion cancellation, single saved command, skip, restart with pending timers, mid-turn reload, hidden-tab completion and delayed victory without a defeated attacker striking. Playwright’s clock controls screenshot timing only in the three dedicated phase cases; the lifecycle and legacy canvas tests use real running timers. Existing complete victories/defeats, cooldowns, previews, storage and four mobile sizes still pass.

Visual inspection covered actual normal-motion desktop hero/enemy screenshots, 390×844 reduced-motion interrupted response and 844×390 normal-motion hero/enemy screenshots. Phone confirmation anchors the arena below the sticky phase banner, rather than attempting to scroll the already-sticky banner. Tests check the whole phone field remains visible, the skip button is reachable, and canvas input remains accurate after scrolling. An additional landscape production check passed field/banner separation, 44px skip reachability, no horizontal overflow, exact enemy HP changes and completion. Screenshots are preserved outside the repository in `/workspace/asterveil-deliverables/turn-phases/`.

Application output: 51.45 KB JS / 15.84 KB gzip; 24.05 KB CSS / 6.30 KB gzip. Artwork and Phaser bundle are unchanged; the existing non-fatal chunk warning remains. Evidence is Linux Chromium/software WebGL with emulated touch, not physical mobile/Safari verification.

## Direct target casting; confirmation sheet removed — 2026-10-13

The user requested removing the recurring complete-outcome confirmation sheet. Selecting a hero or skill still does not advance a beat; tapping a legal target now commits immediately through the existing resolver. This works with target buttons, canvas targets and keyboard activation. Optional **วิธีใช้…** remains available for skill rules. Announced enemy intent, forecasts, sequential hero/enemy presentation, the skip control and automatic next-hero selection remain. The modal, predicted HP ledger, confirmation/cancel handlers, pending target and overlay CSS are removed. Rules, artwork and compatible version-3 saves are unchanged.

Strict typecheck, ESLint, all **34 Node tests**, production Pages build and whitespace checks passed. The full production browser run passed **21 of 23 cases (4.5 minutes)**. Two test harness issues remained: minimal scrolling left a 320px ally-target edge outside the viewport; immediately scrolling after rotation could hold a detached element from the media-query rerender. The affected target check now centers and measures the current element atomically, retaining the same whole-button bounds, 44px size and real center hit-test assertions. Both affected cases passed on the final production build (**2 passed, 19.4 seconds**). The publication workflow runs all 23 cases together before deployment.

Coverage now exercises direct casts without dialog/confirmation elements, free hero/skill selection and optional help, a queued repeated target click producing only one saved command, invalid targets, actual canvas Guard, keyboard casting, exact cooldowns and support effects, replay/reload/restart/hidden-tab completion, complete offensive/defensive wins and both basic-attack priorities losing. Touch controls pass at 320×568, 390×844, 600×800 and 844×390; an uncast skill survives portrait/landscape/desktop rotation before executing the full four-survivor mobile route.

Inspected actual desktop and phone HUD screenshots for absence of the sheet/empty preview band, clear cast instruction, skill details, targets and unchanged party/intent hierarchy. Final screenshots are preserved outside the repository in `/workspace/asterveil-deliverables/direct-casting/`. Application output is 46.67 KB JS / 14.61 KB gzip and 21.67 KB CSS / 5.74 KB gzip. The existing non-fatal Phaser bundle warning remains. Evidence is Linux Chromium/software WebGL and emulated touch; physical devices/Safari remain unverified.


## Single-screen portrait phone gameplay — 2026-10-13

User requested vertical mobile play with no page scrolling. Portrait widths up to 600px now fill the visible dynamic viewport, respect safe areas and reserve space for all hero/skill/target controls. The field adapts to remaining height; enemy HP stays on the field, while compact roster cards carry hero HP/class/lane. Duplicate enemy/timeline/roster-skill bands and footer are omitted in this mode. Optional information opens via ⓘ; casting, completion and restart never scroll the portrait page.

Strict typecheck, lint, 34 Node tests, the Pages build and whitespace checks passed. The expanded browser suite contains 27 cases. Its full run passed 25 cases (4.9 minutes); two tall-phone cases found a real residual canvas touch after closing optional information, producing an extra command. The UI now blocks canvas input while information is open and filters its closing touch, while direct DOM targets remain immediate. All 7 affected final-build cases passed (31.8 seconds), including both failures, phone HP/barrier synchronization and all four new viewport checks. The final publication workflow gates deployment on all 27 cases together.

New checks cover 320×568, 390×640, 390×844 and 600×800: no document overflow or scroll offset, the entire field and all roster/header/action/target buttons visible with 44px hit areas and actual center hit testing, four ally targets, shields, optional information/return, start button completely inside its field, attempted scroll, changed viewport height, simulated 20px top/34px bottom insets and replay with a fallen Mage. Existing full victories/defeats, touch/canvas input, rotation, stages, cooldowns and storage checks remain. A narrow initial overlay button was measured partially clipped and compacted; updated checks verify its full containment.

Inspected actual 320px and 390px single-screen screenshots: all primary controls are visible without scrolling; field HP, cards, skill powers, cooldown copy and targets retain contrast and separation. Screenshots are preserved under `/workspace/asterveil-deliverables/portrait-screen/`, outside the repository. Final application output is 48.81 KB JS / 15.22 KB gzip and 26.79 KB CSS / 6.75 KB gzip. Artwork and the non-fatal Phaser chunk warning are unchanged. Evidence remains Linux Chromium/software WebGL with emulated touch. Simulated insets/dynamic sizing are not physical iOS Safari verification.


## Targets on battlefield characters — 2026-10-13

Removed the lower target-card list. Native, accessible controls now follow Phaser actor rectangles directly in the arena, with ≥44px hit areas, legal-target outlines and selected-skill markers. Resize/rotation updates the same rectangle map as the sprites. Invalid support targets preserve the active hero/skill. Prayer can be triggered through any living ally while saving the unchanged party command target. Scene input, target validation, save format/version and combat math remain authoritative as before.

Passed strict typecheck, lint, all **34 Node tests**, the production Pages build and whitespace checks. The full final local browser suite passed **all 28 cases (4.8 minutes)**. The added touch case checks absence of dock targets, field-control containment/reachability, actual touch coordinates, legal/invalid healing without accidental hero changes, and Prayer via a different living ally. Existing cases now cast through the field controls, including complete offensive/defensive wins, both basic-attack defeats, keyboard activation, four mobile sizes, viewport/inset changes, rotation, saved fallen heroes and sequential stages. The Guard coordinate test uses a physical pointer coordinate so the real field control receives input rather than asking Playwright to click the covered canvas element.

Inspected desktop and 320px/390px field targeting screenshots for placement, outlines, marker contrast, HP separation and absence of the dock target row. An additional real-browser check verified current Raider intent text and its visible 38px band while Prayer targets were displayed. Screenshots are preserved in `/workspace/asterveil-deliverables/field-targets/` outside Git. Production output: app JS 49.49 KB / 15.43 KB gzip; CSS 25.36 KB / 6.47 KB gzip. Original art and the existing non-fatal Phaser warning are unchanged. Evidence remains Linux Chromium/software WebGL and emulated touch; physical Safari is unverified.
