# Modern battle HUD design spec

## Shared characters and equipment — 2026-10-20

MAP and main-camp characters use one native portrait sheet with Overview / Equipment / Skills / Talents. Inventory and team remain entry/management surfaces; equipment inspection, individual swaps, set thresholds, stat/Active explanations and passive spending live in the shared sheet. Main camp exposes the entire company; expedition exposes the brought team. Trainer opens Talents and retains free camp-only reset. Closing restores the original surface and focus.

Show a set filter directly above inventory; fold slot/rarity/source/compatible/sort controls into additional filters. Auto-equipment is an optional disclosure with a goal and preferred set, then a full before/after preview and explicit confirmation. Clearly describe recommendations as estimates and retain conditional skill/effect details. Recommend from worn + bag only, never strip teammates. Keep 44px controls, bounded internal scrolling, comparison footer access, portrait rotation guards and preserved unconfirmed trials. Main-camp bottom navigation adds Bag alongside existing services.


## Current: portrait game with PC input — 2026-10-19

Owner-approved direction: one mobile portrait layout, playable with mouse/keyboard on PC. This section supersedes historical desktop/landscape layout notes below; battle rules and saves are unchanged.

- The game frame is at most 480px wide and centred on PC. Every view adapts to the frame via named size-container queries; no CSS scaling of the whole game. Phone landscape requests rotation, and undersized desktop windows request more room.
- Battle: slim circular six-actor queue, arena with direct targets, compact announced enemy intent, four readable HP summaries and a centred command dock. Waiting allies' health stays readable. Queue buttons expose actor/SPD/HP details without permanent numeric labels.
- Commands: Attack is initially selected. Choose a skill, then click/tap a legal target. The dock appears ready on each real hero turn; keys or inspection do not spend the turn. Optional ⓘ opens the full skill description. Escape cancels targeting, requiring another explicit selection before any field click can cast.
- PC: WASD/arrows walk; 1–4 select displayed action slots, including the fourth unlocked skill; click chooses its enemy/ally target; B opens the map bag; I opens world/battle info. Repeats, modifiers, IME/editing and input during rotation guidance or presentation cannot queue skills or issue commands behind a modal. A keyboard guide appears beside the desktop frame.
- Native dialogs stay centred over the game frame, with internal reading scroll. Popovers clamp to the same frame. Mobile keyboard editing is not treated as an instruction to rotate.
- Preserve ≥44px controls, optional descriptions, focus restoration, reduced motion and the existing touch-close guard. No art or dependency changes.

Dated sections below record historical presentation work and must not reintroduce a wide/landscape game layout.

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


## SPD-round queue — 2026-10-14

The old arena-only timeline is replaced by a persistent combined actor queue inside the existing phase band. Six slots appear on larger screens, four on compact phones/short-height layouts. Each uses original portrait art, real actor name, SPD and now/next/next-round copy, with cyan hero and pink enemy borders. Only the actual current slot has an active frame; the queue removes fallen actors and re-sorts at round boundaries. It remains visible in portrait mode and does not add document scrolling. The phase head explains SPD and shows the real acting actor/skill or canceled enemy turn.

Enemies execute only on their own queue slots. Consecutive heroes have one-stage casts; following enemy turns are presented individually. HP, barriers and log reveal only the current actor frame. The next hero's commands become available after the actual sequence finishes or is skipped. Forecasts explain that future targets can change with surviving actors. ⓘ includes both heroes' and enemies' real SPD values and deterministic tie rules.

The short portrait field reserves ≥46px vertical spacing between same-column ally sole anchors while preserving staggered front/back offsets. Targets retain their 44px minimum, independent hit regions and floor contact. Existing floating explanations preserve the arena's size and use the same keyboard/touch guards. Advice follows the first three hero commands under SPD, retaining the original lesson throughout playback to avoid changing field height between its actor stages. Original artwork is unchanged.

Interrupted enemy slots use a dashed border and “หยุด” label before their canceled turn. Short non-phone fields keep an 8px rear/front floor offset, and show exact hero HP in roster cards rather than colliding canvas number labels. Enemy HP and hero names/bars remain on the field.


## Expedition views (latest, authoritative)

The practice selector and restart button described above are removed. The app has three views: title (Continue / New expedition), world and battle.
- **World:** a 44–52px bar with zone, encounter-chance chip and ⓘ. A map viewport with a camera that follows the party. The four HP cards, a goal checklist on large screens, the last message, and a 3×3 D-pad whose centre is the camp **พัก** button.
- **Battle:** the existing single-screen HUD with the battle kind/name header and ⓘ only. The result card's button returns to the map, retreats to camp, or retries the teaching battle.

Both views fit all 11 tested viewports without document scrolling; controls are ≥44px. Details: `EXPEDITION_DESIGN.md`.

## Home and tabbed information — 2026-10-19

Home has no audio controls or sound-test button. Its existing artwork uses a brighter, more vivid rendering with a lighter vignette. In-game information on the map and in battle separates คำแนะนำ and ตั้งค่า; battle additionally exposes บันทึก. Music/effects mute and volume live in ตั้งค่า, alongside first-battle coaching preferences where applicable. No audio sample button is exposed. Tabs share accessible semantics and arrow/Home/End keyboard navigation, retain 44px targets and stay inside the portrait frame. Audio preferences remain separate from save v21.

### Contrast correction after owner review — 2026-10-19

The first brightening pass was too washed out. Home now uses restrained exposure (.96), modest contrast (1.08) and saturation (1.04), reduced screen-blended rays and navy edge shading. Preserve detail in the bright waterfall/sky and dark rocks; avoid a pale overlay or global brightness boost. The existing painting, layout and tabbed settings remain.

## Battle status tab — owner-approved 2026-10-19

Battle ⓘ always opens สถานะ first, even after closing on คำแนะนำ / ตั้งค่า / บันทึก. No extra inspection button is added to the battlefield/header. The status tab lists the deployed party and actual encounter enemies with portraits, HP and compact buff/debuff icons; selecting a unit shows all current temporary effects, real values and expiry/consumption conditions. Group buffs appear on all recipients. Unknown/stale effects are not invented from animation or log text. Downed/finished/empty units are explained explicitly. Inspection reads the displayed actor-turn snapshot, never leaks a later committed turn, and cannot cast, change targeting, mutate save v21 or issue a command. Native dialog scroll, keyboard tabs, focus restoration and closing-touch protection remain.

## Battlefield status badges — 2026-10-19

All living units show current temporary buff/debuff symbols in a compact, noninteractive row above their artwork. Use the same `unitStatuses` projection and displayed actor-stage snapshot as the status inspector. Green borders indicate buffs, rose borders indicate debuffs; show three symbols plus +N for overflow. The accessible label includes every effect and its duration, including overflow. Full details remain in battle ⓘ → สถานะ, which opens first every time. Anchors use arena CSS pixels and clamp horizontally to the field; placing badges above the art preserves the bottom row on short portrait screens without changing formations or target hitboxes. Rebuild on scene layout/resize and actor-stage changes; no badge for empty, fallen or finished units. Pointer events pass through the overlay. The old Mark-only canvas diamond is replaced by the shared badge row; intent warning and selected-skill target markers remain separate.

## Reserved unit HP/status panels — 2026-10-19 (authoritative)

Reserve complete body and HP/status rectangles for all six units using `game/visuals/field-layout.ts`. Slots follow party lanes with front/rear stagger and stable two-row placement; status count cannot move actors. Fit art to each cell and retain ≥44px independent target bounds. HP and statuses share a pointer-transparent DOM panel. Normal fields show 2–3 symbols plus overflow below HP; compact fields (<260px high) show one +N alongside HP. Very short fields (<150px) use a narrow side panel, 12px symbols and 44px art. Full details stay in ⓘ → สถานะ. Preserve exact enemy HP; abbreviated field names retain full accessible/inspector names. Verify every panel against every body and other panel, not only viewport bounds, and stress all six panels simultaneously through resize. The previous above-head positioning is replaced; core formation rules, saves and combat are unchanged.

## Map character sheet, phase 1 — owner-approved 2026-10-19

Map party portraits are 44px+ buttons with unspent-point badges. They open a full-frame character dialog with Overview, Equipment, Skills and Talents tabs. A horizontally scrollable brought-member picker includes deployed and reserve units. Tabs have keyboard Left/Right/Home/End navigation; content scrolls independently. Overview shows current scaled stats; Skills shows current Active descriptions and ★3/★5 unlocks; Talents uses the same gates as camp and allows spending unallocated points on the map. Reset stays at the base-camp trainer. Two talent branches stay side by side even at 320px.

Equipment wear/take-off moves into this sheet, retaining slot filtering, set summaries, class restrictions, current carried/found sources and ownership/HP behavior. The bag equipment tab shows inventory and links into the character equipment tab; team details link there too. Closing returns to the originating bag/camp tab, scroll and focus, or the map portrait. Native modal, hidden/inert and orientation guards block map/background actions and held Enter cannot repeatedly spend points. Map card portraits remain visible on narrow screens without growing the HUD band. Item comparison, auto-equip, additional set filters and the broader bag/team redesign belong to later phases.

## Character stat help and equipment comparison, phase 2 — owner-approved 2026-10-19

Overview stat rows expand on request to explain HP, Attack, SPD, Support, effective Armour/Resistance/Leech caps, starting barrier, trail regeneration, individual Luck and actual deployed-team drop bonus. Current values include existing growth, gear, talents and wounds. Active skills show base power, target selection, cooldown and growth source alongside the existing resolver-aligned descriptions and unlock requirements. Bard Finale shows both damage and healing branches; songs include the class passive.

Each compatible bag item has Compare alongside Equip. Comparison stays inside the existing Equipment tab, showing worn versus candidate item, effective whole-character stat deltas, HP consequences, every unlocked action and all set/special effects before/after. Base powers are explicitly conditional, not guaranteed damage; expandable skill rows retain full current/proposed descriptions. Set thresholds and legendary effects are shown separately, including lost bonuses. Use the real pure wear reducer to build the trial state; never persist it. Only the explicit Equip button commits through the existing host. Back/Cancel/Escape returns focus to the source item; changing member/tab clears the trial, resize/rotation preserves it, orientation/inert guards reject equip. Keep 44px controls, contained scrolling and a reachable sticky equip/cancel footer at 320px. Auto-equip and new set filters remain future work.
