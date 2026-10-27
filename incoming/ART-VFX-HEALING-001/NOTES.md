# ART-VFX-HEALING-001 · original concept sources

2026-10-27 · ImageGen artwork only; owner selection pending.

- `source/cast-six-skills.png`: original1024×1536 RGBA,3columns×6rows heal/prayer/rouse/revive/bless/mend; left→right preparation/peak/dissolution.
- `source/upkeep-two-skills.png`: original1536×1024 RGBA,3columns×2rows Bless actual Renew heal/Mend actual round-start heal. Separate from cast.
- `generation-prompts.json`: exact prompts and original generated paths. Sources copied unchanged; originals remain in `/workspace/generated_images`.
- `reference/`: real390×844 renderer/UI screenshot per skill and resolver-derived anchors/events/snapshots; synthetic QA teams, no owner saves. Revive prelude replay generates a real down event before the skill is offered.
- `docs/combat-presentation/healing-storyboards/build_manifest.py` records original hashes/alpha, cell coordinates, bright bounds and shared strip floor projection (same X and Y factors across all three phases). Peak18px, tick16px, baseline footY+34; composite restricted to ground band footY+15…36, preserving costume/boots/HP pixels. No pixel repainting, keying or opaque-background removal. Rouse uses original left/right halves for protector/covered ally.
- No healing production atlas/module yet; sources are proposals. Review viewer has separate cast/tick and keeps screenshot HP/UI fixed explicitly. Final runtime must map real events/snapshots and preserve playback timing.

Authorship/provenance: original assets generated with the built-in ImageGen tool for this Fateweave request under owner's existing authorization, no external art or sibling assets. No new third-party asset license dependencies.
