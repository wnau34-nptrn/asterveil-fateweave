# Asterveil: Rise Beyond

A small, playable **Fateweave tactical reaction combat** prototype. This is an independent browser-first project in `wnau34-nptrn/asterveil-fateweave`. The original Godot project is not a dependency and no code, assets, or history are imported from it.

## Play in your browser

GitHub Pages target: **https://wnau34-nptrn.github.io/asterveil-fateweave/**. Availability depends on a successful **Publish playable prototype** workflow deployment. The interface is in Thai. Click **เริ่มต่อสู้**; use the current hero’s skill buttons to read a floating explanation, then tap a marked character on the battlefield to cast immediately. Turns follow Knight → Duelist → Mage → Priest; other heroes cannot issue commands. Open **ⓘ** for optional skill details. The **ศึก 1/3 ▾** button selects among three independent battles; each keeps its own progress on this device. No installation or account is required to play the published static game.

Characters stand on the courtyard in staggered front/back pairs, with contact shadows at their feet. The formation and character touch areas resize with the field, including single-screen desktop, tablet and mobile play.

The first three hero commands offer optional Thai advice: Duelist Mark, a legal Mage Bolt/Ward, then Knight Guard (or physical boss Bash). Hints use the current SPD owner and never suggest a different actor. They show actual turn feedback during presentation, can be dismissed/reopened independently, and disappear after three committed hero commands.

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

1. กด **เริ่มต่อสู้** แล้วดูแถบลำดับเทิร์นด้านบน: **ตอนนี้ → ถัดไป** พร้อมรูปตัวละครและ SPD
2. เมื่อเริ่มแต่ละรอบ ฮีโร่และศัตรูที่ยังยืนอยู่เรียง **SPD มากไปน้อย** คนละ 1 ครั้งต่อรอบ ความเร็วเท่ากันใช้ลำดับรายชื่อฮีโร่ก่อน ตามด้วยศัตรู ลำดับรอบปัจจุบันคงที่และข้ามตัวที่ล้ม
3. สั่งได้เฉพาะฮีโร่เจ้าของเทิร์น กดสกิลเพื่ออ่านหน้าต่างลอย แล้ว **แตะตัวละครในสนามเพื่อใช้ทันที** ปิดด้วย × หรือ Escape การอ่านหรือเปลี่ยนสกิลไม่เดินเทิร์น
4. ศัตรูโจมตีเมื่อถึงเทิร์นตัวเอง บางครั้งฮีโร่ลงมือติดกันได้ ดูแถบ **การโจมตีศัตรูถัดไป** เพื่อวางแผนป้องกัน การคาดการณ์เปลี่ยนได้เมื่อมีคนล้ม
5. แสดงผลของแต่ละตัว 1 วินาที สีฟ้าสำหรับฮีโร่ สีชมพูสำหรับศัตรู ปุ่ม **ดูผลทันที** ข้ามการแสดงผล จากนั้นเกมเลือกฮีโร่ถัดไปเอง สั่งการคนอื่นไม่ได้ แต่ยังเลือกเพื่อนเป็นเป้าสกิลรักษา/ป้องกันได้
6. กำจัดศัตรูทุกตัวโดยมีฮีโร่เหลืออย่างน้อย 1 คน เป้าหมายเสริมคือรอดครบ **4 คน** กด **เล่นอีกครั้ง** เพื่อเริ่มศึกเดิมใหม่

### Four classes, front 2 / back 2

| Hero / อาชีพ | Lane | SPD | HP / Attack | Class skills |
|---|---|---|---|---|
| Aegis / เอกิส · อัศวิน | Front | 80 | 76 / 10 | Guard รับแทนเป้าที่ศัตรูถัดไปเล็ง ลด 65%; Bash 18 หยุดเทิร์นกายภาพถัดไปของเป้าหมาย |
| Lyra / ไลรา · นักดาบ | Front | 120 | 56 / 16 | Mark อยู่ 2 รอบรวมรอบนี้; Precision Strike 28 หรือ 50 เมื่อเป้าหมายติดตรา |
| Eira / ไอรา · จอมเวท | Back | 100 | 48 / 11 | Bolt 26; Ward โล่ 14 ให้เพื่อน 1 คน |
| Seren / เซเรน · นักบวช | Back | 60 | 46 / 8 | Heal 20 ให้เพื่อน 1 คน; Prayer ฟื้นคนละ 10 ให้ทั้งทีม |

- Default two-enemy initiative is **Lyra 120 → Raider 110 → Eira 100 → Aegis 80 → Brute 70 → Seren 60**. The solo boss uses SPD 70. SPD is content-defined; no speed-changing skill is currently included. The resolver re-sorts surviving actors at each round boundary and preserves the current round's queue.
- Enemy moves cycle by that enemy's round, once per round. Physical attacks screen the back row while a front hero survives; energy can reach the rear. Forecast targets assume current survivors remain alive; the real target is fixed at the start of the enemy's actual turn. A defeated enemy is removed from the queue without attacking.
- Guard covers the displayed next enemy attack until it occurs or Aegis's next turn begins. It redirects only that attacker/target, reduces damage by 65%, rounds up, then absorbs through Aegis's barrier. Bash deals damage and interrupts the chosen enemy's next turn only if its scheduled attack is physical; energy is not interrupted.
- Mark deals no damage, lasts through the next round and expires as the following round begins. Lyra's next Attack/Strike on that target consumes it for +22. Other heroes leave the Mark intact.
- Bash, Strike, Bolt, Ward and Heal cool down for **2 rounds**: used in round 1, ready in round 3. Prayer takes 3 rounds. Attack, Guard and Mark have no cooldown. Cooldowns and expiry advance by round boundaries, never animations or elapsed time.
- Ward gives a persistent, non-stacking 14-point barrier. Healing clamps to maximum HP and never revives fallen heroes. Prayer can be cast by tapping any living ally; its saved target is the whole party.

The HUD fits the viewport without document scrolling. The persistent phase/order band shows four upcoming actor slots on compact screens and six on larger screens, with current/next labels, SPD and next-round labels. Native skill explanations float without resizing the field. Optional rules, enemy forecasts and history stay in ⓘ. Original art and ground contact/staggered formation remain; the smallest fields reserve separate ≥44px ally targets.

Combat commits and saves the hero action plus any following consecutive automatic enemy turns once, then presents one snapshot per actual actor in sequence. Adjacent hero turns have no invented enemy response. The next owner becomes actionable only after presentation finishes or is skipped. Reload reconstructs the same round/queue/HP/cooldowns without repeating damage. Restart cancels presentation timers. The game screen stays stationary.

## Three battles

| Battle | Enemies / threat | Tested alternatives |
|---|---|---|
| ศึกปิดรอยแยก | Raider 78 HP / SPD 110 + Brute 200 HP / SPD 70; original attack powers preserved | Mark combo; unmarked strikes and sustain; guided opening |
| ศึกเงาล่าแนวหลัง | Hunter 90 HP / SPD 110 + Channeler 180 HP / SPD 70; rear energy pressure | Mark/Ward/Guard route; unmarked strikes/healing |
| ศึกผู้คุมรอยแยก | One 350-HP / SPD 70 boss, physical/energy alternating by round | Mark combo/interruption; unmarked strikes/healing |

Seven concrete routes win with all four heroes. The five tested fixed-priority, current-owner Attack-only policies lose; these examples are not an exhaustive or final balance claim. See [balance validation](docs/BALANCE_VALIDATION.md).

Encounter versions are **veil-siege / 5**, **rear-ambush / 3**, and **rift-warden / 3**. Earlier turn-system saves safely start fresh. Keys/envelope stay stable; each battle has independent validated command replay and selected-only restart. The selector is practice, without expedition/progression/rewards. Denied storage retains switching progress in the current tab, but cannot survive refresh.

## Architecture

```text
src/core/battle/          Pure serializable state, commands, validation, resolution, preview, replay
src/core/save/            Versioned command-replay persistence, injected storage port
src/content/heroes/       Typed hero definitions
src/content/enemies/      Typed enemy definitions
src/content/encounters/   Encounter intent pattern, skills, cooldowns and numeric rules
src/game/scenes/          Thin Phaser rendering/input adapter and short effects
src/game/visuals/         Renderer palette tokens
src/ui/                  Accessible DOM controls, optional skill help/log, responsive CSS
src/platform/            Safe browser-storage adapter
tests/                   Rules and save tests; browser/ contains Playwright gameplay tests
public/assets/           Original favicon and three generated WebP art files (unit/portrait atlases and ruins backdrop)
docs/                    Direction, integration plan, roadmap, validation
.github/workflows/       Quality CI and user-authorized GitHub Pages build/test/deployment
```

`resolveCommand` is authoritative and immutable. `previewCommand` remains a pure simulation API used by rules tests; the UI does not show complete predicted outcomes. Rendering cannot affect combat results. Commands carry a beat number to reject stale commands. Simulation has no Phaser, DOM, clock, or random-number dependency and runs under Node. State commits and saves once immediately, before the presentation lock. Resolver-provided snapshots contain each actual actor turn in order; only the final state is authoritative and saved. Skipping or hiding the tab displays the already committed result; restart cancels queued presentation timers. Reload replays the saved command once. Reduced motion retains static one-second phase labels while suppressing effects. Saves contain versioned encounter IDs and commands and are validated by replay; corrupt or incompatible saves start fresh. Unavailable/quota-limited storage leaves the session playable. Saves support up to 5,000 commands; no cross-device syncing is provided.

## Current limitations

- Three independently selectable encounters using original generated chibi artwork, six portrait/unit frames, a static ruin backdrop and lightweight VFX. No music, sound or animated character states. WebP art is approximately 1.53 MiB combined; original concept/reference screenshots are not runtime UI.
- The supplied Battle (C) and World Exploration (B) images guide the original ruins/waterfalls, blue/gold lighting and navy/gold HUD foundation. Key Art (A) has not been supplied. Reference images are not committed or used as production assets.
- World exploration, progression, equipment, backend, multiplayer, billing, online challenges, and Capacitor are future work, not implemented.
- Full Phaser runtime is approximately 1.37 MB minified / 357 KB gzip; Vite reports a large-chunk warning. Optimization needs measurement before a mobile release.
- Automated browser validation is Chromium on Linux with software WebGL and emulated touch viewports. This is **not** real Windows/Android/iOS device or Safari validation.
- Local save is tied to this origin and encounter content version. Increment the content version when rules change.

See [modern HUD spec](docs/UI_DESIGN.md), [validation](docs/VALIDATION.md), [gameplay direction](docs/GAMEPLAY_DIRECTION.md), [art direction](docs/ART_DIRECTION.md), and [roadmap](docs/DEVELOPMENT_ROADMAP.md).


Skills open a nonmodal floating window automatically. It shows the selected owner's ability, power/conditions, cooldown and target availability. Close with × or Escape, or tap a legal field target directly; there is no extra confirmation step. Cooling skills can be inspected but have no valid cast target. Allies can receive support skills while their own command cards remain disabled. The popup fits the viewport and does not move the arena or scroll the game.
