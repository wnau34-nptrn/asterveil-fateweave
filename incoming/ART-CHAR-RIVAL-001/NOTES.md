# ART-CHAR-RIVAL-001 — rival commanders

Six original commander identities for the offline mercenary arena. Art handoff only; no runtime integration, combat units, balance, or lore canon added. Fighters continue to reuse existing class art. No character or company names are assigned.

## Deliverables

- `rivals_portraits.webp`: RGB lossless WebP, 1024×1536, two columns × three rows, six square 512×512 busts. Matches the shipped `portraits.webp` dimensions and grid.
- `rivals_portraits.json`: ID-keyed `{x,y,w,h,footY}` frames, following the existing mercenary handoff schema. `footY` is retained for schema compatibility; these are busts.
- `rival_crests.png`: RGBA 512×768 atlas, two columns × three rows, each cell 256×256. `rival_crests.json` maps its frames.
- `rival_*_crest.png`: six standalone 256×256 RGBA crests, padded and aspect-preserving. Alpha is preserved from generation; no background colour keying.
- `preview.png`: 390×640 text-free ladder layout study, six rows, 64px portraits and crests. Bars reserve name/stat space; they are not final UI or gameplay values.
- `sources/`: unmodified built-in imagegen outputs. `package_assets.py` crops, pads, resizes, exports and checks delivery dimensions. Run with the portrait source and crest source paths as its two arguments; requires Pillow.

## Identity and atlas order

| ID | Direction | Palette | Crest |
|---|---|---|---|
| rival_noble | Proud young captain; swept auburn hair, ivory cape, lifted chin | Burgundy / ivory | Silver leaf branch in open diamond |
| rival_veteran | Scarred veteran woman; gray undercut, weathered armour | Ochre / bronze | Broken spear over round shield |
| rival_showman | Cheerful twin-blade captain; violet curls, broad grin, paired hilts | Coral / violet | Crossed curved blades and jewel |
| rival_strategist | Cold strategist; angular black bob, single brass monocle | Ice cyan / navy | Eye lens in compass diamond |
| rival_smith | Compact broad smith; bald crown, copper beard, kind expression | Emerald / copper | Hammer in forge arch |
| rival_champion | Mysterious fully masked knight; gold-edged armour and mantle | Charcoal / gold | Closed visor within split halo |

Order is left-to-right, top-to-bottom in both atlases. Portraits retain full-cell painted backgrounds, as shipped portraits do. Crest palettes relate to the commander colour system while using custom rival symbols rather than reusing selectable player icons. Stature is suggested by the smith's compact broad proportions; a bust cannot establish absolute height.

## References and lore boundary

Read `public/assets/art/portraits.webp`, `portraits_mercs.webp`, `src/ui/commander-ui.ts`, and `docs/LORE_CHAPTER1_TH.md`. The lore was also checked on the refreshed base. Only this repository's shipped portraits were supplied as style references. Rivals are independent mercenary commanders, with no invented relationship to chapter antagonists or the player's special identity.

## Generation prompt set

Tool: built-in `image_gen`, no CLI/API fallback. Two asset calls: one portrait atlas with both shipped portrait sheets as style-only references, and one crest atlas with `transparent_background=true`.

Portrait brief: one 1024×1536 atlas, two columns by three rows, edge-to-edge square busts without gutters, borders or text. Match polished anime fantasy portraits: crisp fine linework, luminous layered hair, warm golden rim light, painted faceted metal, expressive faces and shoulders filling each square. Reading order: proud young noble captain with swept auburn hair, ivory cape/high collar, burgundy uniform, silver leaf clasp, chin lifted; scarred middle-aged veteran woman with short iron-gray undercut, healed cheek scar, bronze armour, ochre scarf; cheerful dark-skinned twin-blade showman with curly violet hair, bright grin, coral/purple costume and two shoulder hilts; cold adult strategist woman with angular black bob, single brass monocle and icy cyan uniform; broad compact smith captain with bald crown, kind round face, copper-red beard in one thick braid, emerald leather apron and hammer shoulder clasp; mysterious masked champion with fully hidden face, closed charcoal steel mask, narrow unlit slit, gold inlay and gold-edged black mantle. Individually coloured dark painted backgrounds. Original identities, no copied reference faces; no words, letters, logos, watermarks, UI, companions, extra faces or references to other games/projects.

Crest brief: one transparent 1024×1536 atlas, two columns by three rows; six isolated original heraldic emblems with clear margins. Polished painted anime metalwork, crisp silhouettes, restrained bevel highlights, readable at small size. Reading order: silver three-leaf branch inside burgundy open diamond; bronze broken spearhead over ochre round shield; two silver curved short blades around coral jewel with violet grips; brass eye lens within icy cyan compass diamond; copper hammer within emerald forge arch; gold closed visor inside charcoal shield and gold split halo. No text, lettering, runes, numbers, existing brand marks, watermarks or scenery; actual transparent alpha, no painted checkerboard.

## Verification

Visually inspected both generated source sheets, the exported portrait atlas, crest atlas and the final ladder preview. All six portrait identities and corresponding crest order are readable. Corrected uneven generated crest spacing by extracting whole emblems at inspected boundaries before fitting them into padded equal cells; preview has no adjacent-cell fragments. Script checks exact portrait/crest/preview dimensions and per-crest full alpha range (0–255). No application tests are needed for this isolated artwork handoff. Visual review by the owner remains part of PR review; this does not declare artistic approval.
