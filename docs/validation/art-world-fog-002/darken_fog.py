"""ART-WORLD-FOG-002 tech fix: bring the delivered fog to the specified base colour.

The delivered fill averaged #283e58 (darkest pixel #20334c), brighter than the
handoff's #16263d base. One per-channel scale is applied to every fog file, so
alpha, shared borders and seams are unchanged. Run from the repository root:
    python3 -I docs/validation/art-world-fog-002/darken_fog.py
"""
import os
import numpy as np
from PIL import Image

SRC = 'incoming/ART-WORLD-FOG-002/fog'
DST = 'public/assets/world'
SCALE = np.array([22 / 40, 38 / 62, 61 / 88])  # mean fill #283e58 -> #16263d

for name in sorted(os.listdir(SRC)):
    if not name.endswith('.webp'):
        continue
    src = Image.open(os.path.join(SRC, name))
    px = np.array(src.convert('RGBA')).astype(float)
    px[..., :3] = np.round(px[..., :3] * SCALE)
    out = Image.fromarray(px.astype('uint8'), 'RGBA')
    if src.mode == 'RGB':
        out = out.convert('RGB')
    out.save(os.path.join(DST, name), 'WEBP', lossless=True, quality=100, method=6)
