# wila — A7 character handoff

See [package NOTES](../../NOTES.md) for scope, identity invariants, candidate rationale, extraction method and Claude handoff. This character's frames were generated from this character's own shipped seed in three independent whole-sheet edits.

- R1 actions: six frames per complete strip, four body sets.
- R1 reactions: hit, block, down; four frames each.
- R2 alternatives: partner-turn and echo/closing-step; six frames each.
- Nine raw strips / 48 figures total. `raw/` preserves retained source pixels and coordinates. `spaced/` adds wide transparent gutters in 640×512 cells without scaling/repainting.
- Static 390px review: [preview-390.png](preview-390.png).
- Exact generation prompts, reference, original source paths: [prompts.json](prompts.json).
- Frame descriptions, recommended choices, action aliases, crops, frame bounds, relative pose-hold suggestions and hashes: [strips.json](strips.json).
- Exact current-game seed crop and SHA-256: [seeds.json](seeds.json).
- Package-wide file hashes and PNG decoding checks: [validation.json](../../validation.json).

The suggested relative hold weights express this individual's phrasing only. They do not authorize runtime timing changes. Artwork selection and in-game motion review remain pending.

## Frame order

Every sequence reads left to right.

| Strip | Frames in order |
| --- | --- |
| `wila-dance-strike-r1.png` | poised ready → gather fan across body → step into fan strike right → extended fan flourish → reverse weight → rightward ready |
| `wila-partner-turn-r1.png` | poised ready → open arm toward partner → raised-fan turn → lower offering fan → soft teaching step → rightward ready |
| `wila-circle-spin-r1.png` | gather arms → turn through side → back-facing pivot → continue through opposite side → reopen fans → settle right |
| `wila-echo-closing-step-r1.png` | gather low → crossing foot placement → forward fan accent → rising open flourish → soften closing step → settle right |
| `wila-hit-r1.png` | ready → recoil and wince → catch balance → guard |
| `wila-block-r1.png` | raise protective arms → brace behind crossed gauntlets or fans → absorb weight low → reset guard |
| `wila-down-r1.png` | knees give way → hand and knee reach ground → sink to seated slump → lie unconscious and hold |
| `wila-partner-turn-r2.png` | ready → leftward attentive turn → clear left-facing fan offer → step through rightward → leftward teaching presentation → rightward ready |
| `wila-echo-closing-step-r2.png` | ready → gather fans low → close feet and gather chest → both fans raised in closing arch → welcoming bow → settle ready |
