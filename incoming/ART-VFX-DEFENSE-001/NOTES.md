# ART-VFX-DEFENSE-001 — V1 + low aura R3

Original effect-only artwork generated for Asterveil · Fateweave with built-in ImageGen, 2026-10-26 (Asia/Bangkok). The owner's current request and family-2 handoff authorize generation. No outside artwork or sibling repository content was used. A standalone imagegen SKILL.md is not installed in this environment; generation followed the callable built-in tool's transparent-output instructions and the sprite-pipeline guidance.

- `source/`: 11 untouched RGBA PNG originals, each 2172×724 (the requested 1536×512 was not the actual returned size), three poses per strip. All have real alpha. Original tool output files remain in `/workspace/generated_images`.
- `generation-prompts.json`: exact prompts and original tool-output paths. No API key, CLI generation or Shado dependency.
- `reference/`: eleven immutable 390×844 screenshots of the actual game's UI/scene plus resolver-derived events/anchors from the isolated defense fixture. No battle commands were committed during screenshot capture. Synthetic QA party only, no owner save.
- Review boards, native-size peak PNGs, viewer and SHA-256 manifest: `docs/combat-presentation/defense-storyboards/`.
- The packaging script analyzes alpha and copies originals byte-for-byte. It does not paint, erase, recolor or flatten them. Browser compositing only crops/scales/positions source rectangles over immutable real screenshots. One scale per strip is shared by all three phases.

This is concept artwork awaiting the owner's selection. It is not a runtime atlas, a finished flipbook, a battle outcome recording or visual approval. After selection, keep this family's one PR, pack one shared atlas/module, preserve playback/resolved outcomes, and submit actual 390px runtime clips before any family 3 work.

## Aura R2 revision — 2026-10-26

Owner feedback: armour artwork painted on top of costumes looks mismatched; try aura. Revised Stone Armour and Aegis with built-in ImageGen using each original strip as an edit reference, preserving transparency. The effects now surround the silhouette and expose the face/torso instead of adding costume plates. Both retain their real barrier semantics and separate earth/crystal character. Other nine concepts are unchanged.

`archive/v1/` retains the two untouched original strips, native 390px peaks and original manifest/prompts. `aura-r2-prompts.json` records exact edit prompts and output provenance; `generation-prompts.json` points to the currently proposed originals. The viewer provides a V1/R2 switch only on those two skills. This is a proposal for visual review, not owner approval or runtime integration.

## Low aura R3 — 2026-10-26

Owner requested aura only around the legs, not up to the head. Redrew both Stone Armour and Aegis as shallow ground-level motifs with ImageGen using R2 as the edit reference. Current proposed bounds: earth 88×32px, crystal 80×28px. The compositor anchors the bottom to each actual foot position; one shared scale per strip, no flattening/stretching of a tall effect.

`archive/r2/` preserves untouched R2 strips, native peaks, metadata and prompts. `aura-r3-prompts.json` records the current exact edit prompts/provenance; `generation-prompts.json` points to the current sources. Viewer comparison now switches R2/R3 and reset selects R3. Other nine concepts remain unchanged. This remains an unapproved artwork proposal, with no runtime/rules/timing changes.

## Runtime delivery — 2026-10-27 (Asia/Bangkok)

Owner selected the low R3 leg-aura direction and authorized implementing all eleven moves. `package.py` now builds one35-frame1584×1584 WebP/JSON atlas and generated profile table, keeping one scale/bottom anchor per strip. Guard/Rally/Bulwark/Guardian Stone placements were polished using their existing paintings. `production-sources.json` records original hashes/rectangles; `atlas-preview.png` labels are review-only. Sources remain untouched. Two shared approved blade paintings are packed for neutral response use; no sibling-repository content.

Runtime and eighteen real390px clips: `docs/combat-presentation/defense-slice/README_TH.md`. This is awaiting owner motion review, not merge/publication approval. Do not start family3.

## Rally artwork revision pending — 2026-10-27

Owner rejected the existing Rally artwork. A new horizontal blue/silver/gold ribbon proposal is isolated in `proposals/rally-r2/`, with exact edit prompt and untouched RGBA original. Native390px composite/three-phase review is in `docs/combat-presentation/rally-r2/`. It is not promoted into `source/rally.png`, the production atlas/profile/module or any runtime clip. Other skill approvals are not implied. Continue Rally artwork review in PR#77 before repacking/re-recording it.

## Rally R3 floor-only proposal — R2 rejected

Owner rejected R2 because it overlaps clothing. New original/prompt in `proposals/rally-r3/`, review in `docs/combat-presentation/rally-r3/`. Paired floor marks90×12, feet dy27, below costume/boots/HP in390px composite. Not promoted; production and clips unchanged. Same draft PR77, no family3.

## Rally R4 command/response redesign

Owner asked to redesign after discussing Rally mechanics/concept. New six-cell original and exact generation/refinement prompts in `proposals/rally-r4/`; review in `docs/combat-presentation/rally-r4/`. Command wave beside Knight then simultaneous low floor responses on allies. Distinct sender/recipient art, no costume coverage. Pending artwork selection; production source/atlas/module/clips unchanged. Same draft PR77, no family3 or inferred approval of R3/other clips.
