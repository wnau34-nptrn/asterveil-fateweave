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
