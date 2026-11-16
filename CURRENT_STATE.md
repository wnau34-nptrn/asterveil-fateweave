# Current state — updated 2026-11-16 (P11-05 step 5 WB-A Kragmor intake)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`, which again runs the Chromium suite before deploy (P12).
- Save v65 (P11-05 trio book/boss shards/trio items; v64 World Boss book; v63 board book); Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 server authority, ledger, weekly shards done (dev API default on Pages, `?server=off` for local; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## OD-13 status

All online systems before outsiders are built. **Owner 2026-11-16 OD-50**: external test **T = 14 Dec 2026**; legacy import closes itself 30 Nov 00:00 +07:00 (`LEGACY_IMPORT_UNTIL` set), set `LEGACY_IMPORT=closed` on 7 Dec (T−7); `CHAT_WRITE=all` (guests write); Cloudflare Free first; 10–20 known invitees, in-game feedback; draft numbers kept. Still from the owner: privacy contact text (E2), `accountId` for the admin row (E3), Google consent Publish before 30 Nov (E4). [Checklist](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md).

- Staging load test ready ([plan](docs/validation/p12-load/README_TH.md)): workflow `Cloudflare staging load test` (manual) deploys a throwaway `asterveil-api-staging` + D1, runs `tests/server-load.test.ts` from 1–4 runners (WorldBoss attempts with concurrent retries + outbox, chat poll/send), deletes both. **Cloudflare run 2026-11-16 passed** (4 runners × 5 accounts: 100 attempts with identical retries, ~2,200 chat reads + ~195 sends, no 429/5xx, worst 0.73 s); workflow file on `main` (dispatch with ref = game branch). Never point `LOAD_URL` at the dev API.
- World Boss (#259/#260): warden live (5/week, 8 rounds, HP 2500/account). **OD-51**: the 14 Dec test opens with the warden; trio only if steps 1–5 pass before 7 Dec; §9 drafts 3–5 approved for the test. **Trio P11-05** ([doc](docs/design/WORLD_BOSS_TRIO_P11_05_TH.md), [validation](docs/validation/p11-05-2026-11-16/README_TH.md)), OD-42–49. Steps 1–4 done (resolver, rules/items/save v65, server `bars`, UI in `world-boss-panel.ts`; warden path unchanged while `trio.from` is unset). **Step 5 mostly done**: WB-A Kragmor imported and **owner-approved** (#282 merged); banners/emblems/item icons imported and the camp card shares the top row with the quest board (#284 merged); WB-B Valdrakk imported as a draft (PR `claude/p11-05-wbb-intake`, [clips](docs/combat-presentation/unit-wbb-slice/README_TH.md)) — **owner motion approval pending, do not merge before**; Codex flagged it not proportion-certified (20/44 frames unmeasured). Both bosses borrow the warden's still/portrait (`PLACEHOLDER_STILLS`); `presentedEncounters` feeds coverage/budget; the boss `art` lines changed the content version (deploy server+game together). **Open for step 5**: owner decision on WB-B (approve or send fixes to Codex as whole strips); WB-C Morvane (prompt sent to the owner, nothing delivered; `docs/handoffs/CODEX-WB-TRIO-PROMPTS-TH.md`) → same intake; Thai move names for Kragmor/Valdrakk (`intentName`); trio stills/portraits. Morvane tuning: step 6. Staging trio load run waits for `from`.
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

P11-05 step 6 — World Boss trio sim and probe (Opus; only after step 5 art is approved and merged, else the warden stays for the 14 Dec test, OD-51). Read CLAUDE.md, CURRENT_STATE.md, docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §1, §3, §9 and the skill `fateweave-rules-and-sim`. Run `npm run sim` and the P11-05 probe (`tests/probe/p1105-world-boss-trio.test.ts`) with the real rules instead of the design's answer/ignore variants; tune Morvane (R2 court) and the draft numbers only with simulation evidence and owner decisions; decide `WorldBossTrioRules.from` scheduling (a Monday before 14 Dec, OD-51) and set it; run the `Cloudflare staging load test` workflow with the trio live (ref = game branch, never the dev API); check `npm run coverage:presentation` and the content version. Branch, PR into feature/fateweave-initial-prototype, subscribe, merge on quality+browser pass, handoff entry, rewrite this file (<6000 bytes).
