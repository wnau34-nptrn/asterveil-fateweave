"""Regenerate the human-readable intake inventory after build_package.py."""
from pathlib import Path
import json

root=Path(__file__).resolve().parent
m=json.loads((root/'provenance/manifest.json').read_text())
lines=['# ART-CHAR-MERC-ENEMY-001 intake notes','',
'Original character-art package for Asterveil Fateweave. Generated on 2026-10-15 using the built-in image_gen tool. No external repository art, named-artist imitation or trademarked designs were imported.',
'',f'Base branch: `feature/fateweave-initial-prototype`; base commit: `{m["base_commit"]}`. Delivery branch: `art/art-char-merc-enemy-001`.',
'','## Delivery and budget','',
f'Runtime WebP total: **{m["runtime_bytes"]:,} bytes** ({m["runtime_bytes"]/1_000_000:.6f} MB), counting all 30 standalone WebPs and all four atlases. Limit: 2,000,000 bytes. PNG copies and review images are excluded from that runtime budget.',
'',f'**Declared deviation from the requested approximate quality 85:** the final WebPs use quality **{m["webp_quality"]}**, method 4, with RGB texture detail filtered through a {m["runtime_color_detail_grid"]}px grid and exported on the required 512px frame grid. Quality 85 could not fit the strict budget when both standalone and atlas copies were counted. PNG copies retain full 512px detail; unit alpha is identical between PNG and WebP. Review sheets use decoded runtime WebPs, so compression is visible for intake review.',
'','All exports include an sRGB ICC profile. Individual full bodies are 512x512 RGBA PNG and RGBA WebP; portraits are 512x512 RGB PNG and RGB WebP. Unit PNG alpha has source glow fringe removed and only resampling edge antialiasing. No cast shadows are baked into units.',
'','## Atlas contract','',
'Two columns, 512px cells, row-major table order. Mercenary atlases: 1024x1536. Foe atlases: 1024x2560, bottom-right slot entirely transparent. Four same-basename JSON maps contain x, y, w, h and footY. Portrait maps use the corresponding unit footY for identity/anchor association; portrait images themselves are not ground-anchored.',
'','Every unit uses frame-local **footY=496**, the last visible sole/foot or floating robe-tip scanline (0-based), not atlas-global Y. For atlas-global grounding use frame.y + footY. Keep the full cell when sampling. Shared horizontal frame center is x=256. Minimum transparent padding is 8px, or 4px for Sentinel; exact nonzero-alpha bounds appear below.',
'','## Character anchors, palettes and source provenance','',
'| ID | Facing | footY | Alpha bounds x0,y0,x1,y1 (exclusive max) | Palette |',
'|---|---|---:|---|---|']
for c in m['characters']: lines.append(f'| {c["id"]} | {c["facing"]} | {c["footY"]} | {c["bounds"]} | {c["palette"]} |')
lines += ['','Selected generation filenames and SHA-256 digests are in `provenance/manifest.json`; the prompt set and corrective iterations are documented in `PROMPTS.md`. `provenance/selected-sources.json` records the imagegen filenames needed to rebuild from the local raw generations.',
'','## Validation checklist','',
'- [x] 15 full-body idle frames, 512x512 RGBA, correct facing, shared baseline recorded',
'- [x] 15 portraits, 512x512, visually checked at 40px in a circle',
'- [x] 4 atlases and 4 JSON frame maps in the two-column 512px format',
'- [x] Line-up, silhouette, in-arena and on-map review sheets',
'- [x] 64px silhouettes visually checked, including against four heroes and two existing foes',
'- [x] Elites show gold; Sentinel shows gold and violet; normals have no gold tier ornament',
'- [x] No text, logos or copied character designs; new frames checked on light/dark for edge fringe',
'- [x] All runtime WebPs together are under 2.0 MB; existing source-art hashes unchanged',
'- [x] Notes, file sizes, anchors, palettes, generation provenance and hashes included',
'','The checklist records the producer checks; subjective style acceptance and the declared encoding deviation remain visible for Claude Asset Intake Review. Optional attack/hit poses were not produced. No gameplay, UI, stats or encounter changes are included.',
'','## Review guide','',
'`review/lineup-mercs.png`: existing heroes first, then six mercenaries. `review/lineup-foes.png`: Raider and Brute first, then nine foes. Both use one pixel scale. Existing atlas frames contain a few boundary/adjacent-row specks visible in the unchanged reference previews; these are not new sprite pixels.',
'','`review/silhouettes.png`: 15 new characters then six existing references, row-major, each silhouette 64px high. `review/in-arena.png`: two mercenaries (Spear/Archer), two heroes (Knight/Mage), two foes (Mycon/Sentinel), original backdrop. `review/on-map.png`: Matriarch/Juggernaut/Sentinel at about 1.5 world tiles. `review/portraits-40px.png` and `review/gameplay-160px.png` provide actual gameplay-size QA. All image sheets have no text labels.',
'','## Existing-art SHA-256 check','',
'Every hash below was compared against `git show <base_commit>:<path>` and against the working file after export. All match. The complete original six-frame unit atlas, complete six-frame portrait atlas, backdrop and all world WebPs are unchanged. No file under src/, tests/, .github/ or public/ is changed.',
'','| Unchanged path | SHA-256 |','|---|---|']
for p,h in m['unchanged_original_sha256'].items(): lines.append(f'| `{p}` | `{h}` |')
lines += ['','## Inventory','',
'Sizes below are exact on-disk bytes for every package file other than this self-describing NOTES.md. Package-wide byte totals are reported separately in the PR. PNGs are build/review copies; only WebPs count toward the runtime budget.',
'','| File | Bytes |','|---|---:|']
for p in sorted(root.rglob('*')):
    if p.is_file() and p.name!='NOTES.md': lines.append(f'| `{p.relative_to(root).as_posix()}` | {p.stat().st_size} |')
lines += ['','## Reproduction','',
'With Pillow installed, run `build_package.py --source-dir <local imagegen output folder>` and then `write_notes.py`. Both scripts only write beneath this package. Raw imagegen generations are not committed; the normalized lossless PNG deliverables are retained for developer recompression. Model-version metadata was not exposed by the built-in image generation tool; no exact model version is asserted.',
'','Ready for Claude Asset Intake Review.','']
(root/'NOTES.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps(dict(package_bytes=sum(p.stat().st_size for p in root.rglob('*') if p.is_file()),runtime_bytes=m['runtime_bytes'],files=sum(p.is_file() for p in root.rglob('*')))))
