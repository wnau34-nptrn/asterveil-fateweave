# ART-VFX-REWORK-001

Generated original effect-only artwork with built-in image_gen, 2026-11-07. Codex makes the artwork and integrates it under the owner's explicit §31 exception. No owner motion approval is inferred.

- Selected R1 poison drop emblem for its compact silhouette; R2 fang is supplied for comparison. This is Codex's recommendation, not owner approval.
- All coloured edges use normal straight alpha, no additive whole-sprite bloom. Every normalized cell has ≥12px alpha padding and a common scale/offset per effect. Pivots are normalized (0.5,0.5), anchored by live body landmarks, not board coordinates.
- Reduced motion uses one quiet static peak (storm only one slash); persistent marks repeat 1–3 from actual poison/arcane state. Fast inherits existing stage timing. Motion stays within the existing contact/recovery window; suggested brief milliseconds are not new playback durations.
- `source/` preserves byte-identical generator outputs. `source/rejected/` preserves three initial outputs rejected for painted panel backgrounds; their image_gen edits remove those backgrounds. Exact prompts and generation IDs are recorded in generation-prompts.json.
- `package.py` normalizes then trims/packs losslessly (`lossless=True, exact=True`) with logical 256px source sizes. `verify.py` checks SHA/byte counts, fully decodes PNGs, and compares every reconstructed atlas frame per channel.
- Deviations found by reading current engine: knives hits the actual back/front row before coating; it is not a synthetic single-target attack. Burst initial/subsequent hits can apply fresh poison while coat remains; marks follow real final state and do not pretend all poison is cleared. Storm uses only real surviving hit events. No rules/save/content/balance or stage timing changes.
- Storyboard is a static 390px placement/reference sheet, not gameplay evidence. Comparison shows old reused blade art and the new contact at 100px. Actual 390px real-clock Chromium clips live in `docs/combat-presentation/vfx-rework-slice/`.
- This shared VFX atlas has its own ≤8MiB decoded /1.5MB download guard. The ≤6MiB unit guideline is not a shared VFX limit; existing 64MiB encounter unit budget remains checked separately.

Owner must review actual clips before merge/publication as specified by this task.
