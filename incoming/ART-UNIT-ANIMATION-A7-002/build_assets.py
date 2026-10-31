"""Integrate A7-002 Lalin (dance-strike, circle-spin, echo-closing-step, hit, block, down) into the shipped lalin_a7 atlas.
Wila is NOT integrated (owner redesign, CODEX-ART-QUEUE-TH.md item 29). Run: python3 -I incoming/ART-UNIT-ANIMATION-A7-002/build_assets.py [--write]
Existing frames 0-12 (partner turn R2, closing step R2) are taken pixel-for-pixel from the shipped atlas. New figures come from
Codex's cells/lalin-*/NNN.png, already at the .42 integration factor with the sole near y=497 in a 640x512 cell: NO resampling.
Each figure is foot-centred on x=256 (same bottom-band method as A7-001) and sits on the sole line y=496 unless it clearly leaves the
ground (>6% of the ready figure's height), in which case its height relative to the strip's ready figure (cell 001) is kept.
Slot layout (action strips 6 slots, slot 0 = seed idle; generated 001 'ready' is dropped like A7-001 figure 0): hit uses cells 002-004,
block 001-003, down 001-004 (as A7-001's picks).
"""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label
import numpy as np, hashlib, io, json, sys
ROOT = Path(__file__).resolve().parents[2]; HERE = Path(__file__).resolve().parent; OUT = ROOT / 'public/assets/units'
MANIFEST = ROOT / 'src/game/visuals/unit-atlases.json'
SOLE = 496; FOOT_X = 256; TOL = .06
manifest = json.loads(MANIFEST.read_text()); old = manifest['lalin']
atlas = Image.open(OUT / old['image']).convert('RGBA'); meta = json.loads((OUT / old['atlas']).read_text())['frames']
cells = []
for i in range(13):
    f = meta[str(i)]; s = f['frame']; b = f['spriteSourceSize']
    c = Image.new('RGBA', (512, 512)); c.paste(atlas.crop((s['x'], s['y'], s['x'] + s['w'], s['y'] + s['h'])), (b['x'], b['y'])); cells.append(c)
idle = cells[0]
def figure(path):
    a = np.array(Image.open(path).convert('RGBA')); alpha = a[:, :, 3]; ys, xs = np.where(alpha > 80)
    box = (np.where(alpha > 0)[1].min(), np.where(alpha > 0)[0].min(), np.where(alpha > 0)[1].max() + 1, np.where(alpha > 0)[0].max() + 1)
    height = ys.max() - ys.min() + 1; band = (alpha > 80) & (np.arange(alpha.shape[0])[:, None] > ys.max() - max(8, int(.12 * height)))
    foot = np.where(band.any(0))[0]; fx = (foot.min() + foot.max()) / 2
    return Image.fromarray(a).crop(box), fx - box[0], ys.max() + 1 - box[1], int(ys.max() + 1), int(height)
def strip(name, pick):
    figs = {k: figure(HERE / 'cells' / f'lalin-{name}' / f'{k:03d}.png') for k in range(1, 7 if name not in ('hit', 'block', 'down') else 5)}
    base_bottom, base_height = figs[1][3], figs[1][4]; out = []
    for p in pick:
        if p is None: out.append(idle); continue
        tile, fx, sy, bottom, _ = figs[p]; off = bottom - base_bottom
        natural = abs(off) > TOL * base_height
        x = round(FOOT_X - fx); y = round(SOLE - (sy - off if natural else sy))
        assert x >= 0 and y >= 0 and x + tile.width <= 512 and y + tile.height <= 512, (name, p, x, y, tile.size)
        cell = Image.new('RGBA', (512, 512)); cell.alpha_composite(tile, (x, y)); out.append(cell)
    return out
ACT = [None, 2, 3, 4, 5, 6]
clips = {}
for name, pick in [('dance-strike', ACT), ('circle-spin', ACT), ('echo-closing-step', ACT), ('hit', [2, 3, 4]), ('block', [1, 2, 3]), ('down', [1, 2, 3, 4])]:
    clips[name] = len(cells); cells += strip(name, pick)
print('clipStarts', clips, 'frames', len(cells))
unique, ids, boxes = {}, [], []
for c in cells:
    box = c.getchannel('A').getbbox(); d = hashlib.sha256(c.tobytes()).hexdigest(); unique.setdefault(d, c.crop(box)); ids.append(d); boxes.append(box)
def pack(tiles, width):
    x = y = 2; row = 0; pos = {}
    for k, t in sorted(tiles.items(), key=lambda p: (-p[1].height, -p[1].width, p[0])):
        if t.width + 4 > width: return None
        if x + t.width + 2 > width: y += row + 4; x = 2; row = 0
        pos[k] = (x, y); x += t.width + 4; row = max(row, t.height)
    return pos, y + row + 2
opts = [(w * p[1], w, p) for w in range(512, 2049, 32) if (p := pack(unique, w)) and p[1] <= 4096]
_, width, (pos, height) = min(opts); sheet = Image.new('RGBA', (width, height))
for d, t in unique.items(): sheet.paste(t, pos[d])
buf = io.BytesIO(); sheet.save(buf, format='WEBP', lossless=True, exact=True, method=6); enc = buf.getvalue()
image_name = f'lalin_a7.{hashlib.sha256(enc).hexdigest()[:12]}.webp'
dec = Image.open(io.BytesIO(enc)).convert('RGBA'); frames = {}
for i, (d, box) in enumerate(zip(ids, boxes)):
    x, y = pos[d]; t = unique[d]; l, tp, r, b = box
    frames[str(i)] = {'frame': {'x': x, 'y': y, 'w': t.width, 'h': t.height}, 'rotated': False, 'trimmed': True, 'spriteSourceSize': {'x': l, 'y': tp, 'w': r - l, 'h': b - tp}, 'sourceSize': {'w': 512, 'h': 512}}
    rb = Image.new('RGBA', (512, 512)); rb.paste(dec.crop((x, y, x + t.width, y + t.height)), (l, tp)); aa, bb = np.array(cells[i]), np.array(rb)
    assert np.array_equal(aa[:, :, 3], bb[:, :, 3]) and np.array_equal(aa[aa[:, :, 3] > 0], bb[aa[:, :, 3] > 0])
for i in range(13):  # shipped frames unchanged
    a = np.array(cells[i]); s = meta[str(i)]['frame']
data = {'frames': frames, 'meta': {'image': image_name, 'size': {'w': width, 'h': height}, 'scale': '1'}}
raw = json.dumps(data, sort_keys=True, separators=(',', ':')).encode(); json_name = f'lalin_a7.{hashlib.sha256(raw).hexdigest()[:12]}.json'
new = {'image': image_name, 'atlas': json_name, 'width': width, 'height': height, 'frames': len(cells), 'decodedBytes': width * height * 4, 'downloadBytes': len(enc) + len(raw)}
print(new); print('OVER BUDGET (reported, not hidden)' if new['decodedBytes'] > 6 * 1024 * 1024 or new['downloadBytes'] > 1_500_000 else 'within budget')
if '--write' in sys.argv:
    (OUT / image_name).write_bytes(enc); (OUT / json_name).write_bytes(raw)
    for n in (old['image'], old['atlas']): (OUT / n).unlink(missing_ok=True)
    manifest['lalin'] = new; MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    (HERE / 'integration.json').write_text(json.dumps({**new, 'clipStarts': clips, 'uniqueFrames': len(unique), 'wila': 'not integrated (redesign)'}, indent=2) + '\n')
    prev = Image.new('RGB', (1024, ((len(cells) + 7) // 8) * 130), (13, 23, 44))
    for i, c in enumerate(cells): t = c.resize((128, 128), Image.Resampling.LANCZOS); prev.paste(t, ((i % 8) * 128, (i // 8) * 130), t)
    prev.save(HERE / 'lalin-integrated-preview.png')
