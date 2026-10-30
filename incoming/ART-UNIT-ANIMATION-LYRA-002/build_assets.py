"""Append LYRA-002 Mark / Parry stance to the shipped Lyra pilot sheet (frames 22-29 and 30-37), then lossless-pack.
Requires Pillow and NumPy. Run from anywhere: python3 -I incoming/ART-UNIT-ANIMATION-LYRA-002/build_assets.py

Geometry: Codex placed the exact pilot seed at (256, 64) of a 1024x640 cell (strips.json `seed_offset_xy`, one shared
display scale). The pilot idle draws that seed at .5 with its top-left at (128, 240) of a 512 cell (PILOT-001
build_assets.py), so one uniform transform maps every delivery cell: scale .5, paste at (0, 208). No per-frame scaling.
The seed end frames are the shipped frame 0 itself, so entering or leaving a gesture cannot pop.
"""
from pathlib import Path
from PIL import Image
import numpy as np
import hashlib, io, json

ROOT = Path(__file__).resolve().parents[2]; HERE = Path(__file__).resolve().parent
OUT = ROOT / 'public/assets/units'; MANIFEST = ROOT / 'src/game/visuals/unit-atlases.json'
MOVES = ['mark', 'parry-stance']  # -> frames 22-29, 30-37
SHIPPED = 22


def grid_cell(sheet, i):
    x, y = (i % 4) * 512, (i // 4) * 512
    return sheet.crop((x, y, x + 512, y + 512))


source = Image.open(OUT / 'lyra_pilot.webp').convert('RGBA')
assert source.size in ((2048, 3072), (2048, 5120)), source.size  # shipped 22-cell grid, or this script's own output (rerun)
cells = [grid_cell(source, i) for i in range(SHIPPED)]
idle = cells[0]
check = {}
for move in MOVES:
    strip = json.loads((HERE / 'strips.json').read_text())
    meta = next(s for s in strip if s['move'] == move)
    assert meta['seed_offset_xy'] == [256, 64] and meta['shared_logical_display_scale'] == 1.0, meta['move']
    for k in range(8):
        delivered = Image.open(HERE / 'cells' / move / f'{k:03d}.png').convert('RGBA')
        assert delivered.size == (1024, 640)
        small = delivered.resize((512, 320), Image.Resampling.LANCZOS)
        cell = Image.new('RGBA', (512, 512)); cell.alpha_composite(small.crop((0, 0, 512, 304)), (0, 208))
        # Resampling leaves faint alpha in the empty gutter; drop it like the pilot build (alpha < 4) so trims stay tight.
        px = np.array(cell); px[:, :, 3] = np.where(px[:, :, 3] < 4, 0, px[:, :, 3]); px[px[:, :, 3] == 0] = 0; cell = Image.fromarray(px)
        lost = np.array(small)[304:, :, 3]
        assert lost.max() < 8, (move, k, 'content below the cell')  # soles sit at y575 -> 495.5
        if k in (0, 7):
            # Exact seed ends: compare with the shipped idle, then use the shipped pixels.
            a, b = np.array(cell).astype(int), np.array(idle).astype(int)
            check[f'{move}/{k:03d}'] = {'meanAlphaDiff': float(np.abs(a[:, :, 3] - b[:, :, 3]).mean()), 'maxAlphaDiff': int(np.abs(a[:, :, 3] - b[:, :, 3]).max())}
            cell = idle.copy()
        cells.append(cell)
assert len(cells) == 38

# Keep the grid source (the packer's input and the A-pilot convention), then pack trimmed, aliased tiles.
grid = Image.new('RGBA', (2048, 512 * 10))
for i, cell in enumerate(cells):
    grid.alpha_composite(cell, ((i % 4) * 512, (i // 4) * 512))
grid.save(OUT / 'lyra_pilot.webp', lossless=True, exact=True, method=6)


def pack(rects, width):
    placed = {}; y = 2; x = 2; height = 0
    for key, tile in sorted(rects.items(), key=lambda kv: (-kv[1].height, -kv[1].width, kv[0])):
        if tile.width + 4 > width: return None
        if x + tile.width + 2 > width: y += height + 4; x = 2; height = 0
        placed[key] = (x, y); x += tile.width + 4; height = max(height, tile.height)
    return placed, y + height + 2


unique, ids, boxes = {}, {}, {}
for i, cell in enumerate(cells):
    box = cell.getchannel('A').getbbox(); assert box
    ident = hashlib.sha256(cell.tobytes()).hexdigest(); ids[str(i)] = ident; boxes[str(i)] = box
    unique.setdefault(ident, cell.crop(box))
plans = [(w * p[1], w, p) for w in [1024, 1280, 1536, 1792, 2048] if (p := pack(unique, w)) and p[1] <= 4096]
_, width, (positions, height) = min(plans)
atlas = Image.new('RGBA', (width, height))
for ident, tile in unique.items(): atlas.paste(tile, positions[ident])
buf = io.BytesIO(); atlas.save(buf, format='WEBP', lossless=True, exact=True, method=6); image_bytes = buf.getvalue()
image_name = f'lyra_pilot.{hashlib.sha256(image_bytes).hexdigest()[:12]}.webp'
frames = {}
for frame, ident in ids.items():
    x, y = positions[ident]; tile = unique[ident]; l, t, r, b = boxes[frame]
    frames[frame] = {'frame': {'x': x, 'y': y, 'w': tile.width, 'h': tile.height}, 'rotated': False, 'trimmed': True,
                     'spriteSourceSize': {'x': l, 'y': t, 'w': r - l, 'h': b - t}, 'sourceSize': {'w': 512, 'h': 512}}
data = {'frames': frames, 'meta': {'image': image_name, 'size': {'w': width, 'h': height}, 'scale': '1'}}
raw = json.dumps(data, sort_keys=True, separators=(',', ':')).encode()
json_name = f'lyra_pilot.{hashlib.sha256(raw).hexdigest()[:12]}.json'

# Lossless round trip of every frame before anything is written.
packed = Image.open(io.BytesIO(image_bytes)).convert('RGBA')
for frame, info in frames.items():
    s, box = info['frame'], info['spriteSourceSize']
    rebuilt = Image.new('RGBA', (512, 512)); rebuilt.paste(packed.crop((s['x'], s['y'], s['x'] + s['w'], s['y'] + s['h'])), (box['x'], box['y']))
    a, b = np.array(cells[int(frame)]), np.array(rebuilt)
    assert np.array_equal(a[:, :, 3], b[:, :, 3]) and np.array_equal(a[a[:, :, 3] > 0], b[a[:, :, 3] > 0]), frame

manifest = json.loads(MANIFEST.read_text())
for old in (manifest['lyra']['image'], manifest['lyra']['atlas']):
    if old not in (image_name, json_name): (OUT / old).unlink(missing_ok=True)
(OUT / image_name).write_bytes(image_bytes); (OUT / json_name).write_bytes(raw)
manifest['lyra'] = {'image': image_name, 'atlas': json_name, 'width': width, 'height': height, 'frames': 38,
                    'decodedBytes': width * height * 4, 'downloadBytes': len(raw) + len(image_bytes)}
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
report = {**manifest['lyra'], 'uniqueFrames': len(unique), 'transform': {'scale': .5, 'paste': [0, 208]}, 'seedEndCheck': check}
(HERE / 'integration.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
