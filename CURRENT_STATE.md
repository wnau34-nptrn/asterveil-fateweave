# Current state — updated 2026-11-06

Keep this file short; dated history lives in `docs/handoffs/CODEX-TO-CLAUDE.md` and `docs/handoffs/archive/`.

## Game

- Working branch `feature/fateweave-initial-prototype` (not `main`); Pages URL https://wnau34-nptrn.github.io/asterveil-fateweave/ through `pages.yml`; pre-release pushes deploy after lint/unit/build, with the full browser gate on PRs. Restore the Pages browser gate before OD-13 external tests.
- **Save v54** merged (step 6 batches 1–2; v55–v57 in flight, see Active task); v52 Toma; v51 Astrid; v50 Garran; v49 Wynne; v48 Dancer; v47 P03 board featured lineup; 1–5 units a side (P02), shared camp Lv/EXP (P01), reserve by chapter 3→4→5, fatigue, carry ≤10. W1–W8/P01/P02, UXD-01…07 and the HUD team → character entry (PR #146) are published.
- 2026-11-04 batch merged (#147–#154: storage caps, v46 Heal/Revive, sealable Thorn Tempest, calm potion, `units.webp` bleed); see the handoff log.
- Owner 2026-11-04: “เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย” — Claude may decide art picks; record each such pick as Claude's decision under that delegation, not as owner approval.

- P03 (2026-11-04 late, PR #155/#156/#158): Kael (Martial chi), Wynne (Hexer curses/toll), Astrid (Seer deflect/cycle) — 15 classes × 1 character; featured board slot only; battle bodies from A12 intake; evidence `docs/validation/roster-30/p03/README_TH.md`.

## Active task

- UI frame group 3 merged (#194, owner approved the 390px before/after; `docs/validation/ui-frame-group3-2026-11-06/`).
- **Team presets + team page redesign** (owner 2026-11-06) runs in session `session_014iPEcP6oUwVRPxyN3wu8Go` (Opus): one-tap preset swap of fielded/reserve, team page = fielded + reserve on top, all characters below; research from other games first.
- Skill rework step 6 is being closed in session `session_014iPEcNspP15VvzkWFKs5CS` (README §9): #191 v53 and #192 v54 merged; #193 v55 (Mira/Eira/Brann) in CI; then Sefa v56 (blade storm, poison coat, venom burst) and the new Shadow Step v57 (hit 8 + dodge) with the whole-campaign gate (owner-approved). A UI branch that bumps nothing must not touch saves/rules.

## Next (owner order)

- UI groups 1–2 done (#173, `docs/validation/ui-frame-group2-2026-11-05/`); group 3 done (#194); next UI frame: summary/rewards only.
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

Team presets + team page redesign is running in session `session_014iPEcP6oUwVRPxyN3wu8Go`. For a fresh start: read CLAUDE.md, this file, `docs/context/UI_INPUT_RULES.md`, `docs/design/FORMATION_PLAN_TH.md`; the task prompt is in that session.
