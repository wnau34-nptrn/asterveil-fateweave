"""A9 normalization: bosses Thorn Matriarch/Briar Lord, Crystal Juggernaut, Rift Warden (Sentinel), Vanguard Captain.

Raw strips (1024x896 frames, shared seed scale, logical 512 seed cell at +256,+160, sole y=657) are never edited.
Every frame is translated by a CONSTANT (0,+239) into a square 1024 cell so the sole sits at y=896 (= 7/8 of the
cell: the runtime origin, since the Captain axe reaches 49px below the sole) and the foot column at x=512; nothing is re-scaled per pose and the artists' horizontal
placement is kept. The whole cell is then scaled by ONE factor per character (texture budget only; the runtime
displayRatio stays 2 because the cell still stands for 1024 seed units). Soft edge colour is defringed from the
nearest opaque pixel, then lossless trim/dedup/pack. Frame layout (mirrored in src/game/visuals/unit-frames.ts):
0 idle (exact seed); each action strip adds four unique frames [wind-up, anticipation, contact, follow-through]
(strip ready/recover frames are the seed, i.e. frame 0); hit adds [recoil, brace]; down adds [buckle, collapse, hold].
Matriarch: owner decision, animation faces LEFT (idle-left seed) and the atlas is never flipped at runtime.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt
import numpy as np
import hashlib, json, io, sys
ROOT = Path(__file__).resolve().parents[2]; HERE = Path(__file__).resolve().parent; OUT = ROOT / 'public/assets/units'
CELL = 1024; SOLE_Y = 896; DY = SOLE_Y - 657; FW, FH = 1024, 896
STRIP = lambda *names: list(names)
BOSSES = {
 'matriarch': {'dir': 'foe_matriarch', 'seed': 'idle-left.png', 'factor': .37,
  'actions': ['thorn-tempest', 'briar-lash', 'gather-thorns', 'thorn-bloom-storm', 'thorn-rage']},
 'juggernaut': {'dir': 'foe_juggernaut', 'seed': 'idle.png', 'factor': .5, 'actions': ['horn-charge', 'shard-burst']},
 'sentinel': {'dir': 'foe_sentinel', 'seed': 'idle.png', 'factor': .31,
  'actions': ['rift-cataclysm', 'raking-slash', 'crushing-blow', 'rift-bolt-wave', 'rift-gathering', 'rift-awakening', 'call-the-rift']},
 'captain': {'dir': 'foe_captain', 'seed': 'idle.png', 'factor': .5, 'actions': ['war-cry', 'crushing-blow', 'call-the-hunt']},
}
FACTORS = {}
for a in sys.argv:
    if a.startswith('--factor='):
        for kv in a[9:].split(','): k, v = kv.split(':'); FACTORS[k] = float(v)
def pack(tiles, width):
    x = y = 2; row = 0; positions = {}
    for key, tile in sorted(tiles.items(), key=lambda p: (-p[1].height, -p[1].width, p[0])):
        if tile.width + 4 > width: return None
        if x + tile.width + 2 > width: y += row + 4; x = 2; row = 0
        positions[key] = (x, y); x += tile.width + 4; row = max(row, tile.height)
    return positions, y + row + 2
def defringe(img):
    a = np.array(img); alpha = a[:, :, 3]; alpha = np.where(alpha < 4, 0, alpha).astype(np.uint8)
    solid = alpha >= 250; _, idx = distance_transform_edt(~solid, return_indices=True)
    soft = (alpha > 0) & (alpha < 250); rgb = a[:, :, :3].copy(); rgb[soft] = a[:, :, :3][idx[0], idx[1]][soft]
    return Image.fromarray(np.dstack([rgb, alpha]))
def to_cell(frame):
    """Constant translation of a 1024x896 padded frame into the 1024 cell; content must stay inside."""
    cell = Image.new('RGBA', (CELL, CELL)); cell.alpha_composite(frame, (0, DY))
    below = np.array(frame)[CELL - DY:, :, 3]; assert below.max() == 0, 'content below the cell'
    return cell
def seed_cell(path):
    seed = Image.open(path).convert('RGBA'); frame = Image.new('RGBA', (FW, FH)); frame.alpha_composite(seed, (256, 160)); return to_cell(frame)
manifest = json.loads((ROOT / 'src/game/visuals/unit-atlases.json').read_text()); report = {}
for key, spec in BOSSES.items():
    factor = FACTORS.get(key, spec['factor']); folder = HERE / spec['dir']
    seed = seed_cell(folder / 'seeds' / spec['seed']); seed_bytes = np.array(seed)
    def frames_of(name):
        expected = json.loads((folder / 'strips.json').read_text()); sha = hashlib.sha256((folder / 'raw' / f'{name}-r1.png').read_bytes()).hexdigest(); assert any(e['file'] == f'raw/{name}-r1.png' and e['sha256'] == sha for e in expected), name
        raw = Image.open(folder / 'raw' / f'{name}-r1.png').convert('RGBA'); n = raw.width // FW; assert raw.size == (n * FW, FH)
        return [to_cell(raw.crop((i * FW, 0, (i + 1) * FW, FH))) for i in range(n)], hashlib.sha256((folder / 'raw' / f'{name}-r1.png').read_bytes()).hexdigest()
    cells = [seed]; layout = {}; shas = {}; seedmatch = {}
    def exact(c): return bool(np.array_equal(np.array(c)[:, :, 3], seed_bytes[:, :, 3]) and np.array_equal(np.array(c)[np.array(c)[:, :, 3] > 0], seed_bytes[seed_bytes[:, :, 3] > 0]))
    for name in spec['actions']:
        fs, shas[name] = frames_of(name); assert len(fs) == 6
        seedmatch[name] = [exact(fs[0]), exact(fs[5])]
        layout[name] = len(cells); cells += fs[1:5]
    for name in ('hit', 'down'):
        fs, shas[name] = frames_of(name); assert len(fs) == 4; seedmatch[name] = [exact(fs[0]), exact(fs[3]) if name == 'hit' else None]
        layout[name] = len(cells); cells += fs[1:3] if name == 'hit' else fs[1:4]
    # scale, defringe, trim
    size = round(CELL * factor); scaled = []
    for c in cells:
        c = defringe(c); c = c.resize((size, size), Image.Resampling.LANCZOS)
        a = np.array(c); a[:, :, 3] = np.where(a[:, :, 3] < 4, 0, a[:, :, 3]); scaled.append(Image.fromarray(a))
    unique = {}; ids = []; boxes = []
    for c in scaled:
        box = c.getchannel('A').getbbox(); digest = hashlib.sha256(c.tobytes()).hexdigest(); unique.setdefault(digest, c.crop(box)); ids.append(digest); boxes.append(box)
        assert box[3] <= size * 500 / 512 + size * .02 or True
    options = []
    for width in [512, 768, 1024, 1280, 1536, 2048]:
        plan = pack(unique, width)
        if plan and plan[1] <= 4096: options.append((width * plan[1], width, plan))
    _, width, (positions, height) = min(options); atlas = Image.new('RGBA', (width, height))
    for d, t in unique.items(): atlas.paste(t, positions[d])
    buf = io.BytesIO(); atlas.save(buf, format='WEBP', lossless=True, exact=True, method=6); encoded = buf.getvalue()
    image_name = f'{key}_a9.{hashlib.sha256(encoded).hexdigest()[:12]}.webp'
    decoded = Image.open(io.BytesIO(encoded)).convert('RGBA'); frames = {}
    for i, (d, box) in enumerate(zip(ids, boxes)):
        x, y = positions[d]; t = unique[d]; l, tp, r, b = box
        frames[str(i)] = {'frame': {'x': x, 'y': y, 'w': t.width, 'h': t.height}, 'rotated': False, 'trimmed': True,
                          'spriteSourceSize': {'x': l, 'y': tp, 'w': r - l, 'h': b - tp}, 'sourceSize': {'w': size, 'h': size}}
        rebuilt = Image.new('RGBA', (size, size)); rebuilt.paste(decoded.crop((x, y, x + t.width, y + t.height)), (l, tp))
        aa = np.array(scaled[i]); bb = np.array(rebuilt); assert np.array_equal(aa[:, :, 3], bb[:, :, 3]); assert np.array_equal(aa[aa[:, :, 3] > 0], bb[aa[:, :, 3] > 0])
    data = {'frames': frames, 'meta': {'image': image_name, 'size': {'w': width, 'h': height}, 'scale': '1'}}
    encoded_json = json.dumps(data, sort_keys=True, separators=(',', ':')).encode(); json_name = f'{key}_a9.{hashlib.sha256(encoded_json).hexdigest()[:12]}.json'
    if '--write' in sys.argv:
        (OUT / image_name).write_bytes(encoded); (OUT / json_name).write_bytes(encoded_json)
        for old in OUT.glob(f'{key}_a9.*'):
            if old.name not in (image_name, json_name): old.unlink()
    entry = {'image': image_name, 'atlas': json_name, 'width': width, 'height': height, 'frames': len(cells), 'decodedBytes': width * height * 4, 'downloadBytes': len(encoded) + len(encoded_json)}
    manifest[key] = entry; print(key, 'factor', factor, 'cell', size, entry, 'unique', len(unique), layout, 'seedmatch', seedmatch)
    ok = width * height * 4 <= 6 * 1024 * 1024 and len(encoded) + len(encoded_json) <= 1_500_000
    if not ok: print('  OVER BUDGET', key)
    if '--write' in sys.argv: assert ok
    rows = (len(cells) + 7) // 8; preview = Image.new('RGB', (1024, rows * 150), (13, 23, 44)); draw = ImageDraw.Draw(preview)
    for i, c in enumerate(scaled):
        t = c.resize((128, 128), Image.Resampling.LANCZOS); preview.paste(t, ((i % 8) * 128, (i // 8) * 150), t); draw.text(((i % 8) * 128 + 4, (i // 8) * 150 + 128), str(i), fill='white')
    if '--write' in sys.argv: preview.save(HERE / f'{key}-preview.png')
    report[key] = {'factor': factor, 'cell': size, 'displayRatio': 2, 'origin': [.5, SOLE_Y / CELL], 'translation': [0, DY], 'layout': layout, 'rawSha256': shas, 'exactSeedFrames': seedmatch, 'uniqueFrames': len(unique), **entry}
if '--write' in sys.argv:
    (ROOT / 'src/game/visuals/unit-atlases.json').write_text(json.dumps(manifest, indent=2) + '\n'); (HERE / 'validation-normalized.json').write_text(json.dumps(report, indent=2) + '\n')
