# HUD kit integration

`panel_frame_9slice.png` is 128×128 RGBA. Use 24 px slices on every side; corner boxes are 24×24, centre rectangle is 80×80. Destination border widths 12–24 px preserve fine ornaments. The centre is transparent, so paint the glass in CSS. The PNG is an ornament layer, not a baked panel background. Stretch only edge strips, never corner boxes. Set `pointer-events:none` on this layer. Prefer `border-image` for uniform rectangular panels; rounded glass remains a separate element.

Buttons are pure CSS: no button raster is required. `components.css` defines primary, secondary, movement, focus, disabled and pressed skins. The reference supplies actual Thai label placement and restart confirmation. Use the accent rest variant only on camp.

`meter_danger.svg`: 160×12 viewBox, 160 px track, demonstration 50% fill. It is an editable specification, not a fixed probability image. For runtime, use DOM track/fill with CSS width from next-step percentage. Set the fill colour from the state class. `<img>` does not inherit parent `currentColor`; inline SVG or CSS DOM bars do. State thresholds: safe in camp/sanctum, low <15%, mid 15–29%, high >=30%. Number and shield/warning icon remain live. Safe visual fill is full mint shelter; its label is 0%.

HP track: 6 px high (4 px compact), navy `#24384b`, pill. Fill width = actual HP/max HP. Ally mint gradient, enemy violet, critical coral. Barrier overlay is a striped cyan segment with its exact live value alongside; cap its visual length. A fallen unit has no fill and says `ล้มแล้ว`. Portrait-free phone exploration cards show name, current/max HP and bar; desktop uses portrait + name and HP. Battle keeps class/lane and both skill statuses in its 2×2 cards.

The nine redrawn battle icons are `attack`, `guard`, `bash`, `mark`, `precision-strike`, `arcane-bolt`, `ward`, `heal`, `prayer`. All 29 icons have 24×24 viewBox, 1.8 px stroke, rounded caps/joins and currentColor. Inline the SVG when it needs to inherit the live state's colour. Decorative SVGs are aria-hidden; icon-only controls need the Thai accessible label. Do not rely on colour as the sole state cue.

For integration, retain the original DOM regions and canvas. The reference arena is a static art composition using original units/ruins solely to prove the skin; it does not replace Phaser or prescribe a new combat renderer. No runtime files, test suites or workflows were changed.


Revision 2 exploration: import `world_overlay.css` after the base skin. It defines floating information capsules, a transparent four-arrow cross with an empty centre, and the opposite-corner `talk` icon action. The checklist is a floating disclosure, not a sidebar. The `talk.svg` icon is an original 24 px currentColor bubble; production availability is driven by the existing camp/context state. Do not copy the reference's demonstration feedback handler into the game resolver.
