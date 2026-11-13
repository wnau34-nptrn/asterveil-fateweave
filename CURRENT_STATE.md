# Current state — updated 2026-11-13

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pre-release pushes deploy after lint/unit/build; browser PR gate is path-filtered. Restore Pages browser gate before OD-13 external tests.
- Save v58; Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet/reward ledger. P09 (owner D10 = ค, server decides/seeds; index [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)): 02a/02a2 command layer + seed-free view; 02b Worker+DO+D1 guests (#225); 02c shell via `?server=<url>` (local default), retries, D12 one session, smooth walking (#227/#230); 02d Google link/sign-in + one-time recovery codes, account panel, server save labels, long battle/verify measured (#229, [ACCOUNT_P09_02D_TH](docs/design/p09/ACCOUNT_P09_02D_TH.md)); 02e D11 one-time local-save import (`/v1/import`, D1 `legacy_fingerprint`, `parseGame` in DO, title offer) + DO log snapshots every 50 seq/run end, `/v1/verify` from the latest ([IMPORT_P09_02E_TH](docs/design/p09/IMPORT_P09_02E_TH.md)). 02f (#233): DO `battleMemo` resolves only new battle turns (same resolver), `/v1/verify` admin-only (D1 `admins` + `admin_audit`), sign-out `/v1/sessions/revoke` + account-panel buttons ([PERF_P09_02F_TH](docs/design/p09/PERF_P09_02F_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references saved:** PR #212, branch `art/art-ui-gacha-002`, package `incoming/ART-UI-GACHA-002/` on that branch. [Gallery](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/art/art-ui-gacha-002/incoming/ART-UI-GACHA-002/README_TH.md). Latest main artwork + draggable Saturn-ring concept; full characters use full-body cards, shards use broken crystals/quantity labels. 11 PNG originals remotely downloaded and SHA256/decode verified. Reference only; no runtime integration/motion approval.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; reproducible 33-case/365-day research in `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`.
- 80 points/free80–96 per28d and rates remain drafts. G00 is a decision sheet, not signed-off config; G01 does not certify production pacing. Current controls include story/draft/seeded gold board, ore/gold, favorite/collection, paid30d, veteran/returner and hoarding/growth sensitivities.
- Owner later deferred numeric tuning (including 7–10 visits) and wants system/visual discussion first; final economy assumes all planned features exist, using80–96 as draft, not a temporary absent-mode workaround. Universal/overflow/legacy trust remain open. MAP1 yields5 members; actual item/tome/session readiness unverified. No runtime/rules/save/balance/payment work yet; P09-01 is design only.

## Next (owner review)

- P09: 02f done (#233 merged; dev deploy smoke OK). Workers CPU: DO command p50 3 / p95 6 / max 12 ms (was 7/19/24), verify 1–2 ms (was 215), import 8 ms. Owner: add your own admin row (`wrangler d1 execute`, PERF §2) to use `/v1/verify`; D8 Free/Paid still yours. Still before outsiders: close `LEGACY_IMPORT`, account delete + privacy policy, token rotation, real rate limits, consent-screen publish; long boss battles unmeasured on Workers. Owner picks the next task; proposed prompt below.

- Gacha: review visual direction/core choices; rates/costs/pacing stay adjustable. Do not auto-start G02–G05 or payments; real gacha needs P09/P04/ledger (OD-13).
- UXD-08: regression 77/77 + 34 screens inspected 2026-11-11, team-page fixes and the single term ผังสกิล (owner “อนุมัติ”; [validation](docs/validation/uxd-08/README_TH.md)); real-device/human trial still open. Team-preset owner usability review remains open.

## Open items

- Skill step6: Shield Bash kept (owner); Challenge unused by advisor, Rouse ΔHP−8.6; Fade dropped for campaign gate, Shadow Step=hit8+dodge. Enemy difficulty is separate.
- MAP3 Briar Lord gate still falls to plain attacks83–98%; deferred P05; details in skill-rework validation. No real Safari/iPhone/Android or human usability validation.
- P03 motion: 7 staged 390px clips (circle/perfect/toll/ring/deflect/delay/falling star) in `docs/combat-presentation/unit-a12-slice/`; owner approved them with “ผ่าน ไปต่อได้” on 2026-11-11 (the 19 earlier A12 clips were not re-sent). Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P09-02g (Opus, proposed — owner confirms): read CLAUDE/CURRENT_STATE, docs/design/p09/PERF_P09_02F_TH.md §6, ACCOUNT_FLOW_TH.md and SCHEMA_API_DRAFT_TH.md. Finish the account safety items before outsiders (OD-13): (1) account deletion (`/v1/account/delete`: status `deleting`, devices revoked, DO data and D1 identity/codes/fingerprint removed after a grace period, admin_audit row) with a confirm step in the account panel; (2) a short Thai privacy page (what is stored: device token hashes, Google `sub` only, game log) linked from the title; (3) real per-account/IP rate limits that hold across isolates (DO or Cloudflare rate-limit binding) for guest/command/import/sign-in; (4) a dated plan to close `LEGACY_IMPORT`. No rule/number/save-format change, no gacha/payments/P04. Branch claude/p09-02g-account-safety; PR into `feature/fateweave-initial-prototype`.
