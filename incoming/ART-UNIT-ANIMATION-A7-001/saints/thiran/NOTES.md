# thiran — A7 character handoff

See [package NOTES](../../NOTES.md) for scope, identity invariants, candidate rationale, extraction method and Claude handoff. This character's frames were generated from this character's own shipped seed in three independent whole-sheet edits.

- R1 actions: six frames per complete strip, four body sets.
- R1 reactions: hit, block, down; four frames each.
- R2 alternatives: communion and lastlight; six frames each.
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
| `thiran-punch-r1.png` | protective ready → draw rear fist → straight punch right → extended shoulder follow-through → retract fist → regain guard |
| `thiran-sweeping-arc-r1.png` | ready → load shoulder and coil → sweep forearm across front → broad horizontal follow-through → unwind → guard |
| `thiran-communion-r1.png` | gather hands at chest → bow into gathering → open palm offering → extended open palm → soften offering → guard |
| `thiran-lastlight-r1.png` | square guard → gathered two-fist brace → draw heavy fist high → heavy forward punch → low recovery → square guard |
| `thiran-hit-r1.png` | ready → recoil and wince → catch balance → guard |
| `thiran-block-r1.png` | raise protective arms → brace behind crossed gauntlets or fans → absorb weight low → reset guard |
| `thiran-down-r1.png` | knees give way → hand and knee reach ground → sink to seated slump → lie unconscious and hold |
| `thiran-communion-r2.png` | guard → gather bead hand → open palm facing front-right → extended open palm right → turn and offer palm left → return right |
| `thiran-lastlight-r2.png` | gathered guard → sink deeply → raise gauntlet overhead → downward heavy hammerfist right → low weighted follow-through → recover guard |
