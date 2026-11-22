# Current state — updated 2026-11-22 (map 4 ทะเลสาบเงาจันทร์)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml` (runs the Chromium suite before deploy).
- Save **v68** (map 4 tide/notes/journal, camp cap; v67 first fate weave; v66 gacha). Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5, carry≤10, fatigue, presets. 15 classes×1 active character; thiran/wila parked. P09 server authority + ledger (`?server=off` for local).
- Maps: 1 ซากชายแดน, 2 เส้นทางป่าทึบ, 3 แนวรอยแยก, **4 ทะเลสาบเงาจันทร์** (concepts for 4–10: [CHAPTER1_MAPS_TH](docs/design/CHAPTER1_MAPS_TH.md)).
- **Map 4 (OD-60)**: rules/content/save PR #336; screens PR #337 (**awaiting owner approval** of 390px screens + clip in `docs/validation/map4-lake/`). Tide every 8 steps (`core/world/tide.ts`), seal 2 of 3, ferryman story → boat, reflections/notes → camp journal, Lio camp 1 / Cerise camp 2, boss ภูตธารา (Water Veil `mend`). Art is a recolour stand-in; Codex lake art delivered (PRs #338 world, #340 foes, #339 boss+VFX) and **passed intake checks 2026-11-22** (see handoff); **phase 1 (world tiles/decor/battle scene) imported on `claude/map4-lake-art`, owner-approved 2026-11-22 ("อนุมัติ"); phase 2 (4 plain foes) imported on `claude/map4-lake-foes`, awaiting owner motion approval; phase 3 (R1 serpent/siren) imported on `codex/map4-lake-elites` (#344), scaled against Tusker/Rift Weaver, owner-approved 2026-11-22 (“อนุมัติ”) ([390px clips](docs/combat-presentation/lake-elites-slice/README_TH.md))**. Phase 4 waits for the owner’s R1/R2 picks for Tide Lash, Undertow and Reflection ([handoff](docs/handoffs/CODEX-MAP4-LAKE-CONTINUE-TH.md)).
- Camp level cap = 10 + 3 per first clear past map 2 (≤30); tree points still stop at Lv10.
- P10 gacha (OD-58) live; cabinet after MAP1 with 10 first-clear tickets (OD-59). Unlock pacing #202.
- Art delegation: record agent picks as agent decisions, never owner visual approval.

## Owner rules in force

- 2026-11-18: external-test dates, E2–E4 and `LEGACY_IMPORT` are not gates.
- 2026-11-21: trio move names stay English.
- World Boss trio from week 2969 (OD-52); enemy aim OD-53, lessons OD-54, chat/friends OD-55/56, deploy grace OD-57 (3 h, `[no-grace]`).
- OD-60 (2026-11-22 “ตามแนะนำทั้ง 4 ข้อ ทำต่อได้”): recruits by story on maps 4–8 (Cerise/Kael/Wynne/Corin/Astrid; Lio/Brann/Toma/Sefa scenes, duplicate if owned), cap +3 per map, other planned systems are separate tasks, maps one at a time.

## Open items

- `npm run sim`: the C12 campaign gate (casual explorer 220 < 226) already failed on the base commit before map 4; needs its own look (re-measure or fix the cause, not a silent re-baseline).
- Lake sweep/contract pay map 3's values until a P04 economy pass; P04-05/06 numbers.
- Map 3 Briar Lord first-try gate; no real Safari/iPhone/Android or human usability validation. Pending intake #262, #169.

## Opening prompt for next chat

Ask for the owner’s Tide Lash / Undertow / Reflection R1/R2 choices before opening phase 4 from the phase 3 merge in #344, then continue from [the phase 4 handoff](docs/handoffs/CODEX-MAP4-LAKE-CONTINUE-TH.md). Map 5 (Lv13–16, abandoned crystal mine) follows map 4’s integration according to OD-60 and [CHAPTER1_MAPS_TH](docs/design/CHAPTER1_MAPS_TH.md).
