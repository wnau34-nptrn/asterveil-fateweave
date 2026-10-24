# Full-screen HUD design inventory

Active specification: the user's full-screen map correction and the two `concept-fullscreen-*` images. The generated concepts are studies, not runtime UI or replacement map textures.

Composition: full-bleed square-tile world; zone at upper left; danger/info at upper right; four compact hero capsules across the upper centre (second row on portrait); objective disclosure beneath the zone/party; ghost-arrow cross at lower left with an empty centre; circular talk/interaction action at lower right; last-event pill near the lower edge. No world sidebar, tab or fixed right column. Map artwork reaches behind every control.

Material lock: dark navy glass, thin translucent white edges, light text, mint HP, contextual cyan, champagne only for meaningful selection. Existing biome colours are retained. Vignette affects edges only; no global art colour wash. Circles 46/60 px for arrows, 76/88 px for interaction; other interactive capsules >=44 px. No outer panel encloses the D-pad.

Typography: Kanit 600 for names/zone/control labels, Noto Sans Thai 400/700 for supporting text. Thai replaces the concept's English labels as required by the original brief. Caption minimum 12 px. Zone 20–22 px, 16–18 px at narrow sizes; names 14–16 px; HP 12 px.

Allowed world copy: ชายแดนม่านเวล; พงหนามม่านเวล; ก้าวถัดไป; percentage; ปลอดภัย; four existing hero names and HP; ชนะผู้คุมรอยแยก; 2/4; the existing event line; โต้ตอบ / พัก; the contextual availability hint. The full original checklist and expedition stats live in the objective disclosure; rules/restart remain in info. There is no new economy, NPC cast, combat command or movement mode.

Icons: existing map, danger/shield, info, check/circle and chevrons; one original currentColor talk bubble. Disabled/pressed/focus and camp-active variants use the same primitives.

Implementation boundary: reference HTML/CSS only. Existing PNG/WebP tiles, props, portraits, units and backdrop remain unchanged. DOM square cells and four legal adjacent tap areas remain, with the party camera centred. The concept's painted road/islands are illustrative; live mockups must obey the existing square-tile asset vocabulary and may not substitute a static picture for a playable grid. This constraint takes priority over decorative scene details from the concept.

Interaction preview: goals disclose a floating modal; info discloses rules/restart; four arrows remain one-step buttons, with no drag/joystick gesture; right action is disabled away from a usable point and becomes camp/rest when on camp. The demo only supplies visual feedback and never computes game state or writes saves.

Fidelity checks: (1) full map coverage, (2) lower-corner control positions, (3) empty D-pad centre, (4) translucent material and narrow edges, (5) slim four-hero hierarchy, (6) readable Thai typography, (7) objective disclosure, (8) original texture/portrait preservation. Concept and final screenshot are inspected together before handoff.
