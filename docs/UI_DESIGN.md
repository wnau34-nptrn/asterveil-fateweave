# Modern battle HUD design spec

The supplied classic JRPG screenshots guide a portrait battle screen: arena above enemy HP, two-column hero cards below, and skills/targets at the bottom. The user's requested modernization retains that recognizable skeleton with restrained framing, larger readable type, clear class colors and touch-friendly controls.

## Design system and inventory

- Midnight background `#08121f`; navy panels `#122239`; champagne trim `#d9bf86`; white text `#eef4ff`; muted blue `#9eb1cb`.
- Mint HP `#68e5b6`; violet enemy HP; cyan Knight, crimson Duelist, lilac Mage and emerald Priest accents.
- 10px control/card radii, 14px main frame; thin borders, light inset HP highlights and a restrained selected gold rim. No perpetual particles or HUD animation.
- Georgia for the existing brand. Installed Thai system font stack for game labels; no remote font dependency. Mobile names 14–16px, actions 11px, captions 8–10px (compact readiness names 8.5px at 320px); desktop names/actions larger.
- Original consistent 24×24 SVG line icons for Attack, Guard, Bash, Mark, Precision Strike, Bolt, Ward, Heal, Prayer and Restart. Skill icons share class colors; disabled states retain readable reasons.
- Native DOM bands: brand/beat/restart → sticky turn phase → canvas + existing event timeline and lane labels → two enemy HP cards → frozen enemy intent → four hero cards → selected class/commands/targets → one help disclosure containing tactics/history. Desktop places team and commands beside each other; portrait phones use compact stacked bands within the visible viewport. Short landscape retains a compact arena and two-column dock; its timeline occupies the free space between hero and enemy columns, preserving hero faces.
- Four hero cards, exactly 2×2 at all sizes. Each has an illustrated portrait, class/lane, numeric HP and bar, optional barrier, and two real skill statuses. Selection is a gold outline plus text. Downed actors fade and cannot act.
- Three real owned commands for the selected class. Original English names accompany Thai labels and powers. Enemy/ally target buttons show the corresponding portrait and true HP.
- Valid target taps immediately cast the selected skill. Optional **วิธีใช้…** exposes skill rules; the announced intent remains visible. No predicted-outcome ledger or confirmation dialog covers the field.

## Assets and implementation boundaries

Image Gen produced a full phone concept and separate original six-frame portraits, six-frame transparent full-body units, and a static ruin-courtyard background. The approved user request is UI modernization; the generated concept is an implementation guide within existing mechanics, not authorization for additional game systems. Original reference screenshots remain outside the repository. Assets are format-encoded as WebP without resizing/cropping/retouching; both atlases stay 1024×1536, with six 512px square frames. CSS samples portrait frames and Phaser samples unit frames directly.

Concept source in the session: `/workspace/generated_images/exec-9b0e746e-73b4-4e17-9815-749accca238e.png`. This session-local file is not a runtime dependency. The published originals are `public/assets/art/{units,portraits,ruins}.webp`; generated artwork is not copied from Brave Frontier. No screenshot is used as interactive UI. Controls wait for Phaser asset readiness on first load. Pointer zones follow the unit image feet/height anchors and include the face; status labels render above sprite artwork to remain readable at narrow widths.

Intentional constraints relative to generated concept: Thai names, skills, HP, cooldowns and beat labels follow real encounter data. Knight/Duelist remain the front column and Mage/Priest the back column, matching actual formation mechanics. Generated concept's invented skill names, extra timeline slots, generic Battle 1/1 and dummy readiness dots are replaced by actual labels and available/unavailable states. Two-enemy HP bars supplement the frozen intent; they do not add a new encounter, Break/Ultimate/Overdrive, inventory, AUTO or currency. Original generated characters retain class identity without copying the reference game's cast. Existing mechanics and version-3 saves remain unchanged. On compact fields ally HP numbers move to the large roster cards so lower character artwork cannot cover labels; name and small HP bar remain on the field.

## Interaction contract

Selecting a card updates commands and canvas/timeline highlight. Selecting a hero or skill does not commit. Tapping a legal target commits one beat immediately, presents hero then enemy stages, and selects the next living hero when presentation finishes. Rotation preserves an uncast skill; native target buttons also support keyboard activation. Existing exact resolver and replay remain authoritative. Skill statuses derive from actor cooldowns and legal targets: healing at full HP is visibly unavailable, not presented as ready.

Browser validation uses existing Playwright production-subpath tests because Browser plugin is not available. Physical devices and Safari remain separate validation work.

## Fidelity review against concept and references

Compared the generated concept with final actual browser screenshots using `view_image`, including desktop, narrow phone, normal portrait and short landscape. The concept's 853×1844 raster represents a phone screen; 390×844 CSS pixels is its approximately 2.19× density equivalent. Using 853 CSS pixels would select a tablet layout, so functional/visual review uses real CSS phone widths rather than treating image pixels as CSS units.

| Comparison | Evidence and result |
|---|---|
| Structure | Arena → two enemy HP cards → frozen danger strip → 2×2 party → three commands and targets. Desktop/landscape adapt team and commands into adjacent bands. |
| Palette and framing | Midnight/navy, champagne selection trim, mint ally bars and violet enemy bars follow the concept; thinner frames implement the requested modern finish. |
| Typography | Thai names, HP and primary actions are code-native. Readiness copy was enlarged after screenshot review; full cooldown reasons wrap without clipping. |
| Portrait/field assets | Original generated six-cell atlases replace geometric placeholders. Faces have consistent crops; sprites share frame/feet anchors, and pointer zones include their visible heads. |
| Icons and states | One custom line-icon family modernizes the illustrated icon motifs. Active class tones, gold selection and muted unavailable actions remain consistent; readiness reflects targets/cooldowns. |
| Spacing and layering | Compact ally HP numbers live on large cards. Shield values have their own line. Enemy/status labels render above overlapping sprites; short-landscape timeline moves off the Mage's face. |
| Direct interaction | Selecting a hero/skill uses actual engine data; tapping a valid target casts immediately. Optional skill help explains rules without advancing a beat. Rotation, saves and automatic next-hero selection persist. |

Above-the-fold copy review: brand, four real names/classes, formation, true enemy/hero HP, actual skills/powers and current beat are retained. The prototype's skill aliases, dummy readiness dots and Battle 1/1 are replaced with authoritative content as declared above. Functional selection/help/readiness labels are part of the implementation inventory. No currencies, item counts, AUTO, Ultimate or reward claims were added. Portrait phones now reserve fixed space for all commands and targets while allowing the arena to use remaining viewport height. Optional information opens in a reading dialog. These are intentional adaptations to the actual game and responsive constraints, rather than unresolved rendering defects.

## Explicit sequential turns — 2026-10-13

Each beat presents a cyan hero stage followed by a pink enemy stage, one second each. The sticky Thai phase banner shows actor, action, recipient and the stage’s actual result. Active actor cards/timeline and field rings share the phase color; non-participants dim, and normal-motion actors make a short lunge with damage/restoration feedback. Reduced motion keeps static labels and highlights. Interrupted or defeated attackers show a gold canceled response with no enemy lunge/damage.

The authoritative resolver provides independent render-only snapshots after the hero and after the enemy, both retaining the original beat/intent. All visible HP/barrier values use the current snapshot; the next intent, final result card and automatic next hero appear only at completion. The log reveals hero events before enemy events. The final state commits/saves once before presentation; snapshots never enter replay. Skip/hidden-tab completion use that committed result; restart cancels both timers and effects. Controls remain locked until completion.

Outside the portrait-phone layout, casting from a scrolled dock anchors the non-sticky arena below the banner, so both the turn label and battlefield are visible on phones. Merely scrolling a sticky banner into view would leave the field above the viewport. Canvas pointer bounds refresh on touch/pointer start to preserve selection after this scroll. The skip button remains at least 44px tall. These are presentation changes within the existing one-hero/one-enemy beat, not a four-hero initiative round or a balance/content-version change.

## Direct casting — 2026-10-13

User feedback removed the recurring complete-outcome preview and confirmation sheet. Target buttons explicitly say to tap to cast the selected skill and have skill/recipient accessible names. The canvas uses the same legal-target path; hero cards always select the actor. Invalid targets, downed actors, unavailable skills and scene loading remain blocked. The two-second presentation lock rejects repeated input, and the selected next hero defaults to Attack when it finishes. Optional skill help stays in the dock, with enemy intent and forecasts available for planning. No combat math, scene artwork or content/save version changes.

## Portrait gameplay on one screen — 2026-10-13

A viewport-height flex layout uses `100dvh` with `100svh` fallback and safe-area padding. The portrait breakpoint is width ≤600px and portrait orientation. Header controls and phase strip are 44px high. The flexible field sits above a 38px intent band; compact 2×2 hero cards are 44px high, skill buttons 54px, and all targets 44px. Four ally targets fit one row. Names/HP/class/front-back remain on the roster; selected skill power/cooldown stays on commands. Field enemy HP replaces duplicate enemy cards. Main-page scrolling, sticky phase positioning and automatic casting/completion/restart scrolls are disabled in this mode.

Phaser places/resizes original sprites according to field height and refreshes input bounds. Compact hero names/HP are carried by cards; field enemy names/HP remain. Initial/result overlays use compact copy so their buttons are fully inside the field at 320px. ⓘ opens only optional skill/rule/forecast/history information, using a native dialog with close/Escape and its own reading scroll. Touches left over from closing the dialog cannot issue canvas commands; explicit DOM target taps remain immediate. Rotation moves the same help content back to its normal disclosure and closes an open dialog. No gameplay math, encounter/save version or art asset changes.
