# ART-SKILL-ICON-001 — painted skill icons

Original AI-assisted painted artwork produced with the built-in ImageGen tool on 2026-10-21. Artwork is staged for review; visual acceptance remains with the owner. No runtime integration or merge is included.

## Delivery

- `png/<id>.png`: thirty 256 × 256 RGBA icons. Transparent edges; all nonzero-alpha pixels stay within the centred 200 px diameter safe circle. Resizing preserves original alpha and artwork, without cutting off effects.
- `skills_atlas.webp`: lossless RGBA, 1536 × 1280, six columns by five rows of 256 px cells; no spacing. Ordered row-major exactly as the handoff lists the skills, independent of class row boundaries.
- `skills_atlas.json`: `order` and `frames[id]` with zero-based index, column, row, x, y, width, height. Top-left pixel origin. Consumers should use the mapping instead of assuming a class occupies one atlas row.
- `preview.png`: navy #0b1730; one class per row. Within each row, the three skills are shown as normal/cooldown pairs at 40 px, then 56 px, then 72 px. The review-only cooldown is a 61% black circular overlay. Labels appear only in this review sheet, never in icon art or atlas.
- `prompts.json`: shared style brief and all thirty individual motifs/palettes. `sources.json` records local generated originals; those machine-local paths are provenance, not runtime dependencies. `package.py` rebuilds and validates from those originals with Pillow.

## Style and meaning

References read: `public/assets/ui/equip/gear_items.webp`, `public/assets/art/units.webp`, `public/assets/art/units_mercs.webp`, existing `src/ui/svg/` skill motifs, `src/ui/th.ts`, and `docs/combat-presentation/vfx-art-direction/README_TH.md` in the existing checkout. Painted highlights come from top-left, with dark contour edges, gold trim and class-specific materials. These references were read before production; the requested remote base is older than some reference documentation.

Families: guardian royal blue/gold; tracer crimson/rose/ivory; weaver violet with sky-white Bolt and pearl-cyan Ward; healer emerald/mint/ivory; garran teal/steel; mira forest green/brown/bronze; toma amber/brass with distinct flask contents; sefa navy/charcoal/silver; brann slate/stone/gold; lio coral/honey wood/gold with mint for healing.

Rally means team protection, not resurrection. Sigil uses abstract geometric ornament rather than text. Ward is a curved veil rather than a physical shield. Sanctuary depicts protected holy ground; its real gameplay effect remains governed by code. Musical-note shapes are pictorial motifs, not typography. No text, numbers, frames, UI or rarity indicators are baked into deliverable icons.

## Verification

Run `package.py` with Pillow to normalize originals, regenerate the preview/atlas and assert all thirty dimensions, genuine alpha, circular safe bounds, mapping order, and pixel-identical lossless atlas cells. Visual review is performed on the assembled preview and full-resolution atlas; technical checks do not imply owner approval or an exact artistic equivalence to the reference.

Only files under `incoming/ART-SKILL-ICON-001/` are part of this change. No gameplay tests are required for this isolated art delivery.
