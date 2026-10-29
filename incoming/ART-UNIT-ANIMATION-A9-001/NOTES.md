# ART-UNIT-ANIMATION-A9-001

2026-10-29 (Asia/Bangkok). Art only. 25 final strips / 134 logical frames. Every move has exactly one `-r1.png`; no alternates. The selected final may come from a later internal attempt, recorded in prompts.json.

Base: `feature/fateweave-initial-prototype` at `5e9e65026b8949f7877db12a2e70496fe2aac77b`. Branch: `art/art-unit-animation-a9-001`. Changes remain entirely inside this incoming package. A5 is not present on this base; A4 metadata/layout and the current explicit brief were followed.

Owner chooses artwork and approves real in-game motion. These are generated body strips and offline 390px art previews, not in-game clips or owner motion approval. No game tests or CI result constitutes artwork approval. No integration, merge or publication is part of this package.

## Coordinates and reproducibility

Run `python build_handoff.py` with Python 3, Pillow 12.3.0 and numpy; `python build_handoff.py --verify` fully decodes every PNG and checks all hashes. Source sheets are byte-for-byte untouched generator PNGs. The generator itself is nondeterministic; processing retained outputs is reproducible. Raw strips use one shared scale per complete strip, measured from the explicitly upright first ready pose, never per-frame scaling. Crops, scales, foot landmarks and paste offsets are recorded in strips.json. First and final ready frames are exact seed pixels; down locks only its first frame.

Frames are 1024 x 896 to accommodate extended weapons and >=48px clear gutters. The logical 512 x 512 seed cell is translated by (+256,+160): logical sole y=497 is padded y=657. This translation preserves original body size and avoids clipping high weapons. It is NOT a different character scale. Weapons may extend below the sole. Captain Crushing Blow contact uses an explicit foot landmark rather than axe-blade bottom. Actual scale/texture budget for integration must be checked by Claude after trim/dedup/packing; raw handoff dimensions are not a runtime atlas budget claim.

Matriarch owner decision: animation faces LEFT; original RIGHT-facing atlas seed is preserved exactly as seeds/idle.png and exact horizontal reflection is seeds/idle-left.png. All ready frames use the reflected seed. Do not apply the runtime mirroredArt flag again to these left-oriented frames. The other three bosses preserve their atlas facing.

## Preferred finals and frame orders

### foe_matriarch

- `raw/thorn-tempest-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Thorn Tempest.
- `raw/briar-lash-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Briar Lash.
- `raw/gather-thorns-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Gather Thorns. Hold frame 3 for an announced telegraph; timing is integration guidance only.
- `raw/thorn-bloom-storm-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Thorn Bloom, Thorn Storm.
- `raw/thorn-rage-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Thorn Rage.
- `raw/hit-r1.png`: 1. ready (exact seed) -> 2. recoil -> 3. brace -> 4. recover (exact seed). Suggested intents: hit.
- `raw/down-r1.png`: 1. ready (exact seed) -> 2. buckle -> 3. collapse -> 4. grounded hold (never stands). Suggested intents: down.

## Rejected internal attempts

- briar-lash: Attempt 1: whip extended into neighbouring frames; no clear vertical separation. Recreated with shorter attached whip and smaller source figures.
- thorn-bloom-storm: Attempt 1: no clear alpha gutter before frame 6. Recreated with compact spacing template.
- thorn-rage: Attempt 1: last figure touched the source edge. Recreated with wide margins.

## Concerns / integration handoff

No owner artwork or motion approval is claimed. Maintain the logical seed cell offsets and shared scale, use real feet rather than weapon tips for ground anchors, and hold the final down pose until authoritative revival replaces it. No VFX are included. Test actual timing, anchor continuity, source-to-seed transitions and texture budgets during integration.

### foe_juggernaut

- `raw/horn-charge-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Horn Charge. Hold frame 3 for an announced telegraph; timing is integration guidance only.
- `raw/shard-burst-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Shard Burst.
- `raw/hit-r1.png`: 1. ready (exact seed) -> 2. recoil -> 3. brace -> 4. recover (exact seed). Suggested intents: hit.
- `raw/down-r1.png`: 1. ready (exact seed) -> 2. buckle -> 3. collapse -> 4. grounded hold (never stands). Suggested intents: down.

## Rejected internal attempts

No generated attempt rejected for this boss. Horn Charge received a dedicated signature pose review before accepting the first whole-strip result.

## Concerns / integration handoff

No owner artwork or motion approval is claimed. Maintain the logical seed cell offsets and shared scale, use real feet rather than weapon tips for ground anchors, and hold the final down pose until authoritative revival replaces it. No VFX are included. Test actual timing, anchor continuity, source-to-seed transitions and texture budgets during integration.

### foe_sentinel

- `raw/rift-cataclysm-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Rift Cataclysm.
- `raw/raking-slash-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Raking Slash.
- `raw/crushing-blow-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Crushing Blow.
- `raw/rift-bolt-wave-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Rift Bolt, Rift Wave.
- `raw/rift-gathering-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Rift Gathering. Hold frame 3 for an announced telegraph; timing is integration guidance only.
- `raw/rift-awakening-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Rift Awakening.
- `raw/call-the-rift-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Call the Rift.
- `raw/hit-r1.png`: 1. ready (exact seed) -> 2. recoil -> 3. brace -> 4. recover (exact seed). Suggested intents: hit.
- `raw/down-r1.png`: 1. ready (exact seed) -> 2. buckle -> 3. collapse -> 4. grounded hold (never stands). Suggested intents: down.

## Rejected internal attempts

- raking-slash: Attempt 1: poleaxe overlapped neighbouring frame columns. Recreated compact whole strip.
- crushing-blow: Attempts 1 and 2: poleaxe switched hands during the free-fist punch; attempt 1 also crowded/clipped. Rejected both; final is a two-handed short poleaxe chop, distinct from the ground slam.
- rift-bolt-wave: Attempt 1: neighbouring figures touched and edge pixels reached canvas boundary. Recreated with compact layout.
- rift-gathering: Attempt 1: cape/weapon crowded neighbouring frame columns; no clear gutter. Recreated compact.
- rift-awakening: Attempt 1: weapon/cape crowded neighbouring columns. Recreated compact.
- call-the-rift: Attempt 1: cape/weapon crowded neighbouring columns. Recreated compact.

## Concerns / integration handoff

No owner artwork or motion approval is claimed. Maintain the logical seed cell offsets and shared scale, use real feet rather than weapon tips for ground anchors, and hold the final down pose until authoritative revival replaces it. No VFX are included. Test actual timing, anchor continuity, source-to-seed transitions and texture budgets during integration.

### foe_captain

- `raw/war-cry-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: War Cry.
- `raw/crushing-blow-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Crushing Blow.
- `raw/call-the-hunt-r1.png`: 1. ready (exact seed) -> 2. wind-up -> 3. deep anticipation -> 4. contact / release / charged hold -> 5. follow-through / sustain -> 6. recover (exact seed). Suggested intents: Call the Hunt.
- `raw/hit-r1.png`: 1. ready (exact seed) -> 2. recoil -> 3. brace -> 4. recover (exact seed). Suggested intents: hit.
- `raw/down-r1.png`: 1. ready (exact seed) -> 2. buckle -> 3. collapse -> 4. grounded hold (never stands). Suggested intents: down.

## Rejected internal attempts

- war-cry: Attempt 1: first axe cropped at left edge; gutters too narrow.
- call-the-hunt: Attempt 1: axe switched to the opposite hand during pointing. Recreated with free arm crossing chest.

## Concerns / integration handoff

No owner artwork or motion approval is claimed. Maintain the logical seed cell offsets and shared scale, use real feet rather than weapon tips for ground anchors, and hold the final down pose until authoritative revival replaces it. No VFX are included. Test actual timing, anchor continuity, source-to-seed transitions and texture budgets during integration.

## Verification receipt

validation.json enumerates every package file except itself (a manifest cannot contain its own cryptographic digest). The final validation.json digest is recorded in the PR description. After normal git push, fetch into a fresh object database, extract only this incoming folder and run --verify; do not verify only the local working copy.

Rejected PNG attempts are retained only in the working generation area, not shipped as alternatives. Prompts and original attempt identifiers remain in prompts.json for audit.
