# Art direction

Target: **Vibrant Heroic Chibi / Stylized Fantasy JRPG** in genuine 2D. Bright readable silhouettes, harmonious teal/blue/gold magic, and purple corruption. Avoid excessive brown and dull grading.

## Reference roles

Two images were supplied after the initial prototype on 2026-10-12 and directly inspected: the first is **C — Fateweave Battle**, the second is **B — World Exploration**. **A — Key Art** remains described by the handoff but has not been supplied. The reference files remain outside the repository.

- **A — Asterveil Key Art (not supplied):** the brief calls for fantasy identity, heroic chibi character proportions, vibrant palette, premium JRPG lighting and magical VFX. No direct visual observations are claimed for A.
- **B — World Exploration (inspected):** blue atmospheric floating islands, pale ancient stone portals/columns, greenery, narrow bridges, cascading waterfalls, luminous cyan crystals and localized purple corruption. The view shows square-tiled terraces with considerable free board space; perspective in the illustration guides 2D scenery depth, not a switch to a 3D runtime. Illustrated dotted routes do not override the approved free four-direction Open Board movement. Exploration remains future work.
- **C — Fateweave Battle (inspected):** a blue/gold shield-bearing hero in the foreground left, a red-cloaked sword user behind, a light-haired mage with a dark hat/staff, an imposing jagged purple enemy on the right and a smaller second enemy. A framed cyan crystal provides a clear interaction focal point. Crimson announced danger contrasts with blue defense and gold Redirect controls; navy glass-like HUD backing, gold trim and star/diamond motifs supply the interface language.

The image's levels, wave/turn labels, countdown, status icons, skill slots, currency, Foresight, Break and Fateweave meter are visual reference details, not approved mechanics. The reference Crystal is a historical illustration detail; the user subsequently requested removing that gameplay system. It is absent from the current playable field.

Concept images are **reference material, not production assets**. No screenshots are used as interactive backdrops; no invisible buttons mask a fake game. Do not commit supplied images into the public repository without explicit authorization.

## Implemented foundation

The tactical camera is locked and responsive. The Phaser arena draws original geometric floating platforms, pale portal ruins, distant bridges, static cyan waterfalls, foliage, purple rift shards and a decorative tiled terrace. The terrace is scenery, not an implemented movement grid or World Map. The background is rebuilt only on viewport changes, with no continuous scenery animation.

Hero roles use large-head/small-body placeholders and distinct equipment: a gold-edged cyan shield, a red-cloaked sword user, a light-haired mage with dark hat/lilac staff, and a green-robed priest with a cross-topped staff. The Brute has a larger jagged silhouette than Raider. Dead actors fade; selected actors and targets use gold rings. Hero HP sits beside the silhouette to prevent the next hero covering it. The current intent source carries a purple diamond and a dashed threat line links source to target; label outlines preserve contrast over the brighter sky/ruins.

The supplied combat-layout reference on 2026-10-13 guides a full-width battle stage, upper event timeline, two hero lanes, enemy space on the right and a dark lower command dock with gold/silver trim. Aegis/Lyra occupy Front and Eira/Seren occupy Back. Physical attacks screen through living front members; energy can reach the back. Each lane contains two actors with separate HP labels. The dock displays a large selected-hero portrait with real HP/attack/barrier, the hero's basic attack, two class skills and targets, and a four-member portrait roster. The Brute gains a larger silhouette. Perspective courtyard tiles, side masonry and banners frame the original ruin scene; actors stand on light rings instead of individual floating platforms.

The timeline's first slot is the selected hero, followed by the frozen enemy intent and two projected enemy intents. Future plans continue to assume the current actors survive. Original hand-authored SVG portraits distinguish the four heroes and two enemies, and are served under Vite's configured base. All six live in `public/assets/portraits/`; the supplied screenshot remains reference material outside the repository.

Desktop keeps the field above a three-part dock. Portrait phones stack selected-hero/roster information above commands; landscape phones retain the three parts. Lanes are labeled where screen space allows. Compact actor/HP positions separate both hero lanes and enemy labels. Portrait phones use a 2×2 roster. A native preview dialog is shared by desktop and mobile, preserving the proposed command during rotation and keeping confirmation visible beside independently scrolling results. Help, projected-threat details and history are disclosures below the dock. Touch controls do not depend on hover or dragging.

| Token | Hex | Purpose |
|---|---|---|
| Night | `#101c36` | Canvas/contrast backing |
| Panel | `#172642` | HUD surfaces |
| Gold | `#ffcc72` | Selection and confirmation |
| Cyan | `#61dbea` | Barrier and energy |
| Corruption | `#b59aff` | Mage and enemy energy |
| Mist | `#8cbbd8` | Distant ruins/atmosphere |
| Stone | `#30496c` | Floating platform geometry |
| Grass | `#4ba8a3` | Bright platform surfaces |
| Sky | `#315a7b` | Blue atmospheric backdrop |
| Ruin | `#557590` | Distant floating stone |
| Ruin light | `#b6cbd7` | Pale ancient portal/column trim |
| Ornament | `#bfa375` | HUD gold frame |

CSS variables live in `src/ui/styles.css`; numeric renderer tokens live in `src/game/visuals/palette.ts`. Pair tokens when changing visual direction. The English brand uses Georgia; Thai UI and canvas labels use Noto Sans Thai, Leelawadee UI and Tahoma fallbacks already present on the device, with no font downloads. Thai headings avoid tracking and uppercase styles. VFX are brief damage labels and expanding rings; reduced-motion users receive immediate static state changes. There are no external art assets, perpetual particle loops or final-art production in this task.

Next visual work should follow human gameplay feedback and the remaining Key Art reference if supplied, then create a small approved asset set with clear licensing/provenance. These changes intentionally remain lightweight original placeholders rather than attempting to reproduce the concept paintings as final art.

## Responsive field and input

Portrait fields reserve the bottom for the current enemy-intent panel; wide/landscape fields place it at the upper right. The timeline sits at the upper left. Scene coordinates derive from available field height, maintaining the two hero lanes and enough separation for HP labels. Compact actor zones stay 78×64px; DOM target controls provide an additional explicit selection path. Foreground/body graphics change scale independently of readable labels. Current Mark indicators reflect engine state.

The page allows zoom, uses manipulation touch behavior on controls and includes safe-area padding. The native dialog uses dynamic viewport height, modal focus and a locked background; long results cannot push confirmation off-screen. Portraits and scene graphics remain original prototype art, rather than a reproduction of the reference illustration. Physical devices and Safari still require validation.
