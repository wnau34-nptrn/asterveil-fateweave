# Luminous Veil

Asterveil · Fateweave / ART-UI-WORLD-001 / revision 2

A bright, painted frontier held inside quiet navy glass. The player should see the next tile, the party's condition and the cost of taking another step immediately. Original environment art, unchanged heroic chibi character art, thin champagne edges, restrained cyan light and warm campfire accents form one visual language.

## Revision 2 — full-screen exploration

The user's latest direction replaces the reserved HUD column with a full-bleed map. The map fills `100vw × 100dvh` beneath every HUD element. Zone, danger/info, party, objective, event and thumb controls are floating DOM layers within that map. Exploration has no sidebar, tabs, outer map frame or gameplay logo.

Use `ui/world_overlay.css` after the base skin. Its corner-control material is transparent navy (`--control-glass`, .24 alpha), white edge (`--control-edge`, .62 alpha), 8 px local blur and a restrained inner highlight. Information capsules use .80 navy glass and a .28 white edge for readable Thai; champagne is an accent for a meaningful objective/selection. No large ornamental frame wraps the controls. See `RESEARCH.md` for sources and `reference/DESIGN_R2.md` for the composition inventory.

The four arrows occupy the lower-left cross; their centre is empty. The former centre Rest action now occupies the **lower-right contextual talk/interaction button**. On camp it says `พัก` and glows cyan; away from a usable point it says `โต้ตอบ` and is disabled with a concise availability caption. The talk bubble is a visual affordance, not a new NPC/dialogue mechanic. The integration developer can use the same slot for existing context actions.

The objective capsule opens the original four-item checklist and statistics in a floating modal. The four hero summaries sit along the upper edge (second row on portrait). The event pill floats above phone thumb controls, and near the bottom centre on landscape/desktop. Keep the party and adjacent hints in the open central playfield.

## Colour and material

| Role | Hex / token | Use |
|---|---|---|
| Midnight / deep navy / navy | `#08121f` / `#0d1c2e` / `#14243a` | Page, glass and secondary surfaces |
| Glass | `rgba(8,18,31,.94)` | Reliable text contrast; optional blur only after device measurement |
| Champagne / highlight / muted gold | `#d9bf86` / `#f2d596` / `#8d7855` | 1 px trim, current turn, selected command; dark navy text on gold buttons |
| Veil cyan | `#74d4ef` | Walkable neighbours, allies, low danger, focus |
| Mint | `#68e5b6` | Ally HP, shelter, healing, completed objectives |
| Rift lilac / deep violet | `#b59aff` / `#9454d6` | Rift ground, enemies, enemy HP, boss reveal |
| Danger coral | `#ed927f` | High danger, critical HP, lethal warning, destructive confirmation |
| Text / supporting text | `#f4f7fc` / `#bbcadb` | All text over navy; avoid raw text directly over art |
| Meadow / thicket / scar / sanctum | `#7ec886` / `#6ab7a6` / `#b59aff` / `#f2d596` | Zone accents; supplement with texture and live zone name |
| Meter / HP track | `#24384b` | Bar backing; retain numerical values beside every meaningful gauge |
| Focus | `#a3edff` | 3 px outline, 3 px offset |

`tokens.css` is the canonical colour, spacing, radius, typography, blur and timing source. `ui/components.css` contains skin primitives; the integration developer connects them to authoritative game state. Dialogs/title/battle panels use a 1 px edge, a small corner ornament and `--panel-shadow`; revision 2 exploration capsules omit ornament images. Never stretch the corner PNG as a whole panel: use its 24 px nine-slice. Exploration applies 8 px blur only to five corner thumb controls and the info button. No tile or scrolling scene uses blur; information capsules rely on a stable navy backing. The navy backing supplies contrast on its own.

HP: ally gradient `#369f84 → #68e5b6`, enemy `#9454d6 → #dca8fa`, critical `#ce6a62 → #ed927f`. Hurt uses muted yellow-green; its HP number remains light. Tracks are 6 px high (4 px on the 320 px compact battle layout), radius 999 px. Barrier is a cyan hatched segment with a live `โล่ 14` label; cap the visual width at the track and retain the exact value. Numerical HP and labels carry meaning independently of colour.

## Typography

| Role | Exact family / weight | Phone | Large |
|---|---|---|---|
| Zone / battle name | Kanit 600 | 20 px; 16–18 px in compact battle | 22 px |
| Dialog / overlay heading | Kanit 600 | 20–22 px | 22–32 px |
| Hero name / control label | Kanit 600 | 14–16 px | 16–18 px |
| Numeric HP / SPD / skill metadata | Noto Sans Thai 400; key numbers Kanit 600 | 12 px / 16–20 px | 12–14 px / 20 px |
| Body / rules / message | Noto Sans Thai 400 | 14 px body, 12 px supporting text | 14–16 px body, 12 px supporting text |
| Strong body text | Noto Sans Thai 700 | 14 px | 14–16 px |
| Title logo only | Outlined Liberation Serif Regular | SVG scales | SVG scales |

Body line height 1.45; headings 1.2. Reserve room above/below Thai tone marks. No negative letter spacing on Thai. Numerals remain tabular if supported (`font-variant-numeric:tabular-nums`). Thai text stays live HTML. The logo uses Latin paths; it requires no installed font. Mockup screenshots naturally include the live UI text; these screenshots are reference evidence, never runtime backgrounds.

Fonts are free for commercial web use under SIL OFL 1.1. Exact source links and licence copies are in `NOTES.md` and `licenses/`. Self-host Thai subsets in the real app when practical; do not load all font families or reference TTFs just to reproduce the logo.

## Spacing, shapes and depth

Spacing scale: 4, 8, 12, 16, 20, 24, 32 px. Radii: 6 / 10 / 16 / 24 px, plus pill. Phone page inset 8–12 px; large page inset 12–24 px. Always add `env(safe-area-inset-*)` and use `100dvh`. Body and root do not scroll. Dialogs may scroll their own contents when translation or OS text scaling requires it.

Layers: floor 0 → grounded decor 2 → landmarks 3 → adjacent hint 4 → party token 5 → fog 6 → map vignette 7 → transient banner 10 → world HUD 20 / battle nonmodal popover 12 → modal scrim 40. Sort overhanging props by their ground Y; never let a decorative prop intercept a tile tap. Shadows attach to the ground, not the hero's face. The token frame includes its own base shadow. Crop the original Knight portrait into the transparent centre using CSS, then place the frame above it.

Soft shadows: `0 12px 36px rgba(0,5,15,.34)` for panels; `0 4px 12px rgba(0,5,15,.25)` for buttons. Inner light: `inset 0 1px 0 rgba(242,213,150,.08)`. Glow: cyan 18 px / .24 alpha, gold 18 px / .22, violet 20 px / .30, coral 16 px / .25. Limit glows to selected/interactable items. No per-tile blur or animated shadows.

## Responsive layout contract

| Viewport class | Exploration | Battle |
|---|---|---|
| 320×568 through 430×932 portrait | Full-bleed map, zone/danger at upper corners, four portrait-free hero capsules below, objective disclosure below them. 46 px ghost arrows at lower left; 76 px contextual interaction at lower right. 36 px tiles on narrow phones, 48 px above. | Existing regions and skin retained: header, four SPD slots, coach, arena, enemy HP, intent, 2×2 heroes, three commands. |
| 844×390 landscape | Full-bleed 44 px map. Slim hero row across upper centre, location/goal upper left, danger/info upper right. 46 px ghost arrows and 76 px action at opposite lower corners. | Existing short-landscape layout retained. |
| 768×1024 tablet / 1024×768 | Full map with 56 px tiles, floating party row on a second upper line where needed. Original checklist in objective disclosure. No reserved right column. | Six SPD slots where room permits; existing roster/commands retained. |
| 1366×768 / 1920×1080 | Full map with 64 px tiles, portrait hero capsules across top centre, zone/objective upper left, danger/info upper right. 60 px arrows lower left; 88 px action lower right. | Existing six-slot and arena/dock layout retained; this correction concerns exploration. |

HUD insets are `max(10–24px, env(safe-area-inset-*));` they do not shrink the map. The static reference renders only the visible tile patch plus two cells beyond each edge; it does not create a new gameplay map. No page scrolling. Floating dialogs can scroll internally when OS text scaling requires it.

The party camera centre is a visual concern; it must not change movement rules. Only four adjacent walkable tiles are interactive. At 36–40 px visual tile sizes, enlarge their transparent tap layer to 44 px, clipped to a circular hit region. Diagonal corner overlap is excluded by the circular clip. Keep these four targets centred and separate; the full D-pad provides an equivalent input method. No joystick, pathfinding or minimap.

Info and close buttons are 44 px. Primary/secondary buttons are at least 48 px. Every skill and field target is >=44 px. Field target circles are inviting cyan (ally) or lilac (enemy); gold identifies selection. A marker's pressed transform must preserve its positioning translation, so its hit area stays under the pointer.

The skill popover is a nonmodal floating surface over the roster/command dock, never over legal field targets. Opening it does not resize the arena. Close uses 44 px hit size; Escape dismisses it. At short heights, use the compact metadata layout. Rules/restart confirmations use focus trapping, focus restoration and a real modal dialog in integration.

## State language

Danger: shield + `ปลอดภัย` + 0% on a camp/sanctum; cyan below 15%; champagne 15–29%; coral at >=30%. Always show the literal chance for the **next** step. Visual fill uses `clamp(pct / 40, 0, 1)` for a useful scale; the number remains authoritative for values above 40%. Safe uses a full mint shelter strip; it is visually distinguished by shield and label, not interpreted as probability. Announce changes with a polite live region; pulse once when danger rises.

Hero: healthy mint; hurt muted yellow-green; critical coral below 25% plus slow opacity pulse; fallen desaturated portrait, `ล้มแล้ว`, empty HP. All states preserve names/numbers. On reduced motion, critical uses a static coral border and text. There is no heartbeat flashing.

Controls: normal navy glass; pressed 2 px depression for ordinary buttons; disabled .55 opacity for base controls / .78 for the world interaction with no glow; focus 3 px cyan outline. Rest is disabled away from camp. In revision 2, Rest uses the cyan available variant of the lower-right contextual action and `พัก`; the D-pad centre has no button. Restart has a coral outline; confirmation explicitly describes replacement of current progress, offers `ยืนยันเริ่มใหม่` and `เดินทางต่อ`.

Goals: outlined circle for undone, mint check for done. Keep all four specified objectives and the steps/win/loss line inside the objective disclosure, opened by the floating `ชนะผู้คุมรอยแยก · 2/4` capsule. Banners cover ordinary encounter, first battle, boss and completion. Completion keeps `สำเร็จการเดินทาง · ประตูรอยแยกปิดลงแล้ว`, statistics and `เริ่มการเดินทางใหม่`.

Battle: gold current turn/selected skill; cyan hero turn and legal allied targets; violet enemy turn/HP; interrupted queue slot keeps its original SPD and says `หยุด`. Skill availability always uses a ready/cooldown/wait label. Lethal intent adds the warning symbol plus `อาจล้ม`; both physical and energy tags remain live. Start, victory, defeat and tutorial-retry cards retain their specified actions. Title includes saved steps/wins, continue, restart/confirm and the no-storage line. With no save, suppress its summary and continue button; centre the existing new-expedition action.

## Motion and reduced motion

| Motion | Duration / behaviour | Reduced-motion fallback |
|---|---|---|
| One step / hop / four-frame dust | 160 ms; tiny 6 px lift and ±4% squash | Instant position update, no dust |
| Press | 90 ms, 2 px ordinary-button movement | Static pressed colour |
| Adjacent hint | 1800 ms slow opacity/scale | Static .65 opacity |
| Danger increase | 360 ms, single gentle pulse | Instant gauge update |
| Critical HP | 1400 ms opacity 1→.65→1 | Static coral bar/border |
| Grass | 3200 ms, ±1°; sparse decor only | Static |
| Water shimmer | 2400 ms opacity .65→.90 | Static |
| Rift pulse | 2200 ms, scale .96→1.03 | Static .65 opacity |
| Veil motes | 4200 ms, <=9 px drift | Hidden |
| Campfire | 480 ms, 4-frame strip | Frame 0 |
| Camp healing | 900 ms nonblocking sparkle | Instant HP update and mint success label |
| Encounter | 720 ms total; detailed envelope in `fx/README.md` | Instant reveal or <=100 ms crossfade, no shards/flash |
| Boss reveal | 540 ms, inside encounter envelope | Instant original Brute art + boss heading |
| Gate finale | 640 ms, open-art fade/scale | Instant art swap and completion dialog |
| Sheet / popover | 180 ms, 10 px entrance | Instant |

Effects decorate authoritative state; never compute probability, HP or cooldown from an animation. Encounter input presentation must finish by 720 ms and never exceed the 800 ms budget. The 900 ms healing effect does not block input. No flashing full-screen loop, video, shaking camera or animated backdrop filter. `tokens.css` disables animation and transition under reduced motion; integration may choose the documented 100 ms crossfade instead of instant.

## Do / don't

Use clean broad floor patterns, top-left light and bottom-centre prop anchors. Distinguish grass blades, thorn loops, angular rift cracks and broad sanctum slab seams as well as biome hues. Use camp tent, flag, arch and boss-ring silhouettes. Put fine ornaments in corners, leave centre space for Thai text and art.

Avoid thick metal borders, wood/parchment, pixel art, copied game signatures, currencies, AUTO controls and invented systems. Keep the original six character frames and ruins backdrop unchanged. Do not ship mockups or reference sprites as new runtime images, bake labels into floor/prop assets, wash the arena in a colour filter, animate many filters, or let visual polish alter movement/combat rules.
