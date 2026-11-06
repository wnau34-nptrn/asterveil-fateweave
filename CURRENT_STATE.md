# Current state — updated 2026-11-06

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v51** (Astrid rework); v50 Garran; v49 Wynne; v48 Dancer; v47 P03 board featured lineup; 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 batch merged (#147–#154: storage caps, v46 Heal/Revive, sealable Thorn Tempest, calm potion, `units.webp` bleed); see the handoff log.
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; battle bodies from A12 intake; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- **UI frame consistency** (owner 2026-11-05 “ดำเนินการได้”): Claude implements in the game itself, one page group per PR with 390px before/after shown before merge — shared window header (close/back size and position), primary/secondary button tokens, ≥12px text in service sheets and the character window, CSS onto tokens with unchanged looks. **Do not touch** battle/map HUD, painted skill icons, team formation grid, skills member strip, battle-rewards card, run-summary chips, forge item art/review. Scope and history: top of `docs/handoffs/ART-UI-LANGUAGE-001.md`; audit `docs/validation/ui-language-audit-2026-11-05/`. Q1–Q3: owner delegated the pick (2026-11-05) → Claude chose R1 (full-screen sheets hiding the bottom nav, left titles, gold only on primary/review). Q4 dropped.

## Next (owner order)

- Groups 1–2 done (PR #173 service sheets; group 2 = team sheet + character window full-screen, header/buttons/≥12px, `docs/validation/ui-frame-group2-2026-11-05/`). Next group 3: map/battle dialogs (not HUD; the map character dialog already has the new header), then summary/rewards frame only. Re-run `tests/browser/ui-language-audit.spec.ts` before/after.
- Owner 2026-11-05: polish before P09; P09 (OD-13) waits for the owner's start. UXD-08 combined UX check remains open.

## Open items

- Skill rework (`docs/validation/skill-rework-2026-11-05/README_TH.md`): Dancer #181, Wynne #184, Garran #185, Astrid #189 (§7, save v51, owner's "big move" definition) done. Next: Toma (owner "ดำเนินการขั้นต่อไปได้" 2026-11-06) → small fixes. Open: Pull Thread 2–5×; spear wall never picked; deflect still 2–4×; b4 `seerMeteorBig` is Claude's proposal.

- Map 3 gate copy of the Briar Lord still falls to plain attacks 83–98%; stronger % broke the rush/casual first-clear gate — deferred to P05 (needs a gate-specific mechanic/encounter; Claude decision under delegation).
- No real Safari/iPhone/Android or human usability results (P02-03 trial pending). The owner's iPhone report of Seren's art is fixed in PR #154 but not re-checked on the device.
- P03: Kael/Wynne/Astrid battle animation integrated (A12 intake 2026-11-05, `docs/combat-presentation/unit-a12-slice/README_TH.md`); circle/toll/dial clips unseen in game; owner has not reviewed motion.
- Art: A7-003 parked (OD-14); Lyra atlas above guideline; open PRs #133 UX art/plan, #122 A7-003, #55 pets, #53 boss frames (do not merge the Artwork branch automatically).

## Workspace

- Cloud checkouts are fresh per session; verify remote head/ancestry before work and never reset unpushed work. Never import checkpoints `cc51cd4`/`bcd6133` or `codex/uxd-02-release-notes` automatically.

## Opening prompt for next chat

```text
ทำงานต่อใน wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype ตอบไทย ใช้เวลาไทย
อ่าน CLAUDE.md และ CURRENT_STATE.md ก่อน ตรวจ remote head/ancestry และ worktree จริง แล้วเปิด skill .claude/skills/fateweave-rules-and-sim
งาน: ขั้นที่ 5 ของแผนตรวจสกิล = Toma (Alchemist) เจ้าของสั่ง "ดำเนินการขั้นต่อไปได้" (2026-11-06) ไม่ต้องรออนุมัติซ้ำ
แบบ: การ์ด Toma ในหน้า artifact "ตรวจสกิล Fateweave" (https://claude.ai/artifact/RTv5isw1yhwL2DmH3duyBL, Artifact read; โน้ตเจ้าของใน db "notes") ห้ามคิดข้อเสนอใหม่แทน ถ้าวัดแล้วใช้ไม่ได้ บอกเจ้าของพร้อมตัวเลขก่อนเปลี่ยน
- haste ยาเร่ง → ส่งไม้: เพื่อนลงมือทันทีและแรงขึ้น 20% ในการลงมือนั้น
- smoke ขวดควัน: ลด 40% เหมือนเดิม + ถ้าเป้าติดกรด ควันลามไปศัตรูข้าง ๆ 20%
- catalyst ตัวเร่ง: กรดทำงานทันทีหนึ่งรอบ (ไม่ล้างกรด) และกระเด็น 50% ไปศัตรูข้าง ๆ
- acid, bomb, fury คงเดิม (ตรวจโหนด/กิ่งที่อ้างสามท่านี้ว่ายังมีความหมาย ถ้าไม่ เสนอความหมายใหม่สั้น ๆ)
ขั้นตอนแบบขั้น 1–4 (README_TH.md §4–§7 ใน docs/validation/skill-rework-2026-11-05/): วัดก่อนแก้ด้วย probe (แบบ tests/probe/astrid-probe.test.ts) → engine+content → th.ts → advisor Alchemist → เมตริก/สถานะ → VFX ตามเหตุการณ์จริง (npm run coverage:presentation) → เซฟ v52 แบบ v51 (REWORKED_V52, รับ 51, อัปเดตเทสต์ version 51 ทุกรูปแบบรวม tests/browser, เทสต์ย้ายเซฟใน tests/heal-revive-rules.test.ts) → เทสต์ preview=resolver/replay/ขอบเขต + typecheck/lint/test/sim (เทียบแถว Toma ก่อน-หลัง ตัวอื่นไม่เปลี่ยน) + Playwright ที่เกี่ยว (alchemy-fx, unit-a4)
จบ: PR เข้า feature/fateweave-initial-prototype รอ quality+browser ผ่านแล้ว merge, อัปเดต CURRENT_STATE.md, บนสุดของ CODEX-TO-CLAUDE.md, ต่อท้าย README §8 พร้อมตัวเลขเดิม→ใหม่และผล sim
```
