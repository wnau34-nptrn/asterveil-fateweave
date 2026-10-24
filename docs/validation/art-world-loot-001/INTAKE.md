# Asset Intake Review — ART-WORLD-LOOT-001

Date: 2026-10-15 · Source: [PR #3](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/3), branch `art/art-world-loot-001` at `b5732c3` · Status: **ACCEPTED_WITH_TECH_FIX**

## Checks (run independently, not only the package's own validator)

| Check | Result |
|---|---|
| Scope of the PR diff | 33 added files, all under `incoming/ART-WORLD-LOOT-001/`. No code, tests, workflows or public art touched. |
| Existing art SHA-256 | `tileset.webp`, `decor.webp`, `units.webp`, `portraits.webp` match the shipped files. |
| `chests.webp` | 512×128 RGBA with an sRGB profile; 4 frames in the order common, common open, rare, rare open. The visible bounds of every frame end at y=118, matching `footY`, with ≥14 px side margin. |
| `items.webp` | 384×128 RGBA with an sRGB profile; ore/ember/seal frames inside the 128 px cells with ≥12 px margin. |
| Halos / matte | Composited on pale (#f4f7fc) and navy (#0d1c2e) at 2× magnification: no fringe or rectangle. The partial alpha is anti-aliased edges. |
| SVGs | 8 line icons follow the shipped grammar (24 viewBox, 1.8 `currentColor` stroke). The 2 rank badges use fixed gold/navy fills, as specified. No text. |
| Readability | Review sheets and the live game at 48–64 px tiles: closed vs open and common vs rare are obvious, including in greyscale. Items read at 40 px. |
| Budget | Runtime WebP + SVG = 44,878 bytes (limit 350,000). |
| Provenance | Generated originals, recorded in `NOTES.md`. No external art imported. |

## Integrated

- `public/assets/world/chests.webp` and `items.webp`; frame maps `src/content/world/chests.json` and `items.json`.
- `src/ui/svg/`: chest, chest-open, ore, ember, seal, pack and star replace the phase 2A placeholders; star-filled, star_badge and star_badge_empty are new.
- **Map chests:** a 1-tile frame anchored at the tile bottom (sole at y=118 of 128). The game adds its own contact shadow and a soft gold glow on unopened rare chests. Opening plays a short scale pulse (off under reduced motion).
- **Pack dialog:** shows the painted items at 40 px. The HUD capsule, buttons and headings keep the line icons.
- **Star rows** (Lobby team, hiring board, member panel, camp team): individual badges.

## Tech fix

- **Empty-badge contrast.** The empty badge (fill #14243a) nearly vanishes on the #142a40 member cards. CSS raises it with `brightness(2.4) saturate(.5)` at 85% opacity. The SVG itself is unchanged.

## Not used

- PNG copies, review sheets and `tools/`: reference only.
- The optional opening burst was not delivered.

## Tests

- typecheck, lint and build pass.
- 110 Node tests pass.
- 90 Playwright tests pass, including the chest open flow, the pack dialog and the Lobby hire/upgrade flow. Screenshots are in this folder.
- Tested in Linux Chromium only.
