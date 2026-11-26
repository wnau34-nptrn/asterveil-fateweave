#!/usr/bin/env python3
"""Runtime build for ART-UNIT-ANIMATION-MINE-001 (map 5): the five semi-chibi mine foes.

Input: an extracted Codex package dir (incoming/ART-UNIT-ANIMATION-MINE-001: frames/<unit>/NNN.png, strips.json). Pass its
path as the first argument; every input's SHA-256 is checked against the package validation.json first. Output (lossless,
no resizing):
  - each unit's full logical layout (22 frames, the bat 26 with its hover loop) packed per `scripts/pack-unit-atlases.py`
    into public/assets/units as `<key>_mine.<hash>` and registered in src/game/visuals/unit-atlases.json;
  - the still sheet units_foes4.webp (2 columns × 3 rows, 512 px cells, frames 0-4) and portraits_foes4.webp, a square crop
    of each ready frame's figure (the package ships no portrait art).
Usage: python3 -I scripts/build-mine-foes.py <package dir>
Requires Pillow and NumPy.
"""
import hashlib, io, json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
UNITS = ROOT / 'public/assets/units'
ART = ROOT / 'public/assets/art'
pkg = Path(sys.argv[1])
# Package unit -> (atlas key, still/portrait cell).
ACTORS = {'bat': ('crystalbat', 0), 'golem': ('oregolem', 1), 'worker': ('possessedworker', 2), 'overseer': ('mineoverseer', 3), 'eater': ('crystaleater', 4)}
sha = lambda b: hashlib.sha256(b).hexdigest()
listed = json.loads((pkg / 'validation.json').read_text())['files']
units_meta = json.loads((pkg / 'strips.json').read_text())['units']

def checked(path):
    rel = str(Path(path).relative_to(pkg)); assert sha(Path(path).read_bytes()) == listed[rel]['sha256'], rel
    return path

def pack(rects, width):
    placed = {}; y = 2; x = 2; height = 0
    for key, tile in sorted(rects.items(), key=lambda kv: (-kv[1].height, -kv[1].width, kv[0])):
        if tile.width + 4 > width: return None
        if x + tile.width + 2 > width: y += height + 4; x = 2; height = 0
        placed[key] = (x, y); x += tile.width + 4; height = max(height, tile.height)
    return placed, y + height + 2

manifest = json.loads((ROOT / 'src/game/visuals/unit-atlases.json').read_text()); report = {}
seeds = {}
for actor, (key, _) in ACTORS.items():
    total = units_meta[actor]['frames']
    logical = {}
    for i in range(total):
        cell = Image.open(checked(pkg / f'frames/{actor}/{i:03d}.png')).convert('RGBA'); assert cell.size == (512, 512), (actor, i)
        logical[i] = cell
    seeds[actor] = logical[0]
    unique, ids, boxes = {}, {}, {}
    for i in range(total):
        cell = logical[i]; box = cell.getchannel('A').getbbox(); assert box, (actor, i)
        ident = sha(cell.tobytes()); ids[str(i)] = ident; boxes[str(i)] = box
        unique.setdefault(ident, cell.crop(box))
    candidates = []
    for width in range(512, 2049, 64):
        plan = pack(unique, width)
        if plan and plan[1] <= 4096: candidates.append((max(width, plan[1]), width * plan[1], width, plan))
    _, _, width, (positions, height) = min(candidates)
    atlas = Image.new('RGBA', (width, height))
    for ident, tile in unique.items(): atlas.paste(tile, positions[ident])
    buf = io.BytesIO(); atlas.save(buf, format='WEBP', lossless=True, exact=True, method=6); image_bytes = buf.getvalue()
    image_name = f'{key}_mine.{sha(image_bytes)[:12]}.webp'
    frames = {}
    for frame, ident in ids.items():
        x, y = positions[ident]; tile = unique[ident]; left, top, right, bottom = boxes[frame]
        frames[frame] = {'frame': {'x': x, 'y': y, 'w': tile.width, 'h': tile.height}, 'rotated': False, 'trimmed': True,
                         'spriteSourceSize': {'x': left, 'y': top, 'w': right - left, 'h': bottom - top}, 'sourceSize': {'w': 512, 'h': 512}}
    raw = json.dumps({'frames': frames, 'meta': {'image': image_name, 'size': {'w': width, 'h': height}, 'scale': '1'}}, sort_keys=True, separators=(',', ':')).encode()
    json_name = f'{key}_mine.{sha(raw)[:12]}.json'
    # Pixel-exact reconstruction of every logical frame (alpha and visible RGB).
    packed = Image.open(io.BytesIO(image_bytes)).convert('RGBA')
    for frame, info in frames.items():
        src = info['frame']; box = info['spriteSourceSize']; rebuilt = Image.new('RGBA', (512, 512))
        rebuilt.paste(packed.crop((src['x'], src['y'], src['x'] + src['w'], src['y'] + src['h'])), (box['x'], box['y']))
        a = np.array(logical[int(frame)]); b = np.array(rebuilt)
        assert np.array_equal(a[:, :, 3], b[:, :, 3]) and np.array_equal(a[a[:, :, 3] > 0], b[a[:, :, 3] > 0]), (actor, frame)
    for old in UNITS.glob(f'{key}_mine.*'): old.unlink()
    (UNITS / image_name).write_bytes(image_bytes); (UNITS / json_name).write_bytes(raw)
    manifest[key] = {'image': image_name, 'atlas': json_name, 'width': width, 'height': height, 'frames': total, 'decodedBytes': width * height * 4, 'downloadBytes': len(raw) + len(image_bytes)}
    report[key] = {**manifest[key], 'uniqueFrames': len(unique), 'top': boxes['0'][1]}
(ROOT / 'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest, indent=2) + '\n')

units = Image.new('RGBA', (1024, 1536)); portraits = Image.new('RGBA', (1024, 1536))
for actor, (_, n) in ACTORS.items():
    seed = seeds[actor]; x, y = (n % 2) * 512, (n // 2) * 512
    units.alpha_composite(seed, (x, y))
    l, t, r, b = seed.getchannel('A').getbbox(); side = int(max(r - l, b - t) * 1.1); cx, cy = (l + r) // 2, (t + b) // 2
    crop = seed.crop((cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)).resize((480, 480), Image.LANCZOS)
    portraits.alpha_composite(crop, (x + 16, y + 16))
for name, im in (('units_foes4', units), ('portraits_foes4', portraits)):
    buf = io.BytesIO(); im.save(buf, 'WEBP', lossless=True, exact=True, method=6); (ART / f'{name}.webp').write_bytes(buf.getvalue()); report[name] = {'bytes': len(buf.getvalue()), 'sha8': sha(buf.getvalue())[:8]}
out = ROOT / 'docs/validation/map5-mine'
(out / 'foes-runtime.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
