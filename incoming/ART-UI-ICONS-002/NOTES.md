# ART-UI-ICONS-002

Original vector line-icon handoff for Asterveil · Fateweave, 2026-10-21.

## Delivery

32 standalone SVGs: 12 stats, 11 tabs and 9 actions. Filenames match the requested identifiers. `preview.png` is 1280 × 2056 pixels; every row shows the actual SVG rasterized at 16, 24 and 32 pixels on navy `#0b1730` and white. View the PNG at 100% for the intended size comparison.

## Visual grammar and provenance

Inspected `src/ui/svg/*.svg`, `src/ui/icons.ts` and `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md` on base commit `bc49f8e`. Match the shipped grammar: `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="1.8"`, round caps and joins, `fill="none"`. Effective stroke widths at 16/24/32 pixels are 1.2/1.8/2.4 pixels. No fixed colours, text, embedded images, font dependencies, filters or external resources in SVGs.

Paths were drawn in code for this handoff using the project's established primitives and common pictograms. Map, settings and reset deliberately retain the familiar geometry of the existing project symbols. No external icon pack, traced reference or generated bitmap was used.

## Symbol inventory

| Group | Files / meaning |
|---|---|
| Stats | `stat-hp` heart; `stat-attack` sword and spark; `stat-support` open palm and radiant star; `stat-speed` wing and forward arrow; `stat-armour` shield with inner plate; `stat-resist` shield with veil curl; `stat-leech` drop and returning arrow; `stat-barrier` protective dome; `stat-regen` footsteps and plus; `stat-luck` four-point star; `stat-level` chevron badge; `stat-exp` rising bars and trend arrow |
| Tabs | `tab-overview` person card; `tab-gear` breastplate; `tab-skills` lightning; `tab-tree` branching nodes; `tab-forge` anvil; `tab-bag` satchel; `tab-team` three heads; `tab-hire` contract scroll; `tab-pet` paw; `tab-map` folded map; `tab-settings` gear wheel |
| Actions | `act-wear` arrow into garment; `act-remove` arrow away from garment; `act-lock` closed shackle; `act-unlock` open shackle; `act-compare` paired columns and outward arrows; `act-filter` funnel; `act-sort` descending rows; `act-reset` returning circular arrow; `act-confirm` check |

The heading mentions currency icons, but the explicit deliverable list names only these 32 files. No additional currency or currency naming scheme is introduced. The base already contains `gold.svg`, `ore.svg`, `dust.svg` and `seal.svg`; currency integration should follow the current game rules, including the planned seal-to-star-shard migration.

## Integration handoff

Import as raw inline SVG in the same way as `src/ui/icons.ts`; `currentColor` inherits UI state colour only when inlined (or explicitly supplied in a renderer). Use live Thai labels/numbers outside the SVG. Treat accompanying icons as decorative with `aria-hidden="true"` and `focusable="false"`; give icon-only buttons an accessible Thai name. Keep touch targets at least 44 pixels even when the symbol is 16–24 pixels. Do not apply non-scaling strokes: the preview uses proportional scaling consistent with the existing set.

Armour uses a plate, resistance uses a curl, and barrier uses a dome to preserve meaning independently of colour. At 16 pixels the silhouettes carry recognition; the interior lines are supporting details. Lock/unlock retain the same body and differ in shackle position. Wear/remove arrows indicate opposite equipment flow.

## Verification

- Parsed all 32 SVGs as XML and checked viewBox, paint attributes, stroke width, caps and joins; no text/image/script nodes.
- Rasterized all icons at all three requested sizes on both backgrounds with Sharp/librsvg and visually inspected the complete contact sheet. Refined the wear arrow and separated tree nodes during review.
- Checked PNG dimensions and repository whitespace/scope. Only this incoming package is part of the change; no runtime integration or gameplay changes.
- Runtime typecheck/lint/gameplay/build suites were not run: the deliverables are standalone incoming art, and this isolated checkout has no installed application dependencies. SVG validation and raster review cover this package; device/browser integration remains for the UI integrator.

Branch: `art/art-ui-icons-002`. PR target: `feature/fateweave-initial-prototype`. Do not merge as part of this handoff.
