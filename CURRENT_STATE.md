# Current state — updated 2026-11-15 (P05-06 quest board prototype)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pages deploys after lint/unit/build; restore its browser gate before OD-13 external tests.
- Save v63 (P05-06 board book + `run.day`; v62 sweep book; v61 story flags/counters); Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet/reward ledger. P09 02a–03 done (server decides/seeds, dev API `?server=<url>`; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references:** PR #212 (`art/art-ui-gacha-002`, `incoming/ART-UI-GACHA-002/`), reference only.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; research `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`. Rates/points (80, free 80–96 per 28d) are drafts; owner deferred numeric tuning and wants system/visual discussion first. Universal/overflow/legacy trust open. No runtime/rules/save/balance/payment work yet.

## Next (owner review)

- P09: 02g (#236), 03 (#237) done; Pages plays through the dev API by default (#238, owner “ข้อ 1”). Owner: privacy contact line, test date T, own admin row, Google consent publish. Open: inactive-guest cleanup, old-token reuse detection.
- P04: OD-15–33 recorded; P04-02/03/04/04b done (shards replace dupes/seals; tree points = camp Lv2–10 + 1 per first normal clear; camp Lv cap by newest map for P06; ★1 in a ★3 team clears like ★5). See [P04-03](docs/validation/p04-03-2026-11-14/README_TH.md), [P04-04](docs/validation/p04-04-2026-11-14/README_TH.md).

- P05-01–04 done (bosses, OD-34–41; [inventory](docs/design/p05/ACTIVITY_INVENTORY_TH.md); P05-02 [optional quests, story flags, counters](docs/validation/p05-02-2026-11-15/README_TH.md)).
- P05-05 done ([validation](docs/validation/p05-05-2026-11-15/README_TH.md), PR #254): offline sweep (`core/world/sweep.ts`): cleared maps, 1 supply (6/day, keep 18), 3/map/day shared normal/hard, fixed table, no EXP/items. Owner has not commented; kept as is.
- P05-06 done ([validation](docs/validation/p05-06-2026-11-15/README_TH.md)): one camp board, tabs รายวัน/รายสัปดาห์/สัญญา/งานค่าย (`core/world/board.ts`, `ui/quest-board.ts`, command `claimBoard`). 3 daily + 5 weekly with alt ways, counted automatically from settled runs (`depart` stamps the device day) and sweeps (sweep objectives only); ≤2 catch-up days, claim once per period with windows; six contracts auto-checked on completed runs (OD-37), once a week at the best map's reward; swift 18/30/90 steps from the probe. Draft numbers; device day until P09. P05 complete.
- P04-05/06 pacing done ([validation](docs/validation/p04-05-2026-11-14/README_TH.md)): catch-up EXP 115%/130%, campfire rest 70% kept (OD-39); recheck with P06 camp-level caps.
- Gacha: review visual direction/core choices; rates/costs/pacing stay adjustable. No G02–G05/payments; real gacha needs P09/P04/ledger (OD-13).
- UXD-08 done (owner “อนุมัติ”, [validation](docs/validation/uxd-08/README_TH.md)); real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). Lio's main-stat gear ties off-stat gear (class-sim tolerance 1 pt). No real Safari/iPhone/Android or human usability validation.
- P03 motion clips approved 2026-11-11 (`docs/combat-presentation/unit-a12-slice/`). Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P04-06 farm and quest budget (Opus). Read CLAUDE.md, CURRENT_STATE.md, DEVELOPMENT_PLAN_TH.md §P04-06, docs/design/CHAT_MARKET_QUEST_BOARD_TH.md §4/§6, the P05-05 and P05-06 validation READMEs and fateweave-rules-and-sim. If the owner commented on the P05-05 sweep or P05-06 board assumptions (shared normal/hard limit, no EXP/items, contracts auto-checked, catch-up/claim windows, reward numbers), apply those first. Measure sources and sinks per week for a 3–5-session player (OD-06/07): runs, salvage/crafting/targeted farming/guarantees/affix transfer, sweep and board; check no craft–salvage profit loop, duplicates stay useful, old maps keep a reason to return, and the board + sweep stay a modest share next to real play. Adjust the draft sweep/board/contract numbers only with simulation (`npm run sim` and probes `tests/probe/p0505-sweep.test.ts`, `p0506-board.test.ts`); no new currencies, no universal shards before the P09 ledger (OD-17). Report a budget table, then branch, PR into feature/fateweave-initial-prototype, subscribe, merge on quality+browser pass, handoff entry, rewrite CURRENT_STATE.md (<6000 bytes).
