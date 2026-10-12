# Asterveil: Rise Beyond

A small, genuinely playable **Fateweave tactical reaction combat** prototype. This is an independent browser-first project in `wnau34-nptrn/asterveil-fateweave`. The original Godot project is not a dependency and no code, assets, or history are imported from it.

## Play in your browser

GitHub Pages target: **https://wnau34-nptrn.github.io/asterveil-fateweave/**. Availability depends on a successful **Publish playable prototype** workflow deployment. Click Start encounter; choose a hero, action and target; review the predicted outcome; confirm when ready. No installation or account is required to play the published static game.

Public Pages publication was explicitly requested after the initial prototype. The workflow builds and tests the full browser gameplay suite on the production subpath before uploading `dist/`, then deploys with GitHub's official Pages actions. It publishes the current prototype branch and `main`; no automatic merge is performed. If Pages cannot be enabled by Actions, a repository administrator must choose **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Set the Pages source to **GitHub Actions**, even if an older branch-based/Jekyll site is already enabled. Otherwise GitHub's separate Jekyll workflow can publish raw Vite source and overwrite the tested game build. The publishing token can deploy artifacts but GitHub rejects changing this administration setting (`403`), so the owner must select the source once in Settings. The game publishing workflow does not attempt that privileged operation.

## Stack and prerequisites

- Node.js **24.x** (validated on 24.19.0), npm 11.x, Git, a modern browser with Canvas/WebGL.
- Phaser **4.2.1**, TypeScript **5.9.3** in strict mode, Vite **8.3.4**, Vitest **5.0.4**, ESLint **10.12.0**.
- Playwright **1.64.0** is a development-only browser test dependency.

Stable versions and engine requirements were checked against npm before installation. TypeScript 7.0.2 was available, but `typescript-eslint@8.71.1` supports TypeScript `<6.1`; the project pins the verified compatible 5.9.3 compiler. Node 24 satisfies the selected Vite, Vitest, and ESLint requirements. Exact versions and `package-lock.json` make installs reproducible.

## Install and run (including Windows)

Install Node.js 24 LTS and Git for Windows, then open PowerShell or a terminal:

```powershell
git clone https://github.com/wnau34-nptrn/asterveil-fateweave.git
cd asterveil-fateweave
git switch feature/fateweave-initial-prototype
npm ci
npm run dev
```

Open **http://localhost:5173**. Stop the server with Ctrl+C. There are no environment variables, API keys, backend, or account requirements. To test on another device on your LAN, use Vite's printed Network URL and permit the local port through your Windows firewall.

## Commands

```sh
npm run dev          # Vite development server
npm run typecheck    # strict TypeScript, including test/config files
npm run lint         # ESLint
npm test             # Node-only rules and storage tests
npm run test:watch   # Vitest watch mode
npm run build        # typecheck + production build in dist/
npm run build:pages  # production build for /asterveil-fateweave/ hosting
npm run preview      # serve the production build locally
```

Optional browser tests:

```sh
npx playwright install chromium
npm run test:browser
```

An installed system Chromium can be used without downloading a browser. Linux:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser
```

PowerShell equivalent (adjust to your Chromium path):

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:\path\to\chrome.exe'
npm run test:browser
```

## How to play

1. Click **Start encounter**. A previous local battle resumes automatically if available.
2. Read the current **Enemy Intent**: source, target, damage, attack type, and redirectability. The next two planned beats help you prepare; they assume the current actors survive and are recalculated when an actor falls.
3. Select a living hero using their card or character in the arena.
4. Select an action and a valid target. Disabled actions/targets explain their requirements.
5. Review the exact **player action and enemy response**, including HP, Counter, barrier, canceled intent, lethal-hit warnings and the next announced intent after this choice.
6. Click **Confirm action** to commit, or **Cancel** / Esc to reconsider. Selecting an action or target never commits it.
7. Continue until **Victory** or **Defeat**. Any surviving hero can win, but the optional challenge is to keep all three standing. The result reports survivors, party HP and **Party intact** or **Costly victory**. **Restart** / **Play again** starts a fresh encounter and replaces the saved battle.

There is one manually chosen primary action per beat. No timer, QTE, random damage, battle movement, or automatic reaction chain.

### Prototype rules

| Entity/action | Implemented rule |
|---|---|
| Aegis / Guardian | 64 HP; Attack 10; Guard |
| Lyra / Tracer | 44 HP; Attack 16; Mark; +22 against Marked/Exposed enemies (38 damage total), consumes both statuses |
| Eira / Weaver | 42 HP; Attack 11; Redirect |
| Veil Raider | 38 HP; physical Slash 9, not redirectable |
| Rift Brute | 90 HP; energy Rift Bolt 30, redirectable; physical Crushing Blow 22, not redirectable |
| Guard | Protect the announced target. Aegis intercepts and takes 35% of announced damage, rounded up; existing barrier absorbs afterward. Survive to earn 1 Counter, cap 2. |
| Mark | One enemy marked for 3 beats including the committed beat. Marking again refreshes duration. |
| Redirect | Spend 1 Counter; only the current redirectable energy attack. Target a living Marked enemy (including the source) or charged Crystal. |
| Redirect to enemy | Exact announced damage, consumes Mark, exposes target through the next beat. No additional reaction is triggered. |
| Energy Crystal | 1 charge. Absorbs the entire redirected energy attack, grants 8 barrier to each living hero. Barrier does not stack and persists until absorbed. |

The encounter intent pattern is Raider Slash → Brute Bolt → Raider Slash → Brute Crush. Dead sources are skipped **when announcing the next event**. If a preferred hero is already down, a living hero is selected at announcement. The displayed event never changes after confirmation; killing its source cancels it.

Try **Guard Lyra on beat 1 → Eira Redirect to Crystal on beat 2** to see a defensive intervention. The balance update makes blind Raider-first attacks lose. An offensive route remains viable by prioritizing Brute, but loses a hero. Guard/Mark, Crystal defense and marked-enemy Redirect each have tested nine-beat routes that keep the whole party standing. Mark is now worth its setup: Mark → Lyra Attack eliminates a full-HP Raider in two beats, while two unmarked attacks leave 6 HP. Crystal is optional; killing a source or intercepting its hit are useful alternatives. See [balance validation](docs/BALANCE_VALIDATION.md) for concrete route comparisons.

Encounter content version is now **2**. Saved version-1 battles start fresh rather than replaying old choices under new damage rules. Refresh the published page and start a new encounter to play the update.

## Architecture

```text
src/core/battle/          Pure serializable state, commands, validation, resolution, preview, replay
src/core/save/            Versioned command-replay persistence, injected storage port
src/content/heroes/       Typed hero definitions
src/content/enemies/      Typed enemy definitions
src/content/encounters/   Encounter intent pattern, crystal and numeric rules
src/game/scenes/          Thin Phaser rendering/input adapter and short effects
src/game/visuals/         Renderer palette tokens
src/ui/                  Accessible DOM controls, preview/log, responsive CSS
src/platform/            Safe browser-storage adapter
tests/                   Rules and save tests; browser/ contains Playwright gameplay tests
public/assets/           Original lightweight favicon; characters and ruins use runtime geometry
docs/                    Direction, integration plan, roadmap, validation
.github/workflows/       Quality CI and user-authorized GitHub Pages build/test/deployment
```

`resolveCommand` is authoritative and immutable. `previewCommand` calls that same resolver; rendering cannot affect its result. Commands carry a beat number to reject stale previews. Simulation has no Phaser, DOM, clock, or random-number dependency and runs under Node. State commits and saves immediately, before the short presentation lock. Hidden tabs release that lock without advancing the battle. Saves contain versioned encounter IDs and commands and are validated by replay; corrupt or incompatible saves start fresh. Unavailable/quota-limited storage leaves the session playable. Saves support up to 5,000 commands; no cross-device syncing is provided.

## Current limitations

- One encounter, original geometric chibi placeholders and lightweight VFX. No final art, music, or sound.
- The supplied Battle (C) and World Exploration (B) images guide the original ruins/waterfalls, blue/gold Crystal and navy/gold HUD foundation. Key Art (A) has not been supplied. Reference images are not committed or used as production assets.
- World exploration, progression, equipment, backend, multiplayer, billing, online challenges, and Capacitor are future work, not implemented.
- Full Phaser runtime is approximately 1.37 MB minified / 357 KB gzip; Vite reports a large-chunk warning. Optimization needs measurement before a mobile release.
- Automated browser validation is Chromium on Linux with software WebGL and emulated touch viewports. This is **not** real Windows/Android/iOS device or Safari validation.
- Local save is tied to this origin and encounter content version. Increment the content version when rules change.

See [validation](docs/VALIDATION.md), [gameplay direction](docs/GAMEPLAY_DIRECTION.md), [art direction](docs/ART_DIRECTION.md), and [roadmap](docs/DEVELOPMENT_ROADMAP.md).
