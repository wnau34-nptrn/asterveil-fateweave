# Development roadmap

> [Current consolidated development plan](DEVELOPMENT_PLAN_TH.md) is the current delivery index. The milestones below are historical prototype notes, not the current completion status.

Milestone 1 is implemented. Milestone 2 now includes optional teaching, SPD round initiative, the responsive single-screen HUD, and three independently selectable data-driven battles; human balance feedback and physical-device checks remain open. Later milestones are proposals requiring their own scope/balance decisions.

| Milestone | Status | Deliverable / exit criteria |
|---|---|---|
| 1. Initial Combat Prototype | Implemented | Independent Phaser 4 + TypeScript app; four class heroes (2 Front / 2 Back)/two enemies; deterministic class skills, cooldowns, physical screening, barriers/healing, preview, outcomes, restart, replay saves, automated tests and CI |
| 2. Combat Refinement | Partially implemented | SPD queue/round skills, Thai intent teaching, responsive HUD, two additional encounters and independently replayed saves implemented; two tested four-survivor routes per encounter. Human balance feedback and real Android/iOS Safari checks remain |
| 3. World Exploration Implementation | Phase 1 implemented | 2D square-tile board, one-tile hops, fog, shown per-step encounter chance by zone, two camps, boss-guarded goal, teaching battle. Equipment/loot, events, elites, puzzles, quests and economy follow the phase plan in `EXPEDITION_DESIGN.md` |
| 4. Combat + World Integration | Implemented (phase 1) | Battles start from the world with carried HP (`BattleEntry`), results come from replay and return to the same tile; single versioned expedition save; practice mode removed |
| 5. Progression and Equipment | Proposed | Explicit progression/equipment rules and content; verify combat preview remains authoritative |
| 6. Playable Vertical Slice | Proposed | One coherent expedition with exploration, encounter variation, progression and approved small art/audio set |
| 7. Browser Optimization | Proposed | Measure startup, memory and frame cost; optimize Phaser bundle/assets; validate mobile Safari and low-end devices |
| 8. Online Challenges | Proposed | Separately approved API/database and challenge design; no backend exists yet |
| 9. Android/iOS Preparation | Proposed | Capacitor packaging, lifecycle/input/performance tests, platform storage and distribution planning |

## Exploration integration

Implemented as described in `EXPEDITION_DESIGN.md`. The world issues a battle with a stable encounter id and the party's entry HP; the battle returns its commands, and the world derives the outcome and HP by replay. World rules decide camps, defeat and (later) rewards; battle rules never change for the world. The earlier practice selector is gone.
