# Fateweave development instructions

Work only in `asterveil-fateweave`. Never modify, reset, merge, push to, or import private code/assets/history from `asterveil-rise-beyond`. Preserve existing target-repository work. Never commit secrets or supplied concept images without explicit authorization. The user explicitly authorized GitHub Pages publication after the initial prototype; the Pages workflow is within that scope. Do not change repository visibility/access permissions, configure other hosting or automatically merge without separate authorization.

## Current architecture

- Phaser 4.2.1 + strict TypeScript + Vite. Framework rules are different from Godot; Godot Lock documents are not requirements here.
- `src/core/battle` owns serializable authoritative state, stable IDs, beat-stamped commands, legal targets, deterministic resolution, preview and replay. No Phaser/browser imports or clocks/random damage in rules.
- Typed `src/content` definitions own actor values, announced intent schedule, hero lanes, class skills, cooldowns and tunable numeric rules.
- `BattleScene` adapts state into disposable shapes/text, pointer selection and VFX. No damage or resource mutations in scenes or tweens.
- `BattleUI` owns temporary skill selection, floating explanations and presentation lock; it commits once, saves immediately and projects state into DOM. Never allow selection alone or background/resume to confirm a command.
- `core/save` accepts an injected storage port and validates saves by command replay. `platform/browser-storage` handles browser API access.
- CSS tokens define the modern navy/gold HUD; Phaser uses original generated unit and backdrop atlases with code-native input, HP/status labels and short VFX. Generated artwork and asset frame mapping live in `game/visuals`; HUD text and controls must remain DOM-native.

## Development rules

1. Keep exactly one primary action per actor turn and one turn per surviving actor each round. Skip dead queue entries and freeze the real target when the enemy starts its turn.
2. Add new rules to the pure resolver and content before wiring UI. Preview must use the same resolver, not duplicate arithmetic.
3. Use meaningful tests for HP boundaries, restrictions, Guard/interruption, Mark follow-ups, formation targeting, cooldowns, barriers/healing, outcomes, preview equality and deterministic replay. Keep a winning offensive route and viable defensive interventions. The balance regression suite compares basic attacks with both target priorities and four-class offensive/defensive routes; choices must have visible consequences without forcing one fixed combo.
4. State is independent of animation. Restart, resize and tab suspension must never change the committed command outcome.
5. Validate all targets and actions again at commit. Downed actors cannot act; reject stale beats.
6. If encounter data or rule semantics change, bump `EncounterDefinition.version`; saves from the old version must be rejected safely.
7. Keep DOM text/controls responsive, touch targets >=44px, readable unavailable-action reasons, immediate casting on a valid marked character, reduced-motion support and keyboard focus.
8. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. For UI/input changes also run relevant Playwright gameplay tests and inspect screenshots of real canvas content.
9. Report tested browsers/devices honestly. Chromium touch emulation does not verify iOS Safari or real devices.
10. Do not add empty architecture folders, new gameplay systems, backend, accounts, shop, cards, formation switching, skill trees or final asset production without a scoped task.

## Future world integration

The approved map is a **2D square-tile Open Board Expedition** with free four-direction one-tile hops. Do not replace it with linear nodes, dice, cards, auto-forced movement or room selection. Integrate a future pure world simulation through a typed encounter request and battle result boundary. Fog, Threat, Veil Surge, Danger Zones, Camps, Events and optional Auto-Hop belong to that future simulation; their unresolved numeric rules remain open. See `docs/DEVELOPMENT_ROADMAP.md`.


## Encounter catalog and independent combat saves

`src/content/encounters/catalog.ts` contains the version-5 Veil Siege and two version-3 battles: rear energy pressure and a single boss alternating physical/energy attacks. All reuse the same hero/skill/rule definitions; keep the original encounter's damage schedule and save key; reject earlier content versions under the new turn rules. Additional encounters own separate validated replay keys, and a separate validated preference remembers the selected catalog entry. Restart resets only that battle. An in-tab snapshot cache retains committed battle states when storage is unavailable; never cache presentation snapshots. No expedition, unlocking or progression is implemented by the practice selector.

`BattleUI` selects/restores the current definition; `BattleScene.setEncounter` swaps only rendering data and clears obsolete targets/effects. Never transfer stale actors, timers, hero selection or commands between battles. Lock the selector during turn presentation; optional native dialogs must block background casting and filter residual closing touches. Preserve the single-screen gameplay layout and ≥44px header/field controls. Regression fixtures cover two four-survivor routes per encounter and concrete basic-attack defeats, without claiming exhaustive or final balance.


## SPD rounds and floating skill popup

`roundOrder` sorts living heroes and enemies by descending SPD, breaking ties by permanent definition index (heroes then enemies). Freeze `order`/`turnIndex` throughout the round, skip defeated actors, and re-sort at each round boundary. `currentHeroId` reads the current queue slot; foreign actors must fail in `actionReason`, preview and replay. Enemy templates cycle per source/round, execute only on their own turns, and determine real targets at turn start. Forecasts assume today's survivors remain alive; never promise a future target unchanged after deaths.

Each hero command resolves that actor plus subsequent automatic enemies until the next hero or outcome. `beginBattle` also handles faster-enemy opening turns. Commit/save once before presenting independent `TurnStage` frames in actual order; adjacent heroes must not acquire a false enemy stage. UI progression, skip, visibility and reload never repeat damage. `beat` is an actor-turn serial for stale command rejection; user-facing timing is `round`.

Mark lasts 2 rounds including application. Bash/Strike/Bolt/Ward/Heal cooldowns use 2 absolute rounds, Prayer 3. Guard protects the displayed next enemy target/source until consumed or the Knight returns; Bash cancels a chosen enemy's next physical turn, never energy. Earlier content saves start fresh. Preserve two distinct four-survivor plans per encounter and explicit blind Attack policy defeats.

The current/next SPD queue stays in the phase band at every viewport, four compact or six large slots, without document scrolling. Owned skill buttons retain nonmodal floating descriptions, keyboard focus return, delayed closing-touch filtering and direct ≥44px field targets. Other actors remain support recipients only. Cooling skills are readable but cannot cast. On the shortest portrait fields preserve nonoverlapping ally targets and staggered grounded units.
