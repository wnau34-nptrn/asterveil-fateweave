"""P10 cabinet art (ART-UI-GACHA-003 R1, owner pick 2026-11-21 "ใช้ R1 ทั้งหมด"; key art ART-UI-GACHA-002 from PR #212).

Reads the Codex package unchanged and writes runtime files to public/assets/gacha/:
- one lossless WebP horizontal strip per VFX sequence (frames in order, same cell size) for CSS `steps()` playback;
- lossless WebP card frames, masks and icons (pixels exact, alpha straight);
- the key art backdrop at 780 px wide (2x of the 390 px stage), lossy q88 like the title art (a backdrop, not an atlas).
Also writes src/ui/gacha-art.json (hashed names, cell sizes, anchors, suggested ms). Run: python3 -I scripts/build-gacha-art.py
"""
import hashlib, io, json, pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PKG = ROOT / 'incoming/ART-UI-GACHA-003'; KEY = ROOT / 'incoming/ART-UI-GACHA-002/art/key-art.png'
OUT = ROOT / 'public/assets/gacha'; META = ROOT / 'src/ui/gacha-art.json'
layers = {l['path']: l for l in json.loads((PKG / 'layers.json').read_text())['layers']}
valid = {f['path']: f['sha256'] for f in json.loads((PKG / 'validation.json').read_text())['files']}

def load(rel):
    data = (PKG / rel).read_bytes()
    if hashlib.sha256(data).hexdigest() != valid[rel]: sys.exit(f'hash mismatch: {rel}')
    return Image.open(io.BytesIO(data)).convert('RGBA')

def save(img, name, lossless=True):
    buf = io.BytesIO()
    if lossless: img.save(buf, 'WEBP', lossless=True, exact=True, method=6, quality=100)
    else: img.save(buf, 'WEBP', quality=88, method=6)
    data = buf.getvalue(); h = hashlib.sha256(data).hexdigest()[:10]
    if lossless and Image.open(io.BytesIO(data)).convert('RGBA').tobytes() != img.tobytes(): sys.exit(f'not exact: {name}')
    for old in OUT.glob(f'{name}-*.webp'): old.unlink()
    (OUT / f'{name}-{h}.webp').write_bytes(data)
    return f'{name}-{h}.webp', len(data)

OUT.mkdir(parents=True, exist_ok=True)
meta = {'source': 'ART-UI-GACHA-003 R1 @ 4323d51 + ART-UI-GACHA-002 key-art (PR #212)', 'stage': [390, 844], 'files': {}, 'bytes': 0}
seqs = {
    'idle': [f'vfx/loom-idle-0{i}.png' for i in range(1, 5)], 'sparkles': [f'vfx/ambient-sparkles-0{i}.png' for i in range(1, 5)],
    **{k: [f'vfx/{k}-{p}.png' for p in ('prepare', 'peak', 'settle')] for k in ('loom-charge', 'thread-pillar', 'ten-burst', 'reveal-character', 'reveal-shard')},
}
for key, frames in seqs.items():
    imgs = [load(f) for f in frames]; w, h = imgs[0].size
    strip = Image.new('RGBA', (w * len(imgs), h), (0, 0, 0, 0))
    for i, im in enumerate(imgs): strip.paste(im, (i * w, 0))
    name, n = save(strip, key); l = layers[frames[0]]
    meta['files'][key] = {'file': name, 'cell': [w, h], 'frames': len(imgs), 'pivot': l['pivot'], 'anchor': l['anchor'], 'width_390': l['width_390'],
                          'ms': [layers[f].get('suggested_ms') for f in frames], 'loop': bool(l.get('loop'))}
    meta['bytes'] += n
for rel in ('frames/character-card.png', 'frames/character-card-new.png', 'frames/character-shard.png', 'frames/mask.png', 'frames/mask-shard.png', 'icons/fate-ticket.png', 'icons/exchange-knot.png'):
    key = pathlib.Path(rel).stem; name, n = save(load(rel), key); l = layers[rel]
    meta['files'][key] = {'file': name, 'cell': l['size'], 'pivot': l['pivot'], 'width_390': l['width_390'], **({'alpha_bounds': l['alpha_bounds']} if 'alpha_bounds' in l else {})}
    meta['bytes'] += n
key = Image.open(KEY).convert('RGB'); key = key.resize((780, round(key.height * 780 / key.width)), Image.LANCZOS)
name, n = save(key, 'key-art', lossless=False); meta['files']['key-art'] = {'file': name, 'cell': list(key.size)}; meta['bytes'] += n
meta['anchors'] = json.loads((PKG / 'layers.json').read_text())['stage_anchors']
META.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + '\n')
print(json.dumps({k: v['file'] for k, v in meta['files'].items()}, indent=0), meta['bytes'])
