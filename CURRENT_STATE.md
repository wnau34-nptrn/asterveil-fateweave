# Current state — updated 2026-11-05

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v47** (P03: board featured lineup); 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 batch (merged): storage ceilings `core/world/caps.ts` (#147/#149), save v46 Heal/Revive (#148), forest boss Thorn Tempest sealable (#152), calm potion art (#153), `units.webp` bleed fix (#154); details in the handoff log.
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; battle bodies from A12 intake; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- None in Claude. **ART-UI-LANGUAGE-001** (owner 2026-11-05: one visual language for the whole UI) is with Codex: Claude audited 55 surfaces × 3 sizes (`docs/validation/ui-language-audit-2026-11-05/README_TH.md`; 9 header styles, 13 primary-button styles, 638 font sizes with 1 token) and wrote the brief `docs/handoffs/ART-UI-LANGUAGE-001.md` (owner questions Q1–Q4, R1 recommended by Claude). Codex must branch after PRs #166/#167/#168 merge (still open 2026-11-05).

## Next (owner order)

- When Codex opens the ART-UI-LANGUAGE-001 PR: verify SHA-256/decode, check `verification.json` against criteria 1–10, show the owner R1/R2 at 390px, record the owner's own Q1–Q4 picks, then import DOM/CSS one page group per PR (tokens + header/buttons → service sheets → forge → character → map/summary/battle dialogs), re-running `tests/browser/ui-language-audit.spec.ts` before/after. No rule/save/number changes.
- Owner 2026-11-05: polish before P09; P09 (OD-13: accounts/cloud save/telemetry+feedback/admin, needs the D1 Edit token) waits for the owner's start. UXD-08 combined UX check remains open.

## Open items

- Map 3 gate copy of the Briar Lord still falls to plain attacks 83–98%; stronger % broke the rush/casual first-clear gate — deferred to P05 (needs a gate-specific mechanic/encounter; Claude decision under delegation).
- No real Safari/iPhone/Android or human usability results (P02-03 trial pending). The owner's iPhone report of Seren's art is fixed in PR #154 but not re-checked on the device.
- P03 flags: the advisor rarely turns cycles (Astrid branch b ≈ no points in tree-sim) or uses tolls; tune after real play. Kael/Wynne/Astrid battle animation integrated (A12 intake 2026-11-05, `docs/combat-presentation/unit-a12-slice/README_TH.md`); circle/toll/dial clips unseen in game; owner has not reviewed motion.
- Art: A7-003 parked (OD-14); Lyra atlas above guideline; open PRs #133 UX art/plan, #122 A7-003, #55 pets, #53 boss frames (do not merge the Artwork branch automatically).

## Workspace

- Cloud checkouts are fresh per session; verify remote head/ancestry before work and never reset unpushed work. Never import checkpoints `cc51cd4`/`bcd6133` or `codex/uxd-02-release-notes` automatically.

## Opening prompt for next chat

```text
ทำงานต่อใน wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype ตอบไทย
อ่าน CLAUDE.md และ CURRENT_STATE.md ก่อน ตรวจ remote head/ancestry และ worktree จริง
งาน: ตรวจรับแพ็กเกจ Codex ART-UI-LANGUAGE-001 (PR จาก art/art-ui-language-001, ห้าม merge สาขาอาร์ตทั้งก้อน) ตาม docs/handoffs/ART-UI-LANGUAGE-001.md:
ตรวจ SHA-256/decode, verification.json เทียบเกณฑ์ 1–10, ดูภาพก่อน/หลัง แล้วส่งภาพ R1/R2 390px ให้เจ้าของเลือก Q1–Q4 (บันทึกคำเจ้าของเอง)
จากนั้นนำเข้า DOM/CSS ทีละกลุ่มหน้า PR ละกลุ่ม รัน tests/browser/ui-language-audit.spec.ts ก่อน/หลัง ไม่เปลี่ยนกฎ/เซฟ/ตัวเลข
```
