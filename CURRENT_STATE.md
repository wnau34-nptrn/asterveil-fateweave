# Current state — updated 2026-11-09

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pre-release pushes deploy after lint/unit/build; browser PR gate is path-filtered. Restore Pages browser gate before OD-13 external tests.
- Save v58; Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked, existing rights preserved. No gacha wallet/accounts/reward ledger; Worker only `/health`.
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Skill popup proportions #210 complete (`b1d1d42`); earlier popup/UI #208/#207/#205/#204/#203 and VFX #200 merged. Evidence and tests in handoff log.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; reproducible 33-case/365-day research in `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`.
- 80 points/free80–96 per28d and rates remain drafts. G00 is a decision sheet, not signed-off config; G01 does not certify production pacing. Current controls include story/draft/seeded gold board, ore/gold, favorite/collection, paid30d, veteran/returner and hoarding/growth sensitivities.
- Main unresolved choices: timing of first favorite vs OD-07 7–10 visits; source budget without absent modes; universal substitution/overflow and legacy trust. MAP1 already yields 5 members; team/item/tome readiness and real20–30min visits remain unverified. No runtime/rules/save/balance/P09/payment changes in this task.
- Earlier proposal #209 (`0fb8d8c`) and 12-case model remain historical drafts; new findings extend them, not owner approval.

## Next (owner review)

- Review G00 decision questions and G01 evidence; study early targeted acquisition and actual session workloads before locking rates. Do not automatically start G02/P09/G03/G04/G05 or payments. P09/P04/ledger/trust remain dependencies for real gacha; OD-13 order still applies.
- UXD-08 combined UX check open. Team-preset owner usability review remains open.

## Open items

- Skill step6: Shield Bash kept (owner); Challenge unused by advisor, Rouse ΔHP−8.6; Fade dropped for campaign gate, Shadow Step=hit8+dodge. Enemy difficulty is separate.
- MAP3 Briar Lord gate still falls to plain attacks83–98%; deferred P05; details in skill-rework validation. No real Safari/iPhone/Android or human usability validation.
- P03 motion circle/toll/dial unseen in game; owner motion review pending. Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. This analysis used source c4beb7b.

## Opening prompt for next chat

Read AGENTS/CLAUDE/CURRENT_STATE, then docs/design/GACHA_G00_DECISIONS_TH.md and docs/validation/gacha-g00-g01-2026-11-09/README_TH.md on feature/fateweave-initial-prototype. Review open G00/G01 decisions with owner; numbers remain draft. Next research should test early favorite acquisition and real ore/gold/item/tome/session workloads. Do not begin runtime/save/balance/P09/payments without that scoped request.
