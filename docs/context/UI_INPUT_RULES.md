# UI and input rules (moved verbatim from CLAUDE.md on 2026-11-04)

Read before any UI, layout, battle-dock or input change. Only "six-actor queue" was updated to "actor queue" (battles are 1–5 a side since P02).

## Portrait game and desktop keyboard — owner-approved 2026-10-19

The owner chose a mobile portrait game that also plays on PC. This replaces earlier wide desktop/landscape layouts; older dated UI notes are historical.

- Every view uses one portrait frame, up to 480px wide, centred on desktop (up to 960px high) with native-sized controls. Mobile portrait uses the available phone area. Coarse-pointer landscape shows rotation guidance and gates gameplay input; a desktop window below 320px wide or 560px high requests more space instead of shrinking touch targets.
- `#app` is the named size container `game`. Component breakpoints use `@container game` and `cqw`/`cqh`; pointer/hover/reduced-motion remain media queries. The root is sized from `platform/viewport.ts`. Top-layer native dialogs centre on the game frame, and floating descriptions clamp to `gameBounds()`, not the monitor edges.
- Battle commands stay in the centred lower dock and become available on the actual hero turn. Slot keys 1–4 select the displayed action; selecting never commits. A valid field target tap/click commits once. Attack is the initial selection; Escape cancels targeting, after which a new selection is required. Full skill descriptions are explicit via the dock's ⓘ button, not an automatic interruption on every selection.
- The actor queue uses circular portraits with 44px buttons. Name/SPD/HP details are available on request and accessible labels preserve round/side/interruption information. Waiting allies retain readable HP; only the actual owner can issue a command.
- WASD/arrows move on the map (existing step/repeat throttle); T toggles the separate map team dialog, B toggles the map bag (items/equipment), I toggles world/battle information, Escape closes the top surface or cancels targeting. Ignore skill-key repeats, browser modifiers, IME/editing, background/rotation-blocked input and input behind other modals. Never queue commands during presentation for the next hero.
- Use the game/arena dimensions in `BattleScene`, not viewport-wide media queries. Rotation, resize, inspection and keyboard selection must preserve saves and cannot add a command. No resolver, encounter or save-format changes are part of this UI work.

Owner-approved 2026-11-07: map HUD tools share one row (goals/team/bag); team owns presets/field/reserve/formation. Character tabs on the map are overview/gear/skills/talents; camp adds development. Skill tree is a main tab, not a skills subsection. Star upgrades, skill-level spending/tome trading and free talent reset stay camp-only. Validation: `docs/validation/map-team-character-tabs/README_TH.md`.
