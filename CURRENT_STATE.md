# Current state — updated 2026-11-10

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pre-release pushes deploy after lint/unit/build; browser PR gate is path-filtered. Restore Pages browser gate before OD-13 external tests.
- Save v58; Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked, existing rights preserved. No gacha wallet/accounts/reward ledger; Worker only `/health`.
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Battle HUD: owner-approved front-only thin HP arcs on both sides, upper name/numeric-HP inspector, boss crowns/adaptive scale and original five lower HP cards. Green >40%, orange >25–40%, red ≤25%. Implemented on `codex/battle-front-hp-inspector` from #215 (`bd3fbab`); required PR gates/merge pending. [Real screenshots/validation](docs/validation/battle-front-hp/README_TH.md).
- MAP quest tabs #213 merged (`da1d508`): existing objective entry opens เป้าหมาย / เควสต์ in one compact scrollable dialog; settled camp-board progress, original MAP1 unlock and camp-only rewards. Implementation follows the owner-approved combined-tab mockup; Quality/browser passed before merge.
- Skill popup proportions #210 complete (`b1d1d42`); earlier popup/UI #208/#207/#205/#204/#203 and VFX #200 merged. Evidence and tests in handoff log.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references saved:** PR #212, branch `art/art-ui-gacha-002`, package `incoming/ART-UI-GACHA-002/` on that branch. [Gallery](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/art/art-ui-gacha-002/incoming/ART-UI-GACHA-002/README_TH.md). Latest main artwork + draggable Saturn-ring concept; full characters use full-body cards, shards use broken crystals/quantity labels. 11 PNG originals remotely downloaded and SHA256/decode verified. Reference only; no runtime integration/motion approval.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; reproducible 33-case/365-day research in `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`.
- 80 points/free80–96 per28d and rates remain drafts. G00 is a decision sheet, not signed-off config; G01 does not certify production pacing. Current controls include story/draft/seeded gold board, ore/gold, favorite/collection, paid30d, veteran/returner and hoarding/growth sensitivities.
- Owner later deferred numeric tuning (including 7–10 visits) and wants system/visual discussion first; final economy assumes all planned features exist, using80–96 as draft, not a temporary absent-mode workaround. Universal/overflow/legacy trust remain open. MAP1 yields5 members; actual item/tome/session readiness unverified. No runtime/rules/save/balance/P09/payment work yet.
- Earlier proposal #209 (`0fb8d8c`) and 12-case model remain historical drafts; new findings extend them, not owner approval.

## Next (owner review)

- Review the saved visual direction and core system choices; leave rates/costs/pacing adjustable for later tuning. Do not automatically start G02/P09/G03/G04/G05 or payments. Real gacha still needs P09/P04/ledger/trust; OD-13 order applies.
- UXD-08 combined UX check open. Team-preset owner usability review remains open.

## Open items

- Skill step6: Shield Bash kept (owner); Challenge unused by advisor, Rouse ΔHP−8.6; Fade dropped for campaign gate, Shadow Step=hit8+dodge. Enemy difficulty is separate.
- MAP3 Briar Lord gate still falls to plain attacks83–98%; deferred P05; details in skill-rework validation. No real Safari/iPhone/Android or human usability validation.
- P03 motion circle/toll/dial unseen in game; owner motion review pending. Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. MAP quest tabs #213 and thin HP correction #215 are merged. Current HUD work is on `codex/battle-front-hp-inspector`; keep the separate gacha work unchanged.

## Opening prompt for next chat

Read AGENTS/CLAUDE/CURRENT_STATE, G00/G01 evidence and the ART-UI-GACHA-002 gallery on art/art-ui-gacha-002 (PR #212). Continue owner-led gacha system/visual discussion; numbers/pacing stay draft for later tuning and the final game assumes all planned modes. Use latest Saturn-ring character/shard distinction, not old result grids. Images are references only; do not implement runtime/save/balance/P09/payments without that scoped request.
