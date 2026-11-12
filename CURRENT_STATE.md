# Current state — updated 2026-11-12

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pre-release pushes deploy after lint/unit/build; browser PR gate is path-filtered. Restore Pages browser gate before OD-13 external tests.
- Save v58; Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked, existing rights preserved. No gacha wallet/reward ledger. P09-02b done (#225): dev Worker + per-account DO + D1 guests, server seeds ([SERVER_P09_02B_TH](docs/design/p09/SERVER_P09_02B_TH.md)). P09-02c done: shell plays through the API behind `?server=<url>` (local default; `?server=off`): input lock, same-requestId retry, 409 catch-up, D12 one session (423); [CLIENT_SERVER_P09_02C_TH](docs/design/p09/CLIENT_SERVER_P09_02C_TH.md). P09 design: [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md); owner D10 = ค (server decides, server seeds). P09-02a/02a2 done: JSON commands through pure `applyCommand`, seed-free `clientView` + `processCommand` envelope ([COMMAND_LAYER_TH](docs/design/p09/COMMAND_LAYER_TH.md), [CLIENT_VIEW_TH](docs/design/p09/CLIENT_VIEW_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references saved:** PR #212, branch `art/art-ui-gacha-002`, package `incoming/ART-UI-GACHA-002/` on that branch. [Gallery](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/art/art-ui-gacha-002/incoming/ART-UI-GACHA-002/README_TH.md). Latest main artwork + draggable Saturn-ring concept; full characters use full-body cards, shards use broken crystals/quantity labels. 11 PNG originals remotely downloaded and SHA256/decode verified. Reference only; no runtime integration/motion approval.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; reproducible 33-case/365-day research in `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`.
- 80 points/free80–96 per28d and rates remain drafts. G00 is a decision sheet, not signed-off config; G01 does not certify production pacing. Current controls include story/draft/seeded gold board, ore/gold, favorite/collection, paid30d, veteran/returner and hoarding/growth sensitivities.
- Owner later deferred numeric tuning (including 7–10 visits) and wants system/visual discussion first; final economy assumes all planned features exist, using80–96 as draft, not a temporary absent-mode workaround. Universal/overflow/legacy trust remain open. MAP1 yields5 members; actual item/tome/session readiness unverified. No runtime/rules/save/balance/payment work yet; P09-01 is design only.

## Next (owner review)

- P09: D1 Google+recovery, D11 one-time import, D12 one device (owner “อนุมัติ” 2026-11-12; D12 done in P09-02c). Google OAuth Web Client ID (Testing mode) is in SERVER_P09_02B §7. Next proposed: P09-02d Google sign-in + recovery codes (prompt below), then D11 import. Try server play with `?server=` + the dev Worker URL from the `cloudflare-dev.yml` summary. D8 Free/Paid uses SERVER_P09_02B §5–6 numbers.

- Gacha: review visual direction/core choices; rates/costs/pacing stay adjustable. Do not auto-start G02–G05 or payments; real gacha needs P09/P04/ledger (OD-13).
- UXD-08: regression 77/77 + 34 screens inspected 2026-11-11, team-page fixes and the single term ผังสกิล (owner “อนุมัติ”; [validation](docs/validation/uxd-08/README_TH.md)); real-device/human trial still open. Team-preset owner usability review remains open.

## Open items

- Skill step6: Shield Bash kept (owner); Challenge unused by advisor, Rouse ΔHP−8.6; Fade dropped for campaign gate, Shadow Step=hit8+dodge. Enemy difficulty is separate.
- MAP3 Briar Lord gate still falls to plain attacks83–98%; deferred P05; details in skill-rework validation. No real Safari/iPhone/Android or human usability validation.
- P03 motion: 7 staged 390px clips (circle/perfect/toll/ring/deflect/delay/falling star) in `docs/combat-presentation/unit-a12-slice/`; owner approved them with “ผ่าน ไปต่อได้” on 2026-11-11 (the 19 earlier A12 clips were not re-sent). Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P09-02d (Opus): read CLAUDE/CURRENT_STATE, docs/design/p09/CLIENT_SERVER_P09_02C_TH.md §5 and SERVER_P09_02B_TH.md §7 (Google OAuth Web Client ID there). D1 (owner-approved): link a guest account to Google sign-in (Google Identity Services button in server play; the Worker verifies the ID token against Google's JWKS: iss/aud/exp) and issue recovery codes (hash only; D1 tables `identities`/`recovery_codes` per SCHEMA_API_DRAFT), sign-in on a new device reaches the same account (D12 lock still applies). Also measure Workers CPU for long battles and `/v1/verify` on long logs, and show “saved on the server” labels in server play. No rule/number/save-format change, no gacha/payments/P04; D11 import comes after. Branch claude/p09-02d-google; PR into `feature/fateweave-initial-prototype`.
