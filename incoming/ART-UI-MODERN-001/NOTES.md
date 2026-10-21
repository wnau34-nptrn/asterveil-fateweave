# ART-UI-MODERN-001 — implementation handoff

21 October 2026 · Luminous Veil · reference boards only. All measurements below are CSS pixels; PNG exports use 2× device scale. The editable HTML/CSS compositor is included for precise rebuilding and Thai copy extraction. Do not ship these PNGs as runtime panels.

## Direction and hierarchy

The hero and six painted equipment slots are the focal point. Power receives one gold capsule, primary actions use gold, selection uses cyan, and secondary controls stay navy. The equipment bag uses a five-column tile grid and tap filters. The selected card puts signed deltas next to the resulting values; a detailed sheet retains old → new values for inspection. Colour is always paired with ▲/▼ and numbers. Context and rules move behind the 44 px information control.

The same item tile, panel, pill, stat chip, tab, button and HP track functions compose all screens. Rarity changes the outer frame and a restrained CSS glow; the image pixels are unchanged. The component board deliberately repeats the same sword across five rarities to demonstrate this boundary. Production selection also needs a check/corner indicator, independently of rarity.

## Canonical tokens

Source: `src/ui/tokens.css` and `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`, read without modification.

| Role | Token / value |
| --- | --- |
| Background | `--navy-950` #08121f |
| Deep surface | `--navy-900` #0d1c2e |
| Raised surface | `--navy-800` #14243a |
| Reliable glass | `--panel-bg` rgba(8,18,31,.94) |
| Trim / primary | `--gold-edge` #d9bf86; `--gold-light` #f2d596 |
| Selection / focus | `--veil-cyan` #74d4ef; `--focus` #a3edff |
| Gain / HP | `--hp-mint` #68e5b6 |
| Enemy / epic | `--rift-violet` #b59aff; `--rift-deep` #9454d6 |
| Loss / danger | `--danger-coral` #ed927f |
| Text / secondary | `--text` #f4f7fc; `--text-muted` #bbcadb |
| Track | `--meter-track` #24384b |
| Rarity common → legendary | #bbcadb / #68e5b6 / #74d4ef / #b59aff / #f2d596 |

The reference adds a subtle static #23435a radial lighting wash behind heroes, plus #183c50 selected surfaces. These are surface treatments derived from navy/cyan, not new semantic colours. No backdrop blur is needed for reliable readability. Use the existing optional 8 px control blur only if measured safe on device.

## Type, spacing and input

Self-hosted Kanit 600 for headings, buttons and key numerals; Noto Sans Thai 400/700 for body. The actual bundled WOFF2 fonts render Thai in every PNG. Titles 24, section headings 20, card names 16, body/actions 14, supporting text/tabs 12. Eyebrow labels 11; forge icon captions 10 with a full 44 px target. Thai line height 1.45, no negative tracking; English eyebrows alone use expanded tracking. Primary values 20–32. Keep labels with their figures when enlarging text.

Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32. Board page gaps use a compact 10 px adjustment at 390×844. Phone gutter 16. Radii 6 / 10 / 16 / 24 / pill. 1 px edges. HP track 6 px, affix quality 4 px, blue hatched barrier with a numeric label. Quality bars map 80–120% to 0–100%; all quality percentages remain visible.

Phone content begins at y=48; content and actions end before y=828, leaving at least 16 px at the bottom (normally 24). Status time is decorative system chrome, not a game control. Runtime should add `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` and use the viewport adapter. Close/info and every button are at least 44×44. Item cells are 58–96 px, tree nodes at least 44 px, queue portraits 44 px, D-pad cells 48 px and contextual action 82 px. For diamond/crest nodes, retain a separate rectangular 44 px hit layer; clipping is visual only.

## Component state contract

| Component | Default | Pressed | Disabled | Selected |
| --- | --- | --- | --- | --- |
| Primary / secondary / icon button | gold / navy / navy | 2 px depression + darker fill | .55 opacity + unavailable reason | cyan edge + text |
| Tab / filter / item tile | neutral edge | darker surface | muted + reason/lock | cyan marker + persistent label/check |
| Card / stat chip | navy; no action unless declared | darker only if clickable | muted; preserve readable numbers | cyan edge + current label |
| Skill | painted item cue + short name/numbers | darker | cooldown count or uninstalled label | cyan frame; only one command selected |
| Sheet / confirm | opaque navy on scrim | button state only | confirm disabled while stale/unavailable | focus stays inside dialog |
| Toast / currency | passive status | no pressed state | no disabled state | no selection state |

The component PNG shows button states, keyboard focus, rarity frames, stat chips, selected tabs/filter, bottom navigation, toast and a sheet/confirm example. Noninteractive status components do not acquire button states. Do not use visual .disabled alone in production: use real disabled/aria-disabled semantics. Static board tiles/nodes are reference illustrations; production wraps appropriate controls with accessible buttons and named labels. Announce numeric changes in a polite live region. Dialogs restore focus to their opener; Escape cancels; held inputs cannot confirm a second operation.

## Per-board integration notes

- 01: six slots are weapon/head/body/gloves/boots/charm. Wear applies the selected bag item; Remove applies only to the currently worn selection. The two actions illustrate shared card affordances and must enable/disable according to selection. Hero identity and paper doll art remain unchanged even when selected gear changes.
- 02: item set and enhancement are metadata, not painted labels. Use the existing Dawn emblem. Show actual lost/gained effects and unchanged set count. Lock state must reflect ownership.
- 03: eight main chips plus recovery/luck summaries. EXP ring is illustrative at 68%, matching 340/500. Numeric power 1,284 is a hierarchy sample; no scoring formula is proposed.
- 04: one Knight example has exactly 3 branches × 4 tiers. Round active, diamond modifier, square passive and large crest capstone. Replicate this grammar per class with existing skills. Connections represent prerequisites, not decoration. This is a requested future tree layout, not permission to invent progression or replace current talent rules.
- 05: six icon tabs flatten the requested forge actions visually. Keep all current services (including reroll/smelt) reachable in integration; these six tabs are not an exhaustive mechanics inventory. Show a separate review/confirm before spending. Costs/refunds/quality come from the real forge helpers.
- 06: current camp backdrop and NPC atlas frames, no new people. Three visible hotspots demonstrate spatial service discovery; retain the other existing camp services through navigation/sheets. Depart names the selected map.
- 07: decorative tile patch demonstrates floating HUD layout, not a replacement level. HP, danger and next objective come from real state. The Rest action is shown in its available appearance to demonstrate the component; the runtime enables it only on a usable camp tile. Do not infer availability from this mockup's visual proximity to the tent.
- 08: existing ruins, party portraits and Brute frame. The requested four-cell command dock shows the current three Knight commands plus an explicitly disabled uninstalled slot. It does not authorize a fourth action. Painted command cues reuse unchanged gear frames (sword/armour/headgear/charm) as mockup icon references because the repo has no painted skill atlas; retain the current semantic SVG icons until a dedicated skill-art task supplies approved paintings. Do not mistake these item cues for new skill inventory. Cooldown 2, enemy intent and HP are sample values. A runtime field must display all actual participants/targets and only show actions the actor owns.
- 09: rewards and EXP are example values. New-item glow belongs to the frame. Reveal only committed rewards; item collection/storage rules remain authoritative.
- 10: existing Garran/Mira/Toma frames with example prices; a card opens existing details and a separate explicit hire action, never a random purchase. No real-money flow.
- PC: the requested 1366×768 composition is an optional future wide equipment reference. Current repository instructions still require a centred portrait game frame on desktop; this artwork does not silently change that runtime contract. Owner review should resolve whether to adopt this optional wide equipment sheet.

## Motion

Press 90 ms / 2 px, sheet 180 ms / 10 px entrance, stat delta 180 ms crossfade, one selection glow 180 ms. Reward cards reveal 120 ms apart; EXP fills over 450 ms after committed rewards. Do not animate text counters into different authoritative values. Use a small one-shot rarity halo for newly revealed cards, not an endless pulse. Battle queue/current actor follows existing staged events. Keep inputs stationary and preserve skip/load/cancellation. Reduced motion uses static selected borders, immediate bars/rewards/sheets and no hero lift or glow pulse. No animated blur/shadows.

## Sources, scope and verification

Read `CLAUDE.md`, current `docs/UI_DESIGN.md`, style guide/tokens, the three requested browser specs, character/gear/world atlas mappings. `docs/MASTER_PLAN_TH.md` is absent in this checkout at base e5a75fb; its section 4 could not be read. Current repository rules and the explicit handoff supplied the screen order and constraints. The handoff's requested art branch/PR-only scope supersedes general merge/deploy standing authorization here.

Existing art is sampled directly with CSS atlas positioning; no source asset was edited, copied into runtime, redesigned or generated. Local compositor uses Chromium to shape Thai and export opaque PNGs. `validation.json` records per-board CSS sizes, button dimensions and overflow; `verification.json` additionally checks exact PNG dimensions, safe bounds, images/backgrounds and fonts. Every PNG received a visual inspection; clipping and sheet stacking found on first render were corrected. No runtime source or tests changed, so gameplay tests are not used as evidence of these design references. Only this incoming folder is included in the PR; unrelated working files remain untouched.
