#!/usr/bin/env python3
"""Build the runtime painted-skill-icon sheet (perf audit 2026-11-20, R2).

The master `public/assets/ui/skill_icons.webp` keeps 256 px cells (append new icons there). The game shows icons at
28-56 CSS px, so it loads `skill_icons_128.webp`: the same grid at exactly half size (128 px cells, Lanczos), lossless
WebP. Prints the SHA-256 prefix to put in `src/ui/icons.ts` (`?v=`). Usage: python3 scripts/skill-icons-runtime.py
"""
import hashlib, io, json, pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
meta = json.loads((root / 'src/game/visuals/skill_icons.json').read_text())
master = Image.open(root / 'public/assets/ui/skill_icons.webp').convert('RGBA')
cell = meta['cell']
assert master.size == (meta['cols'] * cell, meta['rows'] * cell), master.size
small = master.resize((master.width // 2, master.height // 2), Image.LANCZOS)
buf = io.BytesIO(); small.save(buf, 'WEBP', lossless=True, method=6)
out = root / 'public/assets/ui/skill_icons_128.webp'
out.write_bytes(buf.getvalue())
print(out.relative_to(root), small.size, f'{len(buf.getvalue()) / 1e6:.2f} MB', 'v=' + hashlib.sha256(buf.getvalue()).hexdigest()[:8])
