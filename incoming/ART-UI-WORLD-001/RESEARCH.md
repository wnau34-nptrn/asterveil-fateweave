# Exploration HUD research — revision 2

User direction: the map fills the screen, all HUD floats within it, transparent directional buttons sit at lower left, and a talk/interaction action sits at lower right. This replaces the original separate desktop HUD column.

## Reference sources

Reviewed on 14 October 2026. These are layout studies; no reference image, character, logo or copyrighted game texture is shipped in this package.

| Reference | Source | Useful principle for Asterveil |
|---|---|---|
| Guardian Tales | [Official exploration/gameplay gallery](https://www.guardiantales.com/?lang=en), [official exploration still](https://guardiantales.com/images/pc/img_explore1_200625.jpg) | The environment remains the main screen; edge controls support exploration without creating an application-style sidebar. |
| AFK Journey | [Official site](https://afkjourney.farlightgames.com/official/), [publisher screenshots on Steam](https://store.steampowered.com/app/4195600/AFK_Journey/), [publisher Google Play listing](https://play.google.com/store/apps/details?id=com.farlightgames.igame.gp) | A readable travelling party and visible world landmarks create direction and curiosity; a small objective prompt supports the scene. The full official landing page exceeded the browser reader size limit, so the publisher listing and screenshot search supplied the supplementary context. |
| Genshin Impact mobile | [Controls screenshot, Interface In Game](https://interfaceingame.com/screenshots/genshin-impact-mobile-controls/), [official Google Play listing](https://play.google.com/store/apps/details?id=com.miHoYo.GenshinImpact) | Thumb controls occupy opposite lower corners; status/navigation live near the upper edges, leaving the centre open. Its movement and combat model is different, so only ergonomic placement is relevant. |

The rightmost column is a design interpretation, not a claim that these games share Asterveil's mechanics. No popularity ranking or unsupported download figure is asserted. Guardian Tales' pixel treatment, AFK Journey's idle systems and Genshin's joystick/action mechanics are not part of this design.

## Applied visual direction

1. Map extends beneath every HUD component and reaches all four viewport edges. There is no map-frame border or reserved right-hand column.
2. Reduce persistent opaque area: compact zone/danger capsules, a slim four-hero row, one objective disclosure, a small event pill.
3. Glass controls use delicate white edges and champagne/cyan only for meaningful selection, danger or interaction. Remove large gold-framed UI blocks from exploration.
4. Four separate arrows form the lower-left cross. The centre is empty and is not a joystick; a tap still means one adjacent tile.
5. Lower-right interaction is contextual. The shipped game can use this slot for its existing camp/rest action. The talk bubble establishes a visual slot for conversation; it does not add NPCs, dialogue rules, combat actions or a new save system.
6. All required goal checklist items and expedition statistics remain available in a floating disclosure/modal. They no longer need a persistent side panel.
7. Full Thai labels remain HTML, original portraits remain byte-for-byte unchanged, and every active control retains at least a 44 px hit area.

## Concept-to-reference validation

The new portrait and desktop concepts are retained in `mockups/concept-fullscreen-*`. The final references use the actual accepted tile, prop and portrait assets rather than treating the concept raster as a working game screen. Concept Latin text is replaced by live Thai labels from the brief.

The fidelity ledger and browser measurements are saved in `reference/`; layout, map coverage, control corners, material, information hierarchy, typography and interaction states are checked before packaging. Actual game integration remains outside this art-only task.
