# Asterveil: Rise Beyond

A small, playable **Fateweave tactical reaction combat** prototype. This is an independent browser-first project in `wnau34-nptrn/asterveil-fateweave`. The original Godot project is not a dependency and no code, assets, or history are imported from it.

## Play in your browser

GitHub Pages target: **https://wnau34-nptrn.github.io/asterveil-fateweave/**. Availability depends on a successful **Publish playable prototype** workflow deployment. The interface is in Thai. Click **เริ่มต่อสู้**; use the lower command dock to choose a hero, action and target; review the predicted outcome; click **ยืนยันคำสั่งนี้** when ready. No installation or account is required to play the published static game.

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

1. กด **เริ่มต่อสู้** หรือเล่นต่อจากเซฟที่รองรับเวอร์ชันปัจจุบัน
2. อ่านแถบ **ศัตรูจะทำอะไรหลังยืนยัน**: ผู้โจมตี เป้าหมาย ประเภท และความเสียหาย เปิดแผนอีก 2 จังหวะเมื่อต้องการวางแผน
3. เลือกฮีโร่ → คำสั่ง → เป้าหมาย ทุกคนมีโจมตีพื้นฐานและสกิลเฉพาะ 2 อย่าง ปุ่มแสดงเหตุผลเมื่อใช้ไม่ได้และจำนวนจังหวะที่เหลือของคูลดาวน์
4. ตรวจผลล่วงหน้า: แยกคำสั่งของคุณกับการตอบโต้ของศัตรู แสดงเลือด/โล่ที่เปลี่ยน คำเตือนเพื่อนล้ม และการโจมตีถัดไปจริง
5. กด **ยืนยันคำสั่งนี้** เพื่อเดิน 1 จังหวะ แสดง **เทิร์นฮีโร่ (สีฟ้า) → เทิร์นศัตรู (สีชมพู) → เลือกสมาชิกคนถัดไป** เลือด/โล่เปลี่ยนตามช่วงที่เกิดผล หากหยุดศัตรูได้จะขึ้นว่าศัตรูไม่ได้โจมตี กด **ดูผลทันที** เพื่อข้ามการแสดงผล เกมจะเลือกสมาชิกคนถัดไปอัตโนมัติ วน เอกิส → ไลรา → ไอรา → เซเรน และข้ามคนที่ล้มแล้ว แตะเลือกคนอื่นเองได้ **ยกเลิก** / Esc ไม่เปลี่ยนตัวหรือเดินจังหวะ การเลือกเป้าหมายยังไม่ออกคำสั่ง
6. กำจัดศัตรูทั้งสองโดยมีฮีโร่เหลืออย่างน้อย 1 คน เป้าหมายเสริมคือรอดครบ **4 คน** กด **เล่นอีกครั้ง** เพื่อเริ่มใหม่

### Four classes, front 2 / back 2

| Hero / อาชีพ | Lane | HP / basic attack | Two class skills |
|---|---|---|---|
| Aegis / เอกิส · อัศวิน | Front | 76 / 10 | ตั้งรับแทน: รับการโจมตีแทนคนที่ศัตรูเล็ง ลดความเสียหาย 65%; กระแทกโล่: 18 และหยุดการโจมตีกายภาพจากเป้าหมายในจังหวะนี้ |
| Lyra / ไลรา · นักดาบ | Front | 56 / 16 | ติดตรา: 3 จังหวะรวมจังหวะนี้; ฟันเจาะจุด: 28 หรือ 50 เมื่อเป้าหมายติดตรา |
| Eira / ไอรา · จอมเวท | Back | 48 / 11 | ศรเวท: 26; โล่เวท: โล่ 14 ให้เพื่อน 1 คน |
| Seren / เซเรน · นักบวช | Back | 46 / 8 | รักษา: ฟื้น 20 ให้เพื่อน 1 คน; พรฟื้นฟู: ฟื้นคนละ 10 ให้ทั้งทีม |

- Physical attacks target a living front hero first; once both front heroes fall, back heroes become eligible. Energy attacks can target the back row. Preferred targets and any fallback are frozen when announced. Killing the announced attacker cancels its event.
- Guard applies 65% reduction, rounds the remaining damage up, then uses Aegis's barrier before HP. Shield Bash interrupts only the current **physical** attack if its source is the chosen target; an energy attack continues unless its source dies.
- Mark adds 22 to Lyra's next basic attack (38 total) or Precision Strike (50 total), then is consumed. Other heroes do not consume it. Mark itself deals no damage.
- Shield Bash, Precision Strike, Arcane Bolt, Ward and Heal have a 3-beat cooldown: used on beat 1, available on beat 4. Prayer has 4 beats. Basic Attack, Guard and Mark have no cooldown. Cooldowns advance with committed battle beats, not time, and survive reload.
- Ward gives a non-stacking 14-point barrier that persists until absorbed. Healing happens before the enemy response, cannot exceed maximum HP, and never revives downed heroes. A fully healthy target/party cannot be healed.

The former Crystal, Redirect and Counter systems are removed. No MP, initiative queue, reserve switching or movement grid is implemented. There is exactly one manually chosen hero action and at most one frozen enemy response per beat.

Raider has 64 HP, Brute 164. The repeating intent pattern is physical Slash 12 → energy Bolt 28 → physical Slash 12 → physical Crush 26 → energy Shadow Knife 14 → energy Bolt 28. Dead sources are skipped when announcing the next event. Forecasts assume currently living actors remain alive; the preview shows the exact next event after the proposed decision.

The full-width field and lower command dock follow the supplied Brave Frontier layout reference. Front/back now describe actual physical targeting rules. Four original hero portraits select the actor, and only that class's three commands appear. The modern classic-JRPG HUD places two true enemy HP bars and the frozen intent below the illustrated battlefield. Four illustrated hero cards use a 2×2 grid with class/lane, HP/barrier and actual skill readiness. Phones stack the card grid above the three skill buttons and portrait targets; desktop places team and commands beside each other. Expanded tactics and history sit inside the help disclosure. Preview is a native dialog on all screen sizes; results scroll independently of confirmation/cancel. Closing, backdrop taps and Esc cancel without advancing; rotation preserves a pending choice. After confirmation, the field shows the hero action and then its frozen enemy response for one second each, with distinct phase colors and actor/recipient highlights. Only the current stage’s HP/barriers/log appear; controls wait until both stages finish, or the player chooses **ดูผลทันที**. Confirming from the lower dock reveals the field below the sticky phase banner. Selection then advances to the next living member in roster order; reload reconstructs that selection from the last committed command. Battle outcomes keep the final actor selected. Help, forecasts and history remain disclosures below the dock. Thai fonts use installed system fallbacks.

Both tested basic-attack priorities lose. An 11-beat offensive plan and a 16-beat defensive plan each use all four classes and win with all four standing. These are regression examples, not a claim of final balance; see [balance validation](docs/BALANCE_VALIDATION.md).

Encounter ID is **veil-siege**, content version **3**. Old three-member saves restart safely instead of replaying commands under the new party and rules. Refresh the published page to load this update.

## Architecture

```text
src/core/battle/          Pure serializable state, commands, validation, resolution, preview, replay
src/core/save/            Versioned command-replay persistence, injected storage port
src/content/heroes/       Typed hero definitions
src/content/enemies/      Typed enemy definitions
src/content/encounters/   Encounter intent pattern, skills, cooldowns and numeric rules
src/game/scenes/          Thin Phaser rendering/input adapter and short effects
src/game/visuals/         Renderer palette tokens
src/ui/                  Accessible DOM controls, preview/log, responsive CSS
src/platform/            Safe browser-storage adapter
tests/                   Rules and save tests; browser/ contains Playwright gameplay tests
public/assets/           Original favicon and three generated WebP art files (unit/portrait atlases and ruins backdrop)
docs/                    Direction, integration plan, roadmap, validation
.github/workflows/       Quality CI and user-authorized GitHub Pages build/test/deployment
```

`resolveCommand` is authoritative and immutable. `previewCommand` calls that same resolver; rendering cannot affect its result. Commands carry a beat number to reject stale previews. Simulation has no Phaser, DOM, clock, or random-number dependency and runs under Node. State commits and saves once immediately, before the presentation lock. Resolver-provided hero/enemy snapshots are render-only and keep the original beat/intent until presentation finishes. Skipping or hiding the tab displays the already committed result; restart cancels queued presentation timers. Reload replays the saved command once. Reduced motion retains static one-second phase labels while suppressing effects. Saves contain versioned encounter IDs and commands and are validated by replay; corrupt or incompatible saves start fresh. Unavailable/quota-limited storage leaves the session playable. Saves support up to 5,000 commands; no cross-device syncing is provided.

## Current limitations

- One encounter with original generated chibi artwork, six portrait/unit frames, a static ruin backdrop and lightweight VFX. No music, sound or animated character states. WebP art is approximately 1.53 MiB combined; original concept/reference screenshots are not runtime UI.
- The supplied Battle (C) and World Exploration (B) images guide the original ruins/waterfalls, blue/gold lighting and navy/gold HUD foundation. Key Art (A) has not been supplied. Reference images are not committed or used as production assets.
- World exploration, progression, equipment, backend, multiplayer, billing, online challenges, and Capacitor are future work, not implemented.
- Full Phaser runtime is approximately 1.37 MB minified / 357 KB gzip; Vite reports a large-chunk warning. Optimization needs measurement before a mobile release.
- Automated browser validation is Chromium on Linux with software WebGL and emulated touch viewports. This is **not** real Windows/Android/iOS device or Safari validation.
- Local save is tied to this origin and encounter content version. Increment the content version when rules change.

See [modern HUD spec](docs/UI_DESIGN.md), [validation](docs/VALIDATION.md), [gameplay direction](docs/GAMEPLAY_DIRECTION.md), [art direction](docs/ART_DIRECTION.md), and [roadmap](docs/DEVELOPMENT_ROADMAP.md).
