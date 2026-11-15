# Current state — updated 2026-11-15 (P09 reward ledger)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pages deploys after lint/unit/build; restore its browser gate before OD-13 external tests.
- Save v63 (P05-06 board book + `run.day`; v62 sweep book; v61 story flags/counters); Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 02a–03 + reward ledger done (server decides/seeds, dev API `?server=<url>`; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references:** PR #212 (`art/art-ui-gacha-002`, `incoming/ART-UI-GACHA-002/`), reference only.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; research `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`. Rates/points (80, free 80–96 per 28d) are drafts; owner deferred numeric tuning and wants system/visual discussion first. Universal/overflow/legacy trust open. No runtime/rules/save/balance/payment work yet.

## Next (owner review)

- P09: 02g (#236), 03 (#237) done; Pages plays through the dev API by default (#238, owner “ข้อ 1”). Owner: privacy contact line, test date T, own admin row, Google consent publish. Open: inactive-guest cleanup, old-token reuse detection.
- P04: OD-15–33 recorded; P04-02/03/04/04b done (shards replace dupes/seals; tree points = camp Lv2–10 + 1 per first normal clear; camp Lv cap by newest map for P06; ★1 in a ★3 team clears like ★5). See [P04-03](docs/validation/p04-03-2026-11-14/README_TH.md), [P04-04](docs/validation/p04-04-2026-11-14/README_TH.md).

- P05-01–04 done (bosses, OD-34–41; [inventory](docs/design/p05/ACTIVITY_INVENTORY_TH.md); P05-02 [optional quests, story flags, counters](docs/validation/p05-02-2026-11-15/README_TH.md)).
- P05-05 done ([validation](docs/validation/p05-05-2026-11-15/README_TH.md), PR #254): offline sweep (`core/world/sweep.ts`): cleared maps, 1 supply, 3/map/day shared normal/hard, fixed table, no EXP/items. Owner has not commented; rules kept.
- P05-06 done ([validation](docs/validation/p05-06-2026-11-15/README_TH.md)): one camp board (รายวัน/รายสัปดาห์/สัญญา/งานค่าย, `core/world/board.ts`, command `claimBoard`), 3 daily + 5 weekly with alt ways, auto-counted from settled runs/sweeps, ≤2 catch-up days, six auto-checked contracts (OD-37). Server day online since the P09 ledger. P05 complete.
- P09 reward ledger done ([doc](docs/design/p09/LEDGER_P09_TH.md)): online `sweep`/`claimBoard`/`depart` use the server game day (midnight Asia/Bangkok, draft) and refuse a device `day` (`client_day`); each payout gets one receipt in the DO `reward_ledger` (same transaction, retry-safe, `duplicate_receipt` guard); log stores the day for replay; device shows the server day. Offline keeps the device day. Owner open: reset time zone.
- P04-06 done ([validation](docs/validation/p04-06-2026-11-15/README_TH.md)): week sim `tests/sim/week-sim.ts` + probe `p0406-budget`. Sweep supply 2/day keep 6, map-3 sweep 30/15/2/1, board rewards cut → sweep+board 22–30% of weekly ore for a full-run player (rush 42–53%, login-only 530 ore/week). No craft–salvage/market loop (`farm-budget-p04.test.ts`). Owner open: target share, login-only income, old-map unique sets (P06).
- P04-05/06 pacing done ([validation](docs/validation/p04-05-2026-11-14/README_TH.md)): catch-up EXP 115%/130%, campfire rest 70% kept (OD-39); recheck with P06 camp-level caps.
- Gacha: review visual direction/core choices; rates/costs/pacing stay adjustable. No G02–G05/payments; real gacha needs the server-side wallet on the ledger (OD-13).
- UXD-08 done (owner “อนุมัติ”, [validation](docs/validation/uxd-08/README_TH.md)); real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). Lio's main-stat gear ties off-stat gear (class-sim tolerance 1 pt). No real Safari/iPhone/Android or human usability validation.
- P03 motion clips approved 2026-11-11 (`docs/combat-presentation/unit-a12-slice/`). Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P09 server-authoritative rewards, part 2 (Opus): universal star shards and the weekly reward budget on the reward ledger. Read CLAUDE.md, CURRENT_STATE.md, docs/design/p09/LEDGER_P09_TH.md, DEVELOPMENT_PLAN_TH.md (OD-13 order), OD-17 in docs/design/OWNER_DECISIONS_TH.md, the P04-06 validation README and fateweave-rules-and-sim. If the owner commented on the P04-06 budget or the Bangkok-midnight day reset, apply that first. Propose and implement the farmable universal star shard source (weekly, receipted in `reward_ledger`, same total budget as P04-06: cut existing sweep/board rewards to make room, validated with `tests/sim/week-sim.ts`), offline-equivalent rules in `core/world`, save bump only if the profile shape changes. No gacha wallet, payments or D1 migrations without the owner's D1 Edit token. Tests for period boundaries, retry and budget; branch, PR into feature/fateweave-initial-prototype, subscribe, merge on quality+browser pass, handoff entry, rewrite CURRENT_STATE.md (<6000 bytes).
