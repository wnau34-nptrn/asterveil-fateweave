# Development roadmap

Milestone 1 is implemented. Milestone 2 now includes optional teaching, the responsive single-screen HUD, and three independently selectable data-driven battles; human balance feedback and physical-device checks remain open. Later milestones are proposals requiring their own scope/balance decisions.

| Milestone | Status | Deliverable / exit criteria |
|---|---|---|
| 1. Initial Combat Prototype | Implemented | Independent Phaser 4 + TypeScript app; four class heroes (2 Front / 2 Back)/two enemies; deterministic class skills, cooldowns, physical screening, barriers/healing, preview, outcomes, restart, replay saves, automated tests and CI |
| 2. Combat Refinement | Partially implemented | Thai intent teaching, responsive HUD, two additional encounters and independently replayed saves implemented; two tested four-survivor routes per encounter. Human balance feedback and real Android/iOS Safari checks remain |
| 3. World Exploration Implementation | Proposed | Large 2D square-tile Open Board; free four-direction one-tile hops; optional Auto-Hop; fog, Threat, Veil Surge, Danger Zones, Camps and Events after numerical rules are approved |
| 4. Combat + World Integration | Proposed | Enter battle from an encounter request; return typed outcomes into expedition state and resume exploration; versioned combined save |
| 5. Progression and Equipment | Proposed | Explicit progression/equipment rules and content; verify combat preview remains authoritative |
| 6. Playable Vertical Slice | Proposed | One coherent expedition with exploration, encounter variation, progression and approved small art/audio set |
| 7. Browser Optimization | Proposed | Measure startup, memory and frame cost; optimize Phaser bundle/assets; validate mobile Safari and low-end devices |
| 8. Online Challenges | Proposed | Separately approved API/database and challenge design; no backend exists yet |
| 9. Android/iOS Preparation | Proposed | Capacitor packaging, lifecycle/input/performance tests, platform storage and distribution planning |

## Future exploration integration contract

No world code, placeholder numerical rules or empty `core/world` scaffolding are included now. Build a pure serializable expedition simulation independent of Phaser, with square tile coordinates, four-direction legal-hop commands and optional Auto-Hop as cancelable repeated player intents. Hopping animation never owns position or fog state. Do not substitute linear nodes, dice movement, cards or room-selection progression. The current three-battle practice selector is not a world simulation or expedition progression.

The world should issue a typed **encounter request** containing stable encounter ID and an explicitly approved party snapshot. The battle should return a typed **battle result** containing outcome, final actor states and command log. World rules decide rewards, Threat changes, camp interactions and survival consequences; battle rules must not invent them. Current `createBattle` starts a selected independent encounter from content, so transferring persistent party stats is future implementation, not an existing API.

Use a shell/controller to transition rendering scenes while keeping authoritative world and battle state outside those scenes. A future versioned save envelope can own expedition state, active encounter and content versions; reject incompatible data. Fog, Threat, Veil Surge cadence, zone effects, camp healing, event rates and encounter frequency remain unresolved and must not be silently finalized.
