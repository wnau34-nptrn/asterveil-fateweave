# Current state — updated 2026-11-15 (P11-04 World Boss part 1)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pages deploys after lint/unit/build; restore its browser gate before OD-13 external tests.
- Save v64 (P11-04 World Boss book; v63 board book + `run.day`; v62 sweep book); Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 02a–03 + reward ledger + weekly shards done (server decides/seeds, dev API `?server=<url>`; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **G00/G01 analysis delivered** (visual refs PR #212): `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; research `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`. Rates/points (80, free 80–96 per 28d) are drafts; owner deferred numeric tuning and wants system/visual discussion first. Universal/overflow/legacy trust open. No runtime/rules/save/balance/payment work yet.

## Next (owner review)

- P09: 02g (#236), 03 (#237) done; Pages plays through the dev API by default (#238, owner “ข้อ 1”). Owner: privacy contact line, test date T, own admin row, Google consent publish. Open: inactive-guest cleanup, old-token reuse detection.
- P04: OD-15–33; P04-02/03/04/04b done (shards replace dupes/seals; tree points camp Lv2–10 + first clears; camp Lv cap by newest map). [P04-04](docs/validation/p04-04-2026-11-14/README_TH.md).
- P05 complete (bosses OD-34–41, story flags, sweep [P05-05](docs/validation/p05-05-2026-11-15/README_TH.md), board [P05-06](docs/validation/p05-06-2026-11-15/README_TH.md)).
- P09 reward ledger done ([doc](docs/design/p09/LEDGER_P09_TH.md)): online `sweep`/`claimBoard`/`depart` use the server game day (midnight Asia/Bangkok, draft), refuse a device `day`; one receipt per payout in the DO `reward_ledger`. Offline keeps the device day. Owner open: reset time zone.
- P04-06 done ([validation](docs/validation/p04-06-2026-11-15/README_TH.md)): week sim `tests/sim/week-sim.ts`; sweep+board 20–30% of weekly ore for full-run players. Owner open: target share, login-only income, old-map unique sets (P06).
- P09 weekly universal shards done ([validation](docs/validation/p09-shards-2026-11-15/README_TH.md)): 10/week from three weekly tasks (1 shard = 12 ore). Owner open: 10/week, rate, sweep shards.
- **P11-04 World Boss part 1 done** (PR #259, [design](docs/design/WORLD_BOSS_P11_04_TH.md), [validation](docs/validation/p11-04-2026-11-15/README_TH.md)): weekly boss from camp, 5 attempts/week ×8 rounds, one `worldBoss` command replayed by the resolver; receipts in `reward_ledger`; shared HP in the `WorldBoss` DO (account outbox, hits taken once); shared claims online only. 114 ore-eq/week paid by map-3 sweep 24/12. Owner open: 5/week, 8 rounds, sweep cut, unlock after map 1, HP 2500/account (min 5000). No screen yet; no load test.
- P04-05 pacing: catch-up EXP 115%/130%, campfire 70% kept (OD-39); recheck with P06.
- Gacha: review visual direction/core choices; rates/costs/pacing stay adjustable. No G02–G05/payments; real gacha needs the server-side wallet on the ledger (OD-13).
- UXD-08 done (owner “อนุมัติ”, [validation](docs/validation/uxd-08/README_TH.md)); real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). Lio's main-stat gear ties off-stat gear (class-sim tolerance 1 pt). No real Safari/iPhone/Android or human usability validation.
- P03 motion clips approved 2026-11-11 (`docs/combat-presentation/unit-a12-slice/`). Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P11-04 World Boss, part 2 (Sonnet for UI, Opus for the load test step): screen and client for the World Boss. Read CLAUDE.md, CURRENT_STATE.md, docs/design/WORLD_BOSS_P11_04_TH.md, docs/context/UI_INPUT_RULES.md and the fateweave-rules-and-sim / playwright-cli skills. If the owner commented on PR #259 (5/week, 8 rounds, sweep cut, unlock, shared HP), apply that first. Build a 390px camp entry (unlocked with the quest board) that shows this week's attempts, personal/shared milestones and the shared HP (`ServerClient.worldBoss()` online; offline no shared bar), plays the attempt in the existing battle scene with an 8-round counter (preview from the same resolver; commit once as `worldBoss { attempt, commands }`), and claims shared milestones. Register `world-boss-warden` art (reuse the warden) and rerun `npm run coverage:presentation`. No rule/save/number changes. Then a small load probe of the single `WorldBoss` DO (many concurrent hits through `handleBossRequest`) with results in the validation README. Tests + 1–2 screenshots at 390px; branch, PR into feature/fateweave-initial-prototype, subscribe, merge on quality+browser pass, handoff entry, rewrite CURRENT_STATE.md (<6000 bytes).
