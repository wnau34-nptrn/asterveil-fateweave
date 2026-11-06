# Current state — updated 2026-11-06

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v54** merged (step 6 batches 1–2; v55–v57 in flight, see Active task); v52 Toma; v51 Astrid; v50 Garran; v49 Wynne; v48 Dancer; v47 P03 board featured lineup; 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 batch merged (#147–#154: storage caps, v46 Heal/Revive, sealable Thorn Tempest, calm potion, `units.webp` bleed); see the handoff log.
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; battle bodies from A12 intake; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- **UI frame consistency group 3** (owner 2026-11-06): map and battle dialogs, all at once (not the HUD); text that already reads well keeps its size; nothing that works today may break. Opening prompt below.
- Skill rework step 6 is being closed in session `session_014iPEcNspP15VvzkWFKs5CS` (README §9): #191 v53 and #192 v54 merged; #193 v55 (Mira/Eira/Brann) in CI; then Sefa v56 (blade storm, poison coat, venom burst) and the new Shadow Step v57 (hit 8 + dodge) with the whole-campaign gate (owner-approved). A UI branch that bumps nothing must not touch saves/rules.

## Next (owner order)

- UI frame consistency (owner 2026-11-05): groups 1–2 done (#173, `docs/validation/ui-frame-group2-2026-11-05/`); group 3 = map/battle dialogs (not HUD), then summary/rewards frame only; scope at the top of `docs/handoffs/ART-UI-LANGUAGE-001.md`, audit spec `tests/browser/ui-language-audit.spec.ts`. Q1–Q3 picked by Claude (R1) under the owner's delegation.
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

```text
ทำงานต่อใน wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype ตอบไทย ใช้เวลาไทย
อ่าน CLAUDE.md และ CURRENT_STATE.md ก่อน ตรวจ remote head/ancestry และ worktree จริง แล้วอ่าน docs/context/UI_INPUT_RULES.md และหัวไฟล์ docs/handoffs/ART-UI-LANGUAGE-001.md (ขอบเขต R1)
งาน: UI frame consistency กลุ่ม 3 = หน้าต่างบนแผนที่และในศึก ทำพร้อมกันทั้งชุด (เจ้าของสั่ง 2026-11-06)
ขอบเขต: กระเป๋า 2 แท็บ, ข้อมูล, เป้าหมาย, ทางเข้าด่าน, ยืนยันถอนตัว, หน้าต่างตัวละครที่เปิดจากแผนที่ (dialog.world-dialog) และหน้าต่างข้อมูล/คำอธิบายสกิลในศึก (dialog#game-info) — หัวหน้าต่างเดียวกับกลุ่ม 1–2 (ย้อนกลับซ้าย หัวเรื่องชิดซ้าย ปิดขวา ขนาด/ตำแหน่งเดียวกัน) และ token ปุ่มหลัก/รอง (ตำแหน่งปุ่มคงเดิม)
ห้าม: แตะ HUD แผนที่/ต่อสู้ (D-pad แถบคิว HP ปุ่มสกิล การเลือกเป้า), เนื้อหา/ข้อความ/ตัวเลข/ลำดับปุ่ม/ขั้นยืนยัน, กฎ/เซฟ · ตัวอักษร: ถ้าขนาดเดิมอ่านดีอยู่แล้วไม่ต้องปรับ · เจ้าของ: "ต้องไม่ไปทำให้สิ่งที่ดีอยู่แล้วพัง"
วิธี: ถ่ายภาพก่อนด้วย tests/browser/ui-language-audit.spec.ts (390/320) → แก้ → วัดตำแหน่งปุ่ม/ขนาดตัวอักษร/เลื่อนแนวนอนเทียบก่อน → Playwright world/battle/ui-language-audit (PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium) → ส่งภาพก่อน/หลัง 390px ให้เจ้าของดูก่อน merge แบบ docs/validation/ui-frame-group2-2026-11-05/
จบ: PR quality+browser ผ่าน + เจ้าของดูภาพ → merge; อัปเดต CURRENT_STATE, CODEX-TO-CLAUDE
```
