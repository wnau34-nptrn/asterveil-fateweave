# Asset Intake Review — ART-CHAR-MERC-ENEMY-001

Date: 2026-10-15 · Source: [PR #4](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/4), branch `art/art-char-merc-enemy-001` at `4860bb7` · Status: **ACCEPTED_WITH_TECH_FIX**

## Checks (run independently, not only the package's own validator)

| Check | Result |
|---|---|
| Scope of the PR diff | 83 added files, all under `incoming/ART-CHAR-MERC-ENEMY-001/`. The branch was cut from the older `e6dfc92`, but touches nothing else, so the merge is clean. |
| Existing art SHA-256 | `units.webp`, `portraits.webp` and `ruins.webp` match the shipped files. |
| Frames | 15 full bodies 512×512 RGBA and 15 portraits 512×512. Every visible sole ends at y=496 (exclusive 497), matching `footY: 496`. Padding is ≥8 px (Sentinel 5 px, within its 4 px allowance). |
| Halos | The semi-transparent edge share is 3.5–10% of the opaque area (antialiasing). Clean on light and navy at 160 px. |
| Text / logos | None. |
| Tiers | Normal foes have no gold, the elites have gold, and the Sentinel has gold plus violet. |
| Style | Same heroic-chibi line weight, cel shading and warm rim light as `units.webp`. Silhouettes are distinct from the heroes and from each other. |
| Facing | All 6 mercenaries face right. Sefa lunges wide, but his face and eyes turn right, so it is accepted. 8 of 9 foes face left or the front. **`foe_matriarch` faces right** in the frame and the portrait (see the tech fixes). |
| Budget | Package runtime WebP 1,939,496 B (limit 2.0 MB). |
| Provenance | Built-in image generation; prompts and hashes are in `PROMPTS.md` and `provenance/`. No external art imported. |

## Integrated (mercenaries)

- `public/assets/art/units_mercs.webp` (1024×1536 RGBA) and `portraits_mercs.webp` (1024×1536 RGB), re-encoded by Claude from the lossless PNGs. The frame order is spear, archer, alchemist, scout, warden, bard.
- `game/visuals/assets.ts` maps each actor to a sheet and frame (`actorArt`). Garran = frame 0, Mira = 1, Toma = 2. Frames 3–5 (Sefa, Brann, Lio) get mapped when each class ships.
- The tinted placeholders (Phaser tint and DOM `hue-rotate`) are removed.
- Battle sprites anchor at the soles (`497/512`). The lobby drops these frames by their sole padding so every pair of feet shares the ground line.

## Tech fixes

- **Re-encode.** Codex shipped quality-50 WebPs, to fit both the standalone and the atlas copies in the budget. The game only loads atlases, so Claude rebuilt them from the PNGs: units at quality 80 (336,890 B) and portraits at quality 72 (264,554 B). The new mercenary runtime total is 601,444 B.
- **Matriarch facing:** `foe_matriarch` and its portrait are mirrored horizontally in the runtime atlas. The design is symmetric, with no text or one-sided emblem, so no redraw was needed.

## Integrated later (same day)

- **Sefa** (frame 3) and **Brann** (frame 4) shipped with their classes.
- **The 9 foes:** `public/assets/art/units_foes.webp` (q80, 568,786 B) and `portraits_foes.webp` (q72, 431,008 B), each 1024×2560 in table order. The Matriarch's frame and portrait are mirrored (tech fix). Encounters choose them through `EnemyDefinition.art`; see "Veil Frontier foes in battle" in `docs/EXPEDITION_DESIGN.md`.
- **Total runtime art from this package:** 1,601,238 B (budget 2.0 MB).

## Not integrated yet

- Lio (frame 5) waits for the bard class.
- **The review mock** was a single large composition, not the real phone and desktop sizes. The real sizes were checked in-game instead (screenshots in this folder).
- **Optional attack and hit poses:** not delivered.

## Tests

- typecheck, lint and build pass.
- 145 Node tests pass, including a new guard: every hireable mercenary and every encounter enemy has its own unique frame.
- The Playwright suite passes, including the Garran, Mira and Toma battles, the lobby viewports and a check that Garran's card uses `portraits_mercs.webp`.
- Tested in Linux Chromium only.
