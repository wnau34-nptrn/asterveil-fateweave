# Project skills — provenance

Project-local Claude Code skills (`.claude/skills/<name>/SKILL.md`). Claude Code discovers them at session start; a running session may need a restart to see new ones. Game-specific usage, setup and evaluation notes: [docs/tools/AGENT_SKILLS_TH.md](../../docs/tools/AGENT_SKILLS_TH.md).

Skills are guidance only. The user's current request, `CLAUDE.md` and `AGENTS.md` take precedence.

## Vendored (third-party)

| Skill directory | Upstream | Version / commit | License | Local changes |
| --- | --- | --- | --- | --- |
| `phaser-animations`, `phaser-cameras`, `phaser-filters-and-postfx`, `phaser-game-object-components`, `phaser-game-setup-and-config`, `phaser-graphics-and-shapes`, `phaser-input-keyboard-mouse-touch`, `phaser-loading-assets`, `phaser-scale-and-responsive`, `phaser-scenes`, `phaser-sprites-and-images`, `phaser-time-and-timers`, `phaser-tweens`, `phaser-v4-new-features` | https://github.com/phaserjs/phaser/tree/v4.2.1/skills (official, Phaser Studio) | tag `v4.2.1` = commit `41be1e462bc600064e498cba370bfa8c5c055a22` (matches the game's `phaser` 4.2.1) | MIT, `LICENSE.md` copied into each directory | Directory and frontmatter `name` prefixed with `phaser-`; links to other installed Phaser skills rewritten to the prefixed directories; links to skills not vendored here point to the upstream `v4.2.1` URL. Fixed three broken upstream links (`references/REFERENCE..//SKILL.md` in cameras and sprites-and-images; a one-level-short path in game-object-components `references/REFERENCE.md`). Text otherwise unchanged. |
| `playwright-cli` | npm `playwright-core@1.64.0`, `lib/tools/skills/playwright-cli/` (Microsoft; source repo https://github.com/microsoft/playwright tag `v1.64.0` = `606ecd8b34bac100db32561b6278ffd76e5eb3cd`) | matches the project's locked `@playwright/test` 1.64.0; npm integrity `sha512-T9r+MZkTECl2+oUcZ26YgZzTrYidTsIhYYkJix+6iDOymOb1FB2RLLSOxRGnZGv5DStt+aduIVbt+E8WygXYpg==` | Apache-2.0, `LICENSE` + `NOTICE` copied | None (byte-identical copy). Runs through the project's own `npx playwright cli`; no new dependency. |

Not vendored from the Phaser set (not used by this game or superseded by project rules): physics-arcade, physics-matter, tilemaps, particles, render-textures, text-and-bitmaptext (HUD text is DOM), audio-and-sound (audio is in `src/platform`), groups-and-containers, events-system, data-manager, actions-and-utilities, curves-and-paths, geometry-and-math, v3-to-v4-migration. Fetch them from the upstream tag if a future task needs one.

## Project-made (new, not upstream)

| Skill directory | Built from |
| --- | --- |
| `fateweave-codex-art-brief` | `docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md`, `docs/handoffs/CODEX-ANIMATION-VFX-PROMPTS-TH.md`, W1–W8 plan |
| `fateweave-art-intake` | A1–A4 / C5 intake pipeline (`incoming/*/build_assets.py`, `scripts/pack-unit-atlases.py`, `docs/design/UNIT_ANIMATION_ROLLOUT_TH.md` §6–§7) |
| `fateweave-rules-and-sim` | `CLAUDE.md` architecture and development rules, `npm run sim` |

## Updating

Re-copy from the upstream tag that matches the dependency version in `package-lock.json` (Phaser → `phaserjs/phaser` tag; Playwright → `node_modules/playwright-core/lib/tools/skills/playwright-cli`), re-apply the local changes listed above, and update this table.
