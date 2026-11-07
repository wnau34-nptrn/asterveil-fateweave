# Current state — updated 2026-11-06

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v56** team presets (#196) on top of v55 Mira/Eira/Brann (#193); Sefa (#195) and Shadow Step follow as v57+; v54 Kael/Lio; v53 step 6 batch 1; v52 Toma; v51 Astrid; v50 Garran; v49 Wynne; v48 Dancer; v47 P03 board featured lineup; 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 batch merged (#147–#154: storage caps, v46 Heal/Revive, sealable Thorn Tempest, calm potion, `units.webp` bleed); see the handoff log.
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; battle bodies from A12 intake; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- **Team presets + team page** (owner 2026-11-06, PR #196, save v56): 4 named presets (draft) — one tap applies at the camp (reserve by chapter, overflow waits in the camp) or in the map bag outside battle (members brought only); camp page = presets → field → reserve → formation → characters in camp, one-tap field/reserve/camp moves. Evidence and research table `docs/validation/team-presets-2026-11-06/README_TH.md`. Owner has the 390px before/after images; owner review of the feel is open.
- Skill rework step 6 closes in session `session_014iPEcNspP15VvzkWFKs5CS` (README §9): Sefa #195 then Shadow Step (hit 8 + dodge) with the whole-campaign gate. Whichever PR lands second takes the next save version.

## Next (owner order)

- UI frame groups 1–3 done (#173, #194); next: the summary/rewards frame (opening prompt below).
- Polish before P09; P09 (OD-13) waits for the owner's start. UXD-08 combined UX check open.

## Open items

- Skill rework step 6 open items (README §9): Shield Bash kept as is (owner); Challenge still unused by the advisor, Rouse still ΔHP −8.6; Fade (card) dropped for the campaign gate — Shadow Step = hit 8 + dodge; enemy difficulty, if wanted, is its own task.

- Map 3 gate copy of the Briar Lord still falls to plain attacks 83–98%; stronger % broke the rush/casual first-clear gate — deferred to P05 (needs a gate-specific mechanic/encounter; Claude decision under delegation).
- No real Safari/iPhone/Android or human usability results (P02-03 trial pending). The owner's iPhone report of Seren's art is fixed in PR #154 but not re-checked on the device.
- P03: Kael/Wynne/Astrid battle animation integrated (A12 intake 2026-11-05, `docs/combat-presentation/unit-a12-slice/README_TH.md`); circle/toll/dial clips unseen in game; owner has not reviewed motion.
- Art: A7-003 parked (OD-14); Lyra atlas above guideline; open PRs #133 UX art/plan, #122 A7-003, #55 pets, #53 boss frames (do not merge the Artwork branch automatically).

## Workspace

- Cloud checkouts are fresh per session; verify remote head/ancestry before work and never reset unpushed work. Never import checkpoints `cc51cd4`/`bcd6133` or `codex/uxd-02-release-notes` automatically.

## Opening prompt for next chat

ทำงานต่อใน wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype ตอบไทย ใช้เวลาไทย · อ่าน CLAUDE.md, CURRENT_STATE.md, docs/context/UI_INPUT_RULES.md และหัว docs/handoffs/ART-UI-LANGUAGE-001.md · ตรวจ remote head และ PR ที่เปิดอยู่ (skill rework step 6 อาจยังแก้ engine/save: ห้ามแตะเซฟ/กฎ) · งาน: UI frame กลุ่มสุดท้าย = หน้าสรุปผลศึก/รางวัล ให้ใช้กรอบเดียวกับกลุ่ม 1–3 (`src/ui/sheet-frame.css`); ตัวหนังสือที่อ่านดีอยู่แล้วคงขนาดเดิม ห้ามทำของที่ใช้ได้พัง · ถ่ายก่อน/หลัง 390×844, 390×650, 320×568 ด้วย tests/browser/ui-language-audit.spec.ts ส่งเจ้าของก่อน merge · PR quality+browser ผ่าน → merge · จบงานเขียน CURRENT_STATE.md (<6000 bytes) + 1 entry บนสุด docs/handoffs/CODEX-TO-CLAUDE.md
