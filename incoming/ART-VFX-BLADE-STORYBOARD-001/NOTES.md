# ART-VFX-BLADE-STORYBOARD-001

2026-10-25. Owner-authorized concept artwork before another runtime VFX revision. Ten skills, three phases each. Built-in ImageGen generated ten original transparent strips; the owner explicitly approved ImageGen after Shado status returned AI Link port busy 10048. No Shado export, provider/API-key fallback or security-software changes.

Exact per-skill prompts and original generated filenames are in generation-prompts.json. Every untouched source is retained under source/. Requested 1536x512; returned size is 2172x724 for all ten. Alpha minima are 0; maxima range 252–255 (translucent strokes need not contain a fully opaque pixel). Sources are not runtime spritesheets.

reference/ contains 390x844 game screenshots captured by tests/browser/blade-storyboards.spec.ts using the existing real BattleUI/BattleScene fixture. No battle command is committed (commands remains empty). anchors.json derives source/recipient from actual resolved blade cues and actorPanels, including Parry's counter. Each three-phase concept reuses one fixed screenshot, leaving HP/UI unchanged. No owner save or supplied concept sheet is used.

Browser canvas lays out the generated artwork without repainting characters, interface or scenery. build_manifest.py only analyzes existing source alpha, dimensions and per-phase regions, and writes metadata. Browser screenshots produce docs/combat-presentation/blade-storyboards/*-board.png and *-contact-390.png. Read README_TH.md there for scope and owner review.

No production source, gameplay, rule, save, balance, timing, Bolt/Execute/Ward or family 2 work. The existing R3 family remains the runtime implementation. Concept approval and later real-motion clip approval are pending.
