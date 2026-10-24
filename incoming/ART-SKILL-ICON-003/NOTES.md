# ART-SKILL-ICON-003 — C1 painted big-tree skills

Generated original artwork with the built-in ImageGen tool on 2026-10-23 (Asia/Bangkok). References: approved ART-SKILL-ICON-001-R1 PNGs, its NOTES/prompts, and the game's existing 34-icon atlas. No external art or other repository assets were imported. The current user task explicitly authorizes runtime integration and uses branch `codex/skill-icons-003`, overriding section 23's older art-only branch/path limits. Leave the requested PR open for review.

## Delivery

- `png/<id>.png`: 27 normalized 256×256 RGBA source icons.
- `skills_atlas.webp`: identical bytes to `public/assets/ui/skill_icons.webp`, 1536×2816, six columns × eleven rows of 256 px cells.
- `skills_atlas.json`: identical mapping to `src/game/visuals/skill_icons.json`. The original 34 IDs remain in their original order; section 23's 27 IDs follow verbatim. Five trailing cells are transparent.
- Existing art uses the approved native 256 px R1 PNGs and ART-SKILL-ICON-002 Attack PNG, preserving the original motifs without upsampling the old 128 px runtime atlas.
- WebP quality 85, method 6, full alpha: 1,186,696 bytes (about 1.13 MiB).
- `preview.png`: every class, existing then new icons, at native 40/56/72 px; each normal icon is followed by its 61% black cooldown version over navy #0b1730. Labels are preview-only.
- `sources.json` records selected generated original filenames; `prompts.json` records the prompt set. Original generator files stay in the tool's output folder; runtime only uses repository files.
- `bounds.json` records measured opaque extents and maximum alpha radii.

## Style and normalization

Top-left light, painterly material shading, substantial dark contours, gold trim, class palettes from R1. Each icon has one compact motif, no text, numbers, UI frame or rarity border. All final source PNGs were inspected together and at native 40 px beside the approved icons, including cooldown.

Packaging removes alpha dust below 4/255, finds a minimum enclosing circle, and applies uniform resampling plus a small rigid orientation adjustment where needed to match cell occupancy. No stretching, clipping, recolouring or procedural replacement of the generated artwork. Final opaque extents are 194–199 px (75.8–77.7% of the cell), with every nonzero-alpha pixel inside the centered radius-112 safe circle.

Palettes: Duelist crimson/rose/ivory/gold; Mage violet/pearl cyan/sky-white/pale gold; Priest emerald/mint/ivory/gold; Spear teal/silver/bronze gold; Archer forest green/brown/bronze/ivory; Alchemist amber glass/brass/cream with smoke, red tonic or lime acid; Scout navy/charcoal/silver/cool blue; Warden slate blue/grey stone/gold; Bard coral/honey gold/ivory (dark plum for Dread).

## Motif notes

| ID | Motif |
| --- | --- |
| parry | Sword deflects a second blade with a contact spark. |
| lunge | Long horizontal rapier thrust with a compact speed trail; regenerated to remove the rose emblem. |
| sweep | One broad sweeping slash with a blade at its leading end. |
| storm | Spiralling downward arcane bolts. |
| aegis | a faceted crystal dome sheltering THREE small simple figures |
| dispel | a violet rune shield shattering into a few large separated crystal fragments; abstract geometric rune only |
| revive | one figure silhouette RISING upward from a soft ivory light cradle, rebirth, upward flowing ribbons, no healing cross |
| halo | a luminous horizontal halo floating above a tall shield made of light |
| bless | a glowing ivory gloved hand above a raised silver weapon, blessing light joining them |
| hold | a silver spear planted in a stone ground base, one short broad defensive wall line behind |
| halt | a horizontal spear thrust stopping ONE charging dark silhouette with a bright contact spark |
| warcry | a bold shout-wave above TWO silver spearheads with teal pennants |
| disengage | a compact backflipping archer silhouette loosing ONE arrow, backwards curved motion trail |
| pin | THREE arrows nailing a single horizontal ground-row line, clear anchored arrowheads and small ground chips |
| track | ONE arrow following a curved dotted light path toward a small bronze target mark |
| smoke | an amber brass flask bursting into a bold grey-violet smoke cloud, visible flask below cloud |
| fury | a red tonic vial with a bold angry flame-shaped flare, brass stopper |
| catalyst | a tilted acid flask producing a chain-reaction burst of THREE connected lime green acid lobes |
| knives | THREE thrown silver knives fanning horizontally across a row, separated dark navy trails |
| decoy | a shadow double drawing a steel strike away from a second smaller solid scout figure |
| disarm | a silver weapon spinning out of an open dark gauntlet, one curved outward motion arc |
| stonearmor | rune-carved thick stone plates closing around a simple torso, broad squared armour silhouette |
| guardstone | ONE floating rune stone shielding ONE small ally figure, stone raised upper left, figure below right |
| tremor | a heavy rune hammer striking a long low ground crack with ONE lateral gold shock line, low wide silhouette |
| dread | ONE dark minor-key musical note with a broad shivering wave, ominous coral shadow, no letters |
| note | ONE sharp glowing golden musical note shot diagonally like a dart, tapered coral speed tail |
| solo | a narrow golden spotlight on ONE small figure with a SINGLE rising curved melody note |

Lunge, Guardstone, Dread, Note and Solo were regenerated after inspection: the first variants overused rose/physical-shield/lute motifs. Final Guardstone is a chipped rune stone above an ally; Dread is a dark gold-edged note and shiver wave; Note is one bright dart-like note; Solo is one figure under a spotlight with a rising melody. Revive uses an upward figure and rebirth light rather than a healing cross.

Subjective review point: several classes intentionally share luminous motion arcs. Distinctions depend on the central motif and silhouette, especially the two Bard notes and the Warden hammer/ground family. At 40 px, small figures and carved details become simple shapes. Engineering checks do not constitute owner artistic approval.

## Runtime and verification

The atlas order drives `icon()` automatically. `icon()` also derives background-size from atlas columns/rows; the old hardcoded 600% × 600% CSS was removed to prevent cross-cell fragments in the 6×11 atlas. All SVG aliases in `icons.ts` remain unchanged, including modifier nodes that deliberately use `lineIcon()`. No gameplay, resolver, save, balance or VFX behavior changes.

- Typecheck and lint passed.
- Vitest: 64 files / 751 tests passed.
- Production build passed; existing large-chunk advisory remains.
- Focused Chromium touch emulation at 390×844 checks the Skills and Talents tabs for Toma, Sefa, Brann, Lio, Lyra (tracer), and Eira/Aira (weaver, current Thai UI name ไอรา); checks atlas coordinates and retained line-art modifier nodes.
- Battle check: Lyra equips Lunge; selecting it does not commit a command; its painted dock art survives reload.
- Owner evidence: `qa/tree-390.png` and `qa/battle-dock-390.png`, exactly 390×844.
- This is desktop Chromium touch emulation, not a real-phone or iOS Safari claim.

Rebuild from committed PNGs with `python incoming/ART-SKILL-ICON-003/package_icons.py` (Pillow and numpy required). Import originals with the script's optional `--normalize <generated-image-directory>` flag. Run focused UI checks with `ICON_SHOTS=incoming/ART-SKILL-ICON-003/qa npx playwright test tests/browser/painted-skill-icons.spec.ts --config=playwright.icons.config.ts` (PowerShell: set `$env:ICON_SHOTS` first). The dedicated config owns port 5193 to prevent silently reusing another worktree's Vite server.
