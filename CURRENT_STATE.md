# Current state — updated 2026-11-05

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v48** (skill rework, PR #181); v47 P03 board featured lineup; 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 batch (merged): storage ceilings `core/world/caps.ts` (#147/#149), save v46 Heal/Revive (#148), forest boss Thorn Tempest sealable (#152), calm potion art (#153), `units.webp` bleed fix (#154); details in the handoff log.
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; battle bodies from A12 intake; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- **UI frame consistency** (owner 2026-11-05 “ดำเนินการได้”): Claude implements in the game itself, one page group per PR with 390px before/after shown before merge — shared window header (close/back size and position), primary/secondary button tokens, ≥12px text in service sheets and the character window, CSS onto tokens with unchanged looks. **Do not touch** battle/map HUD, painted skill icons, team formation grid, skills member strip, battle-rewards card, run-summary chips, forge item art/review. Scope and history: top of `docs/handoffs/ART-UI-LANGUAGE-001.md`; audit `docs/validation/ui-language-audit-2026-11-05/`. Q1–Q3: owner delegated the pick (2026-11-05) → Claude chose R1 (full-screen sheets hiding the bottom nav, left titles, gold only on primary/review). Q4 dropped.

## Next (owner order)

- Groups 1–2 done (PR #173 service sheets; group 2 = team sheet + character window full-screen, header/buttons/≥12px, `docs/validation/ui-frame-group2-2026-11-05/`). Next group 3: map/battle dialogs (not HUD; the map character dialog already has the new header), then summary/rewards frame only. Re-run `tests/browser/ui-language-audit.spec.ts` before/after.
- Owner 2026-11-05: polish before P09; P09 (OD-13) waits for the owner's start. UXD-08 combined UX check remains open.

## Open items

- Skill rework drafts (cadence barrier 8, duet +20%, turn cycle 8): `docs/validation/skill-rework-2026-11-05/README_TH.md`; Dancer tree dances stay cooldown-only.

- Map 3 gate copy of the Briar Lord still falls to plain attacks 83–98%; stronger % broke the rush/casual first-clear gate — deferred to P05 (needs a gate-specific mechanic/encounter; Claude decision under delegation).
- No real Safari/iPhone/Android or human usability results (P02-03 trial pending). The owner's iPhone report of Seren's art is fixed in PR #154 but not re-checked on the device.
- P03 flags: the advisor rarely turns cycles (Astrid branch b ≈ no points in tree-sim) or uses tolls; tune after real play. Kael/Wynne/Astrid battle animation integrated (A12 intake 2026-11-05, `docs/combat-presentation/unit-a12-slice/README_TH.md`); circle/toll/dial clips unseen in game; owner has not reviewed motion.
- Art: A7-003 parked (OD-14); Lyra atlas above guideline; open PRs #133 UX art/plan, #122 A7-003, #55 pets, #53 boss frames (do not merge the Artwork branch automatically).

## Workspace

- Cloud checkouts are fresh per session; verify remote head/ancestry before work and never reset unpushed work. Never import checkpoints `cc51cd4`/`bcd6133` or `codex/uxd-02-release-notes` automatically.

## Opening prompt for next chat

```text
ทำงานต่อใน wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype ตอบไทย ใช้เวลาไทย
อ่าน CLAUDE.md และ CURRENT_STATE.md ก่อน ตรวจ remote head/ancestry และ worktree จริง
งาน: กรอบ UI กลุ่ม 3 = ไดอะล็อกแผนที่/ต่อสู้ (ไม่ใช่ HUD) แล้วกรอบสรุป/รางวัลเท่านั้น ตามขอบเขตหัวข้อแรกของ docs/handoffs/ART-UI-LANGUAGE-001.md
ใช้หัวหน้าต่าง/ปุ่มเดียวกับกลุ่ม 1 (src/ui/sheet-frame.css, token ใน tokens.css) + Q1=R1 (Claude เลือกตามที่เจ้าของมอบ): เต็มจอซ่อนแถบนำทางล่าง ย้อนกลับ/ปิดในหัว + ตัวอักษร ≥12px ในหน้าต่างตัวละคร
ห้ามแตะ HUD ต่อสู้/แผนที่ ไอคอนสกิลวาด ตารางจัดทีม แถบสลับตัวละคร การ์ดรางวัล ชิปสรุป ภาพไอเทม/review ช่าง — จุดที่ดีอยู่แล้วห้ามแก้จนพัง ไม่เปลี่ยนเนื้อหา/กฎ/เซฟ/ตัวเลข
รัน tests/browser/ui-language-audit.spec.ts ก่อน/หลัง (UI_AUDIT=<dir>, UI_AUDIT_SIZES, PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium) ส่งภาพก่อน/หลัง 390px ให้เจ้าของดูก่อน merge
```
