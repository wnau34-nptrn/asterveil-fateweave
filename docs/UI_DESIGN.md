# Modern battle HUD design spec

Dated sections record earlier presentation work; the final owned-turn section defines the current rules and save behavior.

The supplied classic JRPG screenshots guide a portrait battle screen: arena above enemy HP, two-column hero cards below, and skills/targets at the bottom. The user's requested modernization retains that recognizable skeleton with restrained framing, larger readable type, clear class colors and touch-friendly controls.

## Design system and inventory

- Midnight background `#08121f`; navy panels `#122239`; champagne trim `#d9bf86`; white text `#eef4ff`; muted blue `#9eb1cb`.
- Mint HP `#68e5b6`; violet enemy HP; cyan Knight, crimson Duelist, lilac Mage and emerald Priest accents.
- 10px control/card radii, 14px main frame; thin borders, light inset HP highlights and a restrained selected gold rim. No perpetual particles or HUD animation.
- Installed Thai system font stack for game labels; no remote font dependency. Mobile names 14–16px, actions 11px, captions 8–10px (compact readiness names 8.5px at 320px); desktop names/actions larger.
- Original consistent 24×24 SVG line icons for Attack, Guard, Bash, Mark, Precision Strike, Bolt, Ward, Heal, Prayer and Restart. Skill icons share class colors; disabled states retain readable reasons.
- Native DOM bands: encounter/beat/info/restart → turn phase → canvas + existing event timeline and lane labels → two enemy HP cards → frozen enemy intent → four hero cards → selected class/commands/targets → one help disclosure containing tactics/history. Desktop and short landscape place the battlefield beside the team/command panel. Portrait tablets use a flexible arena above adjacent team/command sections; portrait phones retain compact stacked bands. All gameplay layouts fit the viewport; optional help lives in the ⓘ dialog.
- Four hero cards, exactly 2×2 at all sizes. Each has an illustrated portrait, class/lane, numeric HP and bar, optional barrier, and two real skill statuses. The owner is a gold outline plus text; other actors cannot be selected. Downed actors fade and cannot act.
- Three real owned commands for the selected class. Original English names accompany Thai labels and powers. Enemy/ally target controls sit directly over their battlefield characters with subtle outlines and a skill marker; accessible labels include true HP.
- Valid target taps immediately cast the selected skill. Optional **วิธีใช้…** exposes skill rules; the announced intent remains visible. No predicted-outcome ledger or confirmation dialog covers the field.

## Assets and implementation boundaries

Image Gen produced a full phone concept and separate original six-frame portraits, six-frame transparent full-body units, and a static ruin-courtyard background. The approved user request is UI modernization; the generated concept is an implementation guide within existing mechanics, not authorization for additional game systems. Original reference screenshots remain outside the repository. Assets are format-encoded as WebP without resizing/cropping/retouching; both atlases stay 1024×1536, with six 512px square frames. CSS samples portrait frames and Phaser samples unit frames directly.

Concept source in the session: `/workspace/generated_images/exec-9b0e746e-73b4-4e17-9815-749accca238e.png`. This session-local file is not a runtime dependency. The published originals are `public/assets/art/{units,portraits,ruins}.webp`; generated artwork is not copied from Brave Frontier. No screenshot is used as interactive UI. Controls wait for Phaser asset readiness on first load. Pointer zones follow the unit image feet/height anchors and include the face; status labels render above sprite artwork to remain readable at narrow widths.

Intentional constraints relative to generated concept: Thai names, skills, HP, cooldowns and beat labels follow real encounter data. Knight/Duelist remain the front column and Mage/Priest the back column, matching actual formation mechanics. Generated concept's invented skill names, extra timeline slots, generic Battle 1/1 and dummy readiness dots are replaced by actual labels and available/unavailable states. Two-enemy HP bars supplement the frozen intent; they do not add a new encounter, Break/Ultimate/Overdrive, inventory, AUTO or currency. Original generated characters retain class identity without copying the reference game's cast. Original artwork remains unchanged; current turn/save rules are described in the owned-turn section below. On compact fields ally HP numbers move to the large roster cards so lower character artwork cannot cover labels; name and small HP bar remain on the field.

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

Above-the-fold copy review: brand, four real names/classes, formation, true enemy/hero HP, actual skills/powers and current beat are retained. The prototype's skill aliases, dummy readiness dots and Battle 1/1 are replaced with authoritative content as declared above. Functional selection/help/readiness labels are part of the implementation inventory. No currencies, item counts, AUTO, Ultimate or reward claims were added. Portrait phones now reserve fixed space for commands plus targets on their field characters while allowing the arena to use remaining viewport height. Optional information opens in a reading dialog. These are intentional adaptations to the actual game and responsive constraints, rather than unresolved rendering defects.

## Explicit sequential turns — 2026-10-13

Each beat presents a cyan hero stage followed by a pink enemy stage, one second each. The sticky Thai phase banner shows actor, action, recipient and the stage’s actual result. Active actor cards/timeline and field rings share the phase color; non-participants dim, and normal-motion actors make a short lunge with damage/restoration feedback. Reduced motion keeps static labels and highlights. Interrupted or defeated attackers show a gold canceled response with no enemy lunge/damage.

The authoritative resolver provides independent render-only snapshots after the hero and after the enemy, both retaining the original beat/intent. All visible HP/barrier values use the current snapshot; the next intent, final result card and automatic next hero appear only at completion. The log reveals hero events before enemy events. The final state commits/saves once before presentation; snapshots never enter replay. Skip/hidden-tab completion use that committed result; restart cancels both timers and effects. Controls remain locked until completion.

All layouts now remain stationary during casts; the field and turn label fit together in the viewport. Canvas pointer bounds refresh on touch/pointer start to preserve selection after layout changes. The skip button remains at least 44px tall. These are presentation changes within the existing one-hero/one-enemy beat, not a four-hero initiative round or a balance/content-version change.

## Direct casting — 2026-10-13

User feedback removed the recurring complete-outcome preview and confirmation sheet. Field targets have skill/recipient/HP accessible names and markers, while the command hint says to tap the character in the field. The canvas uses the same legal-target path; hero cards always show the current owner. Invalid targets, downed actors, unavailable skills and scene loading remain blocked. The two-second presentation lock rejects repeated input, and the selected next hero defaults to Attack when it finishes. Optional skill help stays in the dock, with enemy intent and forecasts available for planning. No combat math, scene artwork or content/save version changes.

## Portrait gameplay on one screen — 2026-10-13

A viewport-height flex layout uses `100dvh` with `100svh` fallback and safe-area padding. The portrait breakpoint is width ≤600px and portrait orientation. Header controls and phase strip are 44px high. The flexible field sits above a 38px intent band; compact 2×2 hero cards are 44px high, skill buttons 54px, and field target areas are at least 44×44px. The old target row is removed, leaving more height for the arena. Names/HP/class/front-back remain on the roster; selected skill power/cooldown stays on commands. Field enemy HP replaces duplicate enemy cards. Main-page scrolling, sticky phase positioning and automatic casting/completion/restart scrolls are disabled in this mode.

Phaser places/resizes original sprites according to field height and refreshes input bounds. Compact hero names/HP are carried by cards; field enemy names/HP remain. Initial/result overlays use compact copy so their buttons are fully inside the field at 320px. ⓘ opens only optional skill/rule/forecast/history information, using a native dialog with close/Escape and its own reading scroll. Touches left over from closing the dialog cannot issue canvas commands; explicit DOM target taps remain immediate. The same help content stays in the optional dialog at every orientation. No gameplay math, encounter/save version or art asset changes.

The game wordmark is removed from the gameplay header. Portrait phones show the beat at the left and info/restart at the right; all buttons retain their 44px hit areas.

## Field character targets — 2026-10-13

Phaser supplies a six-actor rectangle map from its actual rendered positions/sizes. A transparent DOM target layer in the arena uses those bounds, refreshed after every paint/resize. Legal targets carry a restrained cyan outline and a circular selected-skill marker; unavailable/busy targets are disabled and unmarked. Native buttons preserve keyboard/focus and accessible actor/skill/HP labels. Hero cards still select the acting class. Enemy skills target enemies; support skills target marked allies; Prayer marks living allies and maps every valid tap to the existing party target. Target feedback stays on the characters, and no separate target-card row occupies the dock.

## Grounded, staggered formation — 2026-10-13

The camera frames the ruin courtyard horizon at 27% of the field, leaving floor beneath all six actors. Positions refer to soles rather than image centers: Mage/Knight and Priest/Duelist form two diagonal pairs, and the second pair shifts sideways again. Enemies occupy separate diagonal positions. Original atlas frames remain unchanged; enemy foot origins exclude transparent bottom padding. Contact shadows and selected/active rings share those sole anchors, replacing detached platform ellipses.

Bodies sort by foot depth, while status labels stay above the artwork. Sprite sizes are constrained by both field height and width so portrait controls and rear faces remain accessible at 320px. Native field targets use the resized body anchors; the 44px minimum hit area, single-screen portrait layout, front/back mechanics and save format are unchanged.

Outside phone portrait mode, the timeline occupies the free upper center and lane labels align above the staggered hero columns, keeping them off the rear actor artwork.

## Optional three-turn teaching — 2026-10-13

A compact strip between the phase banner and field appears during the first three turns of an active battle. It teaches announced targets and Knight Guard (or boss Bash), Duelist Mark without immediate damage, then a legal Mage Bolt/Ward while saving the Mark for the next Duelist turn. It reads legal targets, marks and cooldowns from real battle state and never suggests using a different actor.

A static dashed gold outline follows the current owner’s suggested skill or field target; the first lesson also outlines current enemy intent. Owned skill/target alternatives remain available; the next living hero is enforced. During presentation the strip shows the actual hero/enemy stage event instead of another command. It disappears at beat 4 and after outcomes. × dismisses it; optional help includes a toggle for beats 1–3. The independent `asterveil.fateweave.tutorial.v1` preference persists dismissal and tolerates unavailable storage. Replay determines the current lesson, with no tutorial commands, forced confirmation or save-version migration.

Portrait teaching uses a 48px strip with 11px heading, 10px copy and a 44px dismiss button. The adaptive field reserves room for it without main-page scrolling. Enemy label foot margins include the complete HP text on the smallest teaching field. Closing the strip filters residual canvas touch as the field moves upward. The optional help toggle retains keyboard focus inside its dialog.

The phase banner and teaching strip reserve their own viewport space at all sizes. Lessons and stage feedback remain visible throughout combat without automatic scrolling.


## Single-screen desktop, tablet and landscape gameplay

The viewport-height shell and safe-area padding now apply to every gameplay layout, using `100dvh` with `100svh` fallback. The phase and teaching strips reserve fixed space; the remaining field flexes rather than imposing a minimum canvas height. Desktop content uses available width up to 1600px: field/enemy intent on the left, team/owned commands on the right. Portrait tablets use adjacent team/command sections below the field. Short landscape compresses the roster to 44px cards and skills to 54px controls, keeping optional detail in ⓘ. Portrait-phone controls remain unchanged.

Optional rules, selected-skill explanations, forecasts, tutorial settings and history stay inside the same native dialog on every screen. Its reading area may scroll; the gameplay document cannot scroll. Casting, completing a turn and restarting no longer call page scrolling APIs. Formation, combat timing, authoritative rules, saves and original assets are unchanged.


## Three-battle practice selector

A 44px header button shows the selected battle number and opens a native selection dialog. Its three Thai choices explain each threat and show saved resume/outcome status. It consumes no additional gameplay row; all prior viewport layouts still fit one screen. The selector is disabled during turn presentation. Closing or selecting filters residual canvas touches; optional dialogs make background combat inert. Keyboard Escape returns focus to the selector.

Independent battle definitions update the scene's enemies, HP, labels, timeline and valid targets; the solo boss leaves no stale Raider actor/control. Its enemy HP card spans the available width. Generated art and grounded staggered formation are reused. Opening coaching suggests Knight Guard against rear-reaching energy and Bash against the boss's physical hit, using actual targets and powers. Existing class selection, owned skills and direct character targeting remain unchanged.


## Owned turns and floating skill explanations

Only the current hero's card/three owned skills are actionable. Other hero cards remain readable but disabled and dim; field clicks cannot change the actor. The owner starts with Knight and rotates through Duelist/Mage/Priest, skipping fallen heroes. Support markers still target allies regardless of whether their command card is disabled.

Clicking a skill selects it and opens a nonmodal floating panel with Thai ability rules, power, cooldown and actual availability. It stays above the dock on wide screens and below the header on portrait phones, clamped to the viewport. It does not resize the arena or add document scrolling. ×/Escape returns focus to the selected skill; a legal field target can cast without confirmation and closes the explanation. Popup touches cannot leak into delayed canvas input. Cooling skills remain inspectable, with disabled targets and enforced resolver validation. Both skill buttons and the floating close control expose accessible labels/44px hit sizes.
