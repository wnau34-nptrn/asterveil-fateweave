# ART-UNIT-ANIMATION-A8-001 — art handoff

2026-10-29 Asia/Bangkok. Branch `art/art-unit-animation-a8-001`, base
`feature/fateweave-initial-prototype` at `5e9e65026b8949f7877db12a2e70496fe2aac77b`.
Original whole-strip ImageGen edits of Fateweave's shipped sprites only. No Rise
Beyond assets. Only this incoming folder is changed. No merge or integration.

## Final choice and frame order

There are exactly **14 final strips**, all `-r1.png`. All are the preferred
candidates; there is no alternate or R2 to choose between. Zero-based slot data,
hashes, source scale and per-frame alpha bounds are in `strips.json`.

| Unit | Strip / suggested intents | Frames, left to right |
| --- | --- | --- |
| Shard Golem | punch / Crystal Fist, Stone Fist | ready → torso draws back → head lowers/deep coil → extended horizontal fist contact → extended follow-through → ready |
| Shard Golem | veil-quake / Veil Quake | ready → low backward coil → fists overhead with low head → both fists hit ground → grounded follow-through → ready |
| Shard Golem | hit | ready → backward recoil → low brace → ready |
| Shard Golem | down | ready → buckle → collapsed → grounded hold |
| Rift Channeler | rift-bolt / Rift Bolt, Rift Beam | ready → hands draw inward → lower/deeper gathering coil → both palms release left → extended follow-through → ready |
| Rift Channeler | hit | ready → recoil → brace → ready |
| Rift Channeler | down | ready → buckle → collapse → grounded hold |
| Rift Wisp | hover | exact seed → bob up/tail curl → bob down/tail unfurl → exact seed |
| Rift Wisp | star-flame / Star Flame | ready → back/down coil → deeper low coil → face/core snaps left, attached tail sweeps right → forward follow-through → ready |
| Rift Wisp | hit | ready → backward recoil → low brace → ready |
| Rift Wisp | down | ready → dip at 85% alpha → sink at 50% → low grounded hold at 20% |
| Shard Crawler | crystal-stab / Crystal Stab | ready → front legs lift/backward coil → deeper tucked anticipation → attached forelegs stab left/down → low follow-through → ready |
| Shard Crawler | hit | ready → backward recoil → brace → ready |
| Shard Crawler | down | ready → legs buckle → legs folded low → grounded hold |

Channeler's current `src/content/enemies/species.ts` intent is **Rift Beam**.
The requested artwork name is **Rift Bolt**. Both suggestions are recorded;
Claude should map the real event name during integration, not change content.
The golem is also the map-3 boss body; its punch is intentionally shared by
Crystal Fist and Stone Fist. Quake uses a distinct two-arm vertical slam.

## Rejected internal attempts

No rejected output supplies pixels to the final strips. Rejected images stay
outside the deliverable, so source-sheets contains only the 14 selected originals.

- Veil Quake attempt 1 (`exec-df25603f`): first and last figures ran into the outer
  canvas; rejected for clipping/spacing despite the readable slam.
- Veil Quake attempt 2 (`exec-3b8898fd`): layout improved but generator added broad
  violet light behind the body. Rejected as VFX/background contamination.
- Veil Quake attempt 3 (`quake3`): selected. Low head anticipation, overhead arms,
  two attached grounded fists at contact; whole body remains inside the source.
- Star Flame attempt 1 (`exec-c4c03102`): outer tail tips too close to the source
  edge; rejected rather than reconstructing those tips.
- Star Flame attempt 2 (`exec-1b0f0e6e`): unwanted ambient violet glow. Rejected.
- Star Flame attempt 3 (`star3`): selected. Low backward coil contrasts with the
  leftward cast; full attached tail visible. No projectile or detached light.
- Crawler down attempt 1 (`exec-2b138253`): outer legs crowd the canvas and the
  last pose approaches the right edge. Rejected. `crawlerdown2` has intact tips
  and ends in a low fold with no return to standing.

Most generation attempts were spent on Veil Quake and Star Flame (three each).
Other moves use one generation each. All moves were generated as whole strips,
never one request per frame. `prompts.json` records selected prompts and the
recorded rejected crawler request; this log records the other rejected attempts.

## Reproducible build and technical checks

Requirements: Python 3, Pillow, NumPy, SciPy. From any working directory:

```sh
python incoming/ART-UNIT-ANIMATION-A8-001/build_handoff.py
python incoming/ART-UNIT-ANIMATION-A8-001/build_handoff.py --verify-ref FETCHED_REF
```

- `seeds/`: exact 512×512 RGBA crops of the shipped WebP cells. `seeds.json`
  records atlas hashes, crop coordinates and pixel equality. These are the idle
  assets. No redraw of the seed is substituted.
- `templates/`: reproducible repeated-seed reference canvases (4/6 slots); used
  in internal layout experiments. They are references, not animation choices.
- `source-sheets/`: untouched generator PNGs, one selected source per final move.
- `raw/`: transparent straight RGBA strips, 1024×768 logical frames. Seed placed
  at (256,200), logical source-cell sole y497 becomes y697. Keep those offsets
  during trim/packing. The larger logical frame is space for overhead fists and
  extended arms, not a request to make the unit larger in battle.
- Each source uses one uniform scale, measured from the **ready** pose against
  seed height, applied to all generated poses. No per-frame size fitting, no
  nonuniform warps, no scale derived from folded anticipation. Generated ready
  endpoints are replaced with exact seed pixels. Hit and hover end at seed;
  down never does. Seed RGBA is copied directly, including hidden RGB in zero-alpha pixels, not redrawn.
- Connected silhouettes are extracted by component ownership rather than fixed
  source slot cuts; this preserves extended arms that overlap a neighbouring
  slot in x. Tiny detached generator specks are omitted; antialias fragments
  within three pixels of the body are retained. The original source is untouched.
- Grounded figures align their visible supporting baseline to y697; every
  grounded final pose has visible alpha>40 ending there. Wisp keeps the source
  height differences relative to its ready pose, including the sinking down.
  It is never automatically bottom-aligned. Wisp fading is the requested body
  opacity change, not a particle layer.
- All raw silhouettes have at least 24px outer clearance on every side, and all
  adjacent silhouettes have at least 48px fully clear gutters (actual minimum
  across this package: 262px). Build assertions check these at alpha>0.
- No body strip contains projectiles, impact bursts, floor rings, dust or
  independent VFX. The seed's internal crystal/hand light remains part of the
  character. Limbs/fists/crystal forelegs remain connected and visible.
- `preview-390.png`: two sequential poses per row on a dark navy background at
  390px width, approximately 90px seed height for large golem. Read order is
  left-to-right then down. All poses retain the same display scale. This is an
  art storyboard, not an in-game capture or an approved playback timing.
- `validation.json` covers every file except its own self-referential hash.
  Git protects that manifest. The verifier also checks complete file coverage,
  byte lengths, SHA-256 and both Pillow verify() and full load() for every PNG.

## Concerns and next owner decision

Selected art passes the package review for attached anatomy, lowered/backward
anticipation, readable contact, consistent reference scale/ground line, clear
gutters and distinct punch versus overhead slam. Crawler has the seed's crowded
multi-leg anatomy; assess its stab in the real battle view. Wisp is deliberately
fluid, so tail silhouette changes with the action; core identity and left facing
are retained. Ready lockback can reveal a generated-to-seed drawing transition:
Claude should inspect it at actual cadence, preserving the seed rather than
silently replacing it. No playback timing or renderer change is included.

**Owner artwork selection and owner motion approval are both pending.** CI,
hashes and PNG decoding are not either approval. Claude owns integration,
lossless packing, real event routing, optional loading/fallback, reduced motion,
and real 390px motion clips. No tests or integration results are claimed here.
No rules, saves, content, balance, public assets or existing artwork changed.
This folder's NOTES is the Claude handoff because the owner's current brief
restricts all changes to this incoming folder; shared docs were not edited.
