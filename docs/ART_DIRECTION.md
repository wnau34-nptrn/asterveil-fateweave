# Art direction

Target: **Vibrant Heroic Chibi / Stylized Fantasy JRPG** in genuine 2D. Bright readable silhouettes, harmonious teal/blue/gold magic, and purple corruption. Avoid excessive brown and dull grading.

## Reference roles

Two images were supplied after the initial prototype on 2026-10-12 and directly inspected: the first is **C — Fateweave Battle**, the second is **B — World Exploration**. **A — Key Art** remains described by the handoff but has not been supplied. The reference files remain outside the repository.

- **A — Asterveil Key Art (not supplied):** the brief calls for fantasy identity, heroic chibi character proportions, vibrant palette, premium JRPG lighting and magical VFX. No direct visual observations are claimed for A.
- **B — World Exploration (inspected):** blue atmospheric floating islands, pale ancient stone portals/columns, greenery, narrow bridges, cascading waterfalls, luminous cyan crystals and localized purple corruption. The view shows square-tiled terraces with considerable free board space; perspective in the illustration guides 2D scenery depth, not a switch to a 3D runtime. Illustrated dotted routes do not override the approved free four-direction Open Board movement. Exploration remains future work.
- **C — Fateweave Battle (inspected):** a blue/gold shield-bearing hero in the foreground left, a red-cloaked sword user behind, a light-haired mage with a dark hat/staff, an imposing jagged purple enemy on the right and a smaller second enemy. A framed cyan crystal provides a clear interaction focal point. Crimson announced danger contrasts with blue defense and gold Redirect controls; navy glass-like HUD backing, gold trim and star/diamond motifs supply the interface language.

The image's levels, wave/turn labels, countdown, status icons, skill slots, currency, Foresight, Break and Fateweave meter are visual reference details, not approved mechanics. In particular, the image mentions Crystal weakening an enemy while this implemented prototype still absorbs an eligible energy hit and grants 8 party barrier. Preserve that transparent data-driven rule until a separate gameplay change is approved.

Concept images are **reference material, not production assets**. No screenshots are used as interactive backdrops; no invisible buttons mask a fake game. Do not commit supplied images into the public repository without explicit authorization.

## Implemented foundation

The tactical camera is locked and responsive. The Phaser arena draws original geometric floating platforms, pale portal ruins, distant bridges, static cyan waterfalls, foliage, purple rift shards and a decorative tiled terrace. The terrace is scenery, not an implemented movement grid or World Map. The background is rebuilt only on viewport changes, with no continuous scenery animation.

Hero roles use large-head/small-body placeholders and distinct equipment: a gold-edged cyan shield, a red-cloaked sword user and a light-haired mage with dark hat/lilac staff. The Brute has a larger jagged silhouette than Raider. The functional Crystal gains a gold pedestal/frame around its blue light. Dead actors fade; selected actors and targets use gold rings. Hero HP sits beside the silhouette to prevent the next hero covering it. The current intent source carries a purple diamond and a dashed threat line links source to target; label outlines preserve contrast over the brighter sky/ruins.

HTML controls and readable text sit below the playfield. The action buttons use restrained crimson Attack, blue Guard, lilac Mark and gold Redirect frames with a shared gold selection cue. Critical intent is above the arena. Expanded rules and logs are behind a disclosure. Mobile keeps heroes left and enemies right, compresses the arena spacing and stacks the command/preview areas. Touch controls do not depend on hover or dragging.

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
| Sky | `#315a7b` | Blue atmospheric backdrop |
| Ruin | `#557590` | Distant floating stone |
| Ruin light | `#b6cbd7` | Pale ancient portal/column trim |
| Ornament | `#bfa375` | HUD gold frame |

CSS variables live in `src/ui/styles.css`; numeric renderer tokens live in `src/game/visuals/palette.ts`. Pair tokens when changing visual direction. Georgia serif titles and system Trebuchet/Verdana control text avoid font downloads. VFX are brief damage labels and expanding rings; reduced-motion users receive immediate static state changes. There are no external art assets, perpetual particle loops or final-art production in this task.

Next visual work should follow human gameplay feedback and the remaining Key Art reference if supplied, then create a small approved asset set with clear licensing/provenance. These changes intentionally remain lightweight original placeholders rather than attempting to reproduce the concept paintings as final art.
