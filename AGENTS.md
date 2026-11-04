# Fateweave agent instructions

Read [CLAUDE.md](CLAUDE.md) and [CURRENT_STATE.md](CURRENT_STATE.md) before working; CLAUDE.md holds the rules for both Codex and Claude, including the owner's standing authorization (2026-10-18) to finish requested work — implementation, tests, commits, pushes, PRs, merges and GitHub Pages publication — without repeated approval. Platform/tool permission enforcement still applies. Load other documents only when the task needs them (see "Start of a session" in CLAUDE.md).

## Codex: report every change to Claude (owner 2026-10-23)

After every task Codex finishes, before ending the session:

- Add one entry (≤ 12 lines) at the top of `docs/handoffs/CODEX-TO-CLAUDE.md`: date, branch/PR and merge commit, what changed and why, tests run and results, owner decisions, open items. Put long evidence in a validation README and link it. Write the entry only there — do not copy it into `NEW-CHAT-HANDOFF-TH.md` or `CLAUDE-TO-CODEX-DEV-TH.md`.
- Update [CURRENT_STATE.md](CURRENT_STATE.md) (replace stale lines; keep it short).
- If a task needed (or seemed to need) changes to battle rules (`src/core/battle`), saves (`src/core/save`) or balance numbers, do not make them; write the question under "ฝากถึง Claude" at the end of `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`. Mark finished planned tasks there and record owner approvals of VFX families.
- Commit these notes with the work (or as a follow-up docs commit) so they are on the game branch.
