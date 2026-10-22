# ART-CHAR-BOSS-CH1-001 — chapter-1 boss concepts

Status: CONCEPTS ONLY, awaiting owner approval. No production frames, animation, atlas intake, gameplay changes or merge are included. Map numbers follow the chapter-1 lore draft; attack ideas below are visual suggestions, not approved mechanics.

## Review order and files

All eight transparent PNG concepts are 1024 × 1024, full body, front three-quarter facing LEFT. Each has a 32 px minimum packaging margin. Sheet and silhouette order, left to right: existing Knight reference, maps 4, 5, 6, 7, 8, 9, Vargoth armoured, Vargoth unleashed.

`concepts_sheet.png` is 2560 × 1440. Four aligned rows share this order: enlarged concept comparison; desktop battle scale (Knight 145 px frame, bosses 215 px); phone (100 / 120 px); compact (80 / 110 px). Rows share a sole baseline within each row. These are scale comparisons, not runtime screenshots or a proposed simultaneous encounter. No labels or UI are baked into art.

`silhouette_test.png` shows the same order as solid black alpha silhouettes in 96 × 96 px cells, on a light background. View at 100% for the intended readability check.

## Design and suggested attacks

| Map / file | Palette and silhouette | Suggested attack reading |
|---|---|---|
| 4 — ภูตธารา / `04_lake_spirit.png` | Moon white #EEF5F5, cyan #43C8DC, deep teal #15536D. Sorrowful visible face, open palm and droplet, curling water gown and swept hair. A spirit distorted by grief, not a willing general. | **Energy primary:** water lance, sorrow wave, reflected-memory mist. Soft fabric and fluid limbs avoid a melee-heavy reading. |
| 5 — ยักษ์ผลึก / `05_crystal_giant.png` | Ice blue #A7D7F6, indigo #303D86, pale gold #E8CD8C. Low massive fists, broad crystalline shoulders, frozen bundled threads visible through facets. Distinct from the existing purple crystal foe. | **Physical primary:** fist crush, ground stomp, shoulder ram. Frozen-thread seams suggest a secondary energy pulse, not constant spellcasting. |
| 6 — แม่มดบึง / `06_swamp_witch.png` | Moss jade #45634B, aubergine #4B294F, toxic yellow-green #C0D770, amber #BA8536. Reed hood, oversized potion flasks and distillation staff; a deliberate alchemist general. | **Energy primary:** thrown alchemical poison, memory mist, vapour bind. Flasks and staff make magical preparation clear. |
| 7 — ขุนพลเพลิง / `07_flame_general.png` | Soot iron #292A30, copper #A65F35, ember #F18134, dark red #792C30. Closed visor, broad plate shoulders, heavy cleaver and planted boots. | **Physical primary:** cleaver arc, shield-breaking shoulder rush, heated heavy strike. Ember seams communicate heat without disguising the weapon as a spell. |
| 8 — ผู้พิทักษ์นครโบราณ / `08_ancient_guardian.png` | Ivory #E6DFCD, aged bronze #92764C, cyan #69D3DE. Stepped stone shell, blunt fist and shield forearm, architectural shoulder yoke. An abandoned guardian still fulfilling its duty. | **Physical primary:** stone fist and forearm bash. **Energy secondary:** cyan core ward or defensive discharge. Keep their future tells distinct. |
| 9 — เงาแห่งชะตา / `09_fate_shadow.png` | Near-black navy #171C31, muted blue #384666, silver lilac #B9A4DD. Empty faceless hood, commander coat and split sash, trailing severed threads. No independent face or eye motif. | **Energy primary:** thread sever, mirrored command, copied team technique. A shadow of the commander rather than a new masked species. Commander likeness is provisional because no canonical full-body player design was supplied. |
| 10 — วาร์กอธ / `10_vargoth_armoured.png` | Black violet #2A203C, purple #7944AD, aged gold #BC965A, pale lavender #D6C3EB. Preserve existing story identity: confident smile, silver-lilac hair, pointed ears, crystal-tipped horns, polearm and layered armour. | **Physical primary:** sweeping polearm, armoured advance. His relaxed confidence follows the measured challenge in `story-ui.ts`. |
| 10 phase 2 — วาร์กอธ / `10_vargoth_unleashed.png` | Retains phase-1 face, hair, horn and cape identity; brighter violet #BB67F0 threads emerge through opened armour. Expanded energy claws replace the held polearm. | **Energy primary:** rift-thread rake, binding weave, concentrated rupture. Preserve deliberate control and charisma; the lore has him retreat alive. |

Hex values are direction targets, not indexed colour restrictions.

## Source and generation record

Read first: `docs/LORE_CHAPTER1_TH.md`, `docs/handoffs/ART-PLACEMENT-RULES.md`, `src/ui/story-ui.ts`. Own-project visual references: `public/assets/art/units_foes.webp` (including map-3 `foe_sentinel`), `public/assets/art/units.webp` (exact Knight crop in the review sheets), and `public/assets/story/vargoth_full.webp` for both Vargoth phases. No outside project/franchise references were used.

Generated with the built-in image generation tool, one distinct request per boss/phase. `PROMPTS.md` records the common prompt and subject clauses. Deterministic packaging resizes the returned art to the requested dimensions, builds the scale sheet from those same concepts, and derives black silhouettes from their alpha; it does not invent replacement artwork.

Production remains a separate task after owner selection, using ART-CHAR-MERC-ENEMY-001 format. That task must simplify details where needed at 80–100 px, establish exact frame maps and sole anchors, verify clean alpha edges, and supply applicable placement mocks. The current concepts are not approved runtime sprites.
