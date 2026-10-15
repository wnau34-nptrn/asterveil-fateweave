# Asset Intake Review — ART-UI-LOBBY-001

Date: 2026-10-15 · Source: [PR #5](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/5), branch `art/art-ui-lobby-001` at `37329cc` · Status: **ACCEPTED**

## Checks (run independently)

| Check | Result |
|---|---|
| Scope | Only `incoming/ART-UI-LOBBY-001/` is added; the merge is clean. |
| Scene | `lobby_bg` 2400×1000 RGB with no text and a blank hire board. `lobby_fg` 2400×1000 RGBA, alpha only in y 951–999. `lobby_firepit` 256×256 RGBA, no flames. |
| Poses | Heroes 1536×2048 (4 rows) and mercenaries 1536×3072 (6 rows); columns sit / cheer / idle_alt. All 30 frames end at y=496 (exclusive 497) with ≥8 px padding. `seatY` is recorded on every `sit`. |
| Budget | Runtime 1,200,288 B (limit 1.6 MB). |
| Existing art | `units.webp`, `units_mercs.webp`, `title_bg.webp` and `landmark_camp.webp` unchanged (SHA-256). |
| Identity / facing | Matches the masters. Every pose faces right and reads correctly mirrored. |
| Repository weight | `provenance/generated/` holds about 10 MB of raw generations: reference only, not loaded by the game. |

## Integrated

- The five runtime WebPs are copied unchanged to `public/assets/lobby/`.
- `game/visuals/assets.ts` adds `lobbyPose(id, pose)` (sheet, column, row) and `lobbyArt(name)`.
- **Scene band.** The painting is cover-scaled and anchored at 78% height, so the ground band stays under the actors from 2.4:1 to 4.7:1. A warm firelight gradient sits on top. The foreground layer is drawn above the actors, and the code-drawn flame sits on the stone firepit.
- **Poses follow game state** (`LobbyUI.scene`):
  - front pair: `sit`;
  - middle pair: `idle_alt`;
  - back members: alternate `sit` / `idle_alt`;
  - the member just hired or upgraded: `cheer`;
  - everyone after a completed expedition: `cheer`.
- Members right of the fire are mirrored to face it. Feet share the 496 sole line, the same as the battle frames.
- A member without a pose frame falls back to their idle battle frame.

## Tests

- typecheck, lint, Node tests and build pass.
- 15 lobby browser tests pass, including the 11 viewports (no page scroll), and new pose assertions: guardian sits, Lyra has her moment, a newly hired Mira cheers. Screenshots are in this folder.
- Tested in Linux Chromium only.
