# Original generated sources

Generated with image_gen on 2026-10-23. The only visual reference was this
repository's approved `incoming/ART-UI-EQUIP-001/items/gear_items.png`.
No external game artwork or assets were used.

Shared direction: original fantasy inventory items matching the reference's
crisp dark contour, three-quarter cel-painted volume, soft gradients, warm
metal reflections and top-left light. Regular isolated cells with transparent
gutters, centred complete items, approximately 80% occupancy, readable at 48px
on #0b1730. Transparent RGBA. No words, numbers, frames, borders, UI, scenery,
ground shadows, people, rarity colours or rarity auras. Different physical
designs and craft rather than recolours.

Armour sheets: three rows × five columns. Every row has headwear, torso,
gloves, boots, necklace charm in that order.

- `armour_plain`: worn cloth/leather with stitching and clear quartz bead;
  fine reinforced steel/leather with a cut clear crystal; masterwork ornate
  silver/gold construction with clear crystal. Increasing construction detail.
- `armour_dawn_wind_shadow`: sun/shield silver plate and pale gold/cream;
  feather/spiral light travel leather and teal cloth; crescent/dagger charcoal
  leather and indigo cloth with a hood. Matching motifs across each row.
- `armour_thorn_starveil_mender`: forest leather with bronze thorn vines;
  midnight cloth and silver stars/arcs; ivory/sage healer cloth with pink leaves.
  Matching motifs across each row.

Weapon sheets: five rows × three columns, worn/fine/masterwork left to right.
Worn utilitarian, fine uses approved identity, masterwork visibly more intricate
craft with a restrained contained shine in the same intrinsic colour.

- `weapons_a` rows: guardian silver longsword/blue inset/gold guard; tracer
  angular silver sword/red inset/winged guard; weaver violet orb staff/gold
  crescent; healer green gem staff/gold leafy head; garran leaf spear/teal ribbon.
- `weapons_b` rows: mira brown/gold recurve bow/string; toma round amber flask
  and companion vials; sefa crossed silver leaf daggers/dark guards; brann
  octagonal steel hammer/gold geometric inlay; lio golden pear-shaped lute.
- The generated middle column is retained in the source for provenance. Runtime
  fine weapons use the approved 001 pixels unchanged, preserving identity exactly.

`boss_charms`: one row × three columns: aegis winged silver/gold shield relic
with a blue stone; focus violet crystal within concentric silver focusing
prongs; lantern miniature bronze hanging lantern containing amber light.

Mechanical processing: gutter cuts, component-based alpha cleanup, centred
downsampling, packing and review compositing only, via `build_package.py`.
