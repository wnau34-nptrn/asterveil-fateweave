# ART-UNIT-ANIMATION-LIFE-002

Generated from the hash-verified source sprites. Raw files are generator output kept for traceability. A missing entry has no recommended version or runtime cells. Candidate recommendations are for owner review.

## Batch A

- **Mira · missing**. R1 introduced a third hand. R2 corrects the hand, but the exact frame 1 has alpha ≥ 128 at y=752 below the required y=751.
- **Toma · missing**. R1 background alpha never falls below 180. R2 produced one square illustration.
- **Garran · missing**. R1 changes the spear length as it is planted (about 480–490 px after scaling to the body, versus about 436 px for the seed). R2 produced one square illustration.
- **Brann · missing**. R1 and R2 substantially shorten the hammer from head to pommel in the planted poses.
- **Sefa · missing**. R1 shows the requested crossing. The exact frame 1 has alpha ≥ 128 at y=752 below the required y=751.
- **Lio · R1**. Passed frame canvas, edge margin, original seed pixels, ground, reviewed clean alpha on dark and bright, visual head width and body height, prop size where applicable, and the anatomy audit.

## Batch B

- **Corin · missing**. R1 narrows the head and changes the prayer strand. R2 preserves the medium-wide stance and passes the anatomy audit (median 1.003), but part of the strand disappears behind the open palm in frame 3. The visible first-pearl-to-tassel span is about 111 px versus 126 px in the seed, so the prop gate could not be verified.
- **Cerise · missing**. R1 turns to a full back view at peak. The exact frame 1 has alpha ≥ 128 at y=750 below the required y=749.
- **Kael · missing**. R1 narrows the head after height normalization (about 193 px versus 212 px in the seed; anatomy scale median 0.914). R2 has a gray matte covering the background and gaps.
- **Wynne · missing**. R1 shrinks the doll after height normalization (about 113 px versus 125 px). R2 makes the doll too large in the lift frame (about 135 px crown-to-toe versus 125 px). R2 anatomy median is 0.974.
- **Astrid · missing**. R1 drops an astrolabe pendant. R2 restores it, but the head is about 203–206 px at comparable figure height versus about 216 px in the seed. R2 anatomy median is 0.954.

Batch B has no recommended held pose. The review sheet under audits/ shows rejected held frames at a common body scale for comparison. The Batch B anatomy reports describe Corin R2, Kael R1, Wynne R2 and Astrid R2. The anatomy script measures landmark scale and cannot replace the separate silhouette-width and prop checks.

## Lio measurements

| Frame | Head width (px) | Figure height (px) | Prop span (px) | Anatomy scale |
|---:|---:|---:|---:|---:|
| 1 | 229 | 459 | 261.7 | 1.0 |
| 2 | 230 | 453 | 253.8 | 0.982 |
| 3 | 228 | 453 | 250.4 | 0.987 |
| 4 | 228 | 453 | 270.0 | 0.981 |
| 5 | 229 | 454 | 269.8 | 0.971 |
| 6 | 230 | 453 | 268.2 | 0.968 |

Lio frames 2–6 had a localized 3–4 px far-boot adjustment at the sole. The seed frame keeps the original near/far boot projection. The 390 px previews use the seed body scale at 111 px tall.

The delivery manifest covers every other file. It excludes its own SHA-256 because inserting that value would change the file. Remote verification is reported on the PR. In-game playback and owner motion approval remain pending.
