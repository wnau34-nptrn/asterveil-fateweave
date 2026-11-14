# Current state — updated 2026-11-14 (P05)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`. Pages deploys after lint/unit/build; restore its browser gate before OD-13 external tests.
- Save v60 (P04-03 tree points; v59 P04-02 shards); Phaser/TypeScript/Vite, local saves, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet/reward ledger. P09 02a–03 done (server decides/seeds, dev API `?server=<url>`; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3. Rights follow cleared history.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## Active task

- **Gacha visual references:** PR #212 (`art/art-ui-gacha-002`, `incoming/ART-UI-GACHA-002/`), reference only.

- **G00/G01 analysis delivered:** `docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_ECONOMY_TH.md`, `GACHA_G01_MIGRATION_TH.md`; research `docs/validation/gacha-g00-g01-2026-11-09/README_TH.md`. Rates/points (80, free 80–96 per 28d) are drafts; owner deferred numeric tuning and wants system/visual discussion first. Universal/overflow/legacy trust open. No runtime/rules/save/balance/payment work yet.

## Next (owner review)

- P09: 02g (#236), 03 (#237) done; Pages plays through the dev API by default (#238, owner “ข้อ 1”). Owner: privacy contact line, test date T, own admin row, Google consent publish. Open: inactive-guest cleanup, old-token reuse detection.
- P04: OD-15–30 recorded. P04-02 done (shards replace dupes/seals, save v59). P04-03 done ([validation](docs/validation/p04-03-2026-11-14/README_TH.md)): tree points = camp Lv2–10 + 1 per map first cleared (normal); none from stars/hard (12 after MAP3); over-allowance trees reset free (save v60). [Chapter plan](docs/design/p04/TREE_BIGPICTURE_P04_03_TH.md): no node levels; growth by personal branches (10 characters lack one), tier-4 capstones, promotion pairs; camp Lv cap by newest open map 10/12/15/17/20/23/26/30 (OD-28–30, P06 work). P04-04 done ([validation](docs/validation/p04-04-2026-11-14/README_TH.md)): ★1 in a ★3 team clears like ★5 (OD-01 holds); rift #1 9→7 was noise. Owner “ตามที่แนะนำ” → OD-31–33. P04-04b done ([validation](docs/validation/p04-04b-2026-11-14/README_TH.md)): casual campaign 48 companies, character-sim at map camp level.

- P05 started ([validation](docs/validation/p05-2026-11-14/README_TH.md)): Briar Lord (v11) and rift warden (v21) wear the `veilguard` bark on normal (answer: Aira's Mark/acid/dispel); helpers' unanswered chip moved into bosses' announced moves (warden wisps 70%, tusk chief v8 sprite −25%/charges +25%, stalker −20%/lord ~+10%). Casual rush rift #1 71→79%, explorer/casual forest #1 58→71%. Owner “เห็นด้วย” → OD-34 (bosses are enough; more rift #1 via P04-05/06 pacing) and OD-35 (replay gate stays easy; hard mode/sweep carry replays). P05-03 done ([validation](docs/validation/p05-03-2026-11-14/README_TH.md)): veil golem v10 wears the bark (blind attacks rush 63→11%, explorer 92→19%; casual same), map 1 captain already 0% blind with ≥2 answers. Remaining P05: 01/02, 04.
- Gacha: review visual direction/core choices; rates/costs/pacing stay adjustable. Do not auto-start G02–G05 or payments; real gacha needs P09/P04/ledger (OD-13).
- UXD-08 done (owner “อนุมัติ”, [validation](docs/validation/uxd-08/README_TH.md)); real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). Lio's main-stat gear ties off-stat gear (class-sim tolerance 1 pt). No real Safari/iPhone/Android or human usability validation.
- P03 motion clips approved 2026-11-11 (`docs/combat-presentation/unit-a12-slice/`). Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P04-05/06 fatigue/reserve-swap + pacing (Opus; per OD-34). Read CLAUDE.md, CURRENT_STATE.md, OD-05–OD-12 and OD-34 in docs/design/OWNER_DECISIONS_TH.md, docs/validation/p05-2026-11-14/README_TH.md and the fateweave-rules-and-sim skill. Problem: casual rush companies reach the rift warden at Lv8 and arrive hurt (casual rift #1 79%, advisor 92%); look at level pacing, fatigue/reserve swap and campfire recovery rather than boss strength. Measure first with the P05 bench and campaign sim, propose numbers, validate with `npm run sim`. Finish per CLAUDE.md: branch, PR into feature/fateweave-initial-prototype, subscribe, merge when quality (+browser) pass, validation note, one handoff entry, rewrite CURRENT_STATE.md (<6000 bytes) with the next prompt.
