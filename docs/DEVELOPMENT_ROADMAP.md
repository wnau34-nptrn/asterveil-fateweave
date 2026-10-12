# Development roadmap

Only milestone 1 is implemented in this change. All later milestones are proposals and require separate scope/balance decisions.

| Milestone | Status | Deliverable / exit criteria |
|---|---|---|
| 1. Initial Combat Prototype | Implemented | Independent Phaser 4 + TypeScript app; three heroes/two enemies; deterministic Attack/Guard/Mark/Redirect, Crystal, preview, outcomes, restart, replay saves, automated tests and CI |
| 2. Combat Refinement | Proposed next | Human feedback and balance tuning; clearer intent teaching; additional data-driven encounter; approved visual-reference review; real Android/iOS Safari checks |
| 3. World Exploration Implementation | Proposed | Large 2D square-tile Open Board; free four-direction one-tile hops; optional Auto-Hop; fog, Threat, Veil Surge, Danger Zones, Camps and Events after numerical rules are approved |
| 4. Combat + World Integration | Proposed | Enter battle from an encounter request; return typed outcomes into expedition state and resume exploration; versioned combined save |
| 5. Progression and Equipment | Proposed | Explicit progression/equipment rules and content; verify combat preview remains authoritative |
| 6. Playable Vertical Slice | Proposed | One coherent expedition with exploration, encounter variation, progression and approved small art/audio set |
| 7. Browser Optimization | Proposed | Measure startup, memory and frame cost; optimize Phaser bundle/assets; validate mobile Safari and low-end devices |
| 8. Online Challenges | Proposed | Separately approved API/database and challenge design; no backend exists yet |
| 9. Android/iOS Preparation | Proposed | Capacitor packaging, lifecycle/input/performance tests, platform storage and distribution planning |

## Future exploration integration contract

No world code, placeholder numerical rules or empty `core/world` scaffolding are included now. Build a pure serializable expedition simulation independent of Phaser, with square tile coordinates, four-direction legal-hop commands and optional Auto-Hop as cancelable repeated player intents. Hopping animation never owns position or fog state. Do not substitute linear nodes, dice movement, cards or room-selection progression.

The world should issue a typed **encounter request** containing stable encounter ID and an explicitly approved party snapshot. The battle should return a typed **battle result** containing outcome, final actor states and command log. World rules decide rewards, Threat changes, camp interactions and survival consequences; battle rules must not invent them. Current `createBattle` starts the fixed encounter from content, so transferring persistent party stats is future implementation, not an existing API.

Use a shell/controller to transition rendering scenes while keeping authoritative world and battle state outside those scenes. A future versioned save envelope can own expedition state, active encounter and content versions; reject incompatible data. Fog, Threat, Veil Surge cadence, zone effects, camp healing, event rates and encounter frequency remain unresolved and must not be silently finalized.
