# Current state — updated 2026-11-04 (late)

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v47** (P03: board featured lineup); 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 Claude batch (all merged after quality + four browser shards):
  - PR #147/#149 storage ceilings: `core/world/caps.ts` holds the save limits (`BANK_CAP`, `TOME_CAP`, `RIFT_CORE_CAP`, `POTION_CAP`, `RUN_CAP`); player choices refuse `'full'`, settle/dismiss/run gains fill to the cap (`docs/validation/storage-caps/README_TH.md`).
  - PR #148 (save v46, owner decision on logic audit 4–5): Heal may target a full-HP ally when Afterglow/mender overflow still adds barrier; Revive levels add HP (`revivePoints` 5: 25→45%), no user barrier (`docs/design/LOGIC_AUDIT_2026-10-24_TH.md`).
  - PR #152 forest boss: `elite-briar-lord` v10, Thorn Tempest sealable 28 (was unstoppable 13); plain-attack wins 50–71% → 33–64% (`docs/validation/forest-boss-tempest/README_TH.md`).
  - PR #153 painted calm potion (Codex PR #151 R1) + square potion art in the brew list; PR #154 cleared figure pieces crossing cells of `units.webp` (Eira's orb in Seren's art).
  - Art merged to `incoming/`: Kael proportion fix NEW-003 (PR #150), calm potion package (PR #151).
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; stills + procedural until CODEX-A12; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- None. Next: A12 battle animation intake for Kael/Wynne/Astrid (PR #157: 21 strips accepted by Claude 2026-11-05, Astrid deflect R2 requested), then P09 (OD-13 order).

## Next (owner order)

- **A12 intake** (owner 2026-11-05 “ทำตามที่คุณแนะนำ”): pack the 21 accepted strips from `incoming/ART-UNIT-ANIMATION-A12-001/` (PR #157, do not merge the art branch wholesale) into unit atlases, wire `unit-frames.ts`, drop them from `STILL_ONLY`; Astrid deflect/crossing stay still + procedural until R2 (brief at the end of `docs/handoffs/CODEX-A12-NEW-CLASSES-TH.md`). Capture 390px clips.
- **P09** (OD-13): accounts/cloud save/telemetry+feedback/admin (needs the owner's Cloudflare D1 Edit token before database work) → P04 → server rewards → chat + World Boss → external test. UXD-08 combined UX check remains open.

## Open items

- Map 3 gate copy of the Briar Lord still falls to plain attacks 83–98%; stronger % broke the rush/casual first-clear gate — deferred to P05 (needs a gate-specific mechanic/encounter; Claude decision under delegation).
- No real Safari/iPhone/Android or human usability results (P02-03 trial pending). The owner's iPhone report of Seren's art is fixed in PR #154 but not re-checked on the device.
- P03 flags: the advisor rarely turns cycles (Astrid branch b ≈ no points in tree-sim) or uses tolls; tune after real play.
- Art: A7-003 parked (OD-14); Lyra atlas above guideline; open PRs #133 UX art/plan, #122 A7-003, #55 pets, #53 boss frames (do not merge the Artwork branch automatically).

## Workspace

- Cloud checkouts are fresh per session; verify remote head/ancestry before work and never reset unpushed work. Never import checkpoints `cc51cd4`/`bcd6133` or `codex/uxd-02-release-notes` automatically.

## Opening prompt for next chat

```text
ทำงานต่อใน wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน CLAUDE.md และ CURRENT_STATE.md ก่อน ตรวจ remote head/ancestry และ worktree จริง
งาน: นำเข้าอนิเมชันศึก A12 ของเคล/วินน์/แอสทริด จาก PR #157 (incoming/ART-UNIT-ANIMATION-A12-001) 21 strips ที่ Claude รับแล้ว ใช้ skill fateweave-art-intake
ท่า astrid-deflect รอ R2 (คงภาพนิ่ง+procedural) ห้าม merge สาขาอาร์ตทั้งก้อน เก็บคลิปจริง 390px ตอบไทย เรื่องภาพตัดสินแทนเจ้าของได้ตามที่มอบหมาย 2026-11-04 แล้วต่อ P09
```
