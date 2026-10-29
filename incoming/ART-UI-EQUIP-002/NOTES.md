# ART-UI-EQUIP-002 — equipment variety

Branch: `codex/equip-art-002`, based on `feature/fateweave-initial-prototype`
at `84bb280c520201c41d3adb0a9abcf2ec8cd0e00e`. Original artwork generated
2026-10-23 with the approved ART-UI-EQUIP-001 gear sheet as the only reference.

## Runtime contract

78 unique painted cells: 45 armour, 30 class weapons, 3 boss charms. The atlas
is **1280×1024, 10 columns × 8 rows**, with **128px cells**. Two trailing cells
are transparent. Items are centred with a 104px maximum extent and at least
6px clear padding. Lossless WebP, RGBA, embedded sRGB; decoded runtime pixels
match `gear_items.png`. `validation.json` records byte size and alpha bounds.

No text, rarity frame or rarity aura is baked into the art. Intrinsic materials,
set motifs and weapon gem colours belong to the item. Existing UI rarity frames,
boss marker and separate set emblems remain in place. Potion and emblem runtime
images and JSON are unchanged. No rules, numbers or save changes.

## Selection and rarity

The actual saved rarity range in `core/world/types.ts` / `equipment.ts` is
**0–4**, so the requested human tiers map as follows:

| Saved rarity | Plain armour suffix | Weapon suffix | Construction |
| --- | --- | --- | --- |
| 0, 1 | worn | 1 | Simple cloth/leather, utilitarian weapon |
| 2 | fine | 2 | Reinforced armour; approved 001 weapon pixels |
| 3, 4 | master | 3 | Ornate silver/gold detail, restrained intrinsic magic |

`gearCell` chooses boss first, then class weapon (even when it has a set), then
armour set, then plain tier. Missing new names fall back to the corresponding
legacy name. All 15 legacy names are retained as aliases: class weapons point
to tier 2, generic slots to fine. An unknown class or classless weapon still uses
the UI's existing slot SVG when no legacy frame exists.

The CSS atlas dimensions and percentage positions derive from the JSON bounds,
following the skill atlas fix, so expanding the grid does not show neighbours.

## Set language

| Set | Consistent motif across head, body, gloves, boots and charm |
| --- | --- |
| dawn | Rising sun/shield, silver plate, warm pale gold, cream cloth |
| wind | Silver feathers and flowing spirals, teal wraps, light travel leather |
| shadow | Silver crescent/dagger, charcoal leather, indigo hood and wraps |
| thorn | Bronze thorn vines, forest leather, pointed briar contours |
| starveil | Silver stars and sweeping arcs, midnight blue cloth |
| mender | Pink leaves and healing sprigs, ivory cloth and sage leather |

Boss identities: aegis = winged shield and blue stone; focus = concentric silver
prongs and violet crystal; lantern = miniature bronze lantern with contained
amber light. Complete short cord loops are visible in the final source.

## Sources and review

- `sources/`: six original high-resolution PNG sheets. The boss sheet was
  revised to fit complete cord loops; the uncropped final revision is retained.
- `cells/`: all 78 centred 128px PNG cells. Fine weapon cells retain 001 pixels.
- `PROMPTS.md`: generation direction and original-only provenance.
- `source-cuts.json`: exact gutter cuts used in the final mechanical build.
- `review/preview-48.png`, `preview-64.png`, `preview-96.png`: every runtime cell
  on #0b1730, sample UI rarity frames and separate emblems. Numbers outside
  the frames are review indices, never part of the item art.
- `review/bag-mixed-loot-390.png`: real game bag grid with mixed seeded loot.
- `review/character-full-set-390.png`: real game sheet with all five dawn
  armour pieces and a class weapon worn. Portrait art itself is unchanged.

Rebuild: `python incoming/ART-UI-EQUIP-002/build_package.py` (Pillow, NumPy,
SciPy). It cuts, cleans alpha, downsamples, packs and composites review frames;
it does not paint or recolour items. Validation checks dimensions, unique cells,
padding, alpha and PNG/WebP equality. Browser evidence uses Chromium touch
emulation at 390×844; it does not establish real-device or iOS coverage.

## Mapping table

Coordinates below are zero-based cells, each 128px. Preview indices are 1-based.

| Preview | Frame | Column | Row |
| --- | --- | --- | --- |
| 1 | `gear_head_worn` | 0 | 0 |
| 2 | `gear_body_worn` | 1 | 0 |
| 3 | `gear_gloves_worn` | 2 | 0 |
| 4 | `gear_boots_worn` | 3 | 0 |
| 5 | `gear_charm_worn` | 4 | 0 |
| 6 | `gear_head_fine` | 5 | 0 |
| 7 | `gear_body_fine` | 6 | 0 |
| 8 | `gear_gloves_fine` | 7 | 0 |
| 9 | `gear_boots_fine` | 8 | 0 |
| 10 | `gear_charm_fine` | 9 | 0 |
| 11 | `gear_head_master` | 0 | 1 |
| 12 | `gear_body_master` | 1 | 1 |
| 13 | `gear_gloves_master` | 2 | 1 |
| 14 | `gear_boots_master` | 3 | 1 |
| 15 | `gear_charm_master` | 4 | 1 |
| 16 | `gear_head_set_dawn` | 5 | 1 |
| 17 | `gear_body_set_dawn` | 6 | 1 |
| 18 | `gear_gloves_set_dawn` | 7 | 1 |
| 19 | `gear_boots_set_dawn` | 8 | 1 |
| 20 | `gear_charm_set_dawn` | 9 | 1 |
| 21 | `gear_head_set_wind` | 0 | 2 |
| 22 | `gear_body_set_wind` | 1 | 2 |
| 23 | `gear_gloves_set_wind` | 2 | 2 |
| 24 | `gear_boots_set_wind` | 3 | 2 |
| 25 | `gear_charm_set_wind` | 4 | 2 |
| 26 | `gear_head_set_shadow` | 5 | 2 |
| 27 | `gear_body_set_shadow` | 6 | 2 |
| 28 | `gear_gloves_set_shadow` | 7 | 2 |
| 29 | `gear_boots_set_shadow` | 8 | 2 |
| 30 | `gear_charm_set_shadow` | 9 | 2 |
| 31 | `gear_head_set_thorn` | 0 | 3 |
| 32 | `gear_body_set_thorn` | 1 | 3 |
| 33 | `gear_gloves_set_thorn` | 2 | 3 |
| 34 | `gear_boots_set_thorn` | 3 | 3 |
| 35 | `gear_charm_set_thorn` | 4 | 3 |
| 36 | `gear_head_set_starveil` | 5 | 3 |
| 37 | `gear_body_set_starveil` | 6 | 3 |
| 38 | `gear_gloves_set_starveil` | 7 | 3 |
| 39 | `gear_boots_set_starveil` | 8 | 3 |
| 40 | `gear_charm_set_starveil` | 9 | 3 |
| 41 | `gear_head_set_mender` | 0 | 4 |
| 42 | `gear_body_set_mender` | 1 | 4 |
| 43 | `gear_gloves_set_mender` | 2 | 4 |
| 44 | `gear_boots_set_mender` | 3 | 4 |
| 45 | `gear_charm_set_mender` | 4 | 4 |
| 46 | `weapon_guardian_1` | 5 | 4 |
| 47 | `weapon_guardian_2` | 6 | 4 |
| 48 | `weapon_guardian_3` | 7 | 4 |
| 49 | `weapon_tracer_1` | 8 | 4 |
| 50 | `weapon_tracer_2` | 9 | 4 |
| 51 | `weapon_tracer_3` | 0 | 5 |
| 52 | `weapon_weaver_1` | 1 | 5 |
| 53 | `weapon_weaver_2` | 2 | 5 |
| 54 | `weapon_weaver_3` | 3 | 5 |
| 55 | `weapon_healer_1` | 4 | 5 |
| 56 | `weapon_healer_2` | 5 | 5 |
| 57 | `weapon_healer_3` | 6 | 5 |
| 58 | `weapon_garran_1` | 7 | 5 |
| 59 | `weapon_garran_2` | 8 | 5 |
| 60 | `weapon_garran_3` | 9 | 5 |
| 61 | `weapon_mira_1` | 0 | 6 |
| 62 | `weapon_mira_2` | 1 | 6 |
| 63 | `weapon_mira_3` | 2 | 6 |
| 64 | `weapon_toma_1` | 3 | 6 |
| 65 | `weapon_toma_2` | 4 | 6 |
| 66 | `weapon_toma_3` | 5 | 6 |
| 67 | `weapon_sefa_1` | 6 | 6 |
| 68 | `weapon_sefa_2` | 7 | 6 |
| 69 | `weapon_sefa_3` | 8 | 6 |
| 70 | `weapon_brann_1` | 9 | 6 |
| 71 | `weapon_brann_2` | 0 | 7 |
| 72 | `weapon_brann_3` | 1 | 7 |
| 73 | `weapon_lio_1` | 2 | 7 |
| 74 | `weapon_lio_2` | 3 | 7 |
| 75 | `weapon_lio_3` | 4 | 7 |
| 76 | `boss_aegis` | 5 | 7 |
| 77 | `boss_focus` | 6 | 7 |
| 78 | `boss_lantern` | 7 | 7 |
| alias | `weapon_guardian` | 6 | 4 |
| alias | `weapon_tracer` | 9 | 4 |
| alias | `weapon_weaver` | 2 | 5 |
| alias | `weapon_healer` | 5 | 5 |
| alias | `weapon_garran` | 8 | 5 |
| alias | `weapon_mira` | 1 | 6 |
| alias | `weapon_toma` | 4 | 6 |
| alias | `weapon_sefa` | 7 | 6 |
| alias | `weapon_brann` | 0 | 7 |
| alias | `weapon_lio` | 3 | 7 |
| alias | `gear_head` | 5 | 0 |
| alias | `gear_body` | 6 | 0 |
| alias | `gear_gloves` | 7 | 0 |
| alias | `gear_boots` | 8 | 0 |
| alias | `gear_charm` | 9 | 0 |
