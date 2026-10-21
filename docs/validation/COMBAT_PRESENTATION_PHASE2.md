# Combat presentation phase 2 — 2026-10-21

Scope: C20–C25, the starter Knight/Duelist/Mage/Priest and event-based generic fallbacks. Boss cinematics/signature artwork remain phase 3. No dependencies, generated artwork, combat arithmetic, RNG, loot, encounter versions or save-format changes.

- Physical: CSS-pixel body anchors, source-to-recipient strike, contact slash, flash, 45ms visual hold, recoil and field-layer shake. Idle tweens resume and all displacements/tints/timers are cleared on completion/cancellation. Phaser input zones now stay in the stationary information layer; DOM targets and HUD remain at their slot origins.
- Magic: source charge, luminous route and traveling projectile before the shared contact cue. Actual damage/dodge events choose the recipient, including Guard interception. Body damage, barrier absorption and dodge receive different captions/reactions; a full block does not flash or recoil the body.
- Support: blue shield polygon, mint heal cross and pink target reticle; real Mark→Execute follow-up, Guard interception link, barrier depletion, interrupt/cancel/down and counter values. Full-HP Heal/Prayer show HP-full feedback without fabricated healing. Amounts come only from events; no CRITICAL claim is inferred from the legacy synth name.
- Audio: short owned swing/charge lead-in, canceled at impact/skip; at most two unique contact recipes. Down cues retain stage ownership. Synth sounds still require real-device listening; these checks validate requests/cancellation, not audible output.
- Preferences: battle Information → Settings → Combat visuals. Normal/fast (65% of normal stage duration, roughly 1.54x); standard/reduced intensity. Separate `asterveil.fateweave.presentation.v1` key, validated defaults and storage-failure fallback. Changes apply next actor stage. OS reduced-motion uses immediate truthful contact and static captions/shapes, with no shake/lunge/projectile/flash; changing OS motion during playback safely settles the saved result.
- `combat-effects.ts` is presentation-only classification/caption/audio selection. Event-based fallback covers all existing actions; Bard Finale retains its physical hit despite its healing event. Rules and default resolver output remain untouched.

Validation so far:

- Full local 507 unit tests passed; lint, typecheck and Pages build passed. Focused rerun after final classification correction: 23/23 tests passed. All 9 frozen phase-0 default resolver traces remain byte-identical.
- Initial production timing/preferences run passed 9/9. Expanded run passed 12/13: the reload/settings case waited behind the title transition with a paused test clock. The test now explicitly advances that transition; no timeout increase or runtime workaround. Earlier capture attempts were interrupted/replaced because of dev-server edits or a preview started in a different execution environment; they are not final release evidence.
- Final focused production run: 13/13 passed at320×568/390×844 touch emulation and1366×768 desktop, including all speed/intensity/motion combinations, OS motion changes, contact/status timing, preferences after reload, skip/resize/hidden-tab/reload and exact persisted command integrity. Final visual, CI/deployment and public-game results will be recorded below after completion.

Evidence lives outside Git under `C:\Users\Warunyu.N\.codex\visualizations\2026\10\21\01a15cd5-a6e8-7f81-961a-2a851f62ed4c`. `combat-phase2-verified` is the final focused production run. The capture helper supports `--stage-frames` for precise pre/post-contact frames and `--url` for an already running production/public build. Synthetic saves are isolated from the user's browser profile.

Limitations: Chromium touch emulation is not physical iPhone/Safari testing. Clock-controlled frames and recordings do not establish device FPS, audio latency or audible SFX quality. No measured performance claim or new boss cutscene is part of this phase.
