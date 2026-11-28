# Current state — updated 2026-11-28 (PET-1 pet eggs, save v71)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages https://wnau34-nptrn.github.io/asterveil-fateweave/ via `pages.yml` (runs the Chromium suite before deploy).
- Save **v71** (PET-1 pet book + run pet; v70 mine ore-merchant counter; v69 mine progress; v68 map 4 tide/notes/journal, camp cap; v67 first fate weave; v66 gacha). Phaser/TypeScript/Vite, 1–5 field units, camp Lv/EXP, reserve 3→4→5, carry≤10, fatigue, presets. 15 classes×1 active character; thiran/wila parked. P09 server authority + ledger (`?server=off` for local).
- Maps: 1 ซากชายแดน, 2 เส้นทางป่าทึบ, 3 แนวรอยแยก, 4 ทะเลสาบเงาจันทร์, **5 เหมืองผลึกร้าง** (concepts for 4–10: [CHAPTER1_MAPS_TH](docs/design/CHAPTER1_MAPS_TH.md)).
- **Map 4 (OD-60)**: in game (#336–#345), owner approved 2026-11-23. [390px review](docs/validation/map4-lake/README_TH.md).
- Camp level cap = 10 + 3 per first clear past map 2 (≤30); tree points still stop at Lv10.
- P10 gacha (OD-58) live; cabinet after MAP1 with 10 first-clear tickets (OD-59). Unlock pacing #202.
- Art delegation: record agent picks as agent decisions, never owner visual approval.

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

- Pets OD-63 (2026-11-28 “ตามคำแนะนำ”): plan [PET_SYSTEM_ANALYSIS_TH](docs/design/PET_SYSTEM_ANALYSIS_TH.md) approved; food bought with gold. **PET-1 done** (eggs from map 4/5 first clears, `hatchEgg`/`choosePet`, `run.pet`, ledger, save v71; no effect or UI yet, [SYSTEMS_REFERENCE §Pets](docs/design/SYSTEMS_REFERENCE.md)). Next PET-2.
- Hero life: code breath/barrier/turn light/sparkles/slump (#376). Drawn victory cheers (LIFE-001): Aegis R3, Eira R3b, Seren R3 (#380) and Lyra R4 (#382), owner “อนุมัติ” 2026-11-27; small optional `<sheet>_victory` atlases. Aegis idle loop warped from the seed (W1b, #381, owner “อนุมัติ”); Lyra/Eira/Seren idle by the same tool next. LIFE-002 (victory for the other 11; Odran/Isolde parked) prompt sent to Codex. [Validation](docs/validation/hero-life-2026-11-27/README_TH.md), [brief](docs/handoffs/CODEX-HERO-LIFE-TH.md).
- Auto battle (OD-62): random battles + World Boss, device stop-HP/skill settings; numbers draft. [Validation](docs/validation/auto-battle/README_TH.md).

- Map 5 (OD-60): complete in game (save v70, giant tuned, art #357–#371, side events #366; owner approved). [Validation](docs/validation/map5-mine/README_TH.md).
- 2026-11-25: boss holds on the body, silhouette aura, crowns above the figure (“นำเข้าเกมได้เลย”). [Check](docs/validation/boss-hold-placement-2026-11-25/README_TH.md).

- Game Feel Draft PR #353 (weapon-matched contact sound/visuals, 15 roles) still open. [ผลตรวจ](docs/validation/roster-contact-2026-11-24/README_TH.md).
- Mobile performance still needs on-device measurements for walking, fog, and battle entry. [ผลตรวจท่าคืนตัว](docs/validation/recovery-continuity-2026-11-24/README_TH.md).

- Lake sweep/contract pay map 3's values until a P04 economy pass; P04-05/06 numbers.
- Map 3 Briar Lord first-try gate; no real Safari/iPhone/Android or human usability validation. Pending intake #262, #169.

## Opening prompt for next chat

PET-2 (OD-63, owner 2026-11-28 “ตามคำแนะนำ”): read CLAUDE.md, CURRENT_STATE.md, `docs/design/PET_SYSTEM_ANALYSIS_TH.md` §5.1–§5.2b and §7, `docs/design/SYSTEMS_REFERENCE.md` §Pets and the `fateweave-rules-and-sim` skill. Implement only PET-2: the six map blessings of `run.pet` in `core/world` (luck: better chest tier; forage: extra ore from chests/search; farsight: fog reveal radius +1; ward: random-encounter chance down, never elites/bosses/forced fights; lantern: chests/events visible in fog at range 2/3; renewal: team HP every 10 steps), Lv1 and Lv6 steps from `gameRules.pets`, deterministic and seeded only from the run's existing rolls, replay-safe; bump the affected `MapDefinition.version`s/save only if the rules require it. Map sim for each blessing vs no pet; meaningful vitest; typecheck, lint, test, build; PR into `feature/fateweave-initial-prototype`, merge when quality + browser pass. No battle assists, food or UI (PET-3…6). Report to the owner in Thai.

(Previous next task, still open: hero life art — merge PR #381, review Codex PR #384 LIFE-002, write the fix + Lyra/Eira/Seren warp-idle prompts; see the hero-life validation README.)
