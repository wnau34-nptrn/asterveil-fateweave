# ART-VFX-SONG-SHADOW-001 — shadow / Sefa, Scout

2026-10-28 (Asia/Bangkok). Art-only, branch `art/art-vfx-song-shadow-001`, base `feature/fateweave-initial-prototype`. PR stays open and unmerged. R1 only: Evade's thin low smoke/shimmer and Decoy's single adjacent illusion have unambiguous, distinct silhouettes. No owner artwork or motion approval is claimed.

## Contents

`R1/` contains six separate transparent 256×256 straight-alpha RGBA PNGs: two moves × prepare / peak / settle, each with minimum 8px clear padding. `storyboard-R1-390.png` is exactly 390×614, with all six beats, neutral anchor figures, protected face/HP regions and sample HP labels. The full-body blue ghost is the effect itself, not replacement Sefa art. Its own faceless hood is intentional; it must stand beside Sefa and must not overlap any actor's face or labels.

`source/R1.png` is the byte-identical original generated 1536×1024 RGBA sheet. `generation-prompts.json` records the exact original prompt/settings/path. `layers.json` records source/output SHA-256, sizes, crop rectangles, alpha bounds, source anchor pixels, pivots, timing and suggested scale. Steel blue/slate paint with thin pale shimmer and soft transparent edges; no attack flash or opaque shield. Original artwork only, no external art references used.

Run `python incoming/ART-VFX-SONG-SHADOW-001/song/package.py` from repository root to rebuild both families. The sibling script uses Pillow and the system DejaVu Sans font; it performs mechanical crop/proportional resize/transparent padding only. Original source alpha is preserved. `SHA256SUMS` lists every family file except itself; verify here with `sha256sum -c SHA256SUMS`.

## Placement and timing

Suggestions below must fit the current action phases and duration, not change gameplay timing. Scale widths proportionally from a 390px game frame. Width is the complete padded layer canvas. Follow Sefa's current rendered soles, including pose/recoil; do not attach to fixed battle slots. Floor pivots in `layers.json` map inspected original paint anchors to normalized 256px canvas coordinates, rather than using diffuse glow bounds.

| Move | Prepare | Peak | Settle |
| --- | --- | --- | --- |
| `evade` — self dodge-ready stance | 0–90ms, Sefa feet, 62px. Thin low wisps. | 90–200ms, Sefa feet, 64px. A brief ankle-height curved shimmer. | 200–340ms, Sefa feet, 54px. Smoke threads dissolve fully. No impact or damage. |
| `decoy` — self/guard illusion | 0–120ms, beside Sefa feet, 40px. Small shadow pool. | 120–280ms, same adjacent floor point, 46px. One translucent silhouette appears. | 280–480ms, same floor point, 44px. Silhouette breaks into wisps and fades fully. |

Choose an unoccupied adjacent position, about 24–36px sideways from Sefa at 390px, and fit to actual actor spacing. Mirror the offset when necessary; never duplicate the ghost on both sides or place it over another actor. The board uses a small faceless silhouette to show this separation. If the formation has no clear space, reduce/fade/mask the effect instead of covering actors or labels. The source ghost is not a second real unit or an additional target.

## Integration handoff

Never cover Sefa's face, another actor's face, or any HP/name/status label. All review boards protect face and HP rectangles with masks; runtime integration must use actual rendered sprite/label masks. Keep wisps low, broad mist behind feet and only a thin foreground rim. Use normal alpha blending; preserve the subtle steel-blue paint without additive whiteout. The 390px boards are art anchor diagrams, not proof of attachment in motion.

Evade indicates a readiness/stance cue, not a successful dodge before an actual dodge event. Decoy indicates an illusion/guard visual only; no damage, HP gain, shield, extra hit, target or extra turn is implied. Show self/status cues only when actual battle events support them. Preserve battle rules, saves, content, balance, existing contact instant and normal/fast/reduced-motion duration. Claude will build the atlas/module and capture actual 390px motion clips later for owner review.

The batch follows the arcane-seal three-beat format; see `../song/NOTES.md` for reference provenance, full validation and scope. Six shadow PNGs pass size/alpha/gutter checks; this board was inspected at 390px. No gameplay/browser verification is claimed. The user's folder-only instruction overrides shared-doc handoff edits; this note is the shadow integration handoff. Only this new intake batch changed; no src/tests/public/workflows or existing art changes. Remaining: owner art review, Claude integration and runtime motion review.
