# Current state — updated 2026-11-06

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v52** (Toma rework); v51 Astrid; v50 Garran; v49 Wynne; v48 Dancer; v47 P03 board featured lineup; 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 batch merged (#147–#154: storage caps, v46 Heal/Revive, sealable Thorn Tempest, calm potion, `units.webp` bleed); see the handoff log.
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; battle bodies from A12 intake; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- Skill rework step 6 (small fixes) — owner 2026-11-06 "ตามที่คุณแนะนำ" (answer to: start step 6? haste baton 20% or 50%?) = start step 6 and raise Toma's haste baton 20% → 50% (Claude's reading of the recommendation; README §8 measured 50% = ΔHP +1.5/+3.4). Prompt below.

## Next (owner order)

- UI frame consistency (owner 2026-11-05): groups 1–2 done (#173, `docs/validation/ui-frame-group2-2026-11-05/`); group 3 = map/battle dialogs (not HUD), then summary/rewards frame only; scope at the top of `docs/handoffs/ART-UI-LANGUAGE-001.md`, audit spec `tests/browser/ui-language-audit.spec.ts`. Q1–Q3 picked by Claude (R1) under the owner's delegation.
- Polish before P09; P09 (OD-13) waits for the owner's start. UXD-08 combined UX check open.

## Open items

- Skill rework (`docs/validation/skill-rework-2026-11-05/README_TH.md`): Dancer #181, Wynne #184, Garran #185, Astrid #189 (§7, v51), Toma (§8, v52: baton, smoke spread, catalyst splash) done. Next: small fixes (card step 6) after the owner's go. Open: haste baton 20% does not beat Toma's own hit (50% measured +1.5/+3.4); smoke spread rare in sim; Pull Thread 2–5×; spear wall never picked; deflect still 2–4×; b4 `seerMeteorBig` is Claude's proposal.

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
งาน: ขั้นที่ 6 ของแผนตรวจสกิล = ปรับเล็ก เจ้าของสั่ง "ตามที่คุณแนะนำ" (2026-11-06) ไม่ต้องรออนุมัติซ้ำ เริ่มตามลำดับในการ์ด: Aegis challenge/rouse/bash, Seren sanctuary/bless, Kael storedfist/circlefist, Lio solo/finale แล้ว Mira, Sefa, Eira, Brann
แบบ: การ์ดในหน้า artifact "ตรวจสกิล Fateweave" (https://claude.ai/artifact/RTv5isw1yhwL2DmH3duyBL, Artifact read; โน้ตเจ้าของใน db "notes") ห้ามคิดข้อเสนอใหม่แทน ถ้าวัดแล้วใช้ไม่ได้ บอกเจ้าของพร้อมตัวเลขก่อนเปลี่ยน · รวมใน PR แรก: ส่งไม้ Toma `HASTE_BATON` 20 → 50 (เจ้าของตอบ "ตามที่คุณแนะนำ"; ตัวเลขใน README §8) แล้ววัด sim ใหม่
ทำแบบขั้น 5 (docs/validation/skill-rework-2026-11-05/README_TH.md §8): probe วัดก่อน → engine/content/th/advisor/สถานะ/VFX → เซฟ v53 (REWORKED_V53, เทสต์ version 52 ทุกที่รวม tests/browser, เทสต์ย้ายเซฟ) → typecheck/lint/test/sim (full SIM_REPORT=1 มี campaign gate) + Playwright ที่เกี่ยวข้อง (ตั้ง PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium)
แบ่ง PR ตามตัวละครถ้างานใหญ่ จบแต่ละ PR: quality+browser ผ่าน → merge; อัปเดต CURRENT_STATE, CODEX-TO-CLAUDE, README §9
```
