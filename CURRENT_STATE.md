# Current state — updated 2026-11-14

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pre-release pushes deploy after lint/unit/build; browser PR gate is path-filtered. Restore Pages browser gate before OD-13 external tests.
- Save v60 (P04-03 tree points; v59 P04-02 shards); Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet/reward ledger. P09 (owner D10 = ค, server decides/seeds; dev API via `?server=<url>`; per-step docs in [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)): 02a–02f command layer, Worker+DO+D1, Google/recovery codes, one-time import, incremental battle, admin verify, sign-out; 02g (#236) deletion/privacy/shared rate limits/import-close plan; 03 credential rotation, id-free telemetry, feedback + admin views.
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references saved:** PR #212, branch `art/art-ui-gacha-002`, package `incoming/ART-UI-GACHA-002/` on that branch. [Gallery](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/art/art-ui-gacha-002/incoming/ART-UI-GACHA-002/README_TH.md). Latest main artwork + draggable Saturn-ring concept; full characters use full-body cards, shards use broken crystals/quantity labels. 11 PNG originals remotely downloaded and SHA256/decode verified. Reference only; no runtime integration/motion approval.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; reproducible 33-case/365-day research in `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`.
- 80 points/free80–96 per28d and rates remain drafts. G00 is a decision sheet, not signed-off config; G01 does not certify production pacing. Current controls include story/draft/seeded gold board, ore/gold, favorite/collection, paid30d, veteran/returner and hoarding/growth sensitivities.
- Owner later deferred numeric tuning (including 7–10 visits) and wants system/visual discussion first; final economy assumes all planned features exist, using80–96 as draft, not a temporary absent-mode workaround. Universal/overflow/legacy trust remain open. MAP1 yields5 members; actual item/tome/session readiness unverified. No runtime/rules/save/balance/payment work yet; P09-01 is design only.

## Next (owner review)

- P09: 02g (#236), 03 (#237) done; Pages plays through the dev API by default (#238, owner “ข้อ 1”). Owner: real contact line in `public/privacy.html`, test date T (import closes T−14), own admin row (PERF §2; unlocks feedback/telemetry views), Google consent publish. Open: inactive-guest cleanup, old-token reuse detection.
- P04: OD-15–30 recorded. P04-02 done (shards replace dupes/seals, save v59). P04-03 done ([validation](docs/validation/p04-03-2026-11-14/README_TH.md)): tree points = camp Lv2–10 + 1 per map first cleared (normal); none from stars/hard (12 after MAP3); over-allowance trees reset free (save v60). [Chapter plan](docs/design/p04/TREE_BIGPICTURE_P04_03_TH.md): no node levels; growth by personal branches (10 characters lack one), tier-4 capstones, promotion pairs; camp Lv cap by newest open map 10/12/15/17/20/23/26/30 (OD-28–30, P06 work). Sim: rush/casual rift #1 9→7 of 12, campaign total 224 unchanged. Next: P04-04.

- Gacha: review visual direction/core choices; rates/costs/pacing stay adjustable. Do not auto-start G02–G05 or payments; real gacha needs P09/P04/ledger (OD-13).
- UXD-08: regression 77/77 + 34 screens inspected 2026-11-11, team-page fixes and the single term ผังสกิล (owner “อนุมัติ”; [validation](docs/validation/uxd-08/README_TH.md)); real-device/human trial still open. Team-preset owner usability review remains open.

## Open items

- Skill step6: Shield Bash kept (owner); Challenge unused by advisor, Rouse ΔHP−8.6; Fade dropped for campaign gate, Shadow Step=hit8+dodge. Enemy difficulty is separate.
- MAP3 Briar Lord gate still falls to plain attacks83–98%; deferred P05; details in skill-rework validation. No real Safari/iPhone/Android or human usability validation.
- P03 motion: 7 staged 390px clips (circle/perfect/toll/ring/deflect/delay/falling star) in `docs/combat-presentation/unit-a12-slice/`; owner approved them with “ผ่าน ไปต่อได้” on 2026-11-11 (the 19 earlier A12 clips were not re-sent). Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P04-04 (Opus, proposed — owner confirms): read CLAUDE/CURRENT_STATE, docs/design/p04/SCOPE_P04_00_TH.md §7, OD-01/15–30 and docs/validation/p04-03-2026-11-14/README_TH.md; use the fateweave-rules-and-sim skill. Check with `npm run sim` that a low-star member at the team's camp level still does its role (each class ★1 vs ★3 vs ★5 in the same team, maps 1–3 and hard), and look at why rush/casual companies lost two first clears of the rift after P04-03; report numbers and propose changes before editing rules. Branch claude/p04-04-low-star-sim; PR into `feature/fateweave-initial-prototype`.
