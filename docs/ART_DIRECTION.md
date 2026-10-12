# Art direction

Target: **Vibrant Heroic Chibi / Stylized Fantasy JRPG** in genuine 2D. Bright readable silhouettes, harmonious teal/blue/gold magic, and purple corruption. Avoid excessive brown and dull grading.

## Reference roles

The handoff describes three concept references. The image files were not attached when this prototype was implemented, so the notes below record their intended roles from the brief, not a claim of direct image inspection.

- **A — Asterveil Key Art:** fantasy identity, heroic chibi character proportions, vibrant palette, premium JRPG lighting and magical VFX.
- **B — World Exploration:** large square-tile 2D Open Board, free exploration, floating ruins, bridges, waterfalls and crystals. Apparent illustration depth must not change the game into 3D. Exploration is future work.
- **C — Fateweave Battle:** three left-side heroes, right-side enemies, visible intents, functional Attack/Guard/Redirect controls and clear environmental interactions. Decorative reference icons do not imply new mechanics.

Concept images are **reference material, not production assets**. No screenshots are used as interactive backdrops; no invisible buttons mask a fake game. Do not commit supplied images into the public repository without explicit authorization.

## Implemented foundation

The tactical camera is locked and responsive. The Phaser arena draws original geometric floating platforms, distant silhouettes, grass and a crystal. Hero roles use distinct large-head/small-body shapes and equipment: cyan shield, gold blade and lilac staff. Enemies use bright pink/lilac corruption silhouettes. Dead actors fade; selected actors and targets use gold rings. The current intent source carries a purple diamond and a dashed threat line links source to target.

HTML controls and readable text sit below the playfield. Critical intent is above it. Expanded rules and logs are behind a disclosure. Mobile keeps heroes left and enemies right, compresses the arena spacing and stacks the command/preview areas. Touch controls do not depend on hover or dragging.

| Token | Hex | Purpose |
|---|---|---|
| Night | `#101c36` | Canvas/contrast backing |
| Panel | `#172642` | HUD surfaces |
| Gold | `#ffcc72` | Selection and confirmation |
| Cyan | `#61dbea` | Crystal, barrier and energy |
| Corruption | `#b59aff` | Weaver and enemy energy |
| Mist | `#8cbbd8` | Distant ruins/atmosphere |
| Stone | `#30496c` | Floating platform geometry |
| Grass | `#4ba8a3` | Bright platform surfaces |

CSS variables live in `src/ui/styles.css`; numeric renderer tokens live in `src/game/visuals/palette.ts`. Pair tokens when changing visual direction. Georgia serif titles and system Trebuchet/Verdana control text avoid font downloads. VFX are brief damage labels and expanding rings; reduced-motion users receive immediate static state changes. There are no external art assets, perpetual particle loops or final-art production in this task.

Next visual work should follow supplied-image inspection and human gameplay feedback, then create a small approved asset set with clear licensing/provenance.
