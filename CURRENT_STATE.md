# Current state — updated 2026-11-16 (P11-05 step 1 World Boss trio rules)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`, which again runs the Chromium suite before deploy (P12).
- Save v64 (P11-04 World Boss book; v63 board book + `run.day`; v62 sweep book); Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 server authority, ledger, weekly shards done (dev API default on Pages, `?server=off` for local; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## OD-13 status

All online systems before outsiders are built. **Owner 2026-11-16 OD-46**: external test **T = 14 Dec 2026**; legacy import closes itself 30 Nov 00:00 +07:00 (`LEGACY_IMPORT_UNTIL` set), set `LEGACY_IMPORT=closed` on 7 Dec (T−7); `CHAT_WRITE=all` (guests write); Cloudflare Free first; 10–20 known invitees, in-game feedback; draft numbers kept. Still from the owner: privacy contact text (E2), `accountId` for the admin row (E3), Google consent Publish before 30 Nov (E4). [Checklist](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md).

- Staging load test ready ([plan](docs/validation/p12-load/README_TH.md)): workflow `Cloudflare staging load test` (manual) deploys a throwaway `asterveil-api-staging` + D1, runs `tests/server-load.test.ts` from 1–4 runners (WorldBoss attempts with concurrent retries + outbox, chat poll/send), deletes both. **Cloudflare run 2026-11-16 passed** (4 runners × 5 accounts: 100 attempts with identical retries, ~2,200 chat reads + ~195 sends, no 429/5xx, worst 0.73 s); workflow file on `main` (dispatch with ref = game branch). Never point `LOAD_URL` at the dev API.
- World Boss (#259/#260): current warden live (5/week, 8 rounds, HP 2500/account). **Trio P11-05** ([doc](docs/design/WORLD_BOSS_TRIO_P11_05_TH.md), [sim](docs/validation/p11-05-2026-11-16/README_TH.md)), owner decisions OD-42–49. **Step 1 done**: resolver R1 breakable charge (stagger) + R2 court/summon; encounters `wb-kragmor`/`wb-valdrakk`/`wb-morvane` v1 in `src/content/encounters/world-boss-trio.ts` (not in the game catalog). Probe with real rules: Morvane harder than the old bound (starter loses 2 heroes, strong teams 361–444 dmg) — tune in step 6/owner. Owner open: trio for 14 Dec or warden first, OD id collision (→ OD-47–50), crafting/price, HP ×400. Motion WB-A prompt is with the owner; banner PR #262 superseded.
- Chat (#261): owner open numbers, `CHAT_WRITE`, word list, WebSocket/more channels.
- P09 open: inactive-guest cleanup, old-token reuse detection. Day reset 06:00 Bangkok (owner 2026-11-16). P04-06/shards owner numbers open. P04-05 catch-up EXP recheck with P06.
- Gacha: G00/G01 analysis delivered (`docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_*`); owner wants system/visual discussion first. No G02–G05/payments; real gacha needs the server wallet on the ledger.
- UXD-08 done; real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). No real Safari/iPhone/Android or human usability validation.
- Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P11-05 step 2 — World Boss trio world rules, items and save v65 (Opus). Read CLAUDE.md, CURRENT_STATE.md, docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §2–§4 and §8, docs/validation/p11-05-2026-11-16/README_TH.md and the fateweave-rules-and-sim skill. Step 1 is merged (R1/R2 in the resolver, `src/content/encounters/world-boss-trio.ts`). In `core/world/world-boss.ts` + `content/world/rules.ts`: attempts per boss (5 a week shared across the three), a book per boss, boss shards (`bossShards`), attempt/personal milestones from design §2, boss items `bulwark`/`breaker`/`reaper` with their powers + `craftBossItem` (chosen affixes/set, 40 shards + 30 ore + 10 dust); register the three encounters in the catalog; save v65 with a safe v64 migration (warden week kept as `legacy`); budget test 1195 ≤ 1200 and a three-boss week sim. Offline attempts pay the offline shard rule (OD-49). No server or UI change yet (steps 3–4). Branch, PR into feature/fateweave-initial-prototype, subscribe, merge on quality+browser pass, handoff entry, rewrite this file (<6000 bytes) with step 3's prompt.
