#!/usr/bin/env python3
"""Runtime build for ART-UNIT-ANIMATION-LAKE-001 foes (map 4, phase 2): tide-slime, mist-wisp, stone-crab, mirror-shade.

Input: an extracted Codex package dir (incoming/ART-UNIT-ANIMATION-LAKE-001: seeds/, raw/, strips.json). Pass its path as the
first argument; every input's SHA-256 is checked against the package validation.json first. Output (lossless, no resizing):
  - the shared 22-frame body layout (25 with an idle loop) packed per `scripts/pack-unit-atlases.py` into public/assets/units
    and registered in src/game/visuals/unit-atlases.json. Frame 0 is the shipped ready seed; layout slots the package has no
    strip for (the other attack/skill clip of that foe) alias frame 0, so they cost nothing and are never drawn;
  - the still sheet units_foes3.webp (2 columns, 512 px cells, frames 0-3) and the portrait sheet portraits_foes3.webp, a
    square crop of each seed's figure (the package ships no portrait art; the owner has not asked for a painted bust yet).
Phase 3 appends the R1 elites to frames 4 and 5 and gives each move its own frame range.
Usage: python3 -I scripts/build-lake-foes.py <package dir> [--elites]
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
ACTORS = {'tide-slime': ('tideslime', 22), 'mist-wisp': ('mistwisp', 25), 'stone-crab': ('stonecrab', 22), 'mirror-shade': ('mirrorshade', 22)}
elite_layouts = {
    'shadow-serpent': {'Shadow Fang': 1, 'Venom Spit': 9, 'Coil Gathering': 22, 'Crushing Coil': 30, 'hit': 17, 'down': 19},
    'weeping-siren': {'Tide Lash': 1, 'Weeping Song': 9, 'Drowning Call': 22, 'hit': 17, 'down': 19},
}
elites = sys.argv[2:] == ['--elites']
assert not sys.argv[2:] or elites, 'Expected --elites'
if elites:
    ACTORS = {'shadow-serpent': ('shadowserpent', 38), 'weeping-siren': ('weepingsiren', 30)}
sha = lambda b: hashlib.sha256(b).hexdigest()

validation = json.loads((pkg / 'validation.json').read_text())
listed = validation['files']
def checked(path):
    rel = str(Path(path).relative_to(pkg)); assert sha(Path(path).read_bytes()) == listed[rel]['sha256'], rel
    return path
strips = json.loads((pkg / 'strips.json').read_text())['strips']

def cells(path, n):
    strip = Image.open(checked(path)).convert('RGBA'); assert strip.size == (512 * n, 512), (path, strip.size)
    return [strip.crop((i * 512, 0, i * 512 + 512, 512)) for i in range(n)]

def pack(rects, width):
    placed = {}; y = 2; x = 2; height = 0
    for key, tile in sorted(rects.items(), key=lambda kv: (-kv[1].height, -kv[1].width, kv[0])):
        if tile.width + 4 > width: return None
        if x + tile.width + 2 > width: y += height + 4; x = 2; height = 0
        placed[key] = (x, y); x += tile.width + 4; height = max(height, tile.height)
    return placed, y + height + 2

manifest = json.loads((ROOT / 'src/game/visuals/unit-atlases.json').read_text()); report = {}
seeds = {}
for actor, (key, total) in ACTORS.items():
    seed = Image.open(checked(pkg / f'seeds/{actor}-r1-ready.png')).convert('RGBA'); assert seed.size == (512, 512); seeds[actor] = seed
    logical = {0: seed}
    for s in (s for s in strips if s['actor'] == actor and s['variant'] == 'r1'):
        indices = s['seedLayoutIndices']
        if elites:
            start = elite_layouts[actor][s['intent']]
            indices = range(start, start + s['frames'])
        for idx, cell in zip(indices, cells(pkg / s['file'], s['frames']), strict=True):
            assert idx not in logical, (actor, idx); logical[idx] = cell
    if elites:
        assert set(logical) == set(range(total)), (actor, sorted(logical))
    else:
        for i in range(total): logical.setdefault(i, seed)
    unique, ids, boxes = {}, {}, {}
    for i in range(total):
        cell = logical[i]; box = cell.getchannel('A').getbbox(); assert box, (actor, i)
        ident = sha(cell.tobytes()); ids[str(i)] = ident; boxes[str(i)] = box
        unique.setdefault(ident, cell.crop(box))
    candidates = []
    widths = range(512, 2049) if elites else [512, 768, 1024, 1280, 1536, 2048]
    for width in widths:
        plan = pack(unique, width)
        if plan and plan[1] <= 4096: candidates.append((width * plan[1], width, plan))
    if elites:
        # Prefer the smallest maximum dimension to fit more GPUs without scaling the art.
        _, width, (positions, height) = min(candidates, key=lambda c: (max(c[1], c[2][1]), c[0]))
    else:
        _, width, (positions, height) = min(candidates)
    atlas = Image.new('RGBA', (width, height))
    for ident, tile in unique.items(): atlas.paste(tile, positions[ident])
    buf = io.BytesIO(); atlas.save(buf, format='WEBP', lossless=True, exact=True, method=6); image_bytes = buf.getvalue()
    image_name = f'{key}_lake.{sha(image_bytes)[:12]}.webp'
    frames = {}
    for frame, ident in ids.items():
        x, y = positions[ident]; tile = unique[ident]; left, top, right, bottom = boxes[frame]
        frames[frame] = {'frame': {'x': x, 'y': y, 'w': tile.width, 'h': tile.height}, 'rotated': False, 'trimmed': True,
                         'spriteSourceSize': {'x': left, 'y': top, 'w': right - left, 'h': bottom - top}, 'sourceSize': {'w': 512, 'h': 512}}
    raw = json.dumps({'frames': frames, 'meta': {'image': image_name, 'size': {'w': width, 'h': height}, 'scale': '1'}}, sort_keys=True, separators=(',', ':')).encode()
    json_name = f'{key}_lake.{sha(raw)[:12]}.json'
    # Pixel-exact reconstruction of every logical frame (alpha and visible RGB).
    packed = Image.open(io.BytesIO(image_bytes)).convert('RGBA')
    for frame, info in frames.items():
        src = info['frame']; box = info['spriteSourceSize']; rebuilt = Image.new('RGBA', (512, 512))
        rebuilt.paste(packed.crop((src['x'], src['y'], src['x'] + src['w'], src['y'] + src['h'])), (box['x'], box['y']))
        a = np.array(logical[int(frame)]); b = np.array(rebuilt)
        assert np.array_equal(a[:, :, 3], b[:, :, 3]) and np.array_equal(a[a[:, :, 3] > 0], b[a[:, :, 3] > 0]), (actor, frame)
    for old in UNITS.glob(f'{key}_lake.*'): old.unlink()
    (UNITS / image_name).write_bytes(image_bytes); (UNITS / json_name).write_bytes(raw)
    manifest[key] = {'image': image_name, 'atlas': json_name, 'width': width, 'height': height, 'frames': total, 'decodedBytes': width * height * 4, 'downloadBytes': len(raw) + len(image_bytes)}
    report[key] = {**manifest[key], 'uniqueFrames': len(unique)}
(ROOT / 'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest, indent=2) + '\n')

# Replace only the cells for this phase, preserving art from the other phases.
def open_sheet(name):
    path = ART / f'{name}.webp'
    if elites or path.exists():
        return Image.open(path).convert('RGBA')
    return Image.new('RGBA', (1024, 2560))

units = open_sheet('units_foes3')
portraits = open_sheet('portraits_foes3')
for n, seed in enumerate(seeds.values(), start=4 if elites else 0):
    x, y = (n % 2) * 512, (n // 2) * 512
    units.paste((0, 0, 0, 0), (x, y, x + 512, y + 512))
    units.alpha_composite(seed, (x, y))
    portraits.paste((0, 0, 0, 0), (x, y, x + 512, y + 512))
    l, t, r, b = seed.getchannel('A').getbbox(); side = int(max(r - l, b - t) * 1.1); cx, cy = (l + r) // 2, (t + b) // 2
    crop = seed.crop((cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)).resize((480, 480), Image.LANCZOS)
    portraits.alpha_composite(crop, (x + 16, y + 16))
for name, im in (('units_foes3', units), ('portraits_foes3', portraits)):
    buf = io.BytesIO(); im.save(buf, 'WEBP', lossless=True, exact=True, method=6); (ART / f'{name}.webp').write_bytes(buf.getvalue()); report[name] = {'bytes': len(buf.getvalue()), 'sha8': sha(buf.getvalue())[:8]}
out = ROOT / 'docs/validation/map4-lake'
(out / ('elites-runtime.json' if elites else 'foes-runtime.json')).write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
