# Current state — updated 2026-11-08

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v58** Shadow Step (#198); v57 Sefa (#195); v56 team presets (#196); v55 Mira/Eira/Brann (#193); v54 Kael/Lio; v53 step 6 batch 1; v52 Toma; v51 Astrid; v50 Garran; v49 Wynne; v48 Dancer; v47 P03 board featured lineup; 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 batch merged (#147–#154: storage caps, v46 Heal/Revive, sealable Thorn Tempest, calm potion, `units.webp` bleed); see the handoff log.
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; battle bodies from A12 intake; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- **TEAM-FORMATION-EDITOR-002 complete:** PR #205 merged (`7c40161`) after quality and all browser shards/aggregate passed. Formation is the sole field list, reserves/camp place atomically, presets save explicitly. Rules/save unchanged. Evidence: `docs/validation/team-formation-editor/README_TH.md`.
- Camp HUD/direct Characters/compact quests complete in PR #204 (`deb193f`), all checks passed; evidence `docs/validation/camp-hud-layout/README_TH.md`.

- **MAP-TEAM-CHARACTER-TABS-001 complete (2026-11-07, PR #203, merge `ae8889c`):** separate map team HUD/dialog (T), bag items/gear (B), one-tap carried-only presets; direct tree tab, MAP 4 character tabs/camp 5, development stays camp-only. Quality + browser passed. Rules/save/balance unchanged. Evidence: `docs/validation/map-team-character-tabs/README_TH.md`.
- Unlock pacing #202: quests/team MAP 1; hiring/market/hunt MAP 2; advanced services/hard explicitly MAP 3. Rights follow cleared history.

- **Team presets + team page** (owner 2026-11-06, PR #196, save v56): 4 named presets (draft) — one tap applies at the camp (reserve by chapter, overflow waits in the camp) or in the separate map team dialog outside battle (members brought only); camp page = presets → field → reserve → formation → characters in camp, one-tap field/reserve/camp moves. Evidence and research table `docs/validation/team-presets-2026-11-06/README_TH.md`. Owner has the 390px before/after images; owner review of the feel is open.
- Skill rework step 6 done (#191–#193, #195, #198; README §9 `docs/validation/skill-rework-2026-11-05/README_TH.md`); the campaign gate now reads the whole campaign (owner 2026-11-06).

## Next (owner order)

- Await the owner’s next task; other milestones follow the current owner decisions, not a blanket MAP 1 unlock. P09 remains on hold.

- UI frame groups 1–4 done (#173, #194, group 4 summary/rewards 2026-11-07); no frame work left.
- Polish before P09; P09 (OD-13) waits for the owner's start. UXD-08 combined UX check open.

## Open items

- Skill rework step 6 open items (README §9): Shield Bash kept as is (owner); Challenge still unused by the advisor, Rouse still ΔHP −8.6; Fade (card) dropped for the campaign gate — Shadow Step = hit 8 + dodge; enemy difficulty, if wanted, is its own task.

- Map 3 gate copy of the Briar Lord still falls to plain attacks 83–98%; stronger % broke the rush/casual first-clear gate — deferred to P05 (needs a gate-specific mechanic/encounter; Claude decision under delegation).
- No real Safari/iPhone/Android or human usability results (P02-03 trial pending). The owner's iPhone report of Seren's art is fixed in PR #154 but not re-checked on the device.
- P03: Kael/Wynne/Astrid battle animation integrated (A12 intake 2026-11-05, `docs/combat-presentation/unit-a12-slice/README_TH.md`); circle/toll/dial clips unseen in game; owner has not reviewed motion.
- ART-VFX-REWORK-001 (PR #200) merged `ff9274e` into the game branch on 2026-11-07 after quality + browser passed. Owner explicitly authorized: "ทำการ Merge เข้าเกมได้ของ PR #200". Original art, event-only VFX routing and 13 actual 390px clips: `docs/combat-presentation/vfx-rework-slice/README_TH.md`. Rules/save/content/balance/playback timing unchanged.
- Art: A7-003 parked (OD-14); Lyra atlas above guideline; open PRs #133 UX art/plan, #122 A7-003, #55 pets, #53 boss frames (do not merge the Artwork branch automatically).

## Workspace

- Cloud checkouts are fresh per session; verify remote head/ancestry before work and never reset unpushed work. Never import checkpoints `cc51cd4`/`bcd6133` or `codex/uxd-02-release-notes` automatically.

## Opening prompt for next chat

อ่าน AGENTS.md, CLAUDE.md และ CURRENT_STATE.md ใน feature/fateweave-initial-prototype แล้วรอเจ้าของเลือกงานถัดไป ไม่เริ่ม P09 เอง หน้าจัดทีมแบบแผนการยืนจุดเดียวเสร็จใน PR #205 หลัง quality/browser ผ่านทั้งหมด หลักฐาน: docs/validation/team-formation-editor/README_TH.md
