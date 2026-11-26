#!/usr/bin/env python3
"""Runtime build for ART-UNIT-ANIMATION-MINE-BOSS-001 (map 5, phase 4b): the R1 Crystal Giant, its fragment and their VFX.

Usage: python3 -I scripts/build-mine-boss.py <package dir>
Every input's SHA-256 is checked against the package validation.json first. Output (lossless WebP, every packed frame
verified pixel-identical to its normalized cell):
  - crystalgiant_mine.<hash>: the 26-frame giant layout (Codex cell 768, soles at 672 = 7/8) at a 448 px runtime cell, so
    the atlas fits one 2048 px texture; crystalfragment_mine.<hash>: the 10-frame fragment (cell 512, soles 497) at 256 px.
    Both are registered in src/game/visuals/unit-atlases.json.
  - units_foes4/portraits_foes4 grow to 4 rows: frame 5 = giant, frame 6 = fragment (the five mine foes keep their pixels).
  - public/assets/fx/mine_boss_fx.{webp,json}: the 16 VFX layers at their shipped 256 px pixels; src/game/visuals/mine-boss-art.json
    keeps each layer's anchor, role and Codex's timing from strips.json.
Requires Pillow and NumPy.
"""
import hashlib, io, json, runpy, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
UNITS, ART, FX = ROOT / 'public/assets/units', ROOT / 'public/assets/art', ROOT / 'public/assets/fx'
PKG = Path(sys.argv[1])
LISTED = json.loads((PKG / 'validation.json').read_text())['files']
STRIPS = json.loads((PKG / 'strips.json').read_text())
PACKING = runpy.run_path(str(ROOT / 'scripts/repack-atlas-lossless.py'))
sha = lambda b: hashlib.sha256(b).hexdigest()


def checked(rel):
    data = (PKG / rel).read_bytes(); assert sha(data) == LISTED[rel]['sha256'], rel
    image = Image.open(io.BytesIO(data)); image.load(); return image.convert('RGBA')


def webp(image):
    buf = io.BytesIO(); image.save(buf, 'WEBP', lossless=True, exact=True, method=6); return buf.getvalue()


def pack(images, cell):
    """Trim, share identical frames, MaxRects-pack under 2048 px and verify the decoded atlas against every cell."""
    boxes = {n: im.getchannel('A').getbbox() for n, im in images.items()}; assert all(boxes.values())
    ids, unique = {}, {}
    for n, im in images.items():
        key = sha(im.tobytes()); ids[n] = key; unique.setdefault(key, im.crop(boxes[n]))
    sizes = {k: t.size for k, t in unique.items()}
    best = None
    for width in range(max(w for w, _ in sizes.values()) + PACKING['PAD'], PACKING['MAX_SIDE'] + 1, 8):
        for order in PACKING['ORDERS']:
            positions, height = PACKING['maxrects'](sizes, width, order)
            score = (width * height, max(width, height))
            if height <= PACKING['MAX_SIDE'] and (best is None or score < best[0]): best = (score, width, height, positions)
    assert best, 'frames do not fit one 2048 px texture'
    _, width, height, positions = best
    texture = Image.new('RGBA', (width, height))
    for key, tile in unique.items(): texture.paste(tile, (positions[key][0] + 1, positions[key][1] + 1))
    frames = {}
    for n in images:
        (x, y), tile, (l, t, _, _) = positions[ids[n]], unique[ids[n]], boxes[n]
        frames[n] = {'frame': {'x': x + 1, 'y': y + 1, 'w': tile.width, 'h': tile.height}, 'rotated': False, 'trimmed': True,
                     'spriteSourceSize': {'x': l, 'y': t, 'w': tile.width, 'h': tile.height}, 'sourceSize': {'w': cell, 'h': cell}}
    data = webp(texture)
    decoded = Image.open(io.BytesIO(data)).convert('RGBA')
    for n, f in frames.items():
        a, b = np.asarray(images[n]), np.asarray(PACKING['source_canvas'](decoded, f))
        assert np.array_equal(a[..., 3], b[..., 3]) and np.array_equal(a[a[..., 3] > 0], b[a[..., 3] > 0]), n
    return data, frames, (width, height), len(unique)


def defringe(image):
    """Resampling leaves faint alpha dust; drop alpha below 3 so trims stay tight (visible pixels are untouched)."""
    arr = np.array(image); arr[arr[..., 3] < 3] = 0; return Image.fromarray(arr)


manifest_path = ROOT / 'src/game/visuals/unit-atlases.json'
manifest = json.loads(manifest_path.read_text()); report = {}
seeds = {}
for unit, key, folder, runtime in (('giant', 'crystalgiant', 'frames', 448), ('fragment', 'crystalfragment', 'frames/fragment', 256)):
    meta = STRIPS[unit]; cell, total = meta['logicalCell'], meta['frames']
    assert meta['facing'] == 'left'
    frames = {}
    for i in range(total):
        im = checked(f'{folder}/{i:03d}.png'); assert im.size == (cell, cell), (unit, i)
        frames[str(i)] = defringe(im.resize((runtime, runtime), Image.Resampling.LANCZOS))
    seeds[unit] = checked(f'{folder}/000.png')
    data, layout, (w, h), uniq = pack(frames, runtime)
    image_name = f'{key}_mine.{sha(data)[:12]}.webp'
    raw = json.dumps({'frames': layout, 'meta': {'image': image_name, 'size': {'w': w, 'h': h}, 'scale': '1'}}, sort_keys=True, separators=(',', ':')).encode()
    json_name = f'{key}_mine.{sha(raw)[:12]}.json'
    for old in UNITS.glob(f'{key}_mine.*'): old.unlink()
    (UNITS / image_name).write_bytes(data); (UNITS / json_name).write_bytes(raw)
    manifest[key] = {'image': image_name, 'atlas': json_name, 'width': w, 'height': h, 'frames': total, 'decodedBytes': w * h * 4, 'downloadBytes': len(raw) + len(data)}
    report[key] = {**manifest[key], 'sourceCell': cell, 'runtimeCell': runtime, 'soleOrigin': meta['footY'] / cell, 'uniqueFrames': uniq,
                   'top': layout['0']['spriteSourceSize']['y'] / runtime}
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')

# Stills and portraits: append a fourth row to the foes4 sheets, leaving frames 0-4 pixel-identical.
for name in ('units_foes4', 'portraits_foes4'):
    old = Image.open(ART / f'{name}.webp').convert('RGBA'); assert old.size in ((1024, 1536), (1024, 2048)), name
    sheet = Image.new('RGBA', (1024, 2048)); sheet.paste(old.crop((0, 0, 1024, 1536)), (0, 0))
    for n, unit in ((5, 'giant'), (6, 'fragment')):
        seed = seeds[unit]; x, y = (n % 2) * 512, (n // 2) * 512
        if name == 'units_foes4':
            sheet.paste(defringe(seed.resize((512, 512), Image.Resampling.LANCZOS)), (x, y))
        else:
            l, t, r, b = seed.getchannel('A').getbbox(); cx = (l + r) // 2
            # The giant's face sits high on its chest: frame the head and shoulders; the low fragment shows whole.
            side, top = (int((r - l) * .62), t - 10) if unit == 'giant' else (int(max(r - l, b - t) * 1.1), (t + b) // 2 - int(max(r - l, b - t) * .55))
            crop = seed.crop((cx - side // 2, top, cx - side // 2 + side, top + side)).resize((480, 480), Image.Resampling.LANCZOS)
            sheet.paste(crop, (x + 16, y + 16))
    data = webp(sheet); (ART / f'{name}.webp').write_bytes(data); report[name] = {'bytes': len(data), 'sha8': sha(data)[:8]}

# VFX: shipped 256 px layers, packed as-is.
fx_meta, fx_images = {}, {}
for effect in STRIPS['effects']:
    for i, rel in enumerate(effect['frames']):
        name = Path(rel).stem; im = checked(rel); assert im.size == (256, 256), rel
        fx_images[name] = im
        fx_meta[name] = {'effect': effect['name'], 'anchor': effect['anchor'], 'role': effect['anchorRole'], 'ms': effect['durationMs'][i],
                         **({'sourceUv': effect['sourceUv']} if 'sourceUv' in effect else {})}
reduced = STRIPS['reducedMotion']
fx_images['collapse-reduced'] = checked('vfx/collapse-reduced.png')
fx_meta['collapse-reduced'] = {'effect': 'collapse', 'anchor': [.5, .83], 'role': 'target-feet', 'ms': 0}
data, layout, (w, h), _ = pack(fx_images, 256)
(FX / 'mine_boss_fx.webp').write_bytes(data)
(FX / 'mine_boss_fx.json').write_text(json.dumps({'frames': layout, 'meta': {'image': 'mine_boss_fx.webp', 'size': {'w': w, 'h': h}, 'scale': '1'}}, indent=1) + '\n')
(ROOT / 'src/game/visuals/mine-boss-art.json').write_text(json.dumps(fx_meta, indent=2) + '\n')
report['mine_boss_fx'] = {'width': w, 'height': h, 'bytes': len(data), 'reducedMotion': reduced}
(ROOT / 'docs/validation/map5-mine/boss-runtime.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
