# Current state — updated 2026-11-04

Replace stale lines when a task ends; keep this file under ~5 KB. History goes to `docs/handoffs/CODEX-TO-CLAUDE.md` (newest first) and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); live at https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`.
- Save v45. Battles 1–5 units a side (P02); one shared camp level (P01); reserve by chapter 3→4→5, fatigue, carry ≤ 10.
- Animation/VFX waves W1–W8 are done and published (2026-10-31). P01 and P02 are done (2026-10-31).
- UX rebuild UXD-01…06 (Codex, from ART-UI-UX-002) published: enhancement, forge launcher + item Lv, rarity/affix reroll, affix transfer, craft/recycle/smelt, character tab + star upgrade (UXD-06, PR #144, merge `b9031154`, 2026-11-04). Implementation notes: `docs/handoffs/UXD-0N-IMPLEMENTATION-TH.md`. The UX plan itself is on branch `art/art-ui-ux-002` (`incoming/ART-UI-UX-002/IMPLEMENTATION_PLAN_TH.md`, PR #133, not merged).

## Next (the owner picks; nothing is auto-started)

- UXD-07 — equip, level and skill tree in one place (plan row on `art/art-ui-ux-002`); UXD-08 — combined check and release.
- Owner order OD-13 after P02: P09 accounts/cloud save/telemetry+feedback/admin → P04 → server-authoritative rewards → chat + World Boss → external test.

## Open items

- Questions for Claude in "ฝากถึง Claude" at the end of `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`: smelt dust cap (`core/world/forge.ts::smeltReason` allows 9,999,999 → 10,000,000, which the v45 bank validator rejects; UI guard in PR #143, core fix pending); stale comments on Tremor/Slam/Rouse in `engine.ts`/`veil-siege.ts` and COVERAGE docs; missing `calm` potion art; logic audit `docs/design/LOGIC_AUDIT_2026-10-24_TH.md`.
- P02-03 human/real-device trial; the forest boss still falls to plain attacks with five. No real-device/iOS results yet (`?perf=1`).
- Art: A7-002 dancer redraw has no Codex PR; A7-003 (Odran/Isolde) is on hold (OD-14 parked); Kael/Wynne/Astrid pending owner confirmation; Lyra atlas is above the general-unit size guideline (owner informed).
- Open PRs: #133 (UX art/plan), #122 (A7-003 candidates), #55 (pets), #53 (chapter-1 boss frames).
- Codex's local token-saving checkpoints (`cc51cd4`, `bcd6133`, branch `codex/uxd-02-release-notes`) were never pushed; the owner chose to replace them with the 2026-11-04 context restructure (`docs/context/TOKEN_ECONOMY_TH.md`).

## Opening prompt for the next chat

```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน CLAUDE.md และ CURRENT_STATE.md ก่อน แล้วอ่านเฉพาะไฟล์ที่งานต้องใช้
งาน: <ระบุงานที่เจ้าของเลือก เช่น UXD-07 หรือ P09> ตอบเป็นภาษาไทย
```
