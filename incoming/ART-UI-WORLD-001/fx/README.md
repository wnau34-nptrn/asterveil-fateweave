# Effects: CSS delivery option

The brief permits precise CSS specs instead of the four named raster FX strips. This package uses that option: `effects.css` plus `../tokens.css`. No `veil_shatter.webp`, `heal_sparkle.webp`, `encounter_flash.webp` or `rift_pulse.webp` needs to be loaded. Fire and dust are four-frame 128 px strips in `tiles/`.

Encounter timeline, total **720 ms**:

1. 0–120 ms: render the live encounter/boss/first-battle banner and enemy names immediately. Retain the existing map behind it.
2. 120–280 ms: one cyan flash, max opacity .45, duration 280 ms; appear/disappear once. Create eight simple triangular veil fragments on one overlay. No geometry cuts or filters on tile elements.
3. 280–560 ms: fragments move toward the viewport edges, opacity fades. Reveal the already-ready existing arena below. Never regenerate the arena image or character sprites.
4. 560–720 ms: finish the crossfade, remove overlay and banner, allow existing start/command state. The existing game decides when battle starts; animations supply no additional game rules.

For eight `i` children in `.lv-veil-shatter`, assign these custom property tuples `(left,top,x,y,angle)`:

`(8%,14%,-60px,-35px,-18deg)`, `(30%,10%,-25px,-55px,24deg)`, `(55%,12%,25px,-55px,-22deg)`, `(78%,18%,60px,-30px,30deg)`, `(10%,66%,-60px,40px,22deg)`, `(32%,70%,-25px,55px,-26deg)`, `(58%,68%,25px,55px,18deg)`, `(80%,60%,60px,40px,-28deg)`.

Use `--shard-left`, `--shard-top`, `--shard-x`, `--shard-y`, `--shard-angle`. Delay fragment animation by 120 ms and use a 600 ms duration to fit the envelope. Banner opacity fades with the overlay; keep all labels in DOM.

Boss variant: original Brute frame/portrait, briefly silhouetted by CSS brightness on that single reveal element (not the arena). Fade to its unmodified texture in 540 ms, inside the same 720 ms transition. Never render a new boss character. `mockups/encounter-transition.png` shows both sequences.

Camp heal: six `.lv-heal-sparkle` elements around the existing hero cards/token, X 20/35/50/65/80/50%, Y 55/40/65/45/55/30%, stagger 0/40/80/120/160/200 ms. Each uses 6 px mint/gold diamond geometry, 900 ms lifetime, <=18 px movement. Pointer events none; HP updates immediately. Remove elements on animation end.

Rift pulse: one transparent ellipse/rune layer per visible rift landmark, low-opacity lilac, 2200 ms breathing. No blur animation. Gate: swap closed/open landmark art, 640 ms fade, live completion card. Grass/water/motes are optional: <=8 moving props and <=6 motes in a phone viewport; keep hidden maps paused.

Fire strip: four 128×128 slots, 480 ms, stable bottom-centre anchor, `steps(4)`. CSS background size 400%; percentage positions 0%, 33.333%, 66.667%, 100%. The animation ends at 133.333% so each frame gets one quarter of a loop. Dust uses the same four slots over 160 ms and ends transparent; remove its element afterward.

Under reduced motion: no shards, flash, dust or moving particles; fire frame 0; static hints/rift; instant hop, dialog, boss/gate reveal; static critical border; mint healing label. A 100 ms crossfade can replace an instant scene change. Every effect is transform/opacity or a tiny stepped background; none blocks input except the existing encounter presentation, capped at 720 ms.
