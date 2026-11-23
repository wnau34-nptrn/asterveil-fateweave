#!/usr/bin/env python3
"""Build half-size DOM portrait atlases (perf audit 2026-11-20, R10).

The portrait atlases keep 512 px cells (masters, and the story scene's large figure). Every other portrait is shown at
24-84 CSS px, so the game loads `<name>_half.webp`: the same 2-column grid at exactly half size (256 px cells, Lanczos),
encoded like its master (lossless stays lossless; lossy at quality 92). Writes the SHA-256 prefixes to
`src/game/visuals/portraits-half.json` for the `?v=` revision. Usage: python3 scripts/portraits-half.py
"""
import hashlib, io, json, pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
art = root / 'public/assets/art'
revs = {}
for name in ['portraits', 'portraits_mercs', 'portraits_foes', 'portraits_foes2', 'portraits_foes3']:
    src = art / f'{name}.webp'
    lossless = src.read_bytes()[12:16] == b'VP8L'
    im = Image.open(src).convert('RGBA')
    assert im.width == 1024 and im.height % 512 == 0, (name, im.size)
    half = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    buf = io.BytesIO()
    half.save(buf, 'WEBP', **({'lossless': True, 'method': 6} if lossless else {'quality': 92, 'method': 6}))
    (art / f'{name}_half.webp').write_bytes(buf.getvalue())
    revs[name] = hashlib.sha256(buf.getvalue()).hexdigest()[:8]
    print(f'{name}_half.webp', half.size, 'lossless' if lossless else 'q92', f'{len(buf.getvalue()) / 1e6:.2f} MB')
(root / 'src/game/visuals/portraits-half.json').write_text(json.dumps(revs, indent=1) + '\n')
