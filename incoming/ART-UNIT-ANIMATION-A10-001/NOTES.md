# ART-UNIT-ANIMATION-A10-001

Art only. Base: `5e9e65026b8949f7877db12a2e70496fe2aac77b`, branch
`art/art-unit-animation-a10-001`. Intended PR base:
`feature/fateweave-initial-prototype`. Do not merge this artwork PR automatically.

## Selection and scope

Exactly one final candidate, `-r1`, for each of ten moves. All ten are preferred.
Owner artwork selection and later in-game motion approval remain pending.
Offline checks and CI are not either approval. No game integration, timing changes,
runtime atlases, VFX, balance, rules, saves or public assets were changed.
The user explicitly limited writes to this folder, so this file also serves as
the Codex-to-Claude handoff instead of editing the repository-wide handoff docs.
Only Fateweave's own shipped seeds and original generated artwork were used.

## Seeds and facing — important integration detail

`units.webp` is 1024 x 1536: **two columns**, each cell 512 x 512.
Raider = cell 4, crop (0,1024,512,1536); Brute = cell 5,
crop (512,1024,1024,1536). `seeds.json` records the base and source blob.

The actual Raider atlas crop faces right. The owner explicitly chose
"ใช้ seed ที่ mirror เป็นซ้าย (แนะนำ)" in this chat. Thus
`raider-atlas-crop.png` preserves the original crop and `raider-seed.png` is its
exact horizontal mirror. Every delivered strip faces left. **Do not apply the
existing static Raider mirror a second time to these left-facing frames.**
Brute's seed is the exact unmodified shipped crop and already faces left.

Frame 1 of all strips is the exact seed placed at (256,64), without resizing,
repainting, alpha cleanup or compositing changes. Recovery-to-ready final frames
also use that exact seed. Down has no recovery or repeated standing frame.
Actual shipped sole coordinates are Raider y=493 and Brute y=496; delivered
logical sole lines are y=557 and y=560 respectively (64px canvas offset).

**Inherited seed concern:** the old atlas cells contain a tiny gold fragment at
the top border and Brute's tallest crystals approach/cross the original cell top.
Those pixels are preserved in the exact idle, not silently retouched. The larger
delivery canvas adds margins, but cannot reconstruct anything absent from the
original seed. Generated motion poses do not introduce that gold fragment.
An owner-authorized seed cleanup would be a separate art decision.

## Frame order and suggested intents

| Strip (`raw/`, all `-r1.png`) | Frames, left to right | Suggested intent |
| --- | --- | --- |
| raider-raking-slash | ready; wind-up; deeper low anticipation; leftward blade contact; low follow-through; ready | Raking Slash |
| raider-shadow-knife | ready; free hand draws knife back; deeper coiled throw anticipation; free-hand release; arm follows through; ready | Shadow Knife |
| raider-hit | ready; backward recoil; deep flinch; ready | hit |
| raider-block | ready; raise blade guard; tight wrist-braced parry; ready | block |
| raider-down | ready; knees buckle; collapse; grounded closed-eye hold | down |
| brute-crushing-blow | ready; head lowers and arm draws back; deep crouched coil; downward claw contact; low follow-through; ready | Crushing Blow |
| brute-rift-bolt | ready; hands cup inward; deeper low coil; two open palms release to left; arms relax; ready | Rift Bolt |
| brute-hit | ready; recoil right; deeper flinch; ready | hit |
| brute-block | ready; forearms rise; crossed-arm brace; ready | block |
| brute-down | ready; buckle; collapse; grounded hold | down |

All clips play once. Down's last frame must be held while downed; never loop or
return to frame 1. Contact/release is frame 4 of each six-frame move. The listed
intents are artwork suggestions, not runtime mapping or timing changes.
Shadow Knife uses the free hand: the large hooked blade stays attached in all
frames, and no flying knife is painted. Brute casts with paired palms at chest
height; Crushing Blow has a visibly different downward hammer contact.

## Attempts and self-check

- Rejected Crushing Blow attempt 1: source's final ready silhouette reached the
  right edge (17 alpha>40 pixels on that edge), and figures crowded together.
  Regenerated the **entire six-frame strip**, requesting smaller figures and
  generous margins. The rejected output is not shipped as an alternate.
- Crushing Blow attempt 2 is the sole final R1. The other nine moves used their
  first completed whole-strip attempt after inspection.
- One earlier generation request ended without a saved result after the tool
  execution expired; it is not an artwork candidate and was not used.
- Generator ready figures are used to calibrate shared scale, but the shipped
  ready frames are exact seed lockbacks. Raider slash's generated last ready wing
  touches the source right boundary; that pose was rejected in favor of exact
  seed recovery. No clipped motion frame is retained.
- Inspected all sources: blade, free throwing hand, claws, wings and tails stay
  attached; anticipation lowers/coils; frame 4 reads as contact/release; no VFX.
- Inspected the 390px dark-background storyboard: slash versus throw, hammer
  versus palm cast, recoil versus guard and both grounded holds read separately.
  This is a static artwork review, **not** in-game motion validation.

## Delivery geometry and reproducibility

`source-sheets/` contains ten **untouched** generator PNG outputs, one entire move
per file. `prompts.json` records prompts and the rejected attempt. `templates/`
contains transparent layouts derived from the approved seed, not more candidates.
`seeds/` contains exact crops/mirror as described above.

`raw/` contains ten horizontal RGBA PNG strips with 1024 x 704 slots (6 or 4
frames). These spacious delivery slots are **not a proposed runtime texture
budget**. The intake can trim/deduplicate/pack losslessly. Preserve logical source
offsets and use the metadata's sole anchor when doing so.

The build separates connected silhouettes by nearest-component ownership rather
than cutting overlapping bounding rectangles. It retains antialias pixels within
12px of the corresponding silhouette. One shared scale per whole strip is
calibrated from its conventional ready figure against the seed's main body;
no individual frame is resized to fill its slot. Frame translations align the
actual planted soles/grounded corpse contact. `strips.json` records every source
box, crop, scale, paste offset, output alpha bounds and measured clear gutter.
Source-to-delivery scale factors differ because generator source resolution/body
occupancy differs; they are not different intended in-game body scales.

Run from any directory with Pillow, NumPy and SciPy available:

```sh
python3 -I incoming/ART-UNIT-ANIMATION-A10-001/build_handoff.py
python3 -I incoming/ART-UNIT-ANIMATION-A10-001/build_handoff.py --verify
```

The supplied source PNGs/seeds/templates/prompts/notes are inputs. Offline raw
strips, storyboard, strip metadata and validation manifest reproduce without a
generation service. Image generation itself is not deterministic. Preview is
390px wide, two columns per storyboard, every frame at the same review scale.

`validation.json` lists SHA-256 and byte size of every other delivered file.
It excludes its own recursive hash; verify the manifest itself by comparing its
fetched Git blob/bytes against the committed local manifest. After normal Git
push, fetch the pushed branch into a fresh verification repository, extract only
this folder, compare all hashes/bytes and run Pillow verify **and** full load on
every PNG. This explicitly covers files above the prior ~768KB truncation point.

## Handoff to Claude

Owner artwork and motion approval are still required. Integration belongs to
Claude: review artwork with owner, trim/pack within runtime budgets, map the real
intents/reactions without changing rules/save/balance/timing, retain optional
loading/fallback/reduced-motion, and supply actual 390px game clips for motion
review. Do not infer approval from this package or its checks.
