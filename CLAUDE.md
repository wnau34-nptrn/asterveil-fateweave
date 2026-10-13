# Fateweave development instructions

Work only in `asterveil-fateweave`. Never modify, reset, merge, push to, or import private code/assets/history from `asterveil-rise-beyond`. Preserve existing target-repository work. Never commit secrets or supplied concept images without explicit authorization. The user explicitly authorized GitHub Pages publication after the initial prototype; the Pages workflow is within that scope. Do not change repository visibility/access permissions, configure other hosting or automatically merge without separate authorization.

## Current architecture

- Phaser 4.2.1 + strict TypeScript + Vite. Framework rules are different from Godot; Godot Lock documents are not requirements here.
- `src/core/battle` owns serializable authoritative state, stable IDs, beat-stamped commands, legal targets, deterministic resolution, preview and replay. No Phaser/browser imports or clocks/random damage in rules.
- Typed `src/content` definitions own actor values, announced intent schedule, hero lanes, class skills, cooldowns and tunable numeric rules.
- `BattleScene` adapts state into disposable shapes/text, pointer selection and VFX. No damage or resource mutations in scenes or tweens.
- `BattleUI` owns temporary selection, confirmation and presentation lock; it commits once, saves immediately and projects state into DOM. Never allow selection alone or background/resume to confirm a command.
- `core/save` accepts an injected storage port and validates saves by command replay. `platform/browser-storage` handles browser API access.
- CSS and numeric Phaser palette tokens form the visual foundation; original lightweight geometry is intentional placeholder art.

## Development rules

1. Keep exactly one primary action per combat beat. Freeze the announced event; if its source dies, cancel that event, then announce the next.
2. Add new rules to the pure resolver and content before wiring UI. Preview must use the same resolver, not duplicate arithmetic.
3. Use meaningful tests for HP boundaries, restrictions, Guard/interruption, Mark follow-ups, formation targeting, cooldowns, barriers/healing, outcomes, preview equality and deterministic replay. Keep a winning offensive route and viable defensive interventions. The balance regression suite compares basic attacks with both target priorities and four-class offensive/defensive routes; choices must have visible consequences without forcing one fixed combo.
4. State is independent of animation. Restart, resize and tab suspension must never change the committed command outcome.
5. Validate all targets and actions again at commit. Downed actors cannot act; reject stale beats.
6. If encounter data or rule semantics change, bump `EncounterDefinition.version`; saves from the old version must be rejected safely.
7. Keep DOM text/controls responsive, touch targets >=44px, readable unavailable-action reasons, explicit confirmation, reduced-motion support and keyboard focus.
8. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. For UI/input changes also run relevant Playwright gameplay tests and inspect screenshots of real canvas content.
9. Report tested browsers/devices honestly. Chromium touch emulation does not verify iOS Safari or real devices.
10. Do not add empty architecture folders, new gameplay systems, backend, accounts, shop, cards, formation switching, skill trees or final asset production without a scoped task.

## Future world integration

The approved map is a **2D square-tile Open Board Expedition** with free four-direction one-tile hops. Do not replace it with linear nodes, dice, cards, auto-forced movement or room selection. Integrate a future pure world simulation through a typed encounter request and battle result boundary. Fog, Threat, Veil Surge, Danger Zones, Camps, Events and optional Auto-Hop belong to that future simulation; their unresolved numeric rules remain open. See `docs/DEVELOPMENT_ROADMAP.md`.
