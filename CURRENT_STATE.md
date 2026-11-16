# Current state — updated 2026-11-16 (P11-05 step 3 World Boss trio server)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`, which again runs the Chromium suite before deploy (P12).
- Save v65 (P11-05 trio book/boss shards/trio items; v64 World Boss book; v63 board book); Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 server authority, ledger, weekly shards done (dev API default on Pages, `?server=off` for local; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## OD-13 status

All online systems before outsiders are built. **Owner 2026-11-16 OD-50**: external test **T = 14 Dec 2026**; legacy import closes itself 30 Nov 00:00 +07:00 (`LEGACY_IMPORT_UNTIL` set), set `LEGACY_IMPORT=closed` on 7 Dec (T−7); `CHAT_WRITE=all` (guests write); Cloudflare Free first; 10–20 known invitees, in-game feedback; draft numbers kept. Still from the owner: privacy contact text (E2), `accountId` for the admin row (E3), Google consent Publish before 30 Nov (E4). [Checklist](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md).

- Staging load test ready ([plan](docs/validation/p12-load/README_TH.md)): workflow `Cloudflare staging load test` (manual) deploys a throwaway `asterveil-api-staging` + D1, runs `tests/server-load.test.ts` from 1–4 runners (WorldBoss attempts with concurrent retries + outbox, chat poll/send), deletes both. **Cloudflare run 2026-11-16 passed** (4 runners × 5 accounts: 100 attempts with identical retries, ~2,200 chat reads + ~195 sends, no 429/5xx, worst 0.73 s); workflow file on `main` (dispatch with ref = game branch). Never point `LOAD_URL` at the dev API.
- World Boss (#259/#260): current warden live (5/week, 8 rounds, HP 2500/account). **OD-51**: the 14 Dec test opens with the warden; switch to the trio only if steps 1–4 + art A pass before 7 Dec; §9 drafts 3–5 (crafting 40 boss shards+30 ore+10 dust, central shards 3→2, ore/gold 6/3→4/2, shared HP ×400 min 1500) approved for the test. **Trio P11-05** ([doc](docs/design/WORLD_BOSS_TRIO_P11_05_TH.md), [validation](docs/validation/p11-05-2026-11-16/README_TH.md)), OD-42–49. Steps 1–2 done (resolver, rules, items, save v65, budget 1195 ≤ 1200). **Step 3 done**: `WorldBoss` DO `bars (week, boss)` (warden bar, or three trio bars from `trio.from`, HP `trioSharedHp`), hits carry `boss`, ledger `boss`/`shards`, claims read the id's bar, `/v1/worldboss` adds `bars`/`lastBars` (`current`/`last` = warden). `from` unset, so the warden stays live; trio encounters are in `encounterById` only (no body clips yet). Morvane damage tuning waits for step 6. Motion WB-A prompt is with the owner; staging trio load run waits for `from`.
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

P11-05 step 4 — World Boss trio UI (Sonnet; OD-51: the warden stays live for the 14 Dec test unless the trio passes before 7 Dec). Read CLAUDE.md, CURRENT_STATE.md, docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §6/§8, docs/context/UI_INPUT_RULES.md, docs/validation/p11-05-2026-11-16/README_TH.md. Steps 1–3 are merged: rules `gameRules.worldBoss.trio` (`trioLive`, `worldBoss { boss }`, `claimWorldBoss` ids `<boss>:s-50`, `craftBossItem`, `Profile.bossShards`), server `/v1/worldboss` → `{ week, current, last, bars, lastBars }` (`ServerClient.WorldBossStatus.bars`). Build in DOM/CSS from real state: camp banner above the bottom nav (opens after map 1), the full-screen World Boss page with four ≥44px tabs (fight: three boss cards with shared bars online, allowance n/5; rewards: participation, p-2/p-4, three bosses × s-50/s-100 claims + last week incl. the warden; craft: three items, shards n/40, affix/set sheet, locked until `craft`; bosses: mechanics text); drop the quest-board World Boss tab; and intent labels "ทำลายได้" (Valdrakk breakable charge) and "ราชสำนัก +n%" (Morvane court) from the resolver. The warden path must keep working while `trio.from` is unset (test the trio UI with a rules copy that sets `from`). Placeholder sprites; no rule/save change; Chromium 390px spec + 1–2 screenshots. Branch, PR into feature/fateweave-initial-prototype, subscribe, merge on quality+browser pass, handoff entry, rewrite CURRENT_STATE.md (<6000 bytes) with step 5's prompt.
