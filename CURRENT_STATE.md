# Current state — updated 2026-11-26 (Crystal Giant 4b imported)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml` (runs the Chromium suite before deploy).
- Save **v69** (mine progress; v68 map 4 tide/notes/journal, camp cap; v67 first fate weave; v66 gacha). Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5, carry≤10, fatigue, presets. 15 classes×1 active character; thiran/wila parked. P09 server authority + ledger (`?server=off` for local).
- Maps: 1 ซากชายแดน, 2 เส้นทางป่าทึบ, 3 แนวรอยแยก, 4 ทะเลสาบเงาจันทร์, **5 เหมืองผลึกร้าง** (concepts for 4–10: [CHAPTER1_MAPS_TH](docs/design/CHAPTER1_MAPS_TH.md)).
- **Map 4 (OD-60)**: rules/content/save #336, UI #337 and art #342–#345. Owner approved the four ordinary foes and the map screens 2026-11-23 (“อนุมัติ”). Tide every 8 steps, seal 2 of 3, ferryman → boat, reflections/notes → journal, Lio camp 1 / Cerise camp 2, semi-chibi Water Spirit with six 768px moves and event-driven VFX. [390px review](docs/validation/map4-lake/README_TH.md).
- Camp level cap = 10 + 3 per first clear past map 2 (≤30); tree points still stop at Lv10.
- P10 gacha (OD-58) live; cabinet after MAP1 with 10 first-clear tickets (OD-59). Unlock pacing #202.
- Art delegation: record agent picks as agent decisions, never owner visual approval.
- Character equipment slots keep their compact size. Empty slots show a large icon and faint slot name. Equipped art fills the slot and covers the name in camp and map character sheets.

## Owner rules in force

- 2026-11-18 “ไม่ต้องสนใจเส้นตายทดสอบภาพนอกอะไรนั่น”: external-test dates, E2–E4 and `LEGACY_IMPORT` are not gates. [Checklist](docs/design/EXTERNAL_TEST_CHECKLIST_TH.md) stays for reference.
- 2026-11-21: trio move names stay English (Thai naming task dropped).
- World Boss trio replaces the Warden from week 2969 = Mon 23 Nov 2026 06:00 Bangkok (OD-52); confirm three bars on `/v1/worldboss` after the switch.
- Enemy aim OD-53, lessons OD-54, chat/friends OD-55/56, deploy grace OD-57 (3 h, `[no-grace]`).

- OD-60 (2026-11-22 “ตามแนะนำทั้ง 4 ข้อ ทำต่อได้”): recruits by story on maps 4–8 (Cerise/Kael/Wynne/Corin/Astrid; Lio/Brann/Toma/Sefa scenes, duplicate if owned), cap +3 per map, other planned systems are separate tasks, maps one at a time.

## Owner decisions since P10

- 2026-11-22 “ทำตามที่คุณแนะนำ” (OD-61): the C12 campaign gate failure (explorer/casual 229→220) is the OD-59 starter pairs (#333), not a bug; that group alone re-baselined ([evidence](docs/validation/c12-gate-od59-2026-11-22/README_TH.md)). Balance note: Toma-first pairs clear the forest first try 23–30/48 (casual).
- 2026-11-22 “ยืนยันตามแนะนำ ดำเนินการขั้นต่อไปได้”: shard units (duplicate 10, unlock 50, 1–2 shards per pull) and D24 (a device wallet never becomes online rights) confirmed (OD-58).

## Open items

- Map 5 (OD-60, #356): save v69; giant tuned at 48 seeds (`crystal-giant` v2). Art in game: props, five semi-chibi foes, floors/rails/battle scene (#361–#363). Giant R1 1.32×, 4a approved; 4b (`77a6e4ba`, #359) imported on `claude/mine-boss-4b-intake` with event-driven armour/reflect/collapse/split VFX, owner approved the motion 2026-11-26 (“อนุมัติ”), merged in #365 ([390px review](docs/combat-presentation/mine-boss-slice/README_TH.md)); Shard Beam keeps a code-drawn line. Side events remain. [Brief](docs/handoffs/CODEX-ART-MAP5-MINE-TH.md) · [validation](docs/validation/map5-mine/README_TH.md). Game Feel #351/#352 notes moved to `docs/handoffs/archive/2026-11-26/`.
- 2026-11-25: boss charge holds sit on the body. Bosses wear a silhouette aura in their own colour: light all battle, stronger while charging. Boss crowns sit above the rendered figure. The owner said “นำเข้าเกมได้เลย”. Mobile frame rate is not measured yet. [Check](docs/validation/boss-hold-placement-2026-11-25/README_TH.md).
- Game Feel [Draft PR #353](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/353): เสียงและภาพโจมตีตามอาวุธครบ 15 ตัวและตัวละครเซฟเก่า 2 ตัว. [ผลตรวจ](docs/validation/roster-contact-2026-11-24/README_TH.md).

- Mobile performance still needs on-device measurements for walking, fog, and battle entry. [ผลตรวจท่าคืนตัว](docs/validation/recovery-continuity-2026-11-24/README_TH.md).

- Lake sweep/contract pay map 3's values until a P04 economy pass; P04-05/06 numbers.
- Map 3 Briar Lord first-try gate; no real Safari/iPhone/Android or human usability validation. Pending intake #262, #169.

## Opening prompt for next chat

The owner picks the next task. Candidate next work: Map 5 side events (see [the Map 5 validation](docs/validation/map5-mine/README_TH.md)).
