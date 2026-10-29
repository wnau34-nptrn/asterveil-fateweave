# Fateweave agent instructions

Read and follow [CLAUDE.md](CLAUDE.md) before working in this repository. It contains the architecture, validation rules and the owner's standing authorization for both Codex and Claude.

The owner authorized completing requested work without repeated approval on 2026-10-18 (Asia/Bangkok), continuing across tasks and sessions until revoked. This includes necessary implementation, testing, commits, pushes, PRs, merges and publication through the existing GitHub Pages workflow, plus repairs needed to finish them. Do not add confirmation checkpoints for those steps.

Use the full "Standing authorization: finish requested work without repeated approval" section in CLAUDE.md. Platform/tool permission enforcement still applies. Keep meaningful progress updates and leave handoff notes after substantial changes.

## Codex: report every change to Claude (owner 2026-10-23)

While Claude's usage resets, Codex develops from `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`. After every task Codex finishes (planned tasks and any polish the owner asks for), and before ending the session:

- Add an entry at the top of `docs/handoffs/CODEX-TO-CLAUDE.md`: date, branch/PR and merge commit, what changed and why, files touched, tests run and their results, screenshots/clips given to the owner, the owner's decisions, and anything left unfinished.
- If a task needed (or seemed to need) changes to battle rules (`src/core/battle`), saves (`src/core/save`) or balance numbers, do not make them; write the question under "ฝากถึง Claude" at the end of `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`.
- Mark finished planned tasks as done in `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`, and record owner approvals of VFX families there.
- Commit these notes with the work (or as a follow-up docs commit) so they are on the game branch.
