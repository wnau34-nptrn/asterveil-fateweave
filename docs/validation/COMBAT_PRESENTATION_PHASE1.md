# Combat presentation phase 1 — timing and lifecycle

2026-10-21 · scope C10–C16; no phase-2 skill artwork or boss cutscenes yet.

## Implemented behavior

- One cancelable `BattlePlayback` clock owns contact/end/down cues and the cancellation handles of stage sounds. A new stage or skip/load cancels all pending old callbacks and playing stage sounds. Hidden-tab and window-resize completion fast-forward to the already committed result without a completion sound or extra command. Selection on a resize outside playback remains unchanged.
- Normal motion renders authoritative pre-turn HP/status until contact; HP/barrier/status, log, existing impact effects and sound reveal together. Each actual actor remains a separate stage. No later actor result is exposed. The status inspector reads the same displayed snapshot, including while its modal is open.
- Reduced motion applies the same actor group synchronously at stage start, with no moving VFX. Actor stages remain readable and cancelable. Action durations are content-independent presentation settings (Attack600ms, Execute/Bolt850ms, support500–750ms, ordinary enemies800ms, Rift Warden1200ms, canceled turns500ms), not resolver time.
- Side effects (counter, reflection, leech, boss barrier and turn-advance upkeep) reveal as one authoritative group. This release does not invent intermediate per-event states. Full granular choreography belongs to later work if a proven trace is added.
- `beginBattle(..., presentation=true)` / `resolveCommand(..., presentation=true)` provide isolated transient `TurnStage.before/after` boundaries only for live UI playback. `after` includes cleanup and upkeep from advancing that turn. The legacy `TurnStage.state` and default-resolution output remain intact. Replay, preview and simulation avoid extra snapshots by default. No save-format, encounter-version, cooldown, RNG, damage, loot or pity change.
- The contact update uses `scene.sync(view,false)` so updating HUD state does not repaint the scene and destroy its active effects. The existing lunge starts before contact; the existing flash/recoil/numbers start at contact. Effects fit the remaining stage duration. Pending Phaser effect timers, tint, body displacement and field shake restore on cancellation.
- No new assets, dependencies, BGM, cutscenes, phase mechanics, speed/intensity preference controls or per-class skill effects. Those remain later plan items.

## Validation

- Full local quality:503 unit tests passed, lint, typecheck and Pages build passed. Added tests for authoritative boundary separation, turn-start renewal, optional-capture equivalence, replay/state integrity, synchronous reduced-motion feedback, clock cancellation and idempotent audio-source cancellation.
- Regenerated all9 phase-0 synthetic resolver traces against the changed default resolver: byte-identical to the frozen baseline (state, events and legacy actor frames). Evidence in `combat-phase1-compare` outside repo.
- New browser cases cover normal-motion pre/contact/enemy-contact state and sound requests, live status-modal projection, skip before contact, resize, reload and hidden-tab completion at320×568/390×844 touch emulation and1366×768 desktop.
- First development-server run passed51/55, including all6 new cases. Two original timing assumptions needed updating/immediate reduced-mode feedback; two route tests were interrupted by development hot reload during ongoing edits. Production Pages rerun passed all10 selected flows (the6 new cases and4 affected regressions) with normal/reduced motion, modal state, skip/resize/reload/hidden-tab and existing boss/blind-attack routes. No runtime changes were made to force the routes through.
- An early always-captured implementation exceeded the existing60s boss-balance timeout during concurrent local browser work. Snapshot capture is now opt-in; an isolated11760-fight run passed in34.9s without changing its assertions or timeout. Full503-test run then passed in40.6s without browser contention.

External evidence root: `C:\Users\Warunyu.N\.codex\visualizations\2026\10\21\01a15cd5-a6e8-7f81-961a-2a851f62ed4c`. Timing screenshots are virtual-clock observations, not measured audio latency/FPS. Physical iPhone/Safari and the previous audible SFX report remain unverified.

## Release status

Production browser rerun, PR/CI/Pages and public-game checks pending at time of this note. No claim of publication until deployment and live verification complete.
