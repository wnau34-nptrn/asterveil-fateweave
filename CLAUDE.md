# Fateweave development instructions

Work only in `asterveil-fateweave`. Never modify, reset, merge, push to, or import private code/assets/history from `asterveil-rise-beyond` (reading its design documents for concept adaptation was approved by the owner on 2026-10-14). Preserve existing target-repository work. Never commit secrets or supplied concept images without explicit authorization. The user explicitly authorized GitHub Pages publication after the initial prototype; the Pages workflow is within that scope. Do not change repository visibility/access permissions, configure other hosting or automatically merge without separate authorization.

## Current architecture

- Phaser 4.2.1 + strict TypeScript + Vite. Framework rules are different from Godot; Godot Lock documents are not requirements here.
- `src/core/battle` owns serializable authoritative state, stable IDs, beat-stamped commands, legal targets, deterministic resolution, preview and replay. No Phaser/browser imports or clocks/random damage in rules.
- Typed `src/content` definitions own actor values, announced intent schedule, hero lanes, class skills, cooldowns and tunable numeric rules.
- `BattleScene` adapts state into disposable shapes/text, pointer selection and VFX. No damage or resource mutations in scenes or tweens.
- `BattleUI` owns temporary skill selection, floating explanations and presentation lock; it commits once, saves immediately and projects state into DOM. Never allow selection alone or background/resume to confirm a command.
- `core/save` accepts an injected storage port and validates saves by command replay. `platform/browser-storage` handles browser API access.
- CSS tokens (`src/ui/tokens.css`, Luminous Veil) define the navy-glass HUD; self-hosted OFL subset fonts Kanit/Noto Sans Thai live in `public/assets/fonts`; Phaser uses original generated unit and backdrop atlases with code-native input, HP/status labels and short VFX. Generated artwork and asset frame mapping live in `game/visuals`; HUD text and controls must remain DOM-native.

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
10. Do not add empty architecture folders, backend, accounts, cards, formation switching, skill trees or final asset production without a scoped task. Expedition systems follow the approved phase plan in `docs/EXPEDITION_DESIGN.md`; their draft numbers still need owner approval.

## Expedition (single game, no practice mode)

The game is one expedition on a **2D square-tile board** with free four-direction one-tile hops (buttons, arrow keys/WASD, adjacent taps). Never add path-finding auto-movement, linear nodes, dice, cards or room selection. The owner approved adapting Rise Beyond's non-combat *concepts* (Threat-style encounter chance, camps, carried HP, loot/equipment, events, elites, quests); never import its code, data, names or art. Rules, phase status and the approved mercenary decisions (no fixed heroes; roster 4+4; ★1 start, duplicates upgrade; unique class mechanics) are in `docs/EXPEDITION_DESIGN.md`.

- `src/core/world` is the pure, serializable expedition simulation (move, encounter chance and loot from `(seed, rolls)`, fog, rest/revive, chests, finish battle). No DOM, Phaser, clocks or `Math.random` in rules. `src/content/world` owns maps/zones/pools.
- Enemy intents target party slots (`targetSlot`, deployment order), never hero ids. The world deploys the roster's 1–4 `deployed` members via `withParty`; the reserve (≤4) is swapped only at camps. Stars scale max HP/Attack/skill power (`starred`, `skillPower`), never SPD; hiring, upgrades, dismissal and choosing the 4 + 4 happen only in the Lobby (`core/world/profile.ts`, `ui/lobby-ui.ts`); camps and the map entrance only swap the brought 8 and allow withdrawal.
- Battles start from a `BattleEntry` (per-hero HP; 0 = down and out of the queue). The world stores only the entry and hero commands and derives results by replay. World rules decide camps, defeat and rewards; battle rules never change for the world. Choosing not to fight happens before a battle.
- `core/save/expedition-save.ts` owns the single versioned save (key `asterveil.fateweave.expedition.v1`, envelope version 6 `{ profile, run }`; v1–v5 migrate; runs settle into the profile in the same write), validates every field and replays an active battle; incompatible data starts a new expedition. Finished battles are applied in the same write as their last command. Practice keys are deleted, never read. Follow save-version rules when changing the state shape.
- `GameShell` switches title/commander/lobby/world/battle views (Home → create commander once → Lobby → Map; the commander never fights); `WorldUI` renders the board as a full-screen DOM tile map (ART-UI-WORLD-001 R2 art chosen by `game/visuals/world-art.ts`) with a floating HUD: zone/danger/info capsules, slim party row, objective dialog, ghost D-pad lower left, contextual action lower right (enabled only as camp **พัก**, which opens the camp sheet, or **เปิด** on an unopened chest), and a pack capsule for resources. No sidebar, joystick, auto-pathing or invented interactions. `BattleUI.open(session)` runs one battle and commits through the session. Teaching advice runs only in the `first-clash` tutorial battle. The battle view stays laid out while hidden and the Phaser loop sleeps while exploring.
- Encounter enemies must use ids `raider`/`brute` (the two illustrated frames). Bump an encounter's version when its content changes. Keep the advisor-wins-from-60%-HP regression and the full-expedition run in `tests/world.test.ts` passing; numbers are drafts until playtested.
- World and battle views must fit every tested viewport without document scrolling, with ≥44px controls.

## SPD rounds and floating skill popup

`roundOrder` sorts living heroes and enemies by descending SPD, breaking ties by permanent definition index (heroes then enemies). Freeze `order`/`turnIndex` throughout the round, skip defeated actors, and re-sort at each round boundary. `currentHeroId` reads the current queue slot; foreign actors must fail in `actionReason`, preview and replay. Enemy templates cycle per source/round, execute only on their own turns, and determine real targets at turn start. Forecasts assume today's survivors remain alive; never promise a future target unchanged after deaths.

Each hero command resolves that actor plus subsequent automatic enemies until the next hero or outcome. `beginBattle` also handles faster-enemy opening turns. Commit/save once before presenting independent `TurnStage` frames in actual order; adjacent heroes must not acquire a false enemy stage. UI progression, skip, visibility and reload never repeat damage. `beat` is an actor-turn serial for stale command rejection; user-facing timing is `round`.

Mark lasts 2 rounds including application. Bash/Strike/Bolt/Ward/Heal cooldowns use 2 absolute rounds, Prayer 3. Guard protects the displayed next enemy target/source until consumed or the Knight returns; Bash cancels a chosen enemy's next physical turn, never energy. Earlier content saves start fresh. Preserve two distinct four-survivor plans per encounter and explicit blind Attack policy defeats.

The current/next SPD queue stays in the phase band at every viewport, four compact or six large slots, without document scrolling. Owned skill buttons retain nonmodal floating descriptions, keyboard focus return, delayed closing-touch filtering and direct ≥44px field targets. Other actors remain support recipients only. Cooling skills are readable but cannot cast. On the shortest portrait fields preserve nonoverlapping ally targets and staggered grounded units.
