"""Integrate A12 (Kael, Wynne, Astrid) into three own-layout atlases. Run: python3 -I incoming/ART-UNIT-ANIMATION-A12-001/build_assets.py [--write]
Codex cells are at seed scale (1.0); the shipped A7 pipeline shows units at the .42 integration factor (displayRatio 1/.42), so every
cell is resampled once by .42 (Lanczos, premultiplied by Pillow) and then foot-centred on x=256 / sole y=496 in a 512 cell exactly like
incoming/ART-UNIT-ANIMATION-A7-002/build_assets.py. Slot 0 = seed idle; action strips = [idle, cells 2..6]; hit/block = cells 2..4; down = 1..4.
"""
from pathlib import Path
from PIL import Image
import numpy as np, hashlib, io, json, sys
ROOT = Path(__file__).resolve().parents[2]; HERE = Path(__file__).resolve().parent; OUT = ROOT / 'public/assets/units'
MANIFEST = ROOT / 'src/game/visuals/unit-atlases.json'
F = .42; SOLE = 496; FOOT_X = 256; TOL = .06
PLAN = {
  'kael': ['attack', 'gather', 'release', 'circle', 'stored'],
  'wynne': ['attack', 'knot', 'toll', 'weave'],
  'astrid': ['attack', 'deflect', 'dial', 'read'],
}
def figure(path):
    im = Image.open(path).convert('RGBA'); im = im.resize((round(im.width * F), round(im.height * F)), Image.Resampling.LANCZOS)
    a = np.array(im); alpha = a[:, :, 3]; ys, xs = np.where(alpha > 20)
    nz = np.where(alpha > 0); box = (nz[1].min(), nz[0].min(), nz[1].max() + 1, nz[0].max() + 1)
    height = ys.max() - ys.min() + 1; band = (alpha > 20) & (np.arange(alpha.shape[0])[:, None] > ys.max() - max(4, int(.12 * height)))
    foot = np.where(band.any(0))[0]; fx = (foot.min() + foot.max()) / 2
    return im.crop(box), fx - box[0], ys.max() + 1 - box[1], int(ys.max() + 1), int(height)
def strip(who, name, pick):
    n = len(list((HERE / 'cells' / f'{who}-{name}').glob('*.png'))) - 1
    figs = {k: figure(HERE / 'cells' / f'{who}-{name}' / f'{k:03d}.png') for k in range(1, n + 1)}
    base_bottom, base_height = figs[1][3], figs[1][4]; out = []
    for p in pick:
        if p is None: out.append(None); continue
        tile, fx, sy, bottom, _ = figs[p]; off = bottom - base_bottom
        natural = abs(off) > TOL * base_height
        x = round(FOOT_X - fx); y = round(SOLE - (sy - off if natural else sy))
        x = max(0, min(512 - tile.width, x))  # prone figures: keep inside the cell
        assert y >= 0 and y + tile.height <= 512, (who, name, p, x, y, tile.size)
        cell = Image.new('RGBA', (512, 512)); cell.alpha_composite(tile, (x, y)); out.append(cell)
    return out
def pack(tiles, width):
    x = y = 2; row = 0; pos = {}
    for k, t in sorted(tiles.items(), key=lambda p: (-p[1].height, -p[1].width, p[0])):
        if t.width + 4 > width: return None
        if x + t.width + 2 > width: y += row + 4; x = 2; row = 0
        pos[k] = (x, y); x += t.width + 4; row = max(row, t.height)
    return pos, y + row + 2
manifest = json.loads(MANIFEST.read_text()); report = {}
for who, moves in PLAN.items():
    seed = Image.open(HERE / 'seeds' / f'{who}.png').convert('RGBA'); seed = seed.resize((round(512 * F),) * 2, Image.Resampling.LANCZOS)
    idle = Image.new('RGBA', (512, 512)); sf = figure(HERE / 'cells' / f'{who}-attack' / '000.png')
    x = round(FOOT_X - sf[1]); y = round(SOLE - sf[2]); idle.alpha_composite(sf[0], (x, y))
    cells = [idle]; clips = {}
    for m in moves:
        clips[m] = len(cells); cells += [idle if c is None else c for c in strip(who, m, [None, 2, 3, 4, 5, 6])]
    for m, pick in (('hit', [2, 3, 4]), ('block', [2, 3, 4]), ('down', [1, 2, 3, 4])):
        clips[m] = len(cells); cells += strip(who, m, pick)
    unique, ids, boxes = {}, [], []
    for c in cells:
        box = c.getchannel('A').getbbox(); d = hashlib.sha256(c.tobytes()).hexdigest(); unique.setdefault(d, c.crop(box)); ids.append(d); boxes.append(box)
    opts = [(w * p[1], w, p) for w in range(256, 2049, 32) if (p := pack(unique, w)) and p[1] <= 4096]
    _, width, (pos, height) = min(opts); sheet = Image.new('RGBA', (width, height))
    for d, t in unique.items(): sheet.paste(t, pos[d])
    buf = io.BytesIO(); sheet.save(buf, format='WEBP', lossless=True, exact=True, method=6); enc = buf.getvalue()
    image_name = f'{who}_a12.{hashlib.sha256(enc).hexdigest()[:12]}.webp'
    dec = Image.open(io.BytesIO(enc)).convert('RGBA'); frames = {}
    for i, (d, box) in enumerate(zip(ids, boxes)):
        x, y = pos[d]; t = unique[d]; l, tp, r, b = box
        frames[str(i)] = {'frame': {'x': x, 'y': y, 'w': t.width, 'h': t.height}, 'rotated': False, 'trimmed': True, 'spriteSourceSize': {'x': l, 'y': tp, 'w': r - l, 'h': b - tp}, 'sourceSize': {'w': 512, 'h': 512}}
        rb = Image.new('RGBA', (512, 512)); rb.paste(dec.crop((x, y, x + t.width, y + t.height)), (l, tp)); aa, bb = np.array(cells[i]), np.array(rb)
        assert np.array_equal(aa[:, :, 3], bb[:, :, 3]) and np.array_equal(aa[aa[:, :, 3] > 0], bb[aa[:, :, 3] > 0])
    data = {'frames': frames, 'meta': {'image': image_name, 'size': {'w': width, 'h': height}, 'scale': '1'}}
    raw = json.dumps(data, sort_keys=True, separators=(',', ':')).encode(); json_name = f'{who}_a12.{hashlib.sha256(raw).hexdigest()[:12]}.json'
    new = {'image': image_name, 'atlas': json_name, 'width': width, 'height': height, 'frames': len(cells), 'decodedBytes': width * height * 4, 'downloadBytes': len(enc) + len(raw)}
    report[who] = {**new, 'clipStarts': clips, 'uniqueFrames': len(unique)}
    print(who, report[who]); print('  OVER BUDGET (reported)' if new['decodedBytes'] > 6 * 1024 * 1024 or new['downloadBytes'] > 1_500_000 else '  within budget')
    if '--write' in sys.argv:
        (OUT / image_name).write_bytes(enc); (OUT / json_name).write_bytes(raw)
        manifest[who] = new
        prev = Image.new('RGB', (1024, ((len(cells) + 7) // 8) * 130), (13, 23, 44))
        for i, c in enumerate(cells): t = c.resize((128, 128), Image.Resampling.LANCZOS); prev.paste(t, ((i % 8) * 128, (i // 8) * 130), t)
        prev.save(HERE / f'{who}-integrated-preview.png')
if '--write' in sys.argv:
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n'); (HERE / 'integration.json').write_text(json.dumps(report, indent=2) + '\n')
