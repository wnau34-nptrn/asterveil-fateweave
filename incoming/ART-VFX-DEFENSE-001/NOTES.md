# ART-VFX-DEFENSE-001 — V1 + aura R2

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
