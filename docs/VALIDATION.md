# Prototype validation — 2026-10-12

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
