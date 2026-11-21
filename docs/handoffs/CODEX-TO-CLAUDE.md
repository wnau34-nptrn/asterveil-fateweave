## 2026-11-21 — P10 free-ticket gacha: spec, rules, server, 390px cabinet (Opus; claude/p10-gacha-* → game branch, PRs #327–#330)
- Owner: “ทำระบบกาชาก่อน”; 80-point exchange, 7.5% full over 15, else 1–2 shards, 96 tickets/28 days from existing sources, no sales → OD-58 + [spec](../design/GACHA_P10_SPEC_TH.md) (#327 merged).
- #328 core: `core/world/gacha.ts` (one seed per pull, 10 = 10×1, grants joined/duplicate/universal/shards/stored/unlocked), commands `gachaPull`/`gachaExchange` (config version checked), `rules.ts` `gacha` v1 + tickets on board/trio (24/week), opens after MAP2, save v66. Shard units mapped to P04-02 (dup 10, unlock 50).
- #329 server: ledger `gacha:<serial>` (+`detail` column), `GET /v1/gacha/history`, id-free telemetry `gacha`, import starts the wallet empty (D24 recommendation). No D1 migration needed.
- #330 UI: third hiring tab “ทอชะตา” (confirm → results from the committed entry, rates, exchange, history) with ART-UI-GACHA-003 R1 (owner pick “ใช้ R1 ทั้งหมด”; `scripts/build-gacha-art.py`, 2.83 MB, cabinet-only) on #212 key art; **owner approved look+motion 2026-11-21 “อนุมัติ”** ([validation](../validation/p10-gacha-2026-11-21/README_TH.md)). Codex PR #326 closed unmerged (imported via #330).
- Tests: typecheck, lint, `npm test` 2155+, gacha/server-gacha/gacha-sim, Playwright gacha (3) locally; CI per PR. Simulated: real rules, 2,000 players (spec §4).
- Open: owner confirmation of D24 + shard-unit mapping; staging load test with concurrent pulls; points icon thin at 24px (brief Codex if the owner asks); single-pull full-character reveal not yet in a clip; real devices.

## 2026-11-21 — Image-blank B4 (blurred placeholders) + B5 (lossy map atlases) (Sonnet; claude/image-blank-b4-b5 → game branch, PR #325)
- Owner: “ทำ B4 กับ B5 ต่อใน chat ใหม่”. Presentation/encoding only. Owner approved the images in their own words: “ภาพใช้ได้ merge ได้เลย”.
- B4: `scripts/build-lqip.py` → `src/ui/lqip.generated.ts` (8 paintings), `src/ui/lqip.ts` `trackLqip`, CSS at the end of `game-feel.css`; wired into title, camp backdrop, battle, story.
- B5: `tileset` 907→239 KB, `decor` 736→255 KB (q92, alpha lossless); masters in `assets-master/world/`, `scripts/build-lossy-world.py`, `WORLD_REV` `?v=`. `title_party` left as is (only 1.4×).
- Tests: typecheck, lint, Vitest 2136 pass, build, Playwright lqip/image-ready/lobby/story/world/battle-hud/portrait/combat/region pass; `image-ready.spec` camp test now gates the backdrop until after the click. Perf single sample: no blank images at screen switch; times noisy. [Validation](../validation/image-blank-b4-b5-2026-11-21/README_TH.md).
- Open: re-measure on a real phone.

## 2026-11-21 — P11-05 go-live check before the trio switch (Opus; claude/p11-05-trio-check → game branch, PR #324)
- Owner: “เริ่มข้อ 4” (check readiness before OD-52, Mon 23 Nov 2026 06:00 Bangkok = week 2969). No game code/rules/numbers changed; tests only.
- `tests/world-boss-trio-switch.test.ts` (shipped rules, clock pinned around 2026-11-22T23:00Z): calendar/reset, offline rules, Worker + World Boss object (warden to 05:59:59, three bars at 06:00 = floor(warden attempts ÷ 3) × 400 / min 1500, warden refused after, trio pays boss shards, warden `s-50` of 2968 claimable in 2969, closed in 2970, verify ok). `tests/browser/world-boss-trio-switch.spec.ts` (offline, Asia/Bangkok, 05:59 → 06:00:30): banner/page warden → trio, three guides, Kragmor fight drawn.
- Staging load test `trio=now` on the game branch passed (4×5 accounts, no 429/5xx, staging deleted). [Validation](../validation/p11-05-trio-check-2026-11-21/README_TH.md).
- Tests: typecheck, eslint, world-boss Vitest set (118 + 4 new), Playwright new spec; CI quality + browser on the PR. Owner action before the switch: none (avoid deploying around 06:00 Monday). Open: real switch on dev API, real devices.

## 2026-11-21 — Image-blank fix B1/B2/B3/B6 (Opus; claude/image-blank-fix → game branch)
- Owner: “ไม่ต้องการให้คนเล่นเห็นว่าภาพเป็นช่องว่าง…” → “ดำเนินการตามที่แนะนำ”. `ui/image-ready.ts` (`whenImagesReady`, cap 1800 ms draft, never throws), `ui/screen-images.ts` (camp/map/battle image lists); `GameShell.afterImages` holds the old screen with a loading button until the next one's main images decode; idle low-priority prefetch of the next screen; title preload in `index.html`; mid-battle save prefetches its encounter after 2.5 s on the title (immediate start blocked the main thread 4+ s). Presentation only.
- Result (Chromium 4G+CPU 4×, cold): no blank images on title/map/battle when shown (title 5.0 → 2.3 s, map 3.9 → 1.3 s, battle bg 6.4 → 1.6 s); camp still hits the cap when tapped at once. [Validation](../validation/image-blank-fix-2026-11-21/README_TH.md).
- Tests: image-ready.test (8), Vitest all, typecheck, lint, build; Playwright image-ready (new, 3) + world/keyboard/lessons/server-play/combat/story-p05/lobby-shots/update-banner/unit-loading (3 expectations updated for B6/async switch). Open: B4/B5 need owner image review; real-device decode time.

## 2026-11-20 — Same figure size in every fight; the first battle's coach no longer shrinks the field (Opus; claude/field-size-coach → game branch)
- Owner (first-battle 390px shot: figures smaller than other fights): “ดำเนินการทั้ง 2 ข้อ”.
- Coach: while a lesson shows, `#battle-coach` takes the `#unit-inspector` place (inspector hidden, back when hints end/dismissed); arena 425 → 473px.
- `fieldSlots`: a figure clears only the band of the nearest row above with a unit over it (else the top edge), not the tallest figure of every row; one large foe no longer shrinks the whole field. `foeLineRows`: of two non-boss lines, the one with a large foe stands at the bottom (rules unchanged: two foes in a column stay neighbours).
- Sizes (378×477, hero px): every non-boss fight 104–105 (first battle 98 → 104; with the coach 83 → ~104); boss fights unchanged (98, captain 83).
- Tests: field-layout (+ same size in every non-boss fight), foe-lines, full Vitest 2113, lint, typecheck, build; Playwright combat/battle-hud/status/team-five/field-a11 (64). Shot `docs/validation/field-size-2026-11-20/first-battle-390.png`. Chromium only.

## 2026-11-20 — Perf R11: shorter server retry (Sonnet; perf/r11-server-timeout → game branch)
- Owner: “เริ่ม R11”. `server-client.ts`: waited requests 3 attempts × 7 s (was 5 × 15 s), same requestId/seq each time; import/chat/report keep old limits; `onReconnecting` hook → shell shows “กำลังเชื่อมต่อใหม่…” at once. Numbers are drafts.
- Result (Chromium 390px, blackholed command): card 81.5 → 22.3 s, reconnecting note 60.9 → 7.2 s. [Validation](../validation/perf-r11-2026-11-20/README_TH.md). No real device/dev API.
- Tests: server-client-retry.test (6 new), Vitest all, typecheck, lint, build, Playwright server-play (7). Remaining audit items: none from R1–R11 except owner picks.

## 2026-11-20 — Perf R10: half-size DOM portraits (Opus; claude/perf-r10 → game branch)
- Owner: “ต่อ R10 เลย”. `scripts/portraits-half.py` builds `portraits*_half.webp` (256 px cells, same encoding as the master) + `portraits-half.json` revisions; `portrait(id)` uses them, `portrait(id, true)` keeps the 512 px master for the story figure; World Boss unchanged.
- Result (camp/map, starting team): portraits 1.55 → 0.67 MB, decoded 28 → 7 MiB (mercs sheet 4.93 MB/14 MiB → 1.45 MB/3.5 MiB). [Validation](../validation/perf-r10-2026-11-20/README_TH.md). Not owner-viewed.
- Tests: portraits-half.test (5), Vitest all, typecheck, lint, build, Playwright 9 specs (133; 5 world.spec atlas-name checks updated).

## 2026-11-20 — Perf R9: idle animations off the main thread (Opus; claude/perf-r9 → game branch)
- Owner: “ต่อ R9 เลย”. Measured idle main-thread time per screen (CPU 4×, 5 s): title 691 ms and map 184 ms came from `logo-glow` (animated `drop-shadow`) and `toast-life` (`visibility` keyframe). Toast keyframe drops `visibility`; the title glow is a second `aria-hidden` logo copy behind with a fixed glow, faded by opacity.
- Result: title 691 → 6 ms, map 184 → 38 ms per 5 s idle. [Validation](../validation/perf-r9-2026-11-20/README_TH.md) (glow still: fixed 22 px radius fading instead of a growing radius; not owner-viewed).
- Tests: Vitest all, typecheck, lint, build, Playwright world/keyboard/update-banner/lessons/ui-shots (117).

## 2026-11-20 — Perf R8: asset-cache service worker (Opus; claude/perf-r8 → game branch)
- Owner: “ต่อ R8 เลย”. Build writes `sw.js` (vite plugin `fateweave-service-worker`: `src/platform/service-worker.js` + build id + SHA-256 manifest of `assets/`, music excluded); cache-first by path+hash, prunes on activate, never touches pages/version.json/API/music. Registered in production only, not under automation unless `?sw=1`; `?sw=off` removes it and its cache. No file renames.
- Result (preview build, 4G, CPU 4×, revisit): warm HTTP cache 40 → 11 network requests; cleared HTTP cache 9.0 → 2.3–4.4 MB. [Validation](../validation/perf-r8-2026-11-20/README_TH.md). Not measured on real Pages/Safari.
- Tests: service-worker.test (4), Vitest all, typecheck, lint, build, Playwright update-banner/unit-loading/perf-probe/portrait-keyboard (22).

## 2026-11-20 — Perf R6+R7: lighter battles (Opus; claude/perf-r6-r7 → game branch)
- Owner: “ต่อ R6 กับ R7 เลย”. `battle-ui.ts` `set()` via `setHtml`, focus restored only when replaced, backdrop measured once per frame; `BattleScene.sync()` skips the full `paint()` when the field is idle (`fieldIdle`, `UnitAnimation.still`) and `paintKey` is unchanged; `GameShell.local()` passes `battleMemo` (R7).
- Result (Chromium 390px, CPU 4×, SwiftShader, 3 wins in a row vs after R1): FPS 20.5–23.9 → 23.2–26.4, long tasks per fight 2.1–13.8 s → 0.9–7.3 s. [Validation](../validation/perf-r6-r7-2026-11-20/README_TH.md).
- Tests: Vitest all, typecheck, lint, build, Playwright 16 battle specs (132). No real device. Remaining audit items: R8 hashed asset names/SW cache, R9 idle CSS animations, R10 small portraits, R11 shorter retry.

## 2026-11-20 — Perf R5: server-play steps at the player's pace (Opus; claude/perf-r5 → game branch)
- Owner: “ต่อ R5 เลย”. `game-shell.ts` `guesses` replaces the one-step `nextMove`: up to 3 steps shown at once (each guessed on the device from the previous guess), sent one by one in order; a confirmed `moved` keeps the token on the furthest guess, any other answer drops the rest and shows the server state. No API/protocol/rule/save change.
- Result (local Worker/DO + 300 ms delay, CPU 4×): taps every 200 ms 7/8 → 8/8 sent, press → visible step 24–286 → 12–24 ms. [Validation](../validation/perf-r5-2026-11-20/README_TH.md). Accepted risk: a fight on the first step snaps the token back from up to 3 tiles ahead (`MAX_AHEAD`).
- Tests: server-play.spec 7/7 (one updated, one new), Vitest all, typecheck, lint, build. Not measured against the real dev API; no real device.

## 2026-11-20 — Perf R3+R4: smooth map steps (Opus; claude/perf-r3-r4 → game branch)
- Owner: “ต่อ R3 กับ R4 เลย”. `ui/dom-cheap.ts` (`replayClass` rewinds one-shot animations instead of `void offsetWidth`; `setHtml` skips unchanged markup); `world-ui.ts` incremental fog (one element per cell), fog backdrop via `background-position` instead of inherited `--ox/--oy` (that alone recalculated ~1,370 elements per step), `--t`/`data-zone` only on change; `game-shell.ts` `show()` writes only changed attributes, no repeated `focus()` on the pad.
- Result (Chromium 390px, CPU 4×, local play): press → visible step p50/p95 154/215 → 27/42 ms, no long tasks (was 12 per 10 steps). [Validation](../validation/perf-r3-r4-2026-11-20/README_TH.md). The 120 ms key-repeat guard is unchanged.
- Tests: Vitest all, typecheck, lint, build, Playwright world/keyboard/lessons/map tabs/team-five/server-play/story (141). No real device. Next suggested: R5 server step queue (Opus).

## 2026-11-20 — Perf audit + R1/R2 (Opus; claude/perf-audit-2026-11-20 report only, claude/perf-r1-r2 → game branch)
- Owner: “ตรวจสอบอาการดีเลย์ โหลดภาพช้า เดินหน่วงๆ … ยังไม่ต้องแก้ไขจริง”, then “แก้ R1 กับ R2 ก่อนเลย” and “ทำต่อจนเปิด PR แล้ว merge ได้เลย”. Audit report (causes C1–C7, recommendations R1–R11) stays unmerged on `claude/perf-audit-2026-11-20`.
- R1: `game/visuals/battle-assets.ts`; `BattleScene` lazy mode (`main.ts`): no startup VFX/unit-sheet preload; each encounter loads 6 core atlases + skill-family atlases its heroes use + its still sheets; `fieldReady` gates Start/inputs (checked per added texture; failures never block; pilots still optional); GameShell prefetches the team/map set on the map. QA fixtures stay eager.
- R2: `skill_icons_128.webp` (lossless half size, `scripts/skill-icons-runtime.py`); 256 px master kept.
- Results (4G, CPU 4×): title download 26.3 → 5.0 MB, load 24.8 → 5.4 s; battle textures 151–170 → 116–135 MiB; a battle opened straight from a save waits 4.5 s (no prefetch). [Validation](../validation/perf-r1-r2-2026-11-20/README_TH.md).
- Tests: Vitest all + `battle-assets.test`, budget report regenerated, typecheck, lint, build, Playwright 11 specs (195). Icons not owner-viewed; no real device; Pages/dev API not reachable from the container.
- Next suggested: R3+R4 (walk reflow/fog, Sonnet), then R5 server step queue (Opus).

## 2026-11-20 — Foe lines: spear-straight rows, centred boss, ≤4 escorts (Opus; claude/review-standing-positions-j1gnf4 → game branch)
- Owner (vanguard-captain 390px shot, “ตำแหน่งยืนมั่วมาก”): no half rows (spear lines), boss exactly centred, balanced non-boss fields, a boss keeps ≤4 escorts and nobody in b1; “ดำเนินการตามที่แนะนำได้”.
- `core/battle/foe-lines.ts`: f_n/b_n share a row; boss line middle (3 top, 2 bottom); no boss 1/2/3 lines → mid / top+bottom / 1 top, 3 mid, 2 bottom. `foeNeighbours` follows these rows. `encounterProblems` rejects a boss with >4 escorts or a foe in its line. `bossRole` marks a stripped boss `leader`.
- `field-layout.ts`: rows by line, boss with nobody behind at the centre of the foes' half, shared rows across sides with an evenly placed middle row (replaces the 2026-11-18 per-side top-row drop).
- Content: b1→b3 golem (v12, HP 200→190 so the Garran advisor route still wins), captain (v8), briar lord (v12), Valdrakk (v2); warden/World Boss warden (v22/v2) drop b1 and call b2+f3 in both modes; thorn-host, rift-legion, Morvane v2 (neighbour rule).
- Tests: foe-lines.test (new), field-layout, boss-phases, team-five, world-boss-trio, encounter routes; full Vitest, typecheck, lint, build, `npm run sim` (hard warden blind attack 4%→11%). [Validation](../validation/foe-lines-2026-11-20/README_TH.md). Not owner-viewed in game; Chromium 390px only.
- Open: hard-mode warden is a little easier (one wisp fewer); World Boss warden's last week (2968) changes composition mid-week.

## 2026-11-20 — Content version grace + refresh notice (Sonnet; claude/content-version-grace → game branch)
- Owner (after the 409 “เวอร์ชันเกมไม่ตรงกับเซิร์ฟเวอร์” on 19 Nov: the dev API deploys in minutes, Pages ~40 min later): “ให้เซิร์ฟเวอร์ยอมรับเวอร์ชันก่อนหน้าได้ชั่วคราวระหว่าง deploy แล้ว deploy เสร็จจะมีประกาศให้ทำการ Refresh version ใหม่” (OD-57).
- API: `contentAccepted`/`graceActive` (`api.ts`), Worker vars `CONTENT_PREVIOUS` + `CONTENT_PREVIOUS_UNTIL`; the 409 names the chain. `cloudflare-dev.yml` step “Work out the content version grace” (`scripts/content-grace.mjs`: live API's own 409, chained, ≤3, 3 h; `[no-grace]`/`no_grace` input turns it off). Page: build writes `version.json`; `update-check.ts` + `update-banner.ts` show “มีเวอร์ชันใหม่พร้อมแล้ว” with refresh/later only when the live build differs.
- Tests: content-grace.test (9), update-banner.spec (2 at 390px), full Vitest, typecheck, lint, build. Design [CONTENT_GRACE_TH.md](../design/p09/CONTENT_GRACE_TH.md). Not yet seen across a real deploy: the first push after this merge deploys the grace itself (it only protects the push after that).
- First real deploy (a74336f): the grace step ran but wrote empty vars, because the commit body mentioned the off-marker and the check searched the whole message. Fixed: only the commit's first line counts (claude/grace-marker-subject-only). That deploy was unaffected (#311 left the content version at 0170adf9c26fc692). The live read of the API's 409 is still unproven on a real content change.

## 2026-11-20 — Shorter field HP bars, smaller numbers (Opus; claude/field-hp-compact → game branch)
- Owner (390px screenshot): “ปรับลดความยาวของหลอดเลือดลงให้เหมาะสม และปรับขนาดตัวเลขของเลือดให้เล็กลง”. `.field-health` max width 72 → 50px; overlaid counter 9/8/7 → 7.5/6.5/6px by length (`battle-ui.ts`). Presentation only; no rule/save change.
- Tests: battle-hud, status, combat specs (55, Chromium 390px incl. 9999/9999 fit + centring), full Vitest 2082, typecheck, lint, build. Shot `docs/validation/field-hp-compact-2026-11-20/battle-390.png`. Not owner-viewed; no real device.

## 2026-11-19 — OD-56 friends + private 1:1 chat (Opus; claude/friends-dm-od56 → game branch)
- Owner: “เพิ่มระบบเพื่อน และ chat 1:1”. Followed CHAT_CHANNELS_TH.md §2. D1 migration 0007 (`friend_codes`, `friend_requests`, `friends` two rows/pair with per-side refs, `friend_blocks`); `server/friends.ts`; Worker `/v1/friends*`; pure rules `core/chat/friends.ts`. Devices see handles + opaque 16-hex refs only; unknown/blocked/deleting/full-inbox codes all answer 404 `friend_code_unavailable`.
- `dm` channel open: Worker derives `dm:<a>:<b>` from the auth account + a mutual, unblocked friend's ref (403 `not_friends`). `Chat` object: per-kind pace (dm 2 s/20 min/200 h), retention per channel (world 500, dm 200), read markers → unread, report checks channel + stores 5-message context, admin sees reported dm rows only. Purge: friend rows both sides (D1) + every dm room of the account (DO).
- UI: chat dialog “เพื่อน” tab (`ui/friends-panel.ts`), conversation view, camp chat badge; polls only while the tab is open (10 s list / 4 s room). Flag `FRIENDS=off` → 403 `friends_off`. No save, rule or reward change.
- Tests: friends-od56 unit/route (18), chat-p11 updated, full Vitest 2082, typecheck, lint, build; Chromium 390px chat-p11 + friends-od56 (two contexts through the real Worker). Shots `docs/validation/friends-od56-2026-11-19/`. Not owner-viewed; no real device.
- Open (assumed, see [FRIENDS_TH.md](../design/FRIENDS_TH.md) §5): block does not hide world chat; cap 50; 1:1 stays on for the external test unless `FRIENDS=off`.

## 2026-11-19 — Chat feed on the camp, hidden-camp list, 1:1/guild channels prepared (Sonnet; claude/chat-overlay-mute-report → game branch)
- Owner: “เริ่มทำตามข้อเสนอได้เลย ค่าเริ่มต้นปิด เพิ่ม ระบบ mute/report / ระบบ Chat 1:1 / Chat Guild เตรียมไว้” (OD-55). `ChatPanel`: translucent `#chat-feed` (3 lines, 45 s, off by default, localStorage `asterveil.fateweave.chatfeed.v1`), toggles on the camp/chat window/Setup, polls every 10 s only while on + camp shown + dialog closed. Report and admin mute already existed; added the hidden-camps list with unhide (device only).
- Channels prepared, closed: `core/chat/channels.ts` registry + id format; `ChatHost.read/post` take a channel; Worker takes a channel *kind* (`dm`/`guild` → 403 `chat_channel_closed`, unknown → 400); dialog tabs show the two as “เร็ว ๆ นี้”. No save, rule or reward change; world chat behaviour unchanged.
- Design/questions [CHAT_CHANNELS_TH.md](../design/CHAT_CHANNELS_TH.md). Tests: chat-p11 unit (4 new), chat-p11.spec (1 new at 390px), full Vitest 2064, typecheck, lint. Not owner-viewed; no real device. Open: friend system before 1:1, guild system before guild chat, server-side block.

## 2026-11-19 — OD-54 farming lessons (Sonnet; claude/lessons-farming → game branch)
- Owner: “ทำทั้ง 4 ข้อเลย”. Four camp lessons in `lobbyLesson(profile, maps, seen, sheet?, picked?)`: `farm` (replay, ring on `#lobby-maps`, last in the camp queue), `sweeppick`→`sweep` (maps sheet: pick a cleared map, then `#map-sweep-row-<id>`; cost/daily limit/cap read from `MapDefinition.sweep`), `hunt` (`#hunt-target`, hunt sheet), `open:bossCharm`→`bosstarget` (hunt tab, then `#boss-target`).
- LobbyUI gains `openSheet`, `pickedMap` and `onDraw` so GameShell refreshes lessons when a sheet draws; `LessonGuide.place` scrolls a target inside `.lobby-content` into view. Camp sheets are inline (not `<dialog>`), so the layer is not hidden. No rule, reward or save change.
- Tests: tutorial-flow (10, one new + `open:quests/team` expectation now reaches `farm`), lessons.spec (6 at 390px, 2 new). Shots `docs/validation/lessons-farming-2026-11-19/`. Design §8 in TUTORIAL_FLOW_TH.md. Not owner-viewed yet.

## 2026-11-19 — OD-54 stage C + Setup lessons toggle (Opus; claude/lessons-stage-c → game branch)
- Owner: “ทำช่วง C ต่อเลย และเพิ่มปุ่มเปิดคำแนะนำใน Setup”. `lobbyLesson(profile, maps, seen)`: first camp visit, then `card:<guide>` (ring on the camp menu the card needs) and `claim:<guide>` (claim button once done), then `open:<feature>` for quests/team, market/hunt/tomes, fuse/hard only when the map that opens them was the last cleared. No new rewards or rules.
- Tapping the highlighted control completes its lesson (no bubble over the opened sheet). Title Setup → ความช่วยเหลือ: `#lessons-toggle` (off hides all; on again resets `seen`).
- Tests: tutorial-flow (9), lessons.spec (4 at 390px incl. camp card + Setup), full Vitest, lint, build.

## 2026-11-19 — OD-54 lessons after the prologue (Opus; claude/tutorial-flow → game branch; [PR #304](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/304))
- Owner: design first, then “R1 R2 เอา คงเกราะอก ช่วง B ครบ รางวัลเดิม แจกยา”. Design [TUTORIAL_FLOW_TH.md](../design/TUTORIAL_FLOW_TH.md). Rules: prologue win reaches camp Lv2 (`gainExp`), `unlocks.gear/tree = 0`, one-time `guide-calm` (calming draught) via new run command `claimRunGuide` or the camp card; no save bump (guide ids already validated).
- UI `src/ui/lessons.ts` + GameShell `updateLessons`: one ring+bubble lesson at a time on the real control (map order levelup→wear→tree→lanes→walk→chest→lowhp→fatigue→calm→elite→boss, first-battle `#intent` tip, first camp). Seen/off per device (localStorage); automated browsers start off unless a test saves a preference (`tests/browser/lessons.spec.ts` does).
- Tests: `tests/tutorial-flow.test.ts` (7), lessons.spec (3 at 390px), full Vitest 2057, `npm run sim` 29/29 (first clears unchanged); system-unlock-pacing updated for the MAP 0 wear card. Open: stage C (NPC cards pointing at controls), owner look at the 390px bubbles.

## 2026-11-19 — Enemy aim OD-53: pack foes, smart bosses, assassins (Opus; claude/enemy-aim-proposal → game branch)
- Owner asked what decides an enemy's target, then for a proposal with simulation, then “ทำ D + C +B ตามที่แนะนำเลย” (OD-53). Resolver: optional `IntentDefinition.aim` (`weakest`/`support`/`pack`), picked when announced and frozen at the foe's turn; front-first, taunt/challenge/tremor/guardstone still win.
- Content (`catalog.ts` `withAims`, `species.ts` `assassin`): C non-boss front-row foes `pack`; D bosses `weakest` every third move per phase (every second lost advisor 60%-HP fights); B Ember Slime + Spore Puff energy moves `support` (map-3 Rift Wisp dropped for the same reason). World Bosses, the tutorial first-clash and the reference veil-siege (scripted by combat/status specs) keep slots. Changed encounters +1 version. UI tags the rule on announced moves and in foe notes.
- Proposal + 7-variant probe: [ENEMY_AIM_PROPOSAL_TH.md](../design/ENEMY_AIM_PROPOSAL_TH.md), `tests/probe/enemy-aim.test.ts`. Tests: `tests/enemy-aim.test.ts`, full Vitest 2049, `npm run sim` 29/29 with the campaign gate; casual explorer map-2 first clear 88% → 79% (gate accepts by group). Not owner-playtested.

## 2026-11-18 — Battle HUD: status icons under HP, glass inspector, top-row spacing (Opus; claude/battle-hud-status-spacing → game branch)
- Owner request with a 390px battle screenshot: (1) buff/debuff icons move from beside the field HP track to a band under it; (2) the unit inspector (กำลังดู) becomes glass like the turn strip; (3) the top row comes down so its gap to the middle row matches the middle→bottom gap.
- `field-layout.ts`: each row reserves a 13px status band (dropped on fields too short for 44px figures, where icons stay beside the track), up to 4 icons per unit; each side's top row drops to its own middle row, held up by another side's large figure only where its painted middle ¾ reaches under the track. Presentation only: no rules/save/content change.
- Tests: field-layout unit test (rule updated + new spacing test), full Vitest (2041), typecheck, lint, build, Chromium status/battle-hud/team-five specs (23). Shot: `docs/validation/battle-hud-2026-11-18/battle-390.png`. Not yet approved by the owner visually.

## 2026-11-18 — P11-05 trio go-live, OD-52 (Opus; claude/p11-05-trio-go-live → game branch; [PR #301](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/301))
- Owner: “ไม่ต้องสนใจเส้นตายทดสอบภาพนอกอะไรนั่น” + “ทำข้อ 1 เลย” → OD-52 replaces OD-51's Warden-until-test part. `trio.from = 2969` (Mon 23 Nov 06:00 Bangkok, first reset after release); week 2968 stays the Warden's.
- No number changes: the sim (29 passed) and the probe on the shipped rules match the coach evidence (400 HP, half-coach 20 accounts: Morvane 50% in 98% of weeks, killed in 47–48%). Save v65 and encounter versions are unchanged; the content version changes, and dev API + Pages deploy together on push.
- `cloudflare-load.yml` gains a `trio=now` input (staging copy only). The run on the PR branch with 4×5 accounts on three bars passed: 100 attempts, identical retries, no 429/5xx, worst 0.78 s. [Validation](../validation/p11-05-go-live/README_TH.md).
- P11-04 Warden tests moved earlier on the calendar. A new server test covers the shipped switch (Warden attempts ÷ 3 per bar). Tests: typecheck, lint, the full Vitest suite (2040), build, coverage, Chromium world-boss-trio-ui + world-boss-p11 (3).
- Open: real-player coach uptake; first real switch on the dev API on 23 Nov. Older handoff entries moved to archive/2026-11-18.

## 2026-11-18 — Compact title and Setup (Codex; fix/compact-title-setup → game branch; [PR #300 and merge commit](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/300))
- Owner approved implementation of the portrait mockups. The current artwork stays full-bleed with one bottom HUD action and top-right Setup. Reuses game audio prefs, account/recovery, feedback, privacy, and restart confirmation.
- A pending local-save import remains the primary action, and save details move into Setup. Blocking save/connection messages stay discoverable. #234 remains separate.
- Tests cover responsive frame, sound persistence, Escape and focus, account/feedback/import flows, and restart without save loss on cancellation. Playwright Chromium used because Browser plugin unavailable. See PR checks.

## 2026-11-18 — World Boss pre-fight guides (Codex; fix/world-boss-prefight-guide → game branch; [PR #299 and merge commit](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/299))
- Owner asked for all three bosses to show tactics before battle. The Fight tab displays one guide below the current selection and scrolls it into view while preserving selection focus. The Bosses tab shares the same advice.
- Kragmor explains the armour and Mountain Fall, Valdrakk explains Bash on Wing Gathering and a fallback for Dive, and Morvane explains the court and the damage-credit requirement. Confirmed Bash targets physical charge and Sigil targets energy.
- Regression coverage checks the three selections at 390px, the guide/Start association and unchanged attempt count. Warden stays for 14 Dec per OD-51. Checks linked in the PR.

## 2026-11-18 — Morvane coaching (Codex; fix/morvane-advisor → game branch; [PR #298 and merge commit](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/298))
- Owner asked to implement the recommendations after #297. Add the optional Morvane battle coach and damage-credit guidance. The coach favors boss damage while preserving the general advisor's defensive and area skills.
- Actual commands through the resolver and attempt validation. All 10 map-1 recruitment profiles scored and reached round 8. The original starter fixture went 36 → 123 damage. [Evidence and reproduction](../validation/p11-05-morvane-coach/README_TH.md).
- At 400 HP/attempt and 50% coach adoption, 20 modeled accounts reach 50% in 98% of weeks and kill in 47–48%. Adoption is unmeasured. Warden stays per OD-51. No rules, boss numbers, save format or scheduling change.
- Checks are linked in the PR. Browser coverage includes 390px Morvane hint toggle, ordinary and tutorial combat, and the Warden path.

## 2026-11-18 — P11-05 step 6 (Codex; chore/p1105-step6-balance → game branch; [PR #297 and merge commit](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/297))
- Resolver and server replay probe compared nine field teams, four bosses, basic attacks, advisor and boss-specific responses. [Results and reproduction](../validation/p11-05-step6/README_TH.md).
- OD-51: activation gate did not pass. Morvane starter adds-first scores 0; advisor-based shared kill rate at 10–20 accounts is 3–17%. The court HP trial helps survival and the pressure route helps damage. Balance questions are in “ฝากถึง Claude”.
- Warden stays, `trio.from` unset. Candidate week 2971 is 7 Dec 06:00 Bangkok. No trio staging run. Content hash `5278f631cd330bde`; the direct live API version read was blocked by the proxy.
- Local typecheck, lint, build, coverage 6/6 and probe + trio rules/world/server 41/41 passed. Chromium Warden spec fixes the local clock to the prerelease boundary. Full release checks in PR #297. No runtime or approved asset changes.

## 2026-11-18 — Asset intake audit (Codex; codex/asset-intake-audit → game branch)
- Owner asked whether anything failed to enter the game. Read-only runtime audit of game c0e6319 (#295): no missing authorized trio artwork/routes; 19 file hashes, VFX lossless receipts and seven revision layers match.
- Body/banner/emblem/item/stills/portraits/VFX are integrated via game PRs although original art PRs remain open. #292 stays unmerged. Trio is still gated by unset `trio.from`; step6 remains a separate task.
- Real pending intake: #262 Warden banner, #169 continent, #234 compact title; #55/#53 await systems, #122 parked. #165 poses and #133 UX have separate game implementations. [Audit/scope](../validation/intake-audit/README_TH.md).
- Checks: WB/coverage61, equip122 and Chromium390px24 passed; revision verify48 files + seven layers and lossless81 canvases passed. Direct live HTTP blocked by environment proxy; do not infer a game failure from that. No new visual/motion approval claimed.
- Docs only; no art/runtime/rules/save/balance/timing or Thai move-name change. No additional imports or merges of old art PRs.

## 2026-11-17 — World Boss own stills/portraits (Codex; PR #295; codex/wb-stills-portraits → game branch; squash commit: see PR)
- Owner: “ชื่อท่าภาษาไทยไม่เอา”, “ดำเนินการเรื่องที่ยังค้างได้เลย”. Finish existing-art hookup only; no Thai move names, balance or scheduling changes.
- Derived fallback stills from approved ready frames and cropped original seed portraits for Kragmor/Valdrakk/Morvane; removed Warden placeholder mapping. Separate 256px-cell lossless sheets, real alpha and reproducible provenance; original incoming/animation/VFX preserved.
- Preserved field layout, sole, fallback→atlas scale and VFX anchors; source trim owns caption bounds. New Chromium390px loading/failure tests6/6, prior unit-loading3/3, unit2038/23 skipped, typecheck/lint/build, coverage6/6 passed. [Evidence/limits](../validation/wb-stills-portraits/README_TH.md).
- Codex inspected six real-game stills; this is agent visual judgment, not owner direct viewing or continuous motion approval. PR merge requires quality+browser; existing Pages workflow publishes afterward, no Pages polling. #292 remains unmerged.
- Next: P11-05 step6 simulation/probe in a separate task, not part of this presentation change.

## 2026-11-17 — WB VFX owner acceptance / game intake (Codex; PR #294 → feature/fateweave-initial-prototype)
- Owner: “อนุมัติ นำเข้าเกมได้”, following delegated review. #294 carries the #292 intake dependency plus #293’s7 clarity layers into the game; #292 itself is not merged. No unrelated work or Rise Beyond changes.
- Local checks already passed: unit2038/23 skipped, browser WB18/18, fast/reduced6/6, typecheck/lint/build, coverage6/6, lossless81-frame audit. Merge is gated on PR quality + browser CI; the existing Pages workflow handles publication afterward (do not wait/poll Pages).
- Owner acceptance is recorded; frame-based review limits remain explicit. [Evidence/receipt](../validation/wb-vfx-revision/README_TH.md). Rules/save/catalog/balance/timing remain unchanged.
