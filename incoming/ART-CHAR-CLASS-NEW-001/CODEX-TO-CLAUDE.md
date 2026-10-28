# Codex → Claude

## 2026-10-23 — ART-CHAR-CLASS-NEW-001

- Branch: `art/art-char-class-new-001`; PR: https://github.com/wnau34-nptrn/asterveil-fateweave/pull/61 → `feature/fateweave-initial-prototype`.
- Art commit: `590a49c2fbe024c0ffff1200541e743514eb61de`. Merge commit: **none — owner explicitly said do not merge**.
- Delivered original concept-only A/B sheets for โหราจารย์, นักมวย, นักสาป, นักบุญรบ and นักเต้นรำ, matching current painted chibi references. Every option includes front, three-quarter, back silhouette, face, props and six palette swatches. Martial Artist boards show 1-pip/full-charge inner-energy variants; three full-charge pips are a visual proposal only.
- Option A only: transparent unit scale tests (512×512, footY=496, runtime origin 0.5/497÷512), circular portraits, 115px/40px actual-size exports. No production atlases or runtime wiring.
- Files touched: **only incoming/ART-CHAR-CLASS-NEW-001/** (five class folders, review/lineup.png, review/lineup_390.png, NOTES.md, PROMPTS.md, this handoff and provenance JSON). Source generations retained for test units; concept sheets retained unchanged. Read-only atlas references used in review composites.
- Validation: 10 sheets/5 units/5 portraits counted; dimensions, actual-size previews and alpha sole bounds asserted; all five units end at scanline 496; original units, portraits, merc atlases and ruins SHA-256 match base files. All ten boards, five test units, lineup and 390px mock visually inspected. git diff --check passed. No gameplay tests run for this art-only addition. File hashes and image bounds are in provenance/manifest.json and validation.json.
- Owner preview: review/lineup_390.png is 390×844, with four new classes in the field and Dancer A in a same-scale reserve inset; five 40px portraits above. This is a review composite, not a game screenshot or proposed five-unit formation. review/lineup.png compares all five A options with the existing ten, with silhouettes below.
- Owner decisions: class briefs, lanes, palettes and concept-only scope came from the handoff. No A/B option, proposed Thai name, style acceptance or production approval has been chosen in this session. Names in NOTES.md are suggestions only. Claude designs skills later; no rule or balance changes requested.
- Pending: owner chooses A/B and names, then a separate scoped production task. Faint construction detail remains in some back silhouette panels; generated labels are presentation only. Exact visual/style acceptance remains pending.
- Scope exception handling: AGENTS.md normally requests this entry in docs/handoffs/CODEX-TO-CLAUDE.md. The owner's later explicit files-only boundary takes precedence, so this copy-ready entry is placed inside the incoming package. No docs/handoffs files changed. Please copy it into the central log during later authorized intake.
- Stop here after this follow-up commit/push. Do not merge, publish, generate final assets or start a next task.
