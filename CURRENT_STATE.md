# Current state — updated 2026-11-12

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pre-release pushes deploy after lint/unit/build; browser PR gate is path-filtered. Restore Pages browser gate before OD-13 external tests.
- Save v58; Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked, existing rights preserved. No gacha wallet/accounts/reward ledger; Worker only `/health`. P09 design: [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md); owner D10 = ค (server decides, server seeds). P09-02a done: shell actions run as JSON commands through pure `applyCommand` (`src/core/command/`), seeds from an injected `SeedSource`; [COMMAND_LAYER_TH](docs/design/p09/COMMAND_LAYER_TH.md). P09-02a2 done: seed-free `clientView` (drops profile seed/forge, run seed/rolls, adds `hireBoard`; lobby reads the board from it) and pure `processCommand` envelope `{requestId, seq, command}` (not used by the local shell); [CLIENT_VIEW_TH](docs/design/p09/CLIENT_VIEW_TH.md).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Battle HUD #218 (`2ac1105`): straight HP tracks, status badges, 3-colour HP; [validation](docs/validation/battle-front-hp/README_TH.md).
- MAP quest tabs #213 (`da1d508`): เป้าหมาย / เควสต์ in one dialog.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references saved:** PR #212, branch `art/art-ui-gacha-002`, package `incoming/ART-UI-GACHA-002/` on that branch. [Gallery](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/art/art-ui-gacha-002/incoming/ART-UI-GACHA-002/README_TH.md). Latest main artwork + draggable Saturn-ring concept; full characters use full-body cards, shards use broken crystals/quantity labels. 11 PNG originals remotely downloaded and SHA256/decode verified. Reference only; no runtime integration/motion approval.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; reproducible 33-case/365-day research in `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`.
- 80 points/free80–96 per28d and rates remain drafts. G00 is a decision sheet, not signed-off config; G01 does not certify production pacing. Current controls include story/draft/seeded gold board, ore/gold, favorite/collection, paid30d, veteran/returner and hoarding/growth sensitivities.
- Owner later deferred numeric tuning (including 7–10 visits) and wants system/visual discussion first; final economy assumes all planned features exist, using80–96 as draft, not a temporary absent-mode workaround. Universal/overflow/legacy trust remain open. MAP1 yields5 members; actual item/tome/session readiness unverified. No runtime/rules/save/balance/payment work yet; P09-01 is design only.
- Earlier proposal #209 (`0fb8d8c`) and 12-case model remain historical drafts; new findings extend them, not owner approval.

## Next (owner review)

- P09: owner picks D1/D11/D12 (rec. Google+recovery code; import old saves once before external test; one device at a time; docs PR #223 open). Next P09-02b Worker+DO+D1 (prompt below) needs D1 Edit/DO on the token; leftovers before it in CLIENT_VIEW_TH §5.

- Gacha: review visual direction/core choices; rates/costs/pacing stay adjustable. Do not auto-start G02–G05 or payments; real gacha needs P09/P04/ledger (OD-13).
- UXD-08: regression 77/77 + 34 screens inspected 2026-11-11, team-page fixes and the single term ผังสกิล (owner “อนุมัติ”; [validation](docs/validation/uxd-08/README_TH.md)); real-device/human trial still open. Team-preset owner usability review remains open.

## Open items

- Skill step6: Shield Bash kept (owner); Challenge unused by advisor, Rouse ΔHP−8.6; Fade dropped for campaign gate, Shadow Step=hit8+dodge. Enemy difficulty is separate.
- MAP3 Briar Lord gate still falls to plain attacks83–98%; deferred P05; details in skill-rework validation. No real Safari/iPhone/Android or human usability validation.
- P03 motion: 7 staged 390px clips (circle/perfect/toll/ring/deflect/delay/falling star) in `docs/combat-presentation/unit-a12-slice/`; owner approved them with “ผ่าน ไปต่อได้” on 2026-11-11 (the 19 earlier A12 clips were not re-sent). Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. MAP quest tabs #213 and thin HP correction #215 are merged. Battle HUD #216/#217 and straight HP/status badges #218 are merged; checkout `/workspace/asterveil-battle-hud` has the implementation. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P09-02b (Opus): read CLAUDE/CURRENT_STATE and docs/design/p09/CLIENT_VIEW_TH.md §5 + SCHEMA_API_DRAFT_TH.md. First check the Cloudflare token has D1 Edit + Durable Objects; if not, stop and tell the owner. Build the Worker command endpoint on a per-account DO calling `processCommand` with a server `SeedSource`, storing game+book in one write; no gacha/payments/P04; keep save v58, rules and numbers unchanged; PR into `feature/fateweave-initial-prototype`.
