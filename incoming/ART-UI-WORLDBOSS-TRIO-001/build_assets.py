"""Runtime derivatives of ART-UI-WORLDBOSS-TRIO-001 for the World Boss UI (the Codex masters stay untouched in this folder).
Banners are shown 358 px wide (390 px field): 720 px wide (2x) lossy WebP q90 (single-boss 1080x360 -> 720x240, camp card 1080x288 ->
720x192). Emblems are shown at 36-56 px: 128 px lossless RGBA. File names carry a content hash; src/game/visuals/world-boss-art.json
maps the logical name to the file. Codex PNG hashes are checked against validation.json first. Run: python3 -I build_assets.py"""
from pathlib import Path
from PIL import Image
import hashlib, io, json
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]; OUT = ROOT / 'public/assets/ui/worldboss'
validation = json.loads((HERE / 'validation.json').read_text())['files']; OUT.mkdir(parents=True, exist_ok=True)
manifest = {}
def source(rel):
    data = (HERE / rel).read_bytes(); assert hashlib.sha256(data).hexdigest() == validation[rel]['sha256'], rel
    return Image.open(io.BytesIO(data))
def emit(name, im, **save):
    buf = io.BytesIO(); im.save(buf, format='WEBP', **save); data = buf.getvalue()
    file = f'{name}.{hashlib.sha256(data).hexdigest()[:8]}.webp'; (OUT / file).write_bytes(data); manifest[name] = file
    print(name, im.size, len(data))
for boss in ('kragmor', 'valdrakk', 'morvane'):
    emit(f'banner_{boss}', source(f'banner_{boss}.png').convert('RGB').resize((720, 240), Image.Resampling.LANCZOS), quality=90, method=6)
    emit(f'emblem_{boss}', source(f'emblem_{boss}.png').convert('RGBA').resize((128, 128), Image.Resampling.LANCZOS), lossless=True, exact=True, method=6)
emit('banner_trio', source('banner_trio.png').convert('RGB').resize((720, 192), Image.Resampling.LANCZOS), quality=90, method=6)
for old in OUT.glob('*.webp'):
    if old.name not in manifest.values(): old.unlink()
(ROOT / 'src/game/visuals/world-boss-art.json').write_text(json.dumps(manifest, indent=2) + '\n')
