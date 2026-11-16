"""Adds the three World Boss item icons (bulwark/breaker/reaper, 128x128 RGBA) to the shared gear atlas.
Existing cells are never touched: the three target cells (row 8, columns 5-7) must be fully transparent in the current atlas,
every other pixel must survive the lossless re-encode unchanged. Hashes of the Codex PNGs are checked against validation.json.
Run: python3 -I build_assets.py [--write]; prints the new revision (first 8 hex of the new webp SHA-256) for equip-art.ts."""
from pathlib import Path
from PIL import Image
import hashlib, io, json, sys
import numpy as np
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
ATLAS = ROOT / 'public/assets/ui/equip/gear_items.webp'; FRAMES = ROOT / 'src/game/visuals/equip/gear_items.json'
CELLS = {'boss_bulwark': (640, 1024), 'boss_breaker': (768, 1024), 'boss_reaper': (896, 1024)}
validation = json.loads((HERE / 'validation.json').read_text())['files']
atlas = Image.open(ATLAS).convert('RGBA'); before = np.array(atlas); frames = json.loads(FRAMES.read_text())
out = atlas.copy()
for name, (x, y) in CELLS.items():
    rel = f'{name}.png'; data = (HERE / rel).read_bytes()
    assert hashlib.sha256(data).hexdigest() == validation[rel]['sha256'], rel
    icon = Image.open(io.BytesIO(data)).convert('RGBA'); assert icon.size == (128, 128) and icon.getchannel('A').getbbox()
    assert before[y:y + 128, x:x + 128, 3].max() == 0, f'cell {name} not empty'
    assert name not in frames, name
    out.paste(icon, (x, y)); frames[name] = {'x': x, 'y': y, 'w': 128, 'h': 128}
buf = io.BytesIO(); out.save(buf, format='WEBP', lossless=True, exact=True, method=6); encoded = buf.getvalue()
after = np.array(Image.open(io.BytesIO(encoded)).convert('RGBA'))
mask = np.ones(before.shape[:2], bool)
for x, y in CELLS.values(): mask[y:y + 128, x:x + 128] = False
assert np.array_equal(before[mask], after[mask]), 'existing atlas pixels changed'
for name, (x, y) in CELLS.items():
    icon = np.array(Image.open(HERE / f'{name}.png').convert('RGBA')); assert np.array_equal(icon, after[y:y + 128, x:x + 128]), name
rev = hashlib.sha256(encoded).hexdigest()[:8]
print('atlas', out.size, 'bytes', len(encoded), 'was', ATLAS.stat().st_size, 'rev', rev)
if '--write' in sys.argv:
    ATLAS.write_bytes(encoded); FRAMES.write_text(json.dumps(frames, indent=2) + '\n')
