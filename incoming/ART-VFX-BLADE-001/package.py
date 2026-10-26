"""Reproducible atlas packaging; preserves generated alpha and relative frame positions."""
from pathlib import Path
from PIL import Image, ImageDraw
import json

here = Path(__file__).resolve().parent
root = here.parents[1]
source = Image.open(here / 'generated.png').convert('RGBA')
names = [f'{group}_{i:02}' for group in ['slash', 'thrust', 'contact'] for i in range(4)] + ['glint', 'flecks', 'deflect', 'pass']
atlas = Image.new('RGBA', (1056, 1056))
preview = Image.new('RGBA', (1056, 1056), '#101c36')
frames = {}
(here / 'png').mkdir(exist_ok=True)
for i, name in enumerate(names):
    col, row = i % 4, i // 4
    # The generator returned 1254 square rather than the requested 1024; use proportional boundaries.
    cell = source.crop((round(col * source.width / 4), round(row * source.height / 4), round((col + 1) * source.width / 4), round((row + 1) * source.height / 4))).resize((256, 256), Image.Resampling.LANCZOS)
    cell.save(here / 'png' / f'{name}.png')
    x, y = col * 264 + 4, row * 264 + 4
    atlas.paste(cell, (x, y))
    preview.alpha_composite(cell, (x, y))
    frames[name] = {'frame': {'x': x, 'y': y, 'w': 256, 'h': 256}, 'rotated': False, 'trimmed': False, 'sourceSize': {'w': 256, 'h': 256}, 'spriteSourceSize': {'x': 0, 'y': 0, 'w': 256, 'h': 256}}
    ImageDraw.Draw(preview).text((x + 4, y + 240), name, fill='white')
out = root / 'public/assets/fx'
atlas.save(out / 'blade_fx.webp', quality=88, method=6, exact=True)
(out / 'blade_fx.json').write_text(json.dumps({'frames': frames, 'meta': {'app': 'ART-VFX-BLADE-001', 'image': 'blade_fx.webp', 'size': {'w': 1056, 'h': 1056}, 'scale': '1', 'alphaMode': 'straight'}}, indent=2) + '\n')
preview.convert('RGB').save(here / 'preview.png')
print(source.size, source.getchannel('A').getextrema(), '->', Image.open(out / 'blade_fx.webp').size, (out / 'blade_fx.webp').stat().st_size)
