# Current state — updated 2026-11-26 (Map 5 art in game; giant 4b delivered)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml` (runs the Chromium suite before deploy).
- Save **v69 on the mine branch** (mine progress; v68 map 4 tide/notes/journal, camp cap; v67 first fate weave; v66 gacha). Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5, carry≤10, fatigue, presets. 15 classes×1 active character; thiran/wila parked. P09 server authority + ledger (`?server=off` for local).
- Maps: 1 ซากชายแดน, 2 เส้นทางป่าทึบ, 3 แนวรอยแยก, 4 ทะเลสาบเงาจันทร์, **5 เหมืองผลึกร้าง** (work branch; concepts for 4–10: [CHAPTER1_MAPS_TH](docs/design/CHAPTER1_MAPS_TH.md)).
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

- Map 5 (design approved, “ทำตามที่คุณแนะนำ”): unlocks after the lake; save v69; Crystal Giant tuned at 48 seeds 2026-11-26 (`crystal-giant` v2: casual rush 78%, basic-only ≤22%). PR #356. Giant R1 at 1.32×; motion sample 4a approved (“อนุมัติ 4a”). Art ([brief](docs/handoffs/CODEX-ART-MAP5-MINE-TH.md)): props #358, the five semi-chibi foes #360, floors/rails/battle backdrop #357 in game; giant 4b delivered on `art/art-unit-animation-mine-boss-001` (`77a6e4ba`, PR #359 draft into `claude/friendly-heisenberg-xapns5`), not yet reviewed or imported. Side events remain. [Mine validation](docs/validation/map5-mine/README_TH.md).
- 2026-11-25: boss charge holds sit on the body. Bosses wear a silhouette aura in their own colour: light all battle, stronger while charging. Boss crowns sit above the rendered figure. The owner said “นำเข้าเกมได้เลย”. Mobile frame rate is not measured yet. [Check](docs/validation/boss-hold-placement-2026-11-25/README_TH.md).
- Game Feel [Draft PR #353](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/353): เสียงและภาพโจมตีตามอาวุธครบ 15 ตัวและตัวละครเซฟเก่า 2 ตัว. [ผลตรวจ](docs/validation/roster-contact-2026-11-24/README_TH.md).
- Game Feel #352 รวมแล้ว (`3b746ac`): จังหวะเสียง Duelist/Execute และเสียงโล่รับเต็ม. [ผลตรวจ](docs/validation/steel-contact-2026-11-24/README_TH.md).

- Game Feel: shared atlas merged in #351 (`411b9e1`), saving 1.89 MiB on cold Chromium runs. [ผลวัด atlas](docs/validation/shared-units-atlas-2026-11-24/README_TH.md).
- Mobile performance still needs on-device measurements for walking, fog, and battle entry. [ผลตรวจท่าคืนตัว](docs/validation/recovery-continuity-2026-11-24/README_TH.md).

- Lake sweep/contract pay map 3's values until a P04 economy pass; P04-05/06 numbers.
- Map 3 Briar Lord first-try gate; no real Safari/iPhone/Android or human usability validation. Pending intake #262, #169.

## Opening prompt for next chat

Review and import Codex's Crystal Giant 4b (ART-UNIT-ANIMATION-MINE-BOSS-001, branch `art/art-unit-animation-mine-boss-001` at `77a6e4ba`, PR #359 draft based on `claude/friendly-heisenberg-xapns5`; retarget it to `feature/fateweave-initial-prototype`). Brief: [CODEX-ART-MAP5-MINE-TH](docs/handoffs/CODEX-ART-MAP5-MINE-TH.md) (4a approved, 4b in round 2; the giant stays R1 at 1.32×, exempt from semi-chibi). Check hashes and every frame against R1, run `scripts/unit-anatomy-audit.py`, then wire the giant and fragment bodies (768 px cell, feet 672/768 like the Water Spirit) and the armour/reflect/collapse/split VFX from real resolver events, rerun `npm run coverage:presentation`, capture the giant fight at 390px with `CLIPS=1 npx playwright test tests/browser/mine-clips.spec.ts -g Giant`, and ask the owner to approve the motion before merging.
