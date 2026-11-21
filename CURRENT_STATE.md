# Current state — updated 2026-11-21 (P10 free-ticket gacha)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml` (runs the Chromium suite before deploy).
- Save **v66** (P10 gacha wallet; v65 trio; v64 World Boss; v63 board). Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5, carry≤10, fatigue, team presets. 15 classes×1 active character; thiran/wila parked. P09 server authority + ledger (`?server=off` for local).
- **P10 gacha (OD-58, [spec](docs/design/GACHA_P10_SPEC_TH.md))**: rules/server merged via #328/#329; tickets from daily patrol 1, weekly tasks 2 each, trio p-2/p-4 2+2, trio 50% shared 1 each (≤24/week = 96/28 d); 7.5% full copy over 15, else 1–2 shards; 80 points exchange; opens after MAP2; journal `GET /v1/gacha/history`. UI #330 (ART-UI-GACHA-003 R1 stage/VFX/cards) **owner-approved 2026-11-21 “อนุมัติ”** (screens + clip in `docs/validation/p10-gacha-2026-11-21/`). No sales (G07 out of scope).
- Perf R1–R11 merged; image-blank B1–B6 done (B4 blurred placeholders, B5 lossy map atlases: owner approved 2026-11-21, PR #325, [validation](docs/validation/image-blank-b4-b5-2026-11-21/README_TH.md)); re-measure on a real phone.
- Unlock pacing #202: quests/team after MAP1; hire/market/hunt/gacha after MAP2; advanced services/hard after MAP3.
- Art delegation: record agent picks as agent decisions, never owner visual approval.

## Owner rules in force

- 2026-11-18 “ไม่ต้องสนใจเส้นตายทดสอบภาพนอกอะไรนั่น”: external-test dates, E2–E4 and `LEGACY_IMPORT` are not gates. [Checklist](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md) stays for reference.
- 2026-11-21: trio move names stay English (Thai naming task dropped).
- World Boss trio replaces the Warden from week 2969 = Mon 23 Nov 2026 06:00 Bangkok (OD-52); confirm three bars on `/v1/worldboss` after the switch.
- Enemy aim OD-53, lessons OD-54, chat/friends OD-55/56, deploy grace OD-57 (3 h, `[no-grace]`).

## Waiting for the owner

1. Confirm D24 (a device wallet never becomes online rights; import starts it empty) and the shard-unit mapping (duplicate 10, unlock 50, 1–2 live shards per pull; spec §3).

## Open items

- Staging load test with concurrent pulls (workflow `Cloudflare staging load test`, ref = game branch; never point `LOAD_URL` at the dev API).
- Gacha art: #212 references (key art, Saturn ring) not integrated; brief Codex with `fateweave-codex-art-brief` if the owner wants them.
- P09: inactive-guest cleanup, old-token reuse detection. P04-05/06 numbers; P04-05 catch-up EXP recheck with P06.
- Map 3 Briar Lord first-try gate; no real Safari/iPhone/Android or human usability validation. Pending intake #262, #169; #55/#53 wait systems.

## Opening prompt for next chat

P10 follow-up (Sonnet unless rules change): run the staging load test with concurrent `gachaPull` added to `tests/server-load.test.ts`, and apply any owner changes to D24/shard units (bump `gacha.version` if outcomes change). Otherwise the owner picks the next task.
