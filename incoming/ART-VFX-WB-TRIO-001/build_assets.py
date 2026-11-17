"""Claude intake for ART-VFX-WB-TRIO-001: append the 39 primary world-boss layers (13 moves x prepare/peak/settle, R1 designs;
the R2 alternatives are not imported) to the shipped boss_signature_fx atlas, losslessly.

- Every layer is checked against layers.json and validation.json (SHA-256, 256x256 RGBA) before use.
- The existing 42 frames are re-cut from the shipped atlas; the whole set is MaxRects-packed again (scripts/repack-atlas-lossless.py)
  and every frame, old and new, is verified RGBA-identical where visible after WebP lossless encode/decode.
- boss-signature-art.json gains pivot/width/anchor for the new frames, taken from Codex's layers.json (pivot_px,
  suggested_canvas_width_390, anchor, offset_390). Old entries are left as they are.

Run from the repository root:  python3 -I incoming/ART-VFX-WB-TRIO-001/build_assets.py [--write]
"""
import hashlib, importlib.util, io, json, pathlib, sys
sys.dont_write_bytecode = True  # scripts/__pycache__ is tracked; do not touch it
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
PKG = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('repack', ROOT / 'scripts/repack-atlas-lossless.py')
rp = importlib.util.module_from_spec(spec); spec.loader.exec_module(rp)

FX = ROOT / 'public/assets/fx'
ATLAS_JSON, ART_JSON = FX / 'boss_signature_fx.json', ROOT / 'src/game/visuals/boss-signature-art.json'
layers = json.loads((PKG / 'layers.json').read_text())['layers']
manifest = json.loads((PKG / 'validation.json').read_text())['files']
primary = [l for l in layers if l['file'].startswith('layers/')]
assert len(primary) == 39, len(primary)

data = json.loads(ATLAS_JSON.read_text())
old_img = Image.open(FX / data['meta']['image']).convert('RGBA')
old_frames = dict(rp.frames_of(data))
canvases = {name: rp.source_canvas(old_img, f) for name, f in old_frames.items()}
art = json.loads(ART_JSON.read_text())
added = {}
for l in primary:
    raw = (PKG / l['file']).read_bytes(); sha = hashlib.sha256(raw).hexdigest()
    assert sha == l['sha256'] == manifest[l['file']]['sha256'], l['file']
    im = Image.open(io.BytesIO(raw)); assert im.size == (256, 256) and im.mode == 'RGBA', l['file']
    name = f"{l['move']}_{l['beat']}"
    assert name not in old_frames or name in added, f'{name} already in the atlas'
    canvases[name] = im.convert('RGBA')
    art[name] = {'anchor': l['anchor'], 'pivot': l['pivot_px'], 'width': l['suggested_canvas_width_390'],
                 **({'offset': l['offset_390']} if any(l['offset_390']) else {})}
    added[name] = sha

# Repack all frames together; the packer re-checks every frame after encode/decode.
tmp = io.BytesIO(); full = Image.new('RGBA', (256 * len(canvases), 256))
frames = {}
for i, (name, c) in enumerate(sorted(canvases.items())):
    full.paste(c, (256 * i, 0))
    frames[name] = {'frame': {'x': 256 * i, 'y': 0, 'w': 256, 'h': 256}, 'rotated': False, 'trimmed': False,
                    'spriteSourceSize': {'x': 0, 'y': 0, 'w': 256, 'h': 256}, 'sourceSize': {'w': 256, 'h': 256}}
flat = PKG / '.flat.png'; full.save(flat)
try:
    out, webp, _ = rp.repack(flat, {**data, 'frames': frames})
finally:
    flat.unlink()
decoded = Image.open(io.BytesIO(webp)).convert('RGBA')
for name, f in out['frames'].items():
    assert rp.same_render(rp.source_canvas(decoded, f), canvases[name]), name
w, h = out['meta']['size']['w'], out['meta']['size']['h']
report = {'frames': len(out['frames']), 'added': len(added), 'size': [w, h], 'decodedBytes': w * h * 4, 'webpBytes': len(webp),
          'before': {'size': list(old_img.size), 'decodedBytes': old_img.size[0] * old_img.size[1] * 4, 'webpBytes': (FX / data['meta']['image']).stat().st_size},
          'verified': 'all frames RGBA-identical where visible after lossless encode/decode; 39 layer SHA-256 match layers.json and validation.json'}
if '--write' in sys.argv:
    (FX / data['meta']['image']).write_bytes(webp)
    ATLAS_JSON.write_text(json.dumps(out, indent=1) + '\n')
    ART_JSON.write_text(json.dumps(art, indent=2, sort_keys=True) + '\n')
    report['atlasSha256'] = hashlib.sha256(webp).hexdigest()
    (PKG / 'intake-report.json').write_text(json.dumps({**report, 'layers': added}, indent=1) + '\n')
print(json.dumps(report))
