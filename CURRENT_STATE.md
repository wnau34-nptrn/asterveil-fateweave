# Current state — updated 2026-11-18 (World Boss trio go-live, OD-52)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`, which again runs the Chromium suite before deploy (P12).
- Save v65 (P11-05 trio book/boss shards/trio items; v64 World Boss book; v63 board book); Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 server authority, ledger, weekly shards done (dev API default on Pages, `?server=off` for local; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3.
- Title uses the original party artwork with a compact primary dock and top-right Setup for audio, save details, account/recovery, feedback, privacy and restart. Import stays the primary action while a local-save offer is available.
- Art delegation remains: record agent picks as agent decisions, never owner visual approval.

## OD-13 status

All online systems before outsiders are built. External-test items (OD-50 dates, E2–E4, `LEGACY_IMPORT`) are parked: owner 2026-11-18 “ไม่ต้องสนใจเส้นตายทดสอบภาพนอกอะไรนั่น”; do not raise them as gates. [Checklist](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md) stays for reference.

- Staging load test ([plan](docs/validation/p12-load/README_TH.md)): workflow `Cloudflare staging load test` (manual; dispatch with ref = game branch) deploys a throwaway `asterveil-api-staging` + D1, runs `tests/server-load.test.ts` from 1–4 runners, deletes both. Input `trio=now` starts the trio on the staging copy only. Trio run 2026-11-18 passed (4×5 accounts, 100 attempts on three bars, identical retries, no 429/5xx, worst 0.78 s). Never point `LOAD_URL` at the dev API.
- World Boss: **OD-52 (2026-11-18): the trio Kragmor/Valdrakk/Morvane replaces the Warden from week 2969 = Mon 23 Nov 2026 06:00 Bangkok** (`trio.from`, PR #301). Week 2968 is the last Warden week (its claims stay open a week). Draft numbers unchanged: 400 HP/attempt (min 1500), first trio week HP = Warden attempts ÷ 3 × 400, Call the Court as is. Pre-fight guides on all three; optional Morvane coach. Sim: 20 accounts with half using the coach reach 50% in 98% of weeks, kill 47–48% (Morvane); Kragmor/Valdrakk 97–100%. [Go-live evidence](docs/validation/p11-05-go-live/README_TH.md). #292 stays separate and unmerged.
- Chat (#261): owner open numbers, `CHAT_WRITE`, word list, WebSocket/more channels.
- P09 open: inactive-guest cleanup, old-token reuse detection. Day reset 06:00 Bangkok (owner 2026-11-16). P04-06/shards owner numbers open. P04-05 catch-up EXP recheck with P06.
- Gacha: G00/G01 analysis delivered (`docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_*`); owner wants system/visual discussion first. No G02–G05/payments; real gacha needs the server wallet on the ledger.
- UXD-08 done; real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). No real Safari/iPhone/Android or human usability validation.
- Pending intake: #262 Warden banner, #169 continent. Compact title is implemented from the owner mockup; #234 remains a separate proposal. #55 pets/#53 later bosses wait systems; #122 parked (OD-14). #133 UX and #165 poses have game implementations. Lyra atlas above guideline.

## Workspace

Verify remote ancestry; preserve unpushed/gacha work. No old checkpoint imports.

## Opening prompt for next chat

The owner picks the next task. Suggested (Sonnet is enough): “P11-05 post-switch check — after Mon 23 Nov 06:00 Bangkok, read `GET /v1/worldboss` on the dev API (three bars, HP = last Warden week's attempts ÷ 3 × 400, min 1500) and the Warden week-2968 claims. Play one trio attempt per boss at 390px on Pages, and record the results in `docs/validation/p11-05-go-live/README_TH.md`. Change numbers only with playtest evidence (`ฝากถึง Claude` in `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`: compare Morvane at 350/300 HP if coach uptake is low).”
