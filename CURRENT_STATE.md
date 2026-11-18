# Current state — updated 2026-11-18 (World Boss pre-fight guides)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`, which again runs the Chromium suite before deploy (P12).
- Save v65 (P11-05 trio book/boss shards/trio items; v64 World Boss book; v63 board book); Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 server authority, ledger, weekly shards done (dev API default on Pages, `?server=off` for local; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3.
- Art delegation remains: record agent picks as agent decisions, never owner visual approval.

## OD-13 status

All online systems before outsiders are built. **Owner 2026-11-16 OD-50**: external test **T = 14 Dec 2026**; legacy import closes itself 30 Nov 00:00 +07:00 (`LEGACY_IMPORT_UNTIL` set), set `LEGACY_IMPORT=closed` on 7 Dec (T−7); `CHAT_WRITE=all` (guests write); Cloudflare Free first; 10–20 known invitees, in-game feedback; draft numbers kept. Still from the owner: privacy contact text (E2), `accountId` for the admin row (E3), Google consent Publish before 30 Nov (E4). [Checklist](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md).

- Staging load test ready ([plan](docs/validation/p12-load/README_TH.md)): workflow `Cloudflare staging load test` (manual) deploys a throwaway `asterveil-api-staging` + D1, runs `tests/server-load.test.ts` from 1–4 runners (WorldBoss attempts with concurrent retries + outbox, chat poll/send), deletes both. **Cloudflare run 2026-11-16 passed** (4 runners × 5 accounts: 100 attempts with identical retries, ~2,200 chat reads + ~195 sends, no 429/5xx, worst 0.73 s); workflow file on `main` (dispatch with ref = game branch). Never point `LOAD_URL` at the dev API.
- World Boss (#259/#260): Warden stays for the 14 Dec test under OD-51 (5/week, 8 rounds, HP 2500/account). P11-05 trio steps 1–5 are integrated (save v65, DO bars, UI, approved art/animations, #294 VFX and #295 stills/portraits; no Thai move names; #292 stays separate and unmerged). All three trio bosses show a pre-fight guide below the selected card. Morvane also has an optional in-battle coach. It produced credited damage through round 8 for all 10 map-1 recruitment profiles tested. At 400 HP/attempt, 20 modeled accounts with half using the coach reached 50% in 98% of weeks and killed in 47–48%. The 14 Dec test stays on Warden; no change to Call the Court, HP or `trio.from`. Candidate boundary 7 Dec 06:00 Bangkok = week 2971. [Coach evidence](docs/validation/p11-05-morvane-coach/README_TH.md).
- Chat (#261): owner open numbers, `CHAT_WRITE`, word list, WebSocket/more channels.
- P09 open: inactive-guest cleanup, old-token reuse detection. Day reset 06:00 Bangkok (owner 2026-11-16). P04-06/shards owner numbers open. P04-05 catch-up EXP recheck with P06.
- Gacha: G00/G01 analysis delivered (`docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_*`); owner wants system/visual discussion first. No G02–G05/payments; real gacha needs the server wallet on the ledger.
- UXD-08 done; real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). No real Safari/iPhone/Android or human usability validation.
- Pending intake: #262 Warden banner, #169 continent, #234 compact title. #55 pets/#53 later bosses wait systems; #122 parked (OD-14). #133 UX and #165 poses have game implementations. Lyra atlas above guideline.

## Workspace

Verify remote ancestry; preserve unpushed/gacha work. No old checkpoint imports.

## Opening prompt for next chat

P11-05 release readiness — read the Morvane coach evidence and OD-51. Use playtest feedback to validate coach uptake and the projected 50%/100% rewards; keep Warden until the activation gate and staging plan are ready. If shared HP still needs tuning, see “ฝากถึง Claude” in `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`.
