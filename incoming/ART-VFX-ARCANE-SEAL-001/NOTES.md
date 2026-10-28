# ART-VFX-ARCANE-SEAL-001 — R1 / R2 owner selection

2026-10-28 (Asia/Bangkok). Art-only handoff on branch `art/art-vfx-arcane-seal-001`, targeting `feature/fateweave-initial-prototype`. Neither candidate has been selected or approved for motion. Do not merge this PR as part of this handoff.

## Contents and direction

- `R1/` and `R2/`: twelve separate transparent PNG layers each, four moves × prepare / peak / settle. Every file is 256×256 RGBA with straight alpha and at least 8px clear outer padding, matching Bolt's common 256px frame size. No atlas or runtime module is supplied.
- `storyboard-R1-390.png` and `storyboard-R2-390.png`: all four moves and all three beats at exactly 390px width. Grey figures are neutral anchor diagrams, not replacement character art; HP values are readability samples, not battle results.
- `source/R1.png` and `source/R2.png`: byte-identical original generated sheets, 1086×1448 RGBA. Requested generation size was 1536×2048; the tool returned this smaller size. Source row/column boundaries and output hashes are recorded in `layers.json`.
- `generation-prompts.json`: exact prompts, tool settings and original paths. `package.py` performs mechanical crop, proportional resize and transparent padding only; it generates the review boards and validates all layers. It writes only within this folder. Pillow and the system Open Sans font are needed to rebuild the boards.

**R1:** softer curved rose brackets, flowing violet loops, thinner fractured glyph wisps. **R2:** angular rose chevrons, stronger ivory edges, larger prism fragments. Both are original generated paintings using the existing game palette as guidance; no external art or real-world symbols are included. No text, figures or HUD are baked into the transparent effect layers.

References inspected: `incoming/ART-VFX-ALCHEMY-001/` (source format, extraction approach, prompts and notes), `public/assets/fx/bolt_fx.webp` and `.json` (painted violet/indigo/ivory, airy edges, centered 256px frames). Existing art was read only. This package does not edit or copy reference assets into the delivered layers.

## Placement and timing

Timing below is an **art-direction suggestion**, measured from the visual action's start, not new gameplay timing. Claude must fit the three beats inside the existing presentation phases and keep the authoritative event/contact instant, normal/fast/reduced-motion behavior and current total duration. Suggested canvas widths below refer to the entire 256px layer at a 390px game width; visible paint occupies less than the padded canvas. Scale proportionally at other game sizes.

All prepare layers use **caster hand**. Hand anchor means the rendered release point, not a fixed formation slot. Target centre means lower torso/waist below the face. Target feet means rendered sole contact, following the actor's current pose. The normalized suggested pivots in `layers.json` refer to the layer canvas; do not interpret them as battle coordinates.

| Move | Prepare at caster | Travel / peak | Impact / settle |
| --- | --- | --- | --- |
| `mark` — Duelist, no damage | 0–120ms; caster hand; 40–48px canvas. Gather rose thread. | 120–240ms; travel from hand, then stamp at **target centre**; 66–78px. One quiet seal stamp, no damage flash. | 240–420ms; reduce into a floating mark beside **target centre**; 30–38px canvas (about 14–20px visible paint). Retain only while the actual mark status exists; no looping impact or implied damage. |
| `sigil` / Sigil Bind — Mage | 0–140ms; caster hand; 42–50px. Gather violet knot. | 140–300ms; **target feet**; 94–112px. Close the floor ellipse; chain loops tighten inward, staying at calf/ankle height. | 300–520ms; **target feet**; 90–106px. One damage contact glint, then taut low links indicate bind only if the actual bind applies. |
| `storm` / Arcane Storm — Mage | 0–150ms; caster hand; 44–52px. Gather crystal seeds. | 150–350ms; falling shards distributed over the **enemy side**. Use target-centred local copies, 76–96px, offset to the side of each target's face and ending toward its feet. | 350–560ms; **target feet**; 60–78px. Instantiate exactly one compact settle flash per affected foe at that foe's actual damage contact. No additional flashes or hits implied by decorative shards. |
| `dispel` — Mage | 0–120ms; caster hand; 42–50px. Gather open ring. | 120–260ms; **target centre**; 86–102px. Open-centred ring fractures outward. No damage flash. | 260–480ms; **target centre**; 90–110px. Separate curved fragments drift outward and fade. Show effect removal only when the actual removal event occurs. |

Pivots: prepare, Mark and Dispel use `[0.5, 0.5]`. Sigil peak uses `[0.5, 0.72]`, Sigil settle and Storm settle `[0.5, 0.76]`, placing the ellipse/contact below the geometric image centre. Storm peak uses `[0.5, 0.5]`, with its falling trajectory positioned relative to each real foe. These are starting points for Claude's rendered-unit alignment, not a claim of runtime validation.

## Readability and integration handoff to Claude

Keep the rear rim/chain behind the target and only a narrow low foreground rim in front. The sheets are flat layers; depth splitting/masking belongs to the atlas/module integration. Leave all target faces and all real HP/name/status labels unobstructed, including neighboring actors in four-foe formations. Use real sprite/label masks where paint crosses an actor, as in the Alchemy reference. Never shift a face or HP number to make room for art.

Mark's settle layer floats beside the waist rather than above the head or over the HP label. Scale/fade its stamp down into that mark. Sigil's chains stay low. Storm's falling trail is decorative; damage presentation uses one settle flash per real affected foe and must respect defeated/missing targets. Dispel's hollow centre and separated settle fragments must not become an opaque body-covering disk. Use original alpha, with normal blending as the baseline; broad additive stacking will wash out the violet paint and HUD.

The boards show small-scale silhouette and label clearance only. They do not prove runtime attachment under pose, recoil, shake, resize or formation changes. After owner artwork selection, Claude builds the atlas/module, routes to real battle events, preserves battle rules/saves/balance and existing playback timing, and provides actual 390px motion clips, including fast and reduced motion, for owner review. Neither a generated image nor passing asset checks grants artwork/motion approval.

## Validation and scope

Ran `python incoming/ART-VFX-ARCANE-SEAL-001/package.py`: 24 RGBA PNGs, 256×256, transparent background, visible cores and 8px transparent gutters; two 390×1110 review boards. Inspected both boards at 390px. `layers.json` contains per-layer SHA-256, alpha/bright bounds, source rectangles and pivots. Packaging is deterministic for identical Pillow/font versions. `git diff --check` and folder-only change checks are required before the commit.

No runtime, rules, saves, content, tests, public assets, existing artwork or workflows changed. No gameplay/browser tests were needed for this art-only package; no real-device or runtime motion verification is claimed. `AGENTS.md` and `CLAUDE.md` were read first. The current user instruction permits additions only under this intake folder, so this note carries the usual Codex-to-Claude handoff instead of editing the shared docs handoff files.

**Owner decision pending:** R1 or R2 (a per-move selection is also possible). **Remaining:** owner selection, Claude integration, actual-event motion review. PR stays open and unmerged.
