"""WB-A normalization: World Boss Kragmor (art identity foe_kragmor, sheet `kragmor`).

Codex strips (strips/*.png, 1024 px cells, shared body scale, sole y=896, foot column x=512, SHA-256 in validation.json) are
never edited. Frame layout (mirrored in src/game/visuals/unit-frames.ts), same as the A9 bosses: 0 idle (exact seed = the ready
frame of every strip); each action adds its four unique frames [wind-up, anticipation, contact, follow-through] (strip frames
2..5; the strip's first and last frames are the seed); hit adds [recoil, brace] (strip 2..3); down adds [buckle, collapse, hold]
(strip 2..4). Whole cell scaled by ONE factor (texture budget only; runtime displayRatio stays 2), soft edges defringed from the
nearest opaque pixel, then lossless trim/dedup/pack, verified pixel for pixel. Run: python3 -I build_assets.py [--factor=N] [--write]
"""
from pathlib import Path
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt
import numpy as np
import hashlib, json, io, sys
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]; OUT = ROOT / 'public/assets/units'
CELL = 1024; KEY = 'kragmor'
ACTIONS = ['stone-fist', 'titan-gathering', 'mountain-fall', 'rift-quake', 'boulder-hurl', 'fault-awakening']
FACTOR = .5
for a in sys.argv:
    if a.startswith('--factor='): FACTOR = float(a[9:])
WRITE = '--write' in sys.argv
def pack(tiles, width):
    x = y = 2; row = 0; positions = {}
    for key, tile in sorted(tiles.items(), key=lambda p: (-p[1].height, -p[1].width, p[0])):
        if tile.width + 4 > width: return None
        if x + tile.width + 2 > width: y += row + 4; x = 2; row = 0
        positions[key] = (x, y); x += tile.width + 4; row = max(row, tile.height)
    return positions, y + row + 2
def defringe(img):
    a = np.array(img); alpha = np.where(a[:, :, 3] < 4, 0, a[:, :, 3]).astype(np.uint8)
    solid = alpha >= 250; _, idx = distance_transform_edt(~solid, return_indices=True)
    soft = (alpha > 0) & (alpha < 250); rgb = a[:, :, :3].copy(); rgb[soft] = a[:, :, :3][idx[0], idx[1]][soft]
    return Image.fromarray(np.dstack([rgb, alpha]))
validation = json.loads((HERE / 'validation.json').read_text())['files']
def strip_cells(name, count):
    rel = f'strips/{name}.png'; data = (HERE / rel).read_bytes()
    assert hashlib.sha256(data).hexdigest() == validation[rel]['sha256'], rel
    img = Image.open(io.BytesIO(data)).convert('RGBA'); assert img.size == (CELL * count, CELL), (rel, img.size)
    return [img.crop((i * CELL, 0, (i + 1) * CELL, CELL)) for i in range(count)], validation[rel]['sha256']
def same(a, b): a, b = np.array(a), np.array(b); return bool(np.array_equal(a[:, :, 3], b[:, :, 3]) and np.array_equal(a[a[:, :, 3] > 0], b[a[:, :, 3] > 0]))
cells = []; layout = {}; shas = {}; seedmatch = {}
first, shas['stone-fist'] = strip_cells('stone-fist', 6); seed = first[0]; cells.append(seed)
for name in ACTIONS:
    fs, shas[name] = strip_cells(name, 6) if name != 'stone-fist' else (first, shas['stone-fist'])
    seedmatch[name] = [same(fs[0], seed), same(fs[5], seed)]; assert all(seedmatch[name]), name
    layout[name] = len(cells); cells += fs[1:5]
for name, count, take in (('hit', 4, slice(1, 3)), ('down', 4, slice(1, 4))):
    fs, shas[name] = strip_cells(name, count); seedmatch[name] = [same(fs[0], seed), same(fs[3], seed) if name == 'hit' else None]
    assert seedmatch[name][0] and seedmatch[name][1] in (True, None), name
    layout[name] = len(cells); cells += fs[take]
size = round(CELL * FACTOR); scaled = []
for c in cells:
    c = defringe(c).resize((size, size), Image.Resampling.LANCZOS); a = np.array(c); a[:, :, 3] = np.where(a[:, :, 3] < 4, 0, a[:, :, 3]); scaled.append(Image.fromarray(a))
unique = {}; ids = []; boxes = []
for c in scaled:
    box = c.getchannel('A').getbbox(); digest = hashlib.sha256(c.tobytes()).hexdigest(); unique.setdefault(digest, c.crop(box)); ids.append(digest); boxes.append(box)
options = []
for width in [512, 768, 1024, 1280, 1536, 2048]:
    plan = pack(unique, width)
    if plan and plan[1] <= 4096: options.append((width * plan[1], width, plan))
_, width, (positions, height) = min(options); atlas = Image.new('RGBA', (width, height))
for d, t in unique.items(): atlas.paste(t, positions[d])
buf = io.BytesIO(); atlas.save(buf, format='WEBP', lossless=True, exact=True, method=6); encoded = buf.getvalue()
image_name = f'{KEY}_wba.{hashlib.sha256(encoded).hexdigest()[:12]}.webp'
decoded = Image.open(io.BytesIO(encoded)).convert('RGBA'); frames = {}
for i, (d, box) in enumerate(zip(ids, boxes)):
    x, y = positions[d]; t = unique[d]; l, tp, r, b = box
    frames[str(i)] = {'frame': {'x': x, 'y': y, 'w': t.width, 'h': t.height}, 'rotated': False, 'trimmed': True,
                      'spriteSourceSize': {'x': l, 'y': tp, 'w': r - l, 'h': b - tp}, 'sourceSize': {'w': size, 'h': size}}
    rebuilt = Image.new('RGBA', (size, size)); rebuilt.paste(decoded.crop((x, y, x + t.width, y + t.height)), (l, tp))
    aa = np.array(scaled[i]); bb = np.array(rebuilt); assert np.array_equal(aa[:, :, 3], bb[:, :, 3]); assert np.array_equal(aa[aa[:, :, 3] > 0], bb[aa[:, :, 3] > 0])
data = {'frames': frames, 'meta': {'image': image_name, 'size': {'w': width, 'h': height}, 'scale': '1'}}
encoded_json = json.dumps(data, sort_keys=True, separators=(',', ':')).encode(); json_name = f'{KEY}_wba.{hashlib.sha256(encoded_json).hexdigest()[:12]}.json'
entry = {'image': image_name, 'atlas': json_name, 'width': width, 'height': height, 'frames': len(cells), 'decodedBytes': width * height * 4, 'downloadBytes': len(encoded) + len(encoded_json)}
ok = entry['decodedBytes'] <= 8 * 1024 * 1024 and entry['downloadBytes'] <= 2_000_000
print('factor', FACTOR, 'cell', size, entry, 'unique', len(unique), layout, 'budgetOK', ok)
if WRITE:
    assert ok
    manifest_path = ROOT / 'src/game/visuals/unit-atlases.json'; manifest = json.loads(manifest_path.read_text()); manifest[KEY] = entry
    (OUT / image_name).write_bytes(encoded); (OUT / json_name).write_bytes(encoded_json)
    for old in OUT.glob(f'{KEY}_wba.*'):
        if old.name not in (image_name, json_name): old.unlink()
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    rows = (len(cells) + 7) // 8; preview = Image.new('RGB', (1024, rows * 150), (13, 23, 44)); draw = ImageDraw.Draw(preview)
    for i, c in enumerate(scaled):
        t = c.resize((128, 128), Image.Resampling.LANCZOS); preview.paste(t, ((i % 8) * 128, (i // 8) * 150), t); draw.text(((i % 8) * 128 + 4, (i // 8) * 150 + 128), str(i), fill='white')
    preview.save(HERE / f'{KEY}-atlas-preview.png')
    (HERE / 'validation-normalized.json').write_text(json.dumps({KEY: {'factor': FACTOR, 'cell': size, 'displayRatio': 2, 'origin': [.5, 896 / CELL], 'layout': layout, 'rawSha256': shas, 'exactSeedFrames': seedmatch, 'uniqueFrames': len(unique), **entry}}, indent=2) + '\n')
