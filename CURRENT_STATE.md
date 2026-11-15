# Current state — updated 2026-11-15 (P05-05 sweep prototype)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pages deploys after lint/unit/build; restore its browser gate before OD-13 external tests.
- Save v62 (P05-05 sweep book; v61 P05-02 story flags/counters); Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet/reward ledger. P09 02a–03 done (server decides/seeds, dev API `?server=<url>`; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references:** PR #212 (`art/art-ui-gacha-002`, `incoming/ART-UI-GACHA-002/`), reference only.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; research `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`. Rates/points (80, free 80–96 per 28d) are drafts; owner deferred numeric tuning and wants system/visual discussion first. Universal/overflow/legacy trust open. No runtime/rules/save/balance/payment work yet.

## Next (owner review)

- P09: 02g (#236), 03 (#237) done; Pages plays through the dev API by default (#238, owner “ข้อ 1”). Owner: privacy contact line, test date T, own admin row, Google consent publish. Open: inactive-guest cleanup, old-token reuse detection.
- P04: OD-15–30 recorded. P04-02 done (shards replace dupes/seals). P04-03 done ([validation](docs/validation/p04-03-2026-11-14/README_TH.md)): tree points = camp Lv2–10 + 1 per map first cleared (normal), none from stars/hard. [Chapter plan](docs/design/p04/TREE_BIGPICTURE_P04_03_TH.md): no node levels; personal branches, tier-4 capstones, promotion pairs; camp Lv cap by newest open map 10/12/15/17/20/23/26/30 (OD-28–30, P06 work). P04-04/04b done ([validation](docs/validation/p04-04-2026-11-14/README_TH.md), [04b](docs/validation/p04-04b-2026-11-14/README_TH.md)): ★1 in a ★3 team clears like ★5 (OD-01 holds), OD-31–33.

- P05 done for bosses ([validation](docs/validation/p05-2026-11-14/README_TH.md)); P05-03/04 done (OD-34/35, [note](docs/validation/p05-04-2026-11-14/README_TH.md)); OD-39–41 (owner “ทำตามที่แนะนำ”): keep catch-up EXP, hard non-boss fights as OD-35, hard rewards unchanged. P05-01 [inventory](docs/design/p05/ACTIVITY_INVENTORY_TH.md); OD-36–38. P05-02 done ([validation](docs/validation/p05-02-2026-11-15/README_TH.md)): optional quests maps 1–2 (pay once), traveller `guide`, abandoned camp, `Profile.choices` + camp lines, run counters `choices`/`downed`.
- P05-05 done ([validation](docs/validation/p05-05-2026-11-15/README_TH.md), PR #254): offline sweep on the map sheet (`core/world/sweep.ts`, command `sweep`): cleared maps only, 1 supply (6/day, keep 18), 3 per map per day shared by normal/hard, fixed table (ore/gold/dust/small tomes; no EXP/items/shards/cores), `serial` refuses repeats. Draft numbers; device day until P09. Remaining P05: 06 board (contracts penalty-free, N/rewards by sim).
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

P05-06 quest board prototype (Opus). Read CLAUDE.md, CURRENT_STATE.md, DEVELOPMENT_PLAN_TH.md §P05-06, docs/design/CHAT_MARKET_QUEST_BOARD_TH.md, docs/design/p05/ACTIVITY_INVENTORY_TH.md (six contracts, OD-37 penalty-free) and fateweave-rules-and-sim. If the owner commented on the P05-05 sweep assumptions (shared normal/hard limit, no EXP/items, table numbers), apply those first. Build the local board: one board with daily/weekly/contracts tabs, prototype 3 daily + 5 weekly, progress collected automatically, optional tasks and catch-up, reward once per period with claim windows, contract N/rewards from simulation; the six camp side quests stay one-time; a sweep counts only for objectives that say so. Device day as in sweep; online time/ledger waits for P09. Keep sweep, optional quests, event flags and counters (save v62) intact. Tests per the skill (`npm run sim` when numbers change), then branch, PR into feature/fateweave-initial-prototype, subscribe, merge on quality+browser pass, handoff entry, rewrite CURRENT_STATE.md (<6000 bytes).
