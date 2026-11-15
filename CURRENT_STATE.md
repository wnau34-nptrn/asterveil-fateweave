# Current state — updated 2026-11-15 (P12 external-test readiness)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml`, which again runs the Chromium suite before deploy (P12).
- Save v64 (P11-04 World Boss book; v63 board book + `run.day`; v62 sweep book); Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5 by chapter, carry≤10, fatigue and team presets. W1–W8/P01/P02 done; 15 classes×1 active character; thiran/wila parked. No gacha wallet. P09 server authority, ledger, weekly shards done (dev API default on Pages, `?server=off` for local; [docs/design/p09/README_TH.md](docs/design/p09/README_TH.md)).
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt after MAP2; advanced services/hard after MAP3.
- Owner art delegation 2026-11-04 remains: Claude may decide art picks; record as Claude decision, not owner approval.

## OD-13 status

All online systems before outsiders are built: W8 → P01 → P02 → P09 → P04 → server rewards → chat + World Boss. **Next is the external test itself, gated on the owner**: [docs/design/EXTERNAL_TEST_CHECKLIST_TH.md](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md) §1 (test date T, privacy contact line, owner admin row, Google consent publish, `CHAT_WRITE`, chat privacy wording, Cloudflare plan D8, invites). §2 lists the draft numbers still open (fine to test with).

- Staging load test ready ([plan](docs/validation/p12-load/README_TH.md)): workflow `Cloudflare staging load test` (manual) deploys a throwaway `asterveil-api-staging` + D1, runs `tests/server-load.test.ts` from 1–4 runners (WorldBoss attempts with concurrent retries + outbox, chat poll/send), deletes both. Local wrangler runs pass; read the Cloudflare numbers from its run summary. Never point `LOAD_URL` at the dev API.
- World Boss (#259/#260): owner open 5/week, 8 rounds, sweep cut, HP 2500/account; no rotation/scaling or motion clips yet.
- Chat (#261): owner open numbers, `CHAT_WRITE`, word list, WebSocket/more channels.
- P09 open: inactive-guest cleanup, old-token reuse detection, reset time zone. P04-06/shards owner numbers open. P04-05 catch-up EXP recheck with P06.
- Gacha: G00/G01 analysis delivered (`docs/design/GACHA_G00_DECISIONS_TH.md`, `GACHA_G01_*`); owner wants system/visual discussion first. No G02–G05/payments; real gacha needs the server wallet on the ledger.
- UXD-08 done; real-device/human trial and team-preset usability review open.

## Open items

- Skill step6 notes (Challenge unused by advisor, Rouse ΔHP−8.6): skill-rework validation.
- Map 3 Briar Lord gate: first try falls to blind attacks 23% (rush)/65% (explorer); Lv10 replays 78–91% accepted (OD-35). No real Safari/iPhone/Android or human usability validation.
- Art A7-003 parked (OD-14); Lyra atlas above guideline. Open art PRs #133/#122/#55/#53 remain separate; do not merge Artwork automatically.

## Workspace

Cloud checkouts are fresh; verify remote head/ancestry, never reset unpushed work or automatically import checkpoints cc51cd4/bcd6133 or codex/uxd-02-release-notes. Keep the separate gacha work unchanged.

## Opening prompt for next chat

P13 external-test launch support (OD-13). Sonnet unless a rule/save change is needed. Read CLAUDE.md, CURRENT_STATE.md and docs/design/EXTERNAL_TEST_CHECKLIST_TH.md. First apply any owner answers to checklist §1 (test date T → set `LEGACY_IMPORT_UNTIL` per SAFETY_P09_02G §4; privacy contact line in `public/privacy.html`; owner admin row via `wrangler d1 execute` in a workflow, never printing Wrangler output; `CHAT_WRITE` in `cloudflare/wrangler.json`) and any owner number changes in §2 (rules/sim skill if numbers move). If the owner has not answered, ask once with the §1 list and otherwise run the `Cloudflare staging load test` workflow on the branch head and record its summary numbers in docs/validation/p12-load/README_TH.md. No rule/save changes without an owner decision. Branch, PR into feature/fateweave-initial-prototype, subscribe, merge on quality+browser pass, handoff entry, rewrite this file (<6000 bytes).
